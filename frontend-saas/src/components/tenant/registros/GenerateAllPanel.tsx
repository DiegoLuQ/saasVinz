"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Wand2, Award, Heart, Sparkles, Loader2, CheckCircle2, XCircle, Circle, MinusCircle, Settings2, User, Dog, Package,
    Timer, AlertTriangle, X,
} from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { getAutoDocuments, type AutoDocKind } from '@/lib/tenant/autoDocuments';
import {
    generateAiBoth, generateAiImage, generateAiText, getAiSession, getAiUsage, openAiSession,
    registerTemplateUse, saveDesign, saveTemplateImage, type AiSession,
} from '@/lib/tenant/imageTemplates';
import { buildFarewellConfig, type FarewellConfig } from '@/lib/tenant/farewellCard';
import { ASPECT_RATIOS, TEMPLATE_FONTS_URL, nearestAiRatio } from '@/lib/admin/imageTemplates/constants';
import type { PhotoFills, PhotoLayer, PhotoSlot, TemplateDefinition } from '@/lib/admin/imageTemplates/types';
import type { Bindings } from '@/components/admin/imageTemplates/TemplateCanvas';
import { OffscreenFarewell, OffscreenSocial } from './OffscreenRenderers';
import DocumentPreviews from './DocumentPreviews';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { useFeatures } from '@/hooks/useFeatures';

export type StepKey = 'cliente' | 'mascota' | 'orden' | AutoDocKind;
type StepState = 'pending' | 'running' | 'done' | 'error' | 'skipped';
interface StepStatus { state: StepState; detail?: string; href?: string; startedAt?: number; ms?: number }

/** Una ejecución de «Generar todo»: para el modal de progreso y la medición. */
interface RunInfo {
    kinds: AutoDocKind[];
    startedAt: number;
    finishedAt: number | null;
    /** Segundos estimados por paso (el de IA según el promedio real). */
    expected: Partial<Record<StepKey, number>>;
    creditUsed: boolean;
    attemptsLeft: number | null;
}

