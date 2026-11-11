"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCanOpen } from '@/hooks/useCanOpen';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Wand2, Award, Heart, Sparkles, Loader2, CheckCircle2, XCircle, Circle, MinusCircle, Settings2, User, Dog, Package,
    Timer, AlertTriangle, X, Clock, Zap, Check,
} from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { getAutoDocuments, type AutoDocKind } from '@/lib/tenant/autoDocuments';
import { getAiSession, getAiUsage, type AiSession } from '@/lib/tenant/imageTemplates';
import { buildFarewellConfig, type FarewellConfig } from '@/lib/tenant/farewellCard';
import { TEMPLATE_FONTS_URL } from '@/lib/admin/imageTemplates/constants';
import { OffscreenFarewell } from './OffscreenRenderers';
import DocumentPreviews from './DocumentPreviews';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { useFeatures } from '@/hooks/useFeatures';

export type StepKey = 'cliente' | 'mascota' | 'orden' | AutoDocKind;
type StepState = 'pending' | 'running' | 'done' | 'error' | 'skipped' | 'queued';

const NO_CREDITS_DETAIL = 'Omitida: sin créditos IA';
const QUEUED_DETAIL = 'En segundo plano: aparecerá en la orden y la campana te avisará';
/** El modal de progreso se cierra solo a los 5 s si aún no termina (sigue en segundo plano). */
const AUTO_CLOSE_MS = 5000;
const BACKGROUND_MSG = 'Se está procesando en segundo plano. Te avisaremos cuando esté listo.';
/** Cierre automático: al terminar lleva a Recepción y Pedidos con la orden abierta. */
const REDIRECT_MSG = 'Procesando… al terminar te llevamos a Recepción y Pedidos.';
const ordersHref = (cremationId: number) => `/dashboard/recepcion-pedidos?orden=${cremationId}`;
interface StepStatus { state: StepState; detail?: string; href?: string; startedAt?: number; ms?: number }

/** Los documentos parten desmarcados: el usuario marca los que quiere crear. */
const DEFAULT_CHOICE: Record<AutoDocKind, boolean> = { certificate: false, digital: false, social: false };

/** Una ejecución: para el modal de progreso y la medición. */
interface RunInfo {
    kinds: AutoDocKind[];
    startedAt: number;
    finishedAt: number | null;
    /** Segundos estimados por paso. */
    expected: Partial<Record<StepKey, number>>;
    creditUsed: boolean;
}

const STEP_META: Record<StepKey, { label: string; icon: typeof User }> = {
    cliente: { label: 'Cliente', icon: User },
    mascota: { label: 'Mascota', icon: Dog },
    orden: { label: 'Orden operativa', icon: Package },
    certificate: { label: 'Certificado', icon: Award },
    digital: { label: 'Tarjeta de homenaje', icon: Heart },
    social: { label: 'Imagen para redes', icon: Sparkles },
};

interface Pet { id: number; name: string; image_url?: string | null; images?: string[] }

interface RenderJob { config: FarewellConfig; resolve: (b: Blob) => void; reject: (e: Error) => void }

export interface ProcessResult { customer_id: number; pet_id: number; cremation_id: number }

interface Props {
    submission: { id: number; pet_data?: { name?: string; dedication?: string } };
    /** Ids ya existentes del registro (cliente, mascota, orden). */
    existing: { customer_id?: number; pet_id?: number; cremation_id?: number };
    canRun: boolean;
    tenant: { name?: string | null; logo_url?: string | null; social_media?: Record<string, unknown> | null } | null | undefined;
    /** Crea lo que falte de cliente → mascota → orden e informa el avance de cada paso. */
    processRegistro: (onStep: (step: 'cliente' | 'mascota' | 'orden', s: StepStatus) => void) => Promise<ProcessResult>;
    /** Avisa si hay documentos disponibles (plan + configurados + rol): la página abre entonces
     *  este modal desde su único botón «Procesar registro». */
    onAvailableChange?: (available: boolean) => void;
    /** Cada vez que cambia (> 0), abre el modal «Procesar registro». */
    processRequest?: number;
    /** La mascota tiene al menos una foto. Sin foto la imagen para redes (IA) queda deshabilitada. */
    hasPhoto?: boolean;
}

/**
 * Documentos del detalle de un registro. «Procesar registro» abre un solo modal con
 * lo que se hará (cliente, mascota y orden siempre) y los documentos con su ejemplo,
 * desmarcados (el usuario elige): certificado y tarjeta se crean al instante; la
 * imagen para redes (IA) se encola en el servidor (/auto-documents/jobs) y no hay que
 * esperarla.
 */
