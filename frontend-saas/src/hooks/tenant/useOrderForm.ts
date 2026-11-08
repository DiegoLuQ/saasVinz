"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { useCurrentTenant } from '@/hooks/useSessionBootstrap';
import { regions } from '@/lib/tenant/chile-data';
import { useAutoDraft } from '@/hooks/tenant/useAutoDraft';
import { readCatalogCache, writeCatalogCache } from '@/lib/tenant/orders/catalogCache';
import type { OrderTemplate } from '@/lib/tenant/orders/templates';
import {
    calculateWeightPrice,
    findWeightRule,
    calculateGrandTotal,
    calculateGrandTotalCost,
} from '@/lib/tenant/orders/calculations';
import {
    normalizeServices,
    normalizePlans,
    normalizeProducts,
    mapCremationToFormState,
    mapCremationProducts,
    mapCremationServices,
    mapCremationPlans,
} from '@/lib/tenant/orders/mappers';
import type {
    Cremation,
    Pet,
    Service,
    Plan,
    Product,
    Customer,
    Partner,
    WeightPricingRule,
    SelectedProduct,
    SelectedService,
    SelectedPlan,
} from '@/lib/tenant/orders/types';
import { resolveTimeZone, nowZonedInputValue, zonedInputToUtcISO } from '@/lib/zonedTime';
import { computeAgreementDiscount, termsFromOption } from '@/lib/tenant/orders/agreements';
import type { AgreementOption, AgreementTerms } from '@/lib/tenant/orders/agreements';
import { useTenant } from '@/app/(tenant)/tenant/context/TenantContext';

export interface UseOrderFormOptions {
    /** 'full' = formulario completo (registro). 'express' = creación rápida (crear-seguimiento). */
    mode?: 'full' | 'express';
    /** Si es false, no exige al menos 1 imagen al guardar. Por defecto solo se exige en modo full. */
    requireImages?: boolean;
    /** Fuerza el cremation_type (ej. 'seguimiento'). Si se omite, se deriva del plan/servicio. */
    cremationTypeOverride?: string;
    /** Si es false, no redirige a la cola de pedidos tras guardar (lo usa express para mostrar el enlace). */
    redirectAfterSave?: boolean;
    /** Si es false, desactiva autoguardado de borrador y aviso al salir. Por defecto solo activo en modo full. */
    enableDraft?: boolean;
    /** Si es true, restaura el borrador automáticamente al volver (sin preguntar). Útil en modo express. */
    autoRestoreDraft?: boolean;
    /** Callback tras un guardado exitoso, recibe la orden creada/actualizada (incluye verification_code). */
    onSaveSuccess?: (result: any) => void;
}

/** Unidades de un producto en todas las líneas de la orden (manuales + incluidas en el plan). */
function usedQty(lines: SelectedProduct[], productId: number): number {
    return lines.filter(l => l.product_id === productId).reduce((sum, l) => sum + (l.quantity || 0), 0);
}

