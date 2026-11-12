'use client';

/**
 * «Programadas y enviadas»: seguimiento de las invitaciones a reseña de Google de
 * las órdenes entregadas en los últimos 30 días (Configuración → Reseñas en Google).
 * «Enviada ✓» = el servidor de correo la aceptó (equivale al «200»); «Con error» =
 * la rechazó (se reintenta hasta 3 veces, el motivo queda visible).
 * Filas en 3 columnas (familia · estado · acción), sin scroll horizontal; en celular se apilan.
 * API GET /api/internal/operations/review-emails?state=; lógica google_review.tenant_list().
 */
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Info, Loader2, Mail, MinusCircle, MousePointerClick, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { formatChileDate, formatChileTime } from '@/lib/dates';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

type State = 'sent' | 'scheduled' | 'pending' | 'retrying' | 'failed' | 'skipped';
type Filter = '' | 'scheduled' | 'sent' | 'failed' | 'skipped';

interface Row {
    cremation_id: number;
    pet_name?: string | null;
    owner_name?: string | null;
    email?: string | null;
    delivered_at?: string | null;
    state: State;
    sent_at?: string | null;
    sent_to?: string | null;
    /** Primer clic en «Dejar mi opinión en Google» (no confirma que haya dejado la reseña). */
    clicked_at?: string | null;
    click_count?: number;
    scheduled_for?: string | null;
    reason?: string | null;
    attempts: number;
    last_error?: string | null;
    last_attempt_at?: string | null;
    can_send: boolean;
}
interface ListData { items: Row[]; counts: Record<'sent' | 'scheduled' | 'failed' | 'skipped', number>; days: number; max_attempts: number }

const FILTERS: { id: Filter; label: string }[] = [
    { id: '', label: 'Todas' },
    { id: 'scheduled', label: 'Programadas' },
    { id: 'sent', label: 'Enviadas' },
    { id: 'failed', label: 'Con error' },
    { id: 'skipped', label: 'No saldrán' },
];

const REASON: Record<string, string> = {
    no_link: 'Falta el enlace de Google',
    no_email: 'El cliente no tiene correo',
    off: 'Reseñas desactivadas',
    not_delivered: 'La orden ya no está entregada',
    before_enabled: 'Entregada antes de activar las reseñas',
    expired: 'Pasó la fecha sin enviarse',
};

const PAGE = 10;
const short = (iso?: string | null) => (iso ? formatChileDate(iso, { day: 'numeric', month: 'short' }) : '—');
const when = (iso?: string | null) => (iso ? `${short(iso)} · ${formatChileTime(iso)}` : '—');

const STATE_UI: Record<State, { label: string; icon: React.ElementType; cls: string }> = {
    sent: { label: 'Enviada', icon: CheckCircle2, cls: 'text-emerald-700 dark:text-emerald-300' },
    scheduled: { label: 'Programada', icon: CalendarClock, cls: 'text-sky-700 dark:text-sky-300' },
    pending: { label: 'Saliendo', icon: Clock, cls: 'text-sky-700 dark:text-sky-300' },
    retrying: { label: 'Reintentando', icon: RefreshCw, cls: 'text-amber-700 dark:text-amber-300' },
    failed: { label: 'Error', icon: AlertTriangle, cls: 'text-red-700 dark:text-red-300' },
    skipped: { label: 'No saldrá', icon: MinusCircle, cls: 'text-slate-500 dark:text-slate-400' },
};

/** Texto bajo el estado; `hideReason` = el motivo ya se explica en el aviso de arriba. */
function detail(row: Row, maxAttempts: number, hideReason: boolean): string {
    switch (row.state) {
        case 'sent': return `Enviada el ${when(row.sent_at)}`;
        case 'scheduled': return `Sale el ${when(row.scheduled_for)}`;
        case 'pending': return 'Sale en los próximos minutos';
        case 'retrying': return `Rechazada (${row.attempts}/${maxAttempts}), se reintentará`;
        case 'failed': return `Rechazada ${row.attempts} veces`;
        default: return hideReason ? '' : (REASON[row.reason || ''] || '');
    }
}

