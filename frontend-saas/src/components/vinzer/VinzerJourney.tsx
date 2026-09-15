'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Flame, LayoutGrid, HeartHandshake, ChevronRight, ChevronDown, Sparkles } from 'lucide-react';

interface VinzerJourneyProps {
    theme?: 'dark' | 'light';
}

const steps = [
    {
        number: '01',
        category: 'ADMISIÓN',
        role: 'Recepción',
        icon: FileText,
        description: 'Registra al tutor, la mascota y genera el código único de trazabilidad y custodia en 1 minuto.',
        highlight: 'Código único de trazabilidad',
    },
    {
        number: '02',
        category: 'PLANTA',
        role: 'Operación',
        icon: Flame,
        description: 'El operario avanza cada etapa y captura evidencia fotográfica desde el celular.',
        highlight: 'Evidencia fotográfica en vivo',
    },
    {
        number: '03',
        category: 'CONTROL',
        role: 'Para tu crematorio',
        icon: LayoutGrid,
        description: 'El dueño controla stock de urnas, bitácora de cada servicio y certificados oficiales emitidos.',
        highlight: 'Control total y auditoría',
    },
    {
        number: '04',
        category: 'TUTOR',
        role: 'Para la familia',
        icon: HeartHandshake,
        description: 'Sigue el estado en vivo desde un enlace privado y descarga el certificado sin llamar.',
        highlight: 'Tranquilidad sin llamadas',
    },
];

