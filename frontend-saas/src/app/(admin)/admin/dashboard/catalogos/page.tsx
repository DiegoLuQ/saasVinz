"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Filter, Link2, Loader2, ArrowUpRight, Info, Scale, BookOpen } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';

// --- GET /api/internal/creator/catalog-funnel (backend services/catalog_funnel.py) ---
interface Funnel {
    visitors: number; size_select: number; plan_request: number; whatsapp: number;
    form_open: number; form_submit: number; pending: number; order: number; delivered: number;
}
interface TenantRow extends Funnel {
    tenant_id: number; tenant_name: string; tenant_slug: string | null;
    links_total: number; links_period: number; views_total: number;
}
interface Report {
    totals: Funnel;
    links_total: number;
    links_period: number;
    by_tenant: TenantRow[];
    top_plans: { plan_id: number; plan_name: string; tenant_name: string | null; price: number | null; plan_request: number; whatsapp: number; total: number }[];
    top_sizes: { weight_tier: string; count: number }[];
    tenants: { id: number; name: string }[];
}

const cardCls = 'bg-white/5 border border-white/10 rounded-2xl';
const thCls = 'text-left text-[11px] font-bold uppercase tracking-wider text-white/40 px-4 py-3 whitespace-nowrap';
const tdCls = 'px-4 py-3 text-sm text-white/80 align-top';
const inputCls = 'bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/60 [color-scheme:dark]';
const clp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;
const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)} %` : '—');

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return isoDay(d); };

// Pasos del embudo, en orden; cada uno se compara con el anterior y con las visitas
const STEPS: { key: keyof Funnel; label: string; hint: string }[] = [
    { key: 'visitors', label: 'Visitas', hint: 'Personas distintas que abrieron un catálogo' },
    { key: 'size_select', label: 'Eligieron tamaño', hint: 'Tocaron un tamaño o peso de mascota' },
    { key: 'plan_request', label: 'Solicitar este plan', hint: 'Tocaron «Solicitar este plan»' },
    { key: 'form_open', label: 'Abrieron el formulario', hint: 'Llegaron al formulario desde el catálogo' },
    { key: 'form_submit', label: 'Formulario enviado', hint: 'Registros recibidos desde un catálogo' },
    { key: 'order', label: 'Con orden', hint: 'El registro se procesó y tiene orden de cremación' },
    { key: 'delivered', label: 'Entregada', hint: 'La orden llegó a «Entregado»' },
];

function FunnelChart({ data }: { data: Funnel }) {
    const max = Math.max(1, data.visitors, ...STEPS.map(s => data[s.key]));
    return (
        <div className="space-y-2.5">
            {STEPS.map((s, i) => {
                const value = data[s.key];
                const prev = i > 0 ? data[STEPS[i - 1].key] : null;
                return (
                    <div key={s.key} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] sm:grid-cols-[12rem_1fr_7rem] items-center gap-3">
                        <span className="text-xs sm:text-sm text-white/70 truncate" title={s.hint}>{s.label}</span>
                        <div className="h-7 rounded-lg bg-white/5 overflow-hidden">
                            {value > 0 ? (
                                <div className="h-full rounded-lg bg-primary/70 flex items-center px-2 text-xs font-bold text-white transition-all"
                                    style={{ width: `${Math.max(6, (value / max) * 100)}%` }}>
                                    {value}
                                </div>
                            ) : (
                                <span className="h-full flex items-center px-2 text-xs text-white/30">0</span>
                            )}
                        </div>
                        <span className="text-[11px] text-white/50 text-right whitespace-nowrap" title="Respecto al paso anterior">
                            {prev !== null ? pct(value, prev) : ''}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div className={`${cardCls} p-5`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">{label}</p>
            <p className="text-2xl sm:text-3xl font-black mt-2 text-white">{value}</p>
            {hint && <p className="text-[11px] text-white/40 mt-1">{hint}</p>}
        </div>
    );
}

export default function CatalogFunnelPage() {
    const [dateFrom, setDateFrom] = useState(daysAgo(29));
    const [dateTo, setDateTo] = useState(isoDay(new Date()));
    const [tenantId, setTenantId] = useState('');

    const params = new URLSearchParams();
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (tenantId) params.set('tenant_id', tenantId);

    const { data, isLoading, error, isFetching } = useQuery<Report>({
        queryKey: ['admin', 'catalog-funnel', dateFrom, dateTo, tenantId],
        queryFn: () => apiRequest(`/api/internal/creator/catalog-funnel?${params.toString()}`),
        staleTime: 60_000,
        placeholderData: prev => prev,
    });

    const t = data?.totals;

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <BookOpen className="text-primary" size={28} /> KPIs del catálogo de planes
                </h1>
                <p className="text-white/50 mt-2 text-sm max-w-3xl">
                    Cuántos catálogos comparten los crematorios y qué tan bien convierten: de la visita al formulario enviado y a la orden.
                </p>
            </div>

            {/* Filtros */}
            <div className={`${cardCls} p-4 flex flex-wrap items-end gap-3`}>
                <Filter size={16} className="text-white/40 mb-2.5" />
                <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-white/40">
                    Desde
                    <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)} className={inputCls} />
                </label>
                <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-white/40">
                    Hasta
                    <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)} className={inputCls} />
                </label>
                <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-white/40 min-w-0 flex-1 sm:flex-none sm:w-64">
                    Crematorio
                    <select value={tenantId} onChange={e => setTenantId(e.target.value)} className={inputCls}>
                        <option value="">Todos</option>
                        {data?.tenants.map(tn => <option key={tn.id} value={tn.id}>{tn.name}</option>)}
                    </select>
                </label>
                <div className="flex gap-1.5">
                    {[7, 30, 90].map(n => (
                        <button key={n} type="button" onClick={() => { setDateFrom(daysAgo(n - 1)); setDateTo(isoDay(new Date())); }}
                            className="px-3 py-2 rounded-xl text-xs font-bold bg-white/5 text-white/60 hover:bg-white/10 hover:text-white">
                            {n} días
                        </button>
                    ))}
                </div>
                {isFetching && <Loader2 size={16} className="animate-spin text-primary mb-2.5" />}
            </div>

            {isLoading && <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" size={28} /></div>}
            {!isLoading && (error || !data || !t) && (
                <div className="p-8 text-red-300">{(error as Error)?.message || 'No se pudieron cargar los KPIs'}</div>
            )}

            {data && t && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <Kpi label="Catálogos creados" value={String(data.links_period)} hint={`${data.links_total} en total`} />
                        <Kpi label="Visitas" value={String(t.visitors)} hint="Personas distintas" />
                        <Kpi label="Formularios enviados" value={String(t.form_submit)} hint={`${pct(t.form_submit, t.visitors)} de las visitas`} />
                        <Kpi label="Órdenes" value={String(t.order)} hint={`${pct(t.order, t.form_submit)} de los formularios · ${t.pending} pendientes`} />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                        <div className={`${cardCls} p-5`}>
                            <h2 className="text-white font-bold">Embudo</h2>
                            <p className="text-[11px] text-white/40 mt-1 mb-4">El % compara cada paso con el anterior. Consultas por WhatsApp: <span className="text-white/70 font-bold">{t.whatsapp}</span> ({pct(t.whatsapp, t.visitors)} de las visitas).</p>
                            <FunnelChart data={t} />
                        </div>

                        <div className="space-y-4">
                            <div className={`${cardCls} overflow-hidden`}>
                                <h2 className="px-5 pt-5 text-white font-bold">Planes más pedidos</h2>
                                <p className="px-5 text-[11px] text-white/40 mt-1">«Solicitar este plan» + WhatsApp</p>
                                {data.top_plans.length === 0 ? (
                                    <p className="px-5 py-6 text-sm text-white/40">Sin solicitudes en el periodo.</p>
                                ) : (
                                    <table className="w-full mt-2">
                                        <tbody>
                                            {data.top_plans.map(p => (
                                                <tr key={p.plan_id} className="border-b border-white/5 last:border-0">
                                                    <td className={tdCls}>
                                                        <span className="font-bold text-white">{p.plan_name}</span>
                                                        <span className="block text-[11px] text-white/40">{[p.tenant_name, p.price ? clp(p.price) : null].filter(Boolean).join(' · ')}</span>
                                                    </td>
                                                    <td className={`${tdCls} text-right whitespace-nowrap`}>
                                                        <span className="font-bold text-white">{p.plan_request}</span> <span className="text-[11px] text-white/40">solicitar</span>
                                                        <span className="block text-[11px] text-white/40">{p.whatsapp} WhatsApp</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            <div className={`${cardCls} p-5`}>
                                <h2 className="text-white font-bold flex items-center gap-2"><Scale size={16} className="text-primary" /> Tamaños más pedidos</h2>
                                {data.top_sizes.length === 0 ? (
                                    <p className="py-3 text-sm text-white/40">Sin datos en el periodo.</p>
                                ) : (
                                    <ul className="mt-3 space-y-2">
                                        {data.top_sizes.map(s => {
                                            const max = data.top_sizes[0].count || 1;
                                            return (
                                                <li key={s.weight_tier} className="text-sm">
                                                    <div className="flex justify-between gap-3 text-white/80"><span className="truncate">{s.weight_tier}</span><span className="font-bold">{s.count}</span></div>
                                                    <div className="h-1.5 mt-1 rounded-full bg-white/5"><div className="h-full rounded-full bg-primary/60" style={{ width: `${(s.count / max) * 100}%` }} /></div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Por crematorio */}
                    <div className={`${cardCls} overflow-hidden`}>
                        <h2 className="px-5 pt-5 text-white font-bold flex items-center gap-2"><Link2 size={16} className="text-primary" /> Por crematorio</h2>
                        {data.by_tenant.length === 0 ? (
                            <p className="px-5 py-6 text-sm text-white/40">Ningún crematorio ha creado catálogos de planes.</p>
                        ) : (
                            <div className="overflow-x-auto mt-3">
                                <table className="w-full min-w-[820px]">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className={thCls}>Crematorio</th>
                                            <th className={`${thCls} text-right`}>Catálogos</th>
                                            <th className={`${thCls} text-right`}>Visitas</th>
                                            <th className={`${thCls} text-right`}>Solicitar</th>
                                            <th className={`${thCls} text-right`}>WhatsApp</th>
                                            <th className={`${thCls} text-right`}>Enviados</th>
                                            <th className={`${thCls} text-right`}>Órdenes</th>
                                            <th className={`${thCls} text-right`}>Conversión</th>
                                            <th className={thCls} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.by_tenant.map(r => (
                                            <tr key={r.tenant_id} className="border-b border-white/5 last:border-0">
                                                <td className={tdCls}><span className="font-bold text-white">{r.tenant_name}</span></td>
                                                <td className={`${tdCls} text-right`} title="Creados en el periodo / en total">{r.links_period} <span className="text-white/40">/ {r.links_total}</span></td>
                                                <td className={`${tdCls} text-right`} title={`${r.views_total} vistas históricas (contador del enlace, incluye recargas)`}>{r.visitors}</td>
                                                <td className={`${tdCls} text-right`}>{r.plan_request}</td>
                                                <td className={`${tdCls} text-right`}>{r.whatsapp}</td>
                                                <td className={`${tdCls} text-right`}>{r.form_submit}{r.pending > 0 && <span className="block text-[11px] text-amber-300/80">{r.pending} pend.</span>}</td>
                                                <td className={`${tdCls} text-right`}>{r.order}{r.delivered > 0 && <span className="block text-[11px] text-emerald-300/80">{r.delivered} entreg.</span>}</td>
                                                <td className={`${tdCls} text-right font-bold text-white`} title="Formularios enviados ÷ visitas">{pct(r.form_submit, r.visitors)}</td>
                                                <td className={`${tdCls} text-right`}>
                                                    {r.tenant_slug && (
                                                        <Link href={`/dashboard/tenants/${r.tenant_slug}`} title="Ver crematorio"
                                                            className="inline-flex p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"><ArrowUpRight size={15} /></Link>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <p className="text-[11px] text-white/40 flex items-start gap-1.5">
                        <Info size={13} className="shrink-0 mt-0.5" />
                        Se mide desde que existe este reporte (1 nov 2026). Cada persona cuenta una vez por paso y enlace, aunque recargue la página. Sin datos personales: solo un identificador anónimo del navegador.
                    </p>
                </>
            )}
        </div>
    );
}
