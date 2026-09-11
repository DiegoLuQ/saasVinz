import { useState, useEffect, useRef, useCallback } from 'react';
import { apiRequest, API_BASE_URL } from '@/lib/api';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { compressImages } from '@/lib/clientImageCompressor';
import { Service } from '@/components/public/ServiceSelectionStep';

export interface Tenant {
    id: number;
    name: string;
    slug: string;
    logo_url?: string;
    phone?: string;
    email?: string;
    social_media?: any;
    public_token?: string;
    country?: string;
    region?: string;
    city?: string;
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
    weightRange: 'small' | 'medium' | 'large' | 'giant' | '';
    weightKg: string;
    dedication: string;
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
    weightKg: '',
    dedication: '',
};

export function useTenantForm(slug: string, token: string | null, partnerSlug: string | null) {
    const { executeRecaptcha } = useGoogleReCaptcha();

    // Core State
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [submissionCode, setSubmissionCode] = useState<string>('');
    const [partnerId, setPartnerId] = useState<number | null>(null);
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

                // Si hay planes configurados, asegurar que solo haya máximo 1 plan seleccionado
                const hasPlans = servicesData.some(s => (s.category || '').toLowerCase() === 'plan');
                if (hasPlans) {
                    setSelectedServices(prev => (prev.length > 1 ? [prev[0]] : prev));
                }

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
    }, [slug, token]);

    // 5. Resolución de Partner en caso de estar presente
    useEffect(() => {
        if (partnerSlug && tenant) {
            fetch(`${API_BASE_URL}/api/public/partners/${tenant.slug}/${partnerSlug}`)
                .then(res => (res.ok ? res.json() : null))
                .then(data => {
                    if (data?.id_partner) {
                        setPartnerId(data.id_partner);
                    }
                })
                .catch(err => {
                    console.warn('Could not resolve partner:', err);
                });
        }
    }, [partnerSlug, tenant]);

    // 6. Validaciones
    const validateOwner = useCallback(() => {
        const errors: Record<string, string> = {};
        if (!ownerData.fullName) errors.fullName = 'Requerido';
        if (ownerData.email && !/\S+@\S+\.\S+/.test(ownerData.email)) errors.email = 'Email inválido';
        if (!ownerData.phone) errors.phone = 'Requerido';
        if (!ownerData.address) errors.address = 'Requerido';

        if (ownerData.fullName.length > 50) errors.fullName = 'Máx 50 caracteres';
        if (ownerData.email && ownerData.email.length > 50) errors.email = 'Máx 50 caracteres';
        if ((ownerData.address || '').length > 70) errors.address = 'Máx 70 caracteres';
        if ((ownerData.rut || '').length > 13) errors.rut = 'RUT inválido';

        setOwnerErrors(errors);
        return Object.keys(errors).length === 0;
    }, [ownerData]);

    const validatePet = useCallback(() => {
        const errors: Record<string, string> = {};
        if (!petData.name) errors.name = 'Requerido';
        if (!petData.type) errors.type = 'Requerido';
        if (!petData.age) errors.age = 'Requerido';

        if (!petData.weightRange && !petData.weightKg) {
            errors.weightRange = 'Selecciona un rango de peso';
        }
        if (petData.weightKg) {
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
    }, [petData]);

    // 7. Navegación entre pasos
    const handleNext = useCallback(() => {
        if (currentStep === 1) {
            if (validateOwner()) {
                setCurrentStep(2);
                setMaxVisitedStep(prev => Math.max(prev, 2));
            }
        } else if (currentStep === 2) {
            if (validatePet()) {
                setCurrentStep(3);
                setMaxVisitedStep(prev => Math.max(prev, 3));
            }
        } else if (currentStep === 3) {
            setCurrentStep(4);
            setMaxVisitedStep(prev => Math.max(prev, 4));
        } else if (currentStep === 4) {
            setCurrentStep(5);
            setMaxVisitedStep(prev => Math.max(prev, 5));
        }
    }, [currentStep, validateOwner, validatePet]);

    const handleBack = useCallback(() => {
        setCurrentStep(prev => Math.max(1, prev - 1));
    }, []);

    const handleEditFromSummary = useCallback((step: number) => {
        setCurrentStep(step);
        setMaxVisitedStep(prev => Math.max(prev, 5));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const goToStep = useCallback((targetStep: number) => {
        if (targetStep < 1 || targetStep > 5) return;
        if (targetStep === currentStep) return;

        // Validaciones previas si se salta hacia adelante
        if (currentStep === 1 && targetStep > 1 && !validateOwner()) return;
        if (currentStep <= 2 && targetStep > 2 && !validatePet()) return;

        setCurrentStep(targetStep);
        setMaxVisitedStep(prev => Math.max(prev, targetStep));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentStep, validateOwner, validatePet]);

    const toggleService = useCallback((id: string, singleSelect: boolean = false) => {
        setSelectedServices(prev => {
            if (singleSelect) {
                return prev.includes(id) ? [] : [id];
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
            const compressed = await compressImages(images);

            const formData = new FormData();
            formData.append('tenant_id', String(tenant.id));
            formData.append('owner_data', JSON.stringify(ownerData));
            formData.append('pet_data', JSON.stringify(petData));
            formData.append('selected_services', JSON.stringify(selectedServices));
            formData.append('token', token || tenant.public_token || '');

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
            localStorage.removeItem(storageKey);
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
        loading,
        error,
        isSubmitting,
        isSuccess,
        submissionCode,
        partnerId,
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
        handleExtend,
        handleSubmit,
        farewellTemplate,
    };
}
