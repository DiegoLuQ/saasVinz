"use client";

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Percent, Handshake } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { describeTerms, type AgreementOption } from '@/lib/tenant/orders/agreements';

interface Props {
    orderId: number;
    agreementId: number | null;
    discount: number;
    /** Convenios en el plan (clientes:convenios) */
    agreementsEnabled: boolean;
    /** Sin permiso (o una orden entregada para quien no es dueño) se muestra solo lectura */
    canEdit: boolean;
    lockedReason?: string;
    onSaved: () => void;
}

/**
 * Convenio empresa + descuento % de la orden desde la vista rápida. El servidor
 * recalcula el total y la comisión de la veterinaria (PATCH /cremations/{id}/discounts).
 */
export default function OrderDiscountsBox({ orderId, agreementId, discount, agreementsEnabled, canEdit, lockedReason, onSaved }: Props) {
    const { showToast } = useToast();
    const [agreement, setAgreement] = useState<number | null>(agreementId);
    const [pct, setPct] = useState<string>(String(discount || 0));
    const [saving, setSaving] = useState(false);

    useEffect(() => { setAgreement(agreementId); }, [agreementId]);
    useEffect(() => { setPct(String(discount || 0)); }, [discount]);

    const { data: options = [] } = useQuery<AgreementOption[]>({
        queryKey: ['agreements', 'active-options'],
        queryFn: () => apiRequest('/api/internal/agreements/active-options'),
        enabled: agreementsEnabled,
        staleTime: 60_000,
    });

    const pctNum = Number(pct.replace(',', '.'));
    const pctValid = pct.trim() !== '' && Number.isFinite(pctNum) && pctNum >= 0 && pctNum <= 100;
    const changed = agreement !== agreementId || (pctValid && pctNum !== (discount || 0));
    const chosen = options.find((o) => o.id === agreement);

    const save = async () => {
        if (!changed || !pctValid) return;
        setSaving(true);
        try {
            const body: Record<string, unknown> = {};
            if (agreement !== agreementId) body.agreement_id = agreement;
            if (pctNum !== (discount || 0)) body.discount = pctNum;
            await apiRequest(`/api/internal/cremations/${orderId}/discounts`, { method: 'PATCH', body });
            showToast('Descuentos aplicados', 'success');
            onSaved();
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'No se pudieron aplicar los descuentos', 'error');
        } finally {
            setSaving(false);
        }
    };

    const field = 'w-full rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-sky-500/50 disabled:opacity-60';

    return (
        <div className="p-4 rounded-2xl bg-white border border-slate-200 dark:bg-white/5 dark:border-white/10 shadow-2xs text-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
                <div className="space-y-1">
                    <label className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
                        <Handshake size={13} /> Convenio empresa
                    </label>
                    {agreementsEnabled ? (
                        <select value={agreement ?? ''} disabled={!canEdit || saving}
                            onChange={(e) => setAgreement(e.target.value ? Number(e.target.value) : null)}
                            className={field}>
                            <option value="">Sin convenio</option>
                            {/* El convenio actual puede estar inactivo: igual se muestra */}
                            {agreementId && !options.some((o) => o.id === agreementId) && (
                                <option value={agreementId}>Convenio actual</option>
                            )}
                            {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                    ) : (
                        <p className="text-slate-500 dark:text-muted-foreground py-2">Tu plan no incluye convenios.</p>
                    )}
                    {chosen && (
                        <p className="text-[11px] text-sky-700 dark:text-sky-400">{describeTerms({
                            plans_pct: chosen.plans_discount_pct, products_pct: chosen.products_discount_pct,
                            special_service_id: chosen.special_service_id ?? null, special_service_name: chosen.special_service_name ?? null,
                            special_service_pct: chosen.special_service_discount_pct,
                        } as Parameters<typeof describeTerms>[0])}</p>
                    )}
                </div>
                <div className="space-y-1">
                    <label className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
                        <Percent size={13} /> Descuento
                    </label>
                    <div className="relative">
                        <input type="number" min={0} max={100} step="0.5" inputMode="decimal" value={pct}
                            disabled={!canEdit || saving}
                            onChange={(e) => setPct(e.target.value)}
                            className={`${field} pr-7 text-right tabular-nums`} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                    </div>
                </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-muted-foreground">
                Primero se aplica el convenio por ítem y luego el % sobre lo que queda (el recargo por peso no tiene convenio). La comisión de la veterinaria se recalcula sobre el total final.
            </p>
            {!pctValid && <p className="text-[11px] font-semibold text-rose-600">El descuento debe estar entre 0 y 100 %.</p>}
            {!canEdit && lockedReason && <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">{lockedReason}</p>}
            {canEdit && (
                <div className="flex justify-end gap-2">
                    {changed && (
                        <button type="button" disabled={saving}
                            onClick={() => { setAgreement(agreementId); setPct(String(discount || 0)); }}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">
                            Deshacer
                        </button>
                    )}
                    <button type="button" onClick={save} disabled={!changed || !pctValid || saving}
                        className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-40">
                        {saving && <Loader2 size={13} className="animate-spin" />}
                        Aplicar descuentos
                    </button>
                </div>
            )}
        </div>
    );
}
