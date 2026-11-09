"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ClipboardList, Info, Loader2, MousePointerClick, LogOut } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';

// --- GET /api/internal/creator/catalog-funnel/form (backend services/form_funnel.py) ---
interface Step { key: string; label: string; sessions: number; pct: number; lost: number; median_seconds: number | null }
interface PhaseItem { field?: string; key?: string; label: string; sessions: number; pct?: number }
interface Phase {
    key: string; label: string; reached: number; pct: number; lost_here: number; median_seconds: number | null;
    actions: PhaseItem[]; fields: PhaseItem[]; errors: PhaseItem[]; last_fields: PhaseItem[];
    video_offered?: number; stuck_on_submit?: number;
}
interface FormFunnel {
    sessions: number;
    /** Recorrido fase por fase (Inicio → pasos → Enviado) */
    phases?: Phase[];
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

const PHASE_HINT: Record<string, string> = {
    inicio: 'Abrieron el formulario y el mensaje de bienvenida',
    familia: 'Datos de la familia',
    angel: 'Datos de la mascota',
    camino: 'Plan y servicios',
    recuerdos: 'Fotos y dedicatoria',
    resumen: 'Revisan y envían',
    enviado: 'Pantalla final, después de enviar',
};

function Chip({ item, tone = 'default' }: { item: PhaseItem; tone?: 'default' | 'error' }) {
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] ${tone === 'error'
            ? 'bg-amber-500/10 text-amber-200 border border-amber-500/20' : 'bg-white/5 text-white/75 border border-white/10'}`}>
            {item.label} <b className="text-white">{item.sessions}</b>{item.pct != null && <span className="text-white/40">{item.pct}%</span>}
        </span>
    );
}

/** Una fase del recorrido: cuántos llegan, qué hacen, qué campos llenan, errores y cuántos se quedaron ahí. */
function PhaseCard({ phase, index, total }: { phase: Phase; index: number; total: number }) {
    const done = phase.key === 'enviado';
    return (
        <li className={`${cardCls} p-4 sm:p-5`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-primary/20 text-primary'}`}>
                        {done ? <CheckCircle2 size={16} /> : index}
                    </span>
                    <div className="min-w-0">
                        <h3 className="text-white font-bold">{phase.label}</h3>
                        <p className="text-[11px] text-white/40">{PHASE_HINT[phase.key] || ''}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/40">Llegaron</p>
                        <p className="text-lg font-black text-white">{phase.reached}<span className="ml-1 text-xs font-normal text-white/40">{phase.pct}%</span></p>
                    </div>
                    {!done && (
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-white/40">Se quedaron aquí</p>
                            <p className={`text-lg font-black ${phase.lost_here ? 'text-rose-300' : 'text-white/40'}`}>{phase.lost_here}</p>
                        </div>
                    )}
                    {phase.median_seconds != null && (
                        <div className="hidden sm:block">
                            <p className="text-[10px] uppercase tracking-wider text-white/40">Tardan</p>
                            <p className="text-sm font-bold text-white/80">{duration(phase.median_seconds)}</p>
                        </div>
                    )}
                </div>
            </div>
            <div className="h-1.5 mt-3 rounded-full bg-white/5">
                <div className={`h-full rounded-full ${done ? 'bg-emerald-400/70' : 'bg-primary/60'}`} style={{ width: `${total ? (phase.reached / total) * 100 : 0}%` }} />
            </div>

            <div className="mt-3 space-y-2.5 text-sm">
                {phase.actions.length > 0 && (
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 flex items-center gap-1"><MousePointerClick size={11} /> Qué hicieron</p>
                        <div className="flex flex-wrap gap-1.5">{phase.actions.map((a) => <Chip key={a.key} item={a} />)}</div>
                        {phase.key === 'inicio' && !phase.video_offered && (
                            <p className="mt-1 text-[11px] text-white/35">El formulario no ofrece video de bienvenida.</p>
                        )}
                    </div>
                )}
                {phase.fields.length > 0 && (
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Campos que llenaron</p>
                        <div className="flex flex-wrap gap-1.5">{phase.fields.map((f) => <Chip key={f.field} item={f} />)}</div>
                    </div>
                )}
                {phase.errors.length > 0 && (
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 flex items-center gap-1"><AlertTriangle size={11} /> Errores al avanzar</p>
                        <div className="flex flex-wrap gap-1.5">{phase.errors.map((f) => <Chip key={f.field} item={f} tone="error" />)}</div>
                    </div>
                )}
                {phase.lost_here > 0 && (
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-3">
                        <p className="text-[11px] font-bold text-rose-200 flex items-center gap-1.5">
                            <LogOut size={12} /> {phase.lost_here} {phase.lost_here === 1 ? 'persona dejó' : 'personas dejaron'} el formulario aquí
                            {phase.key === 'inicio' && ' (solo lo abrieron)'}
                        </p>
                        {!!phase.stuck_on_submit && (
                            <p className="mt-1 text-[11px] text-rose-200/80">{phase.stuck_on_submit} pulsaron «Enviar» pero no se completó el envío.</p>
                        )}
                        {phase.last_fields.length > 0 && (
                            <ul className="mt-1.5 space-y-0.5">
                                {phase.last_fields.map((f) => (
                                    <li key={f.field || 'none'} className="flex justify-between gap-3 text-xs text-white/60">
                                        <span>→ Último campo: {f.label}</span><span>{f.sessions}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </li>
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
                        <ol className="space-y-3">
                            {(data.phases || []).map((ph, i) => <PhaseCard key={ph.key} phase={ph} index={i} total={data.sessions} />)}
                        </ol>
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
