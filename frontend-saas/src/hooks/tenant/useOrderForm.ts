"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { regions } from '@/lib/tenant/chile-data';
import { useAutoDraft } from '@/hooks/tenant/useAutoDraft';
import type { OrderTemplate } from '@/lib/tenant/orders/templates';
import {
    calculateWeightPrice,
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
    /** Callback tras un guardado exitoso, recibe la orden creada/actualizada (incluye verification_code). */
    onSaveSuccess?: (result: any) => void;
}

export function useOrderForm(options: UseOrderFormOptions = {}) {
    const {
        mode = 'full',
        requireImages = mode !== 'express',
        cremationTypeOverride,
        redirectAfterSave = mode !== 'express',
        enableDraft = mode !== 'express',
        onSaveSuccess,
    } = options;

    const { showToast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('id');

    // ==========================================
    // Catalog data (loaded once)
    // ==========================================
    const [pets, setPets] = useState<Pet[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [weightPricingRules, setWeightPricingRules] = useState<WeightPricingRule[]>([]);

    // ==========================================
    // Form state
    // ==========================================
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [currentCremation, setCurrentCremation] = useState<Partial<Cremation>>({
        pet_id: 0,
        status: mode === 'express' ? 'received' : 'pendiente',
        scheduled_at: new Date().toISOString().slice(0, 16),
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
        () => partners.find(p => p.id_partner === currentCremation.partner_id),
        [partners, currentCremation.partner_id]
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
    // Computed totals
    // ==========================================
    const grandTotal = useMemo(
        () =>
            calculateGrandTotal(
                selectedServices,
                selectedPlans,
                selectedProducts,
                currentCremation.weight_price || 0,
                currentCremation.discount || 0
            ),
        [selectedServices, selectedPlans, selectedProducts, currentCremation.weight_price, currentCremation.discount]
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
        const hasImages = (currentCremation.images?.length || 0) + localPreviews.length > 0;

        return {
            patient: { complete: hasPet, label: 'Mascota' },
            logistics: { complete: hasLogistics, label: 'Logística' },
            sales: { complete: hasServiceOrPlan, label: 'Servicios' },
            evidence: { complete: hasImages, label: 'Evidencia' },
        };
    }, [
        currentCremation.pet_id, currentCremation.scheduled_at,
        currentCremation.address, currentCremation.images,
        selectedServices.length, selectedPlans.length, localPreviews.length,
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
    const { getExistingDraft, saveDraft, clearDraft } = useAutoDraft({
        editId,
        isDirty: enableDraft && isDirty,
        currentCremation,
        selectedServices,
        selectedPlans,
        selectedProducts,
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
                apiRequest('/api/internal/partners/'),
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

            setPets(petsData);
            setPartners(partnersData);
            setServices(normalizeServices(servicesData));
            setPlans(normalizePlans(plansData));
            setCustomers(customersData);
            setWeightPricingRules(weightRules);
            setProducts(normalizeProducts(productsData));

            // Load existing cremation if editing
            if (editId) {
                const cremationData = await apiRequest(`/api/internal/cremations/${editId}`);
                const formState = mapCremationToFormState(cremationData, petsData);
                setCurrentCremation(formState);
                setOriginalCremation({ ...formState }); // Snapshot for diff tracking

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
                if (cremationData.productos && Array.isArray(cremationData.productos)) {
                    setSelectedProducts(mapCremationProducts(cremationData.productos, productsData));
                }
                if (cremationData.servicios && Array.isArray(cremationData.servicios)) {
                    setSelectedServices(mapCremationServices(cremationData.servicios, servicesData));
                }
                if (cremationData.planes && Array.isArray(cremationData.planes)) {
                    setSelectedPlans(mapCremationPlans(cremationData.planes, plansData));
                }
            }
        } catch (err: any) {
            showToast(err.message, 'error');
            if (editId) router.push('/dashboard/asignacion-servicios');
        } finally {
            setLoading(false);
        }
    }, [editId]);

    useEffect(() => {
        fetchData().then(() => {
            // After data loads, check for existing draft
            if (!editId && enableDraft) {
                const draft = getExistingDraft();
                if (draft) {
                    setDraftPrompt({ savedAt: draft.savedAt });
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
    const handleAddProduct = useCallback((productId: string) => {
        const product = products.find(p => p.id === Number(productId));
        if (!product) return;

        if (product.stock <= 0) {
            showToast('Producto sin stock', 'error');
            return;
        }

        const existing = selectedProducts.find(p => p.id === product.id);
        if (existing) {
            if (existing.quantity + 1 > product.stock) {
                showToast(`Stock insuficiente para "${product.name}". Disponible: ${product.stock}`, 'error');
                return;
            }
            setSelectedProducts(prev =>
                prev.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            );
            return;
        }

        const activePlan = selectedPlans[0];
        const planDetails = activePlan ? plans.find(p => p.id === activePlan.plan_id) : null;
        const isIncludedInPlan = planDetails?.products?.some(p => p.id === product.id || p.name.toLowerCase() === product.name.toLowerCase());

        if (isIncludedInPlan) {
            setReplacementPending({
                type: 'product',
                currentName: `${activePlan!.name} (Incluido)`,
                newName: product.name,
                isConflict: true,
                conflictMessage: `Esta urna/producto ya está incluida de forma gratuita en el plan "${activePlan!.name}". Al confirmarlo, se agregará como un elemento de cargo adicional extra.`,
                customLabels: {
                    title: 'Producto Incluido en Plan',
                    currentHeader: 'Incluido en Plan',
                    newHeader: 'Producto Extra',
                    currentAction: 'Gratis',
                    newAction: 'Cargo Extra',
                },
                onConfirm: () => {
                    setSelectedProducts(prev => [
                        ...prev,
                        {
                            id: product.id,
                            product_id: product.id,
                            name: product.name,
                            quantity: 1,
                            unit_price: product.unit_price,
                            unit_cost: product.cost_price,
                            image_url: product.image_url,
                        },
                    ]);
                    setReplacementPending(null);
                    showToast('Producto agregado con cargo extra', 'success');
                },
            });
            return;
        }

        // Intercept if there's already a different product selected
        if (selectedProducts.length > 0) {
            const currentProduct = selectedProducts[0];
            setReplacementPending({
                type: 'product',
                currentName: currentProduct.name,
                newName: product.name,
                onConfirm: () => {
                    setSelectedProducts([
                        {
                            id: product.id,
                            product_id: product.id,
                            name: product.name,
                            quantity: 1,
                            unit_price: product.unit_price,
                            unit_cost: product.cost_price,
                            image_url: product.image_url,
                        },
                    ]);
                    setReplacementPending(null);
                    showToast('Producto reemplazado con éxito', 'success');
                },
            });
            return;
        }

        setSelectedProducts(prev => [
            ...prev,
            {
                id: product.id,
                product_id: product.id,
                name: product.name,
                quantity: 1,
                unit_price: product.unit_price,
                unit_cost: product.cost_price,
                image_url: product.image_url,
            },
        ]);
    }, [products, selectedProducts, selectedPlans, plans, showToast]);

    const handleRemoveProduct = useCallback((index: number) => {
        setSelectedProducts(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleUpdateProduct = useCallback((index: number, field: keyof SelectedProduct, value: number) => {
        if (field === 'quantity') {
            const item = selectedProducts[index];
            const product = products.find(p => p.id === item.product_id);
            if (product && value > product.stock) {
                showToast(`Stock insuficiente para "${item.name}". Disponible: ${product.stock}`, 'error');
                return;
            }
        }
        setSelectedProducts(prev =>
            prev.map((item, i) => (i !== index ? item : { ...item, [field]: value }))
        );
    }, [selectedProducts, products, showToast]);

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
    const handleAddPlan = useCallback((planId: number) => {
        const original = plans.find(p => p.id === planId);
        if (!original) return;

        const existing = selectedPlans.find(p => p.plan_id === planId);
        if (existing) return; // Already selected, do nothing

        const executeAddPlan = () => {
            setSelectedPlans([
                {
                    plan_id: planId,
                    unit_price: original.unit_price ?? original.price ?? 0,
                    unit_cost: original.unit_cost ?? original.cost ?? 0,
                    name: original.name,
                    es_principal: true,
                },
            ]);

            // Add included products if any
            if (original.products && original.products.length > 0) {
                let insufficientStock = false;
                original.products.forEach(p => {
                    const availableProduct = products.find(prod => prod.id === p.id);
                    const currentQty = selectedProducts.find(item => item.product_id === p.id)?.quantity || 0;
                    if (availableProduct && currentQty + 1 > availableProduct.stock) {
                        showToast(
                            `Stock insuficiente para "${p.name}" incluido en el plan. Disponible: ${availableProduct.stock}`,
                            'error'
                        );
                        insufficientStock = true;
                    }
                });

                if (insufficientStock) return;

                setSelectedProducts(prev => {
                    let next = [...prev];
                    original.products.forEach(p => {
                        const alreadyExists = next.find(item => item.product_id === p.id);
                        if (alreadyExists) {
                            next = next.map(item =>
                                item.product_id === p.id
                                    ? { ...item, quantity: item.quantity + 1 }
                                    : item
                            );
                        } else {
                            next.push({
                                id: p.id,
                                product_id: p.id,
                                name: p.name,
                                unit_price: p.unit_price ?? p.sale_price ?? 0,
                                unit_cost: p.unit_cost ?? p.cost_price ?? 0,
                                quantity: 1,
                                image_url: p.image_url,
                            });
                        }
                    });
                    return next;
                });
            }

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
    }, [plans, products, selectedProducts, selectedPlans, showToast]);

    const handleRemovePlanItem = useCallback((index: number) => {
        setSelectedPlans(prev => {
            const next = prev.filter((_, i) => i !== index);
            if (prev[index]?.es_principal && next.length > 0) {
                next[0] = { ...next[0], es_principal: true };
            }
            return next;
        });
    }, []);

    const handleSetPrincipalPlan = useCallback((index: number) => {
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
        const wp = calculateWeightPrice(w, weightPricingRules);
        setCurrentCremation(prev => ({
            ...prev,
            weight: w,
            weight_price: wp,
        }));
    }, [weightPricingRules]);

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

        if (requireImages && selectedImages.length === 0 && (!currentCremation.images || currentCremation.images.length === 0)) {
            showToast('Debe subir al menos 1 imagen', 'error');
            return;
        }

        // Final stock validation
        for (const item of selectedProducts) {
            const product = products.find(p => p.id === item.product_id);
            if (product && item.quantity > product.stock) {
                showToast('No tenemos stock de este producto', 'error');
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
                scheduled_at: currentCremation.scheduled_at
                    ? new Date(currentCremation.scheduled_at).toISOString()
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
                })),
                total_price: grandTotal,
                total_cost: grandTotalCost,
                partner_id: currentCremation.partner_id || null,
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

            showToast(`Servicio ${isEdit ? 'actualizado' : 'registrado'} con éxito`, 'success');
            if (enableDraft) clearDraft();  // Remove localStorage draft on success
            setIsDirty(false);  // Prevent beforeunload on navigation

            // result puede no traer las imágenes recién subidas, pero sí id + verification_code
            onSaveSuccess?.(result);

            if (redirectAfterSave) {
                router.push('/dashboard/asignacion-servicios');
            }
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setIsSaving(false);
        }
    }, [
        currentCremation, selectedServices, selectedPlans, selectedProducts,
        selectedImages, grandTotal, grandTotalCost, editId, products, router, showToast,
        requireImages, cremationTypeOverride, enableDraft, redirectAfterSave, onSaveSuccess, clearDraft
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
        customers,
        setCustomers,
        services,
        plans,
        products,
        partners,
        weightPricingRules,
        refreshData: fetchData,

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

        // Computed
        grandTotal,
        grandTotalCost,

        // Handlers
        handleStatusChange,
        handleConfirmCancel,
        handlePetChange,
        syncAddressFromCustomer,
        syncImagesFromPet,
        handleImageSelect,
        handleCropComplete,
        handleRemoveLocalImage,
        handleRemoveRemoteImage,
        handleAddProduct,
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
