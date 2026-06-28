import React, { useEffect, useRef, useState } from 'react';
import type { BillingTotals } from './types';

interface BillingSummaryProps {
    planName: string;
    totals: BillingTotals;
    discount: number;
    onDiscountChange: (value: number) => void;
}

function useAnimatedNumber(target: number, duration = 350) {
    const [display, setDisplay] = useState(target);
    const fromRef = useRef(target);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const from = fromRef.current;
        const to = target;
        if (from === to) return;

        const start = performance.now();
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            const value = from + (to - from) * eased;
            setDisplay(value);
            if (t < 1) {
                rafRef.current = requestAnimationFrame(tick);
            } else {
                fromRef.current = to;
            }
        };
        rafRef.current = requestAnimationFrame(tick);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            fromRef.current = target;
        };
    }, [target, duration]);

    return display;
}

export default function BillingSummary({
    planName,
    totals,
    discount,
    onDiscountChange
}: BillingSummaryProps) {
    const animatedBase = useAnimatedNumber(totals.baseTotal);
    const animatedFinal = useAnimatedNumber(totals.finalTotal);
    const monthsLabel = totals.months === 1 ? 'mes' : 'meses';

    return (
        <div className="px-8 pb-8 pt-4 border-t border-white/5 bg-black/20">
            <h3 className="text-xs uppercase font-black text-white/40 mb-4 tracking-widest">Resumen de Pago</h3>
            <div className="space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-white/60 font-medium">
                        Precio Base ({planName} x {totals.months} {monthsLabel})
                    </span>
                    <span className="text-white font-mono tabular-nums">
                        ${Math.round(animatedBase).toLocaleString()}
                    </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-white/60 font-medium">Descuento Aplicado</span>
                    <div className="flex items-center bg-[#0f2642] px-2 py-1 rounded-lg border border-white/10 w-20 focus-within:border-emerald-500/40 transition-colors">
                        <input
                            type="number"
                            min={0}
                            max={100}
                            value={discount}
                            onChange={(e) => {
                                const v = parseInt(e.target.value) || 0;
                                onDiscountChange(Math.min(100, Math.max(0, v)));
                            }}
                            className="w-full bg-transparent text-right text-white font-bold outline-none text-sm"
                        />
                        <span className="text-white/40 ml-1 text-xs font-bold">%</span>
                    </div>
                </div>
                <div className="flex justify-between items-center text-xl font-black text-emerald-400 pt-4 border-t border-white/5 mt-2">
                    <span>Total a Pagar</span>
                    <span className="tabular-nums">
                        ${Math.round(animatedFinal).toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    );
}
