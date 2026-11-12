"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowLeft, ArrowUpRight, BellRing, CheckCircle2, Compass, ExternalLink, Heart, Link2, Loader2, Mail,
    MessageCircle, Star, XCircle, FileDown,
} from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { getPublicMemorialPath } from '@/lib/memorialUrls';
import { getMemorialBaseUrl } from '@/lib/publicUrls';
import OfficialFormFunnel from '@/components/admin/catalog/OfficialFormFunnel';
import { downloadTenantCatalogPdf } from '@/components/admin/catalog/buildCatalogReportPdf';

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
/** Todos los días entre from y to (YYYY-MM-DD), para que la gráfica no salte los días sin aperturas. */
function fillDays(rows: Detail['views']['daily'], from?: string, to?: string): Detail['views']['daily'] {
    const byDay = new Map(rows.map((r) => [r.date, r]));
    const start = from || rows[0]?.date;
    const end = to || rows[rows.length - 1]?.date;
    if (!start || !end) return rows;
    const out: Detail['views']['daily'] = [];
    const d = new Date(`${start}T12:00:00`);
    const last = new Date(`${end}T12:00:00`);
    for (let n = 0; d <= last && n < 400; n++, d.setDate(d.getDate() + 1)) {
        const key = isoDay(d);
        out.push(byDay.get(key) || { date: key, tracking: 0, memorial: 0 });
    }
    return out;
}

/** Escala «bonita» para el eje Y (1, 2, 5 × 10^n). */
function niceMax(v: number): number {
    if (v <= 4) return 4;
    const pow = 10 ** Math.floor(Math.log10(v));
    const step = [1, 2, 2.5, 5, 10].find((m) => m * pow * 4 >= v) || 10;
    return step * pow * 4;
}

// Colores validados (dataviz validate_palette, modo oscuro): pasan banda, CVD y contraste.
const C_TRACK = '#0284c7';
const C_MEMO = '#e11d48';

