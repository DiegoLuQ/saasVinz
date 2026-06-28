"use client";

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface DataPoint {
    month: string;
    revenue: number;
    tenants?: number;
}

interface RevenueChartProps {
    data: DataPoint[];
}

const MONTH_ES: Record<string, string> = {
    Jan: 'Ene', Feb: 'Feb', Mar: 'Mar', Apr: 'Abr',
    May: 'May', Jun: 'Jun', Jul: 'Jul', Aug: 'Ago',
    Sep: 'Sep', Oct: 'Oct', Nov: 'Nov', Dec: 'Dic',
};

function RevenueChart({ data }: RevenueChartProps) {
    const [tooltip, setTooltip] = useState<{ index: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    if (!data || data.length === 0) {
        return <div className="h-40 flex items-center justify-center text-white/10 italic text-[10px]">Sin datos suficientes</div>;
    }

    const maxRevenue = Math.max(...data.map(d => d.revenue), 1000);
    const hasTenants = data.some(d => (d.tenants ?? 0) > 0);
    const maxTenants = Math.max(...data.map(d => d.tenants ?? 0), 1);

    // SVG polyline points for tenant trend line
    const svgPoints = hasTenants
        ? data.map((d, i) => {
              const x = (i / (data.length - 1)) * 100;
              const y = 100 - ((d.tenants ?? 0) / maxTenants) * 100;
              return `${x},${y}`;
          }).join(' ')
        : '';

    return (
        <div className="mt-4 space-y-1">
            {hasTenants && (
                <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-primary/70" />
                        <span className="text-[9px] text-white/40 uppercase font-bold tracking-wider">Revenue</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-6 h-0.5 bg-emerald-400" style={{ borderTop: '2px dashed' }} />
                        <span className="text-[9px] text-white/40 uppercase font-bold tracking-wider">Tenants</span>
                    </div>
                </div>
            )}

            <div ref={containerRef} className="relative">
                {/* Tenant trend line (SVG overlay) */}
                {hasTenants && (
                    <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="absolute inset-x-0 top-0 h-36 w-full pointer-events-none z-20"
                        style={{ bottom: '20px', height: 'calc(100% - 20px)' }}
                    >
                        <polyline
                            points={svgPoints}
                            fill="none"
                            stroke="rgb(52 211 153)"
                            strokeWidth="1.5"
                            strokeDasharray="4 2"
                            vectorEffect="non-scaling-stroke"
                        />
                        {data.map((d, i) => {
                            const x = (i / (data.length - 1)) * 100;
                            const y = 100 - ((d.tenants ?? 0) / maxTenants) * 100;
                            return (
                                <circle
                                    key={i}
                                    cx={x}
                                    cy={y}
                                    r="2"
                                    fill="rgb(52 211 153)"
                                    vectorEffect="non-scaling-stroke"
                                />
                            );
                        })}
                    </svg>
                )}

                {/* Bars */}
                <div className="flex items-end gap-2 h-36">
                    {data.map((d, i) => (
                        <div
                            key={i}
                            className="flex-1 group relative h-full flex flex-col justify-end cursor-default"
                            onMouseEnter={() => setTooltip({ index: i })}
                            onMouseLeave={() => setTooltip(null)}
                        >
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${(d.revenue / maxRevenue) * 100}%` }}
                                className="bg-primary/20 group-hover:bg-primary/40 rounded-t-lg transition-colors absolute inset-x-0 bottom-0 z-0"
                            />
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${(d.revenue / maxRevenue) * 100}%` }}
                                className="bg-gradient-to-t from-primary/40 to-primary group-hover:from-primary/60 group-hover:to-primary rounded-t-lg transition-colors relative z-10 w-full"
                                style={{ minHeight: d.revenue > 0 ? '4px' : '0' }}
                            />

                            {/* Tooltip */}
                            {tooltip?.index === i && (
                                <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-[#0a192f] border border-white/20 text-white text-[9px] font-black px-2.5 py-1.5 rounded-xl z-30 whitespace-nowrap shadow-xl">
                                    <div>${d.revenue.toLocaleString('es-CL')}</div>
                                    {hasTenants && <div className="text-emerald-400">{d.tenants} tenants</div>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Month labels */}
                <div className="flex gap-2 mt-2">
                    {data.map((d, i) => (
                        <div key={i} className="flex-1 text-[8px] font-black text-white/30 text-center uppercase tracking-tighter">
                            {MONTH_ES[d.month] ?? d.month}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default React.memo(RevenueChart);
