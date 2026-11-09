"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ClipboardList, Info, Loader2, MousePointerClick, LogOut } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';

// --- GET /api/internal/creator/catalog-funnel/form (backend services/form_funnel.py) ---
interface Step { key: string; label: string; sessions: number; pct: number; lost: number; median_seconds: number | null }
interface FormFunnel {
    sessions: number;
    submitted: number;
    conversion: number;
    steps: Step[];
    /** Fase donde se quedaron + último campo que tocaron en esa fase */
    abandon: { key: string; label: string; sessions: number; fields?: { field: string; label: string; sessions: number }[] }[];
    field_errors: { field: string; label: string; sessions: number }[];
    clicks: { kind: string; label: string; sessions: number; pct: number }[];
    by_tenant: { tenant_id: number; tenant_name: string; form_name: string; sessions: number; submitted: number; conversion: number; main_abandon: string | null }[];
    without_official: { tenant_id: number; tenant_name: string }[];
}

const cardCls = 'bg-white/5 border border-white/10 rounded-2xl';

function duration(s: number | null): string {
    if (s == null) return '';
    if (s < 60) return `${s} s`;
    const m = Math.floor(s / 60);
    return m < 60 ? `${m} min ${s % 60 ? `${s % 60} s` : ''}`.trim() : `${Math.floor(m / 60)} h ${m % 60} min`;
}

function Bars({ rows, total }: { rows: { label: string; value: number; hint?: string }[]; total: number }) {
    const max = Math.max(total, ...rows.map((r) => r.value), 1);
    return (
        <ul className="mt-3 space-y-2">
            {rows.map((r) => (
                <li key={r.label} className="text-sm" title={`${r.label}: ${r.value}${r.hint ? ` · ${r.hint}` : ''}`}>
                    <div className="flex justify-between gap-3 text-white/80">
                        <span className="min-w-0 truncate">{r.label}</span>
                        <span className="font-bold shrink-0">{r.value}{r.hint && <span className="ml-1.5 text-[11px] font-normal text-white/40">{r.hint}</span>}</span>
                    </div>
                    <div className="h-1.5 mt-1 rounded-full bg-white/5"><div className="h-full rounded-full bg-primary/60" style={{ width: `${(r.value / max) * 100}%` }} /></div>
                </li>
            ))}
        </ul>
    );
}

