"use client";

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Mail, MessageCircle, Check, CalendarClock, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { formatChileDate, formatChileTime } from '@/lib/dates';

interface Notice { id: number; kind: 'step' | 'finish' | 'review'; channel: 'email' | 'whatsapp'; sent_to?: string | null; step_name?: string | null; created_at: string; status?: 'sent' | 'failed'; error?: string | null }
/** Invitación a la reseña de Google (services/google_review.py). */
interface ReviewStatus {
    available: boolean;
    sent_at?: string | null;
    clicked_at?: string | null;
    scheduled_for?: string | null;
    state?: 'sent' | 'scheduled' | 'pending' | 'retrying' | 'failed' | 'skipped';
    reason?: 'no_link' | 'no_email' | 'off' | 'not_delivered' | 'before_enabled' | 'expired' | 'max_attempts' | null;
    attempts?: number;
    last_error?: string | null;
    can_send?: boolean;
}
interface NoticesData { enabled: boolean; email?: string | null; phone?: string | null; notices: Notice[]; review?: ReviewStatus }

const REVIEW_REASON: Record<string, string> = {
    no_link: 'Falta el enlace de Google (Perfil → Redes y reseñas)',
    no_email: 'El cliente no tiene correo',
    off: 'Desactivada en Configuración → Reseñas en Google',
    not_delivered: 'Se programa al entregar la orden',
    before_enabled: 'Entregada antes de activar las reseñas',
    expired: 'Pasó la fecha y no se envió',
    max_attempts: 'El servidor de correo la rechazó 3 veces',
};

const NOTICE_LABEL = (n: Notice) =>
    n.kind === 'review' ? 'Reseña en Google' : n.kind === 'finish' ? 'Aviso de fase final' : (n.step_name || 'Avance');

/** Badge «Google ✓»: la invitación a la reseña ya se envió. */
function GoogleSentBadge({ at, clickedAt }: { at: string; clickedAt?: string | null }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300"
            title={`Invitación a reseña enviada el ${formatChileDate(at)} ${formatChileTime(at)}${clickedAt ? ` · abrió Google el ${formatChileDate(clickedAt)} ${formatChileTime(clickedAt)}` : ' · aún no abre el enlace'}`}>
            <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
                <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
                <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
                <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
            </svg>
            Google <Check size={12} />{clickedAt && <span className="font-semibold">· abrió</span>}
        </span>
    );
}

/**
 * «Avisar a la familia» de una orden: WhatsApp (abre el chat con el mensaje y el
 * link de seguimiento, sin API de Meta) y correo (reenvío manual), más el
 * historial de avisos. Al avanzar de fase, AdvanceNoticeModal pregunta si avisar
 * (nunca automático). Ver services/family_notices.py.
 */
