import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { apiRequest, API_BASE_URL } from '@/lib/api';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { compressImages } from '@/lib/clientImageCompressor';
import { Service } from '@/components/public/ServiceSelectionStep';
import { saveDraftImages, loadDraftImages, clearDraftImages } from '@/lib/formDraftImages';
import { MAX_MEMORIAL_PHOTOS } from '@/components/public/ImageUploadStep';
import { mergeWelcomeModal, resolveFormConfig, type PublicFormConfig, type WeightTier } from '@/lib/publicFormConfig';

export interface Tenant {
    id: number;
    name: string;
    slug: string;
    logo_url?: string;
    phone?: string;
    email?: string;
    social_media?: any;
    country?: string;
    region?: string;
    city?: string;
    /** Campos visibles/obligatorios del formulario (configurable por crematorio) */
    form_config?: PublicFormConfig | null;
    /** Tramos de peso del crematorio (precio solo si los muestra) */
    weight_tiers?: WeightTier[];
}

export interface OwnerData {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    commune: string;
    rut: string;
    veterinary: string;
    comments: string;
    service_code: string;
    contactPreference: 'whatsapp' | 'phone' | 'any' | '';
    region: string;
    pickupRegion?: string;
    pickupCommune?: string;
}

export interface PetData {
    name: string;
    nickname: string;
    type: string;
    breed: string;
    age: string;
    birthDate: string;
    deathDate: string;
    size: string;
    /** Rangos fijos previos: solo si el crematorio no definió tramos */
    weightRange: 'small' | 'medium' | 'large' | 'giant' | '';
    /** Tramo del crematorio elegido (id de srv_weight_pricing) */
    weightTierId: string;
    weightKg: string;
    dedication: string;
    healthStatus: string;
}

export const INITIAL_OWNER_DATA: OwnerData = {
    fullName: '',
    email: '',
    phone: '',
    address: '',
    commune: '',
    rut: '',
    veterinary: '',
    comments: '',
    service_code: '',
    contactPreference: '',
    region: '',
    pickupRegion: '',
    pickupCommune: '',
};

export const INITIAL_PET_DATA: PetData = {
    name: '',
    nickname: '',
    type: '',
    breed: '',
    age: '',
    birthDate: '',
    deathDate: '',
    size: '',
    weightRange: '',
    weightTierId: '',
    weightKg: '',
    dedication: '',
    healthStatus: '',
};

