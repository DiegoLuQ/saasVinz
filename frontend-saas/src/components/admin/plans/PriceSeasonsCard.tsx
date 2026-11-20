"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarRange, CheckCircle2, ChevronDown, Copy, Plus, Power, Save, Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';

const fmt = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
const BASE = '/api/internal/creator/pricing/seasons';

interface SeasonRow { plan_id: number; name: string; is_active: boolean; monthly: number; annual: number | null }
interface Season {
    id: number; name: string; annual_discount_pct: number; launch: boolean;
    compare_season_id: number | null; is_current: boolean; activated_at: string | null; rows: SeasonRow[];
}
interface Draft { name: string; pct: string; launch: boolean; compare: string; prices: Record<number, string> }

interface Props {
    onSaved: () => Promise<unknown> | void;
    onToast: (msg: string, type: 'success' | 'error') => void;
}

const toDraft = (s: Season): Draft => ({
    name: s.name, pct: String(s.annual_discount_pct), launch: s.launch,
    compare: s.compare_season_id ? String(s.compare_season_id) : '',
    prices: Object.fromEntries(s.rows.map(r => [r.plan_id, String(Math.round(r.monthly))])),
});

/**
 * Temporadas de precios («Lanzamiento», «Regular», «Black Friday»…). Cada una tiene
 * su precio mensual por plan y su % anual; una sola está vigente y la activas tú.
 * Activarla cambia los precios en todo el sistema (web, comparación, facturación, PDF).
 * Los crematorios que ya contrataron mantienen su precio para siempre.
 */
