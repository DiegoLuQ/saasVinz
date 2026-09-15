'use client';

import React from 'react';
import Image from 'next/image';
import { Search, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import TrackingSearch from '@/components/public/TrackingSearch';
import { VinzerTrackingDemo } from './VinzerTrackingDemo';

interface VinzerTrackingProps {
    theme?: 'dark' | 'light';
}

/**
 * Sección de Trazabilidad y Consulta Pública con Mockup Móvil.
 * Muestra el teléfono con la interfaz de seguimiento en vivo junto con
 * el buscador interactivo para las familias.
 */
export function VinzerTracking({ theme = 'dark' }: VinzerTrackingProps) {
    const isLight = theme === 'light';

    return (
        <section
            id="trazabilidad"
            className={`relative z-10 py-16 md:py-24 px-4 sm:px-6 border-y transition-colors duration-500 overflow-hidden ${
                isLight
                    ? 'bg-gradient-to-b from-white via-slate-50/60 to-white border-slate-200'
                    : 'bg-gradient-to-b from-[#0b0a24]/50 via-[#020210] to-[#0b0a24]/40 border-white/5'
            }`}
        >
            <div id="seguimiento" className="sr-only" />

            <div className="max-w-7xl mx-auto">
                <div
                    className={`rounded-[2.5rem] border p-7 sm:p-10 lg:p-12 relative overflow-hidden transition-all duration-500 ${
                        isLight
                            ? 'bg-white border-slate-200/90 shadow-2xl shadow-slate-200/70'
                            : 'bg-gradient-to-br from-[#0c0d29]/90 to-[#030314]/95 border-[#19B5FE]/20 shadow-2xl shadow-black/50'
                    }`}
                >
                    {/* Resplandor decorativo de fondo */}
                    <div
                        className={`absolute -right-24 -bottom-24 w-96 h-96 rounded-full blur-[140px] pointer-events-none -z-10 ${
                            isLight ? 'bg-sky-500/10' : 'bg-[#19B5FE]/10'
                        }`}
                    />
                    <div
                        className={`absolute -left-20 -top-20 w-80 h-80 rounded-full blur-[140px] pointer-events-none -z-10 ${
                            isLight ? 'bg-amber-500/5' : 'bg-[#E0B84D]/5'
                        }`}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                        {/* Columna Izquierda: Información y Buscador Interactivo */}
                        <div className="lg:col-span-7 space-y-6">
                            {/* Badge */}
                            <div
                                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-xs ${
                                    isLight
                                        ? 'bg-sky-50 border-sky-200 text-[#0284C7]'
                                        : 'bg-[#19B5FE]/10 border-[#19B5FE]/30 text-[#19B5FE]'
                                }`}
                            >
                                <Search size={13} />
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    Portal público de trazabilidad
                                </span>
                            </div>

                            {/* Título H2 (SEO) */}
                            <h2
                                className={`text-3xl sm:text-4xl lg:text-[38px] font-black tracking-tight leading-[1.15] ${
                                    isLight ? 'text-slate-900' : 'text-white'
                                }`}
                            >
                                Seguimiento de la cremación
                            </h2>

                            {/* Descripción */}
                            <p
                                className={`text-sm sm:text-base font-normal leading-relaxed ${
                                    isLight ? 'text-slate-600' : 'text-slate-300'
                                }`}
                            >
                                Cada servicio genera un enlace privado y código único de verificación. Los tutores
                                comprueban cada fase del proceso —recepción, custodia y entrega de cenizas— con
                                evidencia fotográfica inalterable, sin registros ni llamadas.
                            </p>

                            {/* Píldoras de valor y micro-confianza */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div
                                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold ${
                                        isLight
                                            ? 'bg-slate-50 border-slate-200 text-slate-700'
                                            : 'bg-white/5 border-white/10 text-slate-200'
                                    }`}
                                >
                                    <CheckCircle2 size={16} className={isLight ? 'text-sky-600' : 'text-[#19B5FE]'} />
                                    <span>Evidencia fotográfica en cada etapa</span>
                                </div>
                                <div
                                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold ${
                                        isLight
                                            ? 'bg-slate-50 border-slate-200 text-slate-700'
                                            : 'bg-white/5 border-white/10 text-slate-200'
                                    }`}
                                >
                                    <ShieldCheck size={16} className={isLight ? 'text-sky-600' : 'text-[#19B5FE]'} />
                                    <span>Sin contraseñas ni apps que instalar</span>
                                </div>
                            </div>

                            {/* Buscador de Prueba Interactivo */}
                            <div
                                className={`p-5 sm:p-6 rounded-2xl border ${
                                    isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-white/[0.03] border-white/10'
                                }`}
                            >
                                <TrackingSearch
                                    theme={theme}
                                    layout="inline"
                                    label="Prueba el portal con un código de seguimiento:"
                                    placeholder="Ej: SMROE2STJ4"
                                    buttonLabel="Consultar estado"
                                />
                            </div>

                            {/* Aviso de valor para dueños de crematorios */}
                            <div
                                className={`flex items-start gap-3 p-4 rounded-2xl border ${
                                    isLight
                                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-900'
                                        : 'bg-[#E0B84D]/10 border-[#E0B84D]/20 text-[#E0B84D]'
                                }`}
                            >
                                <Sparkles size={16} className="shrink-0 mt-0.5" />
                                <p className="text-xs leading-relaxed">
                                    <strong>¿Administras un crematorio?</strong> Ofrece a cada familia una experiencia
                                    solemne, moderna y con tu propia marca. Cero incertidumbre, máxima reputación.
                                </p>
                            </div>
                        </div>

                        {/* Columna Derecha: Mockup del Smartphone */}
                        <div className="lg:col-span-5 flex justify-center items-center relative py-4 lg:py-0">
                            <div className="relative group max-w-[320px] sm:max-w-[360px] lg:max-w-[400px] w-full">
                                {/* Resplandor ambiental posterior */}
                                <div
                                    className={`absolute inset-0 -m-6 rounded-full blur-3xl opacity-50 transition-opacity duration-500 group-hover:opacity-75 pointer-events-none ${
                                        isLight
                                            ? 'bg-gradient-to-tr from-sky-400/25 to-teal-300/20'
                                            : 'bg-gradient-to-tr from-[#19B5FE]/25 to-emerald-400/15'
                                    }`}
                                />

                                {/* Mockup Image */}
                                <div className="relative z-10 flex justify-center transition-transform duration-500 hover:scale-[1.02]">
                                    <Image
                                        src="/images/MockupVinzer_comprimido.webp"
                                        alt="Mockup del portal de trazabilidad y seguimiento móvil de Vinzer"
                                        width={430}
                                        height={860}
                                        className="w-full h-auto max-h-[520px] sm:max-h-[580px] lg:max-h-[600px] object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.22)] select-none"
                                        priority
                                    />
                                </div>

                                {/* Floating Tag decorativa */}
                                <div
                                    className={`absolute -bottom-2 -left-2 sm:-left-4 z-20 px-4 py-2.5 rounded-2xl border shadow-xl backdrop-blur-md flex items-center gap-2.5 ${
                                        isLight
                                            ? 'bg-white/95 border-slate-200/90 text-slate-800'
                                            : 'bg-[#020210]/95 border-[#19B5FE]/30 text-white'
                                    }`}
                                >
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                                    </span>
                                    <div className="text-left">
                                        <p className="text-[9px] font-black uppercase tracking-wider text-emerald-500">
                                            Vista en vivo
                                        </p>
                                        <p className="text-xs font-bold leading-none">Seguimiento familiar</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Demostración interactiva de trazabilidad paso a paso */}
                <div className="mt-14 sm:mt-18 lg:mt-20">
                    <VinzerTrackingDemo theme={theme} />
                </div>
            </div>
        </section>
    );
}
