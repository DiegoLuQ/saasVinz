"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { RITUAL_ICONS, ritualLabel, totalRituals, type RitualKind, type RitualState } from '@/lib/memorialRituals';

interface RitualSummaryProps {
    rituals: RitualState;
    petName: string;
    locale: 'es' | 'en';
    isDarkMode: boolean;
}

const ORDER: RitualKind[] = ['vela', 'flor', 'estrella', 'beso'];

/**
 * Prueba social del memorial: cuántas personas dejaron un gesto de cariño.
 * Se muestra sobre las dedicatorias en todos los altares.
 */
export default function RitualSummary({ rituals, petName, locale, isDarkMode }: RitualSummaryProps) {
    const total = totalRituals(rituals.counts);
    if (total === 0) return null;

    const items = ORDER.filter(k => (rituals.counts[k] || 0) > 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full flex flex-col items-center text-center mb-12 sm:mb-16 px-2"
        >
            <p
                className={`text-xl sm:text-2xl italic mb-5 ${isDarkMode ? 'text-white/85' : 'text-slate-700'}`}
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
                {locale === 'en'
                    ? `${total} ${total === 1 ? 'gesture' : 'gestures'} of love for ${petName}`
                    : `${total} ${total === 1 ? 'gesto' : 'gestos'} de cariño para ${petName}`}
            </p>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                {items.map(kind => (
                    <span
                        key={kind}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs sm:text-sm font-semibold ${isDarkMode
                            ? 'bg-white/5 border-white/10 text-white/80'
                            : 'bg-white/80 border-slate-200 text-slate-700'}`}
                        style={{ fontFamily: "'Quicksand', sans-serif" }}
                    >
                        <span aria-hidden>{RITUAL_ICONS[kind]}</span>
                        {ritualLabel(kind, rituals.counts[kind] || 0, locale)}
                    </span>
                ))}
            </div>
        </motion.div>
    );
}
