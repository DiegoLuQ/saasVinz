"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { DIAG_API, STATUS_META, type DiagStatus, type DiagSummary, fmtPct, pctTone, TONE_HEX } from '@/lib/diagnostics';

const cardCls = 'bg-white/5 border border-white/10 rounded-2xl p-5';

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div className={cardCls}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">{label}</p>
            <p className="text-2xl sm:text-3xl font-black mt-2 text-white">{value}</p>
            {hint && <p className="text-[11px] text-white/40 mt-1">{hint}</p>}
        </div>
    );
}

export default function SummaryTab() {
    const { data, isLoading } = useQuery<DiagSummary>({
        queryKey: ['admin', 'diagnostics', 'summary'],
        queryFn: () => apiRequest(`${DIAG_API}/summary`),
    });
    if (isLoading || !data) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    const maxLevel = Math.max(1, ...data.by_level.map(l => l.count));
    const clients = data.by_status.cliente ?? 0;

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Kpi label="Diagnósticos" value={String(data.count)} hint={`${data.from_web} desde la web · ${data.incomplete} sin terminar`} />
                <Kpi label="Resultado promedio" value={fmtPct(data.avg_total)} />
                <Kpi label="Ya están en Vinzer" value={String(data.registered)} hint="Su correo coincide con un crematorio registrado" />
                <Kpi label="Clientes" value={String(clients)} hint={data.count ? `${Math.round((clients / data.count) * 100)} % de los diagnosticados` : undefined} />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <section className={cardCls}>
                    <h3 className="text-white font-bold">Promedio por área</h3>
                    <p className="text-[11px] text-white/40 mt-1 mb-4">Las áreas más débiles del mercado son las mejores para tu mensaje comercial.</p>
                    {data.categories.length === 0 ? (
                        <p className="text-sm text-white/40">Sin datos aún.</p>
                    ) : (
                        <div className="space-y-2.5">
                            {data.categories.map(c => (
                                <div key={c.key} className="grid grid-cols-[minmax(0,10rem)_1fr_3.5rem] sm:grid-cols-[13rem_1fr_3.5rem] gap-3 items-center">
                                    <span className="text-sm text-white/70 truncate" title={c.name}>{c.name}</span>
                                    <div className="h-2.5 rounded-full bg-white/5">
                                        <div className="h-full rounded-full" style={{ width: `${Math.max(2, c.avg)}%`, backgroundColor: TONE_HEX[pctTone(c.avg)] }} />
                                    </div>
                                    <span className="text-sm font-bold text-right" style={{ color: TONE_HEX[pctTone(c.avg)] }}>{fmtPct(c.avg)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <div className="space-y-4">
                    <section className={cardCls}>
                        <h3 className="text-white font-bold mb-3">Por nivel</h3>
                        <ul className="space-y-2">
                            {data.by_level.map(l => (
                                <li key={l.name} className="text-sm">
                                    <div className="flex justify-between text-white/80"><span>{l.name}</span><span className="font-bold">{l.count}</span></div>
                                    <div className="h-1.5 mt-1 rounded-full bg-white/5"><div className="h-full rounded-full bg-primary/60" style={{ width: `${(l.count / maxLevel) * 100}%` }} /></div>
                                </li>
                            ))}
                        </ul>
                    </section>
                    <section className={cardCls}>
                        <h3 className="text-white font-bold mb-3">Estado comercial</h3>
                        <div className="flex flex-wrap gap-2">
                            {(Object.keys(STATUS_META) as DiagStatus[]).map(s => (
                                <span key={s} className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_META[s].cls}`}>
                                    {STATUS_META[s].label}: {data.by_status[s] ?? 0}
                                </span>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
