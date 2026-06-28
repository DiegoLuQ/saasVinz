'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, User, Calendar, Quote } from 'lucide-react';
import { getTranslations, type Locale } from '@/lib/translations';

interface DedicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    dedication: {
        mensajero: string;
        mensaje: string;
        fecha: string | Date;
    } | null;
    themeConfig: any;
    locale: Locale;
}

export default function DedicationModal({ isOpen, onClose, dedication, themeConfig, locale }: DedicationModalProps) {
    if (!dedication) return null;

    const t = getTranslations(locale);

    const formatDate = (dateInput: string | Date) => {
        try {
            const d = new Date(dateInput);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = String(d.getFullYear()).slice(-2);
            return `${day}/${month}/${year}`;
        } catch {
            return String(dateInput);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 backdrop-blur-md ${themeConfig.overlay || 'bg-black/80'}`}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className={`relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] border border-white/20 shadow-2xl ${themeConfig.card} p-8 md:p-12`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Decorative background glow */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-[80px]" />
                        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-[80px]" />

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className={`absolute top-6 right-6 p-2 rounded-full transition-colors border ${themeConfig.divider || 'border-white/5'} ${themeConfig.text || 'text-white'} opacity-60 hover:opacity-100 hover:bg-black/5`}
                        >
                            <X size={20} />
                        </button>

                        <div className="relative z-10 space-y-8 text-center">
                            <div className="flex justify-center">
                                <div className="p-3 rounded-full bg-primary/10 border border-primary/20 text-primary">
                                    <Quote size={32} />
                                </div>
                            </div>

                            <p className={`text-xl md:text-3xl font-serif italic leading-relaxed ${themeConfig.text || 'text-white'} opacity-90`}>
                                "{dedication.mensaje}"
                            </p>

                            <div className={`pt-8 border-t ${themeConfig.divider || 'border-white/5'} flex flex-col items-center gap-6`}>
                                <div className="flex flex-col items-center gap-3 text-center">
                                    <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center border-2 border-primary/30 shadow-lg">
                                        <User size={22} className="text-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className={`text-xl md:text-2xl font-black uppercase tracking-[0.2em] ${themeConfig.text || 'text-white'} drop-shadow-sm`}>
                                            {dedication.mensajero}
                                        </h4>
                                        <p className={`text-xs md:text-sm font-bold tracking-[0.15em] opacity-60 ${themeConfig.text || 'text-white'}`}>
                                            {formatDate(dedication.fecha)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 px-6 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] md:text-xs font-black uppercase tracking-widest shadow-sm">
                                    <Heart size={14} className="fill-red-500" />
                                    {t.dedication_in_memory}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