export default function FamilyNoticesBox({ orderId, stepId, finished, compact = false }: {
    orderId: number; stepId?: number | null; finished: boolean; compact?: boolean;
}) {
    const qc = useQueryClient();
    const key = ['family-notices', orderId];
    const { data } = useQuery<NoticesData>({ queryKey: key, queryFn: () => apiRequest(`/api/internal/operations/ops/orders/${orderId}/family-notices`) });
    const [busy, setBusy] = useState<'whatsapp' | 'email' | 'review' | null>(null);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

    if (!data?.enabled) return null;
    const body = finished || !stepId ? {} : { step_id: stepId };

    const whatsapp = async () => {
        // La pestaña se abre antes del await: si no, el navegador la bloquea como ventana emergente.
        const win = window.open('', '_blank');
        setBusy('whatsapp'); setMsg(null);
        try {
            const r = await apiRequest(`/api/internal/operations/ops/orders/${orderId}/family-notices/whatsapp`, { method: 'POST', body });
            if (win) win.location.href = r.url; else window.location.href = r.url;
            qc.invalidateQueries({ queryKey: key });
        } catch (e: unknown) {
            win?.close();
            setMsg({ ok: false, text: e instanceof Error ? e.message : 'No se pudo armar el mensaje' });
        } finally { setBusy(null); }
    };

    const email = async () => {
        setBusy('email'); setMsg(null);
        try {
            const r = await apiRequest(`/api/internal/operations/ops/orders/${orderId}/family-notices/email`, { method: 'POST', body });
            setMsg({ ok: true, text: `Correo enviado a ${r.to}` });
            qc.invalidateQueries({ queryKey: key });
        } catch (e: unknown) {
            setMsg({ ok: false, text: e instanceof Error ? e.message : 'No se pudo enviar el correo' });
        } finally { setBusy(null); }
    };

    const sendReview = async () => {
        setBusy('review'); setMsg(null);
        try {
            const r = await apiRequest(`/api/internal/operations/ops/orders/${orderId}/family-notices/review`, { method: 'POST' });
            setMsg({ ok: true, text: `Invitación a reseña enviada a ${r.to}` });
            qc.invalidateQueries({ queryKey: key });
        } catch (e: unknown) {
            setMsg({ ok: false, text: e instanceof Error ? e.message : 'No se pudo enviar la invitación' });
        } finally { setBusy(null); }
    };
    const review = data.review;

    const btn = 'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-40';

    return (
        <div className={`rounded-2xl border border-sky-500/20 bg-sky-500/5 ${compact ? 'p-3' : 'p-4'} space-y-3`}>
            <p className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">Avisar a la familia</p>
            <div className="flex gap-2">
                <button type="button" onClick={whatsapp} disabled={!data.phone || !!busy}
                    title={data.phone ? `WhatsApp a ${data.phone}` : 'El cliente no tiene celular registrado'}
                    className={`${btn} bg-[#25D366] hover:bg-[#1fb857] text-[#063b1c]`}>
                    {busy === 'whatsapp' ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />} WhatsApp
                </button>
                <button type="button" onClick={email} disabled={!data.email || !!busy}
                    title={data.email ? `Correo a ${data.email}` : 'El cliente no tiene correo registrado'}
                    className={`${btn} bg-sky-600 hover:bg-sky-700 text-white`}>
                    {busy === 'email' ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} Correo
                </button>
            </div>
            {review?.available && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] px-3 py-2">
                    <div className="min-w-0 text-[11px] text-muted-foreground">
                        <span className="font-bold text-foreground">Reseña en Google</span>
                        {review.sent_at ? null : review.last_error ? (
                            <span className="ml-1.5 inline-flex items-center gap-1 text-red-600 dark:text-red-400" title={review.last_error}>
                                <AlertTriangle size={12} /> {review.state === 'failed' ? 'No se pudo enviar' : `Falló (intento ${review.attempts}), se reintentará`}</span>
                        ) : review.scheduled_for && review.reason !== 'expired' ? (
                            <span className="ml-1.5 inline-flex items-center gap-1"><CalendarClock size={12} className="text-sky-500" />
                                Programada: {formatChileDate(review.scheduled_for)} {formatChileTime(review.scheduled_for)}</span>
                        ) : review.reason ? <span className="ml-1.5">· {REVIEW_REASON[review.reason] || ''}</span> : null}
                    </div>
                    {review.sent_at ? <GoogleSentBadge at={review.sent_at} clickedAt={review.clicked_at} /> : review.can_send && (
                        <button type="button" onClick={sendReview} disabled={!!busy}
                            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 disabled:opacity-50">
                            {busy === 'review' ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />} Enviar ahora
                        </button>
                    )}
                </div>
            )}
            {msg && <p className={`text-xs ${msg.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{msg.text}</p>}
            {data.notices.length > 0 && (
                <ul className="space-y-1">
                    {data.notices.slice(0, compact ? 3 : 6).map((n) => (
                        <li key={n.id} className={`flex items-center gap-1.5 text-[11px] ${n.status === 'failed' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}
                            title={n.error || undefined}>
                            {n.status === 'failed'
                                ? <AlertTriangle size={12} className="shrink-0" />
                                : <Check size={12} className="text-emerald-500 shrink-0" />}
                            <span className="truncate">
                                {n.channel === 'email' ? 'Correo' : 'WhatsApp'} · {NOTICE_LABEL(n)} · {formatChileDate(n.created_at)} {formatChileTime(n.created_at)}
                                {n.status === 'failed' && ' · rechazado'}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            {!data.email && !data.phone && <p className="text-[11px] text-muted-foreground">El cliente no tiene correo ni celular registrados.</p>}
        </div>
    );
}
