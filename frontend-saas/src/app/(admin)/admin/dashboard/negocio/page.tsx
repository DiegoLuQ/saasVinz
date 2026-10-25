"use client";

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
    TrendingUp, Wallet, Building2, Gift, Gauge, AlertTriangle, Sparkles, Loader2, MessageCircle, Mail, ArrowUpRight, Info,
} from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';

// --- GET /api/internal/creator/business (backend services/business_metrics.py) ---
interface TenantRow {
    id: number; name: string; slug: string; plan: string; mrr: number;
    email?: string | null; phone?: string | null; contact_name?: string | null;
    last_activity?: string | null; orders_30d: number; signup_source?: string | null;
}
interface RiskRow extends TenantRow { days_inactive: number; never_used: boolean }
interface OpportunityRow extends TenantRow {
    reasons: { resource: string; label: string; usage: number; max: number }[];
    suggested_plan: { name: string; price: number } | null;
}
interface Business {
    generated_at: string;
    mrr: number; arr: number; arpa: number;
    tenants: { total: number; active: number; paying: number; free: number };
    by_plan: { plan: string; tenants: number; active: number; mrr: number; price: number }[];
    series: { month: string; signups: number; self_signups: number; upgrades: number; downgrades: number; mrr_change: number }[];
    history_since: string | null;
    at_risk: RiskRow[];
    opportunities: OpportunityRow[];
    inactive_days: number;
}

