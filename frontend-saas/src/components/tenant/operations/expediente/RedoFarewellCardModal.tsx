"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Heart, Loader2, RefreshCw, X } from 'lucide-react';
import { apiRequest, getImageUrl } from '@/lib/tenant/api';
import { getAutoDocuments } from '@/lib/tenant/autoDocuments';
import { deleteTemplateExport, type TemplateExport } from '@/lib/tenant/imageTemplates';
import { buildFarewellConfig, DEFAULT_FAREWELL_TEXT, farewellCardDims, type FarewellConfig } from '@/lib/tenant/farewellCard';
import { useCurrentTenant } from '@/hooks/useSessionBootstrap';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { OffscreenFarewell } from '@/components/tenant/registros/OffscreenRenderers';
import { ScaledFarewell } from '@/components/tenant/registros/DocumentPreviews';

interface FarewellTemplateRow { id: number; name: string; config: Record<string, unknown> }

interface Props {
    petId: number;
    petName: string;
    dedication?: string | null;
    photos: string[];
    /** Plantilla que usa la orden (la de «Tarjeta de homenaje»). */
    defaultConfig?: Record<string, unknown> | null;
    /** Tarjeta a reemplazar (se borra al guardar la nueva si «Reemplazar» está marcado). */
    replace?: TemplateExport | null;
    onClose: () => void;
    onDone: () => void;
}

const MAX_TEXT = 1000;

/**
 * Rehacer la tarjeta de homenaje de la orden: elegir plantilla, foto y texto,
 * ver la vista previa y guardar (reemplazando la anterior o como otra versión).
 * El texto editado aquí solo cambia esta tarjeta, no la dedicatoria de la orden.
 */
