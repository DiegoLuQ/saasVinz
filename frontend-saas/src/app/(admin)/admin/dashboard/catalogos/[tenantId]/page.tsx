"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowLeft, ArrowUpRight, BellRing, CheckCircle2, Compass, ExternalLink, Heart, Link2, Loader2, Mail,
    MessageCircle, Star, XCircle,
} from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { getPublicMemorialPath } from '@/lib/memorialUrls';
import { getMemorialBaseUrl } from '@/lib/publicUrls';
import OfficialFormFunnel from '@/components/admin/catalog/OfficialFormFunnel';

// --- GET /api/internal/creator/catalog-funnel/tenant/{id} (backend services/tenant_tracking.py) ---
interface LinkRow {
    id: number; name: string; type: 'plans' | 'products'; official: boolean; active: boolean;
    created_at: string | null; expires_at: string | null; views_count: number; last_viewed_at: string | null;
    visitors?: number; plan_requests?: number; whatsapp_clicks?: number; forms_submitted?: number; orders?: number; delivered?: number;
}
interface Detail {
    tenant: { id: number; name: string; slug: string; status: string; plan: string | null; created_at: string | null };
    official: { form: string | null; plans: { name: string | null; url: string } | null; products: { name: string | null; url: string } | null; complete: boolean; missing: string[] };
    links: LinkRow[];
    views: { tracking: number; tracking_distinct: number; memorial: number; memorial_distinct: number; daily: { date: string; tracking: number; memorial: number }[] };
    orders_period: number;
    orders_opened: number;
    top_orders: { id: number; code: string | null; oc_number: number | null; status: string | null; pet_name: string | null; views: number; last_view: string | null; url: string | null }[];
    top_memorials: { id: number; uuid: string; short_code: string | null; pet_name: string | null; views: number; last_view: string | null }[];
    notices: { email: number; whatsapp: number; finish: number };
    feedback: { count: number; avg: number | null };
}
interface Funnel {
    visitors: number; size_select: number; plan_request: number; whatsapp: number;
    form_open: number; form_submit: number; order: number; delivered: number;
}
interface Report {
    totals: Funnel & { forms_all?: number; orders_all?: number; delivered_all?: number };
    top_sizes: { weight_tier: string; count: number }[];
    top_sizes_orders?: number;
    top_plans: { plan_id: number; plan_name: string; total: number }[];
}

