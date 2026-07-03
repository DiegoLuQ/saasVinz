"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { apiRequest, API_BASE_URL } from '@/lib/api';
import { buildTrackingUrl } from '@/lib/publicUrls';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, ChevronRight, ChevronLeft, Send, CheckCircle2, Sun, Moon, Copy, Check, ExternalLink } from 'lucide-react';
import Image from 'next/image';

// Components
import StepIndicator from '@/components/public/StepIndicator';
import OwnerInfoStep from '@/components/public/OwnerInfoStep';
import PetInfoStep from '@/components/public/PetInfoStep';
import ServiceSelectionStep, { Service } from '@/components/public/ServiceSelectionStep';
import MemoryStep from '@/components/public/MemoryStep';
import CondolenceModal from '@/components/public/CondolenceModal';
import SkyBackground from '@/components/public/SkyBackground';
import Link from 'next/link';

interface Tenant {
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

export default function TenantFormPage() {
    const { executeRecaptcha } = useGoogleReCaptcha();
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const slug = params.slug as string;
    const token = searchParams.get('token');

    // Core State
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [submissionCode, setSubmissionCode] = useState<string>('');
    const [copiedTrackLink, setCopiedTrackLink] = useState(false);
    const [partnerId, setPartnerId] = useState<number | null>(null);
    const [isExpired, setIsExpired] = useState(false);
    const [isExtending, setIsExtending] = useState(false);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    // Load theme from localStorage on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (savedTheme) {
            setTheme(savedTheme);
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(prefersDark ? 'dark' : 'light');
        }
    }, []);

    // Update theme class on change
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-mode', 'dark');
        } else {
            document.documentElement.setAttribute('data-mode', 'light');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Form State
    const [currentStep, setCurrentStep] = useState(1);

    const [ownerData, setOwnerData] = useState({
        fullName: '',
        email: '',
        phone: '',
        address: '',
        commune: '',
        rut: '',
        veterinary: '',
        comments: '',
        service_code: '',
        contactPreference: '' as 'whatsapp' | 'phone' | 'any' | '',
        region: ''
    });

    const [petData, setPetData] = useState({
        name: '',
        nickname: '',
        type: '',
        breed: '',
        age: '',
        birthDate: '',
        deathDate: '',
        size: '', // legacy (no se muestra)
        weightRange: '' as 'small' | 'medium' | 'large' | 'giant' | '',
        weightKg: '',
        dedication: ''
    });

    const [images, setImages] = useState<File[]>([]);

    // Services State
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);

    // Validation Errors (string messages, not constrained to literal union types)
    const [ownerErrors, setOwnerErrors] = useState<Record<string, string>>({});
    const [petErrors, setPetErrors] = useState<Record<string, string>>({});

    // LocalStorage Keys
    const storageKey = `form_data_${slug}`;

    // Load from LocalStorage
    useEffect(() => {
        if (!slug) return;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);

                // Compatibility/Cleanup: If selectedServices contains numbers, it's old data. Clear it.
                if (parsed.selectedServices && parsed.selectedServices.length > 0) {
                    if (typeof parsed.selectedServices[0] === 'number') {
                        localStorage.removeItem(storageKey);
                        return;
                    }
                }

                // Merge con defaults para que campos nuevos no queden undefined
                if (parsed.ownerData) setOwnerData(prev => ({ ...prev, ...parsed.ownerData }));
                if (parsed.petData) setPetData(prev => ({ ...prev, ...parsed.petData }));
                if (parsed.selectedServices) setSelectedServices(parsed.selectedServices);
                if (parsed.currentStep) setCurrentStep(parsed.currentStep);
            } catch (err) {
                console.error("Error loading from localStorage", err);
            }
        }
    }, [slug, storageKey]);

    // Save to LocalStorage
    useEffect(() => {
        if (!slug || isSuccess) return;
        const dataToSave = {
            ownerData,
            petData,
            selectedServices,
            currentStep
        };
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    }, [ownerData, petData, selectedServices, currentStep, slug, storageKey, isSuccess]);

    // Initial Data Fetch
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Verify Token first if present
                if (token) {
                    try {
                        const verifyRes = await fetch(`${API_BASE_URL}/api/public/verify-token?token=${token}&tenant_slug=${slug}`);
                        if (verifyRes.ok) {
                            const verifyData = await verifyRes.json();
                            if (verifyData.expired) {
                                setIsExpired(true);
                            }
                        }
                    } catch (e) {
                        console.warn("Could not verify token:", e);
                    }
                }

                const [tenantData, servicesData] = await Promise.all([
                    apiRequest<Tenant>(`/api/public/tenant/${slug}`),
                    apiRequest<Service[]>(`/api/public/tenant/${slug}/services`)
                ]);
                setTenant(tenantData);
                setServices(servicesData);
                setShowWelcomeModal(true); // Trigger welcome modal
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Empresa no encontrada o enlace inválido.');
            } finally {
                setLoading(false);
            }
        };

        if (slug) fetchData();
    }, [slug, token]);

    const handleExtend = async () => {
        if (!token || !slug) return;
        setIsExtending(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/public/extend-token?token=${token}&tenant_slug=${slug}`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error("No se pudo extender el enlace.");

            setIsExpired(false);
            // Reload to ensure all states are clean and we retry fetching data
            window.location.reload();
        } catch (err: any) {
            alert(err.message || "Error al extender el enlace");
        } finally {
            setIsExtending(false);
        }
    };

    // NEW: Resolve Partner Logic
    useEffect(() => {
        const partnerSlug = searchParams.get('partner');
        if (partnerSlug && tenant) {
            console.log("Resolving partner:", partnerSlug);
            fetch(`${API_BASE_URL}/api/public/partners/${tenant.slug}/${partnerSlug}`)
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error('Partner not found');
                })
                .then(data => {
                    console.log("Partner resolved:", data);
                    setPartnerId(data.id_partner);
                })
                .catch(err => {
                    console.warn('Could not resolve partner:', err);
                });
        }
    }, [searchParams, tenant]);

    const validateOwner = () => {
        const errors: Record<string, string> = {};
        if (!ownerData.fullName) errors.fullName = 'Requerido';
        if (!ownerData.email) errors.email = 'Requerido';
        else if (!/\S+@\S+\.\S+/.test(ownerData.email)) errors.email = 'Email inválido';
        if (!ownerData.phone) errors.phone = 'Requerido';
        if (!ownerData.address) errors.address = 'Requerido';

        // Length validations
        if (ownerData.fullName.length > 50) errors.fullName = 'Máx 50 caracteres';
        if (ownerData.email.length > 50) errors.email = 'Máx 50 caracteres';
        if ((ownerData.address || '').length > 70) errors.address = 'Máx 70 caracteres';
        if ((ownerData.rut || '').length > 13) errors.rut = 'RUT inválido';

        setOwnerErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validatePet = () => {
        const errors: Record<string, string> = {};
        if (!petData.name) errors.name = 'Requerido';
        if (!petData.type) errors.type = 'Requerido';
        if (!petData.age) errors.age = 'Requerido';

        // Peso: requerimos rango O exacto
        if (!petData.weightRange && !petData.weightKg) {
            errors.weightRange = 'Selecciona un rango de peso';
        }
        if (petData.weightKg) {
            const wkg = parseFloat(petData.weightKg);
            if (isNaN(wkg) || wkg <= 0 || wkg > 200) {
                errors.weightKg = 'Peso fuera de rango (0-200 kg)';
            }
        }

        // Validación de fechas
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

        // Length validations (defensivo ante localStorage de versiones previas)
        if ((petData.name || '').length > 50) errors.name = 'Máx 50 caracteres';
        if ((petData.breed || '').length > 20) errors.breed = 'Máx 20 caracteres';
        if ((petData.age || '').length > 3) errors.age = 'Máx 3 caracteres';
        if ((petData.nickname || '').length > 30) errors.nickname = 'Máx 30 caracteres';

        setPetErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleNext = () => {
        if (currentStep === 1) {
            if (validateOwner()) setCurrentStep(2);
        } else if (currentStep === 2) {
            if (validatePet()) setCurrentStep(3);
        } else if (currentStep === 3) {
            setCurrentStep(4);
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(1, prev - 1));
    };

    const toggleService = (id: string) => {
        setSelectedServices(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    const handleSubmit = async () => {
        if (!tenant) return;
        setIsSubmitting(true);

        try {
            // Prepare FormData for file upload
            const formData = new FormData();
            formData.append('tenant_id', String(tenant.id));
            formData.append('owner_data', JSON.stringify(ownerData));
            formData.append('pet_data', JSON.stringify(petData));
            formData.append('selected_services', JSON.stringify(selectedServices));
            formData.append('token', token || '');

            // Anti-bot: token reCAPTCHA v3
            if (executeRecaptcha) {
                try {
                    const recaptchaToken = await executeRecaptcha('submit_form');
                    formData.append('recaptcha_token', recaptchaToken);
                } catch (e) {
                    console.error('reCAPTCHA error:', e);
                }
            }

            // NEW: Add partner_id if present
            if (partnerId) {
                formData.append('partner_id', partnerId.toString());
            }

            images.forEach((file) => {
                formData.append('files', file);
            });

            // Using raw fetch because our apiRequest helper is JSON-optimized
            const response = await fetch(`${API_BASE_URL}/api/public/submit-form`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                let errorMsg = 'Error al enviar formulario';
                try {
                    const errData = await response.json();
                    errorMsg = errData.detail || errorMsg;
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
                // ignorar errores parseando, el éxito ya está confirmado por response.ok
            }

            setIsSuccess(true);
            localStorage.removeItem(storageKey);
            window.scrollTo(0, 0);

        } catch (err) {
            console.error(err);
            alert('Hubo un error al enviar el formulario. Por favor intenta nuevamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Renders ---

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center relative">
                <SkyBackground />
                <Loader2 className="w-10 h-10 text-sky-500 animate-spin mb-4 relative z-10" />
                <p className="text-sky-900/40 text-xs font-black uppercase tracking-widest animate-pulse relative z-10">Cargando formulario...</p>
            </div>
        );
    }

    if (error || !tenant) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative">
                <SkyBackground />
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-3xl flex items-center justify-center mb-6 border border-red-500/20 backdrop-blur-md">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight mb-2">Enlace no disponible</h1>
                    <p className="text-slate-500 text-xs font-bold uppercase max-w-md">
                        {error || 'No pudimos encontrar la información de la empresa. Por favor verifica el enlace.'}
                    </p>
                </div>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 relative">
                <SkyBackground />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[3rem] shadow-2xl p-10 text-center border border-white/60 dark:border-slate-800/80 relative z-10"
                >
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 dark:border-emerald-500/40">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 italic uppercase tracking-tight mb-4">
                        ¡Gracias de todo corazón!
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed text-sm font-medium">
                        Hemos recibido tu información y la guardaremos con todo el respeto que tu compañero merece.
                        El equipo de <span className="text-emerald-500 dark:text-emerald-400 font-black">{tenant.name}</span> se pondrá en contacto contigo a la brevedad para acompañarte en este momento tan especial.
                    </p>

                    {submissionCode && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="mb-8 rounded-3xl p-6 bg-gradient-to-br from-emerald-50 to-sky-50 dark:from-slate-800/60 dark:to-slate-800/30 border border-emerald-200/60 dark:border-emerald-500/20 shadow-inner"
                        >
                            <p className="text-[10px] uppercase font-black tracking-[0.25em] text-slate-500 dark:text-slate-400 mb-3">
                                Tu código de solicitud
                            </p>
                            <p className="font-mono text-2xl sm:text-3xl font-black tracking-[0.25em] text-slate-800 dark:text-emerald-300 select-all break-all">
                                {submissionCode}
                            </p>
                            <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                Guárdalo. Te servirá para identificar tu solicitud al hablar con {tenant.name}.
                            </p>
                        </motion.div>
                    )}

                    {submissionCode && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="mb-8 rounded-3xl p-6 bg-gradient-to-br from-indigo-50/80 to-purple-50/80 dark:from-slate-800/40 dark:to-slate-800/20 border border-indigo-200/40 dark:border-indigo-500/20 shadow-inner"
                        >
                            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-indigo-500 dark:text-indigo-400 mb-3">
                                Enlace de Seguimiento en Vivo
                            </p>
                            
                            <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-950/90 p-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                                <span className="text-xs font-mono truncate text-slate-600 dark:text-slate-400 select-all text-left flex-1 pl-2">
                                    {buildTrackingUrl(tenant.slug, petData.name, submissionCode)}
                                </span>
                                <button
                                    onClick={() => {
                                        const url = buildTrackingUrl(tenant.slug, petData.name, submissionCode);
                                        navigator.clipboard.writeText(url);
                                        setCopiedTrackLink(true);
                                        setTimeout(() => setCopiedTrackLink(false), 2000);
                                    }}
                                    className="p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer"
                                    title="Copiar enlace"
                                    type="button"
                                >
                                    {copiedTrackLink ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                                <a
                                    href={buildTrackingUrl(tenant.slug, petData.name, submissionCode)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer"
                                    title="Abrir enlace"
                                >
                                    <ExternalLink size={14} />
                                </a>
                            </div>
                            
                            <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                Guarda este enlace, que será el seguimiento en vivo hacia tu mascotita.
                            </p>
                        </motion.div>
                    )}

                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-emerald-500 text-white dark:text-slate-950 font-black py-4 rounded-2xl text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        Volver al inicio
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-10 sm:py-16 px-4 sm:px-6 lg:px-8 relative">
            <SkyBackground />

            {/* Floating Theme Toggle */}
            <div className="fixed top-4 right-4 z-50">
                <button
                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                    className="p-3.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                    title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
                >
                    {theme === 'light' ? (
                        <motion.div initial={{ rotate: -30 }} animate={{ rotate: 0 }} transition={{ type: 'spring' }}>
                            <Moon size={18} />
                        </motion.div>
                    ) : (
                        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                            <Sun size={18} />
                        </motion.div>
                    )}
                </button>
            </div>

            <div className="max-w-2xl mx-auto relative z-10">
                {/* Condolence Modal */}
                {tenant && (
                    <CondolenceModal
                        isOpen={showWelcomeModal}
                        onClose={() => setShowWelcomeModal(false)}
                        tenant={tenant}
                    />
                )}

                {/* Header / Branding */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    {tenant.logo_url ? (
                        <div className="relative w-24 h-24 mx-auto mb-6 rounded-full overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-500 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                            <Image
                                src={tenant.logo_url && tenant.logo_url.startsWith('/')
                                    ? `${API_BASE_URL}${tenant.logo_url}`
                                    : tenant.logo_url || ''}
                                alt={tenant.name}
                                fill
                                className="object-cover"
                                unoptimized
                            />
                        </div>
                    ) : (
                        <div className="w-24 h-24 mx-auto mb-6 bg-sky-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 rounded-full flex items-center justify-center text-4xl font-black italic shadow-2xl border-4 border-white dark:border-slate-900">
                            {tenant.name.charAt(0)}
                        </div>
                    )}

                    <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 uppercase italic tracking-tighter drop-shadow-sm">{tenant.name}</h1>
                    <div className="h-1 w-12 bg-sky-400 mx-auto mt-4 rounded-full" />
                </motion.div>

                {/* Progress Steps */}
                <div className="mb-10">
                    <StepIndicator currentStep={currentStep} steps={['Dueño', 'Mascota', 'Servicios', 'Recuerdos']} isDark={theme === 'dark'} />
                </div>

                {/* Form Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl rounded-[3.5rem] shadow-2xl shadow-sky-900/5 border border-white/60 dark:border-slate-800/80 overflow-hidden relative"
                >
                    <div className="p-8 sm:p-14">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                {currentStep === 1 && (
                                    <OwnerInfoStep
                                        data={ownerData}
                                        updateData={(d) => setOwnerData(prev => ({ ...prev, ...d }))}
                                        errors={ownerErrors}
                                        tenantSlug={slug}
                                        hideServiceCode={!!partnerId}
                                        tenantCountry={tenant.country}
                                        tenantRegion={tenant.region}
                                    />
                                )}
                                {currentStep === 2 && (
                                    <PetInfoStep
                                        data={petData}
                                        updateData={(d) => setPetData(prev => ({ ...prev, ...d }))}
                                        errors={petErrors}
                                    />
                                )}
                                {currentStep === 3 && (
                                    <ServiceSelectionStep
                                        services={services}
                                        selectedServices={selectedServices}
                                        toggleService={toggleService}
                                    />
                                )}
                                {currentStep === 4 && (
                                    <MemoryStep
                                        images={images}
                                        setImages={setImages}
                                        petName={petData.name}
                                        petNickname={petData.nickname}
                                        dedication={petData.dedication}
                                        onDedicationChange={(text) => setPetData(prev => ({ ...prev, dedication: text }))}
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="bg-white/50 dark:bg-slate-950/40 p-8 px-12 flex justify-between items-center border-t border-slate-100 dark:border-slate-800/80">
                        <button
                            onClick={handleBack}
                            disabled={currentStep === 1}
                            className={`flex items-center text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-2xl transition-all ${currentStep === 1 ? 'opacity-0 pointer-events-none' : 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                        >
                            <ChevronLeft size={16} className="mr-2" />
                            Atrás
                        </button>

                        {currentStep < 4 ? (
                            <button
                                onClick={handleNext}
                                className="bg-slate-800 dark:bg-slate-950 text-white dark:text-slate-300 dark:border dark:border-slate-800/80 font-black py-4 px-10 rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center hover:bg-slate-900 dark:hover:bg-slate-900 cursor-pointer"
                            >
                                Siguiente
                                <ChevronRight size={16} className="ml-2" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="bg-emerald-500 text-[#020617] dark:text-slate-950 font-black py-4 px-8 rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 dark:shadow-none hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center disabled:opacity-50 cursor-pointer"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={16} className="mr-2 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        Enviar Información
                                        <Send size={16} className="ml-2" />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </motion.div>

                {/* Secure Footer */}
                <div className="mt-16 text-center space-y-4 max-w-md mx-auto px-4 pb-8 border-t border-slate-200/20 dark:border-slate-800/40 pt-8">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        {process.env.NEXT_PUBLIC_VINCER_SLOGAN || "Innovación y sensibilidad en la gestión funeraria y memoriales."}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-[10px] uppercase tracking-[0.15em] font-semibold">
                        <Link 
                            href={process.env.NEXT_PUBLIC_VINCER_URL || "https://vincer.app"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition-colors underline decoration-sky-500/30 underline-offset-4"
                        >
                            Visita Vincer
                        </Link>
                        <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
                        <p className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5 justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Conexión Segura
                        </p>
                    </div>
                </div>

            </div>

            {/* Expiration Modal */}
            <AnimatePresence>
                {isExpired && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#020617]/90 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="max-w-md w-full bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-10 text-center shadow-2xl relative overflow-hidden"
                        >
                            {/* Accent Background */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20" />

                            <div className="w-20 h-20 bg-orange-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-orange-500/20">
                                <AlertCircle className="w-10 h-10 text-orange-500" />
                            </div>

                            <h2 className="text-2xl font-black text-white italic uppercase tracking-tight mb-4">Enlace Expirado</h2>
                            <p className="text-indigo-200/50 mb-8 text-sm font-medium leading-relaxed">
                                Este enlace temporal ha expirado por seguridad. Puedes extenderlo por <span className="text-orange-400 font-bold">1 hora adicional</span> ahora mismo o contactar a la empresa si necesitas un nuevo enlace.
                            </p>

                            <div className="space-y-4">
                                <button
                                    onClick={handleExtend}
                                    disabled={isExtending}
                                    className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                                >
                                    {isExtending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Extendiendo...
                                        </>
                                    ) : (
                                        <>Alargar 1 Hora</>
                                    )}
                                </button>

                                {tenant && (
                                    <div className="pt-6 border-t border-white/5">
                                        <p className="text-[10px] text-indigo-200/30 uppercase font-black tracking-widest mb-4">Datos de contacto</p>
                                        <div className="flex flex-col gap-2 text-xs font-bold text-white/60">
                                            <p>{tenant.name}</p>
                                            {tenant.phone && <p>Tel: {tenant.phone}</p>}
                                            {tenant.email && <p>{tenant.email}</p>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
