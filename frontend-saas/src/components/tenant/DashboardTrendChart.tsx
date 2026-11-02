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

    // Sin entregas en el período: no dibujar barras mínimas que aparentan actividad
    if (data.every(d => d.cremations === 0 && d.revenue === 0)) {
        return (
            <div className="h-32 flex flex-col items-center justify-center gap-1 text-center">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Aún no hay cremaciones entregadas</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">El gráfico se completará a medida que entregues servicios.</p>
            </div>
        );
    }

    const maxCremations = Math.max(...data.map(d => d.cremations), 1);
    const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
    const totalSemestralCremations = data.reduce((acc, d) => acc + d.cremations, 0);
    const totalSemestralRevenue = data.reduce((acc, d) => acc + d.revenue, 0);

    return (
        <div className="relative">
            <div className="flex items-end justify-between gap-2 h-28 mt-6">
                {data.map((point, i) => {
                    const cremPct = (point.cremations / maxCremations) * 100;
                    const revPct = (point.revenue / maxRevenue) * 100;
                    const isActive = tooltip?.index === i;
                    const isFirst = i === 0;
                    const isLast = i === data.length - 1;
                    const tooltipAlignCls = isFirst
                        ? 'left-0 translate-x-0 text-left'
                        : isLast
                        ? 'right-0 translate-x-0 text-right'
                        : '-translate-x-1/2 text-center';
                    const tooltipLeftStyle = isFirst || isLast
                        ? undefined
                        : `${(i / Math.max(data.length - 1, 1)) * 100}%`;

                    return (
                        <div
                            key={point.month}
                            role="button"
                            tabIndex={0}
                            aria-label={`${point.month}: ${point.cremations} cremaciones, $${Math.round(point.revenue).toLocaleString('es-CL')}`}
                            className="flex-1 flex flex-col items-center gap-1 group cursor-pointer select-none outline-none"
                            onMouseEnter={() => setTooltip({ point, index: i })}
                            onMouseLeave={() => setTooltip(null)}
                            onClick={() => setTooltip(prev => (prev?.index === i ? null : { point, index: i }))}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setTooltip(prev => (prev?.index === i ? null : { point, index: i }));
                                }
                            }}
                        >
                            {/* Tooltip */}
                            {isActive && (
                                <motion.div
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`absolute -top-14 z-10 bg-card border border-foreground/10 rounded-xl px-3 py-2 shadow-xl pointer-events-none whitespace-nowrap ${tooltipAlignCls}`}
                                    style={tooltipLeftStyle ? { left: tooltipLeftStyle } : undefined}
                                >
                                    <p className="text-[10px] font-black text-foreground">{point.month}</p>
                                    <p className="text-[9px] text-blue-500 dark:text-blue-400 font-bold">{point.cremations} crem.</p>
                                    <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                                        ${Math.round(point.revenue).toLocaleString('es-CL')}
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
                                    className={`flex-1 rounded-t-md transition-colors ${isActive ? 'bg-blue-500 dark:bg-blue-400' : 'bg-blue-500/40 group-hover:bg-blue-400/70'}`}
                                />
                                {/* Ingresos bar (green) */}
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${Math.max(revPct, 4)}%` }}
                                    transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.05 + 0.03 }}
                                    className={`flex-1 rounded-t-md transition-colors ${isActive ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-emerald-500/40 group-hover:bg-emerald-400/70'}`}
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

            {/* Legend & Semestral Summary */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/70">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Total 6 meses: <strong className="text-slate-800 dark:text-slate-200">{totalSemestralCremations}</strong> serv. · <strong className="text-emerald-700 dark:text-emerald-400">${Math.round(totalSemestralRevenue).toLocaleString('es-CL')}</strong>
                </p>
                <div className="flex items-center gap-4">
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
        </div>
    );
}
