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
import { apiRequest } from '@/lib/admin/api';

interface PlanChangeEvent {
    id: number;
    plan_id: number | null;
    plan_name: string | null;
    event_type: 'auto_diff' | 'manual_note' | string;
    title: string;
    notes: string | null;
    changes: {
        added_modules?: string[];
        removed_modules?: string[];
        price_before?: number;
        price_after?: number;
        limits_changed?: Record<string, { before: unknown; after: unknown }>;
    };
    created_at: string | null;
}

interface WindowStats {
    subscriptions: number;
    payments: number;
    revenue: number;
    upgrades?: number;
    daily_revenue?: number;
}

interface PlanImpactRow {
    plan_id: number;
    plan_name: string;
    price: number;
    before: { subscriptions: number; payments: number; revenue: number; share_pct: number };
    after: { subscriptions: number; payments: number; revenue: number; share_pct: number };
    daily_rate_delta_pct: number;
}

interface PlanImpactResponse {
    window_days: number;
    effective_after_days: number;
    pivot_date: string;
    selected_event: PlanChangeEvent | null;
    events: PlanChangeEvent[];
    summary: {
        before: WindowStats;
        after: WindowStats;
        daily_revenue_delta_pct: number;
        daily_subscriptions_delta_pct: number;
    };
    plans: PlanImpactRow[];
}

const formatCLP = (val: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val || 0);

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
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/60">
                0%
            </span>
        );
    }
    const positive = pct > 0;
    return (
        <span
            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black ${
                positive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}
        >
            {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {positive ? `+${pct}%` : `${pct}%`}
        </span>
    );
}