export function VinzerJourney({ theme = 'dark' }: VinzerJourneyProps) {
    const [activeStep, setActiveStep] = useState<number>(0);
    const [isHovered, setIsHovered] = useState<boolean>(false);

    // Ciclo automático suave que avanza de la fase 1 a la 4 (0 -> 1 -> 2 -> 3)
    useEffect(() => {
        if (isHovered) return;
        const interval = setInterval(() => {
            setActiveStep((prev) => (prev + 1) % steps.length);
        }, 3200);
        return () => clearInterval(interval);
    }, [isHovered]);

    const isDark = theme === 'dark';

    return (
        <section id="como-funciona" className="py-24 md:py-32 px-4 sm:px-6 relative z-10 max-w-7xl mx-auto overflow-hidden">
            {/* Ambient subtle glow background */}
            <div
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] blur-[140px] pointer-events-none rounded-full ${
                    isDark ? 'bg-[#19B5FE]/5' : 'bg-sky-500/5'
                }`}
            />

            {/* Header Section */}
            <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20 space-y-4 relative z-10">
                <div
                    className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black tracking-widest uppercase transition-all duration-300 ${
                        isDark
                            ? 'bg-[#19B5FE]/10 border-[#19B5FE]/30 text-[#19B5FE] shadow-sm shadow-[#19B5FE]/10'
                            : 'bg-sky-50 border-sky-200 text-[#0284C7]'
                    }`}
                >
                    <Sparkles size={13} className={isDark ? 'text-[#19B5FE]' : 'text-[#0284C7]'} />
                    <span>FLUJO DE TRABAJO</span>
                </div>

                <h2
                    className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight ${
                        isDark ? 'text-white' : 'text-slate-900'
                    }`}
                >
                    Cómo funciona Vinzer
                </h2>

                <p
                    className={`text-base sm:text-lg font-normal max-w-2xl mx-auto ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                    }`}
                >
                    Cada etapa queda registrada. Vinzer coordina cada área de tu crematorio sin mensajes cruzados ni planillas:
                </p>
            </div>

            {/* Stepper Progress Arrow Track (Responsive Flow) */}
            <div className="relative z-10 mb-8 max-w-5xl mx-auto">
                {/* Desktop Track Connector Bar */}
                <div className="hidden lg:block relative h-2 bg-slate-800/40 dark:bg-white/5 rounded-full overflow-hidden mb-10 mx-12">
                    <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#19B5FE] via-[#38bdf8] to-[#10b981] rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
                    />
                    {/* Animated arrow beam traveling through the bar */}
                    <div
                        className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white to-transparent opacity-75 blur-[2px] animate-pulse"
                        style={{
                            left: `${(activeStep / (steps.length - 1)) * 85}%`,
                            transition: 'left 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    />
                </div>

                {/* 4 Connected Cards Grid */}
                <div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {steps.map((step, idx) => {
                        const Icon = step.icon;
                        const isActive = activeStep === idx;
                        const isPast = activeStep > idx;

                        return (
                            <div key={idx} className="relative group">
                                {/* Card Container with animated arrow border */}
                                <div
                                    onClick={() => setActiveStep(idx)}
                                    className={`relative h-full rounded-2xl md:rounded-3xl p-6 sm:p-7 flex flex-col justify-between cursor-pointer transition-all duration-500 overflow-hidden border ${
                                        isActive
                                            ? isDark
                                                ? 'bg-[#081126] border-[#19B5FE] shadow-[0_0_35px_rgba(25,181,254,0.22)] scale-[1.02]'
                                                : 'bg-white border-[#0284C7] shadow-[0_12px_32px_rgba(2,132,199,0.18)] scale-[1.02]'
                                            : isPast
                                            ? isDark
                                                ? 'bg-[#050b18]/80 border-[#19B5FE]/40 hover:border-[#19B5FE]/70'
                                                : 'bg-white/90 border-sky-200 hover:border-sky-300'
                                            : isDark
                                            ? 'bg-[#060d1f]/60 border-white/10 hover:border-white/20'
                                            : 'bg-white/75 border-slate-200/80 hover:border-slate-300'
                                    }`}
                                >
                                    {/* Animated Running Border Beam for the Active Step */}
                                    {isActive && (
                                        <div className="absolute inset-0 pointer-events-none rounded-2xl md:rounded-3xl overflow-hidden z-0">
                                            {/* Glowing border sweep */}
                                            <div className="absolute -inset-[100%] animate-[spin_4s_linear_infinite] opacity-70 bg-[conic-gradient(from_0deg,transparent_0_300deg,#19B5FE_360deg)]" />
                                            {/* Inner mask to keep border 1.5px */}
                                            <div
                                                className={`absolute inset-[1.5px] rounded-2xl md:rounded-3xl ${
                                                    isDark ? 'bg-[#081126]' : 'bg-white'
                                                }`}
                                            />
                                        </div>
                                    )}

                                    {/* Top Content (Icon + Category tag) */}
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-6">
                                            {/* Icon rounded container */}
                                            <div
                                                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 border ${
                                                    isActive
                                                        ? isDark
                                                            ? 'bg-[#19B5FE]/20 text-[#19B5FE] border-[#19B5FE]/50 shadow-md shadow-[#19B5FE]/20'
                                                            : 'bg-sky-100 text-[#0284C7] border-sky-300 shadow-sm shadow-sky-500/20'
                                                        : isDark
                                                        ? 'bg-white/[0.04] text-slate-400 border-white/5 group-hover:text-slate-200 group-hover:bg-white/[0.08]'
                                                        : 'bg-slate-100 text-slate-500 border-slate-200 group-hover:bg-slate-200/80 group-hover:text-slate-700'
                                                }`}
                                            >
                                                <Icon size={22} strokeWidth={2.2} />
                                            </div>

                                            {/* Status / Step Indicator Badge */}
                                            <div
                                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase transition-colors ${
                                                    isActive
                                                        ? isDark
                                                            ? 'bg-[#19B5FE]/15 text-[#19B5FE] border border-[#19B5FE]/30'
                                                            : 'bg-sky-50 text-[#0284C7] border border-sky-200'
                                                        : isPast
                                                        ? isDark
                                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                            : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                                        : isDark
                                                        ? 'bg-white/5 text-slate-500 border border-white/5'
                                                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                                                }`}
                                            >
                                                <span>FASE {step.number}</span>
                                            </div>
                                        </div>

                                        {/* Step Category (Sub-tag in image) */}
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span
                                                className={`text-[11px] font-mono font-black tracking-widest uppercase transition-colors ${
                                                    isActive
                                                        ? isDark
                                                            ? 'text-[#19B5FE]'
                                                            : 'text-[#0284C7]'
                                                        : isDark
                                                        ? 'text-slate-400'
                                                        : 'text-slate-500'
                                                }`}
                                            >
                                                {step.number} — {step.category}
                                            </span>
                                        </div>

                                        {/* Role Name */}
                                        <h3
                                            className={`text-xl sm:text-2xl font-black tracking-tight mb-3 transition-colors ${
                                                isActive
                                                    ? isDark
                                                        ? 'text-white'
                                                        : 'text-slate-900'
                                                    : isDark
                                                    ? 'text-slate-200 group-hover:text-white'
                                                    : 'text-slate-800 group-hover:text-slate-900'
                                            }`}
                                        >
                                            {step.role}
                                        </h3>

                                        {/* Description */}
                                        <p
                                            className={`text-xs sm:text-sm leading-relaxed transition-colors ${
                                                isActive
                                                    ? isDark
                                                        ? 'text-slate-300'
                                                        : 'text-slate-700 font-medium'
                                                    : isDark
                                                    ? 'text-slate-400'
                                                    : 'text-slate-600'
                                            }`}
                                        >
                                            {step.description}
                                        </p>
                                    </div>

                                    {/* Bottom Micro-Badge */}
                                    <div className="mt-6 pt-4 border-t relative z-10 border-white/5 dark:border-white/5 border-slate-100 flex items-center justify-between">
                                        <span
                                            className={`text-[11px] font-semibold transition-colors ${
                                                isActive
                                                    ? isDark
                                                        ? 'text-[#19B5FE]'
                                                        : 'text-[#0284C7]'
                                                    : isDark
                                                    ? 'text-slate-400'
                                                    : 'text-slate-500'
                                            }`}
                                        >
                                            {step.highlight}
                                        </span>

                                        {/* Directional arrow icon indicator */}
                                        {idx < steps.length - 1 && (
                                            <span
                                                className={`hidden lg:block transition-all duration-300 ${
                                                    isActive
                                                        ? isDark
                                                            ? 'text-[#19B5FE] translate-x-1'
                                                            : 'text-[#0284C7] translate-x-1'
                                                        : 'text-slate-400 opacity-60'
                                                }`}
                                            >
                                                <ChevronRight size={16} />
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Flow Arrow Connectors Between Cards (Responsive) */}
                                {idx < steps.length - 1 && (
                                    <>
                                        {/* Desktop Connector Arrow between Card [idx] and Card [idx + 1] */}
                                        <div
                                            className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none items-center justify-center w-8 h-8 rounded-full"
                                            style={{
                                                filter:
                                                    isActive && activeStep === idx
                                                        ? 'drop-shadow(0 0 8px rgba(25, 181, 254, 0.6))'
                                                        : 'none',
                                            }}
                                        >
                                            <div
                                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500 border ${
                                                    isActive
                                                        ? isDark
                                                            ? 'bg-[#081126] border-[#19B5FE] text-[#19B5FE] scale-110 shadow-lg shadow-[#19B5FE]/30'
                                                            : 'bg-white border-[#0284C7] text-[#0284C7] scale-110 shadow-md shadow-sky-500/20'
                                                        : isDark
                                                        ? 'bg-[#060d1f] border-white/10 text-slate-500'
                                                        : 'bg-slate-50 border-slate-200 text-slate-400'
                                                }`}
                                            >
                                                <ChevronRight
                                                    size={14}
                                                    className={`transition-transform duration-300 ${
                                                        isActive ? 'translate-x-0.5 animate-pulse font-bold' : ''
                                                    }`}
                                                />
                                            </div>
                                        </div>

                                        {/* Mobile Connector Arrow between Card [idx] and Card [idx + 1] */}
                                        <div className="flex lg:hidden justify-center my-2 pointer-events-none">
                                            <div
                                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500 border ${
                                                    isActive
                                                        ? isDark
                                                            ? 'bg-[#081126] border-[#19B5FE] text-[#19B5FE] shadow-md shadow-[#19B5FE]/30'
                                                            : 'bg-white border-[#0284C7] text-[#0284C7] shadow-sm shadow-sky-500/20'
                                                        : isDark
                                                        ? 'bg-[#060d1f] border-white/10 text-slate-500'
                                                        : 'bg-slate-50 border-slate-200 text-slate-400'
                                                }`}
                                            >
                                                <ChevronDown
                                                    size={14}
                                                    className={isActive ? 'animate-bounce text-[#19B5FE]' : ''}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Note from Image */}
            <div className="text-center mt-12 sm:mt-16 relative z-10 px-4">
                <p
                    className={`text-xs sm:text-sm md:text-base font-normal ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                    }`}
                >
                    Cada usuario accede con los permisos adecuados:{' '}
                    <strong className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        cero fugas de información y control total del proceso.
                    </strong>
                </p>
            </div>
        </section>
    );
}
