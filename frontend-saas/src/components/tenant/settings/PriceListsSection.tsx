'use client';

/**
 * Tablas de precios con nombre (promociones / plantillas) — Configuración → Formulario y Pesos →
 * Pesos y precios. Cada tabla es independiente de la General: tiene sus PROPIOS rangos de peso y el
 * precio de cada plan según el peso (celda vacía = precio base del plan). Cada enlace del catálogo
 * de planes elige su tabla. Se guardan solas (API /api/internal/price-lists).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgePercent, CalendarRange, Copy, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import PlanWeightPriceTable, { type PlanWeightRow } from './PlanWeightPriceTable';

interface ListTier {
    id: number;
    label: string | null;
    min_weight: number;
    max_weight: number | null;
}

export interface PriceList {
    id: number;
    name: string;
    tiers: ListTier[];
    plan_prices: Record<string, Record<string, number>>;
    valid_from: string | null;
    valid_until: string | null;
    is_active: boolean;
    status: 'activa' | 'programada' | 'vencida' | 'pausada';
    links: number;
}

interface TierRow {
    label: string;
    min_weight: string;
    max_weight: string;
}

interface Draft {
    id?: number;
    name: string;
    valid_from: string;
    valid_until: string;
    is_active: boolean;
    tiers: TierRow[];
    plans: Record<number, string[]>;    // plan_id → precio por posición del rango
}

const MAX_TIERS = 20;
const NO_GROUP = '__none__';
const ALL = '__all__';

export const PRICE_LIST_STATUS: Record<PriceList['status'], { label: string; cls: string }> = {
    activa: { label: 'Activa', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
    programada: { label: 'Programada', cls: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
    vencida: { label: 'Vencida', cls: 'bg-slate-500/15 text-slate-600 dark:text-slate-400' },
    pausada: { label: 'Pausada', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
};

const fmtKg = (n: number) => String(n).replace('.', ',');
const parseKg = (v: string) => parseFloat(v.trim().replace(',', '.'));
const fmtDate = (d: string) => d.split('-').reverse().join('-');
const errMsg = (err: unknown, fallback: string) => (err as { message?: string })?.message || fallback;
const inputCls = 'w-full rounded-xl border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary';

export default function PriceListsSection({ reloadKey }: {
    /** Cambia después de guardar la configuración (recarga los planes). */
    reloadKey: number;
}) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [lists, setLists] = useState<PriceList[]>([]);
    const [plans, setPlans] = useState<PlanWeightRow[]>([]);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [groupFilter, setGroupFilter] = useState<string>(ALL);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<number | null>(null);

    const load = useCallback(async () => {
        try {
            const [ls, table] = await Promise.all([
                apiRequest('/api/internal/price-lists'),
                apiRequest('/api/internal/maintenance/plan-weight-prices').catch(() => null),
            ]);
            setLists(ls as PriceList[]);
            setPlans(((table?.plans || []) as PlanWeightRow[]).filter(p => p.is_active !== false));
        } catch {
            // la sección queda vacía; el resto de la pestaña sigue funcionando
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load, reloadKey]);

    const groups = useMemo(() => {
        const names = Array.from(new Set(plans.map(p => p.group_name).filter((g): g is string => !!g)));
        return names.sort((a, b) => a.localeCompare(b, 'es'));
    }, [plans]);
    const hasUngrouped = plans.some(p => !p.group_name);
    const visiblePlans = useMemo(() => plans.filter(p => (
        groupFilter === ALL ? true : groupFilter === NO_GROUP ? !p.group_name : p.group_name === groupFilter
    )), [plans, groupFilter]);

    const toDraft = (pl?: PriceList): Draft => {
        const tiers = pl?.tiers || [];
        return {
            id: pl?.id,
            name: pl?.name || '',
            valid_from: pl?.valid_from || '',
            valid_until: pl?.valid_until || '',
            is_active: pl?.is_active ?? true,
            tiers: tiers.length
                ? tiers.map(t => ({
                    label: t.label || '',
                    min_weight: fmtKg(t.min_weight ?? 0),
                    max_weight: t.max_weight != null ? fmtKg(t.max_weight) : '',
                }))
                : [{ label: '', min_weight: '0', max_weight: '' }],
            plans: Object.fromEntries(plans.map(p => [
                p.plan_id,
                (tiers.length ? tiers : [null]).map(t => {
                    const v = t ? pl?.plan_prices?.[String(p.plan_id)]?.[String(t.id)] : undefined;
                    return v != null ? String(Math.round(v)) : '';
                }),
            ])),
        };
    };

    const openDraft = (d: Draft) => {
        setGroupFilter(ALL);
        setDraft(d);
    };

    const duplicate = (pl: PriceList) => openDraft({ ...toDraft(pl), id: undefined, name: `${pl.name} (copia)`.slice(0, 60) });

    // --- rangos de la tabla ---
    const updateTier = (idx: number, patch: Partial<TierRow>) => setDraft(d => d && ({
        ...d, tiers: d.tiers.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
    }));
    const addTier = () => setDraft(d => {
        if (!d || d.tiers.length >= MAX_TIERS) return d;
        const last = d.tiers[d.tiers.length - 1];
        const lastMax = last ? parseKg(last.max_weight) : NaN;
        const next = Number.isFinite(lastMax) ? fmtKg(Math.round((lastMax + 0.1) * 10) / 10) : '';
        return {
            ...d,
            tiers: [...d.tiers, { label: '', min_weight: next, max_weight: '' }],
            plans: Object.fromEntries(Object.entries(d.plans).map(([k, row]) => [k, [...row, '']])),
        };
    });
    const removeTier = (idx: number) => setDraft(d => d && d.tiers.length > 1 ? ({
        ...d,
        tiers: d.tiers.filter((_, i) => i !== idx),
        plans: Object.fromEntries(Object.entries(d.plans).map(([k, row]) => [k, row.filter((_, i) => i !== idx)])),
    }) : d);

    const save = async () => {
        if (!draft) return;
        if (!draft.name.trim()) {
            showToast('Escribe un nombre para la tabla', 'error');
            return;
        }
        const tiers = draft.tiers.map((t, i) => ({
            label: t.label.trim() || null,
            min_weight: t.min_weight.trim() ? parseKg(t.min_weight) : (i === 0 ? 0 : null),
            max_weight: t.max_weight.trim() ? parseKg(t.max_weight) : null,
        }));
        if (tiers.some(t => (t.min_weight != null && !Number.isFinite(t.min_weight)) || (t.max_weight != null && !Number.isFinite(t.max_weight)))) {
            showToast('Revisa los pesos: usa números (ej. 4 o 4,5)', 'error');
            return;
        }
        const body = {
            name: draft.name.trim(),
            valid_from: draft.valid_from || null,
            valid_until: draft.valid_until || null,
            is_active: draft.is_active,
            tiers,
            plan_prices: Object.fromEntries(Object.entries(draft.plans).map(([planId, row]) => [
                planId,
                draft.tiers.map((_, i) => ((row[i] || '').trim() ? parseFloat(row[i]) : null)),
            ])),
        };
        setSaving(true);
        try {
            await apiRequest(draft.id ? `/api/internal/price-lists/${draft.id}` : '/api/internal/price-lists', {
                method: draft.id ? 'PUT' : 'POST',
                body: JSON.stringify(body),
            });
            showToast(draft.id ? 'Tabla de precios actualizada' : 'Tabla de precios creada', 'success');
            setDraft(null);
            await load();
        } catch (err) {
            showToast(errMsg(err, 'No se pudo guardar la tabla'), 'error');
        } finally {
            setSaving(false);
        }
    };

    /** Reactiva una tabla pausada (mismo contenido; solo cambia is_active). */
    const activate = async (pl: PriceList) => {
        setDeleting(pl.id);
        try {
            await apiRequest(`/api/internal/price-lists/${pl.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: pl.name,
                    valid_from: pl.valid_from,
                    valid_until: pl.valid_until,
                    is_active: true,
                    tiers: pl.tiers.map(t => ({ label: t.label, min_weight: t.min_weight, max_weight: t.max_weight })),
                    plan_prices: Object.fromEntries(Object.entries(pl.plan_prices || {}).map(([planId, row]) => [
                        planId, pl.tiers.map(t => row?.[String(t.id)] ?? null),
                    ])),
                }),
            });
            showToast('Tabla activada: sus enlaces ya muestran estos precios', 'success');
            await load();
        } catch (err) {
            showToast(errMsg(err, 'No se pudo activar la tabla'), 'error');
        } finally {
            setDeleting(null);
        }
    };

    const remove = async (pl: PriceList) => {
        setDeleting(pl.id);
        try {
            await apiRequest(`/api/internal/price-lists/${pl.id}`, { method: 'DELETE' });
            showToast(pl.links ? 'Tabla eliminada: sus enlaces vuelven a la General' : 'Tabla eliminada', 'success');
            if (draft?.id === pl.id) setDraft(null);
            await load();
        } catch (err) {
            showToast(errMsg(err, 'No se pudo eliminar la tabla'), 'error');
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className="glass-card p-5 sm:p-6 rounded-3xl space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <BadgePercent size={18} className="text-fuchsia-400" />
                        <h4 className="font-bold text-white">Tablas de precios (promociones)</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                        Crea tablas desde cero, con sus propios rangos de peso y el precio de cada plan según el peso
                        (ej. «Promo Diciembre»). Cada enlace del catálogo de planes elige su tabla: la familia que llega por
                        ese enlace ve esos rangos y precios, y su solicitud y la orden los conservan. Fuera de las fechas de
                        vigencia el enlace usa la General.
                    </p>
                </div>
                {!draft && (
                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => openDraft(toDraft())}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50 cursor-pointer"
                    >
                        <Plus size={14} /> Nueva tabla
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Cargando…</div>
            ) : (
                <>
                    {/* Lista */}
                    <div className="divide-y divide-foreground/5 rounded-2xl border border-foreground/10">
                        <div className="flex items-center gap-3 px-4 py-3">
                            <span className="font-semibold text-sm text-foreground">General</span>
                            <span className="text-[11px] text-muted-foreground">Rangos y precios de arriba · la usan los enlaces sin tabla</span>
                        </div>
                        {lists.map(pl => {
                            const st = PRICE_LIST_STATUS[pl.status];
                            return (
                                <div key={pl.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                                    <span className="font-semibold text-sm text-foreground">{pl.name}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                                    {pl.status === 'pausada' && (
                                        <button type="button" onClick={() => activate(pl)} disabled={deleting === pl.id}
                                            title="Mientras está pausada, sus enlaces usan la General"
                                            className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">
                                            Activar
                                        </button>
                                    )}
                                    {(pl.valid_from || pl.valid_until) && (
                                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                            <CalendarRange size={12} />
                                            {pl.valid_from ? fmtDate(pl.valid_from) : '…'} → {pl.valid_until ? fmtDate(pl.valid_until) : '…'}
                                        </span>
                                    )}
                                    <span className="text-[11px] text-muted-foreground">
                                        {pl.tiers.length === 1 ? '1 rango' : `${pl.tiers.length} rangos`} · {pl.links === 1 ? '1 enlace' : `${pl.links} enlaces`}
                                    </span>
                                    <div className="ml-auto flex items-center gap-1">
                                        <button type="button" onClick={() => openDraft(toDraft(pl))} title="Editar"
                                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-foreground/5 hover:text-foreground cursor-pointer">
                                            <Pencil size={14} />
                                        </button>
                                        <button type="button" onClick={() => duplicate(pl)} title="Duplicar"
                                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-foreground/5 hover:text-foreground cursor-pointer">
                                            <Copy size={14} />
                                        </button>
                                        <button type="button" onClick={() => remove(pl)} disabled={deleting === pl.id}
                                            title={pl.links ? 'Eliminar (sus enlaces vuelven a la General)' : 'Eliminar'}
                                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50 cursor-pointer">
                                            {deleting === pl.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Editor */}
                    {draft && (
                        <div className="space-y-5 rounded-2xl border border-primary/30 p-4">
                            <div className="flex items-center justify-between gap-2">
                                <h5 className="text-sm font-bold text-foreground">{draft.id ? 'Editar tabla' : 'Nueva tabla'}</h5>
                                <button type="button" onClick={() => setDraft(null)} aria-label="Cerrar"
                                    className="rounded-lg p-1 text-muted-foreground hover:bg-foreground/5 cursor-pointer">
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                                <label className="text-xs font-semibold text-muted-foreground">
                                    Nombre
                                    <input value={draft.name} maxLength={60} placeholder="Ej. Promo Diciembre"
                                        onChange={e => setDraft({ ...draft, name: e.target.value })}
                                        className={`mt-1 ${inputCls}`} />
                                </label>
                                <label className="text-xs font-semibold text-muted-foreground">
                                    Desde (opcional)
                                    <input type="date" value={draft.valid_from}
                                        onChange={e => setDraft({ ...draft, valid_from: e.target.value })}
                                        className={`mt-1 ${inputCls}`} />
                                </label>
                                <label className="text-xs font-semibold text-muted-foreground">
                                    Hasta (opcional)
                                    <input type="date" value={draft.valid_until} min={draft.valid_from || undefined}
                                        onChange={e => setDraft({ ...draft, valid_until: e.target.value })}
                                        className={`mt-1 ${inputCls}`} />
                                </label>
                            </div>
                            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                                <input type="checkbox" checked={draft.is_active}
                                    onChange={e => setDraft({ ...draft, is_active: e.target.checked })} />
                                Activa (si la pausas, sus enlaces usan la General)
                            </label>

                            {/* Rangos propios */}
                            <div className="space-y-2">
                                <div>
                                    <h6 className="text-xs font-bold text-foreground">Rangos de peso de esta tabla</h6>
                                    <p className="text-[11px] text-muted-foreground">
                                        Desde – hasta en kg (ej. 0 – 1, 1,1 – 5). Solo el último puede quedar sin «hasta» (abierto).
                                    </p>
                                </div>
                                {draft.tiers.map((t, idx) => (
                                    <div key={idx} className="grid grid-cols-[1fr_5.5rem_5.5rem_auto] items-center gap-2">
                                        <input value={t.label} maxLength={40} placeholder={`Rango ${idx + 1} (nombre opcional)`}
                                            aria-label={`Rango ${idx + 1}: nombre`}
                                            onChange={e => updateTier(idx, { label: e.target.value })} className={inputCls} />
                                        <input value={t.min_weight} inputMode="decimal" placeholder="Desde"
                                            aria-label={`Rango ${idx + 1}: desde (kg)`}
                                            onChange={e => updateTier(idx, { min_weight: e.target.value.replace(/[^\d.,]/g, '') })} className={inputCls} />
                                        <input value={t.max_weight} inputMode="decimal"
                                            placeholder={idx === draft.tiers.length - 1 ? 'o más' : 'Hasta'}
                                            aria-label={`Rango ${idx + 1}: hasta (kg)`}
                                            onChange={e => updateTier(idx, { max_weight: e.target.value.replace(/[^\d.,]/g, '') })} className={inputCls} />
                                        <button type="button" onClick={() => removeTier(idx)} disabled={draft.tiers.length <= 1}
                                            aria-label={`Quitar rango ${idx + 1}`}
                                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30 cursor-pointer">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                {draft.tiers.length < MAX_TIERS && (
                                    <button type="button" onClick={addTier}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer">
                                        <Plus size={12} /> Agregar rango
                                    </button>
                                )}
                            </div>

                            {/* Precio de cada plan según el peso */}
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-end justify-between gap-2">
                                    <div>
                                        <h6 className="text-xs font-bold text-foreground">Precio de cada plan según el peso</h6>
                                        <p className="text-[11px] text-muted-foreground">
                                            Precio final de cada plan en cada rango (sin recargo aparte). Celda vacía = precio base del plan.
                                        </p>
                                    </div>
                                    {(groups.length > 0) && (
                                        <label className="text-[11px] font-semibold text-muted-foreground">
                                            Grupo de planes{' '}
                                            <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)}
                                                className="ml-1 rounded-lg border border-foreground/10 bg-background px-2 py-1 text-xs text-foreground cursor-pointer">
                                                <option value={ALL}>Todos</option>
                                                {groups.map(g => <option key={g} value={g}>{g}</option>)}
                                                {hasUngrouped && <option value={NO_GROUP}>Sin grupo</option>}
                                            </select>
                                        </label>
                                    )}
                                </div>
                                {visiblePlans.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">No hay planes activos{groupFilter !== ALL ? ' en este grupo' : ''}.</p>
                                ) : (
                                    <PlanWeightPriceTable
                                        tiers={draft.tiers}
                                        plans={visiblePlans}
                                        values={draft.plans}
                                        onChange={(planId, idx, value) => setDraft(d => d && ({
                                            ...d,
                                            plans: { ...d.plans, [planId]: (d.plans[planId] || d.tiers.map(() => '')).map((v, i) => (i === idx ? value : v)) },
                                        }))}
                                        onFillRow={planId => setDraft(d => {
                                            if (!d) return d;
                                            const plan = plans.find(p => p.plan_id === planId);
                                            const base = String(Math.round(plan?.price || 0));
                                            return { ...d, plans: { ...d.plans, [planId]: (d.plans[planId] || d.tiers.map(() => '')).map(v => v || base) } };
                                        })}
                                    />
                                )}
                            </div>

                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setDraft(null)}
                                    className="rounded-xl px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-foreground/5 cursor-pointer">
                                    Cancelar
                                </button>
                                <button type="button" onClick={save} disabled={saving}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50 cursor-pointer">
                                    {saving && <Loader2 size={14} className="animate-spin" />} Guardar tabla
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
