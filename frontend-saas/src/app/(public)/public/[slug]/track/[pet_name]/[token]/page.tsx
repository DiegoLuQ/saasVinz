"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest, API_BASE_URL } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Star,
    CheckCircle2,
    PawPrint,
    Camera,
    FileText,
    AlertCircle,
    Building2,
    Heart,
    Moon,
    Sun,
    ClipboardList,
    Truck,
    Flame,
    Package,
    User,
    Scale,
    Sparkles,
    Download,
    Loader2,
    ShieldCheck,
    ChevronDown,
    ChevronUp,
    Share2,
    Check,
    Gift,
} from 'lucide-react';
import EvidenceModal from '@/components/public/EvidenceModal';
import FeedbackSurvey from '@/components/public/FeedbackSurvey';
import { vinzerPromoUrl } from '@/lib/publicUrls';
import html2canvas from 'html2canvas';
import PublicTributeCarousel from '@/components/public/PublicTributeCarousel';

const getStepIcon = (index: number) => {
    switch (index) {
        case 0: return <ClipboardList size={18} />;
        case 1: return <Truck size={18} />;
        case 2: return <PawPrint size={18} />;
        case 3: return <Flame size={18} />;
        case 4: return <Package size={18} />;
        default: return <PawPrint size={18} />;
    }
};

const getCelestialStepIcon = (index: number) => {
    switch (index) {
        case 0: return <ClipboardList size={18} />;
        case 1: return <Truck size={18} />;
        case 2: return <Flame size={18} />;
        case 3: return <Gift size={18} />;
        case 4: return <Heart size={18} />;
        default: return <PawPrint size={18} />;
    }
};

// Custom Angel Wing Icon Component
const AngelWings = ({ className = "w-6 h-6", color = "currentColor" }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 35C50 35 45 20 25 20C10 20 2 30 2 45C2 70 25 80 50 80C75 80 98 70 98 45C98 30 90 20 75 20C55 20 50 35 50 35Z" stroke={color} strokeWidth="3" opacity="0.1" />
        <path d="M48 40C35 30 15 30 10 45C8 55 15 65 25 70M52 40C65 30 85 30 90 45C92 55 85 65 75 70" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M40 50C30 45 20 45 15 55M60 50C70 45 80 45 85 55" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
);

// Nubes del fondo (posición, duración de la deriva, opacidad)
const CLOUDS = [
    { cls: 'w-56 h-28 top-[6%] -left-10', dur: 46, delay: 0, op: 0.95 },
    { cls: 'w-72 h-36 top-[14%] -right-16', dur: 58, delay: 12, op: 0.9 },
    { cls: 'w-44 h-24 top-[34%] left-[6%]', dur: 40, delay: 20, op: 0.75 },
    { cls: 'w-64 h-32 top-[48%] right-[4%]', dur: 52, delay: 6, op: 0.8 },
    { cls: 'w-52 h-28 top-[66%] -left-8', dur: 44, delay: 30, op: 0.85 },
    { cls: 'w-40 h-20 top-[24%] left-[42%]', dur: 62, delay: 18, op: 0.55 },
];

// Custom Cloud Component for background
interface CloudBackgroundProps {
    className?: string;
    opacity?: number;
    style?: React.CSSProperties;
}

const CloudBackground = ({ className = "w-32 h-20", opacity = 0.5, style = {} }: CloudBackgroundProps) => (
    <svg viewBox="0 0 200 100" className={className} style={style} fill="currentColor" aria-hidden="true">
        <g opacity={opacity}>
            <circle cx="52" cy="66" r="26" />
            <circle cx="86" cy="48" r="34" />
            <circle cx="126" cy="52" r="30" />
            <circle cx="158" cy="68" r="22" />
            <rect x="40" y="64" width="128" height="28" rx="14" />
        </g>
    </svg>
);

const getImageUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    return `${API_BASE_URL}${cleanPath}`;
};