export default function RedoFarewellCardModal({ petId, petName, dedication, photos, defaultConfig, replace, onClose, onDone }: Props) {
    const tenant = useCurrentTenant();
    const { showToast } = useToast();
    const { data: auto } = useQuery({ queryKey: ['tenant', 'auto-documents'], queryFn: getAutoDocuments, staleTime: 60_000 });
    const { data: allTemplates } = useQuery<FarewellTemplateRow[]>({
        queryKey: ['tenant', 'farewell-templates'],
        queryFn: () => apiRequest('/api/internal/farewell-templates'),
        staleTime: 60_000,
    });

    // Solo las plantillas que el crematorio puede usar (mismas opciones que «Documentos automáticos»)
    const templates = useMemo(() => {
        const allowed = new Set((auto?.options.digital || []).map((o) => o.id));
        return (allTemplates || []).filter((t) => allowed.has(t.id));
    }, [auto, allTemplates]);

    const [templateId, setTemplateId] = useState<number | null>(null);
    useEffect(() => {
        if (templateId === null && auto) setTemplateId(auto.resolved.digital?.id ?? templates[0]?.id ?? null);
    }, [auto, templates, templateId]);

    const [photo, setPhoto] = useState<string | null>(photos[0] || null);
    const [text, setText] = useState((dedication || '').slice(0, MAX_TEXT));
    const [replaceOld, setReplaceOld] = useState(!!replace);
    const [saving, setSaving] = useState(false);
    const [cardJob, setCardJob] = useState<{ config: FarewellConfig; resolve: (b: Blob) => void; reject: (e: Error) => void } | null>(null);
    const mounted = useRef(true);
    useEffect(() => () => { mounted.current = false; }, []);

    const chosen = templates.find((t) => t.id === templateId);
    const baseConfig = chosen?.config || (templateId === auto?.resolved.digital?.id ? auto?.resolved.digital?.config : null) || defaultConfig || null;
    const config = useMemo(
        () => buildFarewellConfig(baseConfig, { petName, dedication: text.trim() || null, photoUrl: photo }, tenant),
        [baseConfig, petName, text, photo, tenant],
    );

    const save = async () => {
        setSaving(true);
        try {
            const blob = await new Promise<Blob>((resolve, reject) => setCardJob({ config, resolve, reject }));
            const fd = new FormData();
            fd.append('kind', 'digital');
            fd.append('title', `${chosen?.name || auto?.resolved.digital?.name || 'Tarjeta de homenaje'} · ${petName}`);
            fd.append('pet_id', String(petId));
            fd.append('file', blob, 'tarjeta.png');
            await apiRequest('/api/internal/image-templates/exports/upload', { method: 'POST', body: fd });
            // La nueva ya quedó guardada: recién ahí se borra la anterior
            if (replace && replaceOld) {
                try {
                    await deleteTemplateExport(replace.id);
                } catch {
                    showToast('La tarjeta nueva se guardó, pero no se pudo borrar la anterior', 'error');
                }
            }
            showToast(replace && replaceOld ? 'Tarjeta reemplazada' : 'Tarjeta guardada', 'success');
            onDone();
            onClose();
        } catch (e) {
            showToast((e as Error)?.message || 'No se pudo guardar la tarjeta', 'error');
        } finally {
            if (mounted.current) setSaving(false);
        }
    };

    const field = 'w-full rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-violet-500/50 disabled:opacity-60';

    return createPortal(
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={saving ? undefined : onClose}>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-2">
                        <Heart size={16} className="text-rose-500" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{replace ? 'Rehacer tarjeta de homenaje' : 'Nueva tarjeta de homenaje'}</h3>
                    </div>
                    <button type="button" onClick={onClose} disabled={saving} aria-label="Cerrar"
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-50">
                        <X size={16} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-5 p-5">
                    <div className="space-y-4 text-xs">
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 dark:text-slate-300">Plantilla</label>
                            <select value={templateId ?? ''} disabled={saving || !templates.length}
                                onChange={(e) => setTemplateId(Number(e.target.value))} className={field}>
                                {!templates.length && <option value="">Cargando…</option>}
                                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>

                        {photos.length > 0 && (
                            <div className="space-y-1">
                                <label className="font-bold text-slate-600 dark:text-slate-300">Foto</label>
                                <div className="flex flex-wrap gap-2">
                                    {photos.map((p) => (
                                        <button key={p} type="button" disabled={saving} onClick={() => setPhoto(p)}
                                            className={`relative h-16 w-16 rounded-xl overflow-hidden border-2 transition ${photo === p ? 'border-violet-500' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={getImageUrl(p) || ''} alt="" className="h-full w-full object-cover" />
                                            {photo === p && <span className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-violet-600 text-white flex items-center justify-center"><Check size={10} /></span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 dark:text-slate-300 flex justify-between">
                                <span>Texto de la tarjeta</span>
                                <span className="font-normal text-slate-400 tabular-nums">{text.length}/{MAX_TEXT}</span>
                            </label>
                            <textarea rows={5} maxLength={MAX_TEXT} value={text} disabled={saving}
                                placeholder={DEFAULT_FAREWELL_TEXT}
                                onChange={(e) => setText(e.target.value)} className={`${field} resize-none leading-relaxed`} />
                            <p className="text-[11px] text-slate-500 dark:text-muted-foreground">Solo cambia esta tarjeta; la dedicatoria de la orden queda igual. Vacío = texto de la plantilla.</p>
                        </div>

                        {replace && (
                            <label className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 cursor-pointer">
                                <input type="checkbox" className="mt-0.5 accent-violet-600" checked={replaceOld} disabled={saving}
                                    onChange={(e) => setReplaceOld(e.target.checked)} />
                                <span>
                                    <b className="text-slate-800 dark:text-white">Reemplazar la tarjeta actual</b>
                                    <span className="block text-[11px] text-slate-500 dark:text-muted-foreground">La anterior se borra al guardar la nueva. Desmárcalo para conservar ambas.</span>
                                </span>
                            </label>
                        )}
                    </div>

                    <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">Vista previa</p>
                        <div style={{ aspectRatio: (() => { const d = farewellCardDims(config.format || '1:1'); return `${d.width} / ${d.height}`; })() }}
                            className="relative w-full max-h-[60vh] mx-auto rounded-2xl overflow-hidden bg-slate-100 dark:bg-black/30 ring-1 ring-slate-200 dark:ring-white/10">
                            {baseConfig || templates.length ? <ScaledFarewell config={config} /> : (
                                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground"><Loader2 size={18} className="animate-spin" /></div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 px-5 pb-5">
                    <button type="button" onClick={onClose} disabled={saving}
                        className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-sm font-bold disabled:opacity-50">
                        Cancelar
                    </button>
                    <button type="button" onClick={save} disabled={saving || !templateId}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-black disabled:opacity-40">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        {replace && replaceOld ? 'Reemplazar tarjeta' : 'Guardar tarjeta'}
                    </button>
                </div>
            </div>
            {cardJob && (
                <OffscreenFarewell config={cardJob.config}
                    onDone={(b) => { const j = cardJob; setCardJob(null); j.resolve(b); }}
                    onError={(e) => { const j = cardJob; setCardJob(null); j.reject(e); }} />
            )}
        </div>,
        document.body,
    );
}
