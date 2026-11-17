'use client';

import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Crown, Loader2, Lock, Palette, Save, Sparkles } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { TRACKING_TEMPLATES, normalizeTrackingTemplate, type TrackingTemplateId } from '@/lib/trackingTemplates';

interface TrackingDesignResponse {
    active_template: TrackingTemplateId;
    tenant_template: string | null;
    global_default: TrackingTemplateId;
    available: boolean;
}

interface TrackingDesignTabProps {
    onNavigateToBilling: () => void;
}

const QUERY_KEY = ['tracking-design-config'];

export function TrackingDesignTab({ onNavigateToBilling }: TrackingDesignTabProps) {
    const { showToast } = useToast();
    const qc = useQueryClient();

    const { data, isLoading } = useQuery<TrackingDesignResponse>({
        queryKey: QUERY_KEY,
        queryFn: () => apiRequest('/api/internal/operations/tracking-design-config'),
    });

    const [selected, setSelected] = useState<TrackingTemplateId>('classic');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!data) return;
        setSelected(normalizeTrackingTemplate(data.active_template, data.global_default));
    }, [data]);

    if (isLoading || !data) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin" /> Cargando diseño de seguimiento...
            </div>
        );
    }

    const canCustomize = data.available;
    const currentSaved = normalizeTrackingTemplate(data.active_template, data.global_default);
    const dirty = canCustomize && selected !== currentSaved;

    const handleSave = async () => {
        if (!canCustomize) return;
        setSaving(true);
        try {
            await apiRequest('/api/internal/operations/tracking-design-config', {
                method: 'PUT',
                body: JSON.stringify({ tracking_template: selected }),
            });
            await qc.invalidateQueries({ queryKey: QUERY_KEY });
            showToast('Diseño de página de seguimiento actualizado', 'success');
        } catch (err: any) {
            showToast(err?.message || 'No se pudo guardar el diseño', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2.5">
                        <Palette className="text-primary" size={22} />
                        Diseño de Página de Seguimiento
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Elige cómo ven las familias el seguimiento en vivo de su mascota. La información y las etapas no
                        cambian; solo se adapta la experiencia visual.
                    </p>
                </div>

                {canCustomize && (
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !dirty}
                        className={`shrink-0 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
                            dirty
                                ? 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20'
                                : 'bg-slate-200 text-slate-400 dark:bg-white/10 dark:text-white/40 cursor-not-allowed'
                        }`}
                    >
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        {saving ? 'Guardando...' : 'Guardar Diseño'}
                    </button>
                )}
            </div>

            {!canCustomize && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500 shrink-0">
                            <Crown size={18} />
                        </div>
                        <div>
                            <p className="font-bold text-sm">Tu plan actual usa el diseño predeterminado</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Los planes <strong>PRO</strong> y <strong>ULTRA</strong> permiten elegir libremente entre los 3
                                diseños de seguimiento para personalizar la experiencia de tus familias.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onNavigateToBilling}
                        className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors"
                    >
                        Mejorar a PRO
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {TRACKING_TEMPLATES.map((tpl) => {
                    const isDefault = tpl.id === data.global_default;
                    const isLocked = !canCustomize && !isDefault;
                    const isActive = canCustomize ? selected === tpl.id : isDefault;

                    return (
                        <button
                            key={tpl.id}
                            type="button"
                            disabled={isLocked}
                            onClick={() => {
                                if (!isLocked) setSelected(tpl.id);
                            }}
                            className={`text-left rounded-3xl border p-4 transition-all flex flex-col justify-between gap-4 relative ${
                                isActive
                                    ? 'border-primary bg-primary/[0.06] ring-2 ring-primary/25'
                                    : isLocked
                                        ? 'border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] opacity-75 cursor-not-allowed'
                                        : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] hover:border-primary/40'
                            }`}
                        >
                            <div className="space-y-3 w-full">
                                {/* Miniatura visual */}
                                <div className={`h-32 rounded-2xl border p-3.5 flex flex-col justify-between relative overflow-hidden ${tpl.bgPreview} ${tpl.cardPreview}`}>
                                    <div className="flex items-center justify-between">
                                        <span className="w-7 h-7 rounded-full shadow-xs" style={{ backgroundColor: tpl.accentColor }} />
                                        <span
                                            className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white"
                                            style={{ backgroundColor: tpl.accentColor }}
                                        >
                                            {tpl.id === data.global_default ? 'Por defecto' : tpl.badge}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="h-2.5 w-3/4 rounded-full opacity-40" style={{ backgroundColor: tpl.accentColor }} />
                                        <div className="h-2 w-1/2 rounded-full opacity-25" style={{ backgroundColor: tpl.accentColor }} />
                                    </div>

                                    {isLocked && (
                                        <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1.5px] flex items-center justify-center">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 text-white text-[11px] font-bold border border-white/15">
                                                <Lock size={12} className="text-amber-400" /> PRO / ULTRA
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h3 className="font-bold text-sm">{tpl.name}</h3>
                                        <p className="text-[11px] text-muted-foreground">{tpl.subtitle}</p>
                                    </div>
                                    {isActive && <CheckCircle2 size={18} className="text-primary shrink-0" />}
                                </div>

                                <p className="text-xs text-muted-foreground leading-relaxed">{tpl.description}</p>
                            </div>

                            <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[11px] font-bold">
                                <span className="text-muted-foreground">
                                    {isDefault ? 'Predeterminado' : 'Diseño premium'}
                                </span>
                                <span className={isActive ? 'text-primary flex items-center gap-1' : isLocked ? 'text-amber-500 flex items-center gap-1' : 'text-muted-foreground'}>
                                    {isActive ? (
                                        <><Sparkles size={12} /> Activo</>
                                    ) : isLocked ? (
                                        <><Lock size={11} /> Bloqueado</>
                                    ) : (
                                        'Seleccionar'
                                    )}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