export default function TrackingPage() {
    const params = useParams();

    // Derived values with fallbacks
    // useParams entrega los segmentos aún codificados («Mar%C3%ADa%20…»); sin decodificar,
    // encodeURIComponent los codificaba dos veces y los nombres con tilde/espacios no se encontraban.
    const decodeParam = (v: unknown) => {
        const s = typeof v === 'string' ? v : '';
        try { return decodeURIComponent(s); } catch { return s; }
    };
    const slug = decodeParam(params?.slug);
    const pet_name = decodeParam(params?.pet_name);
    const token = decodeParam(params?.token);

    const [data, setData] = useState<any>(null);
    // Fotos de la mascota (hasta 3): rotan suavemente en el círculo principal
    const [photoIdx, setPhotoIdx] = useState(0);
    const petPhotos: string[] = (data?.pet_images?.length ? data.pet_images : data?.pet_image_url ? [data.pet_image_url] : []);
    useEffect(() => {
        if (petPhotos.length < 2) return;
        const t = setInterval(() => setPhotoIdx(i => (i + 1) % petPhotos.length), 5000);
        return () => clearInterval(t);
    }, [petPhotos.length]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedEvidence, setSelectedEvidence] = useState<any>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [mobileTab, setMobileTab] = useState<'tracking' | 'tribute'>('tracking');
    const [stars, setStars] = useState<{ id: number; top: string; left: string; size: number; delay: string; duration: string }[]>([]);
    const [isDownloadingCard, setIsDownloadingCard] = useState(false);
    const cardExportRef = React.useRef<HTMLDivElement>(null);

    const handleDownloadCard = async () => {
        if (!cardExportRef.current) return;
        setIsDownloadingCard(true);
        try {
            // Fuentes de la plantilla cargadas: si no, el PNG sale con otra métrica de texto
            if (document.fonts?.ready) await document.fonts.ready;
            const canvas = await html2canvas(cardExportRef.current, {
                useCORS: true,
                scale: 2,
                backgroundColor: null,
                logging: false,
            });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `homenaje-${(data?.pet_name || 'angelito').replace(/\s+/g, '-').toLowerCase()}.png`;
            link.click();
        } catch (err) {
            console.error('Error al exportar homenaje:', err);
        } finally {
            setIsDownloadingCard(false);
        }
    };

    const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    const handleShare = async () => {
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: `Homenaje en Memoria de ${data?.pet_name || 'nuestro compañero'}`,
                    text: `En memoria y recuerdo eterno de ${data?.pet_name || 'nuestro compañero'}.`,
                    url: window.location.href,
                });
                return;
            } catch (err) {
                // Ignore share cancellation
            }
        }
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2500);
        }
    };

    const farewellConfig = React.useMemo(() => {
        const primaryPhoto = data?.pet_image_url || (petPhotos.length > 0 ? petPhotos[0] : null) || (data?.pet_images && data.pet_images[0]);
        if (!primaryPhoto && !data?.pet_name) return null;
        const base = data.farewell_template_config || {
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
        return {
            ...base,
            elements: {
                ...(base.elements || {}),
                petName: data.pet_name || 'Tu Angelito',
                subtitle: '',
                farewellText: data.pet_dedication || 'Gracias por cada instante de ternura y amor incondicional. Tu recuerdo vivirá por siempre en nuestra memoria.',
                image2Url: primaryPhoto ? getImageUrl(primaryPhoto) : null,
                tenantLogoUrl: data.tenant_logo ? getImageUrl(data.tenant_logo) : null,
                tenantName: (base.elements?.tenantName && String(base.elements.tenantName).trim()) || data.tenant_name || '',
                tenantWebsite: (base.elements?.tenantWebsite && String(base.elements.tenantWebsite).trim()) || '{sitio_web}',
                tenantSocialMedia: data.tenant_social_media || {},
            },
            tenantSocialMedia: data.tenant_social_media || {},
        };
    }, [data, petPhotos]);

    useEffect(() => {
        const generatedStars = Array.from({ length: 40 }).map((_, i) => ({
            id: i,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            size: Math.random() * 2 + 1,
            delay: `${Math.random() * 5}s`,
            duration: `${Math.random() * 3 + 2}s`
        }));
        setStars(generatedStars);
    }, []);

    useEffect(() => {
        if (typeof document !== 'undefined') {
            if (isDarkMode) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    }, [isDarkMode]);

    const trackingTemplate = ((data?.tracking_template || 'classic') as string);
    const isVisualTemplate = trackingTemplate === 'celestial' || Boolean((data as any)?.tracking_template_config);
    const dynamicElementUrl = (data as any)?.tracking_template_config?.element_url || '/tracking/elementos/alas_elemento.webp';
    const dynamicMobileBg = (data as any)?.tracking_template_config?.background_mobile_url || '/tracking/fondos/movil/fondo_cielo_flores_1_9_16.webp';
    const dynamicDesktopBg = (data as any)?.tracking_template_config?.background_desktop_url || '/tracking/fondos/desktop/fondo_cielo_flores_1_16_9.webp';

    const visualColors = React.useMemo(() => {
        const cfg = (data as any)?.tracking_template_config?.theme_config || {};
        return {
            accent: cfg.accent_color || '#D97706',
            title: isDarkMode ? (cfg.title_color_dark || '#FDF6E2') : (cfg.title_color_light || '#3E2723'),
            subtitle: isDarkMode ? (cfg.subtitle_color_dark || '#FDE68A') : (cfg.subtitle_color_light || '#78350F'),
        };
    }, [data, isDarkMode]);

    const theme = React.useMemo(() => {
        if (isVisualTemplate) {
            return {
                bg: isDarkMode ? 'bg-[#120d09]' : 'bg-[#FFFDF7]',
                text: isDarkMode ? 'text-[#FDF6E2]' : 'text-[#3E2723]',
                headerBg: isDarkMode ? 'bg-[#120d09]/80 border-amber-900/40' : 'bg-[#FFFDF7]/80 border-amber-200/60',
                petPhotoBorder: isDarkMode ? 'border-amber-300/80' : 'border-amber-300',
                petPhotoShadow: isDarkMode
                    ? 'shadow-[0_0_55px_-10px_rgba(251,191,36,0.45)]'
                    : 'shadow-[0_15px_40px_-10px_rgba(217,119,6,0.35)]',
                tenantLogoBg: isDarkMode ? 'bg-[#1f1610] border-amber-900/40 ring-amber-950/40' : 'bg-white border-amber-200 ring-amber-100',
                title: isDarkMode ? 'text-amber-100' : 'text-[#3E2723]',
                subtitle: isDarkMode ? 'text-amber-200/75' : 'text-amber-900/80',
                timelineLine: isDarkMode ? 'border-amber-500/30' : 'border-amber-300/60',
                indicatorCompleted: 'bg-amber-500 border-amber-500',
                indicatorCurrentInner: isDarkMode ? 'bg-[#1f1610] border-amber-400 ring-amber-400/30' : 'bg-white border-amber-500 ring-amber-400/25',
                indicatorPending: isDarkMode ? 'bg-[#1f1610] border-amber-900/40' : 'bg-white border-amber-200',
                cardCurrentBg: isDarkMode ? 'bg-[#251c16]/95 border-amber-500/60 shadow-xl' : 'bg-white/95 border-amber-300/80 shadow-[0_15px_30px_-10px_rgba(217,119,6,0.18)]',
                cardCompletedBg: isDarkMode ? 'bg-[#1f1610]/90 border-amber-900/40' : 'bg-white/95 border-amber-200/70 shadow-xs',
                cardPendingBg: isDarkMode ? 'bg-[#17100b]/60 border-amber-950/40' : 'bg-white/70 border-amber-100/70',
                cardTitleCurrent: isDarkMode ? 'text-amber-300' : 'text-amber-900',
                cardTitleOther: isDarkMode ? 'text-amber-100/90' : 'text-slate-800',
                dateBadge: isDarkMode ? 'text-amber-300 bg-amber-500/15 border-amber-500/30' : 'text-amber-800 bg-amber-100/70 border-amber-200/80',
                timeText: isDarkMode ? 'text-amber-200/60' : 'text-amber-800/70',
                footerTag: isDarkMode ? 'bg-[#1f1610]/90 border-amber-900/40 text-amber-300 shadow-sm backdrop-blur-md' : 'bg-white/95 border-amber-200 text-amber-900 shadow-xs backdrop-blur-md',
            };
        }

        if (trackingTemplate === 'warm') {
            return {
                bg: isDarkMode ? 'bg-[#171311]' : 'bg-[#FAF8F3]',
                text: isDarkMode ? 'text-[#F5EFE6]' : 'text-[#292522]',
                headerBg: isDarkMode ? 'bg-[#171311]/85 border-[#3A2E26]' : 'bg-[#FAF8F3]/85 border-[#E6DFD5]',
                petPhotoBorder: isDarkMode ? 'border-[#C6A56A]/50' : 'border-[#C6A56A]/60',
                petPhotoShadow: isDarkMode
                    ? 'shadow-[0_0_55px_-10px_rgba(198,165,106,0.35)]'
                    : 'shadow-[0_20px_50px_-12px_rgba(198,165,106,0.45)]',
                tenantLogoBg: isDarkMode ? 'bg-[#221C18] border-[#3A2E26] ring-[#2D241E]' : 'bg-white border-[#E6DFD5] ring-[#F0EAE0]',
                title: isDarkMode ? 'text-[#FAF8F3]' : 'text-[#292522]',
                subtitle: isDarkMode ? 'text-[#B5A899]' : 'text-[#77716A]',
                timelineLine: isDarkMode ? 'border-[#3A2E26]' : 'border-[#E6DFD5]',
                indicatorCompleted: 'bg-[#C6A56A] border-[#C6A56A]',
                indicatorCurrentInner: isDarkMode ? 'bg-[#221C18] border-[#C6A56A] ring-[#C6A56A]/25' : 'bg-white border-[#C6A56A] ring-[#C6A56A]/20',
                indicatorPending: isDarkMode ? 'bg-[#221C18] border-[#3A2E26]' : 'bg-[#FAF8F3] border-[#E6DFD5]',
                cardCurrentBg: isDarkMode ? 'bg-[#221C18] border-[#C6A56A]/50 shadow-xl' : 'bg-white border-[#C6A56A]/60 shadow-[0_18px_35px_-15px_rgba(91,73,61,0.16)]',
                cardCompletedBg: isDarkMode ? 'bg-[#221C18]/80 border-[#3A2E26]' : 'bg-white border-[#E6DFD5] shadow-sm',
                cardPendingBg: isDarkMode ? 'bg-[#1C1714]/60 border-[#2D241E]' : 'bg-[#F0EAE0]/50 border-[#E6DFD5]/80',
                cardTitleCurrent: isDarkMode ? 'text-[#E7C15A]' : 'text-[#5B493D]',
                cardTitleOther: isDarkMode ? 'text-[#F5EFE6]' : 'text-[#292522]',
                dateBadge: isDarkMode ? 'text-[#E7C15A] bg-[#C6A56A]/15 border-[#C6A56A]/30' : 'text-[#5B493D] bg-[#F0EAE0] border-[#C6A56A]/40',
                timeText: isDarkMode ? 'text-[#B5A899]/70' : 'text-[#77716A]',
                footerTag: isDarkMode ? 'bg-[#221C18]/90 border-[#3A2E26] text-[#E7C15A] shadow-sm backdrop-blur-md' : 'bg-white/95 border-[#E6DFD5] text-[#5B493D] shadow-xs backdrop-blur-md',
            };
        }

        if (trackingTemplate === 'modern') {
            return {
                bg: isDarkMode ? 'bg-[#090D16]' : 'bg-[#F8FAFC]',
                text: isDarkMode ? 'text-slate-100' : 'text-slate-800',
                headerBg: isDarkMode ? 'bg-[#090D16]/85 border-white/10' : 'bg-white/85 border-slate-200',
                petPhotoBorder: isDarkMode ? 'border-emerald-500/40' : 'border-emerald-500/30',
                petPhotoShadow: isDarkMode
                    ? 'shadow-[0_0_50px_-10px_rgba(16,185,129,0.35)]'
                    : 'shadow-[0_20px_45px_-12px_rgba(16,185,129,0.22)]',
                tenantLogoBg: isDarkMode ? 'bg-[#111827] border-white/10 ring-white/5' : 'bg-white border-slate-200 ring-slate-100',
                title: isDarkMode ? 'text-white' : 'text-slate-900',
                subtitle: isDarkMode ? 'text-slate-400' : 'text-slate-500',
                timelineLine: isDarkMode ? 'border-white/10' : 'border-slate-200',
                indicatorCompleted: 'bg-emerald-500 border-emerald-500',
                indicatorCurrentInner: isDarkMode ? 'bg-[#111827] border-emerald-400 ring-emerald-500/25' : 'bg-white border-emerald-500 ring-emerald-500/15',
                indicatorPending: isDarkMode ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200',
                cardCurrentBg: isDarkMode ? 'bg-[#111827] border-emerald-500/45 shadow-xl' : 'bg-white border-emerald-300 shadow-[0_18px_36px_-15px_rgba(16,185,129,0.16)]',
                cardCompletedBg: isDarkMode ? 'bg-[#111827]/80 border-white/10' : 'bg-white border-slate-200 shadow-sm',
                cardPendingBg: isDarkMode ? 'bg-[#0D1320]/60 border-white/5' : 'bg-slate-100/70 border-slate-200/70',
                cardTitleCurrent: isDarkMode ? 'text-emerald-400' : 'text-emerald-700',
                cardTitleOther: isDarkMode ? 'text-slate-200' : 'text-slate-800',
                dateBadge: isDarkMode ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25' : 'text-emerald-700 bg-emerald-50 border-emerald-200',
                timeText: isDarkMode ? 'text-slate-400' : 'text-slate-500',
                footerTag: isDarkMode ? 'bg-[#111827]/90 border-white/10 text-emerald-400 shadow-sm backdrop-blur-md' : 'bg-white/95 border-slate-200 text-emerald-700 shadow-xs backdrop-blur-md',
            };
        }

        // Default: classic
        return {
            bg: isDarkMode ? 'bg-[#0a1226]' : 'bg-[#eaf5fd]',
            text: isDarkMode ? 'text-neutral-200' : 'text-gray-800',
            headerBg: isDarkMode ? 'bg-[#0a1226]/70 border-white/10' : 'bg-white/60 border-sky-100',
            petPhotoBorder: isDarkMode ? 'border-[#0f1a35]' : 'border-white',
            petPhotoShadow: isDarkMode ? 'shadow-[0_0_60px_-10px_rgba(253,230,138,0.35)]' : 'shadow-[0_25px_60px_-12px_rgba(217,119,6,0.35)]',
            tenantLogoBg: isDarkMode ? 'bg-[#0f1a35] border-white/10 ring-neutral-800' : 'bg-white border-white ring-gray-100',
            title: isDarkMode ? 'text-neutral-100' : 'text-gray-900',
            subtitle: isDarkMode ? 'text-neutral-400' : 'text-gray-500',
            timelineLine: isDarkMode ? 'border-white/10' : 'border-sky-50',
            indicatorCompleted: isDarkMode ? 'bg-sky-500 border-sky-500' : 'bg-sky-500 border-sky-500',
            indicatorCurrentInner: isDarkMode ? 'bg-[#0a1226] border-sky-500 ring-sky-500/20' : 'bg-white border-sky-500 ring-sky-500/10',
            indicatorPending: isDarkMode ? 'bg-[#0f1a35] border-white/10' : 'bg-white border-gray-200',
            cardCurrentBg: isDarkMode ? 'bg-[#0f1a35] border-neutral-700 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]' : 'bg-white border-sky-200 shadow-[0_20px_40px_-15px_rgba(2,132,199,0.15)]',
            cardCompletedBg: isDarkMode ? 'bg-[#0f1a35] border-white/10' : 'bg-white border-gray-100 shadow-sm',
            cardPendingBg: isDarkMode ? 'bg-[#0a1226]/50 border-white/5' : 'bg-gray-50/50 border-gray-100',
            cardTitleCurrent: isDarkMode ? 'text-sky-400' : 'text-sky-700',
            cardTitleOther: isDarkMode ? 'text-neutral-300' : 'text-gray-700',
            dateBadge: isDarkMode ? 'text-sky-400 bg-sky-500/10 border-sky-500/20' : 'text-sky-800 bg-sky-50 border-sky-100',
            timeText: isDarkMode ? 'text-sky-500/50' : 'text-sky-600/40',
            footerTag: isDarkMode ? 'bg-[#0f1a35]/90 border-white/10 text-sky-400 shadow-sm backdrop-blur-md' : 'bg-white/95 border-sky-100/90 text-sky-800 shadow-xs backdrop-blur-md',
        };
    }, [trackingTemplate, isDarkMode]);

    const cloudTheme = React.useMemo(() => {
        if (trackingTemplate === 'warm') {
            return {
                light: {
                    bgGradient: 'linear-gradient(180deg, #F3EAE0 0%, #F9F3EA 32%, #FAF8F3 65%, #FFFDF8 100%)',
                    cloudColor: 'text-[#FFFDF8]',
                    cloudShadow: 'drop-shadow-[0_12px_24px_rgba(198,165,106,0.18)]',
                    cloudOpacityFactor: 0.95,
                    bottomBankColor: 'text-[#FAF5ED]',
                    bottomBankOpacity: 0.95,
                    nebulaColor: 'bg-[#C6A56A]/20',
                    topLight: 'bg-[#FBECC8]/60',
                },
                dark: {
                    bgGradient: 'linear-gradient(180deg, #0e0a07 0%, #17110d 45%, #241a14 100%)',
                    cloudColor: 'text-[#E7C15A]',
                    cloudShadow: 'drop-shadow-[0_10px_25px_rgba(231,193,90,0.22)]',
                    cloudOpacityFactor: 0.26,
                    bottomBankColor: 'text-[#241a14]',
                    bottomBankOpacity: 0.55,
                    nebulaColor: 'bg-[#C6A56A]/15',
                    topLight: 'bg-[#E7C15A]/12',
                    starColor: 'bg-[#FDE68A]',
                }
            };
        }

        if (trackingTemplate === 'modern') {
            return {
                light: {
                    bgGradient: 'linear-gradient(180deg, #EDF7F4 0%, #F3FAF8 32%, #F8FAFC 65%, #FFFFFF 100%)',
                    cloudColor: 'text-white',
                    cloudShadow: 'drop-shadow-[0_12px_24px_rgba(16,185,129,0.12)]',
                    cloudOpacityFactor: 0.92,
                    bottomBankColor: 'text-[#F1F9F6]',
                    bottomBankOpacity: 0.95,
                    nebulaColor: 'bg-emerald-400/15',
                    topLight: 'bg-teal-50/70',
                },
                dark: {
                    bgGradient: 'linear-gradient(180deg, #050811 0%, #090e1c 45%, #0f172a 100%)',
                    cloudColor: 'text-teal-200',
                    cloudShadow: 'drop-shadow-[0_10px_25px_rgba(20,184,166,0.20)]',
                    cloudOpacityFactor: 0.24,
                    bottomBankColor: 'text-[#0d1629]',
                    bottomBankOpacity: 0.50,
                    nebulaColor: 'bg-emerald-500/15',
                    topLight: 'bg-teal-400/10',
                    starColor: 'bg-white',
                }
            };
        }

        // Classic / Default
        return {
            light: {
                bgGradient: 'linear-gradient(180deg, #a9d8f7 0%, #c9e7fb 28%, #e3f2fd 58%, #f6fbff 100%)',
                cloudColor: 'text-white',
                cloudShadow: 'drop-shadow-[0_10px_20px_rgba(14,116,144,0.12)]',
                cloudOpacityFactor: 0.95,
                bottomBankColor: 'text-white',
                bottomBankOpacity: 0.95,
                nebulaColor: 'bg-sky-100/35',
                topLight: 'bg-amber-50/70',
            },
            dark: {
                bgGradient: 'linear-gradient(180deg, #050b1d 0%, #0b1a3a 45%, #13284f 100%)',
                cloudColor: 'text-sky-200',
                cloudShadow: 'drop-shadow-[0_10px_25px_rgba(56,189,248,0.24)]',
                cloudOpacityFactor: 0.28,
                bottomBankColor: 'text-[#0e2145]',
                bottomBankOpacity: 0.55,
                nebulaColor: 'bg-sky-950/25',
                topLight: 'bg-sky-400/10',
                starColor: 'bg-white',
            }
        };
    }, [trackingTemplate]);

    // Main fetch effect
    useEffect(() => {
        let isMounted = true;

        const performFetch = async () => {
            if (!slug || !pet_name || !token) return;

            try {
                if (isMounted) setLoading(true);

                const safeSlug = encodeURIComponent(slug);
                const safePetName = encodeURIComponent(pet_name);
                const safeToken = encodeURIComponent(token);

                const res = await apiRequest(`/api/public/tracking/${safeSlug}/${safePetName}/${safeToken}`);

                if (isMounted) {
                    setData(res);
                    setError('');
                    setLoading(false);
                }
            } catch (err: any) {
                console.error("Tracking Error:", err);
                if (isMounted) {
                    setError('No pudimos encontrar la información. Por favor, verifica el enlace.');
                    setLoading(false);
                }
            }
        };

        performFetch();

        const timer = setTimeout(() => {
            if (isMounted && loading && (!slug || !pet_name || !token)) {
                setError('Enlace inválido o incompleto.');
                setLoading(false);
            }
        }, 5000);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [slug, pet_name, token]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8faf9] flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 text-sm font-semibold">Cargando con dedicación...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-[#f8faf9] flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-md">
                    <AlertCircle size={40} className="text-amber-500" />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">¡Ups! Algo no salió bien</h1>
                <p className="text-gray-500 max-w-xs mx-auto font-medium">{error || 'No hemos podido cargar la información.'}</p>
                <div className="flex flex-col gap-3 mt-8">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-8 py-3 bg-sky-600 rounded-2xl text-white font-bold hover:bg-sky-700 transition-all shadow-lg active:scale-95"
                    >
                        Intentar de nuevo
                    </button>
                    <a href="/" className="text-sky-700 text-sm font-bold hover:underline">
                        Ir al inicio
                    </a>
                </div>
            </div>
        );
    }

    const timeline = data?.timeline || [];
    const totalSteps = timeline.length;
    const completedCount = timeline.filter((e: any) => e.status === 'completed').length;
    const progressPercentage = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
    
    const currentEvent = timeline.find((e: any) => e.status === 'current') || timeline[completedCount - 1] || null;
    const currentStepName = currentEvent ? currentEvent.step_name : 'No iniciado';
    
    // Find the latest completed or current event for last update
    const activeEvents = timeline.filter((e: any) => e.status === 'completed' || e.status === 'current');
    const latestEventWithTime = [...activeEvents].reverse().find((e: any) => e.completed_at);
    const lastUpdateDate = latestEventWithTime ? new Date(latestEventWithTime.completed_at) : null;
    // Horas en la zona del crematorio (no en la del dispositivo de quien mira)
    const trackingTz: string = data?.timezone || 'America/Santiago';
    const fmtDate = (v: string | Date) => new Date(v).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: trackingTz });
    const fmtTime = (v: string | Date) => new Date(v).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: trackingTz });

    const isDelivered = data?.service_status === 'delivered' || data?.service_status === 'entregado';
    const isUltraDelivered = Boolean(data?.is_ultra_plan && isDelivered);
    // Enlace de reseñas de Google del crematorio (solo https de Google; lo valida el backend al guardarlo)
    const reviewUrl: string | undefined = (data?.tenant_social_media as { google_review?: string } | undefined)?.google_review || undefined;
    // Encuesta (si el crematorio tiene los avisos a la familia): primero la encuesta; la
    // invitación a Google se muestra después, y solo si la calificación fue 4 o 5.
    // Sin encuesta propia: al concluir solo se invita a la reseña en Google (si está configurada).
    const surveyOn = false;
    const showReview = Boolean(isDelivered && reviewUrl);

    return (
        <div className={`${isDarkMode ? 'dark' : ''} min-h-screen font-outfit transition-colors duration-500 selection:bg-sky-500/30 relative overflow-hidden ${theme.bg} ${theme.text}`}>
            {/* Celestial Background Effect */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cinzel:wght@600;700;800&family=Dancing+Script:wght@600;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
                    
                    .font-cinzel {
                        font-family: 'Cinzel', Georgia, serif;
                    }
                    .font-dancing {
                        font-family: 'Dancing Script', cursive, Georgia, serif;
                    }
                    .font-alex {
                        font-family: 'Alex Brush', cursive, Georgia, serif;
                    }
                    .font-outfit {
                        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    }
                    
                    @keyframes twinkle {
                        0%, 100% { opacity: 0.15; transform: scale(0.8); }
                        50% { opacity: 0.9; transform: scale(1.2); }
                    }
                    @keyframes float-cloud-left {
                        0% { transform: translate(-10%, -5%) scale(1); }
                        50% { transform: translate(5%, 5%) scale(1.1); }
                        100% { transform: translate(-10%, -5%) scale(1); }
                    }
                    @keyframes float-cloud-right {
                        0% { transform: translate(10%, 10%) scale(1.05); }
                        50% { transform: translate(-5%, -5%) scale(0.95); }
                        100% { transform: translate(10%, 10%) scale(1.05); }
                    }
                    @keyframes drift-cloud {
                        0% { transform: translateX(-15%); }
                        50% { transform: translateX(15%); }
                        100% { transform: translateX(-15%); }
                    }
                    .star {
                        animation: twinkle var(--duration) ease-in-out infinite;
                        animation-delay: var(--delay);
                    }
                    @keyframes halo-float {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-4px); }
                    }
                    @keyframes ring-spin { to { transform: rotate(360deg); } }
                    .memorial-halo { animation: halo-float 3.5s ease-in-out infinite; }
                    .memorial-ring {
                        background: conic-gradient(from 0deg, #fde68a, #fffbeb, #f59e0b, #fde68a, #fff7d6, #d97706, #fde68a);
                        animation: ring-spin 14s linear infinite;
                    }
                    .memorial-dash { animation: ring-spin 60s linear infinite reverse; }
                    @media (prefers-reduced-motion: reduce) {
                        .memorial-halo, .memorial-ring, .memorial-dash, .star { animation: none !important; }
                    }
                    .cloud-nebula {
                        filter: blur(80px);
                        transition: all 1s ease-in-out;
                    }
                `}</style>

                {/* Celestial / Visual Dynamic WebP Backgrounds */}
                {isVisualTemplate ? (
                    <div className="absolute inset-0 overflow-hidden">
                        {/* Mobile Background 9:16 */}
                        <img
                            src={dynamicMobileBg}
                            alt="Fondo Conmemorativo Móvil"
                            className="block md:hidden w-full h-full object-cover object-top fixed inset-0 scale-[1.02] transform-gpu pointer-events-none select-none z-0"
                        />
                        {/* Desktop Background 16:9 */}
                        <img
                            src={dynamicDesktopBg}
                            alt="Fondo Conmemorativo Desktop"
                            className="hidden md:block w-full h-full object-cover object-center fixed inset-0 scale-[1.01] transform-gpu pointer-events-none select-none z-0"
                        />
                        {/* Dark mode overlay */}
                        <div className={`fixed inset-0 transition-opacity duration-500 pointer-events-none z-0 ${
                            isDarkMode ? 'bg-[#0e0a07]/80 backdrop-brightness-75' : 'bg-transparent'
                        }`} />
                    </div>
                ) : (
                    <>
                        {/* Light Mode Sky Background (Todas las plantillas: Classic, Warm, Modern) */}
                        <div className={`absolute inset-0 transition-opacity duration-1000 ${
                            isDarkMode ? 'opacity-0' : 'opacity-100'
                        }`} style={{
                            background: cloudTheme.light.bgGradient
                        }}>
                            {/* Nebula glow blobs */}
                            <div 
                                className={`absolute -top-20 -left-20 w-[450px] h-[450px] rounded-full cloud-nebula ${cloudTheme.light.nebulaColor}`}
                                style={{ animation: 'float-cloud-left 25s ease-in-out infinite' }}
                            />
                            <div 
                                className={`absolute top-[40%] -right-40 w-[500px] h-[500px] rounded-full cloud-nebula ${cloudTheme.light.nebulaColor}`}
                                style={{ animation: 'float-cloud-right 30s ease-in-out infinite' }}
                            />
                            <div 
                                className={`absolute -bottom-20 left-[10%] w-[400px] h-[400px] rounded-full cloud-nebula ${cloudTheme.light.nebulaColor}`}
                                style={{ animation: 'float-cloud-left 20s ease-in-out infinite' }}
                            />

                            {/* Luz cálida desde arriba */}
                            <div className={`absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[520px] rounded-full cloud-nebula ${cloudTheme.light.topLight}`} />

                            {/* Nubes esponjosas a la deriva - acorde al diseño */}
                            {CLOUDS.map((c, i) => (
                                <CloudBackground
                                    key={i}
                                    className={`absolute ${cloudTheme.light.cloudColor} ${cloudTheme.light.cloudShadow} ${c.cls}`}
                                    style={{ animation: `drift-cloud ${c.dur}s ease-in-out infinite`, animationDelay: `-${c.delay}s` }}
                                    opacity={c.op * cloudTheme.light.cloudOpacityFactor}
                                />
                            ))}

                            {/* Banco de nubes al pie */}
                            <div className="absolute -bottom-12 inset-x-0 h-48 flex items-end justify-center">
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <CloudBackground key={i} className={`${cloudTheme.light.bottomBankColor} w-[34rem] h-48 -mx-24 shrink-0`} opacity={cloudTheme.light.bottomBankOpacity} />
                                ))}
                            </div>
                        </div>

                        {/* Dark Mode Sky Background (Todas las plantillas con nubes y estrellas acorde al color y contraste) */}
                        <div className={`absolute inset-0 transition-opacity duration-1000 ${
                            isDarkMode ? 'opacity-100' : 'opacity-0'
                        }`} style={{
                            background: cloudTheme.dark.bgGradient
                        }}>
                            {stars.map((star) => (
                                <div
                                    key={star.id}
                                    className={`absolute rounded-full star ${cloudTheme.dark.starColor}`}
                                    style={{
                                        top: star.top,
                                        left: star.left,
                                        width: `${star.size}px`,
                                        height: `${star.size}px`,
                                        '--duration': star.duration,
                                        '--delay': star.delay,
                                    } as React.CSSProperties}
                                />
                            ))}

                            <div 
                                className={`absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full cloud-nebula ${cloudTheme.dark.nebulaColor}`}
                                style={{ animation: 'float-cloud-left 35s ease-in-out infinite' }}
                            />
                            <div 
                                className={`absolute top-[30%] -right-40 w-[500px] h-[500px] rounded-full cloud-nebula ${cloudTheme.dark.nebulaColor}`}
                                style={{ animation: 'float-cloud-right 40s ease-in-out infinite' }}
                            />
                            <div 
                                className={`absolute -bottom-40 left-[20%] w-[450px] h-[450px] rounded-full cloud-nebula ${cloudTheme.dark.nebulaColor}`}
                                style={{ animation: 'float-cloud-left 28s ease-in-out infinite' }}
                            />

                            {/* Nubes esponjosas nocturnas a la deriva - visibles, etéreas y con contraste perfecto */}
                            {CLOUDS.map((c, i) => (
                                <CloudBackground
                                    key={i}
                                    className={`absolute ${cloudTheme.dark.cloudColor} ${cloudTheme.dark.cloudShadow} ${c.cls}`}
                                    style={{ animation: `drift-cloud ${c.dur}s ease-in-out infinite`, animationDelay: `-${c.delay}s` }}
                                    opacity={c.op * cloudTheme.dark.cloudOpacityFactor}
                                />
                            ))}

                            {/* Banco de nubes nocturno al pie */}
                            <div className="absolute -bottom-12 inset-x-0 h-48 flex items-end justify-center">
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <CloudBackground key={i} className={`${cloudTheme.dark.bottomBankColor} w-[34rem] h-48 -mx-24 shrink-0`} opacity={cloudTheme.dark.bottomBankOpacity} />
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Header / Brand */}
            {isVisualTemplate ? (
                <header className="fixed top-0 left-0 right-0 z-20 px-4 sm:px-6 py-3 sm:py-4 pointer-events-none">
                    <div className="max-w-4xl mx-auto flex items-center justify-between pointer-events-auto">
                        <div className="w-9 sm:w-10" />
                        <span
                            className={`font-cinzel font-bold text-xs sm:text-sm md:text-base tracking-[0.28em] uppercase transition-colors duration-300 text-center select-none ${
                                isDarkMode ? 'text-amber-200' : 'text-amber-950'
                            }`}
                            style={{
                                textShadow: isDarkMode
                                    ? '0 1px 8px rgba(0,0,0,0.9), 0 0 20px rgba(251,191,36,0.2)'
                                    : '0 1px 6px rgba(255,255,255,0.9), 0 1px 2px rgba(120,53,15,0.15)',
                            }}
                        >
                            {data.tenant_name}
                        </span>
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className={`p-2 sm:p-2.5 rounded-full transition-all shrink-0 backdrop-blur-md cursor-pointer ${
                                isDarkMode
                                    ? 'bg-[#1a1410]/70 hover:bg-amber-400/20 text-amber-300 border border-amber-500/25 shadow-[0_2px_12px_rgba(0,0,0,0.5)]'
                                    : 'bg-white/40 hover:bg-white/70 text-amber-900 border border-white/60 shadow-xs hover:shadow-sm'
                            }`}
                            aria-label="Cambiar tema día/noche"
                        >
                            {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
                        </button>
                    </div>
                </header>
            ) : (
                <div className={`fixed top-0 w-full z-20 backdrop-blur-xl border-b transition-colors duration-500 ${theme.headerBg}`}>
                    <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-center relative">
                        <span className={`font-cinzel font-bold text-sm tracking-[0.25em] uppercase ${
                            trackingTemplate === 'warm'
                                ? isDarkMode ? 'text-[#E7C15A]' : 'text-[#5B493D]'
                                : trackingTemplate === 'modern'
                                    ? 'text-emerald-500'
                                    : 'text-sky-500'
                        }`}>{data.tenant_name}</span>
                        <button 
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className={`absolute right-4 sm:right-6 p-2 rounded-full transition-colors ${
                                trackingTemplate === 'warm'
                                    ? 'hover:bg-[#C6A56A]/15 text-[#C6A56A]'
                                    : trackingTemplate === 'modern'
                                        ? 'hover:bg-emerald-500/10 text-emerald-500'
                                        : 'hover:bg-sky-500/10 text-sky-500'
                            }`}
                        >
                            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    </div>
                    {trackingTemplate === 'modern' && totalSteps > 0 && (
                        <div className="w-full h-1 bg-slate-200/50 dark:bg-white/5">
                            <div
                                className="h-full bg-emerald-500 transition-all duration-700"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    )}
                </div>
            )}

            <div className={`max-w-5xl mx-auto pb-20 px-4 sm:px-6 relative z-10 ${
                isVisualTemplate ? 'pt-28 sm:pt-36 md:pt-40' : 'pt-24'
            }`}>

                {/* Main Hero */}
                {isVisualTemplate ? (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 text-center"
                    >
                        <div className="relative inline-block mb-4 mt-6 sm:mt-8">
                            {/* Ambient golden aura - muy suave, difuso y con alto blur */}
                            <div
                                aria-hidden="true"
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] sm:w-[540px] h-[280px] sm:h-[350px] rounded-full bg-gradient-to-r from-amber-100/25 via-amber-200/35 to-amber-100/25 blur-[75px] pointer-events-none -z-10"
                            />

                            {/* Real Decorative Element (.webp: Alas, Corona, etc.) */}
                            <img
                                src={dynamicElementUrl}
                                alt="Elemento decorativo conmemorativo"
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[440px] md:w-[490px] max-w-none pointer-events-none z-0 select-none"
                                style={{
                                    filter: 'drop-shadow(0 0 25px rgba(254, 243, 199, 0.45)) drop-shadow(0 0 55px rgba(251, 191, 36, 0.2))'
                                }}
                            />

                            {/* Floating luminous Halo - Geometría elíptica perfecta con resplandor cálido (idéntico a referencia) */}
                            <div className="absolute -top-6 sm:-top-7 left-0 right-0 flex justify-center z-20 pointer-events-none">
                                {/* Resplandor difuso ambiental detrás de la aureola */}
                                <div
                                    aria-hidden="true"
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-12 rounded-full bg-amber-300/35 blur-md pointer-events-none"
                                />
                                <svg
                                    viewBox="0 0 160 44"
                                    className="memorial-halo w-32 sm:w-36 h-auto overflow-visible relative"
                                    style={{
                                        filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.95)) drop-shadow(0 0 22px rgba(245, 158, 11, 0.7))'
                                    }}
                                >
                                    <defs>
                                        <linearGradient id="celestial-halo-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#FEF08A" />
                                            <stop offset="20%" stopColor="#FBBF24" />
                                            <stop offset="50%" stopColor="#F59E0B" />
                                            <stop offset="80%" stopColor="#FBBF24" />
                                            <stop offset="100%" stopColor="#FEF08A" />
                                        </linearGradient>
                                    </defs>
                                    <ellipse
                                        cx="80"
                                        cy="22"
                                        rx="62"
                                        ry="14"
                                        fill="none"
                                        stroke="url(#celestial-halo-grad)"
                                        strokeWidth="4.5"
                                    />
                                </svg>
                            </div>

                            {/* Aro exterior punteado/discontinuo con estrellitas doradas (exacto a la referencia) */}
                            <div
                                aria-hidden="true"
                                className="absolute -inset-4 sm:-inset-5 rounded-full border border-dashed border-amber-300/70 pointer-events-none z-10"
                            >
                                {/* 8 Estrellitas decorativas en cuadrantes y diagonales */}
                                <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-amber-400 text-xs select-none">✦</span>
                                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-amber-400 text-xs select-none">✦</span>
                                <span className="absolute top-1/2 -left-2 -translate-y-1/2 text-amber-400 text-xs select-none">✦</span>
                                <span className="absolute top-1/2 -right-2 -translate-y-1/2 text-amber-400 text-xs select-none">✦</span>
                                <span className="absolute top-[10%] left-[10%] text-amber-400/90 text-xs select-none">✦</span>
                                <span className="absolute top-[10%] right-[10%] text-amber-400/90 text-xs select-none">✦</span>
                                <span className="absolute bottom-[10%] left-[10%] text-amber-400/90 text-xs select-none">✦</span>
                                <span className="absolute bottom-[10%] right-[10%] text-amber-400/90 text-xs select-none">✦</span>
                            </div>

                            {/* Circular Portrait - Marco Relicario con Degradado Dorado idéntico a referencia */}
                            <div
                                className="w-36 h-36 sm:w-42 sm:h-42 mx-auto rounded-full p-[6px] sm:p-[7px] relative z-10 shadow-[0_12px_32px_rgba(217,119,6,0.35)]"
                                style={{
                                    background: 'linear-gradient(180deg, #FDE68A 0%, #FBBF24 20%, #F59E0B 50%, #D97706 80%, #B45309 100%)',
                                }}
                            >
                                <div className="w-full h-full rounded-full ring-[3px] ring-white overflow-hidden relative bg-white group flex items-center justify-center">
                                    {petPhotos.length > 0 ? (
                                        <AnimatePresence initial={false}>
                                            <motion.img
                                                key={petPhotos[photoIdx % petPhotos.length]}
                                                src={getImageUrl(petPhotos[photoIdx % petPhotos.length]) || ''}
                                                alt={data.pet_name}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 1.2 }}
                                                className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105 duration-700"
                                            />
                                        </AnimatePresence>
                                    ) : (
                                        <div className="w-full h-full bg-amber-50 flex items-center justify-center">
                                            <PawPrint size={56} className="text-amber-300" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Badge Único (Lado Derecho): Logo del Crematorio Triple Más Grande SIN BORDE */}
                            <div className="absolute -bottom-2 -right-2 sm:-right-3 z-20 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white shadow-xl p-2 flex items-center justify-center overflow-hidden transition-transform hover:scale-105">
                                {data.tenant_logo ? (
                                    <img
                                        src={getImageUrl(data.tenant_logo) || ''}
                                        alt={data.tenant_name}
                                        className="w-full h-full object-contain rounded-full"
                                    />
                                ) : (
                                    <span className="text-teal-600 font-black text-2xl leading-none select-none">
                                        ∞
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Pet Identity & Heading */}
                        <div className="space-y-1.5 mt-2">
                            <p
                                className="font-outfit font-bold text-[11px] sm:text-xs tracking-[0.24em] uppercase flex items-center justify-center gap-1.5 transition-colors duration-300"
                                style={{
                                    color: visualColors.subtitle,
                                    textShadow: isDarkMode ? '0 1px 4px rgba(0,0,0,0.8)' : undefined,
                                }}
                            >
                                <span style={{ color: visualColors.accent }}>♥</span>
                                <span>ACOMPAÑANDO EL PROCESO</span>
                                <span style={{ color: visualColors.accent }}>♥</span>
                            </p>
                            <h1
                                className="font-dancing sm:font-alex text-5xl sm:text-6xl font-bold tracking-wide my-0.5 transition-colors duration-300 capitalize"
                                style={{
                                    color: visualColors.title,
                                    textShadow: isDarkMode ? '0 2px 12px rgba(251,191,36,0.28)' : undefined,
                                }}
                            >
                                {data.pet_name}
                            </h1>
                            <div
                                className="flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold transition-colors duration-300 opacity-90"
                                style={{
                                    color: visualColors.subtitle,
                                    textShadow: isDarkMode ? '0 1px 4px rgba(0,0,0,0.8)' : undefined,
                                }}
                            >
                                <span className="inline-flex items-center gap-1 capitalize">
                                    {data.pet_species === 'Felino' || data.pet_species === 'Gato' ? '♀ Felino' : '🐾 ' + (data.pet_species || 'Mascota')}
                                </span>
                                {data.customer_name && (
                                    <>
                                        <span className="opacity-50">·</span>
                                        <span className="inline-flex items-center gap-1.5 capitalize">
                                            <Heart size={13} className="shrink-0 fill-current opacity-80" />
                                            {data.customer_name}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-14 text-center"
                    >
                        <div className="relative inline-block mb-12 mt-6">
                            {/* Marco conmemorativo: resplandor, aro dorado degradado, halo perfectamente centrado y destellos */}
                            <div aria-hidden="true" className={`absolute -inset-10 rounded-full blur-2xl ${isDarkMode ? 'bg-amber-200/10' : 'bg-amber-100/80'}`} />

                            {/* Floating luminous Halo - Geometría elíptica perfecta centrada horizontalmente */}
                            <div className="absolute -top-7 sm:-top-8 left-0 right-0 flex justify-center z-20 pointer-events-none">
                                {/* Resplandor difuso ambiental detrás de la aureola */}
                                <div
                                    aria-hidden="true"
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-12 rounded-full bg-amber-300/35 blur-md pointer-events-none"
                                />
                                <svg
                                    viewBox="0 0 160 44"
                                    className="memorial-halo w-32 sm:w-36 h-auto overflow-visible relative"
                                    style={{
                                        filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.95)) drop-shadow(0 0 22px rgba(245, 158, 11, 0.7))'
                                    }}
                                >
                                    <defs>
                                        <linearGradient id="classic-halo-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#FEF08A" />
                                            <stop offset="20%" stopColor="#FBBF24" />
                                            <stop offset="50%" stopColor="#F59E0B" />
                                            <stop offset="80%" stopColor="#FBBF24" />
                                            <stop offset="100%" stopColor="#FEF08A" />
                                        </linearGradient>
                                    </defs>
                                    <ellipse
                                        cx="80"
                                        cy="22"
                                        rx="62"
                                        ry="14"
                                        fill="none"
                                        stroke="url(#classic-halo-grad)"
                                        strokeWidth="4.5"
                                    />
                                </svg>
                            </div>

                            {/* Aro exterior punteado/discontinuo con 8 estrellitas doradas (exacto a la referencia) */}
                            <div
                                aria-hidden="true"
                                className="absolute -inset-4 sm:-inset-5 rounded-full border border-dashed border-amber-300/70 pointer-events-none z-10"
                            >
                                <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-amber-400 text-xs select-none">✦</span>
                                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-amber-400 text-xs select-none">✦</span>
                                <span className="absolute top-1/2 -left-2 -translate-y-1/2 text-amber-400 text-xs select-none">✦</span>
                                <span className="absolute top-1/2 -right-2 -translate-y-1/2 text-amber-400 text-xs select-none">✦</span>
                                <span className="absolute top-[10%] left-[10%] text-amber-400/90 text-xs select-none">✦</span>
                                <span className="absolute top-[10%] right-[10%] text-amber-400/90 text-xs select-none">✦</span>
                                <span className="absolute bottom-[10%] left-[10%] text-amber-400/90 text-xs select-none">✦</span>
                                <span className="absolute bottom-[10%] right-[10%] text-amber-400/90 text-xs select-none">✦</span>
                            </div>

                            {/* Alas de ángel decorativas laterales */}
                            <AngelWings className={`absolute top-1/2 -translate-y-1/2 -left-20 sm:-left-24 w-20 h-20 -scale-x-100 hidden sm:block pointer-events-none ${isDarkMode ? 'text-amber-100/40' : 'text-amber-500/50'}`} />
                            <AngelWings className={`absolute top-1/2 -translate-y-1/2 -right-20 sm:-right-24 w-20 h-20 hidden sm:block pointer-events-none ${isDarkMode ? 'text-amber-100/40' : 'text-amber-500/50'}`} />

                            {/* Main Hero: Pet Photo - Marco Relicario con Degradado Dorado Continuo */}
                            <div
                                className="w-44 h-44 sm:w-48 sm:h-48 mx-auto rounded-full p-[6px] sm:p-[7px] relative z-10 shadow-[0_12px_32px_rgba(217,119,6,0.35)]"
                                style={{
                                    background: 'linear-gradient(180deg, #FDE68A 0%, #FBBF24 20%, #F59E0B 50%, #D97706 80%, #B45309 100%)',
                                }}
                            >
                                <div className="w-full h-full rounded-full ring-[3px] ring-white overflow-hidden relative bg-white group flex items-center justify-center">
                                    {petPhotos.length > 0 ? (
                                        <AnimatePresence initial={false}>
                                            <motion.img
                                                key={petPhotos[photoIdx % petPhotos.length]}
                                                src={getImageUrl(petPhotos[photoIdx % petPhotos.length]) || ''}
                                                alt={data.pet_name}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 1.2 }}
                                                className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105 duration-700"
                                            />
                                        </AnimatePresence>
                                    ) : (
                                        <div className="w-full h-full bg-amber-50 flex items-center justify-center">
                                            <PawPrint size={56} className="text-amber-300" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Puntos para elegir la foto (solo con 2 o más) */}
                            {petPhotos.length > 1 && (
                                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                                    {petPhotos.map((_, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setPhotoIdx(i)}
                                            aria-label={`Ver foto ${i + 1} de ${data.pet_name}`}
                                            className={`h-1.5 rounded-full transition-all duration-500 ${i === photoIdx % petPhotos.length
                                                ? `w-4 ${isDarkMode ? 'bg-white/70' : 'bg-gray-500'}`
                                                : `w-1.5 ${isDarkMode ? 'bg-white/25' : 'bg-gray-300'}`}`}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Badge: Logo del Crematorio Blanco Limpio SIN BORDE con Sombra */}
                            <div className="absolute -bottom-2 -right-2 sm:-right-3 z-20 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white shadow-xl p-2 flex items-center justify-center overflow-hidden transition-transform hover:scale-105">
                                {data.tenant_logo ? (
                                    <img
                                        src={getImageUrl(data.tenant_logo) || ''}
                                        alt={data.tenant_name}
                                        className="w-full h-full object-contain rounded-full"
                                    />
                                ) : (
                                    <span className="text-teal-600 font-black text-2xl leading-none select-none">
                                        ∞
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                {isUltraDelivered ? (
                                    <>
                                        <Sparkles size={14} className="text-amber-500 animate-pulse" />
                                        <p className="font-outfit font-bold text-[11px] tracking-[0.22em] uppercase text-amber-600 dark:text-amber-400">
                                            Servicio Finalizado · Homenaje Eterno
                                        </p>
                                        <Sparkles size={14} className="text-amber-500 animate-pulse" />
                                    </>
                                ) : (
                                    <>
                                        <Heart size={14} fill="currentColor" className="text-sky-500" />
                                        <p className="font-outfit font-bold text-[11px] tracking-[0.22em] uppercase text-sky-600 dark:text-sky-400">
                                            {isDelivered ? 'Servicio Finalizado' : 'Acompañando el proceso'}
                                        </p>
                                        <Heart size={14} fill="currentColor" className="text-sky-500" />
                                    </>
                                )}
                            </div>
                            <div className="flex items-center justify-center gap-3">
                                <AngelWings className="w-6 h-6 text-sky-500/30 -scale-x-100" />
                                <h1 className={`text-2xl sm:text-3xl font-outfit font-extrabold tracking-tight transition-colors duration-500 ${theme.title}`}>{data.pet_name}</h1>
                                <AngelWings className="w-6 h-6 text-sky-500/30" />
                            </div>
                            <div className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm font-outfit font-medium pt-1 transition-colors duration-500 ${theme.subtitle}`}>
                                <span className="inline-flex items-center gap-1.5 capitalize">
                                    <PawPrint size={16} className="text-sky-500/50" />
                                    {data.pet_species || data.pet_breed
                                        ? `${data.pet_species || ''}${data.pet_species && data.pet_breed ? ' - ' : ''}${data.pet_breed || ''}`
                                        : 'En Camino al Paraíso'}
                                </span>
                                {data.pet_weight != null && (
                                    <>
                                        <span className="text-sky-500/30">·</span>
                                        <span className="inline-flex items-center gap-1.5">
                                            <Scale size={16} className="text-sky-500/50" />
                                            {data.pet_weight} kg
                                        </span>
                                    </>
                                )}
                                {data.customer_name && (
                                    <>
                                        <span className="text-sky-500/30">·</span>
                                        <span className="inline-flex items-center gap-1.5 capitalize">
                                            <User size={16} className="text-sky-500/50" />
                                            {data.customer_name}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {isVisualTemplate ? (
                    <div className="w-full max-w-md lg:max-w-2xl xl:max-w-3xl mx-auto space-y-4">
                        {/* Selector de Pestañas Seguimiento / Homenaje (Móvil y Desktop - Posicionado ARRIBA del Seguimiento) */}
                        <div className="flex items-center justify-center gap-3 pt-1 pb-2">
                            <button
                                type="button"
                                onClick={() => setMobileTab('tracking')}
                                className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                                    mobileTab === 'tracking'
                                        ? 'text-white scale-[1.03] ring-2 ring-white/30'
                                        : isDarkMode
                                            ? 'bg-[#1e1610]/90 border hover:bg-[#2a1f17]'
                                            : 'bg-white/85 border hover:bg-white'
                                }`}
                                style={
                                    mobileTab === 'tracking'
                                        ? {
                                              backgroundColor: visualColors.accent,
                                              boxShadow: `0 8px 20px -4px ${visualColors.accent}66`,
                                          }
                                        : {
                                              color: isDarkMode ? visualColors.subtitle : visualColors.title,
                                              borderColor: `${visualColors.accent}55`,
                                          }
                                }
                            >
                                <PawPrint size={15} />
                                <span>SEGUIMIENTO</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMobileTab('tribute')}
                                className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                                    mobileTab === 'tribute'
                                        ? 'text-white scale-[1.03] ring-2 ring-white/30'
                                        : isDarkMode
                                            ? 'bg-[#1e1610]/90 border hover:bg-[#2a1f17]'
                                            : 'bg-white/85 border hover:bg-white'
                                }`}
                                style={
                                    mobileTab === 'tribute'
                                        ? {
                                              backgroundColor: visualColors.accent,
                                              boxShadow: `0 8px 20px -4px ${visualColors.accent}66`,
                                          }
                                        : {
                                              color: isDarkMode ? visualColors.subtitle : visualColors.title,
                                              borderColor: `${visualColors.accent}55`,
                                          }
                                }
                            >
                                <Heart size={15} />
                                <span>HOMENAJE</span>
                            </button>
                        </div>

                        {/* Main Glassmorphic Card Container */}
                        <div className={`backdrop-blur-md rounded-[2.25rem] p-4 sm:p-6 shadow-2xl transition-colors duration-300 ${
                            isDarkMode
                                ? 'bg-[#140e0a]/90 border border-amber-500/25 shadow-[0_20px_50px_rgba(0,0,0,0.6)]'
                                : 'bg-white/85 border border-amber-200/60 shadow-[0_20px_50px_rgba(217,119,6,0.12)]'
                        }`}>
                            {mobileTab === 'tracking' ? (
                                <>
                                    {/* Timeline with vertical gold line and pill steps */}
                                    <div className="relative pl-6 space-y-3">
                                        {/* Golden vertical line */}
                                        <div className={`absolute left-2.5 top-3 bottom-3 w-0.5 rounded-full ${
                                            isDarkMode ? 'bg-amber-500/60' : 'bg-amber-300/70'
                                        }`} />

                                        {timeline.map((event: any, idx: number) => {
                                            const isCompleted = event.status === 'completed';
                                            const isCurrent = event.status === 'current';
                                            const hasPhoto = Boolean(event.evidence?.photo_url);
                                            const hasComments = Boolean(
                                                event.evidence && (
                                                    (Array.isArray(event.evidence.comments) && event.evidence.comments.some((c: any) => typeof c === 'string' && c.trim().length > 0)) ||
                                                    (typeof event.evidence.comments === 'string' && event.evidence.comments.trim().length > 0)
                                                )
                                            );
                                            const hasEvidence = Boolean(event.evidence && (hasPhoto || hasComments));

                                            return (
                                                <div key={idx} className="relative">
                                                    {/* Golden Node on the line */}
                                                    <div
                                                        className={`absolute -left-6 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                                            isCompleted
                                                                ? 'text-white shadow-xs'
                                                                : isCurrent
                                                                    ? 'bg-white ring-4 ring-amber-400/25 animate-pulse'
                                                                    : isDarkMode
                                                                        ? 'border-amber-700 bg-[#140e0a]'
                                                                        : 'border-amber-200 bg-white'
                                                        }`}
                                                        style={
                                                            isCompleted
                                                                ? { borderColor: visualColors.accent, backgroundColor: visualColors.accent }
                                                                : isCurrent
                                                                    ? { borderColor: visualColors.accent }
                                                                    : undefined
                                                        }
                                                    >
                                                        <div
                                                            className={`w-2 h-2 rounded-full ${
                                                                isCompleted ? 'bg-white' : isCurrent ? '' : 'bg-transparent'
                                                            }`}
                                                            style={isCurrent ? { backgroundColor: visualColors.accent } : undefined}
                                                        />
                                                    </div>

                                                    {/* Pill Step Card */}
                                                    <div
                                                        className={`rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 transition-all ${
                                                            isCurrent
                                                                ? isDarkMode
                                                                    ? 'bg-[#261a12] border-2 shadow-lg ring-2 ring-amber-400/20'
                                                                    : 'bg-white border-2 shadow-md ring-2 ring-amber-400/15'
                                                                : isDarkMode
                                                                    ? 'bg-[#1b120c]/90 border border-amber-900/50 shadow-xs'
                                                                    : 'bg-white/95 border border-amber-100/90 shadow-xs'
                                                        }`}
                                                        style={isCurrent ? { borderColor: visualColors.accent } : undefined}
                                                    >
                                                        {/* Icon */}
                                                        <div
                                                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${
                                                                isCompleted
                                                                    ? isDarkMode
                                                                        ? 'bg-amber-950/70 text-amber-300 border border-amber-800/40'
                                                                        : 'bg-amber-100/80 text-amber-700'
                                                                    : isCurrent
                                                                        ? 'text-white shadow-xs'
                                                                        : isDarkMode
                                                                            ? 'bg-amber-950/40 text-amber-400/70'
                                                                            : 'bg-amber-50/70 text-amber-600/70'
                                                            }`}
                                                            style={isCurrent ? { backgroundColor: visualColors.accent } : undefined}
                                                        >
                                                            {getCelestialStepIcon(idx)}
                                                        </div>

                                                        {/* Text */}
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className={`text-xs sm:text-sm font-bold truncate ${
                                                                isCurrent
                                                                    ? isDarkMode ? 'text-amber-200 font-extrabold' : 'text-amber-950 font-extrabold'
                                                                    : isDarkMode ? 'text-amber-100 font-bold' : 'text-slate-800 font-bold'
                                                            }`}>
                                                                {event.step_name}
                                                            </h3>
                                                            <p className={`text-[11px] italic truncate ${
                                                                isDarkMode ? 'text-amber-300/75' : 'text-amber-800/70'
                                                            }`}>
                                                                {isCompleted && event.completed_at
                                                                    ? `${fmtDate(event.completed_at)} · ${fmtTime(event.completed_at)} hrs`
                                                                    : isCurrent
                                                                        ? 'En curso'
                                                                        : 'Pendiente'}
                                                            </p>
                                                        </div>

                                                        {/* Right Actions: Evidence Button + Status Badge */}
                                                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                                                            {hasEvidence && (
                                                                <motion.button
                                                                    type="button"
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    onClick={() => setSelectedEvidence(event.evidence)}
                                                                    className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer shadow-xs ${
                                                                        isDarkMode
                                                                            ? 'bg-amber-400/15 hover:bg-amber-400/25 text-amber-200 border border-amber-400/40'
                                                                            : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 border border-amber-300/80'
                                                                    }`}
                                                                    title={hasPhoto ? 'Ver fotografías y notas de esta etapa' : 'Ver comentarios y notas de esta etapa'}
                                                                >
                                                                    {hasPhoto ? (
                                                                        <Camera size={13} className={isDarkMode ? 'text-amber-300 shrink-0' : 'text-amber-700 shrink-0'} />
                                                                    ) : (
                                                                        <FileText size={13} className={isDarkMode ? 'text-amber-300 shrink-0' : 'text-amber-700 shrink-0'} />
                                                                    )}
                                                                    <span>{hasPhoto && hasComments ? 'Ver evidencia' : hasPhoto ? 'Ver fotos' : 'Ver nota'}</span>
                                                                </motion.button>
                                                            )}
                                                            <span
                                                                className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                                                                    isCompleted
                                                                        ? 'bg-teal-600 text-white shadow-xs'
                                                                        : isCurrent
                                                                            ? 'text-white shadow-xs animate-pulse'
                                                                            : isDarkMode
                                                                                ? 'bg-amber-950/70 text-amber-300 border border-amber-800/50'
                                                                                : 'bg-amber-100/80 text-amber-800 border border-amber-200/60'
                                                                }`}
                                                                style={isCurrent ? { backgroundColor: visualColors.accent } : undefined}
                                                            >
                                                                {isCompleted ? 'Completado' : isCurrent ? 'En proceso' : 'Pendiente'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Current Status & Progress Card at bottom of container */}
                                    <div className={`rounded-2xl p-3.5 border flex items-center justify-between gap-3 mt-4 transition-colors duration-300 ${
                                        isDarkMode
                                            ? 'bg-[#1b120c]/85 border-amber-800/40'
                                            : 'bg-amber-50/70 border-amber-200/50'
                                    }`}>
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border"
                                                style={{
                                                    backgroundColor: isDarkMode ? `${visualColors.accent}26` : `${visualColors.accent}18`,
                                                    color: visualColors.accent,
                                                    borderColor: `${visualColors.accent}40`,
                                                }}
                                            >
                                                <PawPrint size={15} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-[9px] font-black uppercase tracking-wider ${
                                                    isDarkMode ? 'text-amber-300/70' : 'text-amber-900/60'
                                                }`}>
                                                    ESTADO ACTUAL
                                                </p>
                                                <p
                                                    className="text-xs font-black truncate"
                                                    style={{ color: isDarkMode ? visualColors.subtitle : visualColors.accent }}
                                                >
                                                    {currentStepName}
                                                </p>
                                                <p className={`text-[10px] ${
                                                    isDarkMode ? 'text-amber-200/70' : 'text-amber-900/70'
                                                }`}>
                                                    El proceso se encuentra en marcha.
                                                </p>
                                            </div>
                                        </div>

                                        <div className={`w-px h-9 shrink-0 ${
                                            isDarkMode ? 'bg-amber-800/50' : 'bg-amber-200/60'
                                        }`} />

                                        <div className="text-right shrink-0">
                                            <div className="flex items-center justify-end gap-1.5 mb-1">
                                                <span className={`text-[9px] font-black uppercase tracking-wider ${
                                                    isDarkMode ? 'text-amber-300/70' : 'text-amber-900/60'
                                                }`}>
                                                    PROGRESO
                                                </span>
                                                <span className={`text-xs font-black ${
                                                    isDarkMode ? 'text-amber-100' : 'text-amber-950'
                                                }`}>
                                                    {progressPercentage}%
                                                </span>
                                            </div>
                                            <div className={`h-1.5 w-24 rounded-full overflow-hidden ${
                                                isDarkMode ? 'bg-neutral-800' : 'bg-amber-200/60'
                                            }`}>
                                                <div
                                                    className="h-full transition-all duration-700"
                                                    style={{ width: `${progressPercentage}%`, backgroundColor: visualColors.accent }}
                                                />
                                            </div>
                                            <p className={`text-[10px] mt-0.5 ${
                                                isDarkMode ? 'text-amber-200/70' : 'text-amber-900/70'
                                            }`}>
                                                {completedCount} de {totalSteps} etapas
                                            </p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* Tribute / Recuerdo tab (Visible en Móvil y Desktop al seleccionar RECUERDO) */
                                <div className="space-y-5">
                                    {(farewellConfig || data.ai_design) ? (
                                        <PublicTributeCarousel
                                            farewellConfig={farewellConfig}
                                            aiDesign={data.ai_design}
                                            petName={data.pet_name}
                                            isDarkMode={isDarkMode}
                                            variant="central"
                                            cardExportRef={cardExportRef}
                                            isDownloadingCard={isDownloadingCard}
                                            onDownloadCard={handleDownloadCard}
                                            copiedLink={copiedLink}
                                            onShare={handleShare}
                                        />
                                    ) : (
                                        <div className={`text-center py-10 px-4 rounded-2xl border transition-colors ${
                                            isDarkMode
                                                ? 'bg-[#1b120c]/80 border-amber-800/40'
                                                : 'bg-amber-50/60 border-amber-200/50'
                                        }`}>
                                            <Heart size={40} className="mx-auto text-amber-400 mb-3" />
                                            <h4 className={`font-bold text-base ${isDarkMode ? 'text-amber-200' : 'text-amber-900'}`}>
                                                En Memoria de {data.pet_name}
                                            </h4>
                                            <p className={`text-xs mt-1 max-w-sm mx-auto ${isDarkMode ? 'text-amber-300/80' : 'text-amber-800/80'}`}>
                                                Su recuerdo vivirá por siempre en nuestros corazones y en cada huella compartida.
                                            </p>
                                        </div>
                                    )}

                                    {data.pet_dedication && (
                                        <div className={`p-4 sm:p-5 rounded-2xl border shadow-xs transition-colors ${
                                            isDarkMode
                                                ? 'bg-[#1b120c]/90 border-amber-800/40 text-amber-100'
                                                : 'bg-amber-50/70 border-amber-200/60 text-amber-950'
                                        }`}>
                                            <div className="flex items-start gap-3">
                                                <span className="text-2xl text-amber-400 font-serif leading-none select-none">“</span>
                                                <div className="flex-1">
                                                    <p className={`text-xs sm:text-sm italic leading-relaxed ${
                                                        isDarkMode ? 'text-amber-100' : 'text-amber-950'
                                                    }`}>
                                                        {data.pet_dedication}
                                                    </p>
                                                    <p className={`text-[10px] font-bold uppercase tracking-wider mt-2 ${
                                                        isDarkMode ? 'text-amber-300' : 'text-amber-700'
                                                    }`}>
                                                        — Dedicatoria familiar en memoria de {data.pet_name}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Commemorative Footer Quote */}
                        <p className={`font-dancing italic text-lg sm:text-xl text-center pt-2 transition-colors duration-300 ${
                            isDarkMode ? 'text-amber-200 drop-shadow-[0_1px_8px_rgba(251,191,36,0.35)]' : 'text-amber-900/80'
                        }`}>
                            — Siempre en nuestros corazones —
                        </p>
                    </div>
                ) : isUltraDelivered ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="max-w-2xl mx-auto space-y-7"
                    >
                        {/* 1. Carrusel de Homenaje Conmemorativo + Recuerdo Especial */}
                        {(farewellConfig || data.ai_design) && (
                            <PublicTributeCarousel
                                farewellConfig={farewellConfig}
                                aiDesign={data.ai_design}
                                petName={data.pet_name}
                                isDarkMode={isDarkMode}
                                variant="central"
                                cardExportRef={cardExportRef}
                                isDownloadingCard={isDownloadingCard}
                                onDownloadCard={handleDownloadCard}
                                copiedLink={copiedLink}
                                onShare={handleShare}
                            />
                        )}

                        {/* 2. Dedicatoria Familiar Destacada (si existe) */}
                        {data.pet_dedication && (
                            <div className={`p-6 sm:p-7 rounded-[2rem] border backdrop-blur-md relative overflow-hidden transition-all ${
                                isDarkMode 
                                    ? 'bg-[#0f1a35]/60 border-white/10' 
                                    : 'bg-white/90 border-sky-100/80 shadow-md shadow-sky-500/5'
                            }`}>
                                <div className="flex items-start gap-4">
                                    <span className="text-4xl text-amber-500/40 font-serif leading-none select-none">“</span>
                                    <div className="flex-1">
                                        <p className={`text-sm sm:text-base italic leading-relaxed ${isDarkMode ? 'text-neutral-200' : 'text-gray-700'}`}>
                                            {data.pet_dedication}
                                        </p>
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mt-2.5">
                                            — Dedicatoria familiar en memoria de {data.pet_name}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. Acordeón Colapsable de Constancia de Custodia y Trazabilidad */}
                        <div className={`rounded-[2.5rem] border backdrop-blur-md transition-all overflow-hidden ${
                            isDarkMode ? 'bg-[#0f1a35]/60 border-white/10' : 'bg-white/90 border-sky-100/80 shadow-md shadow-sky-500/5'
                        }`}>
                            {/* Header del Acordeón Clickeable */}
                            <button
                                type="button"
                                onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
                                className="w-full p-6 sm:p-7 flex items-center justify-between gap-4 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 shrink-0">
                                        <ShieldCheck size={24} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className={`text-base font-black tracking-tight truncate ${theme.title}`}>
                                                Constancia de Custodia y Trazabilidad
                                            </h3>
                                            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-bold uppercase tracking-wider">
                                                100% Verificado
                                            </span>
                                        </div>
                                        <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
                                            {timeline.length} etapas registradas con respaldo de custodia
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs font-bold text-sky-600 dark:text-sky-400 hidden sm:inline">
                                        {isTimelineExpanded ? 'Ocultar' : 'Ver detalle'}
                                    </span>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${
                                        isDarkMode ? 'bg-neutral-800 text-neutral-300' : 'bg-gray-100 text-gray-600'
                                    } ${isTimelineExpanded ? 'rotate-180' : ''}`}>
                                        <ChevronDown size={18} />
                                    </div>
                                </div>
                            </button>

                            {/* Contenido Desplegable */}
                            <AnimatePresence initial={false}>
                                {isTimelineExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.35, ease: 'easeInOut' }}
                                        className="overflow-hidden border-t border-gray-100 dark:border-white/10"
                                    >
                                        <div className="p-6 sm:p-7 space-y-4">
                                            <p className={`text-xs font-medium ${isDarkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
                                                Registro cronológico de cada fase del servicio de cremación completado para {data.pet_name}:
                                            </p>

                                            <div className="space-y-3 pt-1">
                                                {timeline.map((event: any, idx: number) => {
                                                    const hasEvidence = event.evidence && (
                                                        event.evidence.photo_url || 
                                                        (Array.isArray(event.evidence.comments) && event.evidence.comments.some((c: string) => c.trim())) || 
                                                        (typeof event.evidence.comments === 'string' && event.evidence.comments.trim())
                                                    );

                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                                                                isDarkMode 
                                                                    ? 'bg-[#0a1226]/50 border-white/10/80 hover:border-neutral-700' 
                                                                    : 'bg-gray-50/80 border-gray-100 hover:border-sky-200'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-3.5 min-w-0">
                                                                <div className="w-9 h-9 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                                                                    {getStepIcon(idx)}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <h4 className={`text-xs sm:text-sm font-bold truncate ${isDarkMode ? 'text-neutral-200' : 'text-gray-800'}`}>
                                                                            {event.step_name}
                                                                        </h4>
                                                                        <CheckCircle2 size={13} className="text-sky-500 shrink-0" />
                                                                    </div>
                                                                    <p className={`text-[11px] ${isDarkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
                                                                        {event.completed_at ? (
                                                                            <>
                                                                                {fmtDate(event.completed_at)} · {fmtTime(event.completed_at)} hrs
                                                                            </>
                                                                        ) : (
                                                                            'Etapa completada'
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {hasEvidence && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSelectedEvidence(event.evidence)}
                                                                    className="p-2.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition-all shrink-0 cursor-pointer"
                                                                    title="Ver registro visual"
                                                                >
                                                                    <Camera size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* 4. Ficha de Certificación Digital */}
                        <div className={`p-6 sm:p-7 rounded-[2.5rem] border backdrop-blur-md transition-all ${
                            isDarkMode ? 'bg-[#0f1a35]/60 border-white/10' : 'bg-white/90 border-sky-100/80 shadow-md shadow-sky-500/5'
                        }`}>
                            <div className="flex items-center gap-3 mb-4">
                                <Building2 size={20} className="text-sky-500 shrink-0" />
                                <h4 className={`text-sm font-black uppercase tracking-wider ${theme.title}`}>
                                    Certificación de Custodia y Entrega
                                </h4>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                                <div className={`p-3.5 rounded-2xl border ${isDarkMode ? 'bg-[#0a1226]/40 border-white/10' : 'bg-gray-50/80 border-gray-100'}`}>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">
                                        Código de Validación
                                    </span>
                                    <span className="text-xs font-mono font-black text-sky-600 dark:text-sky-400">
                                        {/* Código corto (el mismo del panel); el token largo solo si aún no hay orden */}
                                        {data?.verification_code || token}
                                    </span>
                                </div>

                                <div className={`p-3.5 rounded-2xl border ${isDarkMode ? 'bg-[#0a1226]/40 border-white/10' : 'bg-gray-50/80 border-gray-100'}`}>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">
                                        Crematorio Oficial
                                    </span>
                                    <span className={`text-xs font-bold truncate block ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                        {data.tenant_name}
                                    </span>
                                </div>

                                <div className={`p-3.5 rounded-2xl border ${isDarkMode ? 'bg-[#0a1226]/40 border-white/10' : 'bg-gray-50/80 border-gray-100'}`}>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">
                                        Estado del Servicio
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400">
                                        <CheckCircle2 size={13} />
                                        Entregado
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 5. Mensaje de Cierre y Agradecimiento */}
                        <div className={`p-6 sm:p-7 rounded-[2.5rem] border backdrop-blur-md text-center transition-all ${
                            isDarkMode ? 'bg-[#0f1a35]/60 border-white/10' : 'bg-white/90 border-sky-100/80 shadow-md shadow-sky-500/5'
                        }`}>
                            <Heart size={22} className="text-sky-500 mx-auto mb-3 animate-pulse" fill="currentColor" />
                            <h4 className={`text-sm sm:text-base font-bold mb-1.5 ${theme.title}`}>
                                Gracias por confiar en {data.tenant_name}
                            </h4>
                            <p className={`text-xs leading-relaxed max-w-md mx-auto ${isDarkMode ? 'text-neutral-400' : 'text-gray-600'}`}>
                                Nos sentimos profundamente agradecidos de haber acompañado a {data.pet_name} y a su familia en este digno y respetuoso viaje. Su amor incondicional vivirá por siempre en sus corazones.
                            </p>
                        </div>
                    </motion.div>
                ) : (
                    <>
                        {/* Selector de Pestañas en Móvil */}
                        {(farewellConfig || data.ai_design) && (
                            <div className="lg:hidden flex p-1 rounded-2xl bg-black/5 dark:bg-[#0f1a35]/80 border border-sky-500/20 backdrop-blur-md mb-6 shadow-sm sticky top-4 z-20">
                                <button
                                    type="button"
                                    onClick={() => setMobileTab('tracking')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        mobileTab === 'tracking'
                                            ? 'bg-white dark:bg-neutral-800 text-sky-700 dark:text-sky-400 shadow-md scale-[1.01]'
                                            : 'text-gray-500 dark:text-neutral-400 hover:text-gray-900'
                                    }`}
                                >
                                    <PawPrint size={15} />
                                    <span>Seguimiento</span>
                                    <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold">
                                        {progressPercentage}%
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMobileTab('tribute')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        mobileTab === 'tribute'
                                            ? 'bg-white dark:bg-neutral-800 text-orange-600 dark:text-orange-300 shadow-md scale-[1.01]'
                                            : 'text-gray-500 dark:text-neutral-400 hover:text-gray-900'
                                    }`}
                                >
                                    <Sparkles size={15} className="text-orange-400" />
                                    <span>Homenaje</span>
                                </button>
                            </div>
                        )}

                        {/* Banner compacto de estado para móvil cuando está en pestaña de Seguimiento */}
                        <div className={`lg:hidden mb-6 p-4 rounded-2xl border backdrop-blur-md ${
                            isDarkMode ? 'bg-[#0f1a35]/60 border-white/10' : 'bg-white/90 border-sky-100/80 shadow-md shadow-sky-500/5'
                        } ${mobileTab === 'tracking' ? 'block' : 'hidden'}`}>
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse shrink-0" />
                                    <h4 className="text-xs font-black text-sky-600 dark:text-sky-400 truncate">
                                        {currentStepName}
                                    </h4>
                                </div>
                                <span className="text-xs font-black text-sky-600 dark:text-sky-400 shrink-0">
                                    {progressPercentage}%
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="flex gap-1 my-2">
                                {Array.from({ length: totalSteps || 5 }).map((_, idx) => {
                                    const isStepCompleted = idx < completedCount;
                                    const isStepCurrent = idx === completedCount;
                                    return (
                                        <div 
                                            key={idx} 
                                            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                                                isStepCompleted 
                                                    ? 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.4)]' 
                                                    : isStepCurrent 
                                                        ? 'bg-gradient-to-r from-orange-500 to-amber-400 shadow-[0_0_10px_rgba(249,115,22,0.6)] animate-pulse'
                                                        : (isDarkMode ? 'bg-neutral-800' : 'bg-gray-200')
                                            }`} 
                                        />
                                    );
                                })}
                            </div>
                            <p className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                {completedCount} de {totalSteps} etapas completadas
                            </p>
                        </div>

                        {/* Layout Principal Grid 2 Columnas */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            
                            {/* Panel Izquierdo: Tarjetas Informativas en Desktop / Vista Homenaje en Móvil */}
                            <div className={`lg:col-span-4 space-y-4 lg:sticky lg:top-24 ${
                                mobileTab === 'tribute' ? 'block' : 'hidden lg:block'
                            }`}>
                                {/* Tarjeta 1: Estado Actual (Desktop) */}
                                <div className={`hidden lg:block p-6 rounded-[2rem] border backdrop-blur-md transition-all duration-300 ${
                                    isDarkMode ? 'bg-[#0f1a35]/60 border-white/10' : 'bg-white/90 border-sky-100/80 shadow-md shadow-sky-500/5'
                                }`}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-600 shrink-0">
                                            <PawPrint size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] block ${
                                                isDarkMode ? 'text-slate-500' : 'text-gray-400'
                                            }`}>Estado actual</span>
                                            <h4 className="text-sm font-extrabold text-sky-600 dark:text-sky-400 truncate leading-tight">{currentStepName}</h4>
                                        </div>
                                    </div>
                                    <p className={`text-xs leading-relaxed mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                                        {currentEvent?.status === 'current' 
                                            ? `Tu mascota se encuentra actualmente en esta etapa.` 
                                            : `El proceso se encuentra en marcha.`}
                                    </p>
                                </div>

                                {/* Tarjeta 2: Progreso del Proceso (Desktop) */}
                                <div className={`hidden lg:block p-6 rounded-[2rem] border backdrop-blur-md transition-all duration-300 ${
                                    isDarkMode ? 'bg-[#0f1a35]/60 border-white/10' : 'bg-white/90 border-sky-100/80 shadow-md shadow-sky-500/5'
                                }`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                                            isDarkMode ? 'text-slate-500' : 'text-gray-400'
                                        }`}>Progreso del proceso</span>
                                        <span className="text-lg font-black text-sky-600 dark:text-sky-400">{progressPercentage}%</span>
                                    </div>
                                    
                                    {/* Visual Progress Blocks */}
                                    <div className="flex gap-1.5 my-3">
                                        {Array.from({ length: totalSteps || 5 }).map((_, idx) => {
                                            const isStepCompleted = idx < completedCount;
                                            const isStepCurrent = idx === completedCount;
                                            return (
                                                <div 
                                                    key={idx} 
                                                    className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                                                        isStepCompleted 
                                                            ? 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.4)]' 
                                                            : isStepCurrent 
                                                                ? 'bg-gradient-to-r from-orange-500 to-amber-400 shadow-[0_0_10px_rgba(249,115,22,0.6)] animate-pulse'
                                                                : (isDarkMode ? 'bg-neutral-800' : 'bg-gray-200')
                                                    }`} 
                                                />
                                            );
                                        })}
                                    </div>
                                    
                                    <p className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                                        {completedCount} de {totalSteps} etapas completadas
                                    </p>
                                </div>

                                {/* Tarjeta 3: Última actualización (Desktop) */}
                                <div className={`hidden lg:block p-6 rounded-[2rem] border backdrop-blur-md transition-all duration-300 ${
                                    isDarkMode ? 'bg-[#0f1a35]/60 border-white/10' : 'bg-white/90 border-sky-100/80 shadow-md shadow-sky-500/5'
                                }`}>
                                    <span className={`text-[10px] font-bold uppercase tracking-[0.2em] block mb-2 ${
                                        isDarkMode ? 'text-slate-500' : 'text-gray-400'
                                    }`}>Última actualización</span>
                                    {lastUpdateDate ? (
                                        <div className="space-y-1">
                                            <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                                {fmtDate(lastUpdateDate)}
                                            </p>
                                            <p className="text-xs text-sky-600 dark:text-sky-400 font-bold">
                                                {fmtTime(lastUpdateDate)} hrs
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">No hay actualizaciones registradas aún.</p>
                                    )}
                                </div>

                                {/* Tarjeta 4: Carrusel de Homenaje Conmemorativo + Recuerdo Especial */}
                                {(farewellConfig || data.ai_design) && (
                                    <PublicTributeCarousel
                                        farewellConfig={farewellConfig}
                                        aiDesign={data.ai_design}
                                        petName={data.pet_name}
                                        isDarkMode={isDarkMode}
                                        variant="compact"
                                        cardExportRef={cardExportRef}
                                        isDownloadingCard={isDownloadingCard}
                                        onDownloadCard={handleDownloadCard}
                                    />
                                )}

                                {/* Tarjeta 5: Mensaje Emocional */}
                                <div className={`p-6 rounded-[2rem] border backdrop-blur-md transition-all duration-300 ${
                                    isDarkMode ? 'bg-[#0f1a35]/60 border-white/10' : 'bg-white/90 border-sky-100/80 shadow-md shadow-sky-500/5'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        <Heart size={18} className="text-sky-500 animate-pulse shrink-0" fill="currentColor" />
                                        <p className={`text-xs font-medium leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                                            Gracias por confiar en <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{data.tenant_name}</span>.
                                        </p>
                                    </div>
                                </div>

                            </div>

                            {/* Panel Derecho: Timeline (Visible en Desktop y en Móvil si la pestaña es Seguimiento) */}
                            <div className={`lg:col-span-8 ${
                                mobileTab === 'tracking' ? 'block' : 'hidden lg:block'
                            }`}>
                                <div className={`relative space-y-0 pl-8 sm:pl-10 border-l-4 ml-2 sm:ml-3 pb-12 transition-colors duration-500 ${theme.timelineLine}`}>
                                    {data.timeline.map((event: any, idx: number) => {
                                        const isCompleted = event.status === 'completed';
                                        const isCurrent = event.status === 'current';

                                        return (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 + (idx * 0.08) }}
                                                className={`relative pb-10 sm:pb-12 last:pb-0 ${isCurrent ? 'opacity-100' : isCompleted ? 'opacity-100' : 'opacity-40'}`}
                                            >
                                                {/* Tarjeta + indicador: el círculo se centra en la línea (mismo relleno pl-8/sm:pl-10
                                                    + mitad del borde de 4px + mitad del círculo w-7) y en el alto de la tarjeta. */}
                                                <div className="relative">
                                                {/* Indicator */}
                                                <div className={`absolute left-[calc(-2rem-2px-0.875rem)] sm:left-[calc(-2.5rem-2px-0.875rem)] top-1/2 -translate-y-1/2 w-7 h-7 rounded-full border-4 transition-all duration-700 z-10 flex items-center justify-center shadow-sm
                                                    ${isCompleted ? 'bg-sky-500 border-sky-500 text-white shadow-[0_0_12px_rgba(14,165,233,0.3)]' :
                                                        isCurrent ? `${isDarkMode ? 'border-orange-400 bg-orange-950/80 text-orange-300 shadow-[0_0_18px_rgba(249,115,22,0.7)]' : 'border-orange-500 bg-white text-orange-600 shadow-[0_0_12px_rgba(249,115,22,0.3)]'} scale-110` :
                                                            isDarkMode ? 'border-neutral-700 bg-[#0f1a35]/40 text-neutral-600' : 'border-gray-300 bg-gray-100 text-gray-400'}`}>
                                                    {isCompleted && <CheckCircle2 size={14} strokeWidth={4} className="text-white" />}
                                                    {isCurrent && <Heart size={11} fill="currentColor" className={`${isDarkMode ? 'text-orange-300' : 'text-orange-500'} animate-pulse shrink-0`} />}
                                                </div>

                                                <div className={`px-6 py-4 sm:px-9 sm:py-5 rounded-[2rem] border transition-all duration-500 ${
                                                    isCurrent
                                                        ? (isDarkMode ? 'bg-gradient-to-r from-orange-950/25 via-orange-900/15 to-[#0f1a35]/40 border-orange-500/90 shadow-[0_0_30px_rgba(249,115,22,0.28)] ring-1 ring-orange-400/40' : 'bg-gradient-to-r from-orange-50/80 to-amber-50/50 border-orange-300 shadow-[0_0_20px_rgba(249,115,22,0.18)]') + ' scale-[1.02] backdrop-blur-md'
                                                        : isCompleted
                                                            ? (isDarkMode ? 'bg-sky-950/10 border-sky-500/20' : 'bg-sky-50/20 border-sky-100') + ' shadow-sm'
                                                            : isDarkMode ? 'bg-[#0a1226]/20 border-white/5/60' : 'bg-gray-50/60 border-gray-200 shadow-sm'
                                                    }`}>
                                                    <div className="flex items-center gap-4 h-full">
                                                        {/* Circular Icon Container */}
                                                        <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center border transition-all duration-500 ${
                                                            isCompleted 
                                                                ? (isDarkMode ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' : 'bg-sky-50 border-sky-100 text-sky-600')
                                                                : isCurrent 
                                                                    ? (isDarkMode ? 'bg-orange-500/20 border-orange-400/50 text-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.35)]' : 'bg-orange-50 border-orange-200 text-orange-600')
                                                                    : (isDarkMode ? 'bg-[#0f1a35] border-white/10 text-neutral-500' : 'bg-gray-100 border-gray-200 text-gray-400')
                                                        }`}>
                                                            {getStepIcon(idx)}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            {/* Top Row: Title + Wings */}
                                                            <div className="flex items-center justify-between gap-4">
                                                                <h3 className={`font-semibold text-sm sm:text-base leading-snug transition-colors duration-500 ${
                                                                    isCurrent 
                                                                        ? (isDarkMode ? 'text-white' : 'text-amber-900') 
                                                                        : isCompleted 
                                                                            ? (isDarkMode ? 'text-slate-200' : 'text-sky-900') 
                                                                            : (isDarkMode ? 'text-slate-500' : 'text-gray-500')
                                                                }`}>
                                                                    {event.step_name}
                                                                </h3>

                                                                {/* Minimalist Angel Wing Evidence Icon */}
                                                                {event.evidence && (event.evidence.photo_url || (Array.isArray(event.evidence.comments) && event.evidence.comments.some((c: string) => c.trim())) || (typeof event.evidence.comments === 'string' && event.evidence.comments.trim())) && (
                                                                    <motion.button
                                                                        whileHover={{ y: -1 }}
                                                                        whileTap={{ scale: 0.95 }}
                                                                        onClick={() => setSelectedEvidence(event.evidence)}
                                                                        className={`inline-flex items-center gap-1.5 shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
                                                                            isDarkMode
                                                                                ? 'bg-sky-500/10 border-sky-500/30 text-sky-300 hover:bg-sky-500/20'
                                                                                : 'bg-white border-sky-200 text-sky-700 shadow-sm hover:bg-sky-50 hover:border-sky-300'
                                                                        }`}
                                                                        title={event.evidence.photo_url ? 'Ver fotos y notas de esta etapa' : 'Ver la nota de esta etapa'}
                                                                        aria-label={`${event.evidence.photo_url ? 'Ver fotos' : 'Ver nota'} de ${event.step_name}`}
                                                                    >
                                                                        {event.evidence.photo_url ? <Camera className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                                                        <span>{event.evidence.photo_url ? 'Ver fotos' : 'Ver nota'}</span>
                                                                    </motion.button>
                                                                )}
                                                            </div>

                                                            {/* Bottom Row: Timestamp and status badge */}
                                                            <div className="mt-2.5 flex items-center justify-between gap-3">
                                                                {event.completed_at ? (
                                                                    <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                                                        {fmtDate(event.completed_at)} · {fmtTime(event.completed_at)} hrs
                                                                    </span>
                                                                ) : isCompleted ? (
                                                                    <span className={`text-[10px] font-medium italic ${isDarkMode ? 'text-sky-400' : 'text-sky-600'}`}>Concluido</span>
                                                                ) : isCurrent ? (
                                                                    <span className={`text-[11px] font-bold ${isDarkMode ? 'text-orange-300' : 'text-orange-600'}`}>En curso</span>
                                                                ) : (
                                                                    <span className={`text-[10px] font-medium italic ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Pendiente</span>
                                                                )}

                                                                {isCompleted ? (
                                                                    <span className="px-2.5 py-0.5 bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 rounded-full text-[9px] font-bold uppercase tracking-wider">Completado</span>
                                                                ) : isCurrent ? (
                                                                    <span className={`px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all ${
                                                                        isDarkMode 
                                                                            ? 'bg-orange-500/25 border-orange-400/70 text-orange-200 shadow-[0_0_14px_rgba(249,115,22,0.4)]' 
                                                                            : 'bg-orange-100 border-orange-300 text-orange-800'
                                                                    } animate-pulse`}>En proceso</span>
                                                                ) : (
                                                                    <span className={`px-2.5 py-0.5 border rounded-full text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'bg-[#0f1a35] border-white/10 text-neutral-500' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>Pendiente</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Footer */}
                <div className="mt-20 text-center space-y-5">
                    {/* Invitación a reseña en Google: solo con el servicio concluido y el enlace
                        configurado por el crematorio. Tono suave: es un momento de duelo. */}
                    {surveyOn && (
                        <FeedbackSurvey
                            slug={slug} petName={pet_name} token={token} tenantName={data.tenant_name} isDark={isDarkMode}
                            initial={data.feedback ?? null}
                            onDone={(feedback) => setData((d: any) => ({ ...d, feedback }))}
                        />
                    )}

                    {/* Tiendita de recuerdos: catálogo de productos oficial (antes o después de la cremación) */}
                    {data.souvenir_store_url && (
                        <div id="recuerdos" className={`mx-auto max-w-md rounded-3xl border px-6 py-5 text-center transition-colors duration-500 ${isDarkMode ? 'bg-sky-400/[0.06] border-sky-300/20' : 'bg-white/80 border-sky-200 shadow-sm'}`}>
                            <p className={`text-sm font-semibold ${isDarkMode ? 'text-neutral-100' : 'text-gray-800'}`}>
                                Lleva a {data.pet_name || 'tu compañero'} siempre cerca
                            </p>
                            <p className={`mt-1 text-xs leading-relaxed ${isDarkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
                                Relicarios y recuerdos para honrar su memoria. Puedes pedirlos antes o después de la cremación.
                            </p>
                            <a
                                href={data.souvenir_store_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition-colors ${isDarkMode ? 'bg-sky-300 text-slate-900 hover:bg-sky-200' : 'bg-sky-600 text-white hover:bg-sky-700'}`}
                            >
                                <Gift size={14} /> Tiendita de recuerdos
                            </a>
                        </div>
                    )}

                    {showReview && (
                        <div id="encuesta" className={`mx-auto max-w-md rounded-3xl border px-6 py-5 text-center transition-colors duration-500 ${isDarkMode ? 'bg-white/[0.03] border-white/10' : 'bg-white/80 border-gray-200 shadow-sm'}`}>
                            <div className="flex justify-center gap-0.5 mb-2" aria-hidden="true">
                                {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={14} className="text-amber-400 fill-amber-400" />)}
                            </div>
                            <p className={`text-sm font-semibold ${isDarkMode ? 'text-neutral-100' : 'text-gray-800'}`}>
                                ¿Nos ayudas con tu opinión?
                            </p>
                            <p className={`mt-1 text-xs leading-relaxed ${isDarkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
                                Si nuestro acompañamiento te fue de ayuda, tu opinión puede orientar a otras familias en un momento difícil.
                            </p>
                            <a
                                href={reviewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition-colors ${isDarkMode ? 'bg-white text-neutral-900 hover:bg-neutral-200' : 'bg-gray-900 text-white hover:bg-gray-700'}`}
                            >
                                <Star size={13} /> Dejar reseña en Google
                            </a>
                        </div>
                    )}

                    <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full border shadow-sm transition-colors duration-500 ${
                        isDarkMode
                            ? 'bg-[#16120e]/90 border-amber-400/40 text-amber-300 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.6)]'
                            : 'bg-white/95 border-amber-300/80 text-amber-950 backdrop-blur-md shadow-xs'
                    }`}>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        <span className="font-outfit text-[11px] font-black uppercase tracking-[0.2em]">
                            {isUltraDelivered ? 'Homenaje y Custodia' : 'Seguimiento en Vivo'}
                        </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <p className={`font-outfit text-xs uppercase font-extrabold tracking-[0.24em] transition-colors duration-500 ${
                            isDarkMode 
                                ? 'text-amber-100/95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]' 
                                : 'text-amber-950/85 drop-shadow-xs'
                        }`}>
                            © {new Date().getFullYear()} {data.tenant_name}
                        </p>
                        {/* Marca Vinzer: solo en planes sin marca blanca (por defecto FREE). */}
                        {data.show_vinzer_brand !== false && (
                            <a href={vinzerPromoUrl('seguimiento')} target="_blank" rel="noopener noreferrer"
                                className={`mt-0.5 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-[11px] font-outfit font-medium transition-all duration-300 ${
                                    isDarkMode 
                                        ? 'border-white/20 bg-[#0f1a35]/80 text-slate-200 hover:text-white hover:border-amber-400/60 shadow-md' 
                                        : 'border-slate-300 bg-white/90 text-slate-700 hover:text-slate-900 hover:border-amber-400/60 shadow-xs'
                                }`}>
                                <span>Seguimiento creado con</span>
                                <span className="font-black text-amber-600 dark:text-amber-400 tracking-wide">Vinzer</span>
                                <span className="opacity-80">· software para crematorios</span>
                            </a>
                        )}
                    </div>

                    {/* Firma Vinzer: sutil y con alto contraste en ambos modos (sin celeste) */}
                    <div className="mt-6 flex flex-col items-center gap-3">
                        <div className={`h-px w-28 bg-gradient-to-r from-transparent ${
                            isDarkMode ? 'via-amber-200/40' : 'via-amber-900/30'
                        } to-transparent`} />
                        <a
                            href={vinzerPromoUrl('seguimiento')}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Con tecnología de Vinzer, software para crematorios"
                            className="group inline-flex items-center gap-2 transition-all duration-300 py-1"
                        >
                            <span className={`font-outfit text-[11px] uppercase tracking-[0.26em] font-bold transition-colors duration-300 ${
                                isDarkMode 
                                    ? 'text-amber-100/90 group-hover:text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]' 
                                    : 'text-amber-950/80 group-hover:text-amber-950 drop-shadow-xs'
                            }`}>
                                Con tecnología de
                            </span>
                            <span className={`font-outfit text-[14px] font-black tracking-wide transition-colors inline-flex items-center ${
                                isDarkMode
                                    ? 'text-amber-400 group-hover:text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                                    : 'text-amber-700 group-hover:text-amber-800 drop-shadow-xs'
                            }`}>
                                Vinzer<span className={isDarkMode ? 'text-amber-400' : 'text-amber-700'}>.</span>
                            </span>
                        </a>
                    </div>
                </div>

            </div>

            {/* Refactored Evidence Modal */}
            <EvidenceModal
                evidence={selectedEvidence}
                onClose={() => setSelectedEvidence(null)}
                petName={data.pet_name}
                apiUrl={API_BASE_URL}
            />
        </div>
    );
}
