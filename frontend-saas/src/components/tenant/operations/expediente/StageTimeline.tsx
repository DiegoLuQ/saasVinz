"use client";

import React, { useState } from 'react';
import { CheckCircle2, CircleDot, Circle, Images, ChevronDown, X, User, Clock } from 'lucide-react';
import { getImageUrl } from '@/lib/tenant/api';

export type StageEvidence = { photo_url?: string | null; comments: string[]; at?: string | null };
export type Stage = {
    step_id: number;
    name: string;
    state: 'completado' | 'en_curso' | 'pendiente';
    completed_at?: string | null;
    completed_by?: string | null;
    started_at?: string | null;
    evidence?: StageEvidence[];
};

const fmt = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return {
        date: d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    };
};

/** Etapas del servicio: estado, fecha/hora, responsable y evidencia de cada una. */
export default function StageTimeline({ stages }: { stages: Stage[] }) {
    const [open, setOpen] = useState<number | null>(null);
    const [lightbox, setLightbox] = useState<string | null>(null);
    const done = stages.filter((s) => s.state === 'completado').length;

    return (
        <div className="rounded-2xl bg-white border border-slate-200 dark:bg-white/5 dark:border-white/10 overflow-hidden">
            {/* Progreso */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${stages.length ? (done / stages.length) * 100 : 0}%` }} />
                </div>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 tabular-nums">{done} de {stages.length}</span>
            </div>

            <ol className="px-4 py-2">
                {stages.map((st, i) => {
                    const when = fmt(st.state === 'completado' ? st.completed_at : st.state === 'en_curso' ? st.started_at : null);
                    const evidence = (st.evidence || []).filter((e) => e.photo_url || e.comments.length);
                    const photos = evidence.filter((e) => e.photo_url).length;
                    const isOpen = open === st.step_id;
                    const last = i === stages.length - 1;

                    return (
                        <li key={st.step_id} className="relative flex gap-3">
                            {/* Línea del stepper */}
                            {!last && (
                                <span className={`absolute left-[9px] top-7 bottom-0 w-px ${st.state === 'completado' ? 'bg-emerald-300 dark:bg-emerald-500/40' : 'bg-slate-200 dark:bg-white/10'}`} />
                            )}
                            <span className="relative z-10 mt-2.5 shrink-0 bg-white dark:bg-transparent rounded-full">
                                {st.state === 'completado' ? <CheckCircle2 size={19} className="text-emerald-600 dark:text-emerald-400" />
                                    : st.state === 'en_curso' ? <CircleDot size={19} className="text-blue-600 dark:text-blue-400" />
                                    : <Circle size={19} className="text-slate-300 dark:text-white/20" />}
                            </span>

                            <div className={`min-w-0 flex-1 py-2.5 ${!last ? 'border-b border-slate-100 dark:border-white/5' : ''}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className={`text-xs leading-snug ${st.state === 'pendiente' ? 'text-slate-400 dark:text-muted-foreground' : 'text-slate-900 dark:text-white font-semibold'}`}>
                                            {st.name}
                                        </p>
                                        {st.state === 'en_curso' && (
                                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 dark:text-blue-300 dark:bg-blue-500/10 dark:border-blue-500/20 px-1.5 py-0.5 rounded">
                                                <Clock size={10} /> En curso
                                            </span>
                                        )}
                                        {st.completed_by && (
                                            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-muted-foreground flex items-center gap-1">
                                                <User size={10} /> {st.completed_by}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {when && (
                                            <div className="text-right leading-tight">
                                                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{when.date}</p>
                                                <p className="text-[10px] text-slate-500 dark:text-muted-foreground tabular-nums">
                                                    {st.state === 'en_curso' ? 'desde ' : ''}{when.time}
                                                </p>
                                            </div>
                                        )}
                                        {evidence.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setOpen(isOpen ? null : st.step_id)}
                                                aria-expanded={isOpen}
                                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition ${isOpen
                                                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-200 dark:border-white/10 dark:hover:bg-white/10'}`}
                                                title="Ver evidencia de esta etapa"
                                            >
                                                <Images size={12} /> {photos > 0 ? photos : evidence.length}
                                                <ChevronDown size={11} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Evidencia de la etapa */}
                                {isOpen && (
                                    <div className="mt-2.5 space-y-2">
                                        {evidence.map((ev, k) => {
                                            const t = fmt(ev.at);
                                            return (
                                                <div key={k} className="flex gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200 dark:bg-black/20 dark:border-white/5">
                                                    {ev.photo_url ? (
                                                        <button type="button" onClick={() => setLightbox(getImageUrl(ev.photo_url!) || null)} className="shrink-0 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 hover:opacity-90" title="Ampliar">
                                                            <img src={getImageUrl(ev.photo_url) || ''} alt={`Evidencia ${st.name}`} className="w-16 h-16 object-cover" />
                                                        </button>
                                                    ) : null}
                                                    <div className="min-w-0 flex-1">
                                                        {t && <p className="text-[10px] text-slate-500 dark:text-muted-foreground tabular-nums">{t.date} · {t.time}</p>}
                                                        {ev.comments.length > 0 ? (
                                                            ev.comments.map((c, j) => <p key={j} className="text-[11px] text-slate-700 dark:text-slate-200 leading-snug">{c}</p>)
                                                        ) : (
                                                            <p className="text-[11px] text-slate-400 dark:text-muted-foreground italic">Sin comentario</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ol>

            {/* Visor de imagen */}
            {lightbox && (
                <div className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
                    <button type="button" className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Cerrar">
                        <X size={20} />
                    </button>
                    <img src={lightbox} alt="Evidencia" className="max-w-full max-h-full rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
}