function DailyChart({ rows, from, to }: { rows: Detail['views']['daily']; from?: string; to?: string }) {
    const [hover, setHover] = useState<number | null>(null);
    if (!rows.length) return <p className="py-6 text-center text-sm text-white/40">Sin aperturas en el periodo.</p>;
    const days = fillDays(rows, from, to);
    const top = niceMax(Math.max(1, ...days.map((r) => Math.max(r.tracking, r.memorial))));
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f));
    const totT = days.reduce((a, r) => a + r.tracking, 0);
    const totM = days.reduce((a, r) => a + r.memorial, 0);
    const fmt = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
    const labelEvery = Math.max(1, Math.ceil(days.length / 8));
    const h = hover !== null ? days[hover] : null;
    return (
        <div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-white/70 mb-3">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: C_TRACK }} /> Seguimiento <b className="text-white">{totT}</b></span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: C_MEMO }} /> Memorial <b className="text-white">{totM}</b></span>
                <span className="ml-auto text-white/60 min-h-[1rem]">
                    {h ? <>{fmt(h.date)} · Seguimiento <b className="text-white">{h.tracking}</b> · Memorial <b className="text-white">{h.memorial}</b></> : 'Pasa el cursor por un día para ver el detalle'}
                </span>
            </div>
            <div className="flex gap-2">
                {/* Eje Y */}
                <div className="relative h-52 w-7 shrink-0 text-[10px] text-white/45 tabular-nums">
                    {ticks.map((t) => (
                        <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `calc(${(t / top) * 100}% - 0px)` }}>{t}</span>
                    ))}
                </div>
                <div className="relative flex-1 min-w-0">
                    {/* Líneas guía */}
                    <div className="absolute inset-x-0 top-0 h-52 pointer-events-none">
                        {ticks.map((t) => (
                            <div key={t} className={`absolute inset-x-0 border-t ${t === 0 ? 'border-white/25' : 'border-white/[0.07]'}`} style={{ bottom: `${(t / top) * 100}%` }} />
                        ))}
                    </div>
                    <div className="relative flex h-52 items-end" onMouseLeave={() => setHover(null)}>
                        {days.map((r, i) => (
                            <div key={r.date} onMouseEnter={() => setHover(i)}
                                className={`flex h-full flex-1 min-w-0 items-end justify-center gap-[2px] px-[1px] cursor-default ${hover === i ? 'bg-white/[0.06]' : ''}`}>
                                <div className="w-full max-w-[12px] rounded-t-[4px]" style={{ background: C_TRACK, height: `${(r.tracking / top) * 100}%`, minHeight: r.tracking ? 3 : 0 }} />
                                <div className="w-full max-w-[12px] rounded-t-[4px]" style={{ background: C_MEMO, height: `${(r.memorial / top) * 100}%`, minHeight: r.memorial ? 3 : 0 }} />
                            </div>
                        ))}
                    </div>
                    {/* Eje X: una fecha cada N días */}
                    <div className="flex mt-1.5 text-[10px] text-white/45 tabular-nums">
                        {days.map((r, i) => (
                            <div key={r.date} className="flex-1 min-w-0 text-center overflow-visible whitespace-nowrap">
                                {i % labelEvery === 0 ? fmt(r.date) : ''}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TenantTrackingDetailPage() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const sp = useSearchParams();
    const [dateFrom, setDateFrom] = useState(sp.get('date_from') || daysAgo(29));
    const [dateTo, setDateTo] = useState(sp.get('date_to') || isoDay(new Date()));
    const initialStage = sp.get('tracking_stage');
    const [stage, setStage] = useState<'in_progress' | 'delivered' | 'all'>(
        initialStage === 'delivered' || initialStage === 'all' ? initialStage : 'in_progress');
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const qs = new URLSearchParams({ ...(dateFrom ? { date_from: dateFrom } : {}), ...(dateTo ? { date_to: dateTo } : {}), tracking_stage: stage }).toString();

    const { data, isLoading, error } = useQuery<Detail>({
        queryKey: ['admin', 'tenant-tracking', tenantId, dateFrom, dateTo, stage],
        queryFn: () => apiRequest(`/api/internal/creator/catalog-funnel/tenant/${tenantId}?${qs}`),
    });
    const { data: rep } = useQuery<Report>({
        queryKey: ['admin', 'catalog-funnel', dateFrom, dateTo, String(tenantId), stage],
        queryFn: () => apiRequest(`/api/internal/creator/catalog-funnel?${qs}&tenant_id=${tenantId}`),
    });
    const memorialBase = getMemorialBaseUrl();

    const handleDownloadPdf = async () => {
        if (!data) return;
        try {
            setDownloadingPdf(true);
            let formFunnelData: any = null;
            try {
                const formParams = new URLSearchParams();
                if (dateFrom) formParams.set('date_from', dateFrom);
                if (dateTo) formParams.set('date_to', dateTo);
                formParams.set('tenant_id', String(tenantId));
                formFunnelData = await apiRequest(`/api/internal/creator/catalog-funnel/form?${formParams.toString()}`);
            } catch (e) {
                console.error('Error fetching form funnel for pdf:', e);
            }

            await downloadTenantCatalogPdf(data, rep || null, formFunnelData, {
                dateFrom,
                dateTo,
                trackingStage: stage,
                tenantName: data.tenant.name,
            });
        } catch (err) {
            console.error('Error generating tenant catalog PDF:', err);
        } finally {
            setDownloadingPdf(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-4">
                <Link href={`/dashboard/catalogos?${qs}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-white/50 hover:text-white">
                    <ArrowLeft size={14} /> KPIs del catálogo
                </Link>

                <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf || isLoading || !data}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    title="Descargar informe formal del crematorio en PDF"
                >
                    {downloadingPdf ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
                    <span>{downloadingPdf ? 'Generando PDF...' : 'Descargar PDF del crematorio'}</span>
                </button>
            </div>

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
                            <label className="text-[11px] text-white/50 flex flex-col gap-1" title="Gráfica: estado de la orden al abrir el seguimiento. Tabla: estado actual de la orden.">Estado de la orden
                                <select value={stage} onChange={(e) => setStage(e.target.value as typeof stage)} className={inputCls}>
                                    <option value="in_progress">En proceso</option>
                                    <option value="delivered">Entregadas</option>
                                    <option value="all">Todas</option>
                                </select>
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
                        <p className="text-[11px] text-white/40 mt-1 mb-3">
                            Cada vez que alguien abre el link de seguimiento o de un memorial de este crematorio (recargar también suma).
                            Seguimiento: {stage === 'in_progress' ? 'solo mientras la orden estaba en proceso' : stage === 'delivered' ? 'solo con la orden ya entregada' : 'todas las aperturas'}.
                        </p>
                        <DailyChart rows={data.views.daily} from={dateFrom} to={dateTo} />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className={`${cardCls} p-5`}>
                            <h2 className="text-white font-bold flex items-center gap-2"><Compass size={15} className="text-sky-400" /> Últimos 15 seguimientos abiertos</h2>
                            <p className="text-[11px] text-white/40 mt-1">
                                {stage === 'in_progress' ? 'Solo órdenes que siguen en proceso.' : stage === 'delivered' ? 'Solo órdenes ya entregadas.' : 'Todas las órdenes.'} La más reciente primero.
                            </p>
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
