"use client";

import React from 'react';
import { fmtCLP, type OrderSummary } from '@/lib/tenant/orders/summary';

/** Resumen de la orden (datos + detalle de cobro) para los modales de confirmación. */
export default function OrderSummaryView({ s }: { s: OrderSummary }) {
    const rows: [string, string | null][] = [
        ['Mascota', s.petName],
        ['Cliente', s.customerName],
        ['Estado', s.status],
        ['Fecha agendada', s.scheduled],
        ['Peso', s.weight ? `${s.weight} kg` : null],
        ['Retiro', s.pickup],
        ['Entrega', s.delivery],
    ];
    return (
        <div className="space-y-3 text-xs">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                {rows.filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="flex gap-2 min-w-0">
                        <dt className="text-muted-foreground shrink-0">{k}:</dt>
                        <dd className="font-semibold text-foreground truncate" title={v || ''}>{v}</dd>
                    </div>
                ))}
            </dl>

            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5">
                {s.items.length === 0 && <p className="text-muted-foreground">Sin planes, servicios ni productos.</p>}
                {s.items.map(it => (
                    <div key={it.key} className="flex justify-between gap-3">
                        <span className="text-foreground truncate">{it.label}</span>
                        <span className="font-mono tabular-nums text-foreground">{fmtCLP(it.amount)}</span>
                    </div>
                ))}
                {s.weightPrice > 0 && (
                    <div className="flex justify-between gap-3">
                        <span className="text-foreground">Recargo por peso{s.weight ? ` (${s.weight} kg)` : ''}</span>
                        <span className="font-mono tabular-nums text-foreground">{fmtCLP(s.weightPrice)}</span>
                    </div>
                )}
                {s.transportPrice > 0 && (
                    <div className="flex justify-between gap-3">
                        <span className="text-foreground truncate">{s.transportLabel}</span>
                        <span className="font-mono tabular-nums text-foreground">{fmtCLP(s.transportPrice)}</span>
                    </div>
                )}
                {s.agreement && (
                    <div className="flex justify-between gap-3 text-sky-700 dark:text-sky-300">
                        <span className="truncate">Convenio {s.agreement.name}</span>
                        <span className="font-mono tabular-nums">−{fmtCLP(s.agreement.amount)}</span>
                    </div>
                )}
                {s.discountPct > 0 && (
                    <div className="flex justify-between gap-3 text-amber-700 dark:text-amber-300">
                        <span>Descuento especial ({s.discountPct} %)</span>
                        <span className="font-mono tabular-nums">−{fmtCLP(s.discountAmount)}</span>
                    </div>
                )}
                <div className="flex justify-between gap-3 pt-1.5 border-t border-border font-black text-sm text-foreground">
                    <span>Total a pagar</span>
                    <span className="font-mono tabular-nums">{fmtCLP(s.total)}</span>
                </div>
                {s.partner && (
                    <div className="flex justify-between gap-3 pt-1 text-emerald-700 dark:text-emerald-300">
                        <span className="truncate">Veterinaria {s.partner.name}{s.partner.detail ? ` · ${s.partner.detail}` : ''}</span>
                        <span className="font-mono tabular-nums">Comisión {fmtCLP(s.partner.commission)}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