export function useTenantForm(
    slug: string,
    token: string | null,
    partnerSlug: string | null,
    widgetKey: string | null = null,
) {
    const { executeRecaptcha } = useGoogleReCaptcha();

    // Core State
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [submissionCode, setSubmissionCode] = useState<string>('');
    const [partnerId, setPartnerId] = useState<number | null>(null);
    const [partnerName, setPartnerName] = useState<string | null>(null);
    const [isExpired, setIsExpired] = useState(false);
    const [isExtending, setIsExtending] = useState(false);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    // Form Progress & Step
    const [currentStep, setCurrentStep] = useState(1);
    const [maxVisitedStep, setMaxVisitedStep] = useState(1);

    // Form Fields
    const [ownerData, setOwnerData] = useState<OwnerData>(INITIAL_OWNER_DATA);
    const [petData, setPetData] = useState<PetData>(INITIAL_PET_DATA);
    const [images, setImages] = useState<File[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);

    // Errors
    const [ownerErrors, setOwnerErrors] = useState<Record<string, string>>({});
    const [petErrors, setPetErrors] = useState<Record<string, string>>({});

    const storageKey = `form_data_${slug}`;
    const isFirstLoadRef = useRef(true);
    // Las fotos se guardan aparte (IndexedDB): no se escriben hasta haber
    // intentado restaurarlas, para no pisar el borrador con una lista vacía.
    const imagesRestoredRef = useRef(false);

    // 1. Carga de Tema
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (savedTheme) {
            setTheme(savedTheme);
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(prefersDark ? 'dark' : 'light');
        }
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-mode', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // 2. Carga inicial desde localStorage
    useEffect(() => {
        if (!slug) return;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.selectedServices && parsed.selectedServices.length > 0 && typeof parsed.selectedServices[0] === 'number') {
                    localStorage.removeItem(storageKey);
                    return;
                }
                if (parsed.ownerData) setOwnerData(prev => ({ ...prev, ...parsed.ownerData }));
                if (parsed.petData) setPetData(prev => ({ ...prev, ...parsed.petData }));
                if (parsed.selectedServices) setSelectedServices(parsed.selectedServices);
                if (parsed.currentStep) {
                    setCurrentStep(parsed.currentStep);
                    setMaxVisitedStep(parsed.maxVisitedStep || parsed.currentStep);
                }
            } catch (err) {
                console.error("Error loading from localStorage", err);
            }
        }
    }, [slug, storageKey]);

    // 2b. Fotos del borrador (IndexedDB): se restauran al entrar y se guardan en cada cambio.
    useEffect(() => {
        if (!slug) return;
        let cancelled = false;
        loadDraftImages(storageKey).then((files) => {
            if (cancelled) return;
            // Borradores antiguos podían tener más fotos que el máximo actual
            if (files.length > 0) setImages((prev) => (prev.length > 0 ? prev : files.slice(0, MAX_MEMORIAL_PHOTOS)));
            imagesRestoredRef.current = true;
        });
        return () => { cancelled = true; };
    }, [slug, storageKey]);

    useEffect(() => {
        if (!slug || isSuccess || !imagesRestoredRef.current) return;
        saveDraftImages(storageKey, images);
    }, [images, slug, storageKey, isSuccess]);

    const [farewellTemplate, setFarewellTemplate] = useState<any>(null);

    // 3. Guardado en LocalStorage con Debounce (400ms) para no bloquear escritura
    useEffect(() => {
        if (!slug || isSuccess) return;

        // Evitar sobreescribir con valores iniciales en el primer tick
        if (isFirstLoadRef.current) {
            isFirstLoadRef.current = false;
            return;
        }

        const handler = setTimeout(() => {
            const dataToSave = {
                ownerData,
                petData,
                selectedServices,
                currentStep,
                maxVisitedStep,
            };
            localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        }, 400);

        return () => clearTimeout(handler);
    }, [ownerData, petData, selectedServices, currentStep, maxVisitedStep, slug, storageKey, isSuccess]);

    // 4. Carga Paralela de Datos Iniciales (Tenant, Servicios, Plantilla de Despedida y Token si aplica)
    useEffect(() => {
        if (!slug) return;

        let isMounted = true;

        // El envío exige una credencial: token (temporal o permanente),
        // partner o API key del widget. Sin ninguna, el enlace no es válido.
        if (!token && !partnerSlug && !widgetKey) {
            setError('Este enlace no es válido. Solicita a la empresa el enlace del formulario.');
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const requests: [
                    Promise<Tenant>,
                    Promise<Service[]>,
                    Promise<any>,
                    Promise<any>?
                ] = [
                    apiRequest<Tenant>(`/api/public/tenant/${slug}`),
                    apiRequest<Service[]>(`/api/public/tenant/${slug}/services`),
                    apiRequest<any>(`/api/public/tenant/${slug}/farewell-template`).catch(() => null),
                ];

                if (token) {
                    requests.push(
                        fetch(`${API_BASE_URL}/api/public/verify-token?token=${token}&tenant_slug=${slug}`)
                            .then(res => res.ok ? res.json() : { expired: false })
                            .catch(() => ({ expired: false }))
                    );
                }

                const [tenantData, servicesData, farewellData, tokenData] = await Promise.all(requests);

                if (!isMounted) return;

                setTenant(tenantData);
                setServices(servicesData);
                if (farewellData) {
                    setFarewellTemplate(farewellData);
                }

                // Máximo 1 plan seleccionado (los servicios adicionales se conservan)
                // y fuera los ítems que ya no se publican.
                const publishedIds = new Set(servicesData.map(s => s.id));
                setSelectedServices(prev => {
                    const firstPlan = prev.find(id => id.startsWith('plan_'));
                    return prev.filter(id => publishedIds.has(id) && (!id.startsWith('plan_') || id === firstPlan));
                });

                if (tokenData?.expired) {
                    setIsExpired(true);
                }
                setShowWelcomeModal(true);
            } catch (err: any) {
                if (!isMounted) return;
                console.error(err);
                setError(err.message || 'Empresa no encontrada o enlace inválido.');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [slug, token, partnerSlug, widgetKey]);

    // 5. Resolución de Partner en caso de estar presente
    useEffect(() => {
        if (partnerSlug && tenant) {
            fetch(`${API_BASE_URL}/api/public/partners/${tenant.slug}/${encodeURIComponent(partnerSlug)}`)
                .then(res => (res.ok ? res.json() : null))
                .then(data => {
                    if (data?.id_partner) {
                        setPartnerId(data.id_partner);
                        setPartnerName(data.nombre_clinica || null);
                    } else {
                        // Sin partner válido el envío sería rechazado al final: avisar desde el inicio.
                        setError('El enlace de la veterinaria no es válido o el convenio no está activo.');
                    }
                })
                .catch(err => {
                    console.warn('Could not resolve partner:', err);
                });
        }
    }, [partnerSlug, tenant]);

    // Custom form preset (ej. /form/[slug]?form=eutanasia o ?form=custom_id)
    const customFormParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('form') : null;

    const { formConfig, customFormPreset } = useMemo(() => {
        const base = resolveFormConfig(tenant?.form_config);
        if (!customFormParam) {
            return { formConfig: base, customFormPreset: null };
        }
        const matched = base.custom_forms?.find(
            cf => cf.id === customFormParam || cf.name.toLowerCase() === customFormParam.toLowerCase()
        );
        if (!matched) {
            return { formConfig: base, customFormPreset: null };
        }
        const merged = {
            ...base,
            phases: {
                ...base.phases,
                ...(matched.phases || {}),
            },
            fields: {
                ...base.fields,
                ...(matched.fields || {}),
                healthStatus: matched.include_health_status ? { visible: true, required: true } : (matched.fields?.healthStatus || base.fields.healthStatus),
            },
            delivery_notice: matched.delivery_notice || base.delivery_notice,
            welcome_modal: mergeWelcomeModal(base.welcome_modal, matched.welcome_modal),
        };
        return { formConfig: merged, customFormPreset: matched };
    }, [tenant, customFormParam]);

    // Auto-seleccionar servicio o plan asociado al formulario personalizado
    useEffect(() => {
        if (customFormPreset?.associated_service_id) {
            const assocId = customFormPreset.associated_service_id;
            setSelectedServices(prev => {
                if (prev.includes(assocId)) return prev;
                if (assocId.startsWith('plan_')) {
                    const withoutPlans = prev.filter(id => !id.startsWith('plan_'));
                    return [...withoutPlans, assocId];
                }
                return [...prev, assocId];
            });
        }
    }, [customFormPreset]);

    const weightTiers = useMemo(() => tenant?.weight_tiers ?? [], [tenant]);

    // 6. Validaciones
    const validateOwner = useCallback(() => {
        const errors: Record<string, string> = {};
        const f = formConfig.fields;
        const blank = (v?: string) => !(v || '').trim();
        if (!ownerData.fullName) errors.fullName = 'Requerido';
        if (!ownerData.phone) errors.phone = 'Requerido';
        if (f.rut.required && blank(ownerData.rut)) errors.rut = 'Requerido';
        if (f.email.required && blank(ownerData.email)) errors.email = 'Requerido';
        if (f.email.visible && ownerData.email && !/\S+@\S+\.\S+/.test(ownerData.email)) errors.email = 'Email inválido';
        if (f.contactPreference.required && !ownerData.contactPreference) errors.contactPreference = 'Selecciona una opción';
        if (f.address.required && blank(ownerData.address)) errors.address = 'Requerido';
        // Retiro y entrega son dos direcciones: el retiro puede ser obligatorio
        if (f.pickup.required && blank(ownerData.veterinary)) errors.veterinary = 'Requerido';
        if (f.comments.required && blank(ownerData.comments)) errors.comments = 'Requerido';

        if (ownerData.fullName.length > 50) errors.fullName = 'Máx 50 caracteres';
        if (ownerData.email && ownerData.email.length > 50) errors.email = 'Máx 50 caracteres';
        if ((ownerData.address || '').length > 70) errors.address = 'Máx 70 caracteres';
        if ((ownerData.rut || '').length > 13) errors.rut = 'RUT inválido';

        setOwnerErrors(errors);
        return Object.keys(errors).length === 0;
    }, [ownerData, formConfig]);

    const validatePet = useCallback(() => {
        const errors: Record<string, string> = {};
        const f = formConfig.fields;
        if (!petData.name) errors.name = 'Requerido';
        if (!petData.type) errors.type = 'Requerido';
        if (f.age.required && !petData.age) errors.age = 'Requerido';
        if (f.nickname.required && !(petData.nickname || '').trim()) errors.nickname = 'Requerido';
        if (f.breed.required && !(petData.breed || '').trim()) errors.breed = 'Requerido';
        if (f.birthDate.required && !petData.birthDate) errors.birthDate = 'Requerido';
        if (f.deathDate.required && !petData.deathDate) errors.deathDate = 'Requerido';
        if (f.healthStatus?.required && !(petData.healthStatus || '').trim()) errors.healthStatus = 'Requerido';

        // Con tramos del crematorio vale el tramo elegido; si no tiene, los rangos fijos previos
        const hasRange = weightTiers.length > 0
            ? weightTiers.some(t => String(t.id) === petData.weightTierId)
            : !!petData.weightRange;
        if (f.weight.required && !hasRange && !petData.weightKg) {
            errors.weightRange = 'Selecciona un rango de peso';
        }
        if (f.weight.visible && petData.weightKg) {
            const wkg = parseFloat(petData.weightKg);
            if (isNaN(wkg) || wkg <= 0 || wkg > 200) {
                errors.weightKg = 'Peso fuera de rango (0-200 kg)';
            }
        }

        const todayStr = new Date().toISOString().split('T')[0];
        if (petData.birthDate && petData.birthDate > todayStr) {
            errors.birthDate = 'La fecha de nacimiento no puede ser futura';
        }
        if (petData.deathDate && petData.deathDate > todayStr) {
            errors.deathDate = 'La fecha de fallecimiento no puede ser futura';
        }
        if (petData.birthDate && petData.deathDate && petData.birthDate > petData.deathDate) {
            errors.deathDate = 'No puede ser anterior a la fecha de nacimiento';
        }

        if ((petData.name || '').length > 50) errors.name = 'Máx 50 caracteres';
        if ((petData.breed || '').length > 20) errors.breed = 'Máx 20 caracteres';
        if ((petData.age || '').length > 3) errors.age = 'Máx 3 caracteres';
        if ((petData.nickname || '').length > 30) errors.nickname = 'Máx 30 caracteres';

        setPetErrors(errors);
        return Object.keys(errors).length === 0;
    }, [petData, formConfig, weightTiers]);

    // 6.1 Fases activas dinámicas
    const activeSteps = useMemo(() => {
        const steps: { id: 'familia' | 'angel' | 'camino' | 'recuerdos' | 'resumen'; name: string; phrase: string }[] = [];
        if (formConfig.phases.familia !== false) {
            steps.push({
                id: 'familia',
                name: 'Familia',
                phrase: 'Necesitamos conocerte para poder acompañarte de la mejor forma.',
            });
        }
        if (formConfig.phases.angel !== false) {
            steps.push({
                id: 'angel',
                name: 'Ángel',
                phrase: 'Cuéntanos sobre tu compañero de vida.',
            });
        }
        if (formConfig.phases.camino !== false) {
            steps.push({
                id: 'camino',
                name: 'Camino',
                phrase: 'Elige cómo quieres honrar su memoria.',
            });
        }
        if (formConfig.phases.recuerdos !== false) {
            steps.push({
                id: 'recuerdos',
                name: 'Recuerdos',
                phrase: 'Un último recuerdo para guardar para siempre.',
            });
        }
        steps.push({
            id: 'resumen',
            name: 'Resumen',
            phrase: 'Confirma que todo esté correcto antes de enviar.',
        });
        return steps;
    }, [formConfig.phases]);

    const currentStepDef = activeSteps[currentStep - 1] || activeSteps[0];
    const currentStepKey = currentStepDef?.id || 'familia';
    const totalSteps = activeSteps.length;

    // 7. Navegación entre pasos dinámicos
    const handleNext = useCallback(() => {
        const currentDef = activeSteps[currentStep - 1];
        if (!currentDef) return;

        if (currentDef.id === 'familia') {
            if (!validateOwner()) return;
        } else if (currentDef.id === 'angel') {
            if (!validatePet()) return;
        } else if (currentDef.id === 'recuerdos') {
            const mem = formConfig.memories;
            if (mem?.require_photos && images.length === 0) {
                alert('Por favor sube al menos una fotografía para continuar');
                return;
            }
            if (mem?.require_dedication && !petData.dedication?.trim()) {
                alert('Por favor escribe unas palabras de dedicatoria para continuar');
                return;
            }
        }

        if (currentStep < totalSteps) {
            setCurrentStep(prev => prev + 1);
            setMaxVisitedStep(prev => Math.max(prev, currentStep + 1));
        }
    }, [currentStep, totalSteps, activeSteps, validateOwner, validatePet, formConfig.memories, images, petData.dedication]);

    const handleBack = useCallback(() => {
        setCurrentStep(prev => Math.max(1, prev - 1));
    }, []);

    const handleEditFromSummary = useCallback((targetStep: number | string) => {
        if (typeof targetStep === 'string') {
            const idx = activeSteps.findIndex(s => s.id === targetStep);
            if (idx >= 0) {
                setCurrentStep(idx + 1);
            }
        } else {
            setCurrentStep(Math.min(targetStep, totalSteps));
        }
        setMaxVisitedStep(prev => Math.max(prev, totalSteps));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [activeSteps, totalSteps]);

    const goToStep = useCallback((targetStep: number) => {
        if (targetStep < 1 || targetStep > totalSteps) return;
        if (targetStep === currentStep) return;

        // Validaciones previas si se salta hacia adelante
        for (let s = 1; s < targetStep; s++) {
            const stepId = activeSteps[s - 1]?.id;
            if (stepId === 'familia' && !validateOwner()) return;
            if (stepId === 'angel' && !validatePet()) return;
        }

        setCurrentStep(targetStep);
        setMaxVisitedStep(prev => Math.max(prev, targetStep));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentStep, totalSteps, activeSteps, validateOwner, validatePet]);

    const toggleService = useCallback((id: string, singleSelect: boolean = false) => {
        setSelectedServices(prev => {
            if (singleSelect) {
                // Un solo ítem de su tipo (plan_*, svc_*…): los adicionales de otro tipo se mantienen.
                const kind = id.split('_')[0];
                const others = prev.filter(sid => sid.split('_')[0] !== kind);
                return prev.includes(id) ? others : [...others, id];
            }
            return prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id];
        });
    }, []);

    // 8. Extender Token
    const handleExtend = async () => {
        if (!token || !slug) return;
        setIsExtending(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/public/extend-token?token=${token}&tenant_slug=${slug}`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error("No se pudo extender el enlace.");

            setIsExpired(false);
            window.location.reload();
        } catch (err: any) {
            alert(err.message || "Error al extender el enlace");
        } finally {
            setIsExtending(false);
        }
    };

    // 9. Envío con compresión de imágenes en el cliente
    const handleSubmit = async () => {
        if (!tenant) return;
        setIsSubmitting(true);

        try {
            // Optimizar imágenes antes del envío
            const compressed = await compressImages(images.slice(0, MAX_MEMORIAL_PHOTOS));

            const formData = new FormData();
            formData.append('tenant_id', String(tenant.id));
            // Los campos que el crematorio oculta no se envían (un borrador
            // antiguo podría traerlos con datos).
            const f = formConfig.fields;
            const owner = { ...ownerData };
            if (!f.rut.visible) owner.rut = '';
            if (!f.email.visible) owner.email = '';
            if (!f.contactPreference.visible) owner.contactPreference = '';
            if (!f.comments.visible) owner.comments = '';
            if (!f.pickup.visible) { owner.veterinary = ''; owner.pickupRegion = ''; owner.pickupCommune = ''; }
            if (!f.address.visible) { owner.address = ''; owner.commune = ''; }
            const pet = { ...petData };
            if (!f.nickname.visible) pet.nickname = '';
            if (!f.breed.visible) pet.breed = '';
            if (!f.age.visible) pet.age = '';
            if (!f.birthDate.visible) pet.birthDate = '';
            if (!f.deathDate.visible) pet.deathDate = '';
            if (!f.weight.visible) { pet.weightKg = ''; pet.weightRange = ''; pet.weightTierId = ''; }
            if (!f.healthStatus?.visible) pet.healthStatus = '';
            if (weightTiers.length > 0) pet.weightRange = '';
            else pet.weightTierId = '';
            formData.append('owner_data', JSON.stringify(owner));
            formData.append('pet_data', JSON.stringify(pet));
            formData.append('selected_services', JSON.stringify(selectedServices));
            if (token) formData.append('token', token);
            if (widgetKey) formData.append('widget_key', widgetKey);
            if (customFormParam) formData.append('form_preset_id', customFormParam);

            if (executeRecaptcha) {
                try {
                    const recaptchaToken = await executeRecaptcha('submit_form');
                    formData.append('recaptcha_token', recaptchaToken);
                } catch (e) {
                    console.error('reCAPTCHA error:', e);
                }
            }

            if (partnerId) {
                formData.append('partner_id', partnerId.toString());
            }

            compressed.forEach((file) => {
                formData.append('files', file);
            });

            const response = await fetch(`${API_BASE_URL}/api/public/submit-form`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                let errorMsg = 'Error al enviar formulario';
                try {
                    const errData = await response.json();
                    if (Array.isArray(errData.detail)) {
                        errorMsg = errData.detail.map((e: any) => `${e.loc?.join('.') || 'campo'}: ${e.msg}`).join(', ');
                    } else if (typeof errData.detail === 'string') {
                        errorMsg = errData.detail;
                    } else if (errData.message) {
                        errorMsg = errData.message;
                    }
                } catch (e) {
                    const text = await response.text();
                    console.error('Non-JSON error response:', text);
                    errorMsg = `Error del servidor: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMsg);
            }

            try {
                const data = await response.json();
                setSubmissionCode(data?.code || '');
            } catch {
                // Éxito confirmado por response.ok
            }

            setIsSuccess(true);
            // El borrador solo se borra al registrar con éxito.
            localStorage.removeItem(storageKey);
            clearDraftImages(storageKey);
            window.scrollTo(0, 0);

        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Hubo un error al enviar el formulario. Por favor intenta nuevamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        tenant,
        formConfig,
        weightTiers,
        loading,
        error,
        isSubmitting,
        isSuccess,
        submissionCode,
        partnerId,
        partnerName,
        isExpired,
        isExtending,
        showWelcomeModal,
        setShowWelcomeModal,
        theme,
        setTheme,
        currentStep,
        setCurrentStep,
        maxVisitedStep,
        ownerData,
        setOwnerData,
        petData,
        setPetData,
        images,
        setImages,
        services,
        selectedServices,
        ownerErrors,
        petErrors,
        handleNext,
        handleBack,
        handleEditFromSummary,
        goToStep,
        toggleService,
        activeSteps,
        currentStepDef,
        currentStepKey,
        totalSteps,
        handleExtend,
        handleSubmit,
        farewellTemplate,
        customFormPreset,
    };
}