/** «Formulario oficial»: hasta dónde llegan las familias y qué tocan (solo el formulario oficial de cada crematorio). */
export default function OfficialFormFunnel({ dateFrom, dateTo, tenantId }: { dateFrom: string; dateTo: string; tenantId: string }) {
    const params = new URLSearchParams();
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (tenantId) params.set('tenant_id', tenantId);
    const { data, isLoading, error } = useQuery<FormFunnel>({
        queryKey: ['admin', 'form-funnel', dateFrom, dateTo, tenantId],
        queryFn: () => apiRequest(`/api/internal/creator/catalog-funnel/form?${params.toString()}`),
    });

    return (
        <section className="space-y-4">
            <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2"><ClipboardList size={18} className="text-primary" /> Formulario oficial: hasta dónde llegan</h2>
                <p className="text-xs text-white/50 mt-1">Solo el formulario elegido como oficial en Configuración → Enlaces oficiales de cada crematorio. Cada visita cuenta una vez por paso, sin datos personales.</p>
            </div>

            {isLoading ? (
                <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-white/40" /></div>
            ) : error || !data ? (
                <p className="text-sm text-rose-300">No se pudieron cargar las métricas del formulario.</p>
            ) : (
                <>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Visitas', value: data.sessions },
                            { label: 'Enviados', value: data.submitted },
                            { label: 'Conversión', value: `${data.conversion}%` },
                        ].map((k) => (
                            <div key={k.label} className={`${cardCls} p-4`}>
                                <p className="text-[10px] uppercase font-bold tracking-wider text-white/40">{k.label}</p>
                                <p className="text-2xl font-black text-white mt-1">{k.value}</p>
                            </div>
                        ))}
                    </div>

                    {data.sessions === 0 ? (
                        <p className={`${cardCls} p-5 text-sm text-white/50`}>Aún no hay visitas al formulario oficial en el periodo.</p>
                    ) : (
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className={`${cardCls} p-5`}>
                                <h3 className="text-white font-bold">Pasos</h3>
                                <p className="text-[11px] text-white/40 mt-1">Visitas que llegaron a cada paso · % de las visitas · tiempo típico desde el paso anterior.</p>
                                <Bars total={data.sessions} rows={[
                                    { label: 'Abrió el formulario', value: data.sessions, hint: '100%' },
                                    ...data.steps.map((s) => ({
                                        label: s.label, value: s.sessions,
                                        hint: [`${s.pct}%`, s.lost ? `−${s.lost}` : '', duration(s.median_seconds)].filter(Boolean).join(' · '),
                                    })),
                                ]} />
                            </div>

                            <div className={`${cardCls} p-5`}>
                                <h3 className="text-white font-bold flex items-center gap-2"><LogOut size={15} className="text-primary" /> Dónde se quedaron</h3>
                                <p className="text-[11px] text-white/40 mt-1">Fase donde dejaron el formulario (sin enviar) y el último campo que tocaron en ella.</p>
                                {data.abandon.length === 0 ? <p className="py-3 text-sm text-white/40">Todas las visitas enviaron el formulario.</p> : (
                                    <ul className="mt-3 space-y-3">
                                        {data.abandon.map((a) => {
                                            const lost = Math.max(data.sessions - data.submitted, 1);
                                            const pct = Math.round((a.sessions / data.sessions) * 1000) / 10;
                                            return (
                                                <li key={a.key} className="text-sm">
                                                    <div className="flex justify-between gap-3 text-white/85">
                                                        <span className="font-bold">{a.label}</span>
                                                        <span className="font-bold shrink-0">{a.sessions}<span className="ml-1.5 text-[11px] font-normal text-white/40">{pct}% de las visitas</span></span>
                                                    </div>
                                                    <div className="h-1.5 mt-1 rounded-full bg-white/5"><div className="h-full rounded-full bg-primary/60" style={{ width: `${(a.sessions / lost) * 100}%` }} /></div>
                                                    {!!a.fields?.length && (
                                                        <ul className="mt-1.5 pl-3 border-l border-white/10 space-y-0.5">
                                                            {a.fields.map((f) => (
                                                                <li key={f.field || 'none'} className="flex justify-between gap-3 text-xs text-white/55">
                                                                    <span className="truncate">→ {f.label}</span>
                                                                    <span className="shrink-0">{f.sessions}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>

                            <div className={`${cardCls} p-5`}>
                                <h3 className="text-white font-bold flex items-center gap-2"><MousePointerClick size={15} className="text-primary" /> Qué tocan</h3>
                                <Bars total={data.sessions} rows={data.clicks.map((c) => ({ label: c.label, value: c.sessions, hint: `${c.pct}%` }))} />
                            </div>

                            <div className={`${cardCls} p-5`}>
                                <h3 className="text-white font-bold flex items-center gap-2"><AlertTriangle size={15} className="text-primary" /> Campos con más errores</h3>
                                <p className="text-[11px] text-white/40 mt-1">Visitas que intentaron avanzar con ese campo vacío o inválido.</p>
                                {data.field_errors.length === 0 ? <p className="py-3 text-sm text-white/40">Sin errores en el periodo.</p>
                                    : <Bars total={data.sessions} rows={data.field_errors.map((e) => ({ label: e.label, value: e.sessions }))} />}
                            </div>
                        </div>
                    )}

                    {!tenantId && data.by_tenant.length > 0 && (
                        <div className={`${cardCls} overflow-x-auto`}>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
                                        <th className="px-4 py-3">Crematorio</th>
                                        <th className="px-4 py-3">Formulario</th>
                                        <th className="px-4 py-3 text-right">Visitas</th>
                                        <th className="px-4 py-3 text-right">Enviados</th>
                                        <th className="px-4 py-3 text-right">Conversión</th>
                                        <th className="px-4 py-3">Más se quedan en</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.by_tenant.map((r) => (
                                        <tr key={r.tenant_id} className="border-b border-white/5 text-white/80">
                                            <td className="px-4 py-2.5 font-bold text-white">{r.tenant_name}</td>
                                            <td className="px-4 py-2.5 text-white/60">{r.form_name}</td>
                                            <td className="px-4 py-2.5 text-right">{r.sessions}</td>
                                            <td className="px-4 py-2.5 text-right">{r.submitted}</td>
                                            <td className="px-4 py-2.5 text-right font-bold">{r.conversion}%</td>
                                            <td className="px-4 py-2.5 text-white/60">{r.main_abandon || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {data.without_official.length > 0 && (
                        <p className="text-[11px] text-white/40 flex items-start gap-1.5">
                            <Info size={13} className="shrink-0 mt-0.5" />
                            Sin formulario oficial (no se mide): {data.without_official.map((t) => t.tenant_name).join(', ')}.
                        </p>
                    )}
                </>
            )}
        </section>
    );
}