const STAGE_MAX = 540;
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const today = () => { const d = new Date(); return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`; };

const STEP_META: Record<StepKey, { label: string; icon: typeof User }> = {
    cliente: { label: 'Cliente', icon: User },
    mascota: { label: 'Mascota', icon: Dog },
    orden: { label: 'Orden operativa', icon: Package },
    certificate: { label: 'Certificado', icon: Award },
    digital: { label: 'Imagen digital (tarjeta)', icon: Heart },
    social: { label: 'Imagen para redes', icon: Sparkles },
};

interface Pet { id: number; name: string; image_url?: string | null; images?: string[] }

type RenderJob =
    | { type: 'digital'; config: FarewellConfig; resolve: (b: Blob) => void; reject: (e: Error) => void }
    | { type: 'social'; definition: TemplateDefinition; width: number; height: number; bindings: Bindings; photos: PhotoFills; resolve: (b: Blob) => void; reject: (e: Error) => void };

export interface ProcessResult { customer_id: number; pet_id: number; cremation_id: number }

interface Props {
    submission: { id: number; pet_data?: { name?: string; dedication?: string } };
    /** Ids ya existentes del registro (cliente, mascota, orden). */
    existing: { customer_id?: number; pet_id?: number; cremation_id?: number };
    canRun: boolean;
    tenant: { name?: string | null; logo_url?: string | null; social_media?: Record<string, unknown> | null } | null | undefined;
    /** Crea lo que falte de cliente → mascota → orden e informa el avance de cada paso. */
    processRegistro: (onStep: (step: 'cliente' | 'mascota' | 'orden', s: StepStatus) => void) => Promise<ProcessResult>;
}

/**
 * «Generar todo» del detalle de un registro: procesa el registro (cliente,
 * mascota, orden) y genera el certificado, la imagen digital y la imagen para
 * redes con las plantillas de Configuración → Documentos automáticos. La de
 * redes usa créditos IA si su plantilla tiene IA (se avisa antes).
 */
export default function GenerateAllPanel({ submission, existing, canRun, tenant, processRegistro }: Props) {
    const { showToast } = useToast();
    const qc = useQueryClient();
    const { data: auto } = useQuery({ queryKey: ['tenant', 'auto-documents'], queryFn: getAutoDocuments });
    const { data: usage, refetch: refetchUsage } = useQuery({ queryKey: ['tenant', 'image-templates', 'ai-usage'], queryFn: getAiUsage });

    const [confirm, setConfirm] = useState<{ kinds: AutoDocKind[]; process: boolean } | null>(null);
    const [include, setInclude] = useState<Record<AutoDocKind, boolean>>({ certificate: true, digital: true, social: true });
    const [running, setRunning] = useState(false);
    const [steps, setSteps] = useState<Partial<Record<StepKey, StepStatus>>>({});
    const stepsRef = useRef<Partial<Record<StepKey, StepStatus>>>({});
    const [runInfo, setRunInfo] = useState<RunInfo | null>(null);
    const [progressOpen, setProgressOpen] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    // Sesión IA usada en la ejecución en curso (para medir crédito y costo).
    const runSessionRef = useRef<{ id: number; isNew: boolean; attemptsLeft: number } | null>(null);
    const [job, setJob] = useState<RenderJob | null>(null);
    // Sesión de crédito guardada junto a la plantilla + mascota a la que pertenece.
    const [sessionState, setSessionState] = useState<{ key: string; session: AiSession | null }>({ key: '', session: null });

    // Cada documento exige su característica del plan (sin flag = permitido).
    const { hasFeature } = useFeatures();
    const kindAllowed: Record<AutoDocKind, boolean> = {
        certificate: hasFeature('certificados:generar_pdf', true),
        digital: hasFeature('certificados:diseno', true),
        social: hasFeature('certificados:redes', true),
    };

    const petId = existing.pet_id ?? null;
    const social = kindAllowed.social ? (auto?.resolved.social || null) : null;
    const socialUsesAi = !!social && ((social.has_ai_text && !!usage?.configured) || (social.has_ai_image && !!usage?.image_configured));
    const credits = usage?.credits;

    // Carga las fuentes de las plantillas de redes (Konva las necesita en el documento).
    useEffect(() => {
        const id = 'image-templates-google-fonts-v2';
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = TEMPLATE_FONTS_URL;
        document.head.appendChild(link);
    }, []);

    // Crédito ya abierto para esta plantilla + mascota (no se cobraría otro).
    useEffect(() => {
        if (!social || !petId) return;
        const key = `${social.id}:${petId}`;
        getAiSession(social.id, petId)
            .then(session => setSessionState({ key, session }))
            .catch(() => setSessionState({ key, session: null }));
    }, [social, petId]);
    const sessionKey = social && petId ? `${social.id}:${petId}` : '';
    const socialSession = sessionKey && sessionState.key === sessionKey ? sessionState.session : null;
    const setSocialSession = (session: AiSession | null) => setSessionState({ key: sessionKey, session });

    const enabledKinds = useMemo<AutoDocKind[]>(() => {
        if (!auto) return [];
        return (['certificate', 'digital', 'social'] as AutoDocKind[]).filter(k => {
            if (!auto.settings[k].enabled || !kindAllowed[k]) return false;
            return k === 'social' ? !!auto.resolved.social : !!auto.resolved[k];
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auto, kindAllowed.certificate, kindAllowed.digital, kindAllowed.social]);

    // Reloj del modal mientras corre.
    useEffect(() => {
        if (!running) return;
        const t = setInterval(() => setNow(Date.now()), 500);
        return () => clearInterval(t);
    }, [running]);

    // Evita cerrar o recargar la pestaña a mitad de camino.
    useEffect(() => {
        if (!running) return;
        const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', onUnload);
        return () => window.removeEventListener('beforeunload', onUnload);
    }, [running]);

    /** Actualiza un paso y mide su duración (desde que pasa a «running» hasta que termina). */
    const setStep = (k: StepKey, s: StepStatus) => {
        const prev = stepsRef.current[k];
        const t = Date.now();
        const startedAt = prev?.startedAt ?? (s.state === 'running' ? t : undefined);
        const finished = s.state === 'done' || s.state === 'error' || s.state === 'skipped';
        const next: StepStatus = { ...s, startedAt, ms: finished && startedAt ? t - startedAt : undefined };
        stepsRef.current = { ...stepsRef.current, [k]: next };
        setSteps(stepsRef.current);
    };

    const render = (j: Omit<Extract<RenderJob, { type: 'digital' }>, 'resolve' | 'reject'> | Omit<Extract<RenderJob, { type: 'social' }>, 'resolve' | 'reject'>) =>
        new Promise<Blob>((resolve, reject) => setJob({ ...j, resolve, reject } as RenderJob));

    const loadPet = async (id: number): Promise<Pet | null> => {
        // Solo esa mascota (antes se descargaba la lista completa del crematorio).
        try {
            return await apiRequest(`/api/internal/pets/${id}`);
        } catch {
            return null;
        }
    };

    // ------------------------------------------------------------------
    // Documentos
    // ------------------------------------------------------------------
    const runCertificate = async (cremationId: number) => {
        setStep('certificate', { state: 'running' });
        await apiRequest('/api/internal/ops-records/generate', {
            method: 'POST',
            body: { cremation_id: cremationId, certificate_type: 'Cremación', template_id: auto?.resolved.certificate?.id, persist: true },
        });
        setStep('certificate', { state: 'done', detail: auto?.resolved.certificate?.name, href: '/dashboard/documentos/repositorio' });
    };

    const runDigital = async (pid: number) => {
        const tpl = auto?.resolved.digital;
        if (!tpl) throw new Error('No hay plantilla de tarjeta configurada');
        setStep('digital', { state: 'running', detail: 'Dibujando la tarjeta…' });
        const pet = await loadPet(pid);
        const petName = pet?.name || submission.pet_data?.name || 'Mascota';
        const config = buildFarewellConfig(tpl.config, {
            petName, dedication: submission.pet_data?.dedication, photoUrl: pet?.image_url || pet?.images?.[0] || null,
        }, tenant);
        const blob = await render({ type: 'digital', config });
        setStep('digital', { state: 'running', detail: 'Guardando…' });
        const fd = new FormData();
        fd.append('kind', 'digital');
        fd.append('title', `${tpl.name} · ${petName}`);
        fd.append('pet_id', String(pid));
        fd.append('file', blob, 'tarjeta.png');
        await apiRequest('/api/internal/image-templates/exports/upload', { method: 'POST', body: fd });
        setStep('digital', { state: 'done', detail: tpl.name, href: '/dashboard/documentos/redes' });
    };

    const runSocial = async (pid: number) => {
        if (!social) throw new Error('No hay plantilla de redes configurada');
        setStep('social', { state: 'running', detail: 'Preparando datos…' });
        const pet = await loadPet(pid);
        const def = social.definition;
        const ratio = ASPECT_RATIOS.find(a => a.value === social.supported_ratios?.[0]) || ASPECT_RATIOS[0];
        const size = ratio.w >= ratio.h
            ? { width: STAGE_MAX, height: Math.round((STAGE_MAX * ratio.h) / ratio.w) }
            : { width: Math.round((STAGE_MAX * ratio.w) / ratio.h), height: STAGE_MAX };

        // Fotos de la mascota: la principal y las siguientes de su galería.
        const main = pet?.image_url || pet?.images?.[0] || null;
        const rest = (pet?.images || []).filter(i => i !== main);
        const stored: Record<PhotoSlot, string | null> = { photo_1: main, photo_2: rest[0] || null, photo_3: rest[1] || null };

        let aiText = submission.pet_data?.dedication || social.default_phrase || '';
        let aiStored: string | null = null;
        if (socialUsesAi) {
            const aiLayer = def.layers.find((l): l is PhotoLayer => l.type === 'photo' && l.source === 'ai');
            const aiFrom: PhotoSlot = aiLayer?.ai_from || 'photo_1';
            const wantsText = social.has_ai_text && !!usage?.configured;
            const wantsImage = social.has_ai_image && !!usage?.image_configured && !!stored[aiFrom];
            let session = socialSession && socialSession.active && socialSession.attempts_left > 0 ? socialSession : null;
            let isNew = false;
            if (!session) {
                setStep('social', { state: 'running', detail: 'Usando 1 crédito IA…' });
                session = await openAiSession(social.id, pid);
                isNew = true;
            }
            runSessionRef.current = { id: session.id, isNew, attemptsLeft: session.attempts_left };
            setStep('social', { state: 'running', detail: 'Generando con IA (puede tardar ~1 min)…' });
            const imageOpts = {
                session_id: session.id, pet_id: pid, details: '',
                aspect_ratio: aiLayer ? nearestAiRatio((aiLayer.width / 100) * size.width, (aiLayer.height / 100) * size.height) : undefined,
                photo_url: stored[aiFrom],
            };
            const r = wantsText && wantsImage
                ? await generateAiBoth(social.id, imageOpts)
                : wantsImage
                    ? await generateAiImage(social.id, imageOpts)
                    : await generateAiText(social.id, { session_id: session.id, pet_id: pid, details: '' });
            setSocialSession(r.session);
            runSessionRef.current = { id: r.session.id, isNew, attemptsLeft: r.session.attempts_left };
            if (r.text) aiText = r.text.text;
            if (r.image) {
                // La ilustración IA es la única imagen que se guarda (WebP en la carpeta `ia`).
                const imgBlob = await (await fetch(r.image.url)).blob();
                const saved = await saveTemplateImage(social.id, { kind: 'illustration', image: imgBlob, pet_id: pid, generation_id: r.image.generation_id });
                aiStored = saved.url;
            }
            const errs = [r.text_error, r.image_error].filter(Boolean).join(' · ');
            if (errs) showToast(`IA: ${errs}`, 'error');
        }
        // El diseño final no se sube: se guarda su receta y se dibuja al verlo o descargarlo.
        setStep('social', { state: 'running', detail: 'Guardando el diseño…' });
        const aiLayer = def.layers.find((l): l is PhotoLayer => l.type === 'photo' && l.source === 'ai');
        const recipePhoto = (url: string | null) => ({ url, zoom: 1, offset_x: 0, offset_y: 0 });
        await saveDesign(social.id, {
            pet_id: pid,
            recipe: {
                ratio: ratio.value, ai_text: aiText, phrase: social.default_phrase || '', pet_name: '', date: today(),
                photos: {
                    photo_1: recipePhoto(stored.photo_1), photo_2: recipePhoto(stored.photo_2), photo_3: recipePhoto(stored.photo_3),
                    ai: recipePhoto(aiStored ?? stored[aiLayer?.ai_from || 'photo_1']),
                },
            },
        });
        registerTemplateUse(social.id).catch(() => { });
        setStep('social', { state: 'done', detail: social.name, href: '/dashboard/documentos/redes' });
    };

    // ------------------------------------------------------------------
    // Ejecución
    // ------------------------------------------------------------------
    const run = async (kinds: AutoDocKind[], withProcess: boolean) => {
        setConfirm(null);
        setRunning(true);
        const initial: Partial<Record<StepKey, StepStatus>> = {};
        if (withProcess) (['cliente', 'mascota', 'orden'] as const).forEach(k => { initial[k] = { state: 'pending' }; });
        kinds.forEach(k => { initial[k] = { state: 'pending' }; });
        stepsRef.current = initial;
        setSteps(initial);
        runSessionRef.current = null;
        const startedAt = Date.now();
        setNow(startedAt);
        // Estimación por paso: la IA según lo que realmente viene tardando.
        const aiSeconds = (social?.has_ai_image && usage?.image_configured ? usage?.avg_seconds?.image ?? 45 : 0)
            + (social?.has_ai_text && usage?.configured ? usage?.avg_seconds?.text ?? 6 : 0);
        const expected: Partial<Record<StepKey, number>> = {};
        (Object.keys(initial) as StepKey[]).forEach(k => {
            expected[k] = k === 'social' ? (socialUsesAi ? aiSeconds + 6 : 4) : k === 'certificate' ? 3 : k === 'digital' ? 4 : 1.5;
        });
        setRunInfo({ kinds, startedAt, finishedAt: null, expected, creditUsed: false, attemptsLeft: null });
        setProgressOpen(true);

        const finish = () => {
            const finishedAt = Date.now();
            const used = runSessionRef.current;
            setRunInfo(r => r && { ...r, finishedAt, creditUsed: !!used?.isNew, attemptsLeft: used ? used.attemptsLeft : null });
            setRunning(false);
            // Medición: tiempos por paso; el crédito y el costo IA los calcula el backend.
            apiRequest('/api/internal/auto-documents/runs', {
                method: 'POST',
                body: {
                    submission_id: submission.id,
                    cremation_id: ids.cremation_id ?? null,
                    pet_id: ids.pet_id ?? null,
                    ai_session_id: used?.id ?? null,
                    started_at: new Date(startedAt).toISOString(),
                    total_ms: finishedAt - startedAt,
                    steps: (Object.entries(stepsRef.current) as [StepKey, StepStatus][])
                        .filter(([, st]) => st.state === 'done' || st.state === 'error' || st.state === 'skipped')
                        .map(([key, st]) => ({ key, state: st.state, ms: st.ms ?? 0, detail: st.detail?.slice(0, 300) ?? null })),
                },
            }).catch(() => { });
        };

        let ids = { pet_id: existing.pet_id, cremation_id: existing.cremation_id };
        try {
            if (withProcess) {
                const res = await processRegistro((k, s) => setStep(k, s));
                ids = { pet_id: res.pet_id, cremation_id: res.cremation_id };
            }
        } catch (e) {
            showToast((e as Error).message || 'No se pudo procesar el registro', 'error');
            kinds.forEach(k => setStep(k, { state: 'skipped', detail: 'Falta procesar el registro' }));
            finish();
            return;
        }

        const tasks: Record<AutoDocKind, () => Promise<void>> = {
            certificate: () => runCertificate(ids.cremation_id!),
            digital: () => runDigital(ids.pet_id!),
            social: () => runSocial(ids.pet_id!),
        };
        let failed = 0;
        for (const k of kinds) {
            try {
                await tasks[k]();
            } catch (e) {
                failed += 1;
                setStep(k, { state: 'error', detail: (e as Error).message || 'Error' });
            }
        }
        refetchUsage();
        qc.invalidateQueries({ queryKey: ['tenant', 'template-exports'] });
        qc.invalidateQueries({ queryKey: ['ops-documents'] });
        finish();
        showToast(failed ? `Listo, con ${failed} documento(s) con error` : 'Todo generado correctamente', failed ? 'error' : 'success');
    };

    const openConfirm = (kinds: AutoDocKind[], withProcess: boolean) => {
        setInclude({ certificate: true, digital: true, social: true });
        setConfirm({ kinds, process: withProcess });
    };

    const hasOrder = !!existing.cremation_id && !!existing.pet_id;
    const configured = enabledKinds.length > 0;
    const noCreditsForSocial = socialUsesAi && !(socialSession?.active && socialSession.attempts_left > 0) && (credits?.available ?? 0) <= 0;

    // ------------------------------------------------------------------
    // UI
    // ------------------------------------------------------------------
    const StepIcon = ({ s }: { s?: StepStatus }) => {
        if (!s || s.state === 'pending') return <Circle size={15} className="text-muted-foreground/50" />;
        if (s.state === 'running') return <Loader2 size={15} className="animate-spin text-primary" />;
        if (s.state === 'done') return <CheckCircle2 size={15} className="text-emerald-500" />;
        if (s.state === 'skipped') return <MinusCircle size={15} className="text-muted-foreground" />;
        return <XCircle size={15} className="text-red-500" />;
    };

    const kindName = (k: AutoDocKind) =>
        k === 'social' ? social?.name : auto?.resolved[k]?.name;

    // Progreso: cada paso pesa lo que se espera que tarde (la IA pesa más).
    const stepKeys = Object.keys(steps) as StepKey[];
    const clock = runInfo?.finishedAt ?? now;
    let doneWeight = 0, totalWeight = 0, remaining = 0;
    for (const k of stepKeys) {
        const w = runInfo?.expected[k] ?? 1;
        const st = steps[k];
        totalWeight += w;
        if (!st || st.state === 'pending') { remaining += w; continue; }
        if (st.state === 'running') {
            const elapsed = st.startedAt ? (clock - st.startedAt) / 1000 : 0;
            doneWeight += w * Math.min(0.95, elapsed / w);
            remaining += Math.max(0, w - elapsed);
            continue;
        }
        doneWeight += w;
    }
    const finished = !!runInfo?.finishedAt;
    const percent = finished ? 100 : totalWeight ? Math.min(99, Math.round((doneWeight / totalWeight) * 100)) : 0;
    const elapsedTotal = runInfo ? Math.max(0, (clock - runInfo.startedAt) / 1000) : 0;
    const errorCount = stepKeys.filter(k => steps[k]?.state === 'error').length;
    const fmtSecs = (sec: number) => sec < 60 ? `${Math.round(sec)} s` : `${Math.floor(sec / 60)} min ${Math.round(sec % 60)} s`;
    const stepTime = (st?: StepStatus) => {
        if (!st) return null;
        if (st.ms != null && st.startedAt) return `${(st.ms / 1000).toFixed(1)} s`;
        if (st.state === 'running' && st.startedAt) return `${Math.round((clock - st.startedAt) / 1000)} s`;
        return null;
    };

    return (
        <div className="bg-card border border-card-border rounded-3xl p-6 space-y-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                    <Wand2 size={16} className="text-violet-500" /> Documentos
                </h3>
                <Link href="/dashboard/configuracion?tab=documentos-auto" className="text-[11px] font-bold text-muted-foreground hover:text-primary flex items-center gap-1">
                    <Settings2 size={12} /> Configurar
                </Link>
            </div>

            {!auto ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary" size={20} /></div>
            ) : !configured ? (
                <p className="text-xs text-muted-foreground">
                    No hay documentos configurados. Elige las plantillas en <Link href="/dashboard/configuracion?tab=documentos-auto" className="text-primary font-bold">Configuración → Documentos automáticos</Link>.
                </p>
            ) : (
                <>
                    <DocumentPreviews kinds={enabledKinds} auto={auto} petId={petId} cremationId={existing.cremation_id ?? null}
                        petName={submission.pet_data?.name || ''} dedication={submission.pet_data?.dedication}
                        tenant={tenant} socialUsesAi={socialUsesAi} />

                    {canRun ? (
                        <div className="space-y-2">
                            <button onClick={() => openConfirm(enabledKinds, !hasOrder)} disabled={running}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md disabled:opacity-50">
                                {running ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                                {hasOrder ? 'Generar todos los documentos' : 'Generar todo (registro + documentos)'}
                            </button>
                            {hasOrder && (
                                <div className="grid grid-cols-3 gap-1.5">
                                    {enabledKinds.map(k => {
                                        const Icon = STEP_META[k].icon;
                                        return (
                                            <button key={k} onClick={() => openConfirm([k], false)} disabled={running}
                                                className="py-2 px-1 rounded-xl bg-muted/60 hover:bg-muted text-[10px] font-bold text-foreground flex flex-col items-center gap-1 disabled:opacity-50">
                                                <Icon size={14} className="text-primary" />
                                                {k === 'certificate' ? 'Certificado' : k === 'digital' ? 'Imagen digital' : 'Imagen redes'}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">Solo Administrador o Recepción pueden generar.</p>
                    )}
                </>
            )}

            {/* Resumen de la última ejecución (el detalle está en el modal) */}
            {runInfo && !progressOpen && (
                <button onClick={() => setProgressOpen(true)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-card-border bg-muted/40 hover:bg-muted text-xs text-left">
                    {running ? <Loader2 size={14} className="animate-spin text-primary" />
                        : errorCount ? <AlertTriangle size={14} className="text-amber-500" /> : <CheckCircle2 size={14} className="text-emerald-500" />}
                    <span className="flex-1 font-semibold text-foreground">
                        {running ? `Generando… ${percent}%` : errorCount ? `Terminado con ${errorCount} error(es)` : 'Última generación completa'}
                    </span>
                    <span className="text-muted-foreground">{fmtSecs(elapsedTotal)}</span>
                    <span className="font-bold text-primary">Ver detalle</span>
                </button>
            )}

            {/* Progreso de «Generar todo» */}
            {progressOpen && runInfo && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    {running ? <Loader2 size={18} className="animate-spin text-violet-500" />
                                        : errorCount ? <AlertTriangle size={18} className="text-amber-500" /> : <CheckCircle2 size={18} className="text-emerald-500" />}
                                    {running ? 'Generando documentos' : errorCount ? 'Terminado con errores' : '¡Todo listo!'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">{submission.pet_data?.name || 'Mascota'}</p>
                            </div>
                            {!running && (
                                <button onClick={() => setProgressOpen(false)} aria-label="Cerrar" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X size={18} /></button>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-black text-slate-800 dark:text-slate-100">{percent}%</span>
                                <span className="text-slate-500 flex items-center gap-1">
                                    <Timer size={12} /> {fmtSecs(elapsedTotal)}
                                    {running && remaining > 1 && <> · quedan ~{fmtSecs(remaining)}</>}
                                </span>
                            </div>
                            <div className="h-2.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                                <div className={`h-full rounded-full transition-[width] duration-500 ${finished && errorCount ? 'bg-amber-500' : finished ? 'bg-emerald-500' : 'bg-gradient-to-r from-violet-600 to-fuchsia-500'}`}
                                    style={{ width: `${percent}%` }} />
                            </div>
                        </div>

                        {running && (
                            <p className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200">
                                No cierres ni recargues esta pestaña: las imágenes se dibujan en tu navegador. La imagen con IA puede tardar cerca de un minuto.
                            </p>
                        )}

                        <ul className="space-y-2">
                            {stepKeys.map(k => {
                                const st = steps[k];
                                const Icon = STEP_META[k].icon;
                                return (
                                    <li key={k} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-xs ${st?.state === 'running' ? 'border-violet-300 bg-violet-50/60 dark:border-violet-500/30 dark:bg-violet-500/10' : st?.state === 'error' ? 'border-red-200 bg-red-50/60 dark:border-red-500/30 dark:bg-red-500/10' : 'border-slate-200 dark:border-white/10'}`}>
                                        <span className="mt-0.5"><StepIcon s={st} /></span>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5"><Icon size={12} className="text-primary" /> {STEP_META[k].label}</p>
                                            {st?.detail && <p className={`text-[11px] ${st.state === 'error' ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`}>{st.detail}</p>}
                                        </div>
                                        <span className="shrink-0 text-[11px] tabular-nums text-slate-500">{stepTime(st)}</span>
                                        {st?.state === 'done' && st.href && !running && <Link href={st.href} className="shrink-0 text-[11px] font-bold text-primary">Ver</Link>}
                                    </li>
                                );
                            })}
                        </ul>

                        {finished && (
                            <>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-2.5">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Tiempo</p>
                                        <p className="text-sm font-black text-slate-900 dark:text-white">{fmtSecs(elapsedTotal)}</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-2.5">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Crédito IA</p>
                                        <p className="text-sm font-black text-slate-900 dark:text-white">{runInfo.creditUsed ? '1 usado' : '0'}</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-2.5">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Intentos IA</p>
                                        <p className="text-sm font-black text-slate-900 dark:text-white">{runInfo.attemptsLeft != null ? `${runInfo.attemptsLeft} restantes` : '—'}</p>
                                    </div>
                                </div>
                                {auto && petId && (
                                    <DocumentPreviews kinds={runInfo.kinds} auto={auto} petId={petId} cremationId={existing.cremation_id ?? null}
                                        petName={submission.pet_data?.name || ''} dedication={submission.pet_data?.dedication}
                                        tenant={tenant} socialUsesAi={socialUsesAi} />
                                )}
                                <button onClick={() => setProgressOpen(false)}
                                    className="w-full py-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-black">
                                    Cerrar
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Confirmación: qué se hará y aviso de crédito IA */}
            {confirm && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2"><Wand2 size={18} className="text-violet-500" /> ¿Generar ahora?</h3>
                        <ul className="space-y-2 text-sm">
                            {confirm.process && (
                                <li className="flex items-center gap-2 text-slate-700 dark:text-slate-200"><Package size={15} className="text-primary" /> Registrar cliente, mascota y orden</li>
                            )}
                            {confirm.kinds.map(k => {
                                const Icon = STEP_META[k].icon;
                                const disabled = k === 'social' && noCreditsForSocial;
                                return (
                                    <li key={k}>
                                        <label className={`flex items-start gap-2 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
                                            <input type="checkbox" disabled={disabled} checked={include[k] && !disabled}
                                                onChange={(e) => setInclude(i => ({ ...i, [k]: e.target.checked }))} className="mt-1 w-4 h-4 accent-emerald-500" />
                                            <span className="flex-1">
                                                <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-semibold"><Icon size={14} className="text-primary" /> {STEP_META[k].label}</span>
                                                <span className="block text-[11px] text-slate-500">{kindName(k)}</span>
                                            </span>
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>

                        {confirm.kinds.includes('social') && socialUsesAi && include.social && (
                            <div className="rounded-2xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 p-3 text-xs text-violet-800 dark:text-violet-200 space-y-1">
                                {socialSession?.active && socialSession.attempts_left > 0 ? (
                                    <p><b>No se usará otro crédito:</b> este diseño ya tiene un crédito abierto. Se usará 1 intento y te quedarán <b>{socialSession.attempts_left - 1}</b> para regenerar en Diseños para Redes.</p>
                                ) : noCreditsForSocial ? (
                                    <p><b>Sin créditos IA:</b> la imagen para redes se omitirá. <Link href="/dashboard/configuracion?tab=creditos" className="underline font-bold">Comprar créditos</Link></p>
                                ) : (
                                    <>
                                        <p><b>La imagen para redes usará 1 crédito IA.</b> Tienes {credits?.available ?? 0}; te quedarán {(credits?.available ?? 1) - 1}.</p>
                                        <p>Ese diseño tendrá {credits?.attempts_per_credit ?? 3} intentos: este proceso usa 1 y te quedarán <b>{(credits?.attempts_per_credit ?? 3) - 1}</b> para regenerar en Diseños para Redes.</p>
                                    </>
                                )}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button onClick={() => setConfirm(null)} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-sm font-bold">Cancelar</button>
                            <button
                                onClick={() => run(confirm.kinds.filter(k => include[k] && !(k === 'social' && noCreditsForSocial)), confirm.process)}
                                disabled={!confirm.process && !confirm.kinds.some(k => include[k] && !(k === 'social' && noCreditsForSocial))}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-black disabled:opacity-40">
                                <Wand2 size={15} /> Generar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Render fuera de pantalla del documento en curso */}
            {job?.type === 'digital' && (
                <OffscreenFarewell config={job.config}
                    onDone={(b) => { setJob(null); job.resolve(b); }}
                    onError={(e) => { setJob(null); job.reject(e); }} />
            )}
            {job?.type === 'social' && (
                <OffscreenSocial definition={job.definition} width={job.width} height={job.height} bindings={job.bindings} photos={job.photos}
                    onDone={(b) => { setJob(null); job.resolve(b); }}
                    onError={(e) => { setJob(null); job.reject(e); }} />
            )}
        </div>
    );
}

