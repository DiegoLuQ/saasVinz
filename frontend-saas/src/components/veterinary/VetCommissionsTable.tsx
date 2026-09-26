"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/veterinary/api';
import { DollarSign, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface VetCommissionRow {
    id: number;
    created_at?: string | null;
    paid_at?: string | null;
    amount: number;
    amount_porcentaje?: number | null;
    status: 'pendiente' | 'pagado' | 'cancelado' | string;
    link_id: number;
    tenant_name: string;
    pet_name?: string | null;
    oc_number?: number | null;
}

interface Totals {
    pendiente: number;
    pagado: number;
    count_pendiente: number;
    count_pagado: number;
}

interface LinkSummary extends Totals {
    link_id: number;
    tenant_name: string;
}

interface VetCommissionListResponse {
    totals: Totals;
    summary: LinkSummary[];
    rows: VetCommissionRow[];
    total: number;
}

type StatusFilter = 'all' | 'pendiente' | 'pagado' | 'cancelado';

const PAGE_SIZE = 20;
const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const formatDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const STATUS: Record<string, { label: string; cls: string }> = {
    pendiente: { label: 'Pendiente', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    pagado: { label: 'Pagada', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    cancelado: { label: 'Cancelada', cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

const FILTERS: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'pendiente', label: 'Pendientes' },
    { value: 'pagado', label: 'Pagadas' },
    { value: 'cancelado', label: 'Canceladas' },
];

/** Comisiones de la veterinaria: totales, resumen por crematorio y filtros. */
export default function VetCommissionsTable() {
    const [data, setData] = useState<VetCommissionListResponse | null>(null);
    const [status, setStatus] = useState<StatusFilter>('all');
    const [linkId, setLinkId] = useState<number | null>(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ skip: String((page - 1) * PAGE_SIZE), limit: String(PAGE_SIZE) });
            if (status !== 'all') params.append('status', status);
            if (linkId !== null) params.append('link_id', String(linkId));
            setData(await apiRequest(`/api/veterinary/dashboard/commissions?${params.toString()}`));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'No se pudieron cargar las comisiones');
        } finally {
            setLoading(false);
        }
    }, [page, status, linkId]);

    useEffect(() => {
        load();
    }, [load]);

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center gap-2 py-16 text-indigo-200/50 text-sm">
                <Loader2 size={18} className="animate-spin" /> Cargando comisiones...
            </div>
        );
    }
    if (error) {
        return <p className="text-center py-12 text-rose-400 text-sm">{error}</p>;
    }

    const totals = data?.totals;
    const summary = data?.summary || [];
    const rows = data?.rows || [];
    const total = data?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const hasAny = (totals?.count_pendiente || 0) + (totals?.count_pagado || 0) > 0 || total > 0;

    if (!hasAny && status === 'all' && linkId === null) {
        return (
            <div className="text-center py-12 bg-white/[0.02] rounded-[2rem] border border-white/5 border-dashed m-4">
                <DollarSign className="mx-auto text-indigo-200/20 mb-3" size={48} />
                <h3 className="text-white font-medium">Sin comisiones registradas</h3>
                <p className="text-indigo-200/40 text-sm mt-1">Cuando tus derivaciones generen servicios, sus comisiones aparecerán aquí.</p>
            </div>
        );
    }

    const pillCls = (active: boolean) =>
        `px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
            active ? 'bg-[var(--primary-color)] text-[var(--primary-foreground)] border-transparent' : 'border-white/10 text-indigo-200/70 hover:bg-white/5'
        }`;

    return (
        <div className="p-4 sm:p-6 space-y-5">
            {/* Totales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200/40">Pendiente de pago</p>
                    <p className="text-2xl font-black text-amber-400 tabular-nums">{clp.format(totals?.pendiente || 0)}</p>
                    <p className="text-xs text-indigo-200/40">{totals?.count_pendiente || 0} comisiones</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200/40">Pagado</p>
                    <p className="text-2xl font-black text-emerald-400 tabular-nums">{clp.format(totals?.pagado || 0)}</p>
                    <p className="text-xs text-indigo-200/40">{totals?.count_pagado || 0} comisiones</p>
                </div>
            </div>

            {/* Por crematorio (también filtra) */}
            {summary.length > 1 && (
                <div className="flex flex-wrap gap-2">
                    <button className={pillCls(linkId === null)} onClick={() => { setLinkId(null); setPage(1); }}>
                        Todos los crematorios
                    </button>
                    {summary.map((s) => (
                        <button
                            key={s.link_id}
                            className={pillCls(linkId === s.link_id)}
                            onClick={() => { setLinkId(s.link_id); setPage(1); }}
                            title={`Pendiente ${clp.format(s.pendiente)} · Pagado ${clp.format(s.pagado)}`}
                        >
                            {s.tenant_name}
                            <span className="ml-2 font-normal opacity-70">{clp.format(s.pendiente)} pend. · {clp.format(s.pagado)} pag.</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Estado */}
            <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                    <button key={f.value} className={pillCls(status === f.value)} onClick={() => { setStatus(f.value); setPage(1); }}>
                        {f.label}
                    </button>
                ))}
            </div>

            {rows.length === 0 ? (
                <p className="text-center py-8 text-indigo-200/40 text-sm">No hay comisiones con este filtro.</p>
            ) : (
                <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-60' : ''}`}>
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-[10px] uppercase tracking-widest text-indigo-200/40">
                                <th scope="col" className="text-left font-black py-3 pr-4">Mascota</th>
                                <th scope="col" className="text-left font-black py-3 pr-4">Crematorio</th>
                                <th scope="col" className="text-left font-black py-3 pr-4">Estado</th>
                                <th scope="col" className="text-right font-black py-3 pr-4">Monto</th>
                                <th scope="col" className="text-right font-black py-3">Fecha</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {rows.map((r) => {
                                const st = STATUS[r.status] || { label: r.status, cls: 'bg-white/5 text-gray-300 border-white/10' };
                                return (
                                    <tr key={r.id}>
                                        <td className="py-3 pr-4">
                                            <div className="font-bold text-white">{r.pet_name || 'Mascota'}</div>
                                            {r.oc_number && <div className="text-xs text-indigo-200/40">OC {r.oc_number}</div>}
                                        </td>
                                        <td className="py-3 pr-4 text-indigo-100/80">{r.tenant_name}</td>
                                        <td className="py-3 pr-4">
                                            <span className={`px-2.5 py-0.5 text-xs rounded-full border ${st.cls}`}>{st.label}</span>
                                        </td>
                                        <td className="py-3 pr-4 text-right text-white font-medium tabular-nums whitespace-nowrap">{clp.format(r.amount || 0)}</td>
                                        <td className="py-3 text-right text-indigo-200/60 whitespace-nowrap">
                                            {formatDate(r.created_at)}
                                            {r.status === 'pagado' && r.paid_at && (
                                                <div className="text-xs text-emerald-400/70">Pagada {formatDate(r.paid_at)}</div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {total > PAGE_SIZE && (
                <div className="flex items-center justify-end gap-2 text-xs text-indigo-200/60">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1 || loading}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-40"
                    >
                        <ChevronLeft size={14} /> Anterior
                    </button>
                    <span>{page} / {totalPages}</span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages || loading}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-40"
                    >
                        Siguiente <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}
