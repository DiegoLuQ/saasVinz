"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, ArrowUpRight, Building2, Mail } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import {
    DIAG_API, STATUS_META, type DiagnosticRow, type DiagStatus, type DiagConfig,
    fmtPct, pctTone, TONE_HEX,
} from '@/lib/diagnostics';

const inputCls = 'bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/60 [color-scheme:dark]';
const thCls = 'text-left text-[11px] font-bold uppercase tracking-wider text-white/40 px-4 py-3 whitespace-nowrap';
const tdCls = 'px-4 py-3 text-sm text-white/80 align-top';

export default function DiagnosticsListTab() {
    const [q, setQ] = useState('');
    const [level, setLevel] = useState('');
    const [status, setStatus] = useState('');
    const [source, setSource] = useState('');

    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (level) params.set('level', level);
    if (status) params.set('status', status);
    if (source) params.set('source', source);

    const { data, isLoading, error } = useQuery<DiagnosticRow[]>({
        queryKey: ['admin', 'diagnostics', q, level, status, source],
        queryFn: () => apiRequest(`${DIAG_API}?${params.toString()}`),
        placeholderData: prev => prev,
    });
    const { data: config } = useQuery<DiagConfig>({
        queryKey: ['admin', 'diagnostics', 'config'],
        queryFn: () => apiRequest(`${DIAG_API}/config`),
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar crematorio, ciudad, contacto o correo"
                        className={`${inputCls} w-full pl-9`} />
                </div>
                <select value={level} onChange={e => setLevel(e.target.value)} className={inputCls} aria-label="Nivel">
                    <option value="">Todos los niveles</option>
                    {config?.levels.map(lv => <option key={lv.name} value={lv.name}>{lv.name}</option>)}
                </select>
                <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls} aria-label="Estado">
                    <option value="">Todos los estados</option>
                    {(Object.keys(STATUS_META) as DiagStatus[]).map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                </select>
                <select value={source} onChange={e => setSource(e.target.value)} className={inputCls} aria-label="Origen">
                    <option value="">Web y admin</option>
                    <option value="web">Solo web</option>
                    <option value="admin">Solo admin</option>
                </select>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                {isLoading ? (
                    <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
                ) : error ? (
                    <p className="p-6 text-red-300 text-sm">{(error as Error).message}</p>
                ) : !data?.length ? (
                    <div className="p-10 text-center">
                        <p className="text-white/60 text-sm">Aún no hay diagnósticos{q || level || status ? ' con estos filtros' : ''}.</p>
                        <Link href="/dashboard/diagnosticos/nuevo" className="inline-block mt-3 text-primary text-sm font-bold hover:underline">
                            Hacer el primer diagnóstico
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px]">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className={thCls}>Crematorio</th>
                                    <th className={thCls}>Ciudad</th>
                                    <th className={`${thCls} text-right`}>Resultado</th>
                                    <th className={thCls}>Nivel</th>
                                    <th className={thCls}>Estado</th>
                                    <th className={thCls}>Fecha</th>
                                    <th className={thCls} />
                                </tr>
                            </thead>
                            <tbody>
                                {data.map(d => (
                                    <tr key={d.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                                        <td className={tdCls}>
                                            <Link href={`/dashboard/diagnosticos/${d.id}`} className="font-bold text-white hover:text-primary">{d.business_name}</Link>
                                            <span className="block text-[11px] text-white/40">
                                                {[d.email ?? d.contact_name, `${d.mode} preguntas`].filter(Boolean).join(' · ')}
                                                {d.source === 'web' && <span className="ml-1.5 text-primary font-bold">Web{d.utm?.utm_source ? ` · ${d.utm.utm_source}` : ''}</span>}
                                                {d.linked_tenant_id && <span className="ml-1.5 inline-flex items-center gap-1 text-emerald-300"><Building2 size={11} /> En Vinzer</span>}
                                                {d.sent_at && <span className="ml-1.5 inline-flex items-center gap-1 text-sky-300"><Mail size={11} /> Enviado</span>}
                                            </span>
                                        </td>
                                        <td className={tdCls}>{d.city ?? '—'}</td>
                                        <td className={`${tdCls} text-right font-black`} style={{ color: TONE_HEX[pctTone(d.total_pct)] }}>{fmtPct(d.total_pct)}</td>
                                        <td className={tdCls}>{d.completed_at ? (d.level ?? '—') : <span className="text-amber-300">Sin terminar</span>}{d.is_partial && <span className="block text-[11px] text-amber-300/80">Parcial</span>}</td>
                                        <td className={tdCls}>
                                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_META[d.status]?.cls ?? ''}`}>{STATUS_META[d.status]?.label ?? d.status}</span>
                                        </td>
                                        <td className={`${tdCls} whitespace-nowrap`}>{new Date(d.created_at).toLocaleDateString('es-CL')}</td>
                                        <td className={`${tdCls} text-right`}>
                                            <Link href={`/dashboard/diagnosticos/${d.id}`} title="Ver diagnóstico"
                                                className="inline-flex p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"><ArrowUpRight size={15} /></Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
