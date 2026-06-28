"use client";

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import {
    Check,
    Sparkles,
    Package,
    Flame,
    Info,
    X,
    Inbox,
    Gem
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';

export interface SubItem {
    id: string;
    name: string;
    type?: 'servicio' | 'producto';
    image_url?: string | null;
}

export interface Service {
    id: string;
    name: string;
    description?: string;
    price?: number;
    category?: 'servicio' | 'plan' | 'producto';
    image_url?: string | null;
    sub_items?: SubItem[] | null;
}

interface ServiceSelectionStepProps {
    services: Service[];
    selectedServices: string[];
    toggleService: (id: string) => void;
}

function resolveImageUrl(url?: string | null): string | null {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
    const prefix = API_BASE_URL || '';
    return `${prefix}${url.startsWith('/') ? '' : '/'}${url}`;
}

function getPlanThumbnail(service: Service | null | undefined): string | null {
    if (!service) return null;
    // 1) Imagen propia del plan (nueva). 2) Fallback: imagen de un producto incluido.
    if (service.image_url) return resolveImageUrl(service.image_url);
    const productWithImage = service.sub_items?.find(
        item => item.type === 'producto' && item.image_url
    );
    return productWithImage ? resolveImageUrl(productWithImage.image_url) : null;
}

export default function ServiceSelectionStep({
    services,
    selectedServices,
    toggleService
}: ServiceSelectionStepProps) {
    const [viewingPlan, setViewingPlan] = useState<Service | null>(null);

    const { itemsToShow, isFallback } = useMemo(() => {
        const plans = services.filter(s => (s.category || '').toLowerCase() === 'plan');
        const others = services.filter(s => (s.category || '').toLowerCase() !== 'plan');
        if (plans.length > 0) return { itemsToShow: plans, isFallback: false };
        return { itemsToShow: others, isFallback: true };
    }, [services]);

    const planHeroImage = useMemo(() => getPlanThumbnail(viewingPlan), [viewingPlan]);

    if (itemsToShow.length === 0) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-black uppercase italic tracking-tight text-slate-800 dark:text-slate-100 mb-2">Selección</h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] font-bold">Servicios disponibles</p>
                </div>
                <div className="p-12 bg-white/70 border border-slate-200 dark:bg-slate-900/50 dark:border-slate-800 text-center flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center">
                        <Inbox size={28} />
                    </div>
                    <div className="text-slate-600 dark:text-slate-300 text-sm font-bold uppercase tracking-widest">Configuración pendiente</div>
                    <p className="text-slate-400 dark:text-slate-500 text-xs font-medium max-w-sm leading-relaxed">
                        El crematorio aún no ha publicado planes. Continúa al siguiente paso y se contactarán contigo para coordinar.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-2">
                <h2 className="text-3xl font-black uppercase italic tracking-tight text-slate-800 dark:text-slate-100 mb-2">
                    {isFallback ? 'Servicios' : 'Elige tu Plan'}
                </h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] font-bold">
                    {isFallback ? 'Selecciona los servicios que necesitas' : 'Selecciona el plan que mejor se adapte'}
                </p>
            </div>

            {/* Grid 1 columna — cards anchas premium */}
            <div className="space-y-4">
                {itemsToShow.map(service => {
                    const isSelected = selectedServices.includes(service.id);
                    const isPlan = (service.category || '').toLowerCase() === 'plan';
                    const itemCount = service.sub_items?.length || 0;
                    const thumbnail = isPlan ? getPlanThumbnail(service) : null;

                    return (
                        <motion.div
                            key={service.id}
                            whileTap={{ scale: 0.985 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                            onClick={() => toggleService(service.id)}
                            className={`relative overflow-hidden rounded-3xl border-2 cursor-pointer transition-all duration-300 ${
                                isSelected
                                    ? 'border-emerald-500 bg-gradient-to-br from-white via-emerald-50/30 to-emerald-50/60 dark:from-slate-900 dark:via-emerald-950/10 dark:to-emerald-950/20 shadow-xl shadow-emerald-500/15'
                                    : 'border-slate-200 bg-white dark:bg-slate-900/80 hover:border-emerald-300 dark:border-slate-800 hover:shadow-lg dark:hover:border-emerald-500/50 hover:shadow-slate-900/5'
                            }`}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && toggleService(service.id)}
                        >
                            {/* Brillo decorativo cuando está seleccionado */}
                            {isSelected && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-300/20 rounded-full blur-2xl pointer-events-none"
                                />
                            )}

                            <div className="p-6 sm:p-7 flex gap-5">
                                {/* Thumbnail (si hay imagen) */}
                                {thumbnail && (
                                    <div className="hidden sm:block relative w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                        <Image
                                            src={thumbnail}
                                            alt={service.name}
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                    </div>
                                )}

                                {/* Contenido principal */}
                                <div className="flex-1 min-w-0 space-y-3">
                                    {/* Header: nombre + radio */}
                                    <div className="flex items-start gap-3">
                                        <motion.div
                                            animate={isSelected ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                                            transition={{ duration: 0.4, ease: 'easeOut' }}
                                            className={`shrink-0 w-6 h-6 mt-1 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950'
                                            }`}
                                        >
                                            {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                                        </motion.div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className={`text-xl sm:text-2xl font-black leading-tight tracking-tight ${
                                                isSelected ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-100'
                                            }`}>
                                                {service.name}
                                            </h3>
                                            {service.description && (
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                                                    {service.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer: items + botón Detalles */}
                                    {isPlan && itemCount > 0 && (
                                        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/30">
                                                <Gem size={11} className="text-amber-600 dark:text-amber-400" />
                                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                                                    {itemCount} {itemCount === 1 ? 'incluido' : 'incluidos'}
                                                </span>
                                            </div>
 
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setViewingPlan(service);
                                                }}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 hover:text-sky-800 dark:hover:text-sky-300 transition-all text-[10px] font-black uppercase tracking-widest border border-transparent hover:border-sky-200 dark:hover:border-sky-900"
                                            >
                                                <Info size={12} />
                                                Detalles
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Modal Premium */}
            <AnimatePresence>
                {viewingPlan && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md"
                        onClick={() => setViewingPlan(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 30 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] border border-white/40 dark:border-slate-800/80 w-full max-w-md shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header con imagen hero o placeholder elegante */}
                            {planHeroImage ? (
                                <div className="relative w-full aspect-[16/10] bg-slate-100 dark:bg-slate-950 shrink-0">
                                    <Image
                                        src={planHeroImage}
                                        alt={viewingPlan.name}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 via-white/30 dark:via-slate-900/30 to-transparent" />
                                    <button
                                        onClick={() => setViewingPlan(null)}
                                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 dark:bg-slate-950/90 backdrop-blur-md text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-950 flex items-center justify-center shadow-lg transition-all hover:scale-110"
                                    >
                                        <X size={16} />
                                    </button>
                                    <div className="absolute bottom-5 left-6 right-6">
                                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-2">
                                            <Sparkles size={11} className="text-amber-500" />
                                            Plan
                                        </div>
                                        <h3 className="text-2xl sm:text-3xl font-black tracking-tight italic text-slate-900 dark:text-slate-100 leading-tight">
                                            {viewingPlan.name}
                                        </h3>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative pt-12 pb-8 px-8 bg-gradient-to-br from-amber-50 via-white to-rose-50/40 dark:from-amber-950/20 dark:via-slate-900 dark:to-rose-950/10 shrink-0">
                                    <button
                                        onClick={() => setViewingPlan(null)}
                                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 flex items-center justify-center shadow-sm transition-all hover:scale-110 border border-slate-200 dark:border-slate-800"
                                    >
                                        <X size={16} />
                                    </button>
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-gradient-to-br from-amber-200 to-amber-100 dark:from-amber-900/30 dark:to-amber-950/40 text-amber-700 dark:text-amber-400 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg dark:shadow-none shadow-amber-500/20">
                                            <Sparkles size={28} fill="currentColor" />
                                        </div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-700 dark:text-amber-400 mb-2">Plan</div>
                                        <h3 className="text-2xl sm:text-3xl font-black tracking-tight italic text-slate-800 dark:text-slate-100 leading-tight">
                                            {viewingPlan.name}
                                        </h3>
                                    </div>
                                </div>
                            )}

                            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
                                {viewingPlan.description && (
                                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                        {viewingPlan.description}
                                    </p>
                                )}

                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Gem size={12} className="text-amber-500" />
                                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                                            Incluye
                                        </div>
                                        <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-slate-800 to-transparent" />
                                    </div>
                                    <div className="space-y-2">
                                        {viewingPlan.sub_items?.map((item, idx) => {
                                            const itemImg = resolveImageUrl(item.image_url);
                                            return (
                                                <motion.div
                                                    key={idx}
                                                    initial={{ opacity: 0, x: -8 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.04 }}
                                                    className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-100 dark:bg-slate-950/40 dark:border-slate-900 hover:bg-slate-50 transition-colors"
                                                >
                                                    {itemImg ? (
                                                        <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                                                            <Image
                                                                src={itemImg}
                                                                alt={item.name}
                                                                fill
                                                                className="object-cover"
                                                                unoptimized
                                                             />
                                                        </div>
                                                    ) : (
                                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                                                            item.type === 'producto'
                                                                ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-500 border border-blue-100 dark:border-blue-900/50'
                                                                : 'bg-orange-50 dark:bg-orange-950/20 text-orange-500 border border-orange-100 dark:border-orange-900/50'
                                                        }`}>
                                                            {item.type === 'producto' ? <Package size={16} /> : <Flame size={16} />}
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">{item.name}</div>
                                                        <div className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] mt-0.5">
                                                            {item.type === 'producto' ? 'Producto' : 'Servicio'}
                                                        </div>
                                                    </div>
                                                    <Check size={14} className="text-emerald-500 shrink-0" strokeWidth={3} />
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 sm:p-8 pt-0 shrink-0">
                                <button
                                    onClick={() => setViewingPlan(null)}
                                    className="w-full bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-950 dark:to-slate-900 hover:from-slate-900 hover:to-black text-white dark:border dark:border-slate-800 dark:text-slate-300 font-black py-4 rounded-2xl text-[10px] uppercase tracking-[0.25em] shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
                                >
                                    Entendido
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
