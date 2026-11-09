"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
    Filter, Loader2, ArrowUpRight, Info, BookOpen,
    Globe2, Building2, PawPrint, X, Heart, Compass,
    Share2, FileText, ChevronRight, FileDown
} from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { downloadGlobalCatalogPdf } from '@/components/admin/catalog/buildCatalogReportPdf';

// --- GET /api/internal/creator/catalog-funnel (backend services/catalog_funnel.py) ---
interface Funnel {
    visitors: number; size_select: number; plan_request: number; whatsapp: number;
    form_open: number; form_submit: number; pending: number; order: number; delivered: number;
}
/** Todos los formularios web (con o sin catálogo: enlace directo, QR, personalizados) y sus OC */
interface AllForms { forms_all: number; orders_all: number; delivered_all: number }
interface TenantRow extends Funnel, AllForms {
    tenant_id: number; tenant_name: string; tenant_slug: string | null;
    links_total: number; links_period: number; views_total: number;
    has_memorials?: boolean;
    memorials_total?: number;
    memorials_period?: number;
    memorial_views?: number;
    memorial_views_total?: number;
    tracking_views?: number;
    tracking_views_total?: number;
    tracking_orders_viewed?: number;
}
interface SpeciesRow {
    species: string;
    catalog: number;
    forms_all: number;
    orders: number;
}
interface Report {
    totals: Funnel & AllForms;
    links_total: number;
    links_period: number;
    has_memorials?: boolean;
    memorials_total?: number;
    memorials_period?: number;
    memorial_views?: number;
    memorial_views_total?: number;
    tracking_views?: number;
    tracking_views_total?: number;
    tracking_orders_viewed?: number;
    by_tenant: TenantRow[];
    top_plans: { plan_id: number; plan_name: string; tenant_name: string | null; price: number | null; plan_request: number; whatsapp: number; total: number }[];
    top_sizes: { weight_tier: string; count: number; tenant_id: number; tenant_name: string }[];
    /** Órdenes en proceso + entregadas del periodo (= suma de top_sizes). */
    top_sizes_orders?: number;
    by_species?: SpeciesRow[];
    tenants: { id: number; name: string }[];
}