const cardCls = 'bg-white/5 border border-white/10 rounded-2xl';
const inputCls = 'bg-[#0f172a] border border-white/25 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white shadow-inner focus:outline-none focus:border-primary [color-scheme:dark]';
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return isoDay(d); };
const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)} %` : '—');
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const STATUS: Record<string, string> = {
    pendiente: 'Pendiente', pending: 'Pendiente', recibido: 'Recibido', coordinado: 'Coordinado', en_proceso: 'En proceso',
    processing: 'En proceso', listo: 'Listo', ready: 'Listo', entregado: 'Entregado', cancelado: 'Cancelada', cancelled: 'Cancelada',
};
const FUNNEL: { key: keyof Funnel; label: string }[] = [
    { key: 'visitors', label: 'Visitas al catálogo' },
    { key: 'size_select', label: 'Eligieron tamaño' },
    { key: 'plan_request', label: 'Solicitar este plan' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'form_open', label: 'Abrieron el formulario' },
    { key: 'form_submit', label: 'Formulario enviado' },
    { key: 'order', label: 'Con orden' },
    { key: 'delivered', label: 'Entregada' },
];

function Tile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode }) {
    return (
        <div className={`${cardCls} p-4`}>
            <p className="text-[10px] uppercase font-bold tracking-wider text-white/40 flex items-center gap-1.5">{icon}{label}</p>
            <p className="text-2xl font-black text-white mt-1">{value}</p>
            {sub && <p className="text-[11px] text-white/45 mt-0.5">{sub}</p>}
        </div>
    );
}

/** Aperturas por día: dos barras por día (seguimiento / memorial), con tooltip. */
function DailyChart({ rows }: { rows: Detail['views']['daily'] }) {
    if (!rows.length) return <p className="py-6 text-center text-sm text-white/40">Sin aperturas en el periodo.</p>;
    const max = Math.max(1, ...rows.map((r) => Math.max(r.tracking, r.memorial)));
    return (
        <div>
            <div className="flex items-center gap-4 text-[11px] text-white/60 mb-2">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-sky-400" /> Seguimiento</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-400" /> Memorial</span>
            </div>
            <div className="flex items-end gap-1 h-40 overflow-x-auto pb-1">
                {rows.map((r) => (
                    <div key={r.date} className="group relative flex flex-col items-center justify-end h-full min-w-[18px] flex-1">
                        <div className="flex items-end gap-[2px] h-full w-full justify-center">
                            <div className="w-1/2 max-w-[10px] rounded-t bg-sky-400" style={{ height: `${(r.tracking / max) * 100}%`, minHeight: r.tracking ? 3 : 0 }} />
                            <div className="w-1/2 max-w-[10px] rounded-t bg-rose-400" style={{ height: `${(r.memorial / max) * 100}%`, minHeight: r.memorial ? 3 : 0 }} />
                        </div>
                        <div className="pointer-events-none absolute bottom-full mb-1 hidden group-hover:block whitespace-nowrap rounded-lg bg-slate-900 border border-white/15 px-2 py-1 text-[11px] text-white z-10">
                            {r.date.slice(8, 10)}/{r.date.slice(5, 7)} · Seguimiento {r.tracking} · Memorial {r.memorial}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex justify-between text-[10px] text-white/35 mt-1">
                <span>{rows[0].date.slice(8, 10)}/{rows[0].date.slice(5, 7)}</span>
                <span>{rows[rows.length - 1].date.slice(8, 10)}/{rows[rows.length - 1].date.slice(5, 7)}</span>
            </div>
        </div>
    );
}

export default function TenantTrackingDetailPage() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const sp = useSearchParams();
    const [dateFrom, setDateFrom] = useState(sp.get('date_from') || daysAgo(29));
    const [dateTo, setDateTo] = useState(sp.get('date_to') || isoDay(new Date()));
    const qs = new URLSearchParams({ ...(dateFrom ? { date_from: dateFrom } : {}), ...(dateTo ? { date_to: dateTo } : {}) }).toString();

    const { data, isLoading, error } = useQuery<Detail>({
        queryKey: ['admin', 'tenant-tracking', tenantId, dateFrom, dateTo],
        queryFn: () => apiRequest(`/api/internal/creator/catalog-funnel/tenant/${tenantId}?${qs}`),
    });
    const { data: rep } = useQuery<Report>({
        queryKey: ['admin', 'catalog-funnel', dateFrom, dateTo, String(tenantId)],
        queryFn: () => apiRequest(`/api/internal/creator/catalog-funnel?${qs}&tenant_id=${tenantId}`),
    });
    const memorialBase = getMemorialBaseUrl();

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
            <Link href={`/dashboard/catalogos?${qs}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-white/50 hover:text-white">
                <ArrowLeft size={14} /> KPIs del catálogo
            </Link>

            {isLoading ? (
                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-white/40" /></div>
            ) : error || !data ? (
                <p className="text-sm text-rose-300">No se pudo cargar el detalle del crematorio.</p>
            ) : (
                <>
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-black text-white">{data.tenant.name}</h1>
                            <p className="text-sm text-white/50 mt-1">
                                Plan {data.tenant.plan || '—'} · {data.tenant.slug} · {data.tenant.status}
                                <Link href={`/dashboard/tenants/${data.tenant.slug}`} className="ml-2 inline-flex items-center gap-1 text-primary hover:underline">
                                    Perfil <ArrowUpRight size={13} />
                                </Link>
                            </p>
                        </div>
                        <div className="flex flex-wrap items-end gap-2">
                            <label className="text-[11px] text-white/50 flex flex-col gap-1">Desde
                                <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className={inputCls} />
                            </label>
                            <label className="text-[11px] text-white/50 flex flex-col gap-1">Hasta
                                <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className={inputCls} />
                            </label>
                            {[7, 30, 90].map((n) => (
                                <button key={n} type="button" onClick={() => { setDateFrom(daysAgo(n - 1)); setDateTo(isoDay(new Date())); }}
                                    className="rounded-xl border border-white/15 px-3 py-2.5 text-xs font-bold text-white/70 hover:bg-white/10">{n} días</button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        <Tile icon={<Compass size={12} className="text-sky-400" />} label="Aperturas seguimiento" value={data.views.tracking}
                            sub={`${data.views.tracking_distinct} seguimientos distintos`} />
                        <Tile icon={<CheckCircle2 size={12} className="text-sky-400" />} label="Órdenes con seguimiento abierto"
                            value={pct(data.orders_opened, data.orders_period)} sub={`${data.orders_opened} de ${data.orders_period} órdenes del periodo`} />
                        <Tile icon={<Heart size={12} className="text-rose-400" />} label="Aperturas memorial" value={data.views.memorial}
                            sub={`${data.views.memorial_distinct} memoriales distintos`} />
                        <Tile icon={<BellRing size={12} className="text-primary" />} label="Avisos a familias" value={data.notices.email + data.notices.whatsapp}
                            sub={<><Mail size={11} className="inline" /> {data.notices.email} · <MessageCircle size={11} className="inline" /> {data.notices.whatsapp} · {data.notices.finish} de cierre</>} />
                        <Tile icon={<Star size={12} className="text-amber-400" />} label="Encuesta" value={data.feedback.avg != null ? `${data.feedback.avg} / 5` : '—'}
                            sub={`${data.feedback.count} respuestas`} />
                    </div>

                    <div className={`${cardCls} p-5`}>
                        <h2 className="text-white font-bold">Aperturas por día</h2>
                        <p className="text-[11px] text-white/40 mt-1 mb-3">Cada vez que alguien abre el link de seguimiento o de un memorial de este crematorio (recargar también suma).</p>
                        <DailyChart rows={data.views.daily} />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className={`${cardCls} p-5`}>
                            <h2 className="text-white font-bold flex items-center gap-2"><Compass size={15} className="text-sky-400" /> Seguimientos más abiertos</h2>
                            {data.top_orders.length === 0 ? <p className="py-3 text-sm text-white/40">Sin aperturas en el periodo.</p> : (
                                <table className="w-full text-sm mt-3">
                                    <thead><tr className="text-left text-[10px] uppercase tracking-wider text-white/40">
                                        <th className="py-2">Mascota</th><th className="py-2">Orden</th><th className="py-2">Estado</th><th className="py-2 text-right">Aperturas</th><th className="py-2 text-right">Última</th><th />
                                    </tr></thead>
                                    <tbody>
                                        {data.top_orders.map((o) => (
                                            <tr key={o.id} className="border-t border-white/5 text-white/80">
                                                <td className="py-2 font-bold text-white">{o.pet_name || '—'}</td>
                                                <td className="py-2 text-white/60">{o.oc_number ? `#${o.oc_number}` : o.code || `#${o.id}`}</td>
                                                <td className="py-2 text-white/60">{STATUS[(o.status || '').toLowerCase()] || o.status || '—'}</td>
                                                <td className="py-2 text-right font-bold">{o.views}</td>
                                                <td className="py-2 text-right text-[11px] text-white/45">{fmtDate(o.last_view)}</td>
                                                <td className="py-2 text-right">{o.url && <a href={o.url} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white" title="Abrir seguimiento"><ExternalLink size={13} /></a>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className={`${cardCls} p-5`}>
                            <h2 className="text-white font-bold flex items-center gap-2"><Heart size={15} className="text-rose-400" /> Memoriales más visitados</h2>
                            {data.top_memorials.length === 0 ? <p className="py-3 text-sm text-white/40">Sin visitas en el periodo.</p> : (
                                <table className="w-full text-sm mt-3">
                                    <thead><tr className="text-left text-[10px] uppercase tracking-wider text-white/40">
                                        <th className="py-2">Mascota</th><th className="py-2 text-right">Visitas</th><th className="py-2 text-right">Última</th><th />
                                    </tr></thead>
                                    <tbody>
                                        {data.top_memorials.map((m) => (
                                            <tr key={m.id} className="border-t border-white/5 text-white/80">
                                                <td className="py-2 font-bold text-white">{m.pet_name || '—'}</td>
                                                <td className="py-2 text-right font-bold">{m.views}</td>
                                                <td className="py-2 text-right text-[11px] text-white/45">{fmtDate(m.last_view)}</td>
                                                <td className="py-2 text-right">
                                                    <a href={`${memorialBase}${getPublicMemorialPath({ id_recuerdo: m.uuid, tenantSlug: data.tenant.slug, petName: m.pet_name, shortCode: m.short_code })}`}
                                                        target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white" title="Abrir memorial"><ExternalLink size={13} /></a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {rep && (
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className={`${cardCls} p-5`}>
                                <h2 className="text-white font-bold">Embudo del catálogo de planes</h2>
                                <p className="text-[11px] text-white/40 mt-1">Personas distintas por paso en el periodo · % sobre las visitas.</p>
                                <ul className="mt-3 space-y-2">
                                    {FUNNEL.map((s) => {
                                        const v = rep.totals[s.key] || 0;
                                        const max = Math.max(rep.totals.visitors || 0, ...FUNNEL.map((f) => rep.totals[f.key] || 0), 1);
                                        return (
                                            <li key={s.key} className="text-sm">
                                                <div className="flex justify-between text-white/80"><span>{s.label}</span><span className="font-bold">{v}<span className="ml-1.5 text-[11px] font-normal text-white/40">{pct(v, rep.totals.visitors)}</span></span></div>
                                                <div className="h-1.5 mt-1 rounded-full bg-white/5"><div className="h-full rounded-full bg-primary/60" style={{ width: `${(v / max) * 100}%` }} /></div>
                                            </li>
                                        );
                                    })}
                                </ul>
                                {rep.totals.forms_all != null && (
                                    <p className="mt-3 text-[11px] text-white/45">Todos los formularios web: {rep.totals.forms_all} · con orden {rep.totals.orders_all ?? 0} · entregadas {rep.totals.delivered_all ?? 0}</p>
                                )}
                            </div>
                            <div className={`${cardCls} p-5 space-y-4`}>
                                <div>
                                    <h2 className="text-white font-bold">Planes más pedidos</h2>
                                    {rep.top_plans.length === 0 ? <p className="py-2 text-sm text-white/40">Sin datos.</p> : (
                                        <ul className="mt-2 space-y-1 text-sm">{rep.top_plans.map((p) => <li key={p.plan_id} className="flex justify-between text-white/80"><span className="truncate">{p.plan_name}</span><b>{p.total}</b></li>)}</ul>
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-white font-bold">Tamaños más pedidos</h2>
                                    <p className="text-[11px] text-white/40">{rep.top_sizes_orders ?? 0} órdenes en proceso y entregadas del periodo.</p>
                                    {rep.top_sizes.length === 0 ? <p className="py-2 text-sm text-white/40">Sin datos.</p> : (
                                        <ul className="mt-2 space-y-1 text-sm">{rep.top_sizes.map((s) => <li key={s.weight_tier} className="flex justify-between text-white/80"><span className="truncate">{s.weight_tier}</span><b>{s.count}</b></li>)}</ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <OfficialFormFunnel dateFrom={dateFrom} dateTo={dateTo} tenantId={String(tenantId)} />

                    <div className={`${cardCls} p-5`}>
                        <h2 className="text-white font-bold flex items-center gap-2"><Link2 size={15} className="text-primary" /> Enlaces oficiales</h2>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
                            {[
                                { label: 'Formulario oficial', value: data.official.form },
                                { label: 'Catálogo de planes', value: data.official.plans?.name || (data.official.plans ? 'Sin nombre' : null), url: data.official.plans?.url },
                                { label: 'Catálogo de productos', value: data.official.products?.name || (data.official.products ? 'Sin nombre' : null), url: data.official.products?.url },
                            ].map((o) => (
                                <div key={o.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                    <p className="text-[10px] uppercase font-bold tracking-wider text-white/40">{o.label}</p>
                                    <p className={`mt-1 flex items-center gap-1.5 font-bold ${o.value ? 'text-white' : 'text-white/40'}`}>
                                        {o.value ? <CheckCircle2 size={14} className="text-emerald-400" /> : <XCircle size={14} className="text-white/30" />}
                                        {o.value || 'Sin elegir'}
                                        {o.url && <a href={o.url} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white"><ExternalLink size={12} /></a>}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={`${cardCls} overflow-x-auto`}>
                        <div className="p-5 pb-0">
                            <h2 className="text-white font-bold">Enlaces de catálogo ({data.links.length})</h2>
                            <p className="text-[11px] text-white/40 mt-1">Histórico de cada enlace (desde que se creó).</p>
                        </div>
                        {data.links.length === 0 ? <p className="p-5 text-sm text-white/40">Este crematorio no ha creado enlaces de catálogo.</p> : (
                            <table className="w-full text-sm mt-3">
                                <thead><tr className="text-left text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
                                    <th className="px-5 py-2.5">Enlace</th><th className="px-3 py-2.5">Tipo</th><th className="px-3 py-2.5">Estado</th>
                                    <th className="px-3 py-2.5 text-right">Aperturas</th><th className="px-3 py-2.5 text-right">Visitas</th><th className="px-3 py-2.5 text-right">Solicitudes</th>
                                    <th className="px-3 py-2.5 text-right">WhatsApp</th><th className="px-3 py-2.5 text-right">Formularios</th><th className="px-3 py-2.5 text-right">Órdenes</th><th className="px-5 py-2.5 text-right">Creado</th>
                                </tr></thead>
                                <tbody>
                                    {data.links.map((l) => (
                                        <tr key={l.id} className="border-b border-white/5 text-white/80">
                                            <td className="px-5 py-2.5 font-bold text-white">{l.name}{l.official && <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">Oficial</span>}</td>
                                            <td className="px-3 py-2.5 text-white/60">{l.type === 'plans' ? 'Planes' : 'Productos'}</td>
                                            <td className="px-3 py-2.5">{l.active ? <span className="text-emerald-300 text-xs font-bold">Activo</span> : <span className="text-white/40 text-xs">Inactivo / vencido</span>}</td>
                                            <td className="px-3 py-2.5 text-right">{l.views_count}</td>
                                            {l.type === 'plans' ? (
                                                <>
                                                    <td className="px-3 py-2.5 text-right">{l.visitors ?? 0}</td>
                                                    <td className="px-3 py-2.5 text-right">{l.plan_requests ?? 0}</td>
                                                    <td className="px-3 py-2.5 text-right">{l.whatsapp_clicks ?? 0}</td>
                                                    <td className="px-3 py-2.5 text-right">{l.forms_submitted ?? 0}</td>
                                                    <td className="px-3 py-2.5 text-right font-bold">{l.orders ?? 0}</td>
                                                </>
                                            ) : <td colSpan={5} className="px-3 py-2.5 text-right text-[11px] text-white/30">Solo aperturas</td>}
                                            <td className="px-5 py-2.5 text-right text-[11px] text-white/45">{l.created_at ? new Date(l.created_at).toLocaleDateString('es-CL') : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
