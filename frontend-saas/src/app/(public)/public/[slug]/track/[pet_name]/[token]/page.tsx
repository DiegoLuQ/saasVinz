"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest, API_BASE_URL } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2,
    PawPrint,
    Camera,
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
} from 'lucide-react';
import EvidenceModal from '@/components/public/EvidenceModal';

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

// Custom Angel Wing Icon Component
const AngelWings = ({ className = "w-6 h-6", color = "currentColor" }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 35C50 35 45 20 25 20C10 20 2 30 2 45C2 70 25 80 50 80C75 80 98 70 98 45C98 30 90 20 75 20C55 20 50 35 50 35Z" stroke={color} strokeWidth="3" opacity="0.1" />
        <path d="M48 40C35 30 15 30 10 45C8 55 15 65 25 70M52 40C65 30 85 30 90 45C92 55 85 65 75 70" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M40 50C30 45 20 45 15 55M60 50C70 45 80 45 85 55" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
);

// Custom Cloud Component for background
interface CloudBackgroundProps {
    className?: string;
    opacity?: number;
    style?: React.CSSProperties;
}

const CloudBackground = ({ className = "w-32 h-20", opacity = 0.5, style = {} }: CloudBackgroundProps) => (
    <svg viewBox="0 0 120 80" className={className} style={style} fill="currentColor">
        <path 
            d="M20 55 A15 15 0 0 1 32 30 A22 22 0 0 1 68 25 A25 25 0 0 1 103 40 A18 18 0 0 1 100 60 H 20 Z" 
            opacity={opacity}
        />
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
    const slug = params?.slug as string || '';
    const pet_name = params?.pet_name as string || '';
    const token = params?.token as string || '';

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedEvidence, setSelectedEvidence] = useState<any>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [stars, setStars] = useState<{ id: number; top: string; left: string; size: number; delay: string; duration: string }[]>([]);

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

    const theme = {
        bg: isDarkMode ? 'bg-neutral-950' : 'bg-[#f8faf9]',
        text: isDarkMode ? 'text-neutral-200' : 'text-gray-800',
        headerBg: isDarkMode ? 'bg-neutral-950/80 border-neutral-800' : 'bg-white/80 border-gray-200',
        petPhotoBorder: isDarkMode ? 'border-neutral-900 ring-neutral-800' : 'border-white ring-gray-100',
        petPhotoShadow: isDarkMode ? 'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]' : 'shadow-[0_25px_50px_-12px_rgba(5,150,105,0.25)]',
        tenantLogoBg: isDarkMode ? 'bg-neutral-900 border-neutral-800 ring-neutral-800' : 'bg-white border-white ring-gray-100',
        title: isDarkMode ? 'text-neutral-100' : 'text-gray-900',
        subtitle: isDarkMode ? 'text-neutral-400' : 'text-gray-500',
        timelineLine: isDarkMode ? 'border-neutral-800' : 'border-emerald-50',
        indicatorCompleted: isDarkMode ? 'bg-emerald-500 border-emerald-500' : 'bg-emerald-500 border-emerald-500',
        indicatorCurrentInner: isDarkMode ? 'bg-neutral-950 border-emerald-500 ring-emerald-500/20' : 'bg-white border-emerald-500 ring-emerald-500/10',
        indicatorPending: isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200',
        cardCurrentBg: isDarkMode ? 'bg-neutral-900 border-neutral-700 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]' : 'bg-white border-emerald-200 shadow-[0_20px_40px_-15px_rgba(5,150,105,0.15)]',
        cardCompletedBg: isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-100 shadow-sm',
        cardPendingBg: isDarkMode ? 'bg-neutral-950/50 border-neutral-900' : 'bg-gray-50/50 border-gray-100',
        cardTitleCurrent: isDarkMode ? 'text-emerald-400' : 'text-emerald-700',
        cardTitleOther: isDarkMode ? 'text-neutral-300' : 'text-gray-700',
        dateBadge: isDarkMode ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-800 bg-emerald-50 border-emerald-100',
        timeText: isDarkMode ? 'text-emerald-500/50' : 'text-emerald-600/40',
        footerTag: isDarkMode ? 'bg-neutral-900 border-neutral-800 text-emerald-400' : 'bg-white border-gray-200 text-emerald-800',
    };

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
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
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
                        className="px-8 py-3 bg-emerald-600 rounded-2xl text-white font-bold hover:bg-emerald-700 transition-all shadow-lg active:scale-95"
                    >
                        Intentar de nuevo
                    </button>
                    <a href="/" className="text-emerald-700 text-sm font-bold hover:underline">
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

    return (
        <div className={`min-h-screen font-sans transition-colors duration-500 selection:bg-emerald-500/30 relative overflow-hidden ${theme.bg} ${theme.text}`}>
            {/* Celestial Background Effect */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Outfit:wght@300;400;600;800&display=swap');
                    
                    .font-cinzel {
                        font-family: 'Cinzel', serif;
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
                    .cloud-nebula {
                        filter: blur(80px);
                        transition: all 1s ease-in-out;
                    }
                `}</style>

                {/* Light Mode Sky Background */}
                <div className={`absolute inset-0 transition-opacity duration-1000 ${
                    isDarkMode ? 'opacity-0' : 'opacity-100'
                }`} style={{
                    background: 'radial-gradient(circle at 50% 10%, #e0f2fe 0%, #f0fdf4 45%, #f8faf9 100%)'
                }}>
                    {/* Nebula glow blobs */}
                    <div 
                        className="absolute -top-20 -left-20 w-[450px] h-[450px] rounded-full bg-white/60 cloud-nebula"
                        style={{ animation: 'float-cloud-left 25s ease-in-out infinite' }}
                    />
                    <div 
                        className="absolute top-[40%] -right-40 w-[500px] h-[500px] rounded-full bg-emerald-100/30 cloud-nebula"
                        style={{ animation: 'float-cloud-right 30s ease-in-out infinite' }}
                    />
                    <div 
                        className="absolute -bottom-20 left-[10%] w-[400px] h-[400px] rounded-full bg-white/70 cloud-nebula"
                        style={{ animation: 'float-cloud-left 20s ease-in-out infinite' }}
                    />

                    {/* Drifting Vector Clouds for Light Mode */}
                    <CloudBackground 
                        className="absolute text-white/50 w-44 h-28 top-[8%] left-[2%]" 
                        style={{ animation: 'drift-cloud 38s ease-in-out infinite' }} 
                        opacity={0.65}
                    />
                    <CloudBackground 
                        className="absolute text-white/60 w-56 h-36 top-[28%] right-[5%]" 
                        style={{ animation: 'drift-cloud 48s ease-in-out infinite' }} 
                        opacity={0.75}
                    />
                    <CloudBackground 
                        className="absolute text-emerald-50/40 w-48 h-30 bottom-[30%] left-[8%]" 
                        style={{ animation: 'drift-cloud 42s ease-in-out infinite' }} 
                        opacity={0.55}
                    />
                    <CloudBackground 
                        className="absolute text-white/55 w-64 h-40 bottom-[8%] right-[8%]" 
                        style={{ animation: 'drift-cloud 54s ease-in-out infinite' }} 
                        opacity={0.7}
                    />
                </div>

                {/* Dark Mode Sky Background */}
                <div className={`absolute inset-0 transition-opacity duration-1000 ${
                    isDarkMode ? 'opacity-100' : 'opacity-0'
                }`} style={{
                    background: 'radial-gradient(circle at 50% 10%, #030712 0%, #090514 50%, #0a0a0a 100%)'
                }}>
                    {stars.map((star) => (
                        <div
                            key={star.id}
                            className="absolute rounded-full bg-white star"
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
                        className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-emerald-950/15 cloud-nebula"
                        style={{ animation: 'float-cloud-left 35s ease-in-out infinite' }}
                    />
                    <div 
                        className="absolute top-[30%] -right-40 w-[500px] h-[500px] rounded-full bg-indigo-950/20 cloud-nebula"
                        style={{ animation: 'float-cloud-right 40s ease-in-out infinite' }}
                    />
                    <div 
                        className="absolute -bottom-40 left-[20%] w-[450px] h-[450px] rounded-full bg-emerald-900/10 cloud-nebula"
                        style={{ animation: 'float-cloud-left 28s ease-in-out infinite' }}
                    />
                </div>
            </div>

            {/* Header / Brand */}
            <div className={`fixed top-0 w-full z-20 backdrop-blur-xl border-b transition-colors duration-500 ${theme.headerBg}`}>
                <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-center relative">
                    <span className="font-cinzel font-bold text-sm tracking-[0.25em] text-emerald-500 uppercase">{data.tenant_name}</span>
                    <button 
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className="absolute right-4 sm:right-6 p-2 rounded-full hover:bg-emerald-500/10 text-emerald-500 transition-colors"
                    >
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto pt-24 pb-20 px-4 sm:px-6 relative z-10">

                {/* Main Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-14 text-center"
                >
                    <div className="relative inline-block mb-8">
                        {/* Main Hero: Pet Photo */}
                        <div className={`w-48 h-48 mx-auto rounded-full flex items-center justify-center border-[6px] overflow-hidden group relative z-10 transition-all duration-500 ${theme.petPhotoBorder} ${theme.petPhotoShadow}`}>
                            {data.pet_image_url ? (
                                <img
                                    src={getImageUrl(data.pet_image_url) || ''}
                                    alt={data.pet_name}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700"
                                />
                            ) : (
                                <div className="w-full h-full bg-emerald-50 flex items-center justify-center">
                                    <PawPrint size={64} className="text-emerald-200" />
                                </div>
                            )}
                        </div>

                        {/* Corner Badge: Tenant Logo */}
                        <div className={`absolute -bottom-2 -right-2 z-20 w-16 h-16 rounded-full border-4 shadow-lg overflow-hidden flex items-center justify-center transition-all duration-500 ${theme.tenantLogoBg}`}>
                            {data.tenant_logo ? (
                                <img
                                    src={getImageUrl(data.tenant_logo) || ''}
                                    alt={data.tenant_name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Building2 size={24} className="text-gray-300" />
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-center gap-2 text-emerald-500 mb-1">
                            <Heart size={14} fill="currentColor" />
                            <p className="font-black text-[11px] tracking-[0.25em] uppercase">
                                {data.service_status === 'delivered' || data.service_status === 'entregado' ? 'Servicio Finalizado' : 'Acompañando el proceso'}
                            </p>
                            <Heart size={14} fill="currentColor" />
                        </div>
                        <div className="flex items-center justify-center gap-3">
                            <AngelWings className="w-6 h-6 text-emerald-500/30 -scale-x-100" />
                            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight transition-colors duration-500 ${theme.title}`}>{data.pet_name}</h1>
                            <AngelWings className="w-6 h-6 text-emerald-500/30" />
                        </div>
                        <div className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm font-bold pt-1 transition-colors duration-500 ${theme.subtitle}`}>
                            <span className="inline-flex items-center gap-1.5 capitalize">
                                <PawPrint size={16} className="text-emerald-500/50" />
                                {data.pet_species || data.pet_breed
                                    ? `${data.pet_species || ''}${data.pet_species && data.pet_breed ? ' - ' : ''}${data.pet_breed || ''}`
                                    : 'En Camino al Paraíso'}
                            </span>
                            {data.pet_weight != null && (
                                <>
                                    <span className="text-emerald-500/30">·</span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <Scale size={16} className="text-emerald-500/50" />
                                        {data.pet_weight} kg
                                    </span>
                                </>
                            )}
                            {data.customer_name && (
                                <>
                                    <span className="text-emerald-500/30">·</span>
                                    <span className="inline-flex items-center gap-1.5 capitalize">
                                        <User size={16} className="text-emerald-500/50" />
                                        {data.customer_name}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Layout Principal Grid 2 Columnas */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Panel Izquierdo: Tarjetas Informativas */}
                    <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
                                          {/* Tarjeta 1: Estado Actual */}
                        <div className={`p-6 rounded-[2rem] border backdrop-blur-md transition-all duration-300 ${
                            isDarkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white/90 border-emerald-100/80 shadow-md shadow-emerald-500/5'
                        }`}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-650 shrink-0">
                                    <PawPrint size={20} />
                                </div>
                                <div className="min-w-0">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest block ${
                                        isDarkMode ? 'text-slate-500' : 'text-gray-400'
                                    }`}>Estado actual</span>
                                    <h4 className="text-sm font-black text-emerald-650 dark:text-emerald-400 truncate leading-tight">{currentStepName}</h4>
                                </div>
                            </div>
                            <p className={`text-xs leading-relaxed mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                                {currentEvent?.status === 'current' 
                                    ? `Tu mascota se encuentra actualmente en esta etapa. Recibirás una notificación cuando avance.` 
                                    : `El proceso está en marcha. Te notificaremos a medida que avance el estado.`}
                            </p>
                        </div>

                        {/* Tarjeta 2: Progreso del Proceso */}
                        <div className={`p-6 rounded-[2rem] border backdrop-blur-md transition-all duration-300 ${
                            isDarkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white/90 border-emerald-100/80 shadow-md shadow-emerald-500/5'
                        }`}>
                            <div className="flex justify-between items-center mb-3">
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                    isDarkMode ? 'text-slate-500' : 'text-gray-400'
                                }`}>Progreso del proceso</span>
                                <span className="text-lg font-black text-emerald-650 dark:text-emerald-400">{progressPercentage}%</span>
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
                                                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' 
                                                    : isStepCurrent 
                                                        ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.4)] animate-pulse'
                                                        : (isDarkMode ? 'bg-neutral-805' : 'bg-gray-200')
                                            }`} 
                                        />
                                    );
                                })}
                            </div>
                            
                            <p className={`text-[11px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-gray-700'}`}>
                                {completedCount} de {totalSteps} etapas completadas
                            </p>
                        </div>

                        {/* Tarjeta 3: Última actualización */}
                        <div className={`p-6 rounded-[2rem] border backdrop-blur-md transition-all duration-300 ${
                            isDarkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white/90 border-emerald-100/80 shadow-md shadow-emerald-500/5'
                        }`}>
                            <span className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${
                                isDarkMode ? 'text-slate-500' : 'text-gray-400'
                            }`}>Última actualización</span>
                            {lastUpdateDate ? (
                                <div className="space-y-1">
                                    <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                        {lastUpdateDate.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </p>
                                    <p className="text-xs text-emerald-650 dark:text-emerald-400 font-bold">
                                        {lastUpdateDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })} hrs
                                    </p>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic">No hay actualizaciones registradas aún.</p>
                            )}
                        </div>

                        {/* Tarjeta 4: Mensaje Emocional */}
                        <div className={`p-6 rounded-[2rem] border backdrop-blur-md transition-all duration-300 ${
                            isDarkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white/90 border-emerald-100/80 shadow-md shadow-emerald-500/5'
                        }`}>
                            <div className="flex items-center gap-3">
                                <Heart size={18} className="text-emerald-500 animate-pulse shrink-0" fill="currentColor" />
                                <p className={`text-xs font-medium leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                                    Gracias por confiar en <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{data.tenant_name}</span>.
                                </p>
                            </div>
                        </div>

                    </div>

                    {/* Panel Derecho: Timeline */}
                    <div className="lg:col-span-8">
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
                                        {/* Indicator */}
                                        <div className={`absolute -left-[45px] sm:-left-[54px] top-[22px] sm:top-[26px] w-7 h-7 rounded-full border-4 transition-all duration-700 z-10 flex items-center justify-center shadow-sm
                                            ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]' :
                                                isCurrent ? `border-sky-400 ${isDarkMode ? 'bg-sky-950/85 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.5)]' : 'bg-white text-sky-550 shadow-[0_0_12px_rgba(56,189,248,0.25)]'} scale-110` :
                                                    isDarkMode ? 'border-neutral-700 bg-neutral-900/40 text-neutral-600' : 'border-gray-250 bg-gray-100 text-gray-400'}`}>
                                            {isCompleted && <CheckCircle2 size={14} strokeWidth={4} className="text-white" />}
                                            {isCurrent && <Heart size={11} fill="currentColor" className={`${isDarkMode ? 'text-sky-450' : 'text-sky-500'} animate-pulse shrink-0`} />}
                                        </div>

                                        <div className={`px-6 py-4 sm:px-9 sm:py-5 rounded-[2rem] border transition-all duration-500 ${
                                            isCurrent
                                                ? (isDarkMode ? 'bg-sky-950/10 border-sky-500 shadow-[0_0_25px_rgba(56,189,248,0.25)]' : 'bg-sky-50/70 border-sky-200 shadow-[0_0_20px_rgba(56,189,248,0.15)]') + ' scale-[1.02] backdrop-blur-md'
                                                : isCompleted
                                                    ? (isDarkMode ? 'bg-emerald-950/10 border-emerald-500/20' : 'bg-emerald-50/20 border-emerald-100') + ' shadow-sm'
                                                    : isDarkMode ? 'bg-neutral-950/20 border-neutral-900/60' : 'bg-gray-50/60 border-gray-150 shadow-sm'
                                            }`}>
                                            <div className="flex items-center gap-4 h-full">
                                                {/* Circular Icon Container */}
                                                <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center border transition-all duration-500 ${
                                                    isCompleted 
                                                        ? (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600')
                                                        : isCurrent 
                                                            ? (isDarkMode ? 'bg-sky-500/15 border-sky-400/30 text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.2)]' : 'bg-sky-50 border-sky-200 text-sky-500')
                                                            : (isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-500' : 'bg-gray-100 border-gray-200 text-gray-400')
                                                }`}>
                                                    {getStepIcon(idx)}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    {/* Top Row: Title + Wings */}
                                                    <div className="flex items-center justify-between gap-4">
                                                        <h3 className={`font-semibold text-sm sm:text-base leading-snug transition-colors duration-500 ${
                                                            isCurrent 
                                                                ? (isDarkMode ? 'text-white' : 'text-sky-900') 
                                                                : isCompleted 
                                                                    ? (isDarkMode ? 'text-slate-200' : 'text-emerald-900') 
                                                                    : (isDarkMode ? 'text-slate-500' : 'text-gray-500')
                                                        }`}>
                                                            {event.step_name}
                                                        </h3>

                                                        {/* Minimalist Angel Wing Evidence Icon */}
                                                        {event.evidence && (event.evidence.photo_url || (Array.isArray(event.evidence.comments) && event.evidence.comments.some((c: string) => c.trim())) || (typeof event.evidence.comments === 'string' && event.evidence.comments.trim())) && (
                                                            <motion.button
                                                                whileHover={{ scale: 1.2, backdropFilter: "blur(12px)" }}
                                                                whileTap={{ scale: 0.9 }}
                                                                animate={{
                                                                    scale: [1, 1.15, 1],
                                                                    backgroundColor: isDarkMode ? [
                                                                        "rgba(249, 115, 22, 0.05)",
                                                                        "rgba(249, 115, 22, 0.15)",
                                                                        "rgba(249, 115, 22, 0.05)"
                                                                    ] : [
                                                                        "rgba(6, 78, 59, 0.05)",
                                                                        "rgba(6, 78, 59, 0.15)",
                                                                        "rgba(6, 78, 59, 0.05)"
                                                                    ],
                                                                    boxShadow: isDarkMode ? [
                                                                        "0 0 0px rgba(249, 115, 22, 0)",
                                                                        "0 0 20px rgba(249, 115, 22, 0.4)",
                                                                        "0 0 0px rgba(249, 115, 22, 0)"
                                                                    ] : [
                                                                        "0 0 0px rgba(6, 78, 59, 0)",
                                                                        "0 0 20px rgba(6, 78, 59, 0.4)",
                                                                        "0 0 0px rgba(6, 78, 59, 0)"
                                                                    ]
                                                                }}
                                                                transition={{
                                                                    duration: 2.5,
                                                                    repeat: Infinity,
                                                                    ease: "easeInOut"
                                                                }}
                                                                onClick={() => setSelectedEvidence(event.evidence)}
                                                                className={`p-3 sm:p-2.5 rounded-full cursor-pointer transition-all group relative border shrink-0 ${
                                                                    isDarkMode 
                                                                        ? 'text-orange-500 border-orange-500/20' 
                                                                        : 'text-emerald-900 border-emerald-900/25'
                                                                }`}
                                                                title="Ver registro visual"
                                                            >
                                                                <Camera className={`w-5 h-5 sm:w-4 sm:h-4 transition-all ${
                                                                    isDarkMode 
                                                                        ? 'group-hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]' 
                                                                        : 'group-hover:drop-shadow-[0_0_8px_rgba(6,78,59,0.5)]'
                                                                }`} />
                                                                <div className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 blur-md transition-opacity ${
                                                                    isDarkMode ? 'bg-orange-500/10' : 'bg-emerald-950/10'
                                                                }`} />
                                                            </motion.button>
                                                        )}
                                                    </div>

                                                    {/* Bottom Row: Timestamp and status badge */}
                                                    <div className="mt-2.5 flex items-center justify-between gap-3">
                                                        {event.completed_at ? (
                                                            <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                                                {new Date(event.completed_at).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })} · {new Date(event.completed_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })} hrs
                                                            </span>
                                                        ) : isCompleted ? (
                                                            <span className={`text-[10px] font-medium italic ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Concluido</span>
                                                        ) : isCurrent ? (
                                                            <span className={`text-[10px] font-medium italic ${isDarkMode ? 'text-sky-400' : 'text-sky-600'}`}>En curso</span>
                                                        ) : (
                                                            <span className={`text-[10px] font-medium italic ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Pendiente</span>
                                                        )}

                                                        {isCompleted ? (
                                                            <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[9px] font-bold uppercase tracking-wider">Completado</span>
                                                        ) : isCurrent ? (
                                                            <span className="px-2.5 py-0.5 bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 rounded-full text-[9px] font-bold uppercase tracking-wider animate-pulse">En proceso</span>
                                                        ) : (
                                                            <span className="px-2.5 py-0.5 bg-neutral-900 border border-neutral-800 text-neutral-500 dark:text-neutral-600 rounded-full text-[9px] font-bold uppercase tracking-wider">Pendiente</span>
                                                        )}
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

                {/* Footer */}
                <div className="mt-20 text-center space-y-5">
                    <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full border shadow-sm transition-colors duration-500 ${theme.footerTag}`}>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Seguimiento en Vivo</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                        <p className={`text-[10px] uppercase font-bold tracking-[0.25em] transition-colors duration-500 ${isDarkMode ? 'text-neutral-600' : 'text-gray-400'}`}>
                            © {new Date().getFullYear()} {data.tenant_name}
                        </p>
                        <a href="https://vinzer.cl" target="_blank" rel="noopener noreferrer" className={`text-[9px] uppercase font-semibold tracking-wider hover:text-emerald-500 transition-colors duration-300 flex items-center gap-1 ${isDarkMode ? 'text-neutral-700' : 'text-gray-300'}`}>
                            Tecnología por <span className="font-black">Vinzer.cl</span>
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
