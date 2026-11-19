'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
    ArrowDownRight,
    ArrowUpRight,
    Calendar,
    GitCommitHorizontal,
    Loader2,
    Plus,
    RefreshCw,
    Trash2,
    TrendingUp,
    X,
} from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';

interface TenantPlanEvent {
    id: number;
    plan_id: number | null;
    plan_name: string | null;
    event_type: 'auto_diff' | 'manual_note' | string;
    title: string;
    notes: string | null;
    changes: {
        added_services?: string[];
        removed_services?: string[];
        added_products?: string[];
        removed_products?: string[];
        price_before?: number;
        price_after?: number;
    };
    created_at: string | null;
}

interface TenantPlanRow {
    plan_id: number;
    plan_name: string;
    price: number;
    before: { orders: number; revenue: number; share_pct: number };
    after: { orders: number; revenue: number; share_pct: number };
    daily_rate_delta_pct: number;
}

interface TenantPlanImpactData {
    window_days: number;
    effective_after_days: number;
    pivot_date: string;
    selected_event: TenantPlanEvent | null;
    events: TenantPlanEvent[];
    summary: {
        before: { orders: number; revenue: number; avg_ticket: number; daily_revenue: number };
        after: { orders: number; revenue: number; avg_ticket: number; daily_revenue: number };
        daily_revenue_delta_pct: number;
        daily_orders_delta_pct: number;
    };
    plans: TenantPlanRow[];
}

const clp = (v: number) => `$${Math.round(v || 0).toLocaleString('es-CL')}`;

const formatDateShort = (iso: string | null) => {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return iso;
    }
};

