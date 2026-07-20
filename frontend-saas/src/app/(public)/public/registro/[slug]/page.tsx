"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { apiRequest, API_BASE_URL } from '@/lib/api';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, ChevronRight, ChevronLeft, Send, CheckCircle2, Store } from 'lucide-react';
import Image from 'next/image';

// Reuse existing components
import StepIndicator from '@/components/public/StepIndicator';
import OwnerInfoStep from '@/components/public/OwnerInfoStep';
import PetInfoStep from '@/components/public/PetInfoStep';
import ServiceSelectionStep, { Service } from '@/components/public/ServiceSelectionStep';
import ImageUploadStep from '@/components/public/ImageUploadStep';

export default function PartnerRegistroPage() {
    const { executeRecaptcha } = useGoogleReCaptcha();
    const params = useParams();
    const router = useRouter();
    const partnerSlug = params.slug as string;

    // State
    const [partner, setPartner] = useState<any>(null);
    const [tenant, setTenant] = useState<any>(null);

    // Core Form State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [submissionCode, setSubmissionCode] = useState<string>('');
    const [currentStep, setCurrentStep] = useState(1);

    // Data State
    const [ownerData, setOwnerData] = useState({
        fullName: '',
        email: '',
        phone: '',
        address: '',
        country: 'Chile',
        region: '',
        commune: '',
        rut: '',
        veterinary: '',
        comments: '',
        service_code: ''
    });
    const [petData, setPetData] = useState({
        name: '',
        type: '',
        breed: '',
        age: '',
        birthDate: '',
        deathDate: '',
        size: ''
    });
    const [images, setImages] = useState<File[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);

    // Validation
    const [ownerErrors, setOwnerErrors] = useState<Partial<typeof ownerData>>({});
    const [petErrors, setPetErrors] = useState<Partial<typeof petData>>({});

    const CACHE_KEY = `vinzer_reg_cache_${partnerSlug}`;

    // 1. Fetch Data & Cache Restore
    useEffect(() => {
        const fetchAll = async () => {
            try {
                // Restore from cache first
                const savedCache = localStorage.getItem(CACHE_KEY);
                if (savedCache) {
                    try {
                        const parsed = JSON.parse(savedCache);
                        if (parsed.ownerData) setOwnerData(parsed.ownerData);
                        if (parsed.petData) setPetData(parsed.petData);
                        if (parsed.selectedServices) setSelectedServices(parsed.selectedServices);
                        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
                    } catch (e) {
                        console.error("Error parsing form cache", e);
                    }
                }

                // Fetch Partner by Slug
                const partnerData = await apiRequest<any>(`/api/public/partners/${partnerSlug}`);
                setPartner(partnerData);

                if (partnerData.tenant) {
                    setTenant(partnerData.tenant);

                    // 2. Fetch Services for this Tenant
                    const servicesData = await apiRequest<Service[]>(`/api/public/tenant/${partnerData.tenant.slug}/services`);
                    setServices(servicesData);
                } else {
                    throw new Error("Información de empresa incompleta");
                }

            } catch (err: any) {
                console.error(err);
                setError('Enlace inválido o veterinaria no encontrada.');
            } finally {
                setLoading(false);
            }
        };

        if (partnerSlug) fetchAll();
    }, [partnerSlug, CACHE_KEY]);

    // 2. Persist to Cache on change
    useEffect(() => {
        if (!loading && !isSuccess && partnerSlug) {
            const stateToSave = {
                ownerData,
                petData,
                selectedServices,
                currentStep
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(stateToSave));
        }
    }, [ownerData, petData, selectedServices, currentStep, loading, isSuccess, CACHE_KEY, partnerSlug]);

    const validateOwner = () => {
        const errors: Partial<typeof ownerData> = {};
        if (!ownerData.fullName) errors.fullName = 'Requerido';
        if (!ownerData.email) errors.email = 'Requerido';
        if (!ownerData.phone) errors.phone = 'Requerido';
        if (!ownerData.address) (errors as any).address = 'Requerido';
        if (!ownerData.country) (errors as any).country = 'Requerido';
        if (!ownerData.region) (errors as any).region = 'Requerido';
        if (!ownerData.commune) (errors as any).commune = 'Requerido';
        setOwnerErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validatePet = () => {
        const errors: Partial<typeof petData> = {};
        if (!petData.name) errors.name = 'Requerido';
        if (!petData.type) errors.type = 'Requerido';
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
        if (!tenant || !partner) return;
        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('tenant_id', String(tenant.id));

            // INJECT PARTNER ID into owner_data
            const enrichedOwnerData = {
                ...ownerData,
                partner_id: partner.id_partner,
                referral_source: `Partner: ${partner.nombre_clinica}`,
                commission_percent: partner.porcentaje_comision
            };

            formData.append('owner_data', JSON.stringify(enrichedOwnerData));
            formData.append('pet_data', JSON.stringify(petData));
            formData.append('selected_services', JSON.stringify(selectedServices));
            formData.append('partner_id', String(partner.id_partner)); // Send explicit partner_id for DB column
            formData.append('token', tenant.public_token || 'temp'); // Fallback logic

            // Anti-bot: token reCAPTCHA v3
            if (executeRecaptcha) {
                try {
                    const recaptchaToken = await executeRecaptcha('submit_form');
                    formData.append('recaptcha_token', recaptchaToken);
                } catch (e) {
                    console.error('reCAPTCHA error:', e);
                }
            }

            images.forEach((file) => {
                formData.append('files', file);
            });

            const response = await fetch(`${API_BASE_URL}/api/public/submit-form`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Error al enviar formulario');

            try {
                const data = await response.json();
                setSubmissionCode(data?.code || '');
            } catch {
                // ignorar errores de parseo; el éxito ya está confirmado por response.ok
            }

            // Clear cache on success
            localStorage.removeItem(CACHE_KEY);

            setIsSuccess(true);
            window.scrollTo(0, 0);

        } catch (err) {
            console.error(err);
            alert('Error al enviar. Intente nuevamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#020617]">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Store className="text-emerald-500/20" size={24} />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !tenant) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617] p-8 text-center relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="relative z-10 space-y-6">
                    <div className="w-24 h-24 bg-red-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-4 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                        <AlertCircle className="w-12 h-12 text-red-500" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white mb-3">Enlace no disponible</h1>
                        <p className="text-indigo-200/40 text-[10px] font-black uppercase tracking-[0.3em] max-w-xs mx-auto">{error}</p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:text-white transition-colors"
                    >
                        Intentar de nuevo
                    </button>
                </div>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", damping: 20 }}
                    className="max-w-md w-full bg-white/[0.03] backdrop-blur-3xl rounded-[3.5rem] border border-white/10 p-12 text-center shadow-2xl relative"
                >
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

                    <div className="w-28 h-28 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                        <CheckCircle2 className="w-14 h-14 text-[#020617]" />
                    </div>

                    <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-4">
                        ¡Recibido con cariño!
                    </h2>
                    <p className="text-indigo-200/50 text-sm leading-relaxed mb-8">
                        Hemos guardado tu información de forma segura. El equipo de <span className="text-white font-black">{tenant.name}</span> y <span className="text-emerald-400 font-bold italic">{partner.nombre_clinica}</span> nos comunicaremos contigo lo antes posible para brindarte todo nuestro apoyo y coordinar los detalles.
                    </p>

                    {submissionCode && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                            className="mb-8 rounded-3xl p-6 bg-gradient-to-br from-emerald-500/10 via-white/[0.02] to-cyan-500/10 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.08)] relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
                            <p className="text-[10px] uppercase font-black tracking-[0.3em] text-emerald-400/70 mb-3">
                                Tu código de solicitud
                            </p>
                            <p className="font-mono text-2xl sm:text-3xl font-black tracking-[0.25em] text-white select-all break-all">
                                {submissionCode}
                            </p>
                            <p className="mt-3 text-[10px] text-indigo-200/40 uppercase tracking-widest font-bold">
                                Guárdalo para tus comunicaciones futuras
                            </p>
                        </motion.div>
                    )}

                    <div className="h-px w-24 mx-auto bg-white/5 mb-8" />
                    <p className="text-[9px] text-[#22d3ee]/40 uppercase tracking-[0.3em] font-black italic">
                        Cuando el vínculo importa, todo cambia
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] text-white py-12 px-4 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-2xl mx-auto relative z-10">

                {/* Partner Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 text-center">
                    <div className="inline-flex items-center gap-3 bg-emerald-500/10 px-6 py-2 rounded-full border border-emerald-500/20 text-xs font-black uppercase tracking-[0.2em] text-emerald-400 mb-6 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                        <Store size={14} />
                        Referido por: <span className="text-white italic">{partner.nombre_clinica}</span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter uppercase italic drop-shadow-lg mb-2">{tenant.name}</h1>
                    <p className="text-indigo-200/40 text-[10px] uppercase tracking-[0.4em] font-bold">Formulario de Inscripción</p>
                </motion.div>

                {/* Steps */}
                <div className="mb-10">
                    <StepIndicator currentStep={currentStep} steps={['Dueño', 'Mascota', 'Servicios', 'Fotos']} />
                </div>

                {/* Form Card */}
                <div className="bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10 p-8 sm:p-12 shadow-2xl relative overflow-hidden group">
                    {/* Interior glow */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-700" />

                    <div className="relative z-10">
                        {currentStep === 1 && <OwnerInfoStep data={ownerData} updateData={d => setOwnerData(prev => ({ ...prev, ...d }))} errors={ownerErrors} tenantSlug={tenant.slug} />}
                        {currentStep === 2 && <PetInfoStep data={petData} updateData={d => setPetData(prev => ({ ...prev, ...d }))} errors={petErrors} />}
                        {currentStep === 3 && <ServiceSelectionStep services={services} selectedServices={selectedServices} toggleService={toggleService} />}
                        {currentStep === 4 && <ImageUploadStep images={images} setImages={setImages} />}

                        {/* Nav */}
                        <div className="flex justify-between items-center mt-12 pt-8 border-t border-white/5">
                            <button
                                onClick={handleBack}
                                disabled={currentStep === 1}
                                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-200/40 hover:text-white transition-all ${currentStep === 1 ? 'opacity-0 pointer-events-none' : ''}`}
                            >
                                <ChevronLeft size={16} /> Atrás
                            </button>

                            {currentStep < 4 ? (
                                <button
                                    onClick={handleNext}
                                    className="bg-emerald-500 text-[#020617] font-black py-4 px-10 rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:scale-[1.05] active:scale-[0.95] transition-all flex items-center gap-3 group"
                                >
                                    Siguiente
                                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="bg-emerald-500 text-[#020617] font-black py-4 px-12 rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/30 hover:scale-[1.05] active:scale-[0.95] transition-all flex items-center gap-3 disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <>
                                            Enviar Formulario
                                            <Send size={16} className="rotate-45" />
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Branding */}
                <div className="mt-12 text-center text-indigo-200/20">
                    <p className="text-[9px] uppercase tracking-[0.3em] font-bold">
                        Potenciado por <span className="text-white italic drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">Vinzer Platform</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
