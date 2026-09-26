"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/veterinary/api';
import { PawPrint, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface ReferralItem {
    id: number;
    oc_number?: number | null;
    created_at?: string | null;
    pet_name?: string | null;
    pet_species?: string | null;
    link_id: number;
    tenant_name: string;
    status: 'recibido' | 'coordinado' | 'en_proceso' | 'entregado' | 'cancelado' | string;
    status_label: string;
    etapa?: string | null;
    commission_amount?: number | null;
    commission_status?: string | null;
}

interface ReferralLinkSummary {
    link_id: number;
    tenant_name: string;
    derivaciones: number;
    entregadas: number;
    en_curso: number;
}

interface ReferralListResponse {
    items: ReferralItem[];
    total: number;
    summary: ReferralLinkSummary[];
}

const PAGE_SIZE = 20;

const STATUS_CLS: Record<string, string> = {
    recibido: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    coordinado: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
    en_proceso: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    entregado: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    cancelado: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

/** "Mis derivaciones": servicios que la veterinaria envió a cada crematorio. */
export default function VetReferralsTable() {
    const [data, setData] = useState<ReferralListResponse | null>(null);
    const [linkId, setLinkId] = useState<number | null>(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ skip: String((page - 1) * PAGE_SIZE), limit: String(PAGE_SIZE) });
            if (linkId !== null) params.append('link_id', String(linkId));
            setData(await apiRequest(`/api/veterinary/dashboard/referrals?${params.toString()}`));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'No se pudieron cargar las derivaciones');
        } finally {
            setLoading(false);
        }
    }, [page, linkId]);

    useEffect(() => {
        load();
    }, [load]);

    const summary = data?.summary || [];
    const items = data?.items || [];
    const total = data?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const totalDerivaciones = summary.reduce((s, x) => s + x.derivaciones, 0);

    const selectLink = (id: number | null) => {
        setLinkId(id);
        setPage(1);
    };

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center gap-2 py-16 text-indigo-200/50 text-sm">
                <Loader2 size={18} className="animate-spin" /> Cargando derivaciones...
            </div>
        );
    }

    if (error) {
        return <p className="text-center py-12 text-rose-400 text-sm">{error}</p>;
    }

    if (totalDerivaciones === 0) {
        return (
            <div className="text-center py-12 bg-white/[0.02] rounded-[2rem] border border-white/5 border-dashed m-4">
                <PawPrint className="mx-auto text-indigo-200/20 mb-3" size={48} />
                <h3 className="text-white font-medium">Aún no tienes derivaciones</h3>
                <p className="text-indigo-200/40 text-sm mt-1">
                    Cuando un paciente llegue al crematorio por tu enlace, verás aquí el estado de su servicio.
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-5">
            {/* Resumen por crematorio (también sirve de filtro) */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => selectLink(null)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        linkId === null ? 'bg-[var(--primary-color)] text-[var(--primary-foreground)] border-transparent' : 'border-white/10 text-indigo-200/70 hover:bg-white/5'
                    }`}
                >
                    Todos · {totalDerivaciones}
                </button>
                {summary.map((s) => (
                    <button
                        key={s.link_id}
                        onClick={() => selectLink(s.link_id)}
                        title={`${s.entregadas} entregadas · ${s.en_curso} en curso`}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                            linkId === s.link_id ? 'bg-[var(--primary-color)] text-[var(--primary-foreground)] border-transparent' : 'border-white/10 text-indigo-200/70 hover:bg-white/5'
                        }`}
                    >
                        {s.tenant_name} · {s.derivaciones}
                        <span className="ml-2 font-normal opacity-70">({s.entregadas} entregadas, {s.en_curso} en curso)</span>
                    </button>
                ))}
            </div>

            <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-60' : ''}`}>
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="text-[10px] uppercase tracking-widest text-indigo-200/40">
                            <th scope="col" className="text-left font-black py-3 pr-4">Mascota</th>
                            <th scope="col" className="text-left font-black py-3 pr-4">Crematorio</th>
                            <th scope="col" className="text-left font-black py-3 pr-4">Estado</th>
                            <th scope="col" className="text-right font-black py-3 pr-4">Comisión</th>
                            <th scope="col" className="text-right font-black py-3">Fecha</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {items.map((r) => (
                            <tr key={r.id}>
                                <td className="py-3 pr-4">
                                    <div className="font-bold text-white">{r.pet_name || 'Mascota'}</div>
                                    <div className="text-xs text-indigo-200/40 capitalize">
                                        {[r.pet_species, r.oc_number ? `OC ${r.oc_number}` : null].filter(Boolean).join(' · ')}
                                    </div>
                                </td>
                                <td className="py-3 pr-4 text-indigo-100/80">{r.tenant_name}</td>
                                <td className="py-3 pr-4">
                                    <span className={`px-2.5 py-0.5 text-xs rounded-full border ${STATUS_CLS[r.status] || 'bg-white/5 text-gray-300 border-white/10'}`}>
                                        {r.status_label}
                                    </span>
                                    {r.etapa && r.status !== 'entregado' && r.status !== 'cancelado' && (
                                        <div className="text-xs text-indigo-200/40 mt-1">Etapa: {r.etapa}</div>
                                    )}
                                </td>
                                <td className="py-3 pr-4 text-right whitespace-nowrap">
                                    {r.commission_amount != null ? (
                                        <>
                                            <div className="text-white font-medium tabular-nums">{clp.format(r.commission_amount)}</div>
                                            <div className="text-xs text-indigo-200/40 capitalize">{r.commission_status}</div>
                                        </>
                                    ) : (
                                        <span className="text-indigo-200/30">—</span>
                                    )}
                                </td>
                                <td className="py-3 text-right text-indigo-200/60 whitespace-nowrap">
                                    {r.created_at ? new Date(r.created_at).toLocaleDateString('es-CL') : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

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