export function ReviewEmailsList() {
    const { showToast } = useToast();
    const qc = useQueryClient();
    const [filter, setFilter] = useState<Filter | null>(null);
    const [shown, setShown] = useState(PAGE);
    const [busy, setBusy] = useState<number | null>(null);
    const { data, isLoading, isFetching, refetch } = useQuery<ListData>({
        queryKey: ['review-emails'],
        queryFn: () => apiRequest('/api/internal/operations/review-emails'),
    });

    // Vista inicial: «Programadas» si hay; si no, «Todas».
    useEffect(() => {
        if (data && filter === null) setFilter(data.counts.scheduled > 0 ? 'scheduled' : '');
    }, [data, filter]);
    useEffect(() => setShown(PAGE), [filter]);

    const groupOf = (s: State): Filter => (s === 'pending' || s === 'retrying' ? 'scheduled' : s);
    const rows = useMemo(
        () => (data?.items || []).filter(r => !filter || groupOf(r.state) === filter),
        [data, filter],
    );

    // Motivo repetido en «No saldrá»: se explica una vez arriba en vez de en cada fila.
    const commonReason = useMemo(() => {
        const skipped = rows.filter(r => r.state === 'skipped');
        if (skipped.length < 3) return null;
        const tally: Record<string, number> = {};
        skipped.forEach(r => { tally[r.reason || ''] = (tally[r.reason || ''] || 0) + 1; });
        const [reason, n] = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
        return n >= 3 ? { reason, n } : null;
    }, [rows]);

    const sendNow = async (row: Row) => {
        setBusy(row.cremation_id);
        try {
            const r = await apiRequest(`/api/internal/operations/ops/orders/${row.cremation_id}/family-notices/review`, { method: 'POST' });
            showToast(`Invitación enviada a ${r.to}`, 'success');
        } catch (e) {
            showToast(e instanceof Error && e.message ? e.message : 'No se pudo enviar', 'error');
        } finally {
            setBusy(null);
            qc.invalidateQueries({ queryKey: ['review-emails'] });
            qc.invalidateQueries({ queryKey: ['family-notices', row.cremation_id] });
        }
    };

    const counts = data?.counts;
    const total = counts ? counts.sent + counts.scheduled + counts.failed + counts.skipped : 0;
    const countOf = (f: Filter) => (!counts ? 0 : f === '' ? total : counts[f]);

    return (
        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="text-base font-black">Programadas y enviadas</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Órdenes entregadas en los últimos {data?.days ?? 30} días. «Enviada» = el servidor de correo la aceptó · «Abrió Google» = la familia hizo clic en el botón.
                    </p>
                </div>
                <button type="button" onClick={() => refetch()} disabled={isFetching}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs font-bold hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 cursor-pointer">
                    <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} /> Actualizar
                </button>
            </div>

            <div className="flex flex-wrap gap-2" role="tablist">
                {FILTERS.map(f => {
                    const on = filter === f.id;
                    const n = countOf(f.id);
                    return (
                        <button key={f.id || 'all'} type="button" role="tab" aria-selected={on} onClick={() => setFilter(f.id)}
                            className={`rounded-full px-3 py-1.5 text-xs font-bold border transition-colors cursor-pointer ${on
                                ? 'bg-sky-600 text-white border-sky-600'
                                : n === 0
                                    ? 'border-slate-200 dark:border-white/10 text-muted-foreground/60 hover:bg-slate-50 dark:hover:bg-white/5'
                                    : 'border-slate-200 dark:border-white/10 text-foreground hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                            {f.label}<span className={`ml-1.5 ${on ? 'text-white/80' : 'text-muted-foreground'}`}>{n}</span>
                        </button>
                    );
                })}
            </div>

            {commonReason && (
                <div className="flex items-start gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-4 py-3 text-xs">
                    <Info size={15} className="text-sky-600 dark:text-sky-400 shrink-0 mt-px" />
                    <p>
                        <span className="font-bold">{commonReason.n} {commonReason.n === 1 ? 'orden' : 'órdenes'}: {(REASON[commonReason.reason] || 'no saldrán').toLowerCase()}.</span>{' '}
                        <span className="text-muted-foreground">
                            {commonReason.reason === 'before_enabled'
                                ? 'No se invitan solas, pero puedes enviarles la invitación a mano con «Enviar ahora».'
                                : 'No se enviarán automáticamente.'}
                        </span>
                    </p>
                </div>
            )}

            {isLoading || filter === null ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-6"><Loader2 size={16} className="animate-spin" /> Cargando…</div>
            ) : !rows.length ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No hay invitaciones en esta vista.</p>
            ) : (
                <div>
                    {/* Encabezado (solo escritorio) */}
                    <div className="hidden md:grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_auto] gap-4 px-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-slate-200 dark:border-white/10">
                        <span>Familia</span><span>Estado</span><span className="w-[132px] text-right">Acción</span>
                    </div>
                    <ul>
                        {rows.slice(0, shown).map(row => {
                            const ui = STATE_UI[row.state];
                            const Icon = ui.icon;
                            const muted = row.state === 'skipped';
                            const mail = row.sent_to || row.email;
                            const sub = detail(row, data!.max_attempts, !!commonReason && row.reason === commonReason.reason);
                            return (
                                <li key={row.cremation_id}
                                    className={`grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_auto] gap-x-4 gap-y-2 md:items-center px-1 py-3 border-b border-slate-100 dark:border-white/5 last:border-0 ${muted ? 'opacity-75' : ''}`}>
                                    {/* Familia: mascota + dueño + correo */}
                                    <div className="min-w-0">
                                        <Link href={`/dashboard/recepcion-pedidos?orden=${row.cremation_id}`}
                                            className="font-bold text-sm text-foreground hover:text-primary hover:underline">
                                            {row.pet_name || `Orden #${row.cremation_id}`}
                                        </Link>
                                        <p className="text-xs text-muted-foreground truncate" title={`${row.owner_name || ''} · ${mail || 'Sin correo'}`}>
                                            {row.owner_name || '—'} · {mail || <span className="italic">sin correo</span>}
                                        </p>
                                    </div>

                                    {/* Estado: estado + detalle + entrega */}
                                    <div className="min-w-0">
                                        <p className={`flex items-center gap-1.5 text-sm font-bold ${ui.cls}`}>
                                            <Icon size={14} className="shrink-0" /> {ui.label}
                                            <span className="font-normal text-xs text-muted-foreground">· entregada {short(row.delivered_at)}</span>
                                        </p>
                                        {row.state === 'sent' && (row.clicked_at
                                            ? <p className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300"
                                                title={`${row.click_count || 1} ${row.click_count === 1 ? 'clic' : 'clics'} · no confirma que haya dejado la reseña`}>
                                                <MousePointerClick size={13} /> Abrió Google · {when(row.clicked_at)}</p>
                                            : <p className="text-xs text-muted-foreground">Aún no abre el enlace de Google</p>)}
                                        {sub && <p className={`text-xs truncate ${row.state === 'failed' || row.state === 'retrying' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>{sub}</p>}
                                        {(row.state === 'failed' || row.state === 'retrying') && row.last_error && (
                                            <p className="text-[11px] text-red-600/80 dark:text-red-400/80 truncate" title={row.last_error}>{row.last_error}</p>
                                        )}
                                    </div>

                                    {/* Acción */}
                                    <div className="md:w-[132px] md:text-right">
                                        {row.state !== 'sent' && row.can_send && (
                                            <button type="button" onClick={() => sendNow(row)} disabled={busy !== null}
                                                className={`inline-flex items-center justify-center gap-1.5 w-full md:w-auto rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap ${row.state === 'failed' || row.state === 'retrying'
                                                    ? 'bg-red-600 hover:bg-red-700'
                                                    : 'bg-sky-600 hover:bg-sky-700'}`}>
                                                {busy === row.cremation_id ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                                                {row.state === 'failed' || row.state === 'retrying' ? 'Reintentar' : 'Enviar ahora'}
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                    {rows.length > shown && (
                        <div className="pt-3 text-center">
                            <button type="button" onClick={() => setShown(s => s + PAGE)}
                                className="rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer">
                                Ver más ({rows.length - shown})
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
