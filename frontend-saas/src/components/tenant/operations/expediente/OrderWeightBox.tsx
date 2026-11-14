"use client";

import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Layers, Loader2, Scale } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

interface Tier { id: number; label: string; range_text: string; price: number | null }
interface Options {
    mode: 'surcharge' | 'table';
    price_list: { id: number; name: string } | null;
    tiers: Tier[];
    current_tier_id: number | null;
    weight: number | null;
    family_choice: string | null;
    weight_price: number;
    total: number;
    order_plans: { line_id: number; plan_id: number | null; name: string; price: number }[];
    plans: { id: number; name: string; price: number; max_weight: number | null; products: number }[];
}
interface Preview {
    tier_text: string | null;
    weight_price: number;
    total_before: number;
    total: number;
    warnings: string[];
}

interface Props {
    orderId: number;
    canEdit: boolean;
    lockedReason?: string;
    onSaved: () => void;
}

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

/**
 * Corregir el rango de peso (o los kg) de la orden: la familia pudo equivocarse de
 * rango en el formulario. El servidor recalcula el recargo o el precio del plan,
 * el total y la comisión (GET/PATCH /cremations/{id}/weight, con vista previa).
 */
export default function OrderWeightBox({ orderId, canEdit, lockedReason, onSaved }: Props) {
    const { showToast } = useToast();
    const qc = useQueryClient();
    const key = ['cremation-weight', orderId];
    const { data, isLoading } = useQuery<Options>({
        queryKey: key,
        queryFn: () => apiRequest(`/api/internal/cremations/${orderId}/weight`),
        staleTime: 30_000,
    });

    const [tierId, setTierId] = useState<number | null>(null);
    const [kg, setKg] = useState('');
    const [preview, setPreview] = useState<Preview | null>(null);
    const [busy, setBusy] = useState(false);
    // Fase 2: cambiar el plan (línea a reemplazar + plan nuevo)
    const [lineId, setLineId] = useState<number | null>(null);
    const [planId, setPlanId] = useState<number | null>(null);

    useEffect(() => {
        if (!data) return;
        setTierId(data.current_tier_id);
        setKg(data.weight ? String(data.weight).replace('.', ',') : '');
        const first = data.order_plans[0];
        setLineId(first?.line_id ?? null);
        setPlanId(first?.plan_id ?? null);
        setPreview(null);
    }, [data]);

    const kgNum = kg.trim() ? Number(kg.replace(',', '.')) : null;
    const kgValid = kgNum === null || (Number.isFinite(kgNum) && kgNum > 0 && kgNum <= 500);
    const kgChanged = kgNum !== null && kgNum !== (data?.weight ?? null);
    const tierChanged = !kgChanged && tierId !== null && tierId !== data?.current_tier_id;
    const line = data?.order_plans.find((l) => l.line_id === lineId) ?? null;
    const planChanged = planId !== null && planId !== (line?.plan_id ?? null);
    const changed = kgValid && (kgChanged || tierChanged || planChanged);

    const body = (dry: boolean) => ({
        ...(kgChanged ? { weight: kgNum } : tierChanged ? { tier_id: tierId } : {}),
        ...(planChanged ? { plan_id: planId, replace_line_id: lineId } : {}),
        dry_run: dry,
    });

    // Vista previa del total nuevo (sin guardar)
    useEffect(() => {
        if (!changed || !canEdit) { setPreview(null); return; }
        let cancelled = false;
        const t = setTimeout(() => {
            apiRequest(`/api/internal/cremations/${orderId}/weight`, { method: 'PATCH', body: body(true) })
                .then((r: Preview) => { if (!cancelled) setPreview(r); })
                .catch(() => { if (!cancelled) setPreview(null); });
        }, 350);
        return () => { cancelled = true; clearTimeout(t); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tierId, kg, planId, lineId, changed, canEdit, orderId]);

    const save = async () => {
        if (!changed) return;
        setBusy(true);
        try {
            const r: Preview = await apiRequest(`/api/internal/cremations/${orderId}/weight`, { method: 'PATCH', body: body(false) });
            const what = planChanged && (kgChanged || tierChanged) ? 'Peso y plan corregidos' : planChanged ? 'Plan cambiado' : 'Peso corregido';
            showToast(`${what}. Total ${clp.format(r.total)}`, 'success');
            await qc.invalidateQueries({ queryKey: key });
            onSaved();
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'No se pudo corregir el peso', 'error');
        } finally {
            setBusy(false);
        }
    };

    const field = 'w-full rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-sky-500/50 disabled:opacity-60';
    const box = 'p-4 rounded-2xl bg-white border border-slate-200 dark:bg-white/5 dark:border-white/10 shadow-2xs text-xs space-y-3';

    if (isLoading) return <div className={box}><Loader2 size={14} className="animate-spin text-slate-400" /></div>;
    if (!data || (data.tiers.length === 0 && data.plans.length === 0)) {
        return <div className={box}><p className="text-slate-500 dark:text-muted-foreground">No hay rangos de peso configurados (Configuración → Formulario y Pesos).</p></div>;
    }

    const disabled = !canEdit || busy;
    const resetAll = () => {
        setTierId(data.current_tier_id);
        setKg(data.weight ? String(data.weight).replace('.', ',') : '');
        setLineId(data.order_plans[0]?.line_id ?? null);
        setPlanId(data.order_plans[0]?.plan_id ?? null);
    };
    return (
        <div className={box}>
            {data.family_choice && (
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    La familia eligió: <span className="font-bold">{data.family_choice}</span>
                </p>
            )}
            {data.tiers.length > 0 && <>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
                <div className="space-y-1">
                    <label className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
                        <Scale size={13} /> Rango de peso
                    </label>
                    <select value={tierId ?? ''} disabled={disabled}
                        onChange={(e) => { setTierId(e.target.value ? Number(e.target.value) : null); setKg(''); }}
                        className={field}>
                        {data.current_tier_id === null && <option value="">Sin rango</option>}
                        {data.tiers.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.label ? `${t.label} · ` : ''}{t.range_text}{t.price ? ` · +${clp.format(t.price)}` : ''}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="font-bold text-slate-600 dark:text-slate-300">Peso exacto</label>
                    <div className="relative">
                        <input type="text" inputMode="decimal" value={kg} placeholder="Opcional" disabled={disabled}
                            onChange={(e) => setKg(e.target.value.replace(/[^\d.,]/g, '').slice(0, 6))}
                            className={`${field} pr-8 text-right tabular-nums`} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">kg</span>
                    </div>
                </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-muted-foreground">
                {data.mode === 'table'
                    ? `El precio del plan cambia según el rango${data.price_list ? ` (tabla «${data.price_list.name}»)` : ''}.`
                    : 'Se cobra el recargo del rango.'} Con el peso exacto se usa el rango que lo cubre. El convenio, el % y la comisión se recalculan.
            </p>
            </>}
            {data.plans.length > 0 && (
                <div className="space-y-1 pt-1">
                    <label className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
                        <Layers size={13} /> Plan
                    </label>
                    {data.order_plans.length > 1 && (
                        <select value={lineId ?? ''} disabled={disabled} aria-label="Plan a reemplazar"
                            onChange={(e) => {
                                const id = Number(e.target.value);
                                setLineId(id);
                                setPlanId(data.order_plans.find((l) => l.line_id === id)?.plan_id ?? null);
                            }}
                            className={field}>
                            {data.order_plans.map((l) => <option key={l.line_id} value={l.line_id}>Reemplazar: {l.name}</option>)}
                        </select>
                    )}
                    <select value={planId ?? ''} disabled={disabled} aria-label="Plan"
                        onChange={(e) => setPlanId(e.target.value ? Number(e.target.value) : null)}
                        className={field}>
                        {data.order_plans.length === 0 && <option value="">Sin plan: agregar uno</option>}
                        {line && line.plan_id !== null && !data.plans.some((p) => p.id === line.plan_id) && (
                            <option value={line.plan_id}>{line.name} (actual)</option>
                        )}
                        {data.plans.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}{p.id === line?.plan_id ? ' (actual)' : ''}{p.max_weight ? ` · hasta ${String(p.max_weight).replace('.', ',')} kg` : ''}
                            </option>
                        ))}
                    </select>
                    {planChanged && (
                        <p className="text-[11px] text-slate-500 dark:text-muted-foreground">
                            Las ánforas e insumos incluidos se cambian por los del plan nuevo (vuelven al stock y se toman los nuevos).
                            Si habías cobrado una diferencia por cambiar el ánfora, revísala en «Editar orden».
                        </p>
                    )}
                </div>
            )}
            {!kgValid && <p className="text-[11px] font-semibold text-rose-600">El peso debe estar entre 0 y 500 kg.</p>}
            {preview && (
                <div className="rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 px-3 py-2 space-y-1">
                    <p className="font-bold text-sky-800 dark:text-sky-300">
                        Total: {clp.format(preview.total_before)} → {clp.format(preview.total)}
                    </p>
                    {preview.warnings.map((w) => (
                        <p key={w} className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold">
                            <AlertTriangle size={12} /> {w}
                        </p>
                    ))}
                </div>
            )}
            {!canEdit && lockedReason && <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">{lockedReason}</p>}
            {canEdit && (
                <div className="flex justify-end gap-2">
                    {changed && (
                        <button type="button" disabled={busy}
                            onClick={resetAll}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">
                            Deshacer
                        </button>
                    )}
                    <button type="button" onClick={save} disabled={!changed || busy}
                        className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-40">
                        {busy && <Loader2 size={13} className="animate-spin" />}
                        {planChanged ? 'Aplicar cambios' : 'Aplicar peso'}
                    </button>
                </div>
            )}
        </div>
    );
}