const clp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const monthLabel = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(2, 4)}`;
const cardCls = 'bg-white/5 border border-white/10 rounded-2xl';
const thCls = 'text-left text-[11px] font-bold uppercase tracking-wider text-white/40 px-4 py-3';
const tdCls = 'px-4 py-3 text-sm text-white/80 align-top';

/** wa.me con el mensaje ya escrito (celular chileno de 9 dígitos sin código → +56). */
function waLink(phone: string | null | undefined, text: string): string | null {
    let digits = (phone || '').replace(/\D/g, '');
    if (digits.length === 9 && digits.startsWith('9')) digits = `56${digits}`;
    return digits.length >= 10 ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
}

function ContactButtons({ row, message }: { row: TenantRow; message: string }) {
    const wa = waLink(row.phone, message);
    return (
        <div className="flex gap-1.5 justify-end">
            {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" title={`WhatsApp a ${row.phone}`}
                    className="p-2 rounded-lg bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25"><MessageCircle size={15} /></a>
            )}
            {row.email && (
                <a href={`mailto:${row.email}?subject=${encodeURIComponent('Vinzer · ' + row.name)}&body=${encodeURIComponent(message)}`}
                    title={`Correo a ${row.email}`} className="p-2 rounded-lg bg-sky-500/15 text-sky-300 hover:bg-sky-500/25"><Mail size={15} /></a>
            )}
            <Link href={`/dashboard/tenants/${row.slug}`} title="Ver crematorio"
                className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"><ArrowUpRight size={15} /></Link>
        </div>
    );
}

function Kpi({ icon: Icon, label, value, hint, tone }: { icon: React.ElementType; label: string; value: string; hint?: string; tone?: string }) {
    return (
        <div className={`${cardCls} p-5`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5"><Icon size={13} /> {label}</p>
            <p className={`text-2xl sm:text-3xl font-black mt-2 ${tone || 'text-white'}`}>{value}</p>
            {hint && <p className="text-[11px] text-white/40 mt-1">{hint}</p>}
        </div>
    );
}

const firstName = (n?: string | null) => (n || '').trim().split(' ')[0] || '';

export default function BusinessMetricsPage() {
    const { data, isLoading, error } = useQuery<Business>({
        queryKey: ['admin', 'business'],
        queryFn: () => apiRequest('/api/internal/creator/business'),
        staleTime: 60_000,
    });

    if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" size={28} /></div>;
    if (error || !data) return <div className="p-8 text-red-300">{(error as Error)?.message || 'No se pudieron cargar las métricas'}</div>;

    const maxBar = Math.max(1, ...data.series.map(m => Math.max(m.signups, m.upgrades + m.downgrades)));

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <TrendingUp className="text-primary" size={28} /> Métricas del negocio
                </h1>
                <p className="text-white/50 mt-2 text-sm max-w-3xl">
                    Ingreso recurrente, crematorios por plan y a quién conviene escribirle: los que dejaron de usar Vinzer y los que están por quedarse cortos con su plan.
                </p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                <Kpi icon={Wallet} label="Ingreso mensual (MRR)" value={clp(data.mrr)} hint="Lo contratado; anuales ÷ 12" tone="text-emerald-400" />
                <Kpi icon={TrendingUp} label="Ingreso anual (ARR)" value={clp(data.arr)} hint="MRR × 12" />
                <Kpi icon={Building2} label="Pagando" value={String(data.tenants.paying)} hint={`de ${data.tenants.active} activos`} />
                <Kpi icon={Gift} label="Gratis (FREE)" value={String(data.tenants.free)} hint="Candidatos a subir de plan" />
                <Kpi icon={Gauge} label="Ingreso por cliente" value={clp(data.arpa)} hint="MRR ÷ crematorios que pagan" />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
                {/* Por plan */}
                <div className={`${cardCls} overflow-hidden`}>
                    <h2 className="px-5 pt-5 text-white font-bold">Crematorios por plan</h2>
                    <table className="w-full mt-3">
                        <thead><tr className="border-b border-white/10"><th className={thCls}>Plan</th><th className={`${thCls} text-right`}>Activos</th><th className={`${thCls} text-right`}>MRR</th></tr></thead>
                        <tbody>
                            {data.by_plan.map(p => (
                                <tr key={p.plan} className="border-b border-white/5 last:border-0">
                                    <td className={tdCls}><span className="font-bold text-white">{p.plan}</span>{p.tenants !== p.active && <span className="text-[11px] text-white/40"> · {p.tenants - p.active} inactivos</span>}</td>
                                    <td className={`${tdCls} text-right`}>{p.active}</td>
                                    <td className={`${tdCls} text-right font-mono`}>{p.mrr ? clp(p.mrr) : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Evolución mensual */}
                <div className={`${cardCls} p-5`}>
                    <div className="flex items-start justify-between gap-3">
                        <h2 className="text-white font-bold">Últimos 12 meses</h2>
                        <div className="flex gap-3 text-[11px] text-white/50">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-sky-400" /> Altas</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> Subidas</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400" /> Bajas</span>
                        </div>
                    </div>
                    <div className="mt-4 flex items-end gap-1.5 sm:gap-2 h-40">
                        {data.series.map(m => (
                            <div key={m.month} className="flex-1 min-w-0 flex flex-col items-center gap-1 h-full justify-end"
                                title={`${monthLabel(m.month)}: ${m.signups} altas (${m.self_signups} solos), ${m.upgrades} subidas, ${m.downgrades} bajas, MRR ${m.mrr_change >= 0 ? '+' : ''}${clp(m.mrr_change)}`}>
                                <div className="w-full flex items-end gap-0.5 h-full">
                                    {[[m.signups, 'bg-sky-400'], [m.upgrades, 'bg-emerald-400'], [m.downgrades, 'bg-red-400']].map(([v, cls], i) => (
                                        <div key={i} className={`flex-1 rounded-t ${cls as string} ${v ? '' : 'opacity-0'}`} style={{ height: `${((v as number) / maxBar) * 100}%`, minHeight: v ? 4 : 0 }} />
                                    ))}
                                </div>
                                <span className="text-[9px] sm:text-[10px] text-white/40 whitespace-nowrap">{monthLabel(m.month)}</span>
                            </div>
                        ))}
                    </div>
                    <p className="mt-3 text-[11px] text-white/40 flex items-start gap-1.5">
                        <Info size={12} className="shrink-0 mt-0.5" />
                        Las altas salen de la fecha de creación de cada crematorio. Las subidas y bajas de plan se registran desde
                        {data.history_since ? ` el ${new Date(data.history_since).toLocaleDateString('es-CL')}` : ' ahora (aún no hay cambios registrados)'}.
                    </p>
                </div>
            </div>

            {/* En riesgo */}
            <div className={`${cardCls} overflow-hidden`}>
                <div className="px-5 pt-5">
                    <h2 className="text-white font-bold flex items-center gap-2"><AlertTriangle size={17} className="text-amber-400" /> En riesgo <span className="text-xs font-bold text-white/40">({data.at_risk.length})</span></h2>
                    <p className="text-xs text-white/50 mt-1">Activos que no usan Vinzer hace {data.inactive_days} días o más (ni entran al panel, ni crean órdenes, ni registran cambios). Primero los que pagan.</p>
                </div>
                {data.at_risk.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-white/40">Ninguno: todos los crematorios activos usaron Vinzer en los últimos {data.inactive_days} días.</p>
                ) : (
                    <div className="overflow-x-auto mt-3">
                        <table className="w-full min-w-[640px]">
                            <thead><tr className="border-b border-white/10"><th className={thCls}>Crematorio</th><th className={thCls}>Plan</th><th className={thCls}>Sin uso</th><th className={thCls}>Órdenes 30 días</th><th className={thCls} /></tr></thead>
                            <tbody>
                                {data.at_risk.map(r => (
                                    <tr key={r.id} className="border-b border-white/5 last:border-0">
                                        <td className={tdCls}>
                                            <p className="font-bold text-white">{r.name}</p>
                                            <p className="text-[11px] text-white/40">{r.contact_name || r.email || '—'}{r.signup_source === 'self' ? ' · se registró solo' : ''}</p>
                                        </td>
                                        <td className={tdCls}>{r.plan}{r.mrr > 0 && <span className="block text-[11px] text-emerald-300">{clp(r.mrr)}/mes</span>}</td>
                                        <td className={tdCls}>
                                            <span className={r.days_inactive >= 30 ? 'text-red-300 font-bold' : 'text-amber-300 font-bold'}>{r.days_inactive} días</span>
                                            <span className="block text-[11px] text-white/40">{r.never_used ? 'nunca lo usó' : `último: ${new Date(r.last_activity!).toLocaleDateString('es-CL')}`}</span>
                                        </td>
                                        <td className={tdCls}>{r.orders_30d}</td>
                                        <td className={tdCls}>
                                            <ContactButtons row={r} message={`Hola ${firstName(r.contact_name)}, te escribo de Vinzer. Vimos que hace un tiempo no usas el panel de ${r.name}: ¿te podemos ayudar con algo para sacarle más provecho?`.replace('Hola ,', 'Hola,')} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Oportunidades */}
            <div className={`${cardCls} overflow-hidden`}>
                <div className="px-5 pt-5">
                    <h2 className="text-white font-bold flex items-center gap-2"><Sparkles size={17} className="text-emerald-400" /> Oportunidades <span className="text-xs font-bold text-white/40">({data.opportunities.length})</span></h2>
                    <p className="text-xs text-white/50 mt-1">Usan el 80 % o más de sus órdenes del mes o de sus usuarios: buen momento para ofrecerles el plan siguiente. A ellos también les llega el aviso en su panel.</p>
                </div>
                {data.opportunities.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-white/40">Por ahora ningún crematorio está cerca de su límite.</p>
                ) : (
                    <div className="overflow-x-auto mt-3">
                        <table className="w-full min-w-[640px]">
                            <thead><tr className="border-b border-white/10"><th className={thCls}>Crematorio</th><th className={thCls}>Plan</th><th className={thCls}>Uso</th><th className={thCls}>Sugerido</th><th className={thCls} /></tr></thead>
                            <tbody>
                                {data.opportunities.map(o => (
                                    <tr key={o.id} className="border-b border-white/5 last:border-0">
                                        <td className={tdCls}>
                                            <p className="font-bold text-white">{o.name}</p>
                                            <p className="text-[11px] text-white/40">{o.contact_name || o.email || '—'}</p>
                                        </td>
                                        <td className={tdCls}>{o.plan}</td>
                                        <td className={tdCls}>
                                            {o.reasons.map(x => (
                                                <div key={x.resource} className="mb-1.5 last:mb-0">
                                                    <p className="text-[12px]">{x.label}: <strong className={x.usage >= x.max ? 'text-red-300' : 'text-amber-300'}>{x.usage} de {x.max}</strong></p>
                                                    <div className="h-1.5 w-32 rounded-full bg-white/10 overflow-hidden mt-1">
                                                        <div className={`h-full ${x.usage >= x.max ? 'bg-red-400' : 'bg-amber-400'}`} style={{ width: `${Math.min(100, (x.usage / x.max) * 100)}%` }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </td>
                                        <td className={tdCls}>{o.suggested_plan ? <><span className="font-bold text-emerald-300">{o.suggested_plan.name}</span><span className="block text-[11px] text-white/40">{clp(o.suggested_plan.price)}/mes</span></> : '—'}</td>
                                        <td className={tdCls}>
                                            <ContactButtons row={o} message={`Hola ${firstName(o.contact_name)}, te escribo de Vinzer. Vimos que ${o.name} ya usa ${o.reasons.map(x => `${x.usage} de ${x.max} ${x.label.toLowerCase()}`).join(' y ')} de su plan ${o.plan}.${o.suggested_plan ? ` Con el plan ${o.suggested_plan.name} tendrías más capacidad.` : ''} ¿Te cuento las opciones?`.replace('Hola ,', 'Hola,')} />
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
