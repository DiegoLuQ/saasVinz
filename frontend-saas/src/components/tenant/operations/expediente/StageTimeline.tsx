"use client";

import React, { useState } from 'react';
import { CheckCircle2, CircleDot, Circle, Images, ChevronDown, X, User, Clock, Camera, Plus, Loader2, Check } from 'lucide-react';
import { apiRequest, getImageUrl } from '@/lib/tenant/api';
import { compressEvidencePhoto } from '@/lib/clientImageCompressor';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

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

interface StageTimelineProps {
    stages: Stage[];
    orderId?: number;
    canEdit?: boolean;
    onEvidenceAdded?: () => void;
}

/** Etapas del servicio: estado, fecha/hora, responsable y evidencia de cada una (con subida rápida). */
export default function StageTimeline({ stages, orderId, canEdit = false, onEvidenceAdded }: StageTimelineProps) {
    const { showToast } = useToast();
    const [open, setOpen] = useState<number | null>(null);
    const [addingForStep, setAddingForStep] = useState<number | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [note, setNote] = useState('');
    const [uploading, setUploading] = useState(false);
    const [lightbox, setLightbox] = useState<string | null>(null);

    const done = stages.filter((s) => s.state === 'completado').length;

    const resetAddForm = () => {
        if (photoPreview) URL.revokeObjectURL(photoPreview);
        setPhotoFile(null);
        setPhotoPreview(null);
        setNote('');
        setAddingForStep(null);
    };

    const handleFileSelect = (file: File) => {
        if (photoPreview) URL.revokeObjectURL(photoPreview);
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleSaveEvidence = async (stepId: number) => {
        if (!orderId) return;
        if (!photoFile && !note.trim()) {
            showToast('Agrega una foto o escribe una nota de evidencia', 'info');
            return;
        }
        setUploading(true);
        try {
            const formData = new FormData();
            if (photoFile) formData.append('photo', await compressEvidencePhoto(photoFile));
            formData.append('comments', JSON.stringify(note.trim() ? [note.trim()] : []));
            await apiRequest(`/api/internal/operations/ops/evidence?cremation_id=${orderId}&step_id=${stepId}`, {
                method: 'POST',
                body: formData,
            });
            showToast('Evidencia registrada en la etapa', 'success');
            resetAddForm();
            setOpen(stepId);
            onEvidenceAdded?.();
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'No se pudo subir la evidencia', 'error');
        } finally {
            setUploading(false);
        }
    };

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
                    const isAdding = addingForStep === st.step_id;
                    const last = i === stages.length - 1;
                    const canAddEvidenceHere = canEdit && !!orderId && (st.state === 'en_curso' || st.state === 'completado');

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
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className={`text-xs leading-snug ${st.state === 'pendiente' ? 'text-slate-400 dark:text-muted-foreground' : 'text-slate-900 dark:text-white font-semibold'}`}>
                                            {st.name}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                            {st.state === 'en_curso' && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 dark:text-blue-300 dark:bg-blue-500/10 dark:border-blue-500/20 px-1.5 py-0.5 rounded">
                                                    <Clock size={10} /> En curso
                                                </span>
                                            )}
                                            {st.completed_by && (
                                                <span className="text-[10px] text-slate-500 dark:text-muted-foreground inline-flex items-center gap-1">
                                                    <User size={10} /> {st.completed_by}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {when && (
                                            <div className="text-right leading-tight mr-1">
                                                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{when.date}</p>
                                                <p className="text-[10px] text-slate-500 dark:text-muted-foreground tabular-nums">
                                                    {st.state === 'en_curso' ? 'desde ' : ''}{when.time}
                                                </p>
                                            </div>
                                        )}

                                        {canAddEvidenceHere && !isAdding && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    resetAddForm();
                                                    setAddingForStep(st.step_id);
                                                }}
                                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                                                    st.state === 'en_curso'
                                                        ? 'bg-blue-500/10 text-blue-700 border-blue-500/25 hover:bg-blue-500/20 dark:text-blue-300'
                                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-300 dark:border-white/10'
                                                }`}
                                                title="Subir foto o nota de evidencia en esta etapa"
                                            >
                                                <Camera size={11} />
                                                <span>{st.state === 'en_curso' ? 'Subir evidencia' : '+'}</span>
                                            </button>
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

                                {/* Formulario rápido para subir evidencia */}
                                {isAdding && (
                                    <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 dark:bg-black/30 dark:border-white/10 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                                <Camera size={13} className="text-primary" /> Registrar evidencia · {st.name}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={resetAddForm}
                                                disabled={uploading}
                                                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>

                                        <div className="flex items-start gap-2.5">
                                            {photoPreview ? (
                                                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-primary shrink-0">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={photoPreview} alt="Vista previa" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (photoPreview) URL.revokeObjectURL(photoPreview);
                                                            setPhotoFile(null);
                                                            setPhotoPreview(null);
                                                        }}
                                                        className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5"
                                                    >
                                                        <X size={11} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-slate-500 dark:text-slate-300 cursor-pointer shrink-0 transition">
                                                    <Plus size={15} />
                                                    <span className="text-[9px] font-bold">Foto</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleFileSelect(file);
                                                            e.target.value = '';
                                                        }}
                                                    />
                                                </label>
                                            )}

                                            <textarea
                                                value={note}
                                                onChange={(e) => setNote(e.target.value)}
                                                rows={2}
                                                placeholder="Comentario u observación de la etapa (opcional si subes foto)…"
                                                className="flex-1 rounded-lg px-2.5 py-1.5 text-xs bg-white border border-slate-200 text-slate-900 outline-none focus:border-primary/50 dark:bg-black/20 dark:border-white/10 dark:text-white resize-none"
                                            />
                                        </div>

                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={resetAddForm}
                                                disabled={uploading}
                                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleSaveEvidence(st.step_id)}
                                                disabled={uploading || (!photoFile && !note.trim())}
                                                className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-40"
                                            >
                                                {uploading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                Guardar evidencia
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Evidencia de la etapa */}
                                {isOpen && evidence.length > 0 && (
                                    <div className="mt-2.5 space-y-2">
                                        {evidence.map((ev, k) => {
                                            const t = fmt(ev.at);
                                            return (
                                                <div key={k} className="flex gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200 dark:bg-black/20 dark:border-white/5">
                                                    {ev.photo_url ? (
                                                        <button type="button" onClick={() => setLightbox(getImageUrl(ev.photo_url!) || null)} className="shrink-0 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 hover:opacity-90" title="Ampliar">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={lightbox} alt="Evidencia" className="max-w-full max-h-full rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
}