export function useOrderForm(options: UseOrderFormOptions = {}) {
    // Zona horaria de la programación: la del crematorio (por país) o, si no, la del navegador
    const { tenantData } = useTenant();
    const timeZone = resolveTimeZone((tenantData as { timezone?: string | null } | null)?.timezone);
    const {
        mode = 'full',
        requireImages = mode !== 'express',
        cremationTypeOverride,
        redirectAfterSave = mode !== 'express',
        enableDraft = mode !== 'express',
        autoRestoreDraft = false,
        onSaveSuccess,
    } = options;

    const { showToast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('id');
    const currentTenant = useCurrentTenant();
    const tenantId = currentTenant?.id ?? null;

    // ==========================================
    // Catalog data (loaded once)
    // ==========================================
    const [pets, setPets] = useState<Pet[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [agreements, setAgreements] = useState<AgreementOption[]>([]);
    const [weightPricingRules, setWeightPricingRules] = useState<WeightPricingRule[]>([]);
    // Precio por plan y peso (Configuración → Formulario y Pesos): con 'table' cada plan
    // tiene su precio por tramo y no se suma recargo por peso.
    const [weightPricingMode, setWeightPricingMode] = useState<'surcharge' | 'table'>('surcharge');
    const [planWeightPrices, setPlanWeightPrices] = useState<Record<number, Record<string, number>>>({});
    const priceTable = weightPricingMode === 'table';

    // ==========================================
    // Form state
    // ==========================================
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    // Refresco aislado del catálogo de servicios/planes (botón "Actualizar")
    const [refreshingServices, setRefreshingServices] = useState(false);
    const [servicesUpdatedAt, setServicesUpdatedAt] = useState<number | null>(null);
    // Tras un guardado exitoso suprimimos el borrador para no re-crearlo al salir.
    const [justSaved, setJustSaved] = useState(false);
    const [currentCremation, setCurrentCremation] = useState<Partial<Cremation>>({
        pet_id: 0,
        status: 'en_proceso',
        scheduled_at: nowZonedInputValue(resolveTimeZone()),
        notes: '',
        discount: 0,
        weight_price: 0,
    });
    const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
    const [selectedPlans, setSelectedPlans] = useState<SelectedPlan[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [localPreviews, setLocalPreviews] = useState<string[]>([]);
    const [isPlanServicesOpen, setIsPlanServicesOpen] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [tempStatus, setTempStatus] = useState<string | null>(null);
    const [showCropper, setShowCropper] = useState(false);
    const [cropSource, setCropSource] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    // Foto de la mascota recortada pero AÚN NO subida: se sube a Cloudflare recién al
    // guardar la orden (Actualizar/Confirmar). Así un error o un arrepentimiento no deja
    // archivos huérfanos en el almacenamiento.
    const [pendingPetPhoto, setPendingPetPhotoState] = useState<{ petId: number; blob: Blob; preview: string } | null>(null);
    const setPendingPetPhoto = useCallback((petId: number, blob: Blob | null) => {
        setPendingPetPhotoState((prev) => {
            if (prev) URL.revokeObjectURL(prev.preview);
            return blob ? { petId, blob, preview: URL.createObjectURL(blob) } : null;
        });
        if (blob) setIsDirty(true);
    }, []);
    const [replacementPending, setReplacementPending] = useState<{
        type: 'plan' | 'service' | 'product';
        currentName: string;
        newName: string;
        onConfirm: () => void;
        isConflict?: boolean;
        conflictMessage?: string;
        customLabels?: {
            title?: string;
            currentHeader?: string;
            newHeader?: string;
            currentAction?: string;
            newAction?: string;
        };
    } | null>(null);
    const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
    const [originalCremation, setOriginalCremation] = useState<Partial<Cremation> | null>(null);
    // Ítems tal como estaban guardados (para el resumen de cambios antes de actualizar).
    const [originalItems, setOriginalItems] = useState<{
        services: SelectedService[]; plans: SelectedPlan[]; products: SelectedProduct[];
    } | null>(null);
    const [draftPrompt, setDraftPrompt] = useState<{ savedAt: string } | null>(null);
    const formRef = useRef<HTMLFormElement | null>(null);

    // ==========================================
    // Memoized lookups (eliminate repeated .find())
    // ==========================================
    const petsMap = useMemo(
        () => new Map(pets.map(p => [p.id, p])),
        [pets]
    );
    const customersMap = useMemo(
        () => new Map(customers.map(c => [c.id, c])),
        [customers]
    );

    const selectedPet = useMemo(
        () => (currentCremation.pet_id ? petsMap.get(currentCremation.pet_id) : undefined),
        [petsMap, currentCremation.pet_id]
    );
    const relatedCustomer = useMemo(
        () => (selectedPet ? customersMap.get(selectedPet.customer_id) : undefined),
        [customersMap, selectedPet]
    );
    const selectedPartner = useMemo(
        () => partners.find((p: any) => (p.id || p.id_partner) === (currentCremation.partner_link_id || currentCremation.partner_id)),
        [partners, currentCremation.partner_link_id, currentCremation.partner_id]
    );

    const petOptions = useMemo(
        () =>
            pets.map(p => {
                const customer = customersMap.get(p.customer_id);
                const firstOwnerName = customer?.name.split(' ')[0] || 'Desconocido';
                return { value: p.id, label: `${p.name} - ${firstOwnerName}` };
            }),
        [pets, customersMap]
    );

    // ==========================================
    // Convenio con empresa: la orden ya guardada conserva su copia de condiciones
    // (si se mantiene el mismo convenio); uno recién elegido usa las vigentes.
    // ==========================================
    const agreementTerms = useMemo<AgreementTerms | null>(() => {
        const id = currentCremation.agreement_id;
        if (!id) return null;
        if (originalCremation?.agreement_id === id && originalCremation.agreement_terms) {
            return originalCremation.agreement_terms;
        }
        const opt = agreements.find(a => a.id === id);
        return opt ? termsFromOption(opt) : null;
    }, [currentCremation.agreement_id, originalCremation, agreements]);

    const agreementBreakdown = useMemo(
        () => computeAgreementDiscount(agreementTerms, selectedServices, selectedPlans, selectedProducts),
        [agreementTerms, selectedServices, selectedPlans, selectedProducts]
    );

    // ==========================================
    // Computed totals
    // ==========================================
    const grandTotal = useMemo(
        () =>
            calculateGrandTotal(
                selectedServices,
                selectedPlans,
                selectedProducts,
                currentCremation.weight_price || 0,
                currentCremation.discount || 0,
                agreementBreakdown.total
            ),
        [selectedServices, selectedPlans, selectedProducts, currentCremation.weight_price, currentCremation.discount, agreementBreakdown.total]
    );

    const grandTotalCost = useMemo(
        () => calculateGrandTotalCost(selectedServices, selectedPlans, selectedProducts),
        [selectedServices, selectedPlans, selectedProducts]
    );

    // ==========================================
    // Section-based validation
    // ==========================================
    const sectionStatus = useMemo(() => {
        const hasPet = !!currentCremation.pet_id && currentCremation.pet_id > 0;
        const hasSchedule = !!currentCremation.scheduled_at;
        const hasAddress = !!currentCremation.address && currentCremation.address.trim().length > 0;
        const hasLogistics = hasSchedule && hasAddress;
        const hasServiceOrPlan = selectedServices.length > 0 || selectedPlans.length > 0;
        // La foto pendiente de la mascota también cuenta: al guardar se agrega como imagen de la orden
        const hasPendingPetPhoto = !!pendingPetPhoto && pendingPetPhoto.petId === currentCremation.pet_id;
        const hasImages = (currentCremation.images?.length || 0) + localPreviews.length > 0 || hasPendingPetPhoto;

        return {
            patient: { complete: hasPet, label: 'Mascota' },
            logistics: { complete: hasLogistics, label: 'Logística' },
            sales: { complete: hasServiceOrPlan, label: 'Servicios' },
            evidence: { complete: hasImages, label: 'Evidencia' },
        };
    }, [
        currentCremation.pet_id, currentCremation.scheduled_at,
        currentCremation.address, currentCremation.images,
        selectedServices.length, selectedPlans.length, localPreviews.length, pendingPetPhoto,
    ]);

    const allSectionsComplete = useMemo(
        () => Object.values(sectionStatus).every(s => s.complete),
        [sectionStatus]
    );

    // ==========================================
    // Dirty state tracking + beforeunload
    // ==========================================
    const markDirty = useCallback(() => {
        if (!isDirty) setIsDirty(true);
    }, [isDirty]);

    const touchField = useCallback((field: string) => {
        setTouchedFields(prev => {
            if (prev.has(field)) return prev;
            const next = new Set(prev);
            next.add(field);
            return next;
        });
    }, []);

    useEffect(() => {
        if (!isDirty || !enableDraft) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty, enableDraft]);

    // ==========================================
    // Auto-Draft (localStorage persistence)
    // ==========================================
    // ¿Hay contenido que valga la pena persistir? (mascota, servicios, planes,
    // productos o notas). En modo express los handlers no siempre marcan isDirty,
    // así que usamos esto para decidir si guardar el borrador.
    const hasDraftableContent = useMemo(() => {
        return (
            (!!currentCremation.pet_id && currentCremation.pet_id > 0) ||
            selectedServices.length > 0 ||
            selectedPlans.length > 0 ||
            selectedProducts.length > 0 ||
            (currentCremation.notes?.trim().length ?? 0) > 0
        );
    }, [
        currentCremation.pet_id, currentCremation.notes,
        selectedServices.length, selectedPlans.length, selectedProducts.length,
    ]);

    // El formulario completo persiste por isDirty; el express (autoRestoreDraft)
    // persiste en cuanto hay contenido, aunque no se haya marcado dirty.
    const draftActive = enableDraft && !justSaved && (isDirty || (autoRestoreDraft && hasDraftableContent));

    // Al quedar el formulario vacío (p. ej. tras "Nuevo Seguimiento"), reactivamos
    // la persistencia para el próximo registro.
    useEffect(() => {
        if (!hasDraftableContent && justSaved) setJustSaved(false);
    }, [hasDraftableContent, justSaved]);

    const { getExistingDraft, saveDraft, clearDraft } = useAutoDraft({
        editId,
        isDirty: draftActive,
        currentCremation,
        selectedServices,
        selectedPlans,
        selectedProducts,
        // Separa el borrador del formulario express del completo para no mezclarlos.
        keyNamespace: mode === 'express' ? 'express' : undefined,
    });

    // ==========================================
    // Ctrl+S keyboard shortcut
    // ==========================================
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                // Trigger form submit programmatically
                formRef.current?.requestSubmit();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // ==========================================
    // Data Fetching
    // ==========================================
    const fetchData = useCallback(async () => {
        setLoading(true);
        // Stale-while-revalidate: si hay catálogo en caché, lo mostramos al
        // instante mientras pedimos la versión fresca a la API en segundo plano.
        if (!editId) {
            const cached = readCatalogCache(tenantId);
            if (cached) {
                setServices(cached.services);
                setPlans(cached.plans);
                setServicesUpdatedAt(cached.savedAt);
            }
        }
        try {
            // allSettled: si un recurso no-crítico no está disponible para el plan
            // (ej. 'inventario'/'partners' sin permiso en planes solo-operaciones),
            // el formulario sigue funcionando con ese recurso vacío en vez de romperse.
            const results = await Promise.allSettled([
                apiRequest('/api/internal/pets/'),
                apiRequest('/api/internal/services/'),
                apiRequest('/api/internal/plans/'),
                apiRequest('/api/internal/customers/'),
                apiRequest('/api/internal/maintenance/weight-pricing'),
                apiRequest('/api/internal/products/'),
                apiRequest('/api/internal/partners/active-options'),
                apiRequest('/api/internal/agreements/active-options'),
                apiRequest('/api/internal/maintenance/plan-weight-prices'),
            ]);
            const settled = (i: number): any[] =>
                results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<any>).value ?? [] : [];
            const petsData = settled(0);
            const servicesData = settled(1);
            const plansData = settled(2);
            const customersData = settled(3);
            const weightRules = settled(4);
            const productsData = settled(5);
            const partnersData = settled(6);
            setAgreements(settled(7));
            type WeightTable = { mode?: string; plans?: { plan_id: number; prices?: Record<string, number> }[] } | null;
            const weightTable: WeightTable = results[8].status === 'fulfilled' ? (results[8] as PromiseFulfilledResult<WeightTable>).value : null;
            const tableMode = weightTable?.mode === 'table';
            setWeightPricingMode(tableMode ? 'table' : 'surcharge');
            setPlanWeightPrices(Object.fromEntries(
                (weightTable?.plans || []).map(p => [p.plan_id, p.prices || {}])
            ));

            const normalizedServices = normalizeServices(servicesData);
            const normalizedPlans = normalizePlans(plansData);

            setPets(petsData);
            setPartners(partnersData);
            setServices(normalizedServices);
            setPlans(normalizedPlans);
            setCustomers(customersData);
            setWeightPricingRules(weightRules);
            setProducts(normalizeProducts(productsData));

            // Refrescamos la caché local del catálogo con la versión fresca.
            writeCatalogCache(tenantId, { services: normalizedServices, plans: normalizedPlans });
            setServicesUpdatedAt(Date.now());

            // Load existing cremation if editing
            if (editId) {
                const cremationData = await apiRequest(`/api/internal/cremations/${editId}`);
                const formState = mapCremationToFormState(cremationData, petsData, timeZone);
                // Orden creada desde una solicitud con tabla de precios (promoción del catálogo):
                // se recalcula con los rangos y precios por plan de esa tabla, sin recargo.
                type OrderPriceList = { tiers?: WeightPricingRule[]; plan_prices?: Record<string, Record<string, number>> } | null;
                const orderList: OrderPriceList = cremationData.price_list || null;
                if (orderList) {
                    setWeightPricingMode('table');
                    setWeightPricingRules(orderList.tiers || []);
                    setPlanWeightPrices(Object.fromEntries(
                        Object.entries(orderList.plan_prices || {}).map(([k, v]) => [Number(k), v || {}])
                    ));
                }
                const orderTable = tableMode || !!orderList;
                // Con kg, el recargo sale de los tramos vigentes. Se aplica aquí y no
                // solo en el efecto de abajo: fetchData corre dos veces (al resolverse
                // el tenant) y la orden llega después de los tramos, pisando el valor
                // calculado con el weight_price guardado (0) sin que cambie el peso.
                if (!orderTable && formState.weight && Array.isArray(weightRules) && weightRules.length > 0) {
                    formState.weight_price = calculateWeightPrice(formState.weight, weightRules);
                }
                setCurrentCremation(formState);
                // Snapshot de lo GUARDADO (diff y confirmación): el recargo recalculado arriba
                // cuenta como cambio si difiere del valor almacenado.
                setOriginalCremation({ ...formState, weight_price: cremationData.weight_price || 0 });

                // Auto-fix address if it looks like an email
                if (cremationData.address && cremationData.address.includes('@')) {
                    const pet = petsData.find((p: any) => p.id === cremationData.pet_id);
                    const customer = customersData.find((c: any) => c.id === pet?.customer_id);
                    if (customer && customer.address && !customer.address.includes('@')) {
                        setCurrentCremation(prev => ({
                            ...prev,
                            address: customer.address,
                            region: regions.find(r => r.label === customer.region)?.label || customer.region || prev.region,
                            city: customer.city || prev.city,
                        }));
                        showToast('Se corrigió automáticamente la dirección (detectado email en lugar de domicilio).', 'info');
                    }
                }

                // Load associations
                const origProducts = Array.isArray(cremationData.productos) ? mapCremationProducts(cremationData.productos, productsData, plansData): [];
                const origServices = Array.isArray(cremationData.servicios) ? mapCremationServices(cremationData.servicios, servicesData) : [];
                const origPlans = Array.isArray(cremationData.planes) ? mapCremationPlans(cremationData.planes, plansData) : [];
                if (Array.isArray(cremationData.productos)) setSelectedProducts(origProducts);
                if (Array.isArray(cremationData.servicios)) setSelectedServices(origServices);
                if (Array.isArray(cremationData.planes)) setSelectedPlans(origPlans);
                setOriginalItems({ services: origServices, plans: origPlans, products: origProducts });
            } else {
                const petParam = searchParams.get('pet_id');
                if (petParam && Number(petParam)) {
                    const targetPetId = Number(petParam);
                    if (petsData.some((p: any) => p.id === targetPetId)) {
                        setCurrentCremation(prev => ({ ...prev, pet_id: targetPetId }));
                    }
                }
            }
        } catch (err: any) {
            showToast(err.message, 'error');
            if (editId) router.push('/dashboard/recepcion-pedidos');
        } finally {
            setLoading(false);
        }
    }, [editId, tenantId]);

    // ==========================================
    // Refresco aislado del catálogo (servicios + planes)
    // Permite actualizar el selector sin recargar toda la página.
    // ==========================================
    const refreshServices = useCallback(async () => {
        setRefreshingServices(true);
        try {
            const [servicesRes, plansRes] = await Promise.allSettled([
                apiRequest('/api/internal/services/'),
                apiRequest('/api/internal/plans/'),
            ]);
            const servicesData = servicesRes.status === 'fulfilled' ? (servicesRes.value ?? []) : [];
            const plansData = plansRes.status === 'fulfilled' ? (plansRes.value ?? []) : [];

            const normalizedServices = normalizeServices(servicesData);
            const normalizedPlans = normalizePlans(plansData);

            setServices(normalizedServices);
            setPlans(normalizedPlans);
            writeCatalogCache(tenantId, { services: normalizedServices, plans: normalizedPlans });
            setServicesUpdatedAt(Date.now());
            showToast('Servicios y planes actualizados', 'success');
        } catch (err: any) {
            showToast(err?.message || 'No se pudieron actualizar los servicios', 'error');
        } finally {
            setRefreshingServices(false);
        }
    }, [tenantId, showToast]);

    const didCheckDraftRef = useRef(false);
    useEffect(() => {
        fetchData().then(() => {
            // After data loads, check for existing draft (solo una vez por montaje,
            // aunque fetchData se re-ejecute al resolverse el tenant).
            if (editId || !enableDraft || didCheckDraftRef.current) return;
            didCheckDraftRef.current = true;
            {
                const draft = getExistingDraft();
                if (draft) {
                    if (autoRestoreDraft) {
                        // Modo express: recuperamos el formulario automáticamente
                        // al volver, sin mostrar un diálogo de confirmación.
                        setCurrentCremation(draft.cremation);
                        setSelectedServices(draft.services);
                        setSelectedPlans(draft.plans);
                        setSelectedProducts(draft.products);
                        setIsDirty(true);
                        showToast('Recuperamos los datos del formulario', 'info');
                    } else {
                        setDraftPrompt({ savedAt: draft.savedAt });
                    }
                }
            }
        });
    }, [fetchData]);

    // ==========================================
    // Handlers: Status
    // ==========================================
    const handleStatusChange = useCallback((val: string | number) => {
        const newStatus = String(val);
        if (newStatus === 'cancelado' && currentCremation.status !== 'cancelado') {
            setTempStatus(newStatus);
            setShowCancelModal(true);
        } else {
            setCurrentCremation(prev => ({ ...prev, status: newStatus }));
        }
    }, [currentCremation.status]);

    // Estado ya guardado en el servidor por otra vía (p. ej. «Retroceder»): se
    // aplica también al snapshot para que no figure como cambio pendiente.
    const applySavedStatus = useCallback((status: string) => {
        setCurrentCremation(prev => ({ ...prev, status }));
        setOriginalCremation(prev => (prev ? { ...prev, status } : prev));
    }, []);

    const handleConfirmCancel = useCallback(() => {
        if (tempStatus) {
            setCurrentCremation(prev => ({ ...prev, status: tempStatus }));
        }
        setShowCancelModal(false);
        setTempStatus(null);
    }, [tempStatus]);

    // ==========================================
    // Handlers: Pet Selection
    // ==========================================
    const handlePetChange = useCallback((val: string | number) => {
        const petId = Number(val);
        const pet = petsMap.get(petId);
        const customer = pet ? customersMap.get(pet.customer_id) : null;

        setCurrentCremation(prev => ({
            ...prev,
            pet_id: petId,
            images: prev.images || pet?.images || [],
            address: customer?.address || '',
            region: customer?.region || '',
            city: customer?.city || '',
        }));
    }, [petsMap, customersMap]);

    // ==========================================
    // Handlers: Sync from Customer/Pet
    // ==========================================
    const syncAddressFromCustomer = useCallback(() => {
        if (relatedCustomer) {
            const normalizeText = (text?: string) => {
                if (!text) return '';
                return text.toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/\bregion\b/gi, "")
                    .trim();
            };

            const customerRegionNorm = normalizeText(relatedCustomer.region);
            const matchedRegion = regions.find(r => {
                const labelNorm = normalizeText(r.label);
                const valueNorm = normalizeText(r.value);
                return labelNorm === customerRegionNorm || 
                       valueNorm === customerRegionNorm ||
                       labelNorm.includes(customerRegionNorm) ||
                       customerRegionNorm.includes(labelNorm);
            });

            let matchedCity = '';
            if (matchedRegion && relatedCustomer.city) {
                const customerCityNorm = normalizeText(relatedCustomer.city);
                matchedCity = matchedRegion.communes.find(c => {
                    const communeNorm = normalizeText(c);
                    return communeNorm === customerCityNorm || 
                           communeNorm.includes(customerCityNorm) || 
                           customerCityNorm.includes(communeNorm);
                }) || '';
            }

            setCurrentCremation(prev => ({
                ...prev,
                address: relatedCustomer.address || '',
                region: matchedRegion ? matchedRegion.label : (relatedCustomer.region || prev.region),
                city: matchedCity || relatedCustomer.city || prev.city,
            }));
            showToast('Información de dirección sincronizada desde el cliente.', 'info');
        } else {
            showToast('No se encontró información del cliente para esta mascota.', 'error');
        }
    }, [relatedCustomer, showToast]);

    const syncImagesFromPet = useCallback(() => {
        if (selectedPet && selectedPet.images && selectedPet.images.length > 0) {
            const currentImages = currentCremation.images || [];
            const newImages = selectedPet.images.filter(img => !currentImages.includes(img));

            if (newImages.length === 0) {
                showToast('Las fotos de la mascota ya están agregadas.', 'info');
                return;
            }

            const totalLimit = 3;
            const currentCount = currentImages.length + localPreviews.length;
            const available = totalLimit - currentCount;

            if (available <= 0) {
                showToast('Ya hay 3 imágenes. Elimina alguna para sincronizar.', 'error');
                return;
            }

            const imagesToAdd = newImages.slice(0, available);
            setCurrentCremation(prev => ({
                ...prev,
                images: [...(prev.images || []), ...imagesToAdd],
            }));

            if (imagesToAdd.length < newImages.length) {
                showToast(`Se agregaron ${imagesToAdd.length} fotos (Límite alcanzado).`, 'success');
            } else {
                showToast(`Se agregaron ${imagesToAdd.length} fotos desde el perfil.`, 'success');
            }
        } else {
            showToast('La mascota no tiene fotos guardadas en su perfil.', 'error');
        }
    }, [selectedPet, currentCremation.images, localPreviews.length, showToast]);

    // ==========================================
    // Handlers: Images
    // ==========================================
    const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (selectedImages.length + 1 + (currentCremation?.images?.length || 0) > 3) {
            showToast('Máximo 3 imágenes permitidas en total', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setCropSource(reader.result as string);
            setShowCropper(true);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }, [selectedImages.length, currentCremation?.images?.length, showToast]);

    const handleCropComplete = useCallback((croppedBlob: Blob) => {
        const file = new File([croppedBlob], `order_image_${Date.now()}.png`, { type: 'image/png' });
        setSelectedImages(prev => [...prev, file]);
        setLocalPreviews(prev => [...prev, URL.createObjectURL(file)]);
        setShowCropper(false);
        setCropSource(null);
    }, []);

    const handleRemoveLocalImage = useCallback((index: number) => {
        setLocalPreviews(prev => prev.filter((_, i) => i !== index));
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleRemoveRemoteImage = useCallback((imagePath: string) => {
        setCurrentCremation(prev => ({
            ...prev,
            images: prev.images?.filter(img => img !== imagePath) || [],
        }));
    }, []);

    // ==========================================
    // Handlers: Products
    // ==========================================
    // Stock que puede usar esta orden: lo disponible + lo que ya tenía guardado
    // (al editar, el backend lo devuelve antes de volver a descontarlo).
    const stockAvailable = useCallback((productId: number) => {
        const product = products.find(p => p.id === productId);
        if (!product || product.made_to_order) return Number.POSITIVE_INFINITY;
        const saved = (originalItems?.products || [])
            .filter(p => p.product_id === productId)
            .reduce((sum, p) => sum + (p.quantity || 0), 0);
        return Math.max((product.stock || 0) + saved, saved);
    }, [products, originalItems]);

    const handleAddProduct = useCallback((productId: string) => {
        const product = products.find(p => p.id === Number(productId));
        if (!product) return;

        const available = stockAvailable(product.id);
        if (usedQty(selectedProducts, product.id) + 1 > available) {
            showToast(`Stock insuficiente para "${product.name}". Disponible: ${Math.max(available, 0)}`, 'error');
            return;
        }

        const newLine: SelectedProduct = {
                id: product.id,
                product_id: product.id,
                name: product.name,
                quantity: 1,
                unit_price: product.unit_price,
                unit_cost: product.cost_price,
                image_url: product.image_url,
            };
        // Solo los productos vendidos aparte; las ánforas del plan se cambian con «Cambiar».
        const manual = selectedProducts.filter(p => !p.plan_id);

        if (manual.some(p => p.product_id === product.id)) {
            setSelectedProducts(prev =>
                prev.map(item =>
                    !item.plan_id && item.product_id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            );
            return;
        }

        const activePlan = selectedPlans[0];
        const planDetails = activePlan ? plans.find(p => p.id === activePlan.plan_id) : null;
        const isIncludedInPlan = selectedProducts.some(p => p.plan_id && p.product_id === product.id)
            || planDetails?.products?.some(p => p.id === product.id || p.name.toLowerCase() === product.name.toLowerCase());

        if (isIncludedInPlan && activePlan) {
            setReplacementPending({
                type: 'product',
                currentName: `${activePlan.name} (Incluido)`,
                newName: product.name,
                isConflict: true,
                conflictMessage: `Esta urna/producto ya está incluida de forma gratuita en el plan "${activePlan.name}". Al confirmarlo, se agregará como un elemento de cargo adicional extra.`,
                customLabels: {
                    title: 'Producto Incluido en Plan',
                    currentHeader: 'Incluido en Plan',
                    newHeader: 'Producto Extra',
                    currentAction: 'Gratis',
                    newAction: 'Cargo Extra',
                },
                onConfirm: () => {
                    setSelectedProducts(prev => [...prev, newLine]);
                    setReplacementPending(null);
                    showToast('Producto agregado con cargo extra', 'success');
                },
            });
            return;
        }

        // Ya hay otro producto vendido aparte: se reemplaza (las ánforas del plan se mantienen)
        if (manual.length > 0) {
            setReplacementPending({
                type: 'product',
                currentName: manual[0].name,
                newName: product.name,
                onConfirm: () => {
                    setSelectedProducts(prev => [...prev.filter(p => p.plan_id), newLine]);
                    setReplacementPending(null);
                    showToast('Producto reemplazado con éxito', 'success');
                },
            });
            return;
        }

        setSelectedProducts(prev => [...prev, newLine]);
    }, [products, selectedProducts, selectedPlans, plans, showToast, stockAvailable]);

    // La familia cambia el ánfora incluida en el plan por otra: la línea sigue
    // siendo del plan (precio 0); el crematorio decide si cobra la diferencia.
    const handleSwapIncludedProduct = useCallback((index: number, productId: number) => {
        const product = products.find(p => p.id === productId);
        const line = selectedProducts[index];
        if (!product || !line || line.product_id === product.id) return;
        const others = selectedProducts.filter((_, i) => i !== index);
        const available = stockAvailable(product.id);
        if (usedQty(others, product.id) + line.quantity > available) {
            showToast(`Stock insuficiente para "${product.name}". Disponible: ${Math.max(available, 0)}`, 'error');
            return;
        }
        setSelectedProducts(prev => prev.map((item, i) => i !== index ? item : {
            ...item,
            id: product.id,
            product_id: product.id,
            name: product.name,
            image_url: product.image_url,
            unit_cost: product.cost_price,
            unit_price: 0,
        }));
        showToast(`Ánfora del plan cambiada por "${product.name}"`, 'success');
    }, [products, selectedProducts, showToast, stockAvailable]);

    const handleRemoveProduct = useCallback((index: number) => {
        setSelectedProducts(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleUpdateProduct = useCallback((index: number, field: keyof SelectedProduct, value: number) => {
        if (field === 'quantity') {
            const item = selectedProducts[index];
            const others = selectedProducts.filter((_, i) => i !== index);
            const available = stockAvailable(item.product_id);
            if (value > item.quantity && usedQty(others, item.product_id) + value > available) {
                showToast(`Stock insuficiente para "${item.name}". Disponible: ${Math.max(available, 0)}`, 'error');
                return;
            }
        }
        setSelectedProducts(prev =>
            prev.map((item, i) => (i !== index ? item : { ...item, [field]: value }))
        );
    }, [selectedProducts, showToast, stockAvailable]);

    // ==========================================
    // Handlers: Services
    // ==========================================
    const handleAddService = useCallback((serviceId: number) => {
        const original = services.find(s => s.id === serviceId);
        if (!original) return;

        const existing = selectedServices.find(s => s.service_id === serviceId);
        if (existing) return; // Already selected, do nothing

        const activePlan = selectedPlans[0];
        const planDetails = activePlan ? plans.find(p => p.id === activePlan.plan_id) : null;
        const isIncludedInPlan = planDetails?.services?.some(s => s.id === serviceId || s.name.toLowerCase() === original.name.toLowerCase());

        if (isIncludedInPlan) {
            setReplacementPending({
                type: 'service',
                currentName: `${activePlan!.name} (Incluido)`,
                newName: original.name,
                isConflict: true,
                conflictMessage: `Este servicio ya está incluido de forma gratuita en el plan "${activePlan!.name}". Al confirmarlo, se agregará como un cargo adicional extra.`,
                customLabels: {
                    title: 'Servicio Incluido en Plan',
                    currentHeader: 'Incluido en Plan',
                    newHeader: 'Servicio Extra',
                    currentAction: 'Gratis',
                    newAction: 'Cargo Extra',
                },
                onConfirm: () => {
                    setSelectedServices([
                        {
                            service_id: serviceId,
                            unit_price: original.unit_price ?? original.price ?? 0,
                            unit_cost: original.unit_cost ?? original.cost ?? 0,
                            name: original.name,
                            es_principal: true,
                        },
                    ]);
                    setReplacementPending(null);
                    showToast('Servicio extra agregado con cargo extra', 'success');
                },
            });
            return;
        }

        if (selectedServices.length > 0) {
            const currentService = selectedServices[0];
            setReplacementPending({
                type: 'service',
                currentName: currentService.name,
                newName: original.name,
                onConfirm: () => {
                    setSelectedServices([
                        {
                            service_id: serviceId,
                            unit_price: original.unit_price ?? original.price ?? 0,
                            unit_cost: original.unit_cost ?? original.cost ?? 0,
                            name: original.name,
                            es_principal: true,
                        },
                    ]);
                    setReplacementPending(null);
                    showToast('Servicio extra reemplazado con éxito', 'success');
                },
            });
            return;
        }

        setSelectedServices(prev => [
            ...prev,
            {
                service_id: serviceId,
                unit_price: original.unit_price ?? original.price ?? 0,
                unit_cost: original.unit_cost ?? original.cost ?? 0,
                name: original.name,
                es_principal: prev.filter(s => s.es_principal).length === 0,
            },
        ]);
    }, [services, selectedServices, selectedPlans, plans, showToast]);

    const handleRemoveServiceItem = useCallback((index: number) => {
        setSelectedServices(prev => {
            const next = prev.filter((_, i) => i !== index);
            // Si se eliminó el principal y quedan ítems, el primero pasa a ser principal
            if (prev[index]?.es_principal && next.length > 0) {
                next[0] = { ...next[0], es_principal: true };
            }
            return next;
        });
    }, []);

    const handleSetPrincipalService = useCallback((index: number) => {
        setSelectedServices(prev => prev.map((s, i) => ({ ...s, es_principal: i === index })));
    }, []);

    const handleUpdateServicePrice = useCallback((index: number, price: number) => {
        setSelectedServices(prev =>
            prev.map((item, i) => (i !== index ? item : { ...item, unit_price: price }))
        );
    }, []);

    // ==========================================
    // Handlers: Plans
    // ==========================================
    /** Precio del plan para un peso: el de la tabla del tramo (modo 'table') o el base. */
    const planPriceForWeight = useCallback((planId: number, basePrice: number, weight?: number | null) => {
        if (!priceTable) return basePrice;
        const tier = findWeightRule(weight, weightPricingRules);
        const value = tier?.id != null ? planWeightPrices[planId]?.[String(tier.id)] : undefined;
        return value != null ? Number(value) : basePrice;
    }, [priceTable, weightPricingRules, planWeightPrices]);

    const handleAddPlan = useCallback((planId: number) => {
        const original = plans.find(p => p.id === planId);
        if (!original) return;

        const existing = selectedPlans.find(p => p.plan_id === planId);
        if (existing) return; // Already selected, do nothing

        const executeAddPlan = () => {
            setSelectedPlans([
                {
                    plan_id: planId,
                    unit_price: planPriceForWeight(planId, original.unit_price ?? original.price ?? 0, currentCremation.weight),
                    unit_cost: original.unit_cost ?? original.cost ?? 0,
                    name: original.name,
                    es_principal: true,
                },
            ]);

            // Ánforas/insumos del plan: líneas propias de la orden (plan_id, precio 0) para
            // que el stock se descuente y se devuelva con la orden. Reemplazan las del plan anterior.
            const included: SelectedProduct[] = (original.products || []).map((p) => ({
                id: p.id,
                product_id: p.id,
                name: p.name,
                unit_price: 0,
                included_price: p.sale_price ?? p.unit_price ?? 0,
                unit_cost: p.cost_price ?? p.unit_cost ?? 0,
                quantity: 1,
                image_url: p.image_url,
                plan_id: planId,
            }));
            const nextProducts = [...selectedProducts.filter(item => !item.plan_id), ...included];
            setSelectedProducts(nextProducts);
            included.forEach(line => {
                const available = stockAvailable(line.product_id);
                if (usedQty(nextProducts, line.product_id) > available) {
                    showToast(
                        `Sin stock de "${line.name}" incluida en el plan (disponible: ${Math.max(available, 0)}). Cámbiala por otra antes de guardar.`,
                        'error'
                    );
                }
            });

            setIsPlanServicesOpen(true);
        };

        if (selectedPlans.length > 0) {
            const currentPlan = selectedPlans[0];
            setReplacementPending({
                type: 'plan',
                currentName: currentPlan.name,
                newName: original.name,
                onConfirm: () => {
                    executeAddPlan();
                    setReplacementPending(null);
                    showToast('Plan reemplazado con éxito', 'success');
                },
            });
            return;
        }

        executeAddPlan();
    }, [plans, selectedProducts, selectedPlans, showToast, stockAvailable, planPriceForWeight, currentCremation.weight]);

    const handleRemovePlanItem = useCallback((index: number) => {
        const removed = selectedPlans[index];
        if (removed) setSelectedProducts(prev => prev.filter(item => item.plan_id !== removed.plan_id));
        setSelectedPlans(prev => {
            const next = prev.filter((_, i) => i !== index);
            if (prev[index]?.es_principal && next.length > 0) {
                next[0] = { ...next[0], es_principal: true };
            }
            return next;
        });
    }, [selectedPlans]);

    const handleSetPrincipalPlan= useCallback((index: number) => {
        setSelectedPlans(prev => prev.map((p, i) => ({ ...p, es_principal: i === index })));
    }, []);

    const handleUpdatePlanPrice = useCallback((index: number, price: number) => {
        setSelectedPlans(prev =>
            prev.map((item, i) => (i !== index ? item : { ...item, unit_price: price }))
        );
    }, []);

    // ==========================================
    // Handlers: Weight
    // ==========================================
    const handleWeightChange = useCallback((value: string) => {
        const w = value ? parseFloat(value) : undefined;
        const wp = priceTable ? 0 : calculateWeightPrice(w, weightPricingRules);
        setCurrentCremation(prev => ({
            ...prev,
            weight: w,
            weight_price: wp,
        }));
        // Tabla por plan: el plan toma el precio del nuevo tramo.
        if (priceTable && w) {
            setSelectedPlans(prev => prev.map(p => {
                const base = plans.find(pl => pl.id === p.plan_id);
                return { ...p, unit_price: planPriceForWeight(p.plan_id, base?.unit_price ?? base?.price ?? p.unit_price, w) };
            }));
        }
    }, [weightPricingRules, priceTable, plans, planPriceForWeight]);

    // Con peso en kg, el recargo se deriva de las reglas vigentes. Las órdenes
    // creadas por otros flujos (p. ej. el Registro Rápido) guardan weight_price = 0
    // aunque tengan peso, y al editarlas el valor no aparecía junto al campo.
    // Sin kg se respeta el recargo guardado (p. ej. el tramo elegido por la familia
    // en el formulario público): recalcularlo daría 0 y lo borraría.
    useEffect(() => {
        if (weightPricingRules.length === 0 || priceTable) return;
        setCurrentCremation(prev => {
            if (!prev.weight) return prev;
            const expected = calculateWeightPrice(prev.weight, weightPricingRules);
            if (expected === (prev.weight_price || 0)) return prev;
            return { ...prev, weight_price: expected };
        });
    }, [weightPricingRules, currentCremation.weight, priceTable]);

    // ==========================================
    // Handler: Save
    // ==========================================
    const handleSave = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentCremation?.pet_id) {
            showToast('Debe seleccionar una mascota', 'error');
            return;
        }

        if (selectedServices.length === 0 && selectedPlans.length === 0) {
            showToast('Selecciona al menos un servicio o un plan', 'error');
            return;
        }

        const pendingPhotoForThisPet = !!pendingPetPhoto && pendingPetPhoto.petId === currentCremation.pet_id;
        if (requireImages && selectedImages.length === 0 && (!currentCremation.images || currentCremation.images.length === 0) && !pendingPhotoForThisPet) {
            showToast('Para guardar o actualizar el registro debe subir al menos 1 imagen obligatoria de evidencia o mascota', 'error');
            return;
        }

        // Validación final de stock (sumando líneas del mismo producto)
        for (const pid of new Set(selectedProducts.map(p => p.product_id))) {
            const available = stockAvailable(pid);
            if (usedQty(selectedProducts, pid) > available) {
                const name = selectedProducts.find(p => p.product_id === pid)?.name || 'producto';
                showToast(`Stock insuficiente para "${name}". Disponible: ${Math.max(available, 0)}`, 'error');
                return;
            }
        }

        setIsSaving(true);
        try {
            const isEdit = !!editId;
            const endpoint = isEdit ? `/api/internal/cremations/${editId}` : '/api/internal/cremations/';
            const method = isEdit ? 'PATCH' : 'POST';

            let processType = cremationTypeOverride ?? 'Estándar';
            if (!cremationTypeOverride) {
                if (selectedPlans.length > 0) {
                    processType = `Plan: ${selectedPlans[0].name}`;
                } else if (selectedServices.length > 0) {
                    processType = selectedServices[0].name;
                }
            }

            const payload = {
                pet_id: currentCremation.pet_id,
                region: currentCremation.region || null,
                city: currentCremation.city || null,
                address: currentCremation.address || null,
                pickup_region: currentCremation.pickup_region || null,
                pickup_city: currentCremation.pickup_city || null,
                pickup_address: currentCremation.pickup_address || null,
                cremation_type: processType,
                status: currentCremation.status,
                // Hora de pared en la zona del crematorio → instante UTC (antes se interpretaba
                // en la zona del navegador sobre un valor que ya venía en UTC: +4 h por guardado)
                scheduled_at: currentCremation.scheduled_at
                    ? zonedInputToUtcISO(currentCremation.scheduled_at, timeZone)
                    : null,
                notes: currentCremation.notes,
                images: currentCremation.images || [],
                weight: currentCremation.weight || null,
                weight_price: currentCremation.weight_price || 0,
                discount: currentCremation.discount || 0,
                servicios: selectedServices.map(s => ({
                    service_id: s.service_id,
                    cantidad: 1,
                    unit_price: s.unit_price,
                    precio_costo: s.unit_cost,
                    es_principal: s.es_principal ?? true,
                })),
                planes: selectedPlans.map(p => ({
                    plan_id: p.plan_id,
                    cantidad: 1,
                    unit_price: p.unit_price,
                    precio_costo: p.unit_cost,
                    es_principal: p.es_principal ?? true,
                })),
                products: selectedProducts.map(p => ({
                    product_id: p.product_id,
                    quantity: p.quantity,
                    unit_price: p.unit_price,
                    precio_costo: p.unit_cost,
                    plan_id: p.plan_id ?? null,
                })),
                total_price: grandTotal,
                total_cost: grandTotalCost,
                partner_id: currentCremation.partner_link_id || currentCremation.partner_id || null,
                partner_link_id: currentCremation.partner_link_id || currentCremation.partner_id || null,
                agreement_id: currentCremation.agreement_id || null,
            };

            const result = await apiRequest(endpoint, {
                method,
                body: JSON.stringify(payload),
            });

            const targetId = isEdit ? editId : result.id;

            // Upload new images
            if (selectedImages.length > 0) {
                const imageUrls: string[] = [];
                for (const image of selectedImages) {
                    const formData = new FormData();
                    formData.append('file', image);
                    const uploadRes = await apiRequest(
                        `/api/internal/cremations/upload-image?cremation_id=${targetId}`,
                        { method: 'POST', body: formData, headers: {} }
                    );
                    imageUrls.push(uploadRes.image_url);
                }

                const allImages = [...(currentCremation.images || []), ...imageUrls];
                await apiRequest(`/api/internal/cremations/${targetId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ images: allImages }),
                });
            }

            // Foto pendiente de la mascota: solo si corresponde a la mascota de esta orden
            let petPhotoFailed = false;
            if (pendingPetPhoto && pendingPetPhoto.petId === currentCremation.pet_id) {
                try {
                    const pet = pets.find((pp) => pp.id === pendingPetPhoto.petId);
                    const fd = new FormData();
                    fd.append('file', pendingPetPhoto.blob, `${pet?.name || 'mascota'}.jpg`);
                    const qs = new URLSearchParams({ pet_name: pet?.name || 'mascota', customer_id: String(pet?.customer_id ?? 0) });
                    const up = await apiRequest(`/api/internal/pets/upload-image?${qs}`, { method: 'POST', body: fd });
                    const images = [up.image_url, ...((pet?.images || []).filter((u: string) => u !== up.image_url))];
                    await apiRequest(`/api/internal/pets/${pendingPetPhoto.petId}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ image_url: up.image_url, images }),
                    });
                    setPets((prev) => prev.map((pp) => (pp.id === pendingPetPhoto.petId ? { ...pp, image_url: up.image_url, images } : pp)));
                    // Orden sin imágenes: la foto de la mascota queda como su imagen (igual que "Cargar desde Mascota")
                    if (!(currentCremation.images?.length) && selectedImages.length === 0) {
                        await apiRequest(`/api/internal/cremations/${targetId}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ images: [up.image_url] }),
                        });
                        setCurrentCremation((prev) => ({ ...prev, images: [up.image_url] }));
                    }
                    setPendingPetPhoto(pendingPetPhoto.petId, null);
                } catch (photoErr: any) {
                    petPhotoFailed = true;
                    showToast(`La orden se guardó, pero la foto no se pudo subir: ${photoErr?.message || ''}. Queda pendiente para reintentar.`, 'error');
                }
            }

            if (!petPhotoFailed) showToast(`Servicio ${isEdit ? 'actualizado' : 'registrado'} con éxito`, 'success');
            if (enableDraft) clearDraft();  // Remove localStorage draft on success
            setIsDirty(false);  // Prevent beforeunload on navigation
            setJustSaved(true);  // Evita re-crear el borrador al salir tras guardar

            // result puede no traer las imágenes recién subidas, pero sí id + verification_code
            onSaveSuccess?.(result);

            if (redirectAfterSave) {
                router.push('/dashboard/recepcion-pedidos');
            }
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setIsSaving(false);
        }
    }, [
        currentCremation, selectedServices, selectedPlans, selectedProducts,
        selectedImages, grandTotal, grandTotalCost, editId, products, router, showToast,
        requireImages, cremationTypeOverride, enableDraft, redirectAfterSave, onSaveSuccess, clearDraft,
        pendingPetPhoto, pets, setPendingPetPhoto, timeZone
    ]);

    // ==========================================
    // Return everything the UI needs
    // ==========================================
    // Wrap setCurrentCremation to auto-mark dirty
    const setCurrentCremationDirty: typeof setCurrentCremation = useCallback((action) => {
        markDirty();
        setCurrentCremation(action);
    }, [markDirty]);

    // ==========================================
    // Template Application
    // ==========================================
    const applyTemplate = useCallback((template: OrderTemplate) => {
        const cremationDefaults = template.defaults.cremation;
        if (cremationDefaults) {
            setCurrentCremation(prev => ({
                ...prev,
                ...cremationDefaults,
                scheduled_at: cremationDefaults.scheduled_at || prev.scheduled_at,
            }));
        }

        // Auto-add plan by name
        if (template.defaults.autoAddPlan) {
            const plan = plans.find(p =>
                p.name.toLowerCase().includes(template.defaults.autoAddPlan!.toLowerCase())
            );
            if (plan) {
                setSelectedPlans([{
                    plan_id: plan.id,
                    name: plan.name,
                    unit_price: plan.price,
                    unit_cost: plan.cost || 0,
                }]);
            }
        }

        // Auto-add services by name
        if (template.defaults.autoAddServices) {
            const matchedServices = template.defaults.autoAddServices
                .map(name => services.find(s => s.name.toLowerCase().includes(name.toLowerCase())))
                .filter(Boolean);
            if (matchedServices.length > 0) {
                setSelectedServices(matchedServices.map(s => ({
                    service_id: s!.id,
                    name: s!.name,
                    unit_price: s!.price,
                    unit_cost: s!.cost || 0,
                })));
            }
        }

        markDirty();
        showToast(`Plantilla "${template.name}" aplicada`, 'success');
    }, [plans, services, markDirty, showToast]);

    // ==========================================
    // Draft Recovery Handlers
    // ==========================================
    const restoreDraft = useCallback(() => {
        const draft = getExistingDraft();
        if (draft) {
            setCurrentCremation(draft.cremation);
            setSelectedServices(draft.services);
            setSelectedPlans(draft.plans);
            setSelectedProducts(draft.products);
            markDirty();
            showToast('Borrador restaurado correctamente', 'success');
        }
        setDraftPrompt(null);
    }, [getExistingDraft, markDirty, showToast]);

    const discardDraft = useCallback(() => {
        clearDraft();
        setDraftPrompt(null);
    }, [clearDraft]);

    return {
        // Route
        editId,
        router,

        // Loading
        loading,
        isSaving,

        // Catalog data
        pets,
        setPets,
        pendingPetPhoto,
        setPendingPetPhoto,
        customers,
        setCustomers,
        services,
        plans,
        products,
        partners,
        agreements,
        agreementTerms,
        agreementBreakdown,
        weightPricingRules,
        weightPricingMode,
        refreshData: fetchData,
        refreshServices,
        refreshingServices,
        servicesUpdatedAt,

        // Memoized lookups
        selectedPet,
        relatedCustomer,
        selectedPartner,
        petOptions,

        // Form state
        currentCremation,
        setCurrentCremation: setCurrentCremationDirty,
        selectedServices,
        setSelectedServices,
        selectedPlans,
        setSelectedPlans,
        selectedProducts,
        selectedImages,
        localPreviews,
        isPlanServicesOpen,
        setIsPlanServicesOpen,
        showCancelModal,
        setShowCancelModal,
        tempStatus,
        setTempStatus,
        showCropper,
        setShowCropper,
        cropSource,
        setCropSource,

        // Validation & dirty
        isDirty,
        sectionStatus,
        allSectionsComplete,
        touchedFields,
        touchField,

        // Phase 4: Auto-Draft
        draftPrompt,
        restoreDraft,
        discardDraft,
        formRef,

        // Phase 4: Templates
        applyTemplate,

        // Phase 4: Diff tracking
        originalCremation,
        originalItems,

        // Computed
        grandTotal,
        grandTotalCost,

        // Handlers
        handleStatusChange,
        applySavedStatus,
        handleConfirmCancel,
        handlePetChange,
        syncAddressFromCustomer,
        syncImagesFromPet,
        handleImageSelect,
        handleCropComplete,
        handleRemoveLocalImage,
        handleRemoveRemoteImage,
        handleAddProduct,
        handleSwapIncludedProduct,
        handleRemoveProduct,
        handleUpdateProduct,
        handleAddService,
        handleRemoveServiceItem,
        handleUpdateServicePrice,
        handleSetPrincipalService,
        handleAddPlan,
        handleRemovePlanItem,
        handleUpdatePlanPrice,
        handleSetPrincipalPlan,
        handleWeightChange,
        handleSave,
        replacementPending,
        setReplacementPending,
    };
}