const cardCls = 'bg-white/5 border border-white/10 rounded-2xl';
const inputCls = 'bg-[#0f172a] border border-white/25 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white shadow-inner hover:border-white/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 [color-scheme:dark] transition-colors';
const selectCls = 'bg-[#0f172a] border border-white/25 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white shadow-inner hover:border-primary/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 [color-scheme:dark] transition-colors cursor-pointer';
const optionCls = 'bg-[#0f172a] text-white py-2 font-medium';

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
    const router = useRouter();
    const [dateFrom, setDateFrom] = useState(daysAgo(29));
    const [dateTo, setDateTo] = useState(isoDay(new Date()));
    const [tenantId, setTenantId] = useState('');
    // Aperturas de seguimiento: estado de la orden cuando la familia lo abrió
    const [trackingStage, setTrackingStage] = useState<'in_progress' | 'delivered' | 'all'>('in_progress');
    const [downloadingPdf, setDownloadingPdf] = useState(false);

    const params = new URLSearchParams();
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (tenantId) params.set('tenant_id', tenantId);
    params.set('tracking_stage', trackingStage);

    const { data, isLoading, error, isFetching } = useQuery<Report>({
        queryKey: ['admin', 'catalog-funnel', dateFrom, dateTo, tenantId, trackingStage],
        queryFn: () => apiRequest(`/api/internal/creator/catalog-funnel?${params.toString()}`),
        staleTime: 60_000,
        placeholderData: prev => prev,
    });

    const t = data?.totals;
    const selectedTenantName = tenantId
        ? data?.tenants.find(tn => String(tn.id) === String(tenantId))?.name || `Crematorio #${tenantId}`
        : null;
    const speciesList = data?.by_species ?? [];
    const totalSpeciesForms = speciesList.reduce((acc, s) => acc + s.forms_all, 0);
    const hasMemorials = data?.has_memorials !== false;

    const handleDownloadPdf = async () => {
        if (!data) return;
        try {
            setDownloadingPdf(true);
            await downloadGlobalCatalogPdf(data, {
                dateFrom,
                dateTo,
                trackingStage,
                tenantName: selectedTenantName,
            });
        } catch (err) {
            console.error('Error generating global catalog PDF:', err);
        } finally {
            setDownloadingPdf(false);
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <BookOpen className="text-primary" size={28} /> KPIs del catálogo de planes
                    </h1>
                    <p className="text-white/50 mt-2 text-sm max-w-3xl">
                        Cuántos catálogos comparten los crematorios y qué tan bien convierten: de la visita al formulario enviado, orden, seguimiento y memorial.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Indicador activo Global vs Crematorio */}
                    <div className="flex items-center gap-2 bg-[#0f172a] border border-white/15 rounded-2xl px-3.5 py-2">
                        {selectedTenantName ? (
                            <>
                                <Building2 size={16} className="text-primary shrink-0" />
                                <span className="text-xs font-bold text-white">{selectedTenantName}</span>
                                <button
                                    type="button"
                                    onClick={() => setTenantId('')}
                                    title="Volver a vista global"
                                    className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/10 text-[11px] font-bold text-white/80 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
                                >
                                    <X size={12} /> Ver Global
                                </button>
                            </>
                        ) : (
                            <>
                                <Globe2 size={16} className="text-emerald-400 shrink-0" />
                                <span className="text-xs font-bold text-emerald-300">Vista Global · Todos los crematorios</span>
                            </>
                        )}
                    </div>

                    {/* Botón Descargar PDF */}
                    <button
                        type="button"
                        onClick={handleDownloadPdf}
                        disabled={downloadingPdf || isLoading || !data}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        title="Descargar informe formal en PDF"
                    >
                        {downloadingPdf ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
                        <span>{downloadingPdf ? 'Generando PDF...' : 'Descargar PDF'}</span>
                    </button>
                </div>
            </div>

            {/* Filtros de alto contraste */}
            <div className="bg-[#0b1120] border border-white/15 rounded-2xl p-4 sm:p-5 flex flex-wrap items-end gap-3.5 shadow-lg">
                <div className="flex flex-col gap-1.5 min-w-[240px] flex-1 sm:flex-none sm:w-80">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                        <Filter size={13} className="text-primary" /> Alcance (Global o por Crematorio)
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setTenantId('')}
                            className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 ${
                                !tenantId
                                    ? 'bg-primary text-white border-primary shadow-sm'
                                    : 'bg-[#0f172a] text-white/70 border-white/20 hover:border-white/40 hover:text-white'
                            }`}
                        >
                            <Globe2 size={14} /> Global
                        </button>
                        <select
                            value={tenantId}
                            onChange={e => setTenantId(e.target.value)}
                            aria-label="Filtrar por crematorio"
                            className={`${selectCls} flex-1 min-w-0`}
                        >
                            <option value="" className={optionCls}>🌎 Todos los crematorios (Global)</option>
                            {data?.tenants.map(tn => (
                                <option key={tn.id} value={tn.id} className={optionCls}>
                                    🏢 {tn.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <label className="flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/70">
                    Desde
                    <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)} className={inputCls} />
                </label>
                <label className="flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/70">
                    Hasta
                    <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)} className={inputCls} />
                </label>
                <label className="flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/70"
                    title="Estado de la orden cuando la familia abrió su seguimiento">
                    Tracking de órdenes
                    <select value={trackingStage} onChange={e => setTrackingStage(e.target.value as typeof trackingStage)} className={selectCls}>
                        <option className={optionCls} value="in_progress">En proceso</option>
                        <option className={optionCls} value="delivered">Entregadas</option>
                        <option className={optionCls} value="all">Todas</option>
                    </select>
                </label>

                <div className="flex gap-1.5">
                    {[7, 30, 90].map(n => (
                        <button
                            key={n}
                            type="button"
                            onClick={() => { setDateFrom(daysAgo(n - 1)); setDateTo(isoDay(new Date())); }}
                            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#0f172a] border border-white/20 text-white/80 hover:bg-white/10 hover:border-white/40 hover:text-white transition-colors"
                        >
                            {n} días
                        </button>
                    ))}
                </div>
                {isFetching && <Loader2 size={18} className="animate-spin text-primary mb-2.5" />}
            </div>

            {isLoading && <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" size={28} /></div>}
            {!isLoading && (error || !data || !t) && (
                <div className="p-8 text-red-300">{(error as Error)?.message || 'No se pudieron cargar los KPIs'}</div>
            )}

            {data && t && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
                        <Kpi label="Catálogos creados" value={String(data.links_period)} hint={`${data.links_total} en total`} />
                        <Kpi label="Visitas catálogo" value={String(t.visitors)} hint="Personas distintas" />
                        <Kpi label="Formularios enviados" value={String(t.form_submit)} hint={`${pct(t.form_submit, t.visitors)} de las visitas`} />
                        <Kpi label="Órdenes" value={String(t.order)} hint={`${pct(t.order, t.form_submit)} de los formularios · ${t.pending} pend.`} />

                        {/* Contador de ingresos al link de Memoriales (si el tenant tiene el módulo) */}
                        <div className={`${cardCls} p-5 border-rose-500/20 bg-rose-500/[0.03]`}>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-300/80 flex items-center gap-1.5">
                                <Heart size={12} className="text-rose-400" /> Visitas a Memoriales
                            </p>
                            {hasMemorials ? (
                                <>
                                    <p className="text-2xl sm:text-3xl font-black mt-2 text-white">
                                        {data.memorial_views ?? 0}
                                    </p>
                                    <p className="text-[11px] text-white/45 mt-1">
                                        {data.memorials_period ?? 0} creados ({data.memorials_total ?? 0} total) · {data.memorial_views_total ?? 0} hist.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-base font-bold mt-2.5 text-white/50">No habilitado</p>
                                    <p className="text-[11px] text-white/35 mt-1">El plan del crematorio no incluye Memoriales</p>
                                </>
                            )}
                        </div>

                        {/* Contador de ingresos al link de Tracking */}
                        <div className={`${cardCls} p-5 border-sky-500/20 bg-sky-500/[0.03]`}>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-sky-300/80 flex items-center gap-1.5">
                                <Compass size={12} className="text-sky-400" /> Visitas a Tracking
                            </p>
                            <p className="text-2xl sm:text-3xl font-black mt-2 text-white">
                                {data.tracking_views ?? 0}
                            </p>
                            <p className="text-[11px] text-white/45 mt-1">
                                {data.tracking_orders_viewed ?? 0} seguimientos consultados · {data.tracking_views_total ?? 0} hist.
                            </p>
                        </div>
                    </div>

                    {/* Todos los formularios web: cuánto aporta el catálogo frente al formulario directo */}
                    <div className={`${cardCls} p-4 sm:p-5 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4`}>
                        <div className="col-span-2 lg:col-span-1">
                            <p className="text-white font-bold text-sm">Todos los formularios web</p>
                            <p className="text-[11px] text-white/40 mt-1">Catálogo + enlace directo, QR y formularios personalizados.</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Formularios</p>
                            <p className="text-xl font-black text-white mt-1">{t.forms_all}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">OC desde formulario</p>
                            <p className="text-xl font-black text-white mt-1">{t.orders_all}</p>
                            <p className="text-[11px] text-white/40">{t.delivered_all} entregadas</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">% desde catálogo</p>
                            <p className="text-xl font-black text-white mt-1">{pct(t.order, t.orders_all)}</p>
                            <p className="text-[11px] text-white/40">{t.order} de {t.orders_all} OC</p>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                            <div className={`${cardCls} p-5`}>
                                <h2 className="text-white font-bold">Embudo</h2>
                                <p className="text-[11px] text-white/40 mt-1 mb-4">
                                    El % compara cada paso con el anterior. Consultas por WhatsApp:{' '}
                                    <span className="text-white/70 font-bold">{t.whatsapp}</span> ({pct(t.whatsapp, t.visitors)} de las visitas).
                                </p>
                                <FunnelChart data={t} />
                            </div>

                            {/* Métrica por especie */}
                            <div className={`${cardCls} p-5`}>
                                <div className="flex items-center justify-between gap-2">
                                    <h2 className="text-white font-bold flex items-center gap-2">
                                        <PawPrint size={16} className="text-primary" /> Métrica por especie
                                    </h2>
                                    <span className="text-[11px] text-white/40">
                                        {totalSpeciesForms} {totalSpeciesForms === 1 ? 'registro' : 'registros'} en el periodo
                                    </span>
                                </div>
                                <p className="text-[11px] text-white/40 mt-1">
                                    Distribución de mascotas registradas desde catálogo y formularios web, y cuántas pasaron a orden.
                                </p>
                                {speciesList.length === 0 ? (
                                    <p className="py-4 text-sm text-white/40">Sin registros por especie en el periodo seleccionado.</p>
                                ) : (
                                    <ul className="mt-4 space-y-3">
                                        {speciesList.map(sp => {
                                            const maxForms = Math.max(1, speciesList[0].forms_all);
                                            const share = pct(sp.forms_all, totalSpeciesForms);
                                            return (
                                                <li key={sp.species} className="text-sm">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="font-bold text-white truncate">{sp.species}</span>
                                                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                                                                {share}
                                                            </span>
                                                        </div>
                                                        <div className="text-right text-xs whitespace-nowrap">
                                                            <span className="font-bold text-white">{sp.catalog}</span>{' '}
                                                            <span className="text-white/40">catálogo</span>
                                                            <span className="text-white/25 mx-1.5">·</span>
                                                            <span className="font-semibold text-white/80">{sp.forms_all}</span>{' '}
                                                            <span className="text-white/40">form.</span>
                                                            <span className="text-white/25 mx-1.5">·</span>
                                                            <span className="font-semibold text-emerald-300">{sp.orders}</span>{' '}
                                                            <span className="text-white/40">OC</span>
                                                        </div>
                                                    </div>
                                                    <div className="h-2 mt-1.5 rounded-full bg-white/5 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-primary/75 transition-all"
                                                            style={{ width: `${Math.max(4, (sp.forms_all / maxForms) * 100)}%` }}
                                                        />
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                    </div>

                    {/* Tabla rediseñada por crematorio con agrupaciones visuales */}
                    <div className="bg-[#0b1120] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                        <div className="p-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-white/[0.04] to-transparent">
                            <div>
                                <h2 className="text-white font-bold text-base flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                                        <Building2 size={18} />
                                    </div>
                                    Métricas por Crematorio
                                </h2>
                                <p className="text-xs text-white/50 mt-1">
                                    Desglose agrupado por Catálogo, Formularios Web y Enlaces Públicos (Tracking y Memoriales).
                                </p>
                            </div>
                            <span className="text-[11px] font-medium text-white/40 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                                Haz clic en una fila para filtrar las estadísticas de ese crematorio
                            </span>
                        </div>

                        {data.by_tenant.length === 0 ? (
                            <p className="p-8 text-center text-sm text-white/40">Sin catálogos ni formularios registrados en el periodo.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        {/* Fila 1: Encabezados de grupo con badges */}
                                        <tr className="border-b border-white/10 bg-white/[0.02]">
                                            <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-white/50 w-64">
                                                Crematorio
                                            </th>
                                            <th colSpan={4} className="px-3 py-2 border-l border-white/10 text-center">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
                                                    <Share2 size={11} /> Catálogo de Planes
                                                </span>
                                            </th>
                                            <th colSpan={3} className="px-3 py-2 border-l border-white/10 text-center">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                                    <FileText size={11} /> Formularios y Órdenes
                                                </span>
                                            </th>
                                            <th colSpan={2} className="px-3 py-2 border-l border-white/10 text-center">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                                    <Compass size={11} /> Enlaces Públicos
                                                </span>
                                            </th>
                                            <th className="px-3 py-2 w-12 border-l border-white/10" />
                                        </tr>
                                        {/* Fila 2: Columnas específicas */}
                                        <tr className="border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-white/40 bg-white/[0.01]">
                                            <th className="px-5 py-3">Nombre</th>
                                            <th className="px-3 py-3 text-right border-l border-white/10" title="Catálogos creados en el periodo y en total">Catálogos</th>
                                            <th className="px-3 py-3 text-right" title="Personas distintas que abrieron el catálogo">Visitas</th>
                                            <th className="px-3 py-3 text-right" title="Interacciones: solicitudes de plan y clics a WhatsApp">Solicitudes</th>
                                            <th className="px-3 py-3 text-right" title="Conversión: Formularios recibidos desde catálogo ÷ Visitas">Conv. Catálogo</th>

                                            <th className="px-3 py-3 text-right border-l border-white/10" title="Total de formularios web recibidos">Formularios</th>
                                            <th className="px-3 py-3 text-right" title="Órdenes de cremación generadas a partir de formularios">Órdenes (OC)</th>
                                            <th className="px-3 py-3 text-right" title="% de órdenes que llegaron a través del catálogo">% vía Catálogo</th>

                                            <th className="px-3 py-3 text-right border-l border-white/10" title="Aperturas del link de seguimiento y seguimientos consultados">Tracking</th>
                                            <th className="px-3 py-3 text-right" title="Aperturas del link de memoriales y memoriales creados">Memoriales</th>
                                            <th className="px-3 py-3 border-l border-white/10" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {data.by_tenant.map(r => {
                                            const isSelected = String(r.tenant_id) === String(tenantId);
                                            const catalogOrdersShare = pct(r.order, r.orders_all);
                                            return (
                                                <tr
                                                    key={r.tenant_id}
                                                    onClick={() => router.push(`/dashboard/catalogos/${r.tenant_id}?${new URLSearchParams({ ...(dateFrom ? { date_from: dateFrom } : {}), ...(dateTo ? { date_to: dateTo } : {}), tracking_stage: trackingStage }).toString()}`)}
                                                    title="Ver el detalle de este crematorio"
                                                    className={`cursor-pointer transition-all ${
                                                        isSelected
                                                            ? 'bg-primary/20 hover:bg-primary/25'
                                                            : 'hover:bg-white/[0.03]'
                                                    }`}
                                                >
                                                    {/* Nombre del Crematorio */}
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-white text-sm">
                                                                {r.tenant_name}
                                                            </span>
                                                            {isSelected && (
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white shadow-sm">
                                                                    Activo
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Grupo 1: Catálogo de Planes */}
                                                    <td className="px-3 py-3.5 text-right border-l border-white/10 whitespace-nowrap">
                                                        <span className="font-bold text-white">{r.links_period}</span>
                                                        <span className="text-white/40 text-xs"> / {r.links_total}</span>
                                                    </td>
                                                    <td className="px-3 py-3.5 text-right whitespace-nowrap font-medium text-white">
                                                        {r.visitors}
                                                    </td>
                                                    <td className="px-3 py-3.5 text-right whitespace-nowrap">
                                                        <span className="font-semibold text-white">{r.plan_request}</span>
                                                        {r.whatsapp > 0 && (
                                                            <span className="text-[11px] text-emerald-400 block font-normal">
                                                                +{r.whatsapp} WA
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3.5 text-right whitespace-nowrap">
                                                        <span className="inline-block font-extrabold text-xs px-2 py-0.5 rounded bg-white/5 text-primary border border-primary/20">
                                                            {pct(r.form_submit, r.visitors)}
                                                        </span>
                                                    </td>

                                                    {/* Grupo 2: Formularios y Órdenes */}
                                                    <td className="px-3 py-3.5 text-right border-l border-white/10 whitespace-nowrap">
                                                        <span className="font-bold text-white">{r.forms_all}</span>
                                                        {r.pending > 0 && (
                                                            <span className="text-[10px] text-amber-300 block">
                                                                {r.pending} pend.
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3.5 text-right whitespace-nowrap">
                                                        <span className="font-bold text-emerald-300">{r.orders_all}</span>
                                                        {r.delivered_all > 0 && (
                                                            <span className="text-[10px] text-white/40 block">
                                                                {r.delivered_all} entregadas
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3.5 text-right whitespace-nowrap">
                                                        <span className="text-xs font-semibold text-white/80">
                                                            {catalogOrdersShare}
                                                        </span>
                                                        <span className="text-[10px] text-white/40 block">
                                                            ({r.order} de {r.orders_all})
                                                        </span>
                                                    </td>

                                                    {/* Grupo 3: Enlaces Públicos (Tracking y Memoriales) */}
                                                    <td className="px-3 py-3.5 text-right border-l border-white/10 whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Compass size={13} className="text-sky-400" />
                                                            <span className="font-bold text-sky-300">{r.tracking_views ?? 0}</span>
                                                        </div>
                                                        <span className="text-[10px] text-white/40 block">
                                                            {r.tracking_orders_viewed ?? 0} consultas
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3.5 text-right whitespace-nowrap">
                                                        {r.has_memorials !== false ? (
                                                            <>
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    <Heart size={13} className="text-rose-400" />
                                                                    <span className="font-bold text-rose-300">{r.memorial_views ?? 0}</span>
                                                                </div>
                                                                <span className="text-[10px] text-white/40 block">
                                                                    {r.memorials_period ?? 0} de {r.memorials_total ?? 0} mem.
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="text-[11px] text-white/30 italic">
                                                                Sin módulo
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Enlace al detalle del crematorio */}
                                                    <td className="px-3 py-3.5 text-center border-l border-white/10" onClick={e => e.stopPropagation()}>
                                                        {r.tenant_slug ? (
                                                            <Link
                                                                href={`/dashboard/tenants/${r.tenant_slug}`}
                                                                title="Ver perfil del crematorio"
                                                                className="inline-flex p-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/15 hover:text-white transition-colors"
                                                            >
                                                                <ArrowUpRight size={15} />
                                                            </Link>
                                                        ) : (
                                                            <ChevronRight size={15} className="text-white/20 mx-auto" />
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <p className="text-[11px] text-white/40 flex items-start gap-1.5">
                        <Info size={13} className="shrink-0 mt-0.5" />
                        Se mide desde que existe este reporte (1 nov 2026). Cada persona cuenta una vez por paso y enlace en el catálogo, y cada apertura de link de memorial o tracking suma al contador de su crematorio.
                    </p>
                </>
            )}
        </div>
    );
}
