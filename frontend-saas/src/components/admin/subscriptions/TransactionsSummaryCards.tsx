"use client";

import React from 'react';
import { CheckCircle2, Clock, XCircle, TrendingUp } from 'lucide-react';

export interface TransactionsSummary {
    completed: { count: number; total_amount: number; avg_amount: number };
    pending: { count: number; total_amount: number; avg_amount: number };
    failed: { count: number; total_amount: number; avg_amount: number };
    refunded?: { count: number; total_amount: number; avg_amount: number };
}

interface TransactionsSummaryCardsProps {
    summary: TransactionsSummary | null;
    loading?: boolean;
    /** Whether the summary covers the full filtered range (vs. a partial slice). */
    scopeLabel?: string;
}

interface CardSpec {
    label: string;
    sublabel: string;
    value: number;
    countSuffix?: string;
    accent: 'emerald' | 'amber' | 'rose' | 'blue';
    icon: React.ReactNode;
    isCurrency: boolean;
}

const ACCENT = {
    emerald: {
        text: 'text-emerald-400',
        bar: 'bg-emerald-500/30',
        glow: 'from-emerald-500/10 to-transparent',
        iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    amber: {
        text: 'text-amber-400',
        bar: 'bg-amber-500/30',
        glow: 'from-amber-500/10 to-transparent',
        iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    rose: {
        text: 'text-rose-400',
        bar: 'bg-rose-500/30',
        glow: 'from-rose-500/10 to-transparent',
        iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    },
    blue: {
        text: 'text-blue-400',
        bar: 'bg-blue-500/30',
        glow: 'from-blue-500/10 to-transparent',
        iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
} as const;

function formatCLP(n: number): string {
    return n.toLocaleString('es-CL', { maximumFractionDigits: 0 });
}

export default function TransactionsSummaryCards({
    summary,
    loading = false,
    scopeLabel = 'Sobre todo el rango filtrado',
}: TransactionsSummaryCardsProps) {
    const completed = summary?.completed ?? { count: 0, total_amount: 0, avg_amount: 0 };
    const pending = summary?.pending ?? { count: 0, total_amount: 0, avg_amount: 0 };
    const failed = summary?.failed ?? { count: 0, total_amount: 0, avg_amount: 0 };

    const cards: CardSpec[] = [
        {
            label: 'Total cobrado',
            sublabel: `${completed.count} ${completed.count === 1 ? 'transacción' : 'transacciones'}`,
            value: completed.total_amount,
            accent: 'emerald',
            icon: <CheckCircle2 size={14} />,
            isCurrency: true,
        },
        {
            label: 'Por aprobar',
            sublabel: `${pending.count} ${pending.count === 1 ? 'pendiente' : 'pendientes'}`,
            value: pending.total_amount,
            accent: 'amber',
            icon: <Clock size={14} />,
            isCurrency: true,
        },
        {
            label: 'Rechazado / Fallido',
            sublabel: `${failed.count} ${failed.count === 1 ? 'fallido' : 'fallidos'}`,
            value: failed.total_amount,
            accent: 'rose',
            icon: <XCircle size={14} />,
            isCurrency: true,
        },
        {
            label: 'Ticket promedio',
            sublabel: 'Sobre completadas',
            value: completed.avg_amount,
            accent: 'blue',
            icon: <TrendingUp size={14} />,
            isCurrency: true,
        },
    ];

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Resumen del periodo
                </span>
                <span className="text-[10px] font-medium text-white/30">
                    {scopeLabel}
                </span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {cards.map((card) => {
                    const tone = ACCENT[card.accent];
                    return (
                        <div
                            key={card.label}
                            className="relative bg-white/[0.02] p-3 rounded-lg border border-white/5 hover:border-white/10 transition-colors overflow-hidden"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="space-y-0.5 min-w-0">
                                    <div className="text-[9px] font-bold uppercase tracking-widest text-white/40 truncate">
                                        {card.label}
                                    </div>
                                    <div className="flex items-baseline gap-0.5">
                                        {card.isCurrency && (
                                            <span className={`text-xs font-medium ${tone.text} opacity-70`}>$</span>
                                        )}
                                        <span className="text-lg font-black text-white tracking-tighter tabular-nums leading-none">
                                            {loading && !summary ? '—' : formatCLP(card.value)}
                                        </span>
                                    </div>
                                    <div className="text-[9px] text-white/40 truncate">
                                        {card.sublabel}
                                    </div>
                                </div>
                                <div className={`shrink-0 p-1.5 rounded-md border ${tone.iconBg}`}>
                                    {card.icon}
                                </div>
                            </div>
                            <div className={`absolute bottom-0 left-0 right-0 h-px ${tone.bar}`} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
