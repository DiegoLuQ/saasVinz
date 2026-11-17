"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    Clock,
    Building2,
    ArrowLeft,
    RefreshCw,
    Download,
    X,
} from 'lucide-react';
import {
    useSystemAuditLogs,
    type SystemAuditLogsFilters,
    type SystemAuditLogEntry,
} from '@/hooks/useSystemAuditLogs';
import { useAdminTenants } from '@/hooks/useAdminBootstrap';

const PAGE_SIZE = 30;

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
    return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'medium' });
}

export default function SystemLogsPage() {
    const tenants = useAdminTenants();
    const searchParams = useSearchParams();

    const [page, setPage] = useState(0);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '');
    const [tenantFilter, setTenantFilter] = useState(() => searchParams.get('tenant_id') || '');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedLog, setSelectedLog] = useState<SystemAuditLogEntry | null>(null);

    useEffect(() => {
        const s = searchParams.get('status');
        if (s !== null) setStatusFilter(s);
    }, [searchParams]);

    const filters: SystemAuditLogsFilters = {
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: statusFilter || undefined,
        tenant_id: tenantFilter ? Number(tenantFilter) : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
    };

    const { data, isLoading, isFetching, error, refetch } = useSystemAuditLogs(filters);

    const logs = data?.logs || [];
    const total = data?.total || 0;
    const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

    const resetPage = () => setPage(0);
    const hasFilters = !!(search || statusFilter || tenantFilter || dateFrom || dateTo);

    const exportCsv = () => {
        if (logs.length === 0) return;
        const headers = ['ID', 'Fecha', 'Tenant', 'Usuario', 'Accion', 'Estado', 'Codigo', 'Recurso', 'IP', 'Error'];
        const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const rows = logs.map((l) =>
            [
                l.id,
                formatDate(l.created_at),
                l.tenant_name || '',
                l.user_name || 'sistema',
                l.action,
                l.status,
                l.status_code ?? '',
                `${l.resource_type || ''} ${l.resource_name || ''} ${l.resource_id ? `#${l.resource_id}` : ''}`.trim(),
                l.ip_address || '',
                l.error_message || '',
            ]
                .map(escape)
                .join(',')
        );
        const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vinzer-logs-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-4 sm:p-8 w-full max-w-[1850px] mx-auto space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/25">
                <Link href="/dashboard/mantencion" className="hover:text-primary transition-colors">
                    Mantención SaaS
                </Link>
                <span>/</span>
                <span className="text-white/50">Logs del Sistema</span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5">
                <div className="flex items-start gap-4">
                    <Link
                        href="/dashboard/mantencion"
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/70 hover:text-white transition-all"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Logs del Sistema</h1>
                        <p className="text-white/40 text-sm font-medium mt-1">
                            Auditoría agregada de todos los tenants. {total.toLocaleString()} eventos registrados.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white/80 transition-all"
                    >
                        <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                        Refrescar
                    </button>
                    <button
                        onClick={exportCsv}
                        disabled={logs.length === 0}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary/15 hover:bg-primary/25 border border-primary/25 disabled:opacity-40 rounded-xl text-xs font-bold text-primary transition-all"
                    >
                        <Download size={14} />
                        Exportar CSV
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[220px]">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 block mb-1.5">
                        Buscar
                    </label>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                resetPage();
                            }}
                            placeholder="acción, recurso, error..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 block mb-1.5">
                        Tenant
                    </label>
                    <select
                        value={tenantFilter}
                        onChange={(e) => {
                            setTenantFilter(e.target.value);
                            resetPage();
                        }}
                        className="bg-[#0a192f] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 min-w-[160px]"
                    >
                        <option value="">Todos</option>
                        {tenants.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 block mb-1.5">
                        Estado
                    </label>
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            resetPage();
                        }}
                        className="bg-[#0a192f] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                    >
                        <option value="">Todos</option>
                        <option value="success">Success</option>
                        <option value="error">Error</option>
                        <option value="warning">Warning</option>
                    </select>
                </div>

                <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 block mb-1.5">
                        Desde
                    </label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => {
                            setDateFrom(e.target.value);
                            resetPage();
                        }}
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                    />
                </div>

                <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 block mb-1.5">
                        Hasta
                    </label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => {
                            setDateTo(e.target.value);
                            resetPage();
                        }}
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                    />
                </div>

                {hasFilters && (
                    <button
                        onClick={() => {
                            setSearch('');
                            setStatusFilter('');
                            setTenantFilter('');
                            setDateFrom('');
                            setDateTo('');
                            resetPage();
                        }}
                        className="text-xs font-bold text-white/40 hover:text-white px-3 py-2"
                    >
                        Limpiar
                    </button>
                )}
            </div>

            {/* Tabla */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-x-auto">
                {error && (
                    <div className="p-8 text-center text-rose-400 text-sm">
                        Error al cargar logs: {(error as any).message || 'desconocido'}
                    </div>
                )}

                {isLoading ? (
                    <div className="p-8 text-center text-white/40 text-sm">Cargando logs del sistema...</div>
                ) : logs.length === 0 ? (
                    <div className="p-12 text-center">
                        <Filter className="mx-auto text-white/10 mb-3" size={40} />
                        <div className="text-white/40 text-sm font-medium">No hay eventos para los filtros seleccionados</div>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-white/[0.02] border-b border-white/5">
                            <tr className="text-[10px] uppercase tracking-widest font-bold text-white/40">
                                <th className="text-left px-5 py-3">Fecha</th>
                                <th className="text-left px-5 py-3">Tenant</th>
                                <th className="text-left px-5 py-3">Usuario</th>
                                <th className="text-left px-5 py-3">Acción</th>
                                <th className="text-left px-5 py-3">Recurso</th>
                                <th className="text-left px-5 py-3">Estado</th>
                                <th className="text-left px-5 py-3">IP</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {logs.map((log) => (
                                <tr
                                    key={log.id}
                                    onClick={() => setSelectedLog(log)}
                                    className="hover:bg-white/[0.04] transition-colors cursor-pointer"
                                >
                                    <td className="px-5 py-3 text-white/60 font-mono text-xs whitespace-nowrap">
                                        {formatDate(log.created_at)}
                                    </td>
                                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                                        {log.tenant_slug ? (
                                            <Link
                                                href={`/dashboard/tenants/${log.tenant_slug}/auditoria`}
                                                className="inline-flex items-center gap-1.5 text-white/80 hover:text-primary text-xs font-bold transition-colors"
                                            >
                                                <Building2 size={11} className="text-white/30" />
                                                {log.tenant_name || `#${log.tenant_id}`}
                                            </Link>
                                        ) : (
                                            <span className="text-white/20 italic text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 text-white/70 truncate max-w-[160px] text-xs">
                                        {log.user_name || <span className="text-white/30 italic">sistema</span>}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="text-white font-bold text-xs">{log.action}</span>
                                        {log.status_code && (
                                            <span className="text-white/30 text-[10px] ml-1.5">{log.status_code}</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 text-white/60 text-xs">
                                        {log.resource_type ? (
                                            <span>
                                                <span className="font-bold text-white/80">{log.resource_type}</span>
                                                {log.resource_name && <span className="text-white/40"> · {log.resource_name}</span>}
                                                {log.resource_id && (
                                                    <span className="text-white/30 font-mono"> #{log.resource_id}</span>
                                                )}
                                            </span>
                                        ) : (
                                            <span className="text-white/20">—</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3">
                                        <StatusBadge status={log.status} />
                                        {log.error_message && (
                                            <div className="text-[10px] text-rose-400/75 mt-1 max-w-xs truncate">
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
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-white/60 font-mono px-2">
                            {page + 1} / {maxPage + 1}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
                            disabled={page >= maxPage}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Detalle del Evento */}
            {selectedLog && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={() => setSelectedLog(null)}
                >
                    <div
                        className="bg-[#0a192f] border border-white/15 rounded-3xl w-full max-w-xl p-6 space-y-5 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div className="flex items-center gap-3">
                                <StatusBadge status={selectedLog.status} />
                                <h3 className="text-base font-black text-white">Evento #{selectedLog.id}</h3>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-white/5 space-y-0.5">
                                <div className="text-[10px] uppercase text-white/40 font-bold">Fecha</div>
                                <div className="text-white font-mono">{formatDate(selectedLog.created_at)}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 space-y-0.5">
                                <div className="text-[10px] uppercase text-white/40 font-bold">IP Origen</div>
                                <div className="text-white font-mono">{selectedLog.ip_address || '—'}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 space-y-0.5">
                                <div className="text-[10px] uppercase text-white/40 font-bold">Tenant</div>
                                <div className="text-white font-bold">{selectedLog.tenant_name || 'Global / Admin'}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 space-y-0.5">
                                <div className="text-[10px] uppercase text-white/40 font-bold">Usuario</div>
                                <div className="text-white font-bold">{selectedLog.user_name || 'Sistema'}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 space-y-0.5 col-span-2">
                                <div className="text-[10px] uppercase text-white/40 font-bold">Acción y Recurso</div>
                                <div className="text-white font-bold">
                                    {selectedLog.action}{' '}
                                    {selectedLog.status_code ? `(HTTP ${selectedLog.status_code})` : ''}
                                    {selectedLog.resource_type ? ` · ${selectedLog.resource_type}` : ''}
                                    {selectedLog.resource_name ? ` · ${selectedLog.resource_name}` : ''}
                                    {selectedLog.resource_id ? ` #${selectedLog.resource_id}` : ''}
                                </div>
                            </div>
                        </div>

                        {selectedLog.error_message && (
                            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-1.5">
                                <div className="text-[10px] uppercase font-black text-rose-400 tracking-wider">
                                    Mensaje de Error Completo
                                </div>
                                <pre className="text-xs text-rose-200 whitespace-pre-wrap break-words font-mono max-h-56 overflow-y-auto">
                                    {selectedLog.error_message}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
