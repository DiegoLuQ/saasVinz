"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useDashboardTrend, TrendPoint } from '@/hooks/useDashboard';

export default function DashboardTrendChart() {
    const { data, isLoading } = useDashboardTrend();
    const [tooltip, setTooltip] = useState<{ point: TrendPoint; index: number } | null>(null);

    if (isLoading || !data || data.length === 0) {
        return (
            <div className="h-32 flex items-center justify-center">
                <p className="text-xs text-muted-foreground/50 uppercase tracking-widest">Sin datos</p>
            </div>
        );
    }

    const maxCremations = Math.max(...data.map(d => d.cremations), 1);
    const maxRevenue = Math.max(...data.map(d => d.revenue), 1);

    return (
        <div className="relative">
            <div className="flex items-end justify-between gap-2 h-28 mt-4">
                {data.map((point, i) => {
                    const cremPct = (point.cremations / maxCremations) * 100;
                    const revPct = (point.revenue / maxRevenue) * 100;
                    const isActive = tooltip?.index === i;

                    return (
                        <div
                            key={point.month}
                            className="flex-1 flex flex-col items-center gap-1 group cursor-default"
                            onMouseEnter={() => setTooltip({ point, index: i })}
                            onMouseLeave={() => setTooltip(null)}
                        >
                            {/* Tooltip */}
                            {isActive && (
                                <motion.div
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute -top-14 left-1/2 -translate-x-1/2 z-10 bg-card border border-foreground/10 rounded-xl px-3 py-2 shadow-xl text-center pointer-events-none whitespace-nowrap"
                                    style={{ left: `${(i / (data.length - 1)) * 100}%` }}
                                >
                                    <p className="text-[10px] font-black text-foreground">{point.month}</p>
                                    <p className="text-[9px] text-blue-400 font-bold">{point.cremations} crem.</p>
                                    <p className="text-[9px] text-emerald-400 font-bold">
                                        ${point.revenue.toLocaleString('es-CL')}
                                    </p>
                                </motion.div>
                            )}

                            {/* Bar pair */}
                            <div className="w-full flex items-end gap-0.5 h-24">
                                {/* Cremaciones bar (blue) */}
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${Math.max(cremPct, 4)}%` }}
                                    transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.05 }}
                                    className={`flex-1 rounded-t-md transition-colors ${isActive ? 'bg-blue-400' : 'bg-blue-500/40 group-hover:bg-blue-400/70'}`}
                                />
                                {/* Ingresos bar (green) */}
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${Math.max(revPct, 4)}%` }}
                                    transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.05 + 0.03 }}
                                    className={`flex-1 rounded-t-md transition-colors ${isActive ? 'bg-emerald-400' : 'bg-emerald-500/40 group-hover:bg-emerald-400/70'}`}
                                />
                            </div>

                            {/* Month label */}
                            <span className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                                {point.month}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 justify-end">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm bg-blue-500/60" />
                    <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-bold">Cremaciones</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm bg-emerald-500/60" />
                    <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-bold">Ingresos</span>
                </div>
            </div>
        </div>
    );
}