export default function PlanStrategyImpactWidget() {
    const [windowDays, setWindowDays] = useState<number>(14);
    const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
    const [data, setData] = useState<PlanImpactResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // Form para anotar un hito manual
    const [showAddForm, setShowAddForm] = useState(false);
    const [noteTitle, setNoteTitle] = useState('');
    const [notePlanId, setNotePlanId] = useState<string>('');
    const [noteDate, setNoteDate] = useState('');
    const [noteDetails, setNoteDetails] = useState('');
    const [savingNote, setSavingNote] = useState(false);

    const loadImpact = useCallback(() => {
        setLoading(true);
        const qs = new URLSearchParams({ window_days: String(windowDays) });
        if (selectedEventId) qs.set('event_id', String(selectedEventId));

        apiRequest(`/api/internal/creator/telemetry/plan-impact?${qs.toString()}`)
            .then((res: PlanImpactResponse) => {
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
            const created = await apiRequest('/api/internal/creator/telemetry/plan-events', {
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
            await apiRequest(`/api/internal/creator/telemetry/plan-events/${id}`, { method: 'DELETE' });
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
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm space-y-5">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="text-amber-400" size={18} />
                        <h3 className="text-base font-bold text-white">
                            Impacto de Cambios en Planes (Antes vs. Después)
                        </h3>
                    </div>
                    <p className="text-xs text-white/50 mt-0.5">
                        Bitácora automática de cambios en servicios, precios o límites y su efecto real en ventas e ingresos.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
                        {[7, 14, 30].map((d) => (
                            <button
                                key={d}
                                type="button"
                                onClick={() => setWindowDays(d)}
                                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                    windowDays === d ? 'bg-amber-500 text-white shadow-xs' : 'text-white/60 hover:text-white'
                                }`}
                            >
                                {d}d
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                        {showAddForm ? <X size={13} /> : <Plus size={13} />}
                        {showAddForm ? 'Cerrar' : 'Anotar hito'}
                    </button>

                    <button
                        type="button"
                        onClick={loadImpact}
                        disabled={loading}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                        title="Actualizar análisis"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Formulario inline para registrar hito manual (incluyendo fecha retroactiva) */}
            {showAddForm && (
                <form
                    onSubmit={handleCreateNote}
                    className="bg-black/30 border border-amber-500/25 rounded-xl p-4 space-y-3"
                >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">
                                ¿Qué cambio de estrategia hiciste? *
                            </label>
                            <input
                                type="text"
                                required
                                value={noteTitle}
                                onChange={(e) => setNoteTitle(e.target.value)}
                                placeholder="Ej: Movimos Plantillas Celestiales de Normal a Pro"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-amber-400"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">
                                Plan principal (opcional)
                            </label>
                            <select
                                value={notePlanId}
                                onChange={(e) => setNotePlanId(e.target.value)}
                                className="w-full bg-[#12141a] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                            >
                                <option value="">Todos / General</option>
                                {(data?.plans || []).map((p) => (
                                    <option key={p.plan_id} value={p.plan_id}>
                                        {p.plan_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">
                                Fecha del cambio (opcional)
                            </label>
                            <input
                                type="date"
                                value={noteDate}
                                onChange={(e) => setNoteDate(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <input
                            type="text"
                            value={noteDetails}
                            onChange={(e) => setNoteDetails(e.target.value)}
                            placeholder="Notas adicionales (ej. hipótesis o motivo del cambio)..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-amber-400"
                        />
                        <button
                            type="submit"
                            disabled={savingNote}
                            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {savingNote && <Loader2 size={13} className="animate-spin" />}
                            Guardar Hito
                        </button>
                    </div>
                </form>
            )}

            {/* Selector de Hitos */}
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3.5">
                {events.length > 0 ? (
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <GitCommitHorizontal size={16} className="text-amber-400 shrink-0" />
                            <select
                                value={activeEvent?.id ?? ''}
                                onChange={(e) => setSelectedEventId(e.target.value ? Number(e.target.value) : null)}
                                className="flex-1 bg-[#12141a] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-400"
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
                                    className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                >
                                    <Trash2 size={13} />
                                </button>
                            )}
                        </div>

                        {activeEvent && (
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/70 flex items-center gap-1">
                                    <Calendar size={10} />
                                    {formatDateShort(activeEvent.created_at)}
                                </span>
                                {(activeEvent.changes?.added_modules || []).map((m) => (
                                    <span key={`add-${m}`} className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-mono">
                                        +{m}
                                    </span>
                                ))}
                                {(activeEvent.changes?.removed_modules || []).map((m) => (
                                    <span key={`rem-${m}`} className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/25 font-mono">
                                        -{m}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-xs text-white/50 flex items-center justify-between gap-2">
                        <span>
                            Sin hitos registrados aún. Al editar cualquier plan se registrará automáticamente, o usa <strong>&ldquo;Anotar hito&rdquo;</strong> para marcar un cambio ya realizado.
                        </span>
                    </div>
                )}
            </div>

            {loading && !data ? (
                <div className="py-10 flex items-center justify-center gap-2 text-xs text-white/50">
                    <Loader2 size={16} className="animate-spin text-amber-400" />
                    Calculando comparativa Antes vs. Después...
                </div>
            ) : summary ? (
                <>
                    {/* KPIs Comparativos */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                                    Suscripciones ({windowDays}d antes vs. {data?.effective_after_days}d después)
                                </span>
                                <DeltaBadge pct={summary.daily_subscriptions_delta_pct} />
                            </div>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-xl font-black text-white">{summary.after.subscriptions}</span>
                                <span className="text-xs text-white/40">vs. {summary.before.subscriptions} antes</span>
                            </div>
                        </div>

                        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                                    Ritmo de Ingreso Diario
                                </span>
                                <DeltaBadge pct={summary.daily_revenue_delta_pct} />
                            </div>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-xl font-black text-emerald-300">
                                    {formatCLP(summary.after.daily_revenue || 0)}/día
                                </span>
                                <span className="text-xs text-white/40">
                                    vs. {formatCLP(summary.before.daily_revenue || 0)}/día
                                </span>
                            </div>
                        </div>

                        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">
                                Upgrades de Plan
                            </div>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-xl font-black text-amber-300">{summary.after.upgrades ?? 0}</span>
                                <span className="text-xs text-white/40">vs. {summary.before.upgrades ?? 0} antes</span>
                            </div>
                        </div>
                    </div>

                    {/* Desglose por Plan (detecta qué plan subió y si hubo canibalización) */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-white/40">
                                    <th className="py-2 pr-3">Plan</th>
                                    <th className="py-2 px-3 text-right">Antes ({windowDays}d)</th>
                                    <th className="py-2 px-3 text-right">Después ({data?.effective_after_days}d)</th>
                                    <th className="py-2 px-3 text-right">Ingresos Antes → Después</th>
                                    <th className="py-2 pl-3 text-right">Ritmo Diario</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {data?.plans.map((p) => (
                                    <tr key={p.plan_id} className="hover:bg-white/[0.02]">
                                        <td className="py-2.5 pr-3 font-bold text-white">
                                            {p.plan_name}
                                            <span className="ml-2 text-[10px] font-normal text-white/40">
                                                {formatCLP(p.price)}/mes
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-white/70">
                                            {p.before.subscriptions}{' '}
                                            <span className="text-[10px] text-white/40">({p.before.share_pct}%)</span>
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-bold text-white">
                                            {p.after.subscriptions}{' '}
                                            <span className="text-[10px] font-normal text-white/40">({p.after.share_pct}%)</span>
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-white/70">
                                            {formatCLP(p.before.revenue)} →{' '}
                                            <span className="text-emerald-300 font-semibold">{formatCLP(p.after.revenue)}</span>
                                        </td>
                                        <td className="py-2.5 pl-3 text-right">
                                            <DeltaBadge pct={p.daily_rate_delta_pct} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : null}
        </div>
    );
}