export default function PriceSeasonsCard({ onSaved, onToast }: Props) {
    const [open, setOpen] = useState(false);
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [maxDiscount, setMaxDiscount] = useState(60);
    const [selected, setSelected] = useState<number | null>(null);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [busy, setBusy] = useState(false);

    const load = async (keep?: number | null) => {
        const d = await apiRequest(BASE) as { seasons: Season[]; max_discount: number };
        setSeasons(d.seasons);
        setMaxDiscount(d.max_discount);
        const pick = d.seasons.find(s => s.id === keep) || d.seasons.find(s => s.is_current) || d.seasons[0];
        setSelected(pick?.id ?? null);
        setDraft(pick ? toDraft(pick) : null);
    };

    useEffect(() => {
        load().catch(() => onToast('No se pudieron cargar las temporadas de precios', 'error'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const season = seasons.find(s => s.id === selected) || null;
    const current = seasons.find(s => s.is_current) || null;
    const pct = Math.min(maxDiscount, Math.max(0, parseInt(draft?.pct || '0', 10) || 0));
    const dirty = useMemo(() => !!season && !!draft && JSON.stringify(toDraft(season)) !== JSON.stringify(draft), [season, draft]);

    const pick = (s: Season) => {
        if (dirty && !window.confirm('Tienes cambios sin guardar en esta temporada. ¿Descartarlos?')) return;
        setSelected(s.id);
        setDraft(toDraft(s));
    };

    const body = (d: Draft) => ({
        name: d.name, annual_discount_pct: pct, launch: d.launch,
        compare_season_id: d.compare ? Number(d.compare) : null,
        prices: Object.fromEntries(Object.entries(d.prices).map(([k, v]) => [k, Number(v.replace(/\D/g, '')) || 0])),
    });

    const run = async (fn: () => Promise<unknown>, ok: string, keep?: number | null, refreshPlans = false) => {
        setBusy(true);
        try {
            await fn();
            await load(keep);
            onToast(ok, 'success');
            if (refreshPlans) await onSaved();
        } catch (err: unknown) {
            onToast((err as Error)?.message || 'No se pudo guardar', 'error');
        } finally {
            setBusy(false);
        }
    };

    const save = () => season && draft && run(
        () => apiRequest(`${BASE}/${season.id}`, { method: 'PUT', body: body(draft) }),
        season.is_current ? 'Temporada guardada: los precios ya se ven en todo el sistema' : 'Temporada guardada',
        season.id, season.is_current);

    const create = (from?: Season) => {
        const name = window.prompt('Nombre de la nueva temporada (ej. Regular, Black Friday):', from ? `${from.name} (copia)` : '');
        if (!name?.trim()) return;
        setBusy(true);
        apiRequest(BASE, {
            method: 'POST',
            body: from ? { ...body(toDraft(from)), name: name.trim(), compare_season_id: null } : { name: name.trim(), annual_discount_pct: current?.annual_discount_pct ?? 0 },
        })
            .then(async (s: Season) => { await load(s.id); onToast(`Temporada «${s.name}» creada (aún no está vigente)`, 'success'); })
            .catch((err: unknown) => onToast((err as Error)?.message || 'No se pudo crear', 'error'))
            .finally(() => setBusy(false));
    };

    const activate = () => {
        if (!season || season.is_current) return;
        if (dirty) { onToast('Guarda los cambios antes de activarla', 'error'); return; }
        if (!window.confirm(`¿Activar «${season.name}»? Desde ahora la web, la comparación de planes y la facturación mostrarán estos precios. Los crematorios que ya contrataron mantienen su precio.`)) return;
        run(() => apiRequest(`${BASE}/${season.id}/activate`, { method: 'POST' }), `«${season.name}» es ahora la temporada vigente`, season.id, true);
    };

    const remove = () => {
        if (!season || season.is_current) return;
        if (!window.confirm(`¿Eliminar la temporada «${season.name}»?`)) return;
        run(() => apiRequest(`${BASE}/${season.id}`, { method: 'DELETE' }), 'Temporada eliminada', null);
    };

    const ref = draft?.compare ? seasons.find(s => String(s.id) === draft.compare) : null;

    return (
        <section className="bg-[#0a192f] border border-sky-500/20 rounded-3xl p-6 space-y-5">
            <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="flex items-start gap-3 text-left w-full">
                <span className="p-2.5 rounded-2xl bg-sky-500/15 text-sky-400 shrink-0"><CalendarRange size={22} /></span>
                <div className="min-w-0">
                    <h3 className="text-lg font-black text-white">
                        Temporadas de precios
                        {!open && current && <span className="ml-2 text-sm font-bold text-sky-400">Vigente: {current.name}</span>}
                    </h3>
                    <p className="text-sm text-white/50 max-w-2xl">
                        Listas de precios con nombre (Lanzamiento, Regular, Black Friday…). Cada una tiene su precio mensual por plan y su descuento anual. La que actives se usa en todo el sistema; quien ya contrató mantiene su precio para siempre.
                    </p>
                </div>
                <ChevronDown size={20} className={`ml-auto mt-1 shrink-0 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && <>
                <div className="flex flex-wrap items-center gap-2">
                    {seasons.map(s => (
                        <button key={s.id} type="button" onClick={() => pick(s)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold border transition-all ${s.id === selected ? 'bg-sky-500/20 border-sky-400/60 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}>
                            {s.is_current && <CheckCircle2 size={14} className="text-emerald-400" />}
                            {s.name}
                        </button>
                    ))}
                    <button type="button" onClick={() => create()} disabled={busy}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-bold border border-dashed border-white/20 text-white/60 hover:text-white disabled:opacity-40">
                        <Plus size={14} /> Nueva temporada
                    </button>
                </div>

                {season && draft && (
                    <div className="space-y-5 rounded-2xl border border-white/10 p-5">
                        <div className="flex flex-wrap items-center gap-2">
                            {season.is_current
                                ? <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-black">Vigente{season.activated_at ? ` desde ${new Date(season.activated_at).toLocaleDateString('es-CL')}` : ''}</span>
                                : <span className="px-3 py-1 rounded-full bg-white/10 text-white/60 text-xs font-black">No vigente</span>}
                            <div className="ml-auto flex flex-wrap gap-2">
                                <button type="button" onClick={() => create(season)} disabled={busy}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold disabled:opacity-40">
                                    <Copy size={14} /> Duplicar
                                </button>
                                {!season.is_current && <>
                                    <button type="button" onClick={remove} disabled={busy}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-rose-300 text-xs font-bold disabled:opacity-40">
                                        <Trash2 size={14} /> Eliminar
                                    </button>
                                    <button type="button" onClick={activate} disabled={busy}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black disabled:opacity-40">
                                        <Power size={14} /> Activar esta temporada
                                    </button>
                                </>}
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <label className="space-y-1.5">
                                <span className="text-xs font-bold text-white/60">Nombre</span>
                                <input value={draft.name} maxLength={60} onChange={e => setDraft({ ...draft, name: e.target.value })}
                                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-white outline-none focus:border-sky-400" />
                            </label>
                            <label className="space-y-1.5">
                                <span className="text-xs font-bold text-white/60">Descuento por pago anual (%)</span>
                                <input type="number" min={0} max={maxDiscount} value={draft.pct}
                                    onChange={e => setDraft({ ...draft, pct: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-white outline-none focus:border-sky-400" />
                            </label>
                            <label className="space-y-1.5">
                                <span className="text-xs font-bold text-white/60">Mostrar tachado el precio de</span>
                                <select value={draft.compare} onChange={e => setDraft({ ...draft, compare: e.target.value })}
                                    className="w-full rounded-xl bg-[#0a192f] border border-white/10 px-3 py-2.5 text-white outline-none focus:border-sky-400">
                                    <option value="">Ninguna (sin tachado)</option>
                                    {seasons.filter(s => s.id !== season.id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </label>
                        </div>

                        <label className="flex items-start gap-3 cursor-pointer select-none">
                            <input type="checkbox" checked={draft.launch} onChange={e => setDraft({ ...draft, launch: e.target.checked })} className="mt-1 h-4 w-4 accent-sky-500" />
                            <span>
                                <span className="block text-sm font-bold text-white">Mostrar como «precio de lanzamiento»</span>
                                <span className="block text-xs text-white/50">La web muestra el aviso «Beneficio exclusivo para los primeros crematorios… mantienes este precio para siempre».</span>
                            </span>
                        </label>

                        <div className="overflow-x-auto rounded-2xl border border-white/10">
                            <table className="w-full min-w-[560px] text-sm">
                                <thead>
                                    <tr className="text-left text-[11px] uppercase tracking-wider text-white/40 bg-white/[0.03]">
                                        <th className="px-4 py-3">Plan</th>
                                        <th className="px-4 py-3">Mensual (CLP)</th>
                                        <th className="px-4 py-3">Anual (−{pct} %)</th>
                                        {ref && <th className="px-4 py-3">Tachado ({ref.name})</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {season.rows.map(r => {
                                        const monthly = Number((draft.prices[r.plan_id] || '').replace(/\D/g, '')) || 0;
                                        const annual = monthly > 0 ? Math.round(monthly * 12 * (1 - pct / 100)) : null;
                                        const refMonthly = ref?.rows.find(x => x.plan_id === r.plan_id)?.monthly || 0;
                                        return (
                                            <tr key={r.plan_id} className="border-t border-white/5">
                                                <td className="px-4 py-2.5 font-bold text-white">
                                                    {r.name}{!r.is_active && <span className="ml-2 text-[10px] text-white/40">(inactivo)</span>}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <input inputMode="numeric" value={draft.prices[r.plan_id] ?? ''}
                                                        onChange={e => setDraft({ ...draft, prices: { ...draft.prices, [r.plan_id]: e.target.value.replace(/\D/g, '').slice(0, 9) } })}
                                                        className="w-36 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-white tabular-nums outline-none focus:border-sky-400" />
                                                </td>
                                                <td className="px-4 py-2.5 text-white/70 tabular-nums">{annual ? fmt(annual) : '—'}</td>
                                                {ref && <td className="px-4 py-2.5 tabular-nums text-white/40">
                                                    {refMonthly > monthly && monthly > 0 ? <span className="line-through">{fmt(refMonthly)}</span> : '—'}
                                                </td>}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-white/40 max-w-xl">
                                {season.is_current
                                    ? 'Es la temporada vigente: al guardar, los precios cambian al instante en la web, la comparación y la facturación.'
                                    : 'Puedes prepararla con calma: no cambia nada hasta que pulses «Activar esta temporada».'}
                            </p>
                            <button type="button" onClick={save} disabled={!dirty || busy}
                                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                                <Save size={16} /> {busy ? 'Guardando…' : 'Guardar temporada'}
                            </button>
                        </div>
                    </div>
                )}
            </>}
        </section>
    );
}
