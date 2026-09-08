'use client';

import React from 'react';
import { Search, ShieldCheck, Sparkles } from 'lucide-react';
import TrackingSearch from '@/components/public/TrackingSearch';

interface VinzerTrackingProps {
    theme?: 'dark' | 'light';
}

/**
 * Buscador público de estado del servicio.
 *
 * Antes vivía dentro del mockup decorativo del hero: sin ancla propia, sin
 * acceso desde el navbar y, en móvil, por debajo de toda la línea de tiempo
 * simulada. Ahora es una sección propia enlazable como `#seguimiento`.
 */
export function VinzerTracking({ theme = 'dark' }: VinzerTrackingProps) {
    const isLight = theme === 'light';

    return (
        <section
            id="seguimiento"
            className={`relative z-10 py-16 md:py-20 px-6 border-y transition-colors duration-500 ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#0b0a24]/50 border-white/5'
            }`}
        >
            <div className="max-w-5xl mx-auto">
                <div
                    className={`rounded-[2rem] border p-7 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center ${
                        isLight
                            ? 'bg-slate-50 border-slate-200 shadow-sm'
                            : 'bg-[#020210] border-[#19B5FE]/20 shadow-2xl shadow-[#19B5FE]/5'
                    }`}
                >
                    <div className="lg:col-span-5 space-y-4">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
                            isLight
                                ? 'bg-sky-500/10 border-sky-500/20 text-[#0284C7]'
                                : 'bg-[#19B5FE]/10 border-[#19B5FE]/30 text-[#19B5FE]'
                        }`}>
                            <Search size={12} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Consulta pública</span>
                        </div>

                        <h2 className={`text-2xl md:text-3xl font-black leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            Trazabilidad y estado de servicio en tiempo real
                        </h2>

                        <p className={`text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-[#C0C0C0]'}`}>
                            ¿Eres familiar de la mascota? Ingresa el código de seguimiento único que te entregó
                            el crematorio para conocer el estado del proceso.
                        </p>

                        <div className={`flex items-center gap-2 text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            <ShieldCheck size={14} className="shrink-0" />
                            <span>Sin registro ni inicio de sesión. Disponible en todos los planes.</span>
                        </div>
                    </div>

                    <div className="lg:col-span-7 space-y-5">
                        {/* El placeholder usa el formato REAL del verification_code:
                            10 caracteres alfanuméricos sin separadores. */}
                        <TrackingSearch
                            theme={theme}
                            layout="inline"
                            label="Código de seguimiento"
                            placeholder="Ej: SMROE2STJ4"
                            buttonLabel="Consultar estado"
                        />

                        <div className={`flex items-start gap-2.5 p-3.5 rounded-2xl border ${
                            isLight
                                ? 'bg-amber-50 border-amber-200 text-amber-900'
                                : 'bg-[#E0B84D]/5 border-[#E0B84D]/20 text-[#E0B84D]'
                        }`}>
                            <Sparkles size={14} className="shrink-0 mt-0.5" />
                            <p className="text-[11px] leading-relaxed">
                                <strong>¿Administras un crematorio?</strong> Con Vinzer las familias consultan
                                el estado del servicio en línea, sin necesidad de llamarte.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
