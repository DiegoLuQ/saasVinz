'use client';

/**
 * Tablas de precios con nombre (promociones / plantillas) — Configuración → Formulario y Pesos →
 * Pesos y precios. Usan los mismos rangos de peso de la General; solo cambian precios (celda vacía =
 * precio de la General). Cada enlace del catálogo de planes elige su tabla. Se guardan solas
 * (API /api/internal/price-lists), con los rangos y planes YA guardados.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { CalendarRange, Copy, Loader2, Pencil, Plus, Trash2, X, BadgePercent } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import PlanWeightPriceTable, { type PlanWeightRow } from './PlanWeightPriceTable';

interface SavedTier {
    id?: number;
    label: string | null;
    min_weight: number | null;
    max_weight: number | null;
    price: number | null;
}

type PlanRow = PlanWeightRow & { prices: Record<string, number> };

export interface PriceList {
    id: number;
    name: string;
    tier_prices: Record<string, number>;
    plan_prices: Record<string, Record<string, number>>;
    valid_from: string | null;
    valid_until: string | null;
    is_active: boolean;
    status: 'activa' | 'programada' | 'vencida' | 'pausada';
    links: number;
}

interface Draft {
    id?: number;
    name: string;
    valid_from: string;
    valid_until: string;
    is_active: boolean;
    tier: string[];                     // por posición del rango
    plans: Record<number, string[]>;    // plan_id → por posición del rango
}

export const PRICE_LIST_STATUS: Record<PriceList['status'], { label: string; cls: string }> = {
    activa: { label: 'Activa', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
    programada: { label: 'Programada', cls: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
    vencida: { label: 'Vencida', cls: 'bg-slate-500/15 text-slate-600 dark:text-slate-400' },
    pausada: { label: 'Pausada', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
};

const fmtKg = (n: number) => String(n).replace('.', ',');
const formatCLP = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
const fmtDate = (d: string) => d.split('-').reverse().join('-');
const num = (v: number | undefined | null) => (v != null ? String(Math.round(v)) : '');

const tierHeaders = (tiers: SavedTier[]) => tiers.map(t => ({
    label: t.label || '',
    min_weight: fmtKg(t.min_weight ?? 0),
    max_weight: t.max_weight != null ? fmtKg(t.max_weight) : '',
}));

const errMsg = (err: unknown, fallback: string) => (err as { message?: string })?.message || fallback;

export default function PriceListsSection({ reloadKey, dirty }: {
    /** Cambia después de guardar la configuración (rangos / modo / tabla General). */
    reloadKey: number;
    /** Hay cambios sin guardar en la General: los rangos de esta sección son los guardados. */
    dirty?: boolean;
}) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [lists, setLists] = useState<PriceList[]>([]);
    const [tiers, setTiers] = useState<SavedTier[]>([]);
    const [plans, setPlans] = useState<PlanRow[]>([]);
    const [mode, setMode] = useState<'surcharge' | 'table'>('surcharge');
    const [draft, setDraft] = useState<Draft | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<number | null>(null);

    const load = useCallback(async () => {
        try {
            const [ls, rules, table] = await Promise.all([
                apiRequest('/api/internal/price-lists'),
                apiRequest('/api/internal/maintenance/weight-pricing'),
                apiRequest('/api/internal/maintenance/plan-weight-prices').catch(() => null),
            ]);
            setLists(ls as PriceList[]);
            setTiers((rules as SavedTier[]).filter(t => t.id != null));
            setMode(table?.mode === 'table' ? 'table' : 'surcharge');
            setPlans(((table?.plans || []) as PlanRow[]).filter(p => p.is_active !== false));
        } catch {
            // la sección queda vacía; el resto de la pestaña sigue funcionando
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load, reloadKey]);

    const toDraft = (pl?: PriceList): Draft => ({
        id: pl?.id,
        name: pl?.name || '',
        valid_from: pl?.valid_from || '',
        valid_until: pl?.valid_until || '',
        is_active: pl?.is_active ?? true,
        tier: tiers.map(t => num(pl?.tier_prices?.[String(t.id)])),
        plans: Object.fromEntries(plans.map(p => [
            p.plan_id,
            tiers.map(t => num(pl?.plan_prices?.[String(p.plan_id)]?.[String(t.id)])),
        ])),
    });

    const copyGeneral = () => setDraft(d => d && ({
        ...d,
        tier: tiers.map(t => num(t.price)),
        plans: Object.fromEntries(plans.map(p => [
            p.plan_id,
            tiers.map(t => num(p.prices?.[String(t.id)] ?? p.price)),
        ])),
    }));

    const duplicate = (pl: PriceList) => setDraft({ ...toDraft(pl), id: undefined, name: `${pl.name} (copia)`.slice(0, 60) });

    const save = async () => {
        if (!draft) return;
        if (!draft.name.trim()) {
            showToast('Escribe un nombre para la tabla', 'error');
            return;
        }
        const original = lists.find(l => l.id === draft.id);
        const row = (values: string[]) => Object.fromEntries(tiers
            .map((t, i) => [String(t.id), (values[i] || '').trim()] as const)
            .filter(([, v]) => v !== '')
            .map(([k, v]) => [k, parseFloat(v)]));
        // Se edita la parte del modo actual; la del otro modo se conserva tal cual.
        const body = {
            name: draft.name.trim(),
            valid_from: draft.valid_from || null,
            valid_until: draft.valid_until || null,
            is_active: draft.is_active,
            tier_prices: mode === 'surcharge' ? row(draft.tier) : (original?.tier_prices || {}),
            plan_prices: mode === 'table'
                ? Object.fromEntries(plans.map(p => [String(p.plan_id), row(draft.plans[p.plan_id] || [])]))
                : (original?.plan_prices || {}),
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

    const headers = tierHeaders(tiers);

    return (
        <div className="glass-card p-5 sm:p-6 rounded-3xl space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <BadgePercent size={18} className="text-fuchsia-400" />
                        <h4 className="font-bold text-white">Tablas de precios (promociones)</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                        Guarda otros precios con nombre (ej. «Promo Diciembre») usando los mismos rangos de peso. Cada enlace del
                        catálogo de planes elige su tabla; la familia que llega por ese enlace ve esos precios y su solicitud los conserva.
                        Fuera de las fechas de vigencia el enlace usa la General.
                    </p>
                </div>
                {!draft && (
                    <button
                        type="button"
                        disabled={loading || tiers.length === 0}
                        onClick={() => setDraft(toDraft())}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50 cursor-pointer"
                    >
                        <Plus size={14} /> Nueva tabla
                    </button>
                )}
            </div>

            {dirty && (
                <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                    Tienes cambios sin guardar en los rangos o el modo: estas tablas usan lo ya guardado. Guarda primero para verlos aquí.
                </p>
            )}

            {loading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Cargando…</div>
            ) : tiers.length === 0 ? (
                <p className="text-xs text-muted-foreground">Guarda al menos un rango de peso para crear tablas de precios.</p>
            ) : (
                <>
                    {/* Lista */}
                    <div className="divide-y divide-foreground/5 rounded-2xl border border-foreground/10">
                        <div className="flex items-center gap-3 px-4 py-3">
                            <span className="font-semibold text-sm text-foreground">General</span>
                            <span className="text-[11px] text-muted-foreground">Precios de arriba · la usan los enlaces sin tabla</span>
                        </div>
                        {lists.map(pl => {
                            const st = PRICE_LIST_STATUS[pl.status];
                            return (
                                <div key={pl.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                                    <span className="font-semibold text-sm text-foreground">{pl.name}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                                    {(pl.valid_from || pl.valid_until) && (
                                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                            <CalendarRange size={12} />
                                            {pl.valid_from ? fmtDate(pl.valid_from) : '…'} → {pl.valid_until ? fmtDate(pl.valid_until) : '…'}
                                        </span>
                                    )}
                                    <span className="text-[11px] text-muted-foreground">
                                        {pl.links === 1 ? '1 enlace' : `${pl.links} enlaces`}
                                    </span>
                                    <div className="ml-auto flex items-center gap-1">
                                        <button type="button" onClick={() => setDraft(toDraft(pl))} title="Editar"
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
                        <div className="space-y-4 rounded-2xl border border-primary/30 p-4">
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
                                    <input
                                        value={draft.name}
                                        maxLength={60}
                                        placeholder="Ej. Promo Diciembre"
                                        onChange={e => setDraft({ ...draft, name: e.target.value })}
                                        className="mt-1 w-full rounded-xl border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                                    />
                                </label>
                                <label className="text-xs font-semibold text-muted-foreground">
                                    Desde (opcional)
                                    <input type="date" value={draft.valid_from}
                                        onChange={e => setDraft({ ...draft, valid_from: e.target.value })}
                                        className="mt-1 w-full rounded-xl border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
                                </label>
                                <label className="text-xs font-semibold text-muted-foreground">
                                    Hasta (opcional)
                                    <input type="date" value={draft.valid_until} min={draft.valid_from || undefined}
                                        onChange={e => setDraft({ ...draft, valid_until: e.target.value })}
                                        className="mt-1 w-full rounded-xl border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
                                </label>
                            </div>
                            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                                <input type="checkbox" checked={draft.is_active}
                                    onChange={e => setDraft({ ...draft, is_active: e.target.checked })} />
                                Activa (si la pausas, sus enlaces usan la General)
                            </label>

                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs text-muted-foreground">
                                    {mode === 'table'
                                        ? 'Precio final de cada plan en cada rango. Celda vacía = precio de la General.'
                                        : 'Recargo de cada rango de peso. Vacío = recargo de la General.'}
                                </p>
                                <button type="button" onClick={copyGeneral}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer">
                                    <Copy size={12} /> Copiar precios de la General
                                </button>
                            </div>

                            {mode === 'table' ? (
                                <PlanWeightPriceTable
                                    tiers={headers}
                                    plans={plans}
                                    values={draft.plans}
                                    onChange={(planId, idx, value) => setDraft(d => d && ({
                                        ...d,
                                        plans: { ...d.plans, [planId]: (d.plans[planId] || tiers.map(() => '')).map((v, i) => (i === idx ? value : v)) },
                                    }))}
                                    onFillRow={planId => setDraft(d => {
                                        if (!d) return d;
                                        const plan = plans.find(p => p.plan_id === planId);
                                        const base = String(Math.round(plan?.price || 0));
                                        return { ...d, plans: { ...d.plans, [planId]: (d.plans[planId] || tiers.map(() => '')).map(v => v || base) } };
                                    })}
                                />
                            ) : (
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {tiers.map((t, idx) => {
                                        const h = headers[idx];
                                        const range = h.max_weight ? `${h.min_weight} – ${h.max_weight} kg` : `Desde ${h.min_weight} kg`;
                                        return (
                                            <label key={t.id} className="rounded-xl border border-foreground/10 p-3 text-xs">
                                                <span className="block font-semibold text-foreground">{h.label || `Rango ${idx + 1}`}</span>
                                                <span className="block text-[11px] text-muted-foreground">{range} · General {formatCLP(t.price || 0)}</span>
                                                <span className="mt-2 flex items-center rounded-lg border border-foreground/10 bg-background focus-within:border-primary">
                                                    <span className="pl-2 text-muted-foreground">$</span>
                                                    <input
                                                        value={draft.tier[idx] || ''}
                                                        inputMode="numeric"
                                                        placeholder={String(Math.round(t.price || 0))}
                                                        onChange={e => {
                                                            const v = e.target.value.replace(/\D/g, '');
                                                            setDraft(d => d && ({ ...d, tier: d.tier.map((x, i) => (i === idx ? v : x)) }));
                                                        }}
                                                        className="w-full bg-transparent px-1.5 py-1.5 text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground/50"
                                                    />
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

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
