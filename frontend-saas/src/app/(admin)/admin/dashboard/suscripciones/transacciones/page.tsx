"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    History,
    Search,
    Loader2,
    Building2,
    CreditCard,
    Download,
    Calendar,
    Copy,
    Filter,
    RefreshCw,
    TrendingUp,
    AlertCircle,
    ExternalLink,
    Zap
} from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { authHeader } from '@/lib/auth/token';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import type { Transaction, TransactionListResponse } from '@/types/billing';
import Pagination from '@/components/admin/Pagination';
import StatusBadge from '@/components/admin/StatusBadge';
import TransactionsSummaryCards, { type TransactionsSummary } from '@/components/admin/subscriptions/TransactionsSummaryCards';

type StatusFilter = 'all' | 'pending' | 'completed' | 'failed';
type DatePreset = 'custom' | 'today' | 'last7' | 'thisMonth' | 'last30';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;

function toIsoStart(yyyyMmDd: string): string {
    return `${yyyyMmDd}T00:00:00`;
}
function toIsoEnd(yyyyMmDd: string): string {
    return `${yyyyMmDd}T23:59:59`;
}
function ymd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export default function TransactionsHistoryPage() {
    const { showToast } = useToast();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

    // Date range (yyyy-mm-dd, local). Empty string = unbounded.
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [summary, setSummary] = useState<TransactionsSummary | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);

    const requestIdRef = useRef(0);
    const summaryReqIdRef = useRef(0);

    // Debounce search
    useEffect(() => {
        const handle = setTimeout(() => {
            setDebouncedSearch(searchInput.trim());
            setPage(1);
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(handle);
    }, [searchInput]);

    useEffect(() => {
        setPage(1);
    }, [statusFilter, dateFrom, dateTo]);

    const buildFilterParams = useCallback(() => {
        const params = new URLSearchParams();
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (debouncedSearch) params.append('search', debouncedSearch);
        if (dateFrom) params.append('date_from', toIsoStart(dateFrom));
        if (dateTo) params.append('date_to', toIsoEnd(dateTo));
        return params;
    }, [statusFilter, debouncedSearch, dateFrom, dateTo]);

    const fetchTransactions = useCallback(async () => {
        const params = buildFilterParams();
        params.append('page', String(page));
        params.append('page_size', String(PAGE_SIZE));

        const myId = ++requestIdRef.current;
        setLoading(true);
        setError(null);

        try {
            const data: TransactionListResponse = await apiRequest(`/api/internal/creator/billing/transactions?${params.toString()}`);
            if (myId !== requestIdRef.current) return;
            setTransactions(data?.transactions || []);
            setTotal(data?.total || 0);
            setTotalPages(data?.total_pages || 0);
        } catch (err: any) {
            if (myId !== requestIdRef.current) return;
            console.error('Error fetching transactions:', err);
            setError(err.message || 'Error al cargar las transacciones');
            showToast('Error al sincronizar transacciones', 'error');
        } finally {
            if (myId === requestIdRef.current) setLoading(false);
        }
    }, [page, buildFilterParams, showToast]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    // Summary lives on its own endpoint and ignores the status filter on
    // purpose — the cards always show the full status breakdown for the
    // active search + date range. Search/date changes refire it; status
    // does not.
    const fetchSummary = useCallback(async () => {
        const params = new URLSearchParams();
        if (debouncedSearch) params.append('search', debouncedSearch);
        if (dateFrom) params.append('date_from', toIsoStart(dateFrom));
        if (dateTo) params.append('date_to', toIsoEnd(dateTo));

        const myId = ++summaryReqIdRef.current;
        setSummaryLoading(true);
        try {
            const data: TransactionsSummary = await apiRequest(
                `/api/internal/creator/billing/transactions/summary?${params.toString()}`
            );
            if (myId !== summaryReqIdRef.current) return;
            setSummary(data);
        } catch (err) {
            if (myId !== summaryReqIdRef.current) return;
            console.error('Error fetching summary:', err);
            // Don't toast — the table-level error already covers connectivity issues.
        } finally {
            if (myId === summaryReqIdRef.current) setSummaryLoading(false);
        }
    }, [debouncedSearch, dateFrom, dateTo]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    const applyPreset = (preset: DatePreset) => {
        const now = new Date();
        if (preset === 'today') {
            const t = ymd(now); setDateFrom(t); setDateTo(t);
        } else if (preset === 'last7') {
            const start = new Date(now); start.setDate(start.getDate() - 6);
            setDateFrom(ymd(start)); setDateTo(ymd(now));
        } else if (preset === 'thisMonth') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            setDateFrom(ymd(start)); setDateTo(ymd(now));
        } else if (preset === 'last30') {
            const start = new Date(now); start.setDate(start.getDate() - 29);
            setDateFrom(ymd(start)); setDateTo(ymd(now));
        }
    };

    const clearDateRange = () => { setDateFrom(''); setDateTo(''); };

    const handleExport = async () => {
        setExporting(true);
        try {
            const params = buildFilterParams();
            const response = await fetch(
                `/api/internal/creator/billing/transactions/export?${params.toString()}`,
                { headers: authHeader() }
            );
            if (!response.ok) {
                const errBody = await response.text().catch(() => '');
                throw new Error(errBody || `HTTP ${response.status}`);
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const stamp = format(new Date(), 'yyyyMMdd_HHmmss');
            a.download = `transacciones_${stamp}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            showToast('Reporte financiero exportado', 'success');
        } catch (err: any) {
            showToast('Error al exportar: ' + (err.message || 'desconocido'), 'error');
        } finally {
            setExporting(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showToast('Referencia copiada al portapapeles', 'success');
    };

    const getPaymentMethodIcon = (method: string) => {
        switch (method) {
            case 'stripe': return <Zap size={16} className="text-indigo-400" />;
            case 'paypal': return <ExternalLink size={16} className="text-blue-400" />;
            case 'transfer': return <TrendingUp size={16} className="text-emerald-400" />;
            default: return <CreditCard size={16} className="text-white/40" />;
        }
    };

    const getPaymentMethodLabel = (method: string) => {
        switch (method) {
            case 'transfer': return 'Transferencia';
            case 'stripe': return 'Tarjeta (Stripe)';
            case 'paypal': return 'PayPal';
            case 'cash': return 'Efectivo';
            case 'polar': return 'Polar';
            case 'mercadopago': return 'MercadoPago';
            default: return method;
        }
    };

    const COL_COUNT = 6;

    return (
        <div className="p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
            {/* Header — compacto, jerarquía clara */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
                        <History size={20} />
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/60 block">Auditoría Global</span>
                        <h1 className="text-2xl font-black text-white tracking-tight leading-tight">Historial de Cobros</h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => fetchTransactions()}
                        disabled={loading}
                        className="p-2.5 bg-white/5 hover:bg-white/10 text-white/60 rounded-lg border border-white/10 disabled:opacity-40 transition-colors"
                        title="Refrescar datos"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={exporting}
                        className="bg-blue-500/10 hover:bg-blue-500/20 disabled:opacity-50 text-blue-400 border border-blue-500/30 px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-colors"
                    >
                        {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        {exporting ? 'Exportando…' : 'Exportar CSV'}
                    </button>
                </div>
            </header>

            {/* Summary cards — agregadas en backend, ignoran statusFilter a propósito */}
            <TransactionsSummaryCards
                summary={summary}
                loading={summaryLoading}
                scopeLabel={(dateFrom || dateTo) ? 'Rango filtrado' : 'Histórico completo'}
            />

            {statusFilter !== 'all' && summary && (
                <div className="px-2">
                    <span className="text-[10px] font-medium text-white/30 italic">
                        Las tarjetas muestran el desglose completo del periodo. La tabla está filtrada por <span className="text-white/70 font-bold">{statusFilter}</span>.
                    </span>
                </div>
            )}

            {/* Filtros — un solo panel cohesivo: search + estado + fechas + presets */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-3">
                <div className="flex flex-col lg:flex-row gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                        <input
                            type="text"
                            placeholder="Buscar por tenant, slug o referencia…"
                            className="w-full bg-black/30 border border-white/5 rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/40 transition-colors"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        className="bg-black/30 border border-white/5 rounded-lg py-2 px-3 text-sm text-white/80 focus:outline-none focus:border-blue-500/40 transition-colors lg:w-48 cursor-pointer"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="completed">Completados</option>
                        <option value="pending">Pendientes</option>
                        <option value="failed">Fallidos</option>
                    </select>

                    <div className="flex items-center bg-black/30 border border-white/5 rounded-lg overflow-hidden focus-within:border-blue-500/40 transition-colors">
                        <Calendar size={14} className="text-white/30 ml-3" />
                        <input
                            type="date"
                            value={dateFrom}
                            max={dateTo || undefined}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="bg-transparent py-2 px-2 text-xs text-white/70 focus:outline-none"
                            aria-label="Desde"
                        />
                        <span className="text-white/20 text-xs">→</span>
                        <input
                            type="date"
                            value={dateTo}
                            min={dateFrom || undefined}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="bg-transparent py-2 px-2 text-xs text-white/70 focus:outline-none"
                            aria-label="Hasta"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                    <Filter size={12} className="text-white/30" />
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mr-1">Presets</span>
                    {(['today', 'last7', 'thisMonth', 'last30'] as DatePreset[]).map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => applyPreset(p)}
                            className="px-2.5 py-1 rounded-md bg-white/5 border border-white/5 text-[10px] font-bold text-white/50 uppercase tracking-widest hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/20 transition-colors"
                        >
                            {p === 'today' ? 'Hoy' : p === 'last7' ? '7 días' : p === 'thisMonth' ? 'Mes actual' : '30 días'}
                        </button>
                    ))}
                    {(dateFrom || dateTo) && (
                        <button
                            type="button"
                            onClick={clearDateRange}
                            className="px-2.5 py-1 rounded-md bg-rose-500/5 border border-rose-500/10 text-[10px] font-bold text-rose-400/70 uppercase tracking-widest hover:bg-rose-500/10 hover:text-rose-400 transition-colors ml-auto"
                        >
                            Limpiar fechas
                        </button>
                    )}
                </div>
            </div>

            {/* Tabla compacta */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/[0.02] border-b border-white/5">
                            <tr>
                                <th className="px-5 py-3 text-[10px] font-bold text-white/40 uppercase tracking-widest">Tenant</th>
                                <th className="px-5 py-3 text-[10px] font-bold text-white/40 uppercase tracking-widest">Plan</th>
                                <th className="px-5 py-3 text-[10px] font-bold text-white/40 uppercase tracking-widest text-right">Monto</th>
                                <th className="px-5 py-3 text-[10px] font-bold text-white/40 uppercase tracking-widest">Método / Ref</th>
                                <th className="px-5 py-3 text-[10px] font-bold text-white/40 uppercase tracking-widest">Vigente hasta</th>
                                <th className="px-5 py-3 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={COL_COUNT} className="px-5 py-16 text-center">
                                        <Loader2 className="animate-spin mx-auto text-blue-400/60 mb-3" size={24} />
                                        <p className="text-white/30 font-bold uppercase tracking-widest text-[10px]">Sincronizando…</p>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={COL_COUNT} className="px-5 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3 max-w-sm mx-auto">
                                            <AlertCircle size={32} className="text-rose-400/60" />
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold text-white/80">Error al cargar</p>
                                                <p className="text-xs text-white/40">{error}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={fetchTransactions}
                                                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-white font-bold border border-white/10 flex items-center gap-2 transition-colors"
                                            >
                                                <RefreshCw size={12} /> Reintentar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={COL_COUNT} className="px-5 py-16 text-center">
                                        <div className="flex flex-col items-center gap-2 text-white/30">
                                            <Search size={32} strokeWidth={1.5} className="opacity-50" />
                                            <p className="text-xs font-bold uppercase tracking-widest">Sin movimientos</p>
                                            <p className="text-[11px] text-white/30">No hay transacciones que coincidan con los filtros.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((tx) => (
                                    <tr
                                        key={tx.id}
                                        className="hover:bg-white/[0.02] transition-colors"
                                    >
                                        {/* Tenant */}
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 shrink-0">
                                                    <Building2 size={14} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-white truncate text-sm leading-tight">{tx.tenant_name}</div>
                                                    <div className="flex items-center gap-1 text-[10px] text-white/40 mt-0.5">
                                                        <span className="font-mono">/{tx.tenant_slug}</span>
                                                        <span className="text-white/15">·</span>
                                                        <span>{format(new Date(tx.created_at), "d MMM yyyy · HH:mm", { locale: es })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Plan */}
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-white/80">
                                                <Zap size={11} className="text-blue-400/70" />
                                                {tx.target_plan_name || <span className="italic text-white/40">Renovación</span>}
                                            </div>
                                        </td>

                                        {/* Monto */}
                                        <td className="px-5 py-3 text-right">
                                            <span className="font-bold text-white tabular-nums">
                                                <span className="text-white/30 text-[10px] mr-0.5">$</span>
                                                {tx.amount.toLocaleString('es-CL')}
                                            </span>
                                        </td>

                                        {/* Método / Ref */}
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-1.5 text-xs text-white/60">
                                                {getPaymentMethodIcon(tx.payment_method)}
                                                <span>{getPaymentMethodLabel(tx.payment_method)}</span>
                                            </div>
                                            {tx.payment_reference && (
                                                <button
                                                    type="button"
                                                    onClick={() => copyToClipboard(tx.payment_reference!)}
                                                    className="group/ref mt-1 flex items-center gap-1 text-[10px] text-white/40 hover:text-white font-mono transition-colors"
                                                    title="Copiar referencia"
                                                >
                                                    <span className="truncate max-w-[120px]">{tx.payment_reference}</span>
                                                    <Copy size={10} className="opacity-0 group-hover/ref:opacity-100 transition-opacity" />
                                                </button>
                                            )}
                                        </td>

                                        {/* Vigente hasta */}
                                        <td className="px-5 py-3">
                                            {tx.current_billing_end_date ? (
                                                <div className="flex items-center gap-1.5 text-xs">
                                                    <Calendar size={11} className="text-white/30" />
                                                    <span className="text-white/80 font-medium">
                                                        {format(new Date(tx.current_billing_end_date), "d MMM yyyy", { locale: es })}
                                                    </span>
                                                    {tx.effective_billing_cycle && (
                                                        <span className="text-[9px] uppercase tracking-widest text-white/30 font-bold">
                                                            · {tx.effective_billing_cycle}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-white/30 italic">—</span>
                                            )}
                                        </td>

                                        {/* Estado */}
                                        <td className="px-5 py-3 text-center">
                                            <StatusBadge kind="transaction" status={tx.payment_status} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    page={page}
                    totalPages={totalPages}
                    total={total}
                    pageSize={PAGE_SIZE}
                    loading={loading}
                    onPageChange={setPage}
                    activeClass="bg-blue-500 text-white"
                />
            </div>
        </div>
    );
}
