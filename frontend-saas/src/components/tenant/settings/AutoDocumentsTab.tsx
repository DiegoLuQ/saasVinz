'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, Heart, Sparkles, Loader2, Save, Wand2 } from 'lucide-react';
import { getAutoDocuments, saveAutoDocuments, type AutoDocKind, type AutoDocumentsSettings } from '@/lib/tenant/autoDocuments';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { AutoDocPreviews } from './AutoDocPreviews';

const selectCls = 'w-full bg-white border border-slate-300 text-slate-900 dark:bg-black/20 dark:border-white/10 dark:text-white rounded-xl py-2.5 px-3 text-sm outline-none focus:border-primary/50 transition-all';

const ROWS: { kind: AutoDocKind; title: string; hint: string; icon: typeof Award }[] = [
    { kind: 'certificate', title: 'Certificado de cremación', hint: 'Se genera y queda en el Repositorio de documentos.', icon: Award },
    { kind: 'digital', title: 'Imagen digital (tarjeta de homenaje)', hint: 'Con el nombre, la dedicatoria y la foto de la mascota. Queda en «Mis diseños generados».', icon: Heart },
    { kind: 'social', title: 'Imagen para redes sociales', hint: 'Si la plantilla usa IA (texto o ilustración), consume 1 crédito IA por diseño.', icon: Sparkles },
];

/**
 * Configuración de «Generar todo» del detalle de un registro: qué documentos se
 * crean al procesarlo y con qué plantilla.
 */
export function AutoDocumentsTab() {
    const { showToast } = useToast();
    const qc = useQueryClient();
    const { data, isLoading, error } = useQuery({ queryKey: ['tenant', 'auto-documents'], queryFn: getAutoDocuments });
    // Cambios sin guardar; null = lo guardado en el servidor.
    const [draft, setDraft] = useState<AutoDocumentsSettings | null>(null);
    const form = draft ?? data?.settings ?? null;

    const save = useMutation({
        mutationFn: (s: AutoDocumentsSettings) => saveAutoDocuments(s),
        onSuccess: (d) => {
            qc.setQueryData(['tenant', 'auto-documents'], d);
            setDraft(null);
            showToast('Configuración guardada', 'success');
        },
        onError: (e: Error) => showToast(e.message || 'No se pudo guardar', 'error'),
    });

    if (isLoading || !form) return <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-primary" size={28} /></div>;
    if (error || !data) return <p className="text-sm text-red-500">{(error as Error)?.message || 'No se pudo cargar la configuración'}</p>;

    const update = (kind: AutoDocKind, patch: Partial<AutoDocumentsSettings[AutoDocKind]>) =>
        setDraft(prev => {
            const base = prev ?? data.settings;
            return { ...base, [kind]: { ...base[kind], ...patch } };
        });

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="border-b border-white/5 pb-6">
                <h3 className="text-xl font-bold flex items-center gap-2"><Wand2 size={20} className="text-primary" /> Documentos automáticos</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Al usar «Generar todo» en un registro se crean el cliente, la mascota y la orden, y luego estos documentos con las plantillas que elijas aquí.
                </p>
            </div>

            <div className="space-y-4">
                {ROWS.map(({ kind, title, hint, icon: Icon }) => {
                    const s = form[kind];
                    const opts = data.options[kind];
                    const def = kind === 'social' ? null : data.defaults[kind];
                    const chosenSocial = kind === 'social' ? opts.find(o => o.id === s.template_id) : null;
                    return (
                        <div key={kind} className={`glass-card p-4 sm:p-5 rounded-3xl border-white/5 space-y-3 ${s.enabled ? '' : 'opacity-70'}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0"><Icon size={18} /></div>
                                    <div className="min-w-0">
                                        <p className="font-bold leading-snug">{title}</p>
                                        <p className="hidden sm:block text-xs text-muted-foreground mt-0.5">{hint}</p>
                                    </div>
                                </div>
                                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer shrink-0 py-1">
                                    <input type="checkbox" checked={s.enabled} onChange={(e) => update(kind, { enabled: e.target.checked })}
                                        className="w-4 h-4 accent-emerald-500" />
                                    Incluir
                                </label>
                            </div>
                            {/* En celular la explicación va a todo el ancho, bajo el título. */}
                            <p className="sm:hidden text-xs text-muted-foreground -mt-1">{hint}</p>
                            {s.enabled && (
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1.5">Plantilla</label>
                                    <select value={s.template_id ?? ''} className={selectCls}
                                        onChange={(e) => update(kind, { template_id: e.target.value ? Number(e.target.value) : null })}>
                                        {kind === 'social'
                                            ? <option value="">Elige una plantilla…</option>
                                            : <option value="">Predeterminada{def ? ` (${def.name})` : ''}</option>}
                                        {opts.map(o => (
                                            <option key={o.id} value={o.id}>
                                                {o.name}{o.global ? '' : ' · exclusiva'}{o.has_ai_text || o.has_ai_image ? ' · usa IA' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {kind === 'social' && chosenSocial && (chosenSocial.has_ai_text || chosenSocial.has_ai_image) && (
                                        <p className="text-[11px] text-violet-600 dark:text-violet-300 mt-2">
                                            Esta plantilla genera {[chosenSocial.has_ai_text && 'texto', chosenSocial.has_ai_image && 'ilustración'].filter(Boolean).join(' e ')} con IA:
                                            cada registro procesado usará 1 crédito IA (se avisa antes de generar).
                                        </p>
                                    )}
                                </div>
                            )}
                            {s.enabled && (
                                <div className="pt-3 border-t border-slate-100 dark:border-white/5">
                                    <AutoDocPreviews kind={kind} auto={data} selectedTemplateId={s.template_id} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-end">
                <button onClick={() => save.mutate(form)} disabled={save.isPending}
                    className="w-full sm:w-auto justify-center bg-primary text-primary-foreground font-bold py-2.5 px-7 rounded-xl flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-60 shadow-lg shadow-primary/20 cursor-pointer">
                    {save.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {save.isPending ? 'Guardando…' : 'Guardar cambios'}
                </button>
            </div>
        </div>
    );
}
