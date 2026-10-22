"use client";

import React, { useEffect, useState } from 'react';
import { BadgePercent, Lock, Save } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import type { PlanData } from './PlanCard';

const MAX_DISCOUNT = 60;
const fmt = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

interface Props {
    plans: PlanData[];
    onSaved: () => Promise<unknown> | void;
    onToast: (msg: string, type: 'success' | 'error') => void;
}

/**
 * Descuento por pago anual, uno para todos los planes. Al guardarlo se recalcula
 * el precio anual de cada plan (mensual × 12 × (1 − %)). Lo que paga cada
 * crematorio que ya contrató queda congelado y no cambia.
 */
export default function AnnualDiscountCard({ plans, onSaved, onToast }: Props) {
    const [saved, setSaved] = useState<{ pct: number; launch: boolean } | null>(null);
    const [pct, setPct] = useState('25');
    const [launch, setLaunch] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        apiRequest('/api/internal/creator/pricing/annual-discount')
            .then((d: { pct: number; launch: boolean }) => { setSaved(d); setPct(String(d.pct)); setLaunch(d.launch); })
            .catch(() => onToast('No se pudo cargar el descuento anual', 'error'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const value = Math.min(MAX_DISCOUNT, Math.max(0, parseInt(pct, 10) || 0));
    const dirty = saved !== null && (saved.pct !== value || saved.launch !== launch);
    const paid = plans.filter(p => p.price > 0);

    const save = async () => {
        setSaving(true);
        try {
            const d = await apiRequest('/api/internal/creator/pricing/annual-discount', {
                method: 'PUT',
                body: { pct: value, launch },
            });
            setSaved(d);
            onToast(`Descuento anual guardado: ${d.pct}%`, 'success');
            await onSaved();
        } catch (err: unknown) {
            onToast((err as Error)?.message || 'Error al guardar el descuento', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="bg-[#0a192f] border border-emerald-500/20 rounded-3xl p-6 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                <div className="flex items-start gap-3">
                    <span className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-400 shrink-0">
                        <BadgePercent size={22} />
                    </span>
                    <div>
                        <h3 className="text-lg font-black text-white">Descuento por pago anual</h3>
                        <p className="text-sm text-white/50 max-w-xl">
                            Un mismo porcentaje para todos los planes. El precio anual se calcula solo: mensual × 12 menos el descuento.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-2.5">
                        <input
                            type="number"
                            min={0}
                            max={MAX_DISCOUNT}
                            value={pct}
                            onChange={e => setPct(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            className="w-12 bg-transparent text-2xl font-black text-white outline-none text-right"
                            aria-label="Descuento anual en porcentaje"
                        />
                        <span className="text-2xl font-black text-white/60">%</span>
                    </label>
                    <button
                        type="button"
                        onClick={save}
                        disabled={!dirty || saving}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Save size={16} /> {saving ? 'Guardando…' : 'Guardar'}
                    </button>
                </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={launch}
                    onChange={e => setLaunch(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-emerald-500"
                />
                <span>
                    <span className="block text-sm font-bold text-white">Mostrar como «precio de lanzamiento»</span>
                    <span className="block text-xs text-white/50">
                        Los crematorios ven el aviso «Beneficio exclusivo para los primeros crematorios que se suscriban». Desactívalo al terminar la promoción.
                    </span>
                </span>
            </label>

            {paid.length > 0 && (
                <div className="overflow-x-auto rounded-2xl border border-white/10">
                    <table className="w-full min-w-[480px] text-sm">
                        <thead>
                            <tr className="text-[11px] uppercase tracking-wider text-white/40 border-b border-white/10">
                                <th className="text-left p-3">Plan</th>
                                <th className="text-right p-3">Mensual</th>
                                <th className="text-right p-3">12 meses</th>
                                <th className="text-right p-3">Anual con {value}%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paid.map(p => (
                                <tr key={p.id} className="border-b border-white/5 last:border-0">
                                    <td className="p-3 font-bold text-white">{p.name}</td>
                                    <td className="p-3 text-right text-white/70">{fmt(p.price)}</td>
                                    <td className="p-3 text-right text-white/40 line-through">{fmt(p.price * 12)}</td>
                                    <td className="p-3 text-right font-black text-emerald-400">{fmt(Math.round(p.price * 12 * (1 - value / 100)))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <p className="flex items-start gap-2 text-xs text-white/50">
                <Lock size={13} className="shrink-0 mt-0.5 text-amber-400" />
                <span>
                    Cambiar el descuento solo afecta a contrataciones y cambios de plan nuevos. Lo que paga cada crematorio que ya contrató queda congelado
                    y no cambia. Si cobras por Polar, ajusta también el precio del producto anual allá.
                </span>
            </p>
        </section>
    );
}
