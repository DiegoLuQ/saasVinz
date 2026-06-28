"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import LimitReachedModal from '@/components/memorial/LimitReachedModal';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart,
    Globe,
    Calendar,
    User,
    Loader2,
    Send,
    ShieldCheck,
    Lock,
    Instagram,
    Check,
    Quote,
    ArrowLeft,
    Sparkles,
    Copy,
    ExternalLink,
    Flower2,
    Flame,
    PawPrint,
    Cloud as CloudIcon,
    Star
} from 'lucide-react';
import { getTranslations, type Locale } from '@/lib/translations';
import { HuellasFooter } from '@/components/public/HuellasFooter';
import dynamic from 'next/dynamic';
import DedicationModal from '@/components/memorial/DedicationModal';
import Snowflakes from '@/components/memorial/Snowflakes';
import TwinklingStars from '@/components/memorial/TwinklingStars';
import { ExpirationModal } from '@/components/memorial/ExpirationModal';
import MemorialReactions from '@/components/memorial/MemorialReactions';
import { publicApiRequest } from '@/lib/api/public';
import CelestialBackground from '@/components/memorial/CelestialBackground';

const NormalLayout = dynamic(() => import('@/components/memorial/layouts/NormalLayout'), { loading: () => <Loader2 className="animate-spin" /> });
const AltarLayout = dynamic(() => import('@/components/memorial/layouts/AltarLayout'), { loading: () => <Loader2 className="animate-spin" /> });
const EditorialLayout = dynamic(() => import('@/components/memorial/layouts/EditorialLayout'), { loading: () => <Loader2 className="animate-spin" /> });
const CartaLayout = dynamic(() => import('@/components/memorial/layouts/CartaLayout'), { loading: () => <Loader2 className="animate-spin" /> });
const CieloLayout = dynamic(() => import('@/components/memorial/layouts/CieloLayout'), { loading: () => <Loader2 className="animate-spin" /> });
const CinematicoLayout = dynamic(() => import('@/components/memorial/layouts/CinematicoLayout'), { loading: () => <Loader2 className="animate-spin" /> });
const ConstelacionLayout = dynamic(() => import('@/components/memorial/layouts/ConstelacionLayout'), { loading: () => <Loader2 className="animate-spin" /> });
const GaleriaLayout = dynamic(() => import('@/components/memorial/layouts/GaleriaLayout'), { loading: () => <Loader2 className="animate-spin" /> });

