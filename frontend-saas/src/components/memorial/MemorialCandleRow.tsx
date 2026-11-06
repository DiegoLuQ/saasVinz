"use client";

import { motion } from 'framer-motion';

interface Props {
    /** Velas encendidas en el memorial (todas las visitas) */
    count: number;
    isDark?: boolean;
    locale?: string;
    /** Velitas que se ven siempre (apagadas mientras nadie las encienda) */
    slots?: number;
    /** Cuántas se dibujan como máximo; el resto se muestra como «+N» */
    max?: number;
    className?: string;
}

/**
 * Fila de velitas bajo la foto. Por defecto están apagadas; cada vela que
 * encienden los visitantes («Encender una velita») prende una más, hasta 20; el resto como «+N». Solo visual.
 */
export default function MemorialCandleRow({ count, isDark = false, locale = 'es', slots = 5, max = 20, className = 'mt-6' }: Props) {
    const lit = Math.max(0, count);
    const total = Math.min(Math.max(lit, slots), max);
    const extra = lit - Math.min(lit, total);
    const en = locale === 'en';

    return (
        <div
            className={`flex flex-col items-center ${className}`}
            aria-label={en ? `${lit} candles lit` : `${lit} ${lit === 1 ? 'vela encendida' : 'velas encendidas'}`}
        >
            <div className="flex items-end justify-center gap-2">
            {/* Hasta 10 por fila (20 = dos filas parejas) */}
            <div className="grid items-end justify-items-center gap-x-3 gap-y-4" style={{ gridTemplateColumns: `repeat(${Math.min(total, 10)}, minmax(0, 1fr))` }}>
                {Array.from({ length: total }).map((_, i) => {
                    const on = i < lit;
                    return (
                        <div key={i} className="relative flex flex-col items-center">
                            {/* Halo + llama (solo encendida) */}
                            <span className={`absolute -top-2 h-6 w-6 rounded-full bg-amber-400/25 blur-md transition-opacity duration-700 ${on ? 'opacity-100' : 'opacity-0'}`} />
                            {on ? (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ scaleY: [1, 1.04, 1], opacity: 1 }}
                                    transition={{ scaleY: { duration: 4 + (i % 4) * 0.5, repeat: Infinity, ease: 'easeInOut', delay: (i % 5) * 0.3 }, opacity: { duration: 0.6 } }}
                                    className="relative h-3.5 w-2 origin-bottom rounded-[50%_50%_50%_50%/60%_60%_40%_40%] bg-gradient-to-t from-orange-500 via-amber-300 to-yellow-50"
                                />
                            ) : (
                                <span className="h-3.5 w-2" />
                            )}
                            {/* Mecha + cuerpo */}
                            <span className={`h-1 w-px ${on ? 'bg-stone-500/70' : 'bg-stone-700/60'}`} />
                            <span className={`h-5 w-3 rounded-[2px] bg-gradient-to-b shadow-[0_2px_6px_rgba(0,0,0,0.12)] ring-1 ${
                                on
                                    ? 'from-[#faf5ee] to-[#e9dfcc] ring-stone-300/50'
                                    : isDark ? 'from-[#d8d2c6] to-[#b9b1a2] ring-white/10 opacity-70' : 'from-[#efe9de] to-[#d9cfbd] ring-stone-300/60 opacity-80'
                            }`} />
                        </div>
                    );
                })}
            </div>
                {extra > 0 && (
                    <span className={`self-center text-xs font-semibold ${isDark ? 'text-amber-100/80' : 'text-amber-900/80'}`}>+{extra}</span>
                )}
            </div>
        </div>
    );
}
