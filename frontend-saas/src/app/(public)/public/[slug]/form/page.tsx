"use client";

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { buildTrackingUrl } from '@/lib/publicUrls';
import { API_BASE_URL } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Loader2,
    AlertCircle,
    ChevronRight,
    ChevronLeft,
    Send,
    CheckCircle2,
    Sun,
    Moon,
    Copy,
    Check,
    ExternalLink,
    Clock,
    Phone as PhoneIcon,
    Sparkles,
    Download,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import html2canvas from 'html2canvas';

// Hook
import { useTenantForm } from '@/hooks/useTenantForm';

// Components
import StepIndicator from '@/components/public/StepIndicator';
import OwnerInfoStep from '@/components/public/OwnerInfoStep';
import PetInfoStep from '@/components/public/PetInfoStep';
import ServiceSelectionStep from '@/components/public/ServiceSelectionStep';
import MemoryStep from '@/components/public/MemoryStep';
import SummaryStep from '@/components/public/SummaryStep';
import CondolenceModal from '@/components/public/CondolenceModal';
import SkyBackground from '@/components/public/SkyBackground';
import FarewellPreview from '@/app/(tenant)/tenant/dashboard/documentos/disenos/components/FarewellPreview';

// Frases empáticas por paso
const STEP_PHRASES: Record<number, string> = {
    1: 'Necesitamos conocerte para poder acompañarte de la mejor forma.',
    2: 'Cuéntanos sobre tu compañero de vida.',
    3: 'Elige cómo quieres honrar su memoria.',
    4: 'Un último recuerdo para guardar para siempre.',
    5: 'Confirma que todo esté correcto antes de enviar.',
};

const STEP_NAMES = ['Familia', 'Ángel', 'Camino', 'Recuerdos', 'Resumen'];

const getImageUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${cleanPath}`;
};

export default function TenantFormPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const slug = params.slug as string;
    const token = searchParams.get('token');
    const partnerSlug = searchParams.get('partner');

    const [copiedTrackLink, setCopiedTrackLink] = React.useState(false);
    const [isDownloadingCard, setIsDownloadingCard] = React.useState(false);
    const cardExportRef = React.useRef<HTMLDivElement>(null);

    const handleDownloadCard = async () => {
        if (!cardExportRef.current) return;
        setIsDownloadingCard(true);
        try {
            const canvas = await html2canvas(cardExportRef.current, {
                useCORS: true,
                scale: 2,
                backgroundColor: null,
                logging: false,
            });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `homenaje-${(petData.name || 'angelito').replace(/\s+/g, '-').toLowerCase()}.png`;
            link.click();
        } catch (err) {
            console.error('Error al exportar homenaje:', err);
        } finally {
            setIsDownloadingCard(false);
        }
    };

    const {
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
    } = useTenantForm(slug, token, partnerSlug);

    // --- Loading State ---
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center relative">
                <SkyBackground />
                <Loader2 className="w-10 h-10 text-sky-500 animate-spin mb-4 relative z-10" />
                <p className="text-sky-900/40 text-xs font-black uppercase tracking-widest animate-pulse relative z-10">
                    Cargando formulario...
                </p>
            </div>
        );
    }

    // --- Error / Tenant Not Found State ---
    if (error || !tenant) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative">
                <SkyBackground />
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-3xl flex items-center justify-center mb-6 border border-red-500/20 backdrop-blur-md">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight mb-2">
                        Enlace no disponible
                    </h1>
                    <p className="text-slate-500 text-xs font-bold uppercase max-w-md">
                        {error || 'No pudimos encontrar la información de la empresa. Por favor verifica el enlace.'}
                    </p>
                </div>
            </div>
        );
    }

    // --- Success State ---
    if (isSuccess) {
        const trackUrl = submissionCode ? buildTrackingUrl(tenant.slug, petData.name, submissionCode) : '';
        const whatsappShareText = `Hola, acabo de registrar el servicio para ${petData.name || 'mi mascota'} en ${tenant.name}. Mi código de solicitud es: ${submissionCode}. Pueden ver el seguimiento en vivo aquí: ${trackUrl}`;
        const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(whatsappShareText)}`;

        const primaryImageBlobUrl = images && images.length > 0 && typeof window !== 'undefined'
            ? URL.createObjectURL(images[0])
            : null;

        const baseFarewellConfig = farewellTemplate?.config || {
            format: '1:1',
            theme: 'warm',
            styles: { font: 'serif', color: '#1e293b', background: '#FDFBF7' },
            frame: { enabled: true, color: '#d4af37', width: 6, margin: 10 },
            petNameFormatting: { bold: true, fontSize: 38, fontFamily: 'Playfair Display', textAlign: 'center', letterSpacing: 2 },
            subtitleFormatting: { bold: false, italic: true, fontSize: 14, textAlign: 'center', width: 420 },
            textFormatting: { bold: false, italic: true, fontSize: 15, textAlign: 'center', width: 440, lineHeight: 1.6 },
            imageSettings: {
                image2: { shape: 'circle', size: 180, borderColor: '#d4af37', borderWidth: 4, glow: { enabled: true, color: 'rgba(212, 175, 55, 0.5)', size: 24 } }
            },
            backgroundImage: { url: null, opacity: 0 }
        };

        const successFarewellConfig = {
            ...baseFarewellConfig,
            elements: {
                ...(baseFarewellConfig.elements || {}),
                petName: petData.name || 'Tu Angelito',
                subtitle: '',
                farewellText: petData.dedication || 'Gracias por cada instante de ternura y amor incondicional. Tu recuerdo vivirá por siempre en nuestra memoria.',
                image2Url: primaryImageBlobUrl,
                tenantLogoUrl: tenant?.logo_url ? getImageUrl(tenant.logo_url) : null,
            },
        };

        return (
            <div className="min-h-screen flex items-center justify-center p-4 relative">
                <SkyBackground />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-lg w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[3rem] shadow-2xl p-6 sm:p-10 text-center border border-white/60 dark:border-slate-800/80 relative z-10"
                >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-4 sm:mb-6 border border-emerald-500/20 dark:border-emerald-500/40">
                        <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 italic uppercase tracking-tight mb-3">
                        ¡Gracias de todo corazón!
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed text-sm font-medium">
                        Hemos recibido tu información y la guardaremos con todo el respeto que tu compañero merece.
                        El equipo de <span className="text-emerald-500 dark:text-emerald-400 font-black">{tenant.name}</span> se pondrá en contacto contigo a la brevedad.
                    </p>

                    {/* 1. Enlace de Seguimiento en Vivo */}
                    {submissionCode && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="mb-6 rounded-3xl p-6 bg-gradient-to-br from-indigo-50/80 to-purple-50/80 dark:from-slate-800/40 dark:to-slate-800/20 border border-indigo-200/40 dark:border-indigo-500/20 shadow-inner"
                        >
                            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-indigo-500 dark:text-indigo-400 mb-3">
                                Enlace de Seguimiento en Vivo
                            </p>
                            
                            <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-950/90 p-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                                <span className="text-xs font-mono truncate text-slate-600 dark:text-slate-400 select-all text-left flex-1 pl-2">
                                    {trackUrl}
                                </span>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(trackUrl);
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
                                    href={trackUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer"
                                    title="Abrir enlace"
                                >
                                    <ExternalLink size={14} />
                                </a>
                            </div>
                            
                            <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                Guarda este enlace para ver el seguimiento en vivo del servicio.
                            </p>

                            <a
                                href={whatsappShareUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 w-full inline-flex items-center justify-center gap-2.5 py-3 px-5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-[10px] uppercase tracking-[0.15em] rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#25D366]/20 cursor-pointer"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                                Compartir por WhatsApp
                            </a>
                        </motion.div>
                    )}

                    {/* 2. Tu código de solicitud */}
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

                    {/* 3. Tarjeta Conmemorativa del Homenaje (Solo si se subió al menos 1 foto) */}
                    {images && images.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.25 }}
                            className="mb-8 rounded-3xl p-5 bg-gradient-to-br from-amber-500/10 via-slate-50 to-sky-50 dark:from-amber-500/15 dark:via-slate-800/40 dark:to-slate-800/20 border border-amber-300/40 dark:border-amber-500/30 shadow-xl flex flex-col items-center text-center"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles size={15} className="text-amber-500" />
                                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                                    Homenaje Conmemorativo
                                </span>
                            </div>

                            {(() => {
                                const baseHeight = 550;
                                const fmt = successFarewellConfig.format || '1:1';
                                let dims = { width: baseHeight, height: baseHeight };
                                if (fmt === '9:16') dims = { width: baseHeight * (9 / 16), height: baseHeight };
                                else if (fmt === '3:4') dims = { width: baseHeight * (3 / 4), height: baseHeight };
                                else if (fmt === '4:3') dims = { width: baseHeight * (3 / 4), height: baseHeight };

                                const scale = 0.55;
                                return (
                                    <>
                                        {/* Off-screen Pristine HD target for HTML2Canvas capture */}
                                        <div 
                                            style={{ 
                                                position: 'fixed', 
                                                left: '-9999px', 
                                                top: '-9999px', 
                                                width: `${dims.width}px`, 
                                                height: `${dims.height}px`,
                                                pointerEvents: 'none',
                                                zIndex: -999,
                                            }}
                                        >
                                            <FarewellPreview ref={cardExportRef} config={successFarewellConfig} />
                                        </div>

                                        {/* Scaled Visual Display */}
                                        <div 
                                            style={{ 
                                                width: `${dims.width * scale}px`, 
                                                height: `${dims.height * scale}px`,
                                            }}
                                            className="rounded-2xl overflow-hidden shadow-2xl border border-amber-500/30 relative flex-shrink-0 my-1 bg-black/40"
                                        >
                                            <div 
                                                style={{
                                                    transform: `scale(${scale})`,
                                                    transformOrigin: 'top left',
                                                    width: `${dims.width}px`,
                                                    height: `${dims.height}px`,
                                                }}
                                                className="absolute inset-0"
                                            >
                                                <FarewellPreview config={successFarewellConfig} />
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}

                            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-2.5">
                                Inmortalizando la memoria de {petData.name || 'tu angelito'}.
                            </p>

                            {/* Botón para Descargar la Tarjeta en HD */}
                            <button
                                type="button"
                                onClick={handleDownloadCard}
                                disabled={isDownloadingCard}
                                className="mt-4 w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                            >
                                {isDownloadingCard ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" />
                                        <span>Generando imagen en HD...</span>
                                    </>
                                ) : (
                                    <>
                                        <Download size={15} />
                                        <span>Guardar / Descargar Tarjeta (HD)</span>
                                    </>
                                )}
                            </button>
                        </motion.div>
                    )}

                    {/* 4. Timeline de Próximos Pasos */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mb-8 rounded-3xl p-6 bg-gradient-to-br from-slate-50 to-sky-50/60 dark:from-slate-800/40 dark:to-slate-800/20 border border-slate-200/60 dark:border-slate-700/40 text-left"
                    >
                        <p className="text-[10px] uppercase font-black tracking-[0.2em] text-sky-600 dark:text-sky-400 mb-4">
                            Próximos Pasos
                        </p>
                        <div className="space-y-3">
                            {[
                                { icon: CheckCircle2, text: 'Formulario recibido', color: 'text-emerald-500', done: true },
                                { icon: Clock, text: `${tenant.name} revisará tu solicitud (≤24h)`, color: 'text-amber-500', done: false },
                                { icon: PhoneIcon, text: `Te contactaremos por ${ownerData.contactPreference === 'whatsapp' ? 'WhatsApp' : ownerData.contactPreference === 'phone' ? 'llamada telefónica' : 'WhatsApp o llamada'}`, color: 'text-sky-500', done: false },
                                { icon: Sparkles, text: 'Inicio del servicio y seguimiento en vivo', color: 'text-indigo-500', done: false },
                            ].map((step, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                        step.done
                                            ? 'bg-emerald-100 dark:bg-emerald-950/40'
                                            : 'bg-slate-100 dark:bg-slate-800/60'
                                    }`}>
                                        <step.icon size={13} className={step.color} />
                                    </div>
                                    <span className={`text-[12px] font-medium leading-snug ${
                                        step.done
                                            ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                                            : 'text-slate-500 dark:text-slate-400'
                                    }`}>
                                        {step.text}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

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

    // --- Main Form Render ---
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

                    <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                        {tenant.name}
                    </h1>
                    <div className="h-1 w-12 bg-sky-400 mx-auto mt-4 rounded-full" />
                </motion.div>

                {/* Progress Steps */}
                <div className="mb-4">
                    <StepIndicator 
                        currentStep={currentStep} 
                        steps={STEP_NAMES} 
                        isDark={theme === 'dark'} 
                        maxVisitedStep={maxVisitedStep}
                        onStepClick={goToStep}
                    />
                </div>

                {/* Step progress text + empathetic phrase */}
                <motion.div
                    key={`phrase-${currentStep}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10 space-y-1.5"
                >
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Paso {currentStep} de {STEP_NAMES.length} · {STEP_NAMES[currentStep - 1]}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-normal italic leading-relaxed">
                        {STEP_PHRASES[currentStep]}
                    </p>
                </motion.div>

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
                                {currentStep === 5 && (
                                    <SummaryStep
                                        ownerData={ownerData}
                                        petData={petData}
                                        selectedServices={selectedServices}
                                        services={services}
                                        images={images}
                                        onEditStep={handleEditFromSummary}
                                        farewellTemplate={farewellTemplate}
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
                            className={`flex items-center text-slate-400 dark:text-slate-500 font-semibold text-xs uppercase tracking-wider px-6 py-3 rounded-2xl transition-all ${
                                currentStep === 1 ? 'opacity-0 pointer-events-none' : 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        >
                            <ChevronLeft size={16} className="mr-2" />
                            Atrás
                        </button>

                        {currentStep < 5 ? (
                            <button
                                onClick={handleNext}
                                className="bg-slate-800 dark:bg-slate-950 text-white dark:text-slate-200 dark:border dark:border-slate-800/80 font-bold py-3.5 px-9 rounded-2xl text-xs uppercase tracking-wider shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center hover:bg-slate-900 dark:hover:bg-slate-900 cursor-pointer"
                            >
                                {currentStep === 4 ? 'Revisar Resumen' : 'Siguiente'}
                                <ChevronRight size={16} className="ml-2" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="bg-emerald-500 text-[#020617] dark:text-slate-950 font-bold py-3.5 px-8 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center disabled:opacity-50 cursor-pointer"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={16} className="mr-2 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        Confirmar y Enviar
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
                        {process.env.NEXT_PUBLIC_VINZER_SLOGAN || "Innovación y sensibilidad en la gestión funeraria y memoriales."}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-[10px] uppercase tracking-[0.15em] font-semibold">
                        <Link 
                            href={process.env.NEXT_PUBLIC_VINZER_URL || "https://vinzer.app"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition-colors underline decoration-sky-500/30 underline-offset-4"
                        >
                            Visita Vinzer
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
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20" />

                            <div className="w-20 h-20 bg-orange-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-orange-500/20">
                                <AlertCircle className="w-10 h-10 text-orange-500" />
                            </div>

                            <h2 className="text-2xl font-black text-white italic uppercase tracking-tight mb-4">
                                Enlace Expirado
                            </h2>
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
                                        <p className="text-[10px] text-indigo-200/30 uppercase font-black tracking-widest mb-4">
                                            Datos de contacto
                                        </p>
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
