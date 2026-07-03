"use client";

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Search, Filter, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTenantAuditLogs, type AuditLogsFilters } from '@/hooks/useTenantAuditLogs';
import { apiRequest } from '@/lib/admin/api';

const PAGE_SIZE = 25;

const STATUS_COLORS: Record<string, string> = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    error: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

function StatusBadge({ status }: { status: string }) {
    const cls = STATUS_COLORS[status] || 'bg-white/5 text-white/50 border-white/10';
    const Icon = status === 'success' ? CheckCircle2 : status === 'error' ? AlertCircle : Clock;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${cls}`}>
            <Icon size={10} />
            {status}
        </span>
    );
}

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'medium' });
}

export default function TenantAuditoriaPage() {
    const params = useParams();
    const tenantSlug = params.slug as string;
    const queryClient = useQueryClient();

    const [page, setPage] = useState(0);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [confirmClear, setConfirmClear] = useState(false);
    const [clearing, setClearing] = useState(false);

    const handleClearLogs = async () => {
        setClearing(true);
        try {
            await apiRequest(`/api/internal/creator/tenants/${tenantSlug}/audit-logs`, { method: 'DELETE' });
            await queryClient.invalidateQueries({ queryKey: ['tenant-audit-logs', tenantSlug] });
            setPage(0);
        } finally {
            setClearing(false);
            setConfirmClear(false);
        }
    };

    const filters: AuditLogsFilters = {
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: statusFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
    };

    const { data, isLoading, isFetching, error } = useTenantAuditLogs(tenantSlug, filters);

    const logs = data?.logs || [];
    const total = data?.total || 0;
    const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

    const resetPage = () => setPage(0);

    return (
        <div className="space-y-5">
            {/* Filtros */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[220px]">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 block mb-1.5">Buscar</label>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => { setSearch(e.target.value); resetPage(); }}
                            placeholder="acción, recurso, error..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 block mb-1.5">Estado</label>
                    <select
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); resetPage(); }}
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                    >
                        <option value="">Todos</option>
                        <option value="success">Success</option>
                        <option value="error">Error</option>
                        <option value="warning">Warning</option>
                    </select>
                </div>

                <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 block mb-1.5">Desde</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={e => { setDateFrom(e.target.value); resetPage(); }}
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                    />
                </div>

                <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 block mb-1.5">Hasta</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={e => { setDateTo(e.target.value); resetPage(); }}
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                    />
                </div>

                {(search || statusFilter || dateFrom || dateTo) && (
                    <button
                        onClick={() => { setSearch(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); resetPage(); }}
                        className="text-xs font-bold text-white/40 hover:text-white px-3 py-2"
                    >
                        Limpiar
                    </button>
                )}

                <div className="ml-auto">
                    <button
                        onClick={() => setConfirmClear(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 rounded-xl text-xs font-bold transition-colors"
                    >
                        <Trash2 size={13} />
                        Eliminar todos los logs
                    </button>
                </div>
            </div>

            {/* Modal de confirmación */}
            {confirmClear && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#0d1f35] border border-rose-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                                <Trash2 size={18} className="text-rose-400" />
                            </div>
                            <div>
                                <div className="font-bold text-white">Eliminar todos los logs</div>
                                <div className="text-xs text-white/40">Esta acción no se puede deshacer</div>
                            </div>
                        </div>
                        <p className="text-sm text-white/60 mb-6">
                            Se eliminarán permanentemente <span className="font-bold text-white">{total.toLocaleString()}</span> registros de auditoría del tenant <span className="font-bold text-white">{tenantSlug}</span>.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmClear(false)}
                                disabled={clearing}
                                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm font-bold transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleClearLogs}
                                disabled={clearing}
                                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {clearing ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Eliminando...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={13} />
                                        Eliminar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabla */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                {error && (
                    <div className="p-8 text-center text-rose-400 text-sm">
                        Error al cargar logs: {(error as any).message || 'desconocido'}
                    </div>
                )}

                {isLoading ? (
                    <div className="p-8 text-center text-white/40 text-sm">Cargando logs...</div>
                ) : logs.length === 0 ? (
                    <div className="p-12 text-center">
                        <Filter className="mx-auto text-white/10 mb-3" size={40} />
                        <div className="text-white/40 text-sm font-medium">No hay eventos para los filtros seleccionados</div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-white/[0.02] border-b border-white/5">
                            <tr className="text-[10px] uppercase tracking-widest font-bold text-white/40">
                                <th className="text-left px-5 py-3">Fecha</th>
                                <th className="text-left px-5 py-3">Usuario</th>
                                <th className="text-left px-5 py-3">Acción</th>
                                <th className="text-left px-5 py-3">Recurso</th>
                                <th className="text-left px-5 py-3">Estado</th>
                                <th className="text-left px-5 py-3">IP</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {logs.map(log => (
                                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-5 py-3 text-white/60 font-mono text-xs whitespace-nowrap">
                                        {formatDate(log.created_at)}
                                    </td>
                                    <td className="px-5 py-3 text-white/80 truncate max-w-[180px]">
                                        {log.user_name || <span className="text-white/30 italic">sistema</span>}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="text-white font-bold text-xs">{log.action}</span>
                                        {log.status_code && <span className="text-white/30 text-[10px] ml-1.5">{log.status_code}</span>}
                                    </td>
                                    <td className="px-5 py-3 text-white/60 text-xs">
                                        {log.resource_type ? (
                                            <span>
                                                <span className="font-bold text-white/80">{log.resource_type}</span>
                                                {log.resource_name && <span className="text-white/40"> · {log.resource_name}</span>}
                                                {log.resource_id && <span className="text-white/30 font-mono"> #{log.resource_id}</span>}
                                            </span>
                                        ) : <span className="text-white/20">—</span>}
                                    </td>
                                    <td className="px-5 py-3">
                                        <StatusBadge status={log.status} />
                                        {log.error_message && (
                                            <div className="text-[10px] text-rose-400/70 mt-1 max-w-xs truncate" title={log.error_message}>
                                                {log.error_message}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 text-white/40 font-mono text-xs">
                                        {log.ip_address || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                )}
            </div>

            {/* Paginación */}
            {total > PAGE_SIZE && (
                <div className="flex items-center justify-between text-xs">
                    <div className="text-white/40">
                        Mostrando <span className="text-white font-bold">{page * PAGE_SIZE + 1}</span>
                        {' – '}
                        <span className="text-white font-bold">{Math.min((page + 1) * PAGE_SIZE, total)}</span>
                        {' de '}
                        <span className="text-white font-bold">{total.toLocaleString()}</span>
                        {isFetching && <span className="ml-2 text-white/30 italic">actualizando...</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-white/60 font-mono px-2">
                            {page + 1} / {maxPage + 1}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(maxPage, p + 1))}
                            disabled={page >= maxPage}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
