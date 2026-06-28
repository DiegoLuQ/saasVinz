"use client";

import React from 'react';
import { ArrowLeft, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { statusLabels, statusColors } from '@/lib/tenant/orders/types';
import type { Cremation } from '@/lib/tenant/orders/types';

interface SectionInfo {
    complete: boolean;
    label: string;
}

interface FormHeaderProps {
    editId: string | null;
    currentCremation: Partial<Cremation>;
    sectionStatus: Record<string, SectionInfo>;
    onBack: () => void;
    onScrollTo?: (sectionId: string) => void;
}

export default function FormHeader({ editId, currentCremation, sectionStatus, onBack, onScrollTo }: FormHeaderProps) {
    const sections = Object.entries(sectionStatus);
    const completedCount = sections.filter(([, s]) => s.complete).length;
    const totalCount = sections.length;
    const progressPercent = Math.round((completedCount / totalCount) * 100);

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <button
                        onClick={onBack}
                        className="flex items-center text-muted-foreground hover:text-white transition-colors mb-4"
                    >
                        <ArrowLeft size={18} className="mr-2" />
                        Volver a la lista
                    </button>
                    <h1 className="text-4xl font-black tracking-tight text-white mb-2">
                        {editId ? 'Editar Orden' : 'Nueva Orden'}
                        <span className="text-primary ml-2">.</span>
                    </h1>
                    <p className="text-muted-foreground font-medium max-w-xl">
                        {editId
                            ? 'Gestiona y actualiza todos los detalles técnicos y comerciales de esta orden de servicio.'
                            : 'Configura una nueva orden de servicio detallando el paciente, la logística y los servicios contratados.'}
                    </p>
                </div>

                {/* Quick Status Bar */}
                <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10 shrink-0">
                    {/* OC Number */}
                    {currentCremation?.oc_number && (
                        <div className="px-4 py-2 border-r border-white/10">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">OC #</p>
                            <div className="text-xl font-black text-white leading-none mt-1">
                                {String(currentCremation.oc_number).padStart(4, '0')}
                            </div>
                        </div>
                    )}

                    {/* Verification Code */}
                    {currentCremation?.verification_code && (
                        <div className="px-4 py-2 border-r border-white/10">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Código</p>
                            <div className="text-sm font-black text-primary tracking-widest uppercase font-mono mt-1">
                                {currentCremation.verification_code}
                            </div>
                        </div>
                    )}

                    {/* Current Status */}
                    <div className="px-4 py-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Estado Actual</p>
                        <div className={`text-xs font-black uppercase px-2 py-1 rounded-lg ${statusColors[currentCremation?.status || 'pendiente'] || 'bg-gray-500/10 text-gray-400'}`}>
                            {statusLabels[currentCremation?.status || 'pendiente']}
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Indicator Bar */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4" role="status" aria-label={`Progreso del formulario: ${completedCount} de ${totalCount} secciones completadas`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="relative w-8 h-8">
                            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/5" />
                                <circle
                                    cx="18" cy="18" r="15"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeDasharray={`${progressPercent} ${100 - progressPercent}`}
                                    strokeLinecap="round"
                                    className={progressPercent === 100 ? 'text-primary' : 'text-primary/60'}
                                    style={{ transition: 'stroke-dasharray 0.5s ease' }}
                                />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white">
                                {progressPercent}%
                            </span>
                        </div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                            {completedCount === totalCount ? 'Listo para enviar' : `${completedCount}/${totalCount} completado`}
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {sections.map(([key, section]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => onScrollTo?.(key)}
                            className={`
                                flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider
                                transition-all duration-300 cursor-pointer
                                ${section.complete
                                    ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
                                    : 'bg-white/5 text-muted-foreground border border-white/5 hover:bg-white/10 hover:text-white'
                                }
                            `}
                        >
                            {section.complete ? (
                                <CheckCircle2 size={12} className="text-primary" />
                            ) : (
                                <Circle size={12} className="text-muted-foreground/40" />
                            )}
                            {section.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
