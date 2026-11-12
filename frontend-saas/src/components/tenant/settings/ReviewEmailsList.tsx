'use client';

/**
 * «Programadas y enviadas»: seguimiento de las invitaciones a reseña de Google de
 * las órdenes entregadas en los últimos 30 días (Configuración → Reseñas en Google).
 * «Enviada ✓» = el servidor de correo la aceptó (equivale al «200»); «Con error» =
 * la rechazó (se reintenta hasta 3 veces, el motivo queda visible).
 * API GET /api/internal/operations/review-emails?state=; lógica google_review.tenant_list().
 */
import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Loader2, Mail, MinusCircle, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { formatChileDate, formatChileTime } from '@/lib/dates';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

type State = 'sent' | 'scheduled' | 'pending' | 'retrying' | 'failed' | 'skipped';
type Filter = '' | 'scheduled' | 'sent' | 'failed' | 'skipped';

interface Row {
    cremation_id: number;
    verification_code?: string | null;
    pet_name?: string | null;
    owner_name?: string | null;
    email?: string | null;
    delivered_at?: string | null;
    state: State;
    sent_at?: string | null;
    sent_to?: string | null;
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
    before_enabled: 'Entregada antes de activarlas',
    expired: 'Pasó la fecha sin enviarse',
};

const when = (iso?: string | null) => (iso ? `${formatChileDate(iso)} ${formatChileTime(iso)}` : '—');

function StateBadge({ row, maxAttempts }: { row: Row; maxAttempts: number }) {
    const pill = 'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap';
    switch (row.state) {
        case 'sent':
            return <span className={`${pill} bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30`}><CheckCircle2 size={12} /> Enviada</span>;
        case 'scheduled':
            return <span className={`${pill} bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30`}><CalendarClock size={12} /> Programada</span>;
        case 'pending':
            return <span className={`${pill} bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30`}><Clock size={12} /> Saliendo</span>;
        case 'retrying':
            return <span className={`${pill} bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30`}><RefreshCw size={12} /> Reintentando ({row.attempts}/{maxAttempts})</span>;
        case 'failed':
            return <span className={`${pill} bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/30`}><AlertTriangle size={12} /> Error</span>;
        default:
            return <span className={`${pill} bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/20`}><MinusCircle size={12} /> No saldrá</span>;
    }
}

function Detail({ row }: { row: Row }) {
    if (row.state === 'sent') return <>Aceptada por el servidor de correo · {when(row.sent_at)}</>;
    if (row.state === 'scheduled') return <>Sale el {when(row.scheduled_for)}</>;
    if (row.state === 'pending') return <>Sale en los próximos minutos</>;
    if (row.state === 'retrying' || row.state === 'failed') {
        return (
            <span className="text-red-600 dark:text-red-400" title={row.last_error || undefined}>
                {row.state === 'failed' ? 'Rechazada 3 veces' : 'Rechazada, se reintentará'} · {when(row.last_attempt_at)}
                {row.last_error && <span className="block truncate max-w-[320px] text-[11px] opacity-80">{row.last_error}</span>}
            </span>
        );
    }
    return <>{REASON[row.reason || ''] || '—'}</>;
}

export function ReviewEmailsList() {
    const { showToast } = useToast();
    const qc = useQueryClient();
    const [filter, setFilter] = useState<Filter>('');
    const [busy, setBusy] = useState<number | null>(null);
    const key = ['review-emails', filter];
    const { data, isLoading, isFetching, refetch } = useQuery<ListData>({
        queryKey: key,
        queryFn: () => apiRequest(`/api/internal/operations/review-emails${filter ? `?state=${filter}` : ''}`),
    });

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
    const countOf = (f: Filter) => (!counts ? null : f === '' ? total : counts[f]);

    return (
        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-base font-black">Programadas y enviadas</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Órdenes entregadas en los últimos {data?.days ?? 30} días. «Enviada» = el servidor de correo la aceptó.
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
                                : 'border-slate-200 dark:border-white/10 text-foreground hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                            {f.label}{n !== null && <span className={`ml-1.5 ${on ? 'text-white/80' : 'text-muted-foreground'}`}>{n}</span>}
                        </button>
                    );
                })}
            </div>

            {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-6"><Loader2 size={16} className="animate-spin" /> Cargando…</div>
            ) : !data?.items.length ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No hay invitaciones en esta vista.</p>
            ) : (
                <div className="overflow-x-auto -mx-5 px-5">
                    <table className="w-full text-sm min-w-[720px]">
                        <thead>
                            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-slate-200 dark:border-white/10">
                                <th className="py-2 pr-3 font-bold">Mascota / familia</th>
                                <th className="py-2 pr-3 font-bold">Correo</th>
                                <th className="py-2 pr-3 font-bold">Entregada</th>
                                <th className="py-2 pr-3 font-bold">Estado</th>
                                <th className="py-2 pr-3 font-bold">Detalle</th>
                                <th className="py-2 font-bold text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map(row => (
                                <tr key={row.cremation_id} className="border-b border-slate-100 dark:border-white/5 last:border-0 align-top">
                                    <td className="py-2.5 pr-3">
                                        <Link href={`/dashboard/recepcion-pedidos?orden=${row.cremation_id}`} className="font-bold hover:underline text-primary">
                                            {row.pet_name || `Orden #${row.cremation_id}`}
                                        </Link>
                                        <span className="block text-xs text-muted-foreground">{row.owner_name || '—'}</span>
                                    </td>
                                    <td className="py-2.5 pr-3 text-xs break-all">{row.sent_to || row.email || <span className="text-muted-foreground">Sin correo</span>}</td>
                                    <td className="py-2.5 pr-3 text-xs whitespace-nowrap">{formatChileDate(row.delivered_at)}</td>
                                    <td className="py-2.5 pr-3"><StateBadge row={row} maxAttempts={data.max_attempts} /></td>
                                    <td className="py-2.5 pr-3 text-xs text-muted-foreground"><Detail row={row} /></td>
                                    <td className="py-2.5 text-right">
                                        {row.state !== 'sent' && row.can_send && (
                                            <button type="button" onClick={() => sendNow(row)} disabled={busy !== null}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 disabled:opacity-50 cursor-pointer whitespace-nowrap">
                                                {busy === row.cremation_id ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                                                {row.state === 'failed' || row.state === 'retrying' ? 'Reintentar' : 'Enviar ahora'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