export default function GenerateAllPanel({ submission, existing, canRun, tenant, processRegistro, onAvailableChange, processRequest, hasPhoto = true }: Props) {
    const { canOpen } = useCanOpen();
    const { showToast } = useToast();
    const router = useRouter();
    // Orden de la última ejecución y si hay que ir a Recepción y Pedidos al terminar (cierre automático).
    const [doneOrderId, setDoneOrderId] = useState<number | null>(null);
    const redirectWhenDone = useRef(false);
    const qc = useQueryClient();
    const { data: auto } = useQuery({ queryKey: ['tenant', 'auto-documents'], queryFn: getAutoDocuments });
    const { data: usage, refetch: refetchUsage } = useQuery({ queryKey: ['tenant', 'image-templates', 'ai-usage'], queryFn: getAiUsage });

    const [confirm, setConfirm] = useState<{ kinds: AutoDocKind[]; process: boolean } | null>(null);
    const [include, setInclude] = useState<Record<AutoDocKind, boolean>>(DEFAULT_CHOICE);
    const [running, setRunning] = useState(false);
    const [steps, setSteps] = useState<Partial<Record<StepKey, StepStatus>>>({});
    const stepsRef = useRef<Partial<Record<StepKey, StepStatus>>>({});
    const [runInfo, setRunInfo] = useState<RunInfo | null>(null);
    const [progressOpen, setProgressOpen] = useState(false);
    const [now, setNow] = useState(() => Date.now());
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

    // Carga las fuentes de las plantillas de redes (las miniaturas las necesitan).
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
    const openSession = !!(socialSession?.active && socialSession.attempts_left > 0);

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

    // A los 5 s el modal se cierra solo si aún corre: el proceso sigue y el toast final avisa.
    useEffect(() => {
        if (!running || !progressOpen) return;
        const t = setTimeout(() => {
            setProgressOpen(false);
            // Sigue en esta página hasta terminar (la tarjeta se dibuja en el navegador; la imagen IA
            // ya va al servidor) y luego lleva a Recepción y Pedidos.
            redirectWhenDone.current = true;
            showToast(REDIRECT_MSG, 'info');
        }, AUTO_CLOSE_MS);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [running, progressOpen]);

    /** Cerrar el modal mientras corre no detiene nada: sigue en segundo plano. */
    const closeProgress = () => {
        setProgressOpen(false);
        if (running) showToast(BACKGROUND_MSG, 'info');
    };

    // La tarjeta se dibuja en el navegador: evita cerrar la pestaña mientras corre (son segundos).
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
        const finished = s.state === 'done' || s.state === 'error' || s.state === 'skipped' || s.state === 'queued';
        const next: StepStatus = { ...s, startedAt, ms: finished && startedAt ? t - startedAt : undefined };
        stepsRef.current = { ...stepsRef.current, [k]: next };
        setSteps(stepsRef.current);
    };

    const loadPet = async (id: number): Promise<Pet | null> => {
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
        const blob = await new Promise<Blob>((resolve, reject) => setJob({ config, resolve, reject }));
        setStep('digital', { state: 'running', detail: 'Guardando…' });
        const fd = new FormData();
        fd.append('kind', 'digital');
        fd.append('title', `${tpl.name} · ${petName}`);
        fd.append('pet_id', String(pid));
        fd.append('file', blob, 'tarjeta.png');
        await apiRequest('/api/internal/image-templates/exports/upload', { method: 'POST', body: fd });
        setStep('digital', { state: 'done', detail: tpl.name, href: '/dashboard/documentos/redes' });
    };

    /** La imagen para redes se genera en el servidor: aquí solo se encola (usa el crédito al instante). */
    const queueSocial = async (cremationId: number) => {
        if (!social) throw new Error('No hay plantilla de redes configurada');
        setStep('social', { state: 'running', detail: 'Enviando a segundo plano…' });
        await apiRequest('/api/internal/auto-documents/jobs', {
            method: 'POST',
            body: { cremation_id: cremationId, template_id: social.id },
        });
        setStep('social', { state: 'queued', detail: QUEUED_DETAIL });
    };

    // ------------------------------------------------------------------
    // Ejecución
    // ------------------------------------------------------------------
    const run = async (kinds: AutoDocKind[], withProcess: boolean, socialSkippedNoCredits = false) => {
        setConfirm(null);
        setRunning(true);
        setDoneOrderId(null);
        redirectWhenDone.current = false;
        const initial: Partial<Record<StepKey, StepStatus>> = {};
        if (withProcess) (['cliente', 'mascota', 'orden'] as const).forEach(k => { initial[k] = { state: 'pending' }; });
        kinds.forEach(k => { initial[k] = { state: 'pending' }; });
        // Sin créditos IA: la imagen para redes no se genera, pero se muestra como omitida (no es un error)
        if (socialSkippedNoCredits) initial.social = { state: 'skipped', detail: NO_CREDITS_DETAIL };
        stepsRef.current = initial;
        setSteps(initial);
        const startedAt = Date.now();
        setNow(startedAt);
        const expected: Partial<Record<StepKey, number>> = {};
        (Object.keys(initial) as StepKey[]).forEach(k => {
            expected[k] = k === 'social' ? 1.5 : k === 'certificate' ? 3 : k === 'digital' ? 4 : 1.5;
        });
        setRunInfo({ kinds, startedAt, finishedAt: null, expected, creditUsed: false });
        setProgressOpen(true);

        let ids = { pet_id: existing.pet_id, cremation_id: existing.cremation_id };
        const finish = () => {
            const finishedAt = Date.now();
            const queued = stepsRef.current.social?.state === 'queued';
            setRunInfo(r => r && { ...r, finishedAt, creditUsed: queued && socialUsesAi && !openSession });
            setRunning(false);
            setDoneOrderId(ids.cremation_id ?? null);
            if (redirectWhenDone.current && ids.cremation_id) {
                redirectWhenDone.current = false;
                router.push(ordersHref(ids.cremation_id));
            }
            // Medición: tiempos por paso (la imagen IA la mide su propia tarea en el servidor).
            apiRequest('/api/internal/auto-documents/runs', {
                method: 'POST',
                body: {
                    submission_id: submission.id,
                    cremation_id: ids.cremation_id ?? null,
                    pet_id: ids.pet_id ?? null,
                    ai_session_id: null,
                    started_at: new Date(startedAt).toISOString(),
                    total_ms: finishedAt - startedAt,
                    steps: (Object.entries(stepsRef.current) as [StepKey, StepStatus][])
                        .filter(([, st]) => st.state !== 'pending' && st.state !== 'running')
                        .map(([key, st]) => ({ key, state: st.state === 'queued' ? 'done' : st.state, ms: st.ms ?? 0, detail: st.detail?.slice(0, 300) ?? null })),
                },
            }).catch(() => { });
        };

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
            social: () => queueSocial(ids.cremation_id!),
        };
        let failed = 0;
        for (const k of kinds) {
            try {
                await tasks[k]();
            } catch (e) {
                failed += 1;
                setStep(k, { state: 'error', detail: (e as { message?: string })?.message || 'Error' });
            }
        }
        refetchUsage();
        qc.invalidateQueries({ queryKey: ['tenant', 'template-exports'] });
        qc.invalidateQueries({ queryKey: ['ops-documents'] });
        finish();
        const done = withProcess ? '¡Listo! Registro procesado' : '¡Listo! Documentos creados';
        showToast(failed ? `${done}, con ${failed} documento(s) con error` : done, failed ? 'error' : 'success');
    };

    const openConfirm = (kinds: AutoDocKind[], withProcess: boolean) => {
        setInclude(DEFAULT_CHOICE);
        setConfirm({ kinds, process: withProcess });
    };

    const hasOrder = !!existing.cremation_id && !!existing.pet_id;
    const configured = enabledKinds.length > 0;
    const available = !!auto && configured && canRun;
    useEffect(() => { onAvailableChange?.(available); }, [available, onAvailableChange]);
    const noCreditsForSocial = socialUsesAi && !openSession && (credits?.available ?? 0) <= 0;

    // El botón «Procesar registro» de la página abre este modal.
    const lastRequest = useRef(processRequest ?? 0);
    useEffect(() => {
        if (!processRequest || processRequest === lastRequest.current) return;
        lastRequest.current = processRequest;
        if (available) openConfirm(enabledKinds, !hasOrder);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [processRequest]);

    // ------------------------------------------------------------------
    // UI
    // ------------------------------------------------------------------
    const StepIcon = ({ s }: { s?: StepStatus }) => {
        if (!s || s.state === 'pending') return <Circle size={15} className="text-muted-foreground/50" />;
        if (s.state === 'running') return <Loader2 size={15} className="animate-spin text-primary" />;
        if (s.state === 'done') return <CheckCircle2 size={15} className="text-emerald-500" />;
        if (s.state === 'queued') return <Clock size={15} className="text-sky-500" />;
        if (s.state === 'skipped') return <MinusCircle size={15} className="text-muted-foreground" />;
        return <XCircle size={15} className="text-red-500" />;
    };

    const kindName = (k: AutoDocKind) => (k === 'social' ? social?.name : auto?.resolved[k]?.name);

    // Progreso: cada paso pesa lo que se espera que tarde.
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
        if (!st || st.state === 'queued') return null;
        if (st.ms != null && st.startedAt) return `${(st.ms / 1000).toFixed(1)} s`;
        if (st.state === 'running' && st.startedAt) return `${Math.round((clock - st.startedAt) / 1000)} s`;
        return null;
    };

    // Modal de confirmación
    // Sin foto de la mascota la imagen para redes no se puede hacer (la IA parte de su foto).
    const socialNoPhoto = !hasPhoto;
    const selectable = (k: AutoDocKind) => !(k === 'social' && (noCreditsForSocial || socialNoPhoto));
    const chosen = confirm ? confirm.kinds.filter(k => include[k] && selectable(k)) : [];
    const toggle = (k: AutoDocKind) => {
        if (!selectable(k)) return;
        setInclude(i => ({ ...i, [k]: !i[k] }));
    };
    const kindNote = (k: AutoDocKind): React.ReactNode => {
        if (k === 'social') {
            if (socialNoPhoto) return <span className="text-amber-600 dark:text-amber-400">Sin foto de la mascota</span>;
            if (noCreditsForSocial) return <span className="text-amber-600 dark:text-amber-400">Sin créditos IA: se omitirá</span>;
            return (
                <span className="text-sky-700 dark:text-sky-300 flex items-center gap-1">
                    <Clock size={11} /> En segundo plano{socialUsesAi ? (openSession ? ' · sin crédito extra' : ' · usa 1 crédito IA') : ''}
                </span>
            );
        }
        return <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1"><Zap size={11} /> Al instante</span>;
    };

    return (
        <div className="bg-card border border-card-border rounded-3xl p-6 space-y-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                    <Wand2 size={16} className="text-violet-500" /> Documentos
                </h3>
                {canOpen('/dashboard/configuracion?tab=documentos-auto') && (
                    <Link href="/dashboard/configuracion?tab=documentos-auto" className="text-[11px] font-bold text-muted-foreground hover:text-primary flex items-center gap-1">
                        <Settings2 size={12} /> Configurar
                    </Link>
                )}
            </div>

            {!auto ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary" size={20} /></div>
            ) : !configured ? (
                <p className="text-xs text-muted-foreground">
                    {canOpen('/dashboard/configuracion?tab=documentos-auto')
                        ? <>No hay documentos configurados. Elige las plantillas en <Link href="/dashboard/configuracion?tab=documentos-auto" className="text-primary font-bold">Configuración → Documentos automáticos</Link>.</>
                        : <>Los documentos automáticos no están incluidos en tu plan.</>}
                </p>
            ) : (
                <>
                    <DocumentPreviews kinds={enabledKinds} auto={auto} petId={petId} cremationId={existing.cremation_id ?? null}
                        petName={submission.pet_data?.name || ''} dedication={submission.pet_data?.dedication}
                        tenant={tenant} socialUsesAi={socialUsesAi} />

                    {!canRun ? (
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">Solo Administrador o Recepción pueden generar.</p>
                    ) : hasOrder ? (
                        <div className="space-y-2">
                            <button onClick={() => openConfirm(enabledKinds, false)} disabled={running}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md disabled:opacity-50">
                                {running ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                                Generar documentos
                            </button>
                        </div>
                    ) : (
                        <p className="text-[11px] text-muted-foreground">
                            Se crean al usar <b>«Procesar registro»</b>: ahí eliges cuáles. La imagen para redes se hace en segundo plano.
                        </p>
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
                        {running ? `Procesando… ${percent}%` : errorCount ? `Terminado con ${errorCount} error(es)` : 'Último proceso completo'}
                    </span>
                    <span className="text-muted-foreground">{fmtSecs(elapsedTotal)}</span>
                    <span className="font-bold text-primary">Ver detalle</span>
                </button>
            )}

            {/* Progreso */}
            {progressOpen && runInfo && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    {running ? <Loader2 size={18} className="animate-spin text-violet-500" />
                                        : errorCount ? <AlertTriangle size={18} className="text-amber-500" /> : <CheckCircle2 size={18} className="text-emerald-500" />}
                                    {running ? 'Procesando' : errorCount ? 'Terminado con errores' : '¡Listo!'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">{submission.pet_data?.name || 'Mascota'}</p>
                            </div>
                            <button onClick={closeProgress} aria-label="Cerrar" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X size={18} /></button>
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

                        <ul className="space-y-2">
                            {stepKeys.map(k => {
                                const st = steps[k];
                                const Icon = STEP_META[k].icon;
                                return (
                                    <li key={k} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-xs ${st?.state === 'running' ? 'border-violet-300 bg-violet-50/60 dark:border-violet-500/30 dark:bg-violet-500/10' : st?.state === 'queued' ? 'border-sky-200 bg-sky-50/60 dark:border-sky-500/30 dark:bg-sky-500/10' : st?.state === 'error' ? 'border-red-200 bg-red-50/60 dark:border-red-500/30 dark:bg-red-500/10' : 'border-slate-200 dark:border-white/10'}`}>
                                        <span className="mt-0.5"><StepIcon s={st} /></span>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5"><Icon size={12} className="text-primary" /> {STEP_META[k].label}</p>
                                            {st?.detail && <p className={`text-[11px] ${st.state === 'error' ? 'text-red-600 dark:text-red-400' : st.state === 'queued' ? 'text-sky-700 dark:text-sky-300' : st.detail.startsWith('Pendiente de stock') ? 'font-semibold text-amber-700 dark:text-amber-300' : 'text-slate-500'}`}>{st.detail}</p>}
                                        </div>
                                        <span className="shrink-0 text-[11px] tabular-nums text-slate-500">{stepTime(st)}</span>
                                        {st?.state === 'done' && st.href && !running && <Link href={st.href} className="shrink-0 text-[11px] font-bold text-primary">Ver</Link>}
                                    </li>
                                );
                            })}
                        </ul>

                        {running && (
                            <>
                                <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-100">
                                    Puedes cerrar esta ventana: se seguirá procesando en segundo plano y te avisaremos cuando esté listo. Quédate en esta página hasta el aviso (unos segundos): la tarjeta se dibuja en tu navegador.
                                </p>
                                <button onClick={closeProgress}
                                    className="w-full py-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-black">
                                    Cerrar y seguir trabajando
                                </button>
                            </>
                        )}

                        {finished && (
                            <>
                                <div className="grid grid-cols-2 gap-2 text-center">
                                    <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-2.5">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Tiempo</p>
                                        <p className="text-sm font-black text-slate-900 dark:text-white">{fmtSecs(elapsedTotal)}</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-2.5">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Crédito IA</p>
                                        <p className="text-sm font-black text-slate-900 dark:text-white">{runInfo.creditUsed ? '1 usado' : '0'}</p>
                                    </div>
                                </div>
                                {steps.social?.state === 'queued' && (
                                    <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-100">
                                        <b>La imagen para redes se está creando en segundo plano.</b> Puedes cerrar y seguir trabajando: tarda cerca de un minuto, quedará en «Imágenes generadas» de la orden y la campana te avisará.
                                    </p>
                                )}
                                {steps.social?.state === 'skipped' && steps.social.detail === NO_CREDITS_DETAIL && (
                                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
                                        <MinusCircle size={14} className="mt-0.5 shrink-0" />
                                        <div className="flex-1 space-y-1.5">
                                            <p>
                                                <b>Imagen para redes omitida:</b> no tienes créditos IA. Lo demás se creó normalmente;
                                                puedes generarla después desde la orden («Generar lo que falta») o en Diseños para Redes.
                                            </p>
                                            {canOpen('/dashboard/configuracion?tab=creditos') && (
                                                <Link href="/dashboard/configuracion?tab=creditos"
                                                    className="inline-flex items-center rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-black text-white hover:bg-amber-600">
                                                    Comprar créditos
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {doneOrderId ? (
                                    <button onClick={() => { setProgressOpen(false); router.push(ordersHref(doneOrderId)); }}
                                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black">
                                        Ir a Recepción y Pedidos
                                    </button>
                                ) : (
                                    <button onClick={() => setProgressOpen(false)}
                                        className="w-full py-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-black">
                                        Cerrar
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Confirmación: qué se hará, con el ejemplo de cada documento */}
            {confirm && auto && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setConfirm(null)}>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-5 shadow-2xl"
                        onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Procesar registro">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <Package size={18} className="text-emerald-500" /> {confirm.process ? 'Procesar registro' : 'Generar documentos'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">{submission.pet_data?.name || 'Mascota'} · esto es lo que se hará</p>
                            </div>
                            <button onClick={() => setConfirm(null)} aria-label="Cerrar" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X size={18} /></button>
                        </div>

                        {confirm.process && (
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">Siempre</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {([
                                        ['cliente', existing.customer_id], ['mascota', existing.pet_id], ['orden', existing.cremation_id],
                                    ] as const).map(([k, exists]) => {
                                        const Icon = STEP_META[k].icon;
                                        return (
                                            <div key={k} className="rounded-xl border border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/25 dark:bg-emerald-500/10 px-3 py-2.5">
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5"><Icon size={13} className="text-emerald-600 dark:text-emerald-400" /> {STEP_META[k].label}</p>
                                                <p className="text-[10px] text-slate-500 mt-0.5">{exists ? 'Ya existe' : 'Se crea'}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div>
                            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">Documentos · elige cuáles</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {confirm.kinds.map(k => {
                                    const Icon = STEP_META[k].icon;
                                    const on = include[k] && selectable(k);
                                    return (
                                        <div key={k}
                                            className={`rounded-2xl border-2 p-3 transition-colors ${on ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-500/10' : 'border-slate-200 dark:border-white/10'} ${selectable(k) ? '' : 'opacity-60'}`}>
                                            <button type="button" onClick={() => toggle(k)} disabled={!selectable(k)} aria-pressed={on}
                                                className="w-full flex items-start gap-2 text-left">
                                                <span className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${on ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-300 dark:border-white/20'}`}>
                                                    {on && <Check size={13} />}
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100"><Icon size={14} className="text-primary" /> {STEP_META[k].label}</span>
                                                    <span className="block text-[11px] text-slate-500 truncate" title={kindName(k)}>{kindName(k)}</span>
                                                    <span className="block text-[11px] font-bold mt-0.5">{kindNote(k)}</span>
                                                </span>
                                            </button>
                                            <div className="mt-3">
                                                <DocumentPreviews kinds={[k]} auto={auto} petId={petId} cremationId={existing.cremation_id ?? null}
                                                    petName={submission.pet_data?.name || ''} dedication={submission.pet_data?.dedication}
                                                    tenant={tenant} socialUsesAi={false} single />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {chosen.includes('social') && socialUsesAi && (
                            <p className="rounded-2xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 p-3 text-xs text-violet-800 dark:text-violet-200">
                                {openSession
                                    ? <>No se usará otro crédito: este diseño ya tiene uno abierto (quedan {socialSession?.attempts_left} intentos).</>
                                    : <>La imagen para redes usará <b>1 crédito IA</b>: tienes {credits?.available ?? 0} y te quedarán {Math.max((credits?.available ?? 1) - 1, 0)}. No tienes que esperarla.</>}
                            </p>
                        )}
                        {confirm.kinds.includes('social') && socialNoPhoto && (
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                La imagen para redes necesita una foto de la mascota. Agrégala en Mascotas y luego créala desde la orden («Generar lo que falta»).
                            </p>
                        )}
                        {confirm.kinds.includes('social') && noCreditsForSocial && !socialNoPhoto && canOpen('/dashboard/configuracion?tab=creditos') && (
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                Sin créditos IA la imagen para redes se omite. <Link href="/dashboard/configuracion?tab=creditos" className="underline font-bold">Comprar créditos</Link>
                            </p>
                        )}

                        <div className="flex flex-col-reverse sm:flex-row gap-2">
                            <button onClick={() => setConfirm(null)} className="sm:flex-1 py-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-sm font-bold">Cancelar</button>
                            <button
                                onClick={() => {
                                    run(chosen, confirm.process, confirm.kinds.includes('social') && noCreditsForSocial && !socialNoPhoto && include.social);
                                }}
                                disabled={!confirm.process && chosen.length === 0}
                                className="sm:flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-black disabled:opacity-40">
                                <Package size={15} />
                                {confirm.process
                                    ? (chosen.length ? `Procesar y crear ${chosen.length} documento${chosen.length > 1 ? 's' : ''}` : 'Procesar solo la orden')
                                    : `Generar ${chosen.length} documento${chosen.length === 1 ? '' : 's'}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tarjeta de homenaje dibujada fuera de pantalla */}
            {job && (
                <OffscreenFarewell config={job.config}
                    onDone={(b) => { setJob(null); job.resolve(b); }}
                    onError={(e) => { setJob(null); job.reject(e); }} />
            )}
        </div>
    );
}
