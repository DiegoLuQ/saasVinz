"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Award, Check, Heart, Loader2, Sparkles, Wand2, X } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { getAutoDocuments } from '@/lib/tenant/autoDocuments';
import { getAiSession, getAiUsage, type TemplateExport } from '@/lib/tenant/imageTemplates';
import { buildFarewellConfig, type FarewellConfig } from '@/lib/tenant/farewellCard';
import { useCurrentTenant } from '@/hooks/useSessionBootstrap';
import { useFeatures } from '@/hooks/useFeatures';
import { OffscreenFarewell } from '@/components/tenant/registros/OffscreenRenderers';

type Kind = 'certificate' | 'digital' | 'social';
type RunState = 'idle' | 'running' | 'done' | 'queued' | 'error' | 'skipped';

interface Props {
    orderId: number;
    petId: number;
    petName: string;
    dedication?: string | null;
    photoUrl?: string | null;
    /** Configuración de la tarjeta que muestra la orden (la misma de «Tarjeta de homenaje»). */
    farewellTemplateConfig?: Record<string, unknown> | null;
    certificate: { enabled: boolean; issued: number };
    /** Fechas de la ficha que el certificado usa y faltan (ya en texto). */
    certMissing?: string[];
    existing: TemplateExport[];
    socialJobActive: boolean;
    onClose: () => void;
    /** Se llama al terminar (refrescar la orden, imágenes y tareas). */
    onFinished: () => void;
}

const LABEL: Record<Kind, string> = {
    certificate: 'Certificado de cremación',
    digital: 'Tarjeta de homenaje',
    social: 'Imagen para redes',
};
const ICON: Record<Kind, React.ElementType> = { certificate: Award, digital: Heart, social: Sparkles };

/**
 * «Generar lo que falta» de la orden: muestra qué documentos ya existen y cuáles
 * faltan, y genera los marcados (certificado → tarjeta → imagen para redes en
 * segundo plano). Lo que ya existe viene desmarcado: rehacerlo es opcional y,
 * en la imagen con IA, se avisa que usa un crédito.
 */
