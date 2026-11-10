"use client";

/**
 * Indicadores (KPIs) del crematorio: órdenes, ingresos, formularios y memoriales por
 * mes, y rankings por plan, servicio, producto, ciudad, especie, convenio y
 * veterinaria. Filtro por año y mes. Solo administración (admin / contabilidad).
 * Backend: GET /api/internal/kpis?year=&month= (app/services/kpis.py).
 */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart3, Building2, ClipboardList, Dog, Flame, Heart, Loader2, MapPin, Package, Receipt, Stethoscope, Wallet, Wrench, Layers,
    Search, ArrowDown, Scale,
} from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useCurrentUser } from '@/hooks/useSessionBootstrap';

interface RankRow { label: string; count: number; revenue: number; extra?: number }
interface MonthRow { month: number; orders: number; revenue: number; forms: number; memorials: number }
interface KpiData {
    year: number;
    month: number | null;
    status?: string;
    years: number[];
    totals: {
        orders: number; revenue: number; avg_ticket: number; forms: number; forms_processed: number;
        form_conversion: number | null; memorials: number; external_product_units: number; external_product_revenue: number;
    };
    by_plan: RankRow[]; by_service: RankRow[]; by_product: RankRow[]; by_city: RankRow[];
    by_species: RankRow[]; by_weight?: RankRow[]; by_agreement: RankRow[]; by_veterinary: RankRow[];
    monthly: MonthRow[];
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const OWNER = ['admin', 'contabilidad', 'creator'];
const TOP = 8;

const clp = (v: number) => `$${Math.round(v).toLocaleString('es-CL')}`;
const num = (v: number) => Math.round(v).toLocaleString('es-CL');

/** Serie única = un solo tono (azul) en claro y oscuro. */
const BAR = 'bg-[#2a78d6] dark:bg-[#3987e5]';

const selectCls = 'bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#2a78d6] [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-900 dark:[&>option]:text-white';
const card = 'rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-4 sm:p-5';

function Tile({ icon: Icon, label, value, hint }: { icon: React.ElementType; label: string; value: string; hint?: string }) {
    return (
        <div className={card}>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <Icon size={14} /> {label}
            </p>
            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white tabular-nums">{value}</p>
            {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
        </div>
    );
}

type Measure = 'orders' | 'revenue' | 'forms' | 'memorials';
const MEASURES: { key: Measure; label: string; fmt: (v: number) => string }[] = [
    { key: 'orders', label: 'Órdenes', fmt: num },
    { key: 'revenue', label: 'Ingresos', fmt: clp },
    { key: 'forms', label: 'Formularios', fmt: num },
    { key: 'memorials', label: 'Memoriales', fmt: num },
];

function MonthlyChart({ rows, selected, year }: { rows: MonthRow[]; selected: number | null; year: number }) {
    const [measure, setMeasure] = useState<Measure>('orders');
    const [hover, setHover] = useState<number | null>(null);
    const m = MEASURES.find(x => x.key === measure)!;
    const max = Math.max(1, ...rows.map(r => r[measure]));
    const total = rows.reduce((s, r) => s + r[measure], 0);

    return (
        <div className={card}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="font-black text-slate-900 dark:text-white">{m.label} por mes · {year}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Total del año: {m.fmt(total)}</p>
                </div>
                <div className="inline-flex rounded-xl border border-slate-200 dark:border-white/10 p-0.5 bg-slate-50 dark:bg-white/5" role="tablist">
                    {MEASURES.map(x => (
                        <button key={x.key} role="tab" aria-selected={measure === x.key} onClick={() => setMeasure(x.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${measure === x.key
                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                            {x.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-5 relative">
                {/* Grilla recesiva */}
                <div className="absolute inset-x-0 top-0 h-48 flex flex-col justify-between pointer-events-none">
                    {[0, 1, 2, 3].map(i => <div key={i} className="border-t border-slate-100 dark:border-white/5" />)}
                </div>
                <div className="relative h-48 flex items-end gap-[2px] border-b border-slate-300 dark:border-white/15">
                    {rows.map(r => {
                        const v = r[measure];
                        const dim = selected !== null && selected !== r.month;
                        return (
                            <div key={r.month} className="relative flex-1 h-full flex items-end justify-center"
                                onMouseEnter={() => setHover(r.month)} onMouseLeave={() => setHover(null)}
                                onFocus={() => setHover(r.month)} onBlur={() => setHover(null)} tabIndex={0}
                                aria-label={`${MONTHS[r.month - 1]}: ${m.fmt(v)}`}>
                                <div className={`w-full max-w-[34px] rounded-t-[4px] ${BAR} transition-opacity ${dim ? 'opacity-30' : ''} ${hover === r.month ? 'opacity-80' : ''}`}
                                    style={{ height: v > 0 ? `${Math.max(2, (v / max) * 100)}%` : 0 }} />
                                {hover === r.month && (
                                    <div className="absolute bottom-full mb-2 z-10 whitespace-nowrap rounded-lg bg-slate-900 dark:bg-white px-2.5 py-1.5 text-xs font-bold text-white dark:text-slate-900 shadow-lg">
                                        {MONTHS[r.month - 1]} · {m.fmt(v)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="flex gap-[2px] mt-1.5">
                    {rows.map(r => (
                        <span key={r.month} className={`flex-1 text-center text-[10px] font-bold ${selected === r.month ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                            {MONTHS[r.month - 1].slice(0, 3)}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

type RankMetric = 'count' | 'revenue';

function RankCard({ title, icon: Icon, rows, countLabel, extraLabel, revenueLabel = 'Ingresos', empty }: {
    title: string; icon: React.ElementType; rows: RankRow[]; countLabel: string;
    extraLabel?: string; revenueLabel?: string; empty: string;
}) {
    const [metric, setMetric] = useState<RankMetric>('count');
    const [hover, setHover] = useState<string | null>(null);

    const shown = useMemo(() => {
        const sorted = [...rows].sort((a, b) => b[metric] - a[metric] || a.label.localeCompare(b.label));
        if (sorted.length <= TOP) return sorted;
        const rest = sorted.slice(TOP - 1);
        return [...sorted.slice(0, TOP - 1), {
            label: `Otros (${rest.length})`,
            count: rest.reduce((s, r) => s + r.count, 0),
            revenue: rest.reduce((s, r) => s + r.revenue, 0),
            extra: rest.reduce((s, r) => s + (r.extra || 0), 0),
        }];
    }, [rows, metric]);
    const max = Math.max(1, ...shown.map(r => r[metric]));
    const fmt = metric === 'count' ? num : clp;

    return (
        <div className={card}>
            <div className="flex items-center justify-between gap-2">
                <p className="font-black text-slate-900 dark:text-white flex items-center gap-2"><Icon size={16} className="text-slate-400" /> {title}</p>
                {rows.length > 0 && (
                    <div className="inline-flex rounded-lg border border-slate-200 dark:border-white/10 p-0.5 bg-slate-50 dark:bg-white/5">
                        {([['count', countLabel], ['revenue', revenueLabel]] as const).map(([k, l]) => (
                            <button key={k} onClick={() => setMetric(k)} aria-pressed={metric === k}
                                className={`px-2 py-1 rounded-md text-[11px] font-bold ${metric === k
                                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400'}`}>
                                {l}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {rows.length === 0 ? (
                <p className="mt-6 mb-4 text-sm text-center text-slate-500 dark:text-slate-400">{empty}</p>
            ) : (
                <ul className="mt-4 space-y-2.5">
                    {shown.map(r => (
                        <li key={r.label} className="relative" onMouseEnter={() => setHover(r.label)} onMouseLeave={() => setHover(null)}>
                            <div className="flex items-baseline justify-between gap-3 text-sm">
                                <span className="truncate font-semibold text-slate-700 dark:text-slate-200" title={r.label}>{r.label}</span>
                                <span className="shrink-0 font-black tabular-nums text-slate-900 dark:text-white">{fmt(r[metric])}</span>
                            </div>
                            <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-white/5">
                                <div className={`h-2 rounded-full ${BAR} ${hover === r.label ? 'opacity-80' : ''}`}
                                    style={{ width: r[metric] > 0 ? `${Math.max(2, (r[metric] / max) * 100)}%` : 0 }} />
                            </div>
                            {hover === r.label && (
                                <div className="absolute right-0 top-full mt-1 z-10 rounded-lg bg-slate-900 dark:bg-white px-2.5 py-1.5 text-xs font-semibold text-white dark:text-slate-900 shadow-lg whitespace-nowrap">
                                    {countLabel}: {num(r.count)} · {revenueLabel}: {clp(r.revenue)}
                                    {extraLabel && r.extra !== undefined && <> · {extraLabel}: {clp(r.extra)}</>}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

const PAGE = 10;

/** Lista completa (productos / servicios): búsqueda, orden por cantidad o ingresos y «Ver más». */
function RankTable({ title, icon: Icon, rows, countLabel, empty }: {
    title: string; icon: React.ElementType; rows: RankRow[]; countLabel: string; empty: string;
}) {
    const [q, setQ] = useState('');
    const [metric, setMetric] = useState<RankMetric>('count');
    const [shown, setShown] = useState(PAGE);
    const totalCount = rows.reduce((s, r) => s + r.count, 0);
    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        return [...rows]
            .filter(r => !term || r.label.toLowerCase().includes(term))
            .sort((a, b) => b[metric] - a[metric] || a.label.localeCompare(b.label));
    }, [rows, q, metric]);
    const max = Math.max(1, ...rows.map(r => r[metric]));
    const fmt = metric === 'count' ? num : clp;
    const head = (k: RankMetric, label: string) => (
        <button type="button" onClick={() => setMetric(k)} aria-pressed={metric === k}
            className={`inline-flex items-center gap-1 ${metric === k ? 'text-slate-900 dark:text-white' : 'hover:text-slate-700 dark:hover:text-slate-200'}`}>
            {label} {metric === k && <ArrowDown size={11} />}
        </button>
    );

    return (
        <div className={card}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="font-black text-slate-900 dark:text-white flex items-center gap-2"><Icon size={16} className="text-slate-400" /> {title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {rows.length} en el periodo · {num(totalCount)} {countLabel.toLowerCase()} · {clp(totalRevenue)}
                    </p>
                </div>
                {rows.length > PAGE && (
                    <label className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={q} onChange={e => { setQ(e.target.value); setShown(PAGE); }} placeholder="Buscar…" aria-label={`Buscar en ${title}`}
                            className="w-48 pl-8 pr-3 py-2 rounded-xl border-2 border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#2a78d6]" />
                    </label>
                )}
            </div>
            {rows.length === 0 ? (
                <p className="mt-6 mb-4 text-sm text-center text-slate-500 dark:text-slate-400">{empty}</p>
            ) : (
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                                <th className="py-2 pr-2 w-8">#</th>
                                <th className="py-2 pr-3">Nombre</th>
                                <th className="py-2 pr-3 text-right whitespace-nowrap">{head('count', countLabel)}</th>
                                <th className="py-2 pr-3 text-right whitespace-nowrap">{head('revenue', 'Ingresos')}</th>
                                <th className="py-2 w-[28%] min-w-[90px] hidden sm:table-cell"><span className="sr-only">Barra</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.slice(0, shown).map((r, i) => (
                                <tr key={r.label} className="border-b border-slate-100 dark:border-white/5 last:border-0">
                                    <td className="py-2 pr-2 text-xs text-slate-400 tabular-nums">{i + 1}</td>
                                    <td className="py-2 pr-3 font-semibold text-slate-700 dark:text-slate-200 max-w-[260px] truncate" title={r.label}>{r.label}</td>
                                    <td className="py-2 pr-3 text-right font-bold tabular-nums text-slate-900 dark:text-white">{num(r.count)}</td>
                                    <td className="py-2 pr-3 text-right font-bold tabular-nums text-slate-900 dark:text-white">{clp(r.revenue)}</td>
                                    <td className="py-2 hidden sm:table-cell">
                                        <div className="h-2 rounded-full bg-slate-100 dark:bg-white/5" title={fmt(r[metric])}>
                                            <div className={`h-2 rounded-full ${BAR}`} style={{ width: r[metric] > 0 ? `${Math.max(2, (r[metric] / max) * 100)}%` : 0 }} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && <p className="py-4 text-sm text-center text-slate-500 dark:text-slate-400">Sin resultados para «{q}»</p>}
                    {filtered.length > shown && (
                        <button type="button" onClick={() => setShown(s => s + PAGE * 2)}
                            className="mt-3 w-full py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10">
                            Ver más ({filtered.length - shown} restantes)
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

type Section = 'resumen' | 'catalogo';
type OrderStatusFilter = 'entregados' | 'pendientes' | 'en_proceso' | 'todos';

const STATUS_OPTIONS: { key: OrderStatusFilter; label: string }[] = [
    { key: 'entregados', label: 'Entregados' },
    { key: 'pendientes', label: 'Pendientes' },
    { key: 'en_proceso', label: 'En proceso' },
    { key: 'todos', label: 'Todos' },
];

const STATUS_SUBTITLES: Record<OrderStatusFilter, (period: string) => string> = {
    entregados: (p) => `Solo órdenes entregadas en ${p.toLowerCase()} (por fecha de entrega, hora del crematorio).`,
    pendientes: (p) => `Órdenes pendientes en ${p.toLowerCase()} (por fecha de ingreso, hora del crematorio).`,
    en_proceso: (p) => `Órdenes en proceso en ${p.toLowerCase()} (por fecha de ingreso, hora del crematorio).`,
    todos: (p) => `Todas las órdenes (pendientes, en proceso y entregadas) en ${p.toLowerCase()} (hora del crematorio).`,
};

export default function IndicadoresPage() {
    const currentUser = useCurrentUser();
    const isOwner = OWNER.includes(currentUser?.role ?? '');
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState<number | null>(now.getMonth() + 1);
    const [status, setStatus] = useState<OrderStatusFilter>('entregados');
    const [section, setSection] = useState<Section>('resumen');

    const { data, isLoading, error } = useQuery<KpiData>({
        queryKey: ['kpis', year, month, status],
        queryFn: () => apiRequest(`/api/internal/kpis?year=${year}${month ? `&month=${month}` : ''}&status=${status}`),
        enabled: isOwner,
        placeholderData: prev => prev,
    });

    if (currentUser && !isOwner) {
        return <p className="p-8 text-center text-slate-500">Los indicadores solo los ve la administración del crematorio.</p>;
    }

    const years = data?.years?.length ? data.years : [now.getFullYear()];
    const period = month ? `${MONTHS[month - 1]} ${year}` : `Año ${year}`;
    const t = data?.totals;

    return (
        <div className="max-w-7xl mx-auto space-y-5 pb-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2"><BarChart3 size={24} /> Indicadores</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {STATUS_SUBTITLES[status]?.(period) ?? STATUS_SUBTITLES.entregados(period)}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select aria-label="Estado" value={status} onChange={e => setStatus(e.target.value as OrderStatusFilter)} className={selectCls}>
                        {STATUS_OPTIONS.map(opt => (
                            <option key={opt.key} value={opt.key}>{opt.label}</option>
                        ))}
                    </select>
                    <select aria-label="Año" value={year} onChange={e => setYear(Number(e.target.value))} className={selectCls}>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select aria-label="Mes" value={month ?? ''} onChange={e => setMonth(e.target.value ? Number(e.target.value) : null)} className={selectCls}>
                        <option value="">Todo el año</option>
                        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                    {isLoading && <Loader2 size={18} className="animate-spin text-slate-400" />}
                </div>
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 dark:border-white/10 p-1 bg-slate-50 dark:bg-white/5" role="tablist">
                {([['resumen', 'Resumen'], ['catalogo', 'Productos y servicios']] as const).map(([k, l]) => (
                    <button key={k} role="tab" aria-selected={section === k} onClick={() => setSection(k)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition ${section === k
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                        {l}
                    </button>
                ))}
            </div>

            {error && <p className="text-sm font-semibold text-rose-600">{(error as Error).message || 'No pudimos cargar los indicadores'}</p>}

            {data && t && section === 'catalogo' && (
                <div className="space-y-4">
                    <RankTable title="Productos" icon={Package} rows={data.by_product} countLabel="Unidades" empty="Sin productos en el periodo" />
                    <RankTable title="Servicios" icon={Wrench} rows={data.by_service} countLabel="Órdenes" empty="Sin servicios en el periodo" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Ingresos = precio de lista de cada línea, antes de descuentos.
                        {t.external_product_units > 0 && <> «Productos» incluye {num(t.external_product_units)} unidad(es) vendidas a clientes externos desde el catálogo ({clp(t.external_product_revenue)}).</>}
                    </p>
                </div>
            )}

            {data && t && section === 'resumen' && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        <Tile icon={Flame} label="Órdenes" value={num(t.orders)} hint={period} />
                        <Tile icon={Wallet} label="Ingresos" value={clp(t.revenue)} hint="Total de las órdenes" />
                        <Tile icon={Receipt} label="Ticket promedio" value={clp(t.avg_ticket)} />
                        <Tile icon={ClipboardList} label="Formularios" value={num(t.forms)}
                            hint={t.form_conversion !== null ? `${num(t.forms_processed)} con orden · ${t.form_conversion.toLocaleString('es-CL')} %` : 'Sin formularios'} />
                        <Tile icon={Heart} label="Memoriales" value={num(t.memorials)} hint="Creados en el periodo" />
                    </div>

                    <MonthlyChart rows={data.monthly} selected={data.month} year={data.year} />

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <RankCard title="Por plan" icon={Layers} rows={data.by_plan} countLabel="Órdenes" empty="Sin planes en el periodo" />
                        <RankCard title="Por peso / tamaño" icon={Scale} rows={data.by_weight || []} countLabel="Órdenes" empty="Sin órdenes con peso en el periodo" />
                        <RankCard title="Por especie" icon={Dog} rows={data.by_species} countLabel="Órdenes" empty="Sin órdenes en el periodo" />
                        <RankCard title="Por ciudad" icon={MapPin} rows={data.by_city} countLabel="Órdenes" empty="Sin órdenes en el periodo" />
                        <RankCard title="Por convenio" icon={Building2} rows={data.by_agreement} countLabel="Órdenes" extraLabel="Descuento" empty="Ninguna orden con convenio" />
                        <RankCard title="Por veterinaria" icon={Stethoscope} rows={data.by_veterinary} countLabel="Órdenes" extraLabel="Comisión" empty="Ninguna orden derivada por veterinarias" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Los ingresos por plan son precios de lista de cada línea, antes de descuentos. Productos y servicios están en su propia pestaña.
                    </p>
                </>
            )}
        </div>
    );
}