export default function MemorialClientPage({ initialData }: { initialData?: any }) {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const uuid = params.uuid as string;

    const [loading, setLoading] = useState(!initialData);
    const [memorial, setMemorial] = useState<any>(initialData);

    const computedDiseno = useMemo(() => {
        if (!memorial) return {};
        const d = memorial.diseno || {};
        return {
            color_fondo: searchParams.get('preview_bg') || d.color_fondo || '#ffffff',
            particulas: searchParams.get('preview_particles') || d.particulas || 'flores',
            tema: searchParams.get('preview_theme') || d.tema || 'claro',
            tipo_diseno: searchParams.get('preview_layout') || d.tipo_diseno || 'normal',
            portada_url: d.portada_url || '',
        };
    }, [memorial, searchParams]);

    const computedMemorial = useMemo(() => {
        if (!memorial) return null;
        return {
            ...memorial,
            diseno: computedDiseno
        };
    }, [memorial, computedDiseno]);
    const [dedicatorias, setDedicatorias] = useState<any[]>(initialData?.dedicatorias || []);
    const [newDedication, setNewDedication] = useState({ nombre: '', mensaje: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<{ message: string; status?: number } | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [selectedDedication, setSelectedDedication] = useState<any>(null);
    const [isDedicationModalOpen, setIsDedicationModalOpen] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    const [copiedLink, setCopiedLink] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [locale, setLocale] = useState<Locale>('es');
    const [showExpirationModal, setShowExpirationModal] = useState(false);
    const [expirationStatus, setExpirationStatus] = useState<string>('expired');

    useEffect(() => {
        // Sync with PublicHeader changes
        const syncLocale = () => {
            const saved = localStorage.getItem('preferred_locale') as Locale | null;
            if (saved === 'es' || saved === 'en') setLocale(saved);
        };
        syncLocale(); // Initial sync
        window.addEventListener('localeChange', syncLocale);
        window.addEventListener('storage', syncLocale);
        return () => {
            window.removeEventListener('localeChange', syncLocale);
            window.removeEventListener('storage', syncLocale);
        };
    }, []);

    const t = getTranslations(locale);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
            setShowScrollTop(window.scrollY > 400);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (uuid && !initialData) {
            fetchData();
        }
    }, [uuid]);

    const fetchData = async () => {
        try {
            const data = await publicApiRequest(`/api/internal/memorials/${uuid}`);
            setMemorial(data);
            setDedicatorias(data.dedicatorias || []);
            setLoading(false);
        } catch (err: any) {
            setError({ message: err.message, status: err.status });
            setLoading(false);
        }
    };

    // Check for expiration
    useEffect(() => {
        if (memorial) {
            const rawStatus = memorial.status ? String(memorial.status).toLowerCase() : '';
            // Normalize status if needed (e.g. 'expirado' -> 'expired')
            const status = rawStatus === 'expirado' ? 'expired' : rawStatus;

            const isExpired = status === 'expired';
            const isPending = status === 'pending';
            const isArchived = status === 'archived';

            let isValidityPast = false;
            if (memorial.valid_until) {
                const validUntilDate = new Date(memorial.valid_until);
                const now = new Date();
                isValidityPast = validUntilDate < now;
            }

            if (isExpired || isPending || isArchived || isValidityPast) {
                let finalStatus = status;
                // If validity is past but status is technically 'active', treat as expired for modal
                if (isValidityPast && status === 'active') {
                    finalStatus = 'expired';
                }
                setExpirationStatus(finalStatus);
                setShowExpirationModal(true);
            }
        }
    }, [memorial]);

    // State for Limit Reached Modal
    const [showLimitModal, setShowLimitModal] = useState(false);

    const handleSubmitDedication = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDedication.nombre || !newDedication.mensaje) return;

        setIsSubmitting(true);
        try {
            const response = await publicApiRequest(`/api/internal/memorials/${uuid}/dedicatorias`, {
                method: 'POST',
                body: JSON.stringify({
                    mensajero: newDedication.nombre,
                    mensaje: newDedication.mensaje
                })
            });

            if (response.error) {
                const msg = (response.error || '').toLowerCase();
                if (msg.includes('límite') || msg.includes('limite') || msg.includes('limit')) {
                    setShowLimitModal(true);
                } else {
                    alert(response.error);
                }
                return;
            }

            setNewDedication({ nombre: '', mensaje: '' });
            setShowSuccessModal(true);
        } catch (err: any) {
            console.error("Error creating dedication:", err);
            alert("Error de conexión. Por favor reintente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper to detect brightness for custom background colors
    const isColorDark = (hex?: string) => {
        if (!hex || hex.length < 6) return false;
        try {
            const color = hex.replace('#', '');
            const r = parseInt(color.substring(0, 2), 16);
            const g = parseInt(color.substring(2, 4), 16);
            const b = parseInt(color.substring(4, 6), 16);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            return brightness < 128; // Standard threshold
        } catch (e) {
            return false;
        }
    };

    // Determine actual theme name (considering custom background color)
    const temaActual = useMemo(() => {
        const customBg = computedMemorial?.diseno?.color_fondo;
        if (customBg && customBg.trim() !== '') {
            return isColorDark(customBg) ? 'oscuro' : 'claro';
        }
        return computedMemorial?.diseno?.tema || 'claro';
    }, [computedMemorial?.diseno?.tema, computedMemorial?.diseno?.color_fondo]);

    // Configuración centralizada de temas
    const themeConfig = useMemo(() => {
        const hasCustomBg = !!computedMemorial?.diseno?.portada_url;
        const customTheme = computedMemorial?.diseno?.theme_config;
        
        const configs: Record<string, any> = {
            claro: {
                bg: 'bg-[#FDFBF7]',
                text: 'text-slate-900',
                card: 'bg-white border-slate-300 shadow-md', // Stronger border and shadow for light mode
                accent: 'text-slate-700', // Darker accent
                accentHover: 'hover:text-slate-800',
                particle: '#64748b',
                footerBorder: 'border-slate-200',
                vincer: 'bg-slate-100 border-slate-200 text-slate-800',
                input: 'border-slate-300 text-slate-900 placeholder:text-slate-400 opacity-100',
                button: 'bg-slate-900 text-white hover:bg-slate-800'
            },
            oscuro: {
                bg: 'bg-[#0a192f]',
                text: 'text-white',
                card: 'bg-white/5 border-white/10',
                accent: 'text-slate-400',
                accentHover: 'hover:text-white',
                particle: '#ffffff',
                footerBorder: 'border-white/5',
                vincer: 'bg-white/5 border-white/5 text-white',
                input: 'border-white/10 text-white placeholder:text-white/30',
                button: 'bg-[#c3b091] text-[#0a192f] hover:opacity-90'
            },
            esmeralda: {
                bg: 'bg-[#064e3b]',
                text: 'text-emerald-50',
                card: 'bg-emerald-900/40 border-emerald-700/30',
                accent: 'text-emerald-300',
                accentHover: 'hover:text-emerald-100',
                particle: '#a7f3d0',
                footerBorder: 'border-white/5',
                vincer: 'bg-white/5 border-white/5 text-emerald-50',
                input: 'border-emerald-700/30 text-white placeholder:text-emerald-100/30',
                button: 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400'
            },
            dorado: {
                bg: 'bg-[#451a03]',
                text: 'text-amber-50',
                card: 'bg-amber-900/40 border-amber-700/30',
                accent: 'text-amber-300',
                accentHover: 'hover:text-amber-100',
                particle: '#fde68a',
                footerBorder: 'border-white/5',
                vincer: 'bg-white/5 border-white/5 text-amber-50',
                input: 'border-amber-700/30 text-white placeholder:text-amber-100/30',
                button: 'bg-amber-500 text-amber-950 hover:bg-amber-400'
            },
            rosado: {
                bg: 'bg-[#500724]',
                text: 'text-pink-50',
                card: 'bg-pink-900/40 border-pink-700/30',
                accent: 'text-pink-300',
                accentHover: 'hover:text-pink-100',
                particle: '#fbcfe8',
                footerBorder: 'border-white/5',
                vincer: 'bg-white/5 border-white/5 text-pink-50',
                input: 'border-pink-700/30 text-white placeholder:text-pink-100/30',
                button: 'bg-pink-500 text-pink-950 hover:bg-pink-400'
            },
            safiro: {
                bg: 'bg-[#1e3a8a]',
                text: 'text-blue-50',
                card: 'bg-blue-900/40 border-blue-700/30',
                accent: 'text-blue-300',
                accentHover: 'hover:text-blue-100',
                particle: '#bfdbfe',
                footerBorder: 'border-white/5',
                vincer: 'bg-white/5 border-white/5 text-blue-50',
                input: 'border-blue-700/30 text-white placeholder:text-blue-100/30',
                button: 'bg-blue-500 text-blue-950 hover:bg-blue-400'
            },
            orange: {
                bg: 'bg-[#7c2d12]',
                text: 'text-orange-50',
                card: 'bg-orange-900/40 border-orange-700/30',
                accent: 'text-orange-300',
                accentHover: 'hover:text-orange-100',
                particle: '#ffedd5',
                footerBorder: 'border-white/5',
                vincer: 'bg-white/5 border-white/5 text-orange-50',
                input: 'border-orange-700/30 text-white placeholder:text-orange-100/30',
                button: 'bg-orange-500 text-orange-950 hover:bg-orange-400'
            }
        };

        const base = configs[temaActual] || configs.claro;

        if (customTheme) {
            const isDark = customTheme.mode === 'dark' || (customTheme.mode !== 'light' && isColorDark(customTheme.text_color));
            const selectedBase = isDark ? configs.oscuro : configs.claro;
            return {
                ...selectedBase,
                isCustom: true,
                titleColor: customTheme.title_color,
                subtitleColor: customTheme.subtitle_color,
                textColor: customTheme.text_color,
                accentColor: customTheme.accent_color,
                particle: customTheme.subtitle_color || selectedBase.particle
            };
        }

        return base;
    }, [temaActual, computedMemorial?.diseno?.theme_config]);

    const particles = useMemo(() => {
        if (!computedMemorial?.diseno?.particulas || !themeConfig) return null;
        return (
            <>
                {computedMemorial.diseno.particulas === 'nieve' && <Snowflakes color={themeConfig.particle} />}
                {computedMemorial.diseno.particulas === 'estrellas' && <TwinklingStars color={themeConfig.particle} />}
            </>
        );
    }, [computedMemorial?.diseno?.particulas, themeConfig?.particle]);

    const { mascota, tenant_info, tenant_status, diseno, branding, lista_imagenes } = computedMemorial || {};
    const planName = computedMemorial?.plan?.toUpperCase() || tenant_info?.subscription_plan?.name?.toUpperCase() || 'FREE';
    const isUltra = planName === 'ULTRA' || planName === 'PARAISO';
    const useBrandingVincer = branding?.vincer_logo || tenant_status !== 'active';

    // Prioritize listed images from memorial, fallback to pet's general images
    // Cap at 5 images max, filter out broken/empty URLs
    const galleryImages = useMemo(() => {
        if (!memorial) return [];
        const raw = (lista_imagenes && lista_imagenes.length > 0)
            ? lista_imagenes
            : (mascota?.images || []);
        return raw
            .filter((url: string) => url && url.trim() !== '' && url !== '#' && url.startsWith('http'))
            .slice(0, 5);
    }, [memorial, lista_imagenes, mascota?.images]);

    // Randomly select a main image from gallery on each page load
    const randomMainImage = useMemo(() => {
        if (galleryImages.length > 0) {
            const randomIndex = Math.floor(Math.random() * galleryImages.length);
            return galleryImages[randomIndex];
        }
        return memorial?.main_image_url || mascota?.image_url || null;
    }, [galleryImages, memorial?.main_image_url, mascota?.image_url]);

    // Helper to ensure URLs are absolute and don't break as relative links
    const ensureAbsoluteUrl = (url?: string) => {
        if (!url || url === "#") return "#";
        const trimmed = url.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
        return `https://${trimmed}`;
    };

    const formatInstagramUrl = (handleOrUrl?: string) => {
        if (!handleOrUrl) return "#";
        const trimmed = handleOrUrl.trim();
        if (trimmed.startsWith("http")) return ensureAbsoluteUrl(trimmed);
        return `https://instagram.com/${trimmed.replace('@', '')}`;
    };

    // Interleave photos and dedications for a better rhythm
    const mixedItems = useMemo(() => {
        const result: { type: 'image' | 'dedication', data: any }[] = [];
        const dedics = [...dedicatorias];
        const imgs = [...galleryImages];

        // Interleave: 1 image every 2 dedications (if available)
        while (dedics.length > 0 || imgs.length > 0) {
            if (dedics.length > 0) result.push({ type: 'dedication', data: dedics.shift() });
            if (dedics.length > 0) result.push({ type: 'dedication', data: dedics.shift() });
            if (imgs.length > 0) result.push({ type: 'image', data: imgs.shift() });

            // If no more dedications but still images, push them
            if (dedics.length === 0 && imgs.length > 0) {
                while (imgs.length > 0) result.push({ type: 'image', data: imgs.shift() });
            }
        }
        return result;
    }, [dedicatorias, galleryImages]);

    const formRef = useRef<HTMLDivElement>(null);
    const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth' });

    const dedicationLimit = memorial?.dedication_limit !== undefined
        ? memorial.dedication_limit
        : (isUltra
            ? 33
            : (['PRO', 'PRO+', 'VINCULO'].includes(planName)
                ? 21
                : (['NORMAL', 'HUELLA'].includes(planName) ? 9 : 0)));

    const canAddMore = dedicatorias.length < dedicationLimit;

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="animate-spin text-primary" size={60} />
                <p className="text-muted-foreground font-serif text-xl animate-pulse">
                    {locale === 'es' ? 'Cargando recuerdos...' : 'Loading memories...'}
                </p>
            </div>
        );
    }

    if (error?.status === 403) {
        return (
            <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
                <Lock size={64} className="text-amber-500/20 mb-6" />
                <h1 className="text-4xl font-serif text-white mb-4">Memorial Privado</h1>
                <p className="text-muted-foreground max-w-md mb-8">Este memorial está protegido. Solo la familia tiene acceso con su PIN.</p>
                <button
                    onClick={() => router.push(`/memorials/m/${uuid}/login`)}
                    className="bg-primary/10 hover:bg-primary/20 text-primary px-8 py-3 rounded-full font-bold uppercase tracking-widest transition-all border border-primary/20"
                >
                    Ir a Gestión Familiar
                </button>
            </div>
        );
    }

    if (error || !memorial) {
        return (
            <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
                <Heart size={64} className="text-red-500/20 mb-6" />
                <h1 className="text-4xl font-serif text-white mb-4">Memorial no encontrado</h1>
                <p className="text-muted-foreground max-w-md">{error?.message || "El enlace es incorrecto o el memorial ha sido retirado."}</p>
            </div>
        );
    }

    // --- RENDER LOGIC ---

    const handleShare = async () => {
        const shareData = {
            title: `Homenaje a ${mascota?.name}`,
            text: `Un recuerdo eterno para ${mascota?.name} 🕊️`,
            url: typeof window !== 'undefined' ? window.location.href : '',
        };
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share(shareData);
            } catch { /* User cancelled */ }
        } else {
            setShowShareModal(true);
        }
    };

    const handleSendKiss = (e: React.MouseEvent) => {
        // Create floating effect (Heart/Star)
        const btn = e.currentTarget as HTMLButtonElement;
        const particle = document.createElement('div');
        particle.innerHTML = "✨"; // Or ❤️
        particle.style.position = "fixed";
        particle.style.left = "50%";
        particle.style.top = "50%";
        particle.style.fontSize = "2rem";
        particle.style.zIndex = "100";
        particle.style.transition = "all 1.5s ease-out";
        particle.style.pointerEvents = "none";
        document.body.appendChild(particle);

        requestAnimationFrame(() => {
            particle.style.transform = "translate(100px, -500px) scale(0)";
            particle.style.opacity = "0";
        });

        // Feedback
        const originalText = btn.innerHTML;
        // Using translation key or default
        const successText = t.mem_kiss_received || 'Recibido';
        // We need to be careful with innerHTML if we want to restore icon.
        // But for now, let's just change text or ignore button text change if complex.
        // Actually, let's keep it simple: just the particle effect.

        setTimeout(() => {
            particle.remove();
        }, 2000);
    };

    const renderLayout = () => {
        const tipo = computedMemorial?.diseno?.tipo_diseno || 'normal';

        const commonProps = {
            memorial: computedMemorial,
            mascota,
            randomMainImage,
            galleryImages,
            dedicatorias,
            mixedItems,
            newDedication,
            setNewDedication,
            handleSubmitDedication,
            isSubmitting,
            canAddMore,
            formRef,
            scrollToForm,
            selectedDedication,
            setSelectedDedication,
            setIsDedicationModalOpen,
            particles,
            tenant_info,
            tenant_status,
            ensureAbsoluteUrl,
            formatInstagramUrl,
            uuid,
            router,
            setShowShareModal,
            t,
            locale,
            onShare: handleShare,
            onSendKiss: handleSendKiss,
            // Pass themeConfig if needed (NormalLayout uses it)
            themeConfig,
            isUltra // Pass isUltra flag
        };



        switch (tipo) {
            case 'editorial':
                return <EditorialLayout {...commonProps} />;
            case 'carta':
                return <CartaLayout {...commonProps} />;
            case 'cinematico':
                return <CinematicoLayout {...commonProps} />;
            case 'constelacion':
                return <ConstelacionLayout {...commonProps} />;
            case 'galeria':
                return <GaleriaLayout {...commonProps} />;
            case 'altar':
                return <AltarLayout {...commonProps} />;
            case 'cielo':
                return <CieloLayout {...commonProps} />;
            default:
                return <NormalLayout {...commonProps} />;
        }
    };

    return (
        <div
            className={`min-h-screen relative flex flex-col font-sans transition-colors duration-1000 overflow-hidden ${computedMemorial?.diseno?.color_fondo ? '' : themeConfig.bg} ${themeConfig.text}`}
            style={computedMemorial?.diseno?.color_fondo ? { backgroundColor: computedMemorial.diseno.color_fondo } : {}}>
            {themeConfig.isCustom && (
                <style dangerouslySetInnerHTML={{ __html: `
                    /* Sobrescribir colores de títulos del memorial */
                    h1, h2, .memorial-title {
                        color: ${themeConfig.titleColor} !important;
                    }
                    /* Sobrescribir colores de subtítulos, fechas y pequeños textos */
                    .memorial-subtitle, .memorial-date, .text-muted-foreground, .text-slate-400, [class*="tracking-widest"] {
                        color: ${themeConfig.subtitleColor} !important;
                    }
                    /* Sobrescribir colores de textos y párrafos */
                    .msg-despedida, p {
                        color: ${themeConfig.textColor} !important;
                    }
                    /* Sobrescribir botones o acentos */
                    button.bg-primary, button.bg-\\[\\#c3b091\\], button.bg-slate-900, .memorial-button {
                        background-color: ${themeConfig.accentColor} !important;
                        color: ${isColorDark(themeConfig.accentColor) ? '#ffffff' : '#0f172a'} !important;
                    }
                    button.bg-white\\/20, button.bg-black\\/5 {
                        border-color: ${themeConfig.accentColor}80 !important;
                        color: ${themeConfig.textColor} !important;
                    }
                ` }} />
            )}
            <CelestialBackground isDark={temaActual === 'oscuro' || temaActual === 'esmeralda' || temaActual === 'dorado'} />
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Pinyon+Script&family=Marcellus&family=Cinzel:wght@500;700&family=Quicksand:wght@300;500&display=swap" rel="stylesheet" />
            {/* Background Texture & Gradient Layers */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div
                    className="absolute inset-0 opacity-40"
                    style={{
                        background: `radial-gradient(circle at center, ${themeConfig.particle}05 0%, transparent 70%)`
                    }}
                />
                <div
                    className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                    }}
                />
                {particles}
            </div>



            {/* Share Modal (Backdrop) */}
            <AnimatePresence>
                {showShareModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowShareModal(false)}
                    >
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-sm font-bold uppercase tracking-widest text-white/80 text-center">Compartir Memorial</h3>
                            <p className="text-[10px] text-white/40 text-center tracking-wide">Comparte el legado de {mascota?.name}</p>

                            <div className="space-y-2">
                                {/* WhatsApp */}
                                <a
                                    href={`https://wa.me/?text=${encodeURIComponent(`Homenaje a ${mascota?.name} — Un recuerdo eterno 🕊️ ${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 text-emerald-300 transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <Send size={14} />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-widest">WhatsApp</span>
                                </a>

                                {/* Facebook */}
                                <a
                                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 text-blue-300 transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                        <ExternalLink size={14} />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-widest">Facebook</span>
                                </a>

                                {/* Copy Link */}
                                <button
                                    onClick={async () => {
                                        if (typeof window === 'undefined') return;
                                        const url = window.location.href;
                                        try {
                                            if (navigator.clipboard && window.isSecureContext) {
                                                await navigator.clipboard.writeText(url);
                                            } else {
                                                // Fallback for HTTP / insecure contexts
                                                const ta = document.createElement('textarea');
                                                ta.value = url;
                                                ta.style.position = 'fixed';
                                                ta.style.left = '-9999px';
                                                document.body.appendChild(ta);
                                                ta.focus();
                                                ta.select();
                                                document.execCommand('copy');
                                                document.body.removeChild(ta);
                                            }
                                            setCopiedLink(true);
                                            setTimeout(() => setCopiedLink(false), 2000);
                                        } catch {
                                            // Last resort fallback
                                            const ta = document.createElement('textarea');
                                            ta.value = url;
                                            ta.style.position = 'fixed';
                                            ta.style.left = '-9999px';
                                            document.body.appendChild(ta);
                                            ta.focus();
                                            ta.select();
                                            document.execCommand('copy');
                                            document.body.removeChild(ta);
                                            setCopiedLink(true);
                                            setTimeout(() => setCopiedLink(false), 2000);
                                        }
                                    }}
                                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                        {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-widest">
                                        {copiedLink ? '¡Copiado!' : 'Copiar Enlace'}
                                    </span>
                                </button>
                            </div>

                            <button
                                onClick={() => setShowShareModal(false)}
                                className="w-full py-3 text-[10px] uppercase tracking-widest font-bold text-white/30 hover:text-white/60 transition-colors"
                            >
                                Cerrar
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {renderLayout()}

            {/* --- UNIVERSAL DEDICATIONS SECTION --- */}
            <div className="relative w-full bg-gradient-to-b from-[#FDFBF7] via-[#F2F5F8] to-[#E1E7EE] py-24 z-10 overflow-hidden">
                {/* Partículas de destellos de luz con opacidad reducida (máx 15%) */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.15] z-0">
                    {particles}
                </div>

                <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 flex flex-col items-center z-10">
                    {/* 2. Dedications Feed (Shared) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch w-full">
                    <AnimatePresence mode="popLayout">
                        {mixedItems.map((item: any, idx: number) => (
                            <motion.div
                                key={`${item.type}-${item.data.id || item.data._id || idx}`}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: (idx % 3) * 0.1 }}
                                className="w-full h-full"
                            >
                                {item.type === 'dedication' ? (
                                    <div
                                        onClick={() => {
                                            setSelectedDedication(item.data);
                                            setIsDedicationModalOpen(true);
                                        }}
                                        className={`group cursor-pointer p-6 sm:p-8 rounded-3xl border shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col justify-between min-h-[260px] ${
                                            themeConfig.card.includes('bg-white') 
                                                ? 'bg-white/90 border-slate-100 hover:border-slate-200 shadow-slate-100/50' 
                                                : 'bg-white/5 border-white/10 hover:border-white/20'
                                        } backdrop-blur-md`}
                                    >
                                        <div className="space-y-5">
                                            <div className="flex items-center justify-between">
                                                <div className={`w-10 h-10 ${temaActual === 'claro' ? 'bg-slate-50 text-slate-400 border border-slate-100' : 'bg-white/5 border border-white/10'} rounded-full flex items-center justify-center`}>
                                                    <Quote size={16} fill="currentColor" className="opacity-40" />
                                                </div>
                                                <span className={`text-[10px] font-bold uppercase tracking-widest opacity-50 ${temaActual === 'claro' ? 'bg-slate-50 text-slate-600 border border-slate-100' : 'bg-white/5 border border-white/10'} px-3 py-1 rounded-full`}>
                                                    {new Date(item.data.fecha).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-base sm:text-lg leading-relaxed italic line-clamp-4 font-normal" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                                                "{item.data.mensaje}"
                                            </p>
                                        </div>
                                        <div className="mt-8 pt-6 border-t border-current/5 flex items-center justify-between group/footer">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="relative cursor-pointer transition-transform duration-500 group-hover:scale-105"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const heart = e.currentTarget.querySelector('svg');
                                                        if (heart) {
                                                            heart.style.transform = "scale(1.3)";
                                                            setTimeout(() => heart.style.transform = "scale(1)", 200);
                                                        }
                                                    }}
                                                >
                                                    <div className="absolute inset-0 bg-red-500/10 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                    <Heart
                                                        size={20}
                                                        className="text-red-500/40 group-hover:text-red-500 group-hover:fill-red-500 transition-all duration-500"
                                                    />
                                                </div>
                                                <span className="font-bold text-xs uppercase tracking-widest opacity-60 group-hover:opacity-90 transition-opacity duration-500">{item.data.mensajero}</span>
                                            </div>

                                            {/* Realistic Candle Icon */}
                                            <div className="text-amber-500/40 group-hover:text-amber-500 transition-colors">
                                                <Flame size={20} strokeWidth={2} />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="group relative rounded-3xl overflow-hidden aspect-[4/5] border border-white/10 shadow-sm hover:shadow-md transition-all duration-500 h-full">
                                        <img
                                            src={item.data}
                                            alt={`Memory ${idx}`}
                                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        <div className="absolute bottom-6 left-6 text-white/80 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                            <Heart size={20} fill="currentColor" />
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* 3. Dedication Form (Shared - Hidden if limit reached) */}
                {(() => {
                    // Logic to determine if we can add more dedications
                    const planName = (memorial.plan || (memorial.tenant?.subscription_plan?.name || "FREE")).toUpperCase();
                    const maxDedications = memorial?.dedication_limit !== undefined
                        ? memorial.dedication_limit
                        : (planName.includes("ULTRA") || planName.includes("PARAISO") ? 33
                            : (planName.includes("PRO") || planName.includes("VINCULO") ? 21
                                : (planName.includes("NORMAL") || planName.includes("HUELLA") ? 9
                                    : (planName.includes("FREE") || planName.includes("RECUERDO") ? 0 : 21))));

                    const approvedCount = memorial.dedications_count !== undefined
                        ? memorial.dedications_count
                        : ((memorial.dedicatorias || memorial.dedications)?.filter((d: any) => d.estado === 'aprobado' || d.estado === 'pendiente').length || 0);
                    const canAddMore = approvedCount < maxDedications;

                    if (!canAddMore) {
                        return (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="mt-24 text-center max-w-xl mx-auto px-6"
                            >
                                <div className="p-8 rounded-2xl bg-black/30 backdrop-blur-sm border border-white/10">
                                    <h3 className="text-xl font-serif italic opacity-90 mb-2">{t.mem_limit_full}</h3>
                                    <p className="text-sm opacity-60 uppercase tracking-widest">{t.mem_limit_reached}</p>
                                </div>
                            </motion.div>
                        );
                    }

                    return (
                        <motion.div

                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            ref={formRef}
                            className="mt-16 sm:mt-24 md:mt-32 max-w-2xl w-full px-2 sm:px-0"
                        >
                            <div className={`p-5 sm:p-8 md:p-12 rounded-3xl sm:rounded-[2rem] backdrop-blur-md border shadow-2xl relative overflow-hidden ${themeConfig.card}`}>

                                {/* Decorative Elements */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />

                                <div className="relative z-10 space-y-6 sm:space-y-8">
                                    <div className="text-center space-y-3">
                                        <h2 className={`text-2xl sm:text-3xl md:text-5xl font-bold tracking-wider ${temaActual === 'claro' ? '' : 'drop-shadow-sm'}`} style={{ fontFamily: "'Cinzel', serif" }}>
                                            {t.mem_leave_message}
                                        </h2>
                                        <p className="font-serif text-base sm:text-lg opacity-80 italic tracking-wide">
                                            {t.mem_dedication_info}
                                        </p>
                                        <div className="w-16 h-px bg-current opacity-30 mx-auto mt-4" />
                                    </div>

                                    <form onSubmit={handleSubmitDedication} className="space-y-5 sm:space-y-6 pt-4">
                                        <div className="space-y-1">
                                            <label className="text-xs uppercase tracking-[0.2em] opacity-60 ml-4 font-bold">Tu Nombre</label>
                                            <input
                                                type="text"
                                                value={newDedication.nombre}
                                                onChange={e => setNewDedication({ ...newDedication, nombre: e.target.value })}
                                                placeholder={t.form_name_placeholder}
                                                className={`w-full px-5 sm:px-6 py-4 min-h-[52px] rounded-xl border-b-2 border-transparent bg-black/10 focus:bg-black/20 focus:border-current/30 transition-all outline-none font-serif text-base sm:text-lg ${themeConfig.input || ''}`}
                                                required
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center mr-4">
                                                <label className="text-xs uppercase tracking-[0.2em] opacity-60 ml-4 font-bold">Tu Mensaje</label>
                                                <span className={`text-[10px] uppercase tracking-widest font-bold ${newDedication.mensaje.length >= 300 ? 'text-red-500' : (newDedication.mensaje.length >= 250 ? 'text-amber-500' : 'opacity-40')}`}>
                                                    {newDedication.mensaje.length}/300
                                                </span>
                                            </div>
                                            <textarea
                                                value={newDedication.mensaje}
                                                onChange={e => setNewDedication({ ...newDedication, mensaje: e.target.value })}
                                                placeholder={t.form_msg_placeholder}
                                                rows={5}
                                                maxLength={300}
                                                className={`w-full px-5 sm:px-6 py-4 rounded-xl border-b-2 border-transparent bg-black/10 focus:bg-black/20 focus:border-current/30 transition-all outline-none font-serif text-base sm:text-lg resize-none ${themeConfig.input || ''}`}
                                                required
                                            />
                                        </div>

                                        <div className="pt-4">
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className={`w-full min-h-[52px] py-5 rounded-xl font-bold uppercase tracking-[0.25em] text-xs shadow-xl hover:scale-[1.01] hover:shadow-2xl transition-all disabled:opacity-50 relative overflow-hidden group ${themeConfig.button || 'bg-slate-900 text-white'}`}
                                            >
                                                <span className="relative z-10 flex items-center justify-center gap-3">
                                                    {isSubmitting ? (
                                                        <Loader2 className="animate-spin w-5 h-5" />
                                                    ) : (
                                                        <>
                                                            {t.form_submit}
                                                        </>
                                                    )}
                                                </span>
                                            </button>
                                            <p className="text-center text-[10px] uppercase tracking-widest opacity-40 mt-4">
                                                {t.mem_moderated_by_family}
                                            </p>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </motion.div>
                    );
                })()}

                {/* Tenant Attribution Section (Only for active tenants) */}
                {tenant_status === 'active' && (
                    <div className="flex flex-col items-center py-16 text-center relative z-10">
                        <div className={`h-px ${temaActual === 'claro' ? 'bg-slate-200' : 'bg-white/10'} w-24 mb-10`} />

                        <span className={`text-[11px] md:text-[13px] uppercase tracking-[0.5em] ${temaActual === 'claro' ? 'text-slate-500' : 'text-white/50'} font-light italic mb-6`}
                            style={temaActual === 'claro' ? {} : { textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                            {t.footer_courtesy_of}
                        </span>

                        <div className="flex flex-col items-center group">
                            {tenant_info?.logo && (
                                <div className="w-24 h-24 md:w-32 md:h-32 mb-8 transition-transform duration-700 group-hover:scale-105 flex items-center justify-center relative">
                                    <div className={`absolute inset-0 ${temaActual === 'claro' ? 'bg-black/5' : 'bg-white/5'} rounded-full blur-2xl opacity-50 group-hover:opacity-80 transition-opacity`} />
                                    <img
                                        src={tenant_info.logo}
                                        alt={tenant_info.name}
                                        className={`w-full h-full object-contain ${temaActual === 'claro' ? 'opacity-90' : 'grayscale opacity-60'} group-hover:grayscale-0 group-hover:opacity-100 transition-all rounded-full border ${temaActual === 'claro' ? 'border-slate-200' : 'border-white/20'} shadow-2xl p-4 relative z-10`}
                                    />
                                </div>
                            )}

                            <h3 className={`text-3xl md:text-5xl font-serif tracking-widest font-medium transition-colors duration-700 ${themeConfig.text}`}
                                style={temaActual === 'claro' ? {} : { textShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                                {tenant_info?.name}
                            </h3>

                            {/* Tenant Links: Instagram & Website */}
                            <div className="flex items-center gap-8 mt-8">
                                {tenant_info?.social_instagram && (
                                    <a
                                        href={formatInstagramUrl(tenant_info.social_instagram)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-2 text-[10px] md:text-xs uppercase tracking-[0.3em] ${temaActual === 'claro' ? 'text-slate-500 hover:text-slate-900' : 'text-white/40 hover:text-white/100'} transition-all group/link`}
                                    >
                                        <Instagram size={14} className="transition-transform group-hover/link:-translate-y-0.5" /> Instagram
                                    </a>
                                )}
                                {tenant_info?.website && (
                                    <a
                                        href={ensureAbsoluteUrl(tenant_info.website)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-2 text-[10px] md:text-xs uppercase tracking-[0.3em] ${temaActual === 'claro' ? 'text-slate-500 hover:text-slate-900' : 'text-white/40 hover:text-white/100'} transition-all group/link`}
                                    >
                                        <Globe size={14} className="transition-transform group-hover/link:-translate-y-0.5" /> {locale === 'es' ? 'Sitio Web' : 'Website'}
                                    </a>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => router.push(`/memorials/m/${uuid}/login`)}
                            className={`mt-12 text-[10px] uppercase font-bold tracking-[0.5em] ${temaActual === 'claro' ? 'text-slate-500 hover:text-slate-900 border-slate-300 hover:border-slate-500 bg-slate-100/50' : 'text-white/40 hover:text-white/90 border-white/10 hover:border-white/20 bg-white/[0.03]'} transition-all flex items-center gap-3 py-3 px-8 rounded-full border backdrop-blur-md shadow-xl hover:-translate-y-1`}
                        >
                            <ShieldCheck size={14} /> {t.footer_management}
                        </button>

                        <div className="h-px bg-white/5 w-16 mt-16 opacity-20" />
                    </div>
                )}

            </div>
            </div>
            <HuellasFooter locale={locale} t={t} />

            {/* Expiration Modal */}
            <ExpirationModal
                isOpen={showExpirationModal}
                petName={mascota?.name || 'Mascota'}
                memorialId={uuid}
                locale={locale}
                status={expirationStatus}
                onClose={() => setShowExpirationModal(false)} // Allow close for now so they can see content if they want, or remove to force
            />

            {/* Success Modal */}
            <AnimatePresence>
                {showSuccessModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowSuccessModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />
                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                                    <Sparkles className="text-emerald-400" size={32} />
                                </div>
                                <h3 className="text-2xl font-serif text-white mb-4">
                                    {t.mem_dedication_sent_title}
                                </h3>
                                <p className="text-white/70 mb-8 leading-relaxed font-light text-lg">
                                    {t.mem_dedication_sent_msg}
                                </p>
                                <button
                                    onClick={() => setShowSuccessModal(false)}
                                    className="bg-white text-slate-900 px-8 py-3 rounded-full font-bold uppercase tracking-widest hover:scale-105 transition-transform shadow-lg"
                                >
                                    {t.form_success_btn}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal de Límite Alcanzado */}
            <LimitReachedModal
                isOpen={showLimitModal}
                onClose={() => setShowLimitModal(false)}
                limit={memorial?.dedication_limit || 0}
                planName={(memorial?.plan || memorial?.tenant?.subscription_plan?.name || 'Free').toUpperCase()}
            />

            <DedicationModal
                isOpen={isDedicationModalOpen}
                onClose={() => setIsDedicationModalOpen(false)}
                dedication={selectedDedication}
                locale={locale}
                themeConfig={themeConfig.card.includes('bg-white') ? {
                    card: 'bg-white border-slate-200 shadow-2xl',
                    text: 'text-slate-800',
                    divider: 'border-slate-100',
                    overlay: 'bg-sky-900/20 backdrop-blur-sm'
                } : {
                    card: 'bg-[#0f172a] border-white/10 shadow-2xl shadow-black/50',
                    text: 'text-slate-100',
                    divider: 'border-white/5',
                    overlay: 'bg-black/80 backdrop-blur-md'
                }}
            />
        </div>
    );
}