function DeltaBadge({ pct }: { pct: number }) {
    if (pct === 0) {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300">
                0%
            </span>
        );
    }
    const positive = pct > 0;
    return (
        <span
            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-black ${
                positive
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
            }`}
        >
            {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {positive ? `+${pct}%` : `${pct}%`}
        </span>
    );
}

export default function TenantPlanImpactWidget() {
    const [windowDays, setWindowDays] = useState<number>(14);
    const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
    const [data, setData] = useState<TenantPlanImpactData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const [showAddForm, setShowAddForm] = useState(false);
    const [noteTitle, setNoteTitle] = useState('');
    const [notePlanId, setNotePlanId] = useState('');
    const [noteDate, setNoteDate] = useState('');
    const [noteDetails, setNoteDetails] = useState('');
    const [savingNote, setSavingNote] = useState(false);

    const loadImpact = useCallback(() => {
        setLoading(true);
        const qs = new URLSearchParams({ window_days: String(windowDays) });
        if (selectedEventId) qs.set('event_id', String(selectedEventId));

        apiRequest(`/api/internal/kpis/plan-impact?${qs.toString()}`)
            .then((res: TenantPlanImpactData) => {
                setData(res);
            })
            .catch(() => {
                setData(null);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [windowDays, selectedEventId]);

    useEffect(() => {
        loadImpact();
    }, [loadImpact]);

    const handleCreateNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteTitle.trim()) return;
        setSavingNote(true);
        try {
            const created = await apiRequest('/api/internal/kpis/plan-events', {
                method: 'POST',
                body: JSON.stringify({
                    title: noteTitle.trim(),
                    plan_id: notePlanId ? Number(notePlanId) : null,
                    event_date: noteDate || null,
                    notes: noteDetails.trim() || null,
                }),
            });
            setNoteTitle('');
            setNotePlanId('');
            setNoteDate('');
            setNoteDetails('');
            setShowAddForm(false);
            if (created?.id) {
                setSelectedEventId(created.id);
            } else {
                loadImpact();
            }
        } finally {
            setSavingNote(false);
        }
    };

    const handleDeleteEvent = async (id: number) => {
        try {
            await apiRequest(`/api/internal/kpis/plan-events/${id}`, { method: 'DELETE' });
            if (selectedEventId === id) setSelectedEventId(null);
            loadImpact();
        } catch {
            // ignore
        }
    };

    const events = data?.events ?? [];
    const activeEvent = data?.selected_event ?? null;
    const summary = data?.summary;

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-4 sm:p-5 space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <h2 className="font-black text-slate-900 dark:text-white flex items-center gap-2 text-base">
                        <TrendingUp size={18} className="text-[#2a78d6]" />
                        Impacto de cambios en tus Planes (Antes vs. Después)
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Registra automáticamente cuando mueves un servicio o cambias el precio de un plan para medir su efecto en órdenes e ingresos.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-xl border border-slate-200 dark:border-white/10 p-0.5 bg-slate-50 dark:bg-white/5 text-xs">
                        {[7, 14, 30].map((d) => (
                            <button
                                key={d}
                                type="button"
                                onClick={() => setWindowDays(d)}
                                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                                    windowDays === d
                                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                {d}d
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-3 py-1.5 rounded-xl bg-[#2a78d6]/10 hover:bg-[#2a78d6]/20 border border-[#2a78d6]/30 text-[#2a78d6] dark:text-sky-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                        {showAddForm ? <X size={13} /> : <Plus size={13} />}
                        {showAddForm ? 'Cerrar' : 'Anotar cambio'}
                    </button>

                    <button
                        type="button"
                        onClick={loadImpact}
                        disabled={loading}
                        className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
                        title="Actualizar comparativa"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Formulario manual */}
            {showAddForm && (
                <form
                    onSubmit={handleCreateNote}
                    className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/25 p-4 space-y-3"
                >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                                ¿Qué cambio hiciste? *
                            </label>
                            <input
                                type="text"
                                required
                                value={noteTitle}
                                onChange={(e) => setNoteTitle(e.target.value)}
                                placeholder="Ej: Movimos Huella en cerámica al Plan Memorial"
                                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#2a78d6]"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                                Plan (opcional)
                            </label>
                            <select
                                value={notePlanId}
                                onChange={(e) => setNotePlanId(e.target.value)}
                                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#2a78d6]"
                            >
                                <option value="">Todos / General</option>
                                {(data?.plans || [])
                                    .filter((p) => p.plan_id > 0)
                                    .map((p) => (
                                        <option key={p.plan_id} value={p.plan_id}>
                                            {p.plan_name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                                Fecha del cambio (opcional)
                            </label>
                            <input
                                type="date"
                                value={noteDate}
                                onChange={(e) => setNoteDate(e.target.value)}
                                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#2a78d6]"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <input
                            type="text"
                            value={noteDetails}
                            onChange={(e) => setNoteDetails(e.target.value)}
                            placeholder="Notas adicionales (ej. motivo del traslado)..."
                            className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#2a78d6]"
                        />
                        <button
                            type="submit"
                            disabled={savingNote}
                            className="px-4 py-2 rounded-lg bg-[#2a78d6] hover:bg-[#2367bc] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                        >
                            {savingNote && <Loader2 size={13} className="animate-spin" />}
                            Guardar cambio
                        </button>
                    </div>
                </form>
            )}

            {/* Selector de Hitos */}
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-3">
                {events.length > 0 ? (
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <GitCommitHorizontal size={16} className="text-[#2a78d6] shrink-0" />
                            <select
                                value={activeEvent?.id ?? ''}
                                onChange={(e) => setSelectedEventId(e.target.value ? Number(e.target.value) : null)}
                                className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#2a78d6]"
                            >
                                {events.map((ev) => (
                                    <option key={ev.id} value={ev.id}>
                                        {formatDateShort(ev.created_at)} — {ev.title}
                                    </option>
                                ))}
                            </select>
                            {activeEvent?.event_type === 'manual_note' && (
                                <button
                                    type="button"
                                    onClick={() => handleDeleteEvent(activeEvent.id)}
                                    title="Eliminar anotación"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                                >
                                    <Trash2 size={13} />
                                </button>
                            )}
                        </div>

                        {activeEvent && (
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                <span className="px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300 flex items-center gap-1 font-semibold">
                                    <Calendar size={11} />
                                    {formatDateShort(activeEvent.created_at)}
                                </span>
                                {(activeEvent.changes?.added_services || []).map((s) => (
                                    <span key={`add-${s}`} className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold">
                                        +{s}
                                    </span>
                                ))}
                                {(activeEvent.changes?.removed_services || []).map((s) => (
                                    <span key={`rem-${s}`} className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 font-semibold">
                                        -{s}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Sin cambios registrados aún. Cada vez que edites un plan en <strong>Gestión de Servicios</strong> se registrará automáticamente, o puedes usar <strong>&ldquo;Anotar cambio&rdquo;</strong> para marcar una fecha pasada.
                    </p>
                )}
            </div>

            {loading && !data ? (
                <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Loader2 size={16} className="animate-spin text-[#2a78d6]" />
                    Calculando comparativa Antes vs. Después...
                </div>
            ) : summary ? (
                <>
                    {/* KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-3.5 bg-slate-50/60 dark:bg-white/[0.02]">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    Órdenes ({windowDays}d antes vs. {data?.effective_after_days}d después)
                                </span>
                                <DeltaBadge pct={summary.daily_orders_delta_pct} />
                            </div>
                            <div className="mt-1.5 flex items-baseline gap-2">
                                <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                                    {summary.after.orders}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    vs. {summary.before.orders} antes
                                </span>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-3.5 bg-slate-50/60 dark:bg-white/[0.02]">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    Ritmo de Ingreso Diario
                                </span>
                                <DeltaBadge pct={summary.daily_revenue_delta_pct} />
                            </div>
                            <div className="mt-1.5 flex items-baseline gap-2">
                                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                    {clp(summary.after.daily_revenue)}/día
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    vs. {clp(summary.before.daily_revenue)}/día
                                </span>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-3.5 bg-slate-50/60 dark:bg-white/[0.02]">
                            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Ticket Promedio
                            </span>
                            <div className="mt-1.5 flex items-baseline gap-2">
                                <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                                    {clp(summary.after.avg_ticket)}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    vs. {clp(summary.before.avg_ticket)} antes
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Desglose por plan */}
                    {data?.plans && data.plans.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-white/10 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        <th className="py-2 pr-3">Plan</th>
                                        <th className="py-2 px-3 text-right">Antes ({windowDays}d)</th>
                                        <th className="py-2 px-3 text-right">Después ({data.effective_after_days}d)</th>
                                        <th className="py-2 px-3 text-right">Ingresos Antes → Después</th>
                                        <th className="py-2 pl-3 text-right">Ritmo Diario</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {data.plans.map((p) => (
                                        <tr key={`${p.plan_id}-${p.plan_name}`} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02]">
                                            <td className="py-2.5 pr-3 font-bold text-slate-900 dark:text-white">
                                                {p.plan_name}
                                                {p.price > 0 && (
                                                    <span className="ml-2 text-[11px] font-normal text-slate-400">
                                                        {clp(p.price)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300 tabular-nums">
                                                {p.before.orders}{' '}
                                                <span className="text-[11px] text-slate-400">({p.before.share_pct}%)</span>
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                                                {p.after.orders}{' '}
                                                <span className="text-[11px] font-normal text-slate-400">({p.after.share_pct}%)</span>
                                            </td>
                                            <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300 tabular-nums">
                                                {clp(p.before.revenue)} →{' '}
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                    {clp(p.after.revenue)}
                                                </span>
                                            </td>
                                            <td className="py-2.5 pl-3 text-right">
                                                <DeltaBadge pct={p.daily_rate_delta_pct} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            ) : null}
        </div>
    );
}
