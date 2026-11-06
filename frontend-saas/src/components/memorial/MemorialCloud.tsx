"use client";

import { motion } from 'framer-motion';

interface Props {
    /** Tamaño y posición (p. ej. "absolute -bottom-4 left-1/2 -translate-x-1/2 w-28 h-12") */
    className?: string;
    /** `night` = fondos oscuros (Constelación); `day` = fondos claros: sombra gris-azulada para que se note */
    tone?: 'night' | 'day';
    /** Desfase de la deriva lateral, para que varias nubes no se muevan al unísono */
    delay?: number;
    /** Intensidad 0–1 (1 = como en Constelación Eterna) */
    intensity?: number;
}

/**
 * Nube de capas difuminadas que cubre la base de una vela (Constelación Eterna,
 * Altar de Luz). Las capas van en % para escalar con el contenedor.
 */
export default function MemorialCloud({ className = '', tone = 'night', delay = 0, intensity = 1 }: Props) {
    const day = tone === 'day';
    return (
        <motion.div
            aria-hidden
            className={`pointer-events-none z-20 ${className}`}
            style={{ opacity: intensity }}
            animate={{ x: [-3, 3, -3] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay }}
        >
            {/* Sombra bajo la nube: en fondos claros le da cuerpo */}
            {day && <div className="absolute -bottom-[6%] inset-x-[10%] h-[35%] rounded-full bg-slate-500/25 blur-[10px]" />}
            <div className="absolute bottom-[2%] left-[8%] w-[39%] h-[60%] rounded-full bg-white/70 blur-[10px]" />
            <div className="absolute bottom-0 right-[8%] w-[44%] h-[60%] rounded-full bg-white/65 blur-[10px]" />
            <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 w-[50%] h-[70%] rounded-full bg-white/85 blur-[8px]" />
            <div className="absolute bottom-[30%] left-[30%] w-[22%] h-[50%] rounded-full bg-white/80 blur-[6px]" />
            <div className="absolute bottom-[30%] right-[28%] w-[28%] h-[55%] rounded-full bg-white/75 blur-[7px]" />
            <div className={`absolute bottom-0 inset-x-[3%] h-[30%] rounded-full blur-[12px] ${day ? 'bg-sky-300/50' : 'bg-indigo-200/40'}`} />
        </motion.div>
    );
}