export default function GenerateMissingModal({
    orderId, petId, petName, dedication, photoUrl, farewellTemplateConfig,
    certificate, certMissing = [], existing, socialJobActive, onClose, onFinished,
}: Props) {
    const tenant = useCurrentTenant();
    const { hasFeature } = useFeatures();
    const { data: auto, isLoading: loadingAuto } = useQuery({ queryKey: ['tenant', 'auto-documents'], queryFn: getAutoDocuments });
    const { data: usage } = useQuery({ queryKey: ['tenant', 'image-templates', 'ai-usage'], queryFn: getAiUsage });

    const socialOptions = auto?.options.social || [];
    const [socialTpl, setSocialTpl] = useState<number | null>(null);
    useEffect(() => {
        if (auto && socialTpl === null) setSocialTpl(auto.settings.social.template_id ?? socialOptions[0]?.id ?? null);
    }, [auto, socialTpl, socialOptions]);
    const chosen = socialOptions.find((o) => o.id === socialTpl);
    const socialUsesAi = !!chosen && ((!!chosen.has_ai_image && !!usage?.image_configured) || (!!chosen.has_ai_text && !!usage?.configured));

    // Diseño IA ya abierto para esta plantilla + mascota: el job usa un intento de ese crédito
    const { data: session } = useQuery({
        queryKey: ['tenant', 'ai-session', socialTpl, petId],
        queryFn: () => getAiSession(socialTpl!, petId),
        enabled: !!socialTpl && socialUsesAi,
    });
    const openAttempts = session?.active ? session.attempts_left : 0;
    const credits = usage?.credits?.available ?? 0;
    const needsCredit = socialUsesAi && openAttempts <= 0;
    const noCredit = needsCredit && credits <= 0;

    const has = {
        certificate: certificate.issued > 0,
        digital: existing.some((e) => e.kind === 'digital'),
        social: existing.some((e) => e.kind === 'design'),
    };
    const digitalConfig = farewellTemplateConfig || auto?.resolved.digital?.config || null;
    const available: Record<Kind, { ok: boolean; why?: string }> = {
        certificate: !hasFeature('certificados:generar_pdf', true) ? { ok: false, why: 'No incluido en tu plan' }
            : !certificate.enabled ? { ok: false, why: 'Certificados desactivados' } : { ok: true },
        digital: !hasFeature('certificados:diseno', true) ? { ok: false, why: 'No incluida en tu plan' }
            : !digitalConfig ? { ok: false, why: 'Sin plantilla de tarjeta configurada' } : { ok: true },
        social: !hasFeature('certificados:redes', true) ? { ok: false, why: 'No incluida en tu plan' }
            : socialOptions.length === 0 ? { ok: false, why: 'Sin plantillas de redes activas' }
            : socialJobActive ? { ok: false, why: 'Ya se está generando una' }
            : noCredit ? { ok: false, why: 'Sin créditos IA' } : { ok: true },
    };

    // Por defecto se marca solo lo que falta y se puede hacer
    const [checked, setChecked] = useState<Record<Kind, boolean> | null>(null);
    useEffect(() => {
        if (checked || loadingAuto || !usage) return;
        setChecked({
            certificate: available.certificate.ok && !has.certificate,
            digital: available.digital.ok && !has.digital,
            social: available.social.ok && !has.social,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadingAuto, usage, checked]);
    const sel = checked || { certificate: false, digital: false, social: false };

    const [state, setState] = useState<Partial<Record<Kind, { s: RunState; msg?: string }>>>({});
    const [running, setRunning] = useState(false);
    const [finished, setFinished] = useState(false);
    const [cardJob, setCardJob] = useState<{ config: FarewellConfig; resolve: (b: Blob) => void; reject: (e: Error) => void } | null>(null);
    const mounted = useRef(true);
    useEffect(() => () => { mounted.current = false; }, []);

    const kinds: Kind[] = ['certificate', 'digital', 'social'];
    const toRun = kinds.filter((k) => sel[k] && available[k].ok);
    const allDone = kinds.every((k) => has[k] || !available[k].ok);

    const set = (k: Kind, s: RunState, msg?: string) => mounted.current && setState((p) => ({ ...p, [k]: { s, msg } }));

    const runCertificate = async () => {
        await apiRequest('/api/internal/ops-records/generate', {
            method: 'POST',
            body: { cremation_id: orderId, certificate_type: 'Cremación', persist: true },
        });
    };

    const runDigital = async () => {
        const config = buildFarewellConfig(digitalConfig, { petName, dedication, photoUrl }, tenant);
        const blob = await new Promise<Blob>((resolve, reject) => setCardJob({ config, resolve, reject }));
        const fd = new FormData();
        fd.append('kind', 'digital');
        fd.append('title', `${auto?.resolved.digital?.name || 'Tarjeta de homenaje'} · ${petName}`);
        fd.append('pet_id', String(petId));
        fd.append('file', blob, 'tarjeta.png');
        await apiRequest('/api/internal/image-templates/exports/upload', { method: 'POST', body: fd });
    };

    const runSocial = async () => {
        await apiRequest('/api/internal/auto-documents/jobs', {
            method: 'POST',
            body: JSON.stringify({ cremation_id: orderId, ...(socialTpl ? { template_id: socialTpl } : {}) }),
        });
    };

    const run = async () => {
        if (!toRun.length) return;
        setRunning(true);
        for (const k of toRun) {
            set(k, 'running');
            try {
                if (k === 'certificate') await runCertificate();
                else if (k === 'digital') await runDigital();
                else await runSocial();
                set(k, k === 'social' ? 'queued' : 'done');
            } catch (e) {
                set(k, 'error', (e as Error)?.message || 'No se pudo generar');
            }
        }
        if (!mounted.current) return;
        setRunning(false);
        setFinished(true);
        onFinished();
    };

    const rowNote = (k: Kind): React.ReactNode => {
        if (!available[k].ok) return <span className="text-slate-400">{available[k].why}</span>;
        if (k === 'certificate') {
            return has.certificate
                ? <>Ya emitido ({certificate.issued}). Márcalo para emitir uno nuevo.</>
                : <>Se emite con el diseño predeterminado y queda en el Repositorio.</>;
        }
        if (k === 'digital') {
            return has.digital ? <>Ya guardada. Márcala para guardar otra versión.</> : <>Se dibuja con la plantilla del crematorio y se guarda en la orden.</>;
        }
        return has.social ? <>Ya creada. Márcala solo si quieres rehacerla o reintentar.</> : <>Se genera en segundo plano; la campana avisa al terminar.</>;
    };

    const creditNote = useMemo(() => {
        if (!socialUsesAi) return 'Esta plantilla no usa IA: no gasta créditos.';
        if (openAttempts > 0) return `Usa 1 de los ${openAttempts} intentos que quedan del crédito ya abierto para esta mascota (sin crédito nuevo).`;
        return `Usará 1 crédito IA (tienes ${credits}).`;
    }, [socialUsesAi, openAttempts, credits]);

    return createPortal(
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={running ? undefined : onClose}>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                            <Wand2 size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-sm text-slate-900 dark:text-white">Generar lo que falta</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                Documentos de <span className="font-semibold text-slate-700 dark:text-slate-200">{petName}</span>
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} disabled={running} aria-label="Cerrar"
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-50">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-3 text-xs">
                    {loadingAuto || !checked ? (
                        <div className="py-6 flex items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 size={16} className="animate-spin" /> Revisando qué tiene la orden…
                        </div>
                    ) : (
                        <>
                            {allDone && !finished && (
                                <p className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 font-semibold">
                                    Esta orden ya tiene todo. Marca lo que quieras volver a generar.
                                </p>
                            )}
                            {kinds.map((k) => {
                                const Icon = ICON[k];
                                const st = state[k];
                                const disabled = !available[k].ok || running || finished;
                                return (
                                    <label key={k} className={`flex items-start gap-3 p-3 rounded-xl border transition ${sel[k] && available[k].ok
                                        ? 'border-violet-500/40 bg-violet-500/5'
                                        : 'border-slate-200 dark:border-white/10'} ${disabled ? 'opacity-80' : 'cursor-pointer'}`}>
                                        <input type="checkbox" className="mt-0.5 accent-violet-600" checked={sel[k] && available[k].ok}
                                            disabled={disabled}
                                            onChange={(e) => setChecked({ ...sel, [k]: e.target.checked })} />
                                        <Icon size={16} className="mt-0.5 shrink-0 text-slate-500 dark:text-slate-400" />
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="font-bold text-slate-900 dark:text-white">{LABEL[k]}</p>
                                                {st?.s === 'running' ? <Loader2 size={14} className="animate-spin text-violet-500" />
                                                    : st?.s === 'done' ? <span className="inline-flex items-center gap-1 text-emerald-600 font-bold"><Check size={13} /> Listo</span>
                                                    : st?.s === 'queued' ? <span className="text-fuchsia-600 dark:text-fuchsia-300 font-bold">En segundo plano</span>
                                                    : st?.s === 'error' ? <span className="inline-flex items-center gap-1 text-rose-600 font-bold"><AlertCircle size={13} /> Error</span>
                                                    : <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${has[k]
                                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'}`}>{has[k] ? 'Ya existe' : 'Falta'}</span>}
                                            </div>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{st?.s === 'error' ? st.msg : rowNote(k)}</p>

                                            {k === 'certificate' && sel.certificate && available.certificate.ok && certMissing.length > 0 && (
                                                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                                                    Falta en la ficha: {certMissing.join(' y ')}. En el certificado quedará vacío.
                                                </p>
                                            )}

                                            {k === 'social' && available.social.ok && sel.social && !finished && (
                                                <div className="space-y-1.5 pt-1" onClick={(e) => e.preventDefault()}>
                                                    {socialOptions.length > 1 && (
                                                        <select value={socialTpl ?? ''} disabled={running}
                                                            onChange={(e) => setSocialTpl(e.target.value ? Number(e.target.value) : null)}
                                                            className="w-full rounded-lg px-2.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none">
                                                            {socialOptions.map((o) => (
                                                                <option key={o.id} value={o.id}>
                                                                    {o.name}{o.id === auto?.settings.social.template_id ? ' (Predeterminada)' : ''}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    <p className={`text-[11px] font-semibold ${needsCredit ? 'text-fuchsia-700 dark:text-fuchsia-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                                        {creditNote}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                );
                            })}
                        </>
                    )}
                </div>

                <div className="flex gap-2 px-5 pb-5">
                    {finished ? (
                        <button type="button" onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-bold">
                            Cerrar
                        </button>
                    ) : (
                        <>
                            <button type="button" onClick={onClose} disabled={running}
                                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-sm font-bold disabled:opacity-50">
                                Cancelar
                            </button>
                            <button type="button" onClick={run} disabled={running || !toRun.length}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-black disabled:opacity-40">
                                {running ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                                {running ? 'Generando…' : `Generar (${toRun.length})`}
                            </button>
                        </>
                    )}
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
