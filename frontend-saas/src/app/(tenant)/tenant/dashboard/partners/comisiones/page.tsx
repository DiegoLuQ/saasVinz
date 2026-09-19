"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import {
    DollarSign,
    Clock,
    CheckCircle2,
    Search,
    Filter,
    ArrowLeft,
    Building2,
    CreditCard,
    Copy,
    Check,
    ExternalLink,
    AlertCircle,
    Loader2,
    Receipt,
    RefreshCw,
    X,
    ArrowUpRight,
    Store,
    HelpCircle,
    Calendar,
    ChevronDown
} from 'lucide-react';
import Modal from '@/components/tenant/Modal';
import { copyToClipboard } from '@/lib/clipboard';

interface Commission {
    id: number;
    cremation_id: number;
    partner_id: number;
    partner_name: string;
    amount: number;
    amount_porcentaje?: number;
    order_total?: number;
    status: string;
    paid_at?: string;
    notes?: string;
    created_at: string;
    pet_name: string;
    service_name: string;
    partner_rut?: string;
    partner_email?: string;
    bank_name?: string;
    account_type?: string;
    account_number?: string;
    rut_titular?: string;
    nombre_titular?: string;
}

interface CommissionStats {
    total_paid: number;
    total_pending: number;
    count_paid: number;
    count_pending: number;
}

const formatCLP = (val: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val || 0);
};

export default function ComisionesPage() {
    const { showToast } = useToast();

    // State
    const [loading, setLoading] = useState(true);
    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [stats, setStats] = useState<CommissionStats>({
        total_paid: 0,
        total_pending: 0,
        count_paid: 0,
        count_pending: 0,
    });
    const [totalItems, setTotalItems] = useState(0);

    // Filters
    const [page, setPage] = useState(1);
    const [limit] = useState(15);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pendiente' | 'pagado'>('all');

    // Modals
    const [selectedBankCommission, setSelectedBankCommission] = useState<Commission | null>(null);
    const [payingCommission, setPayingCommission] = useState<Commission | null>(null);
    const [paymentNotes, setPaymentNotes] = useState('');
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [unpayingCommission, setUnpayingCommission] = useState<Commission | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Debounce search
    const [debouncedSearch, setDebouncedSearch] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchCommissions = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('skip', ((page - 1) * limit).toString());
            params.append('limit', limit.toString());
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (debouncedSearch) params.append('search', debouncedSearch);

            const res = await apiRequest(`/api/internal/partners/commissions?${params.toString()}`);
            setCommissions(res.rows || []);
            setStats(res.stats || { total_paid: 0, total_pending: 0, count_paid: 0, count_pending: 0 });
            setTotalItems(res.total || 0);
        } catch (err: any) {
            console.error(err);
            showToast(err?.message || 'Error al cargar comisiones', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCommissions();
    }, [page, statusFilter, debouncedSearch]);

    // Handle Copy Helper
    const handleCopy = async (text?: string, key?: string) => {
        if (!text) return;
        const success = await copyToClipboard(text);
        if (success) {
            setCopiedKey(key || text);
            showToast('Copiado al portapapeles', 'success');
            setTimeout(() => setCopiedKey(null), 2000);
        }
    };

    // Confirm Payment
    const handleConfirmPayment = async () => {
        if (!payingCommission) return;
        setIsProcessingPayment(true);
        try {
            await apiRequest(`/api/internal/partners/commissions/${payingCommission.id}/pay`, {
                method: 'PATCH',
                body: JSON.stringify({ notes: paymentNotes.trim() || undefined }),
            });
            showToast(`Comisión #${payingCommission.id} marcada como pagada`, 'success');
            setPayingCommission(null);
            setPaymentNotes('');
            fetchCommissions();
        } catch (err: any) {
            showToast(err?.message || 'Error al registrar pago', 'error');
        } finally {
            setIsProcessingPayment(false);
        }
    };

    // Revert Payment
    const handleConfirmUnpay = async () => {
        if (!unpayingCommission) return;
        setIsProcessingPayment(true);
        try {
            await apiRequest(`/api/internal/partners/commissions/${unpayingCommission.id}/unpay`, {
                method: 'PATCH',
            });
            showToast(`Comisión #${unpayingCommission.id} reabierta como pendiente`, 'info');
            setUnpayingCommission(null);
            fetchCommissions();
        } catch (err: any) {
            showToast(err?.message || 'Error al revertir pago', 'error');
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 space-y-8">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        <Link href="/dashboard/partners" className="hover:text-primary transition-colors flex items-center gap-1">
                            <Store size={14} /> Partners
                        </Link>
                        <span>/</span>
                        <span className="text-foreground">Liquidación de Comisiones</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
                        <DollarSign className="text-emerald-400" />
                        Comisiones a Veterinarias
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Gestiona, audita y liquida las comisiones derivadas por clínicas veterinarias en convenio.
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10 shrink-0">
                    <Link
                        href="/dashboard/partners"
                        className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-white hover:bg-white/5 transition-all flex items-center gap-2"
                    >
                        <Store size={14} />
                        Listado de Partners
                    </Link>
                    <button
                        type="button"
                        className="px-4 py-2 rounded-xl text-xs font-black bg-primary text-black shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                        <DollarSign size={14} />
                        Liquidación de Comisiones
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Total Pendiente */}
                <div className="bg-[#0f172a] border border-amber-500/20 hover:border-amber-500/40 rounded-3xl p-6 relative overflow-hidden shadow-xl transition-all group">
                    <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock size={80} className="text-amber-400" />
                    </div>
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        Por Pagar (Pendientes)
                    </div>
                    <h3 className="text-3xl sm:text-4xl font-black text-white font-mono">
                        {formatCLP(stats.total_pending)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                        {stats.count_pending} {stats.count_pending === 1 ? 'comisión pendiente' : 'comisiones pendientes'}
                    </p>
                </div>

                {/* Total Pagado */}
                <div className="bg-[#0f172a] border border-emerald-500/20 hover:border-emerald-500/40 rounded-3xl p-6 relative overflow-hidden shadow-xl transition-all group">
                    <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CheckCircle2 size={80} className="text-emerald-400" />
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                        <CheckCircle2 size={13} />
                        Total Liquidado (Pagado)
                    </div>
                    <h3 className="text-3xl sm:text-4xl font-black text-white font-mono">
                        {formatCLP(stats.total_paid)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                        {stats.count_paid} {stats.count_paid === 1 ? 'comisión liquidada' : 'comisiones liquidadas'}
                    </p>
                </div>

                {/* Total General */}
                <div className="bg-[#0f172a] border border-white/10 hover:border-white/20 rounded-3xl p-6 relative overflow-hidden shadow-xl transition-all group">
                    <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Receipt size={80} className="text-primary" />
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider mb-2">
                        <Receipt size={13} className="text-primary" />
                        Total Histórico Comisiones
                    </div>
                    <h3 className="text-3xl sm:text-4xl font-black text-white font-mono">
                        {formatCLP(stats.total_paid + stats.total_pending)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                        {totalItems} {totalItems === 1 ? 'orden con convenio registrada' : 'órdenes con convenio registradas'}
                    </p>
                </div>
            </div>

            {/* Filter and Control Bar */}
            <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-5 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar por veterinaria, mascota o RUT..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-2.5 pl-11 pr-4 text-xs text-white placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                    {/* Status Pill Filter */}
                    <div className="flex items-center bg-black/40 border border-white/10 rounded-2xl p-1">
                        <button
                            type="button"
                            onClick={() => { setStatusFilter('all'); setPage(1); }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                statusFilter === 'all'
                                    ? 'bg-primary text-black font-extrabold shadow-sm'
                                    : 'text-muted-foreground hover:text-white'
                            }`}
                        >
                            Todas
                        </button>
                        <button
                            type="button"
                            onClick={() => { setStatusFilter('pendiente'); setPage(1); }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                statusFilter === 'pendiente'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'text-muted-foreground hover:text-white'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Pendientes
                        </button>
                        <button
                            type="button"
                            onClick={() => { setStatusFilter('pagado'); setPage(1); }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                statusFilter === 'pagado'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'text-muted-foreground hover:text-white'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Pagadas
                        </button>
                    </div>

                    {/* Refresh Button */}
                    <button
                        type="button"
                        onClick={() => fetchCommissions()}
                        disabled={loading}
                        className="p-2.5 rounded-2xl bg-black/40 hover:bg-white/5 border border-white/10 text-muted-foreground hover:text-white transition-all disabled:opacity-50"
                        title="Actualizar tabla"
                    >
                        <RefreshCw size={15} className={loading ? 'animate-spin text-primary' : ''} />
                    </button>
                </div>
            </div>

            {/* Commissions Table */}
            <div className="bg-[#0f172a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                        <Loader2 className="animate-spin text-primary" size={36} />
                        <p className="text-xs font-bold uppercase tracking-wider">Cargando comisiones...</p>
                    </div>
                ) : commissions.length === 0 ? (
                    <div className="py-20 px-4 text-center flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground mb-4">
                            <Receipt size={30} />
                        </div>
                        <h4 className="text-base font-bold text-white mb-1">No se encontraron comisiones</h4>
                        <p className="text-xs text-muted-foreground max-w-sm">
                            {search || statusFilter !== 'all'
                                ? 'Prueba ajustando los filtros de búsqueda o de estado.'
                                : 'Las órdenes creadas o actualizadas con convenio veterinario aparecerán automáticamente aquí para su liquidación.'}
                        </p>
                        {(search || statusFilter !== 'all') && (
                            <button
                                type="button"
                                onClick={() => { setSearch(''); setStatusFilter('all'); }}
                                className="mt-4 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all"
                            >
                                Limpiar Filtros
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/[0.02]">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                                        Orden / Mascota
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                                        Veterinaria (Partner)
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground text-right">
                                        Total Orden
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground text-center">
                                        Regla
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground text-right">
                                        Comisión a Pagar
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground text-center">
                                        Estado
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground text-right">
                                        Acción
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {commissions.map((item) => {
                                    const isPaid = item.status?.toLowerCase() === 'pagado';
                                    return (
                                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                            {/* Orden / Mascota */}
                                            <td className="px-6 py-4 min-w-[200px]">
                                                <div className="flex items-start gap-3">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <Link
                                                                href={`/dashboard/recepcion-pedidos/registro?id=${item.cremation_id}`}
                                                                className="text-xs font-mono font-black text-primary hover:underline flex items-center gap-1"
                                                                title="Abrir orden"
                                                            >
                                                                ORD-{item.cremation_id}
                                                                <ArrowUpRight size={11} />
                                                            </Link>
                                                            <span className="text-[10px] text-muted-foreground/60 font-mono">
                                                                {new Date(item.created_at).toLocaleDateString('es-CL')}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm font-bold text-white truncate max-w-[180px]">
                                                            {item.pet_name || 'Mascota'}
                                                        </p>
                                                        <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                                                            {item.service_name}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Veterinaria */}
                                            <td className="px-6 py-4 min-w-[220px]">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <Building2 size={13} className="text-emerald-400 shrink-0" />
                                                        <span className="text-xs font-bold text-white truncate max-w-[180px]" title={item.partner_name}>
                                                            {item.partner_name}
                                                        </span>
                                                    </div>
                                                    {item.partner_rut && (
                                                        <p className="text-[10px] text-muted-foreground font-mono">
                                                            RUT: {item.partner_rut}
                                                        </p>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedBankCommission(item)}
                                                        className="text-[10px] font-bold text-emerald-400/90 hover:text-emerald-300 hover:underline flex items-center gap-1 transition-colors pt-0.5"
                                                    >
                                                        <CreditCard size={11} />
                                                        Ver Datos Bancarios
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Total Orden */}
                                            <td className="px-6 py-4 text-right font-mono text-xs font-bold text-white/90">
                                                {formatCLP(item.order_total || 0)}
                                            </td>

                                            {/* Regla (%) */}
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-[11px] font-black px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-muted-foreground font-mono">
                                                    {item.amount_porcentaje ? `${item.amount_porcentaje}%` : 'Fijo'}
                                                </span>
                                            </td>

                                            {/* Monto Comisión */}
                                            <td className="px-6 py-4 text-right min-w-[140px]">
                                                <span className="text-sm font-black font-mono text-emerald-400 block">
                                                    {formatCLP(item.amount)}
                                                </span>
                                            </td>

                                            {/* Estado */}
                                            <td className="px-6 py-4 text-center min-w-[140px]">
                                                {isPaid ? (
                                                    <div className="inline-flex flex-col items-center">
                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                                                            <CheckCircle2 size={11} /> Pagado
                                                        </span>
                                                        {item.paid_at && (
                                                            <span className="text-[9px] text-muted-foreground font-mono mt-0.5">
                                                                {new Date(item.paid_at).toLocaleDateString('es-CL')}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/25 inline-flex items-center gap-1">
                                                        <Clock size={11} /> Pendiente
                                                    </span>
                                                )}
                                            </td>

                                            {/* Acciones */}
                                            <td className="px-6 py-4 text-right min-w-[150px]">
                                                {isPaid ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setUnpayingCommission(item)}
                                                            className="text-[10px] text-muted-foreground hover:text-red-400 font-bold hover:underline transition-colors"
                                                            title="Revertir estado a pendiente"
                                                        >
                                                            Desmarcar
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setPayingCommission(item);
                                                            setPaymentNotes('');
                                                        }}
                                                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all shadow-md shadow-emerald-500/20 active:scale-95 flex items-center gap-1.5 ml-auto"
                                                    >
                                                        <CheckCircle2 size={13} />
                                                        Marcar Pagada
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalItems > limit && (
                    <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between text-xs text-muted-foreground bg-white/[0.01]">
                        <span>
                            Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, totalItems)} de {totalItems} comisiones
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none font-bold"
                            >
                                Anterior
                            </button>
                            <span className="font-mono text-white px-2">
                                {page} / {totalPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none font-bold"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: Datos Bancarios */}
            {selectedBankCommission && (
                <Modal
                    isOpen={!!selectedBankCommission}
                    onClose={() => setSelectedBankCommission(null)}
                    title="Datos de Transferencia Bancaria"
                    maxWidth="max-w-md"
                >
                    <div className="space-y-4 pt-2">
                        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                            <Building2 className="text-emerald-400 shrink-0" size={24} />
                            <div className="min-w-0">
                                <p className="text-xs font-black text-white truncate">
                                    {selectedBankCommission.partner_name}
                                </p>
                                <p className="text-[11px] text-emerald-400/80 font-mono">
                                    RUT: {selectedBankCommission.partner_rut || 'Sin RUT registrado'}
                                </p>
                            </div>
                        </div>

                        {selectedBankCommission.bank_name || selectedBankCommission.account_number ? (
                            <div className="space-y-2.5 bg-black/40 border border-white/10 rounded-2xl p-4 text-xs">
                                <div className="flex justify-between items-center py-1 border-b border-white/5">
                                    <span className="text-muted-foreground">Banco:</span>
                                    <span className="font-bold text-white">{selectedBankCommission.bank_name || 'No especificado'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-white/5">
                                    <span className="text-muted-foreground">Tipo de Cuenta:</span>
                                    <span className="font-bold text-white capitalize">{selectedBankCommission.account_type || 'Cuenta Corriente'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-white/5">
                                    <span className="text-muted-foreground">N° de Cuenta:</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-black text-white">{selectedBankCommission.account_number}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(selectedBankCommission.account_number, 'account_num')}
                                            className="p-1 text-muted-foreground hover:text-white"
                                            title="Copiar número"
                                        >
                                            {copiedKey === 'account_num' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-white/5">
                                    <span className="text-muted-foreground">Titular:</span>
                                    <span className="font-bold text-white">{selectedBankCommission.nombre_titular || selectedBankCommission.partner_name}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-muted-foreground">RUT Titular:</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-bold text-white">{selectedBankCommission.rut_titular || selectedBankCommission.partner_rut}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(selectedBankCommission.rut_titular || selectedBankCommission.partner_rut, 'rut')}
                                            className="p-1 text-muted-foreground hover:text-white"
                                            title="Copiar RUT"
                                        >
                                            {copiedKey === 'rut' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
                                <AlertCircle size={18} className="shrink-0 text-amber-400 mt-0.5" />
                                <div>
                                    <p className="font-bold mb-0.5">Sin datos bancarios registrados</p>
                                    <p className="text-amber-300/80 text-[11px]">
                                        Esta clínica aún no ha configurado sus datos de cuenta bancaria. Puedes solicitarle que los complete o registrarlos directamente en su convenio.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="pt-2 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedBankCommission(null)}
                                className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-all"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal: Confirmar Liquidación de Pago */}
            {payingCommission && (
                <Modal
                    isOpen={!!payingCommission}
                    onClose={() => setPayingCommission(null)}
                    title="Confirmar Liquidación de Comisión"
                    maxWidth="max-w-md"
                >
                    <div className="space-y-4 pt-2">
                        <div className="p-4 rounded-2xl bg-[#0f172a] border border-white/10 space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Veterinaria:</span>
                                <span className="font-bold text-white">{payingCommission.partner_name}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Orden:</span>
                                <span className="font-mono font-bold text-primary">ORD-{payingCommission.cremation_id} ({payingCommission.pet_name})</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Total Orden:</span>
                                <span className="font-mono text-white">{formatCLP(payingCommission.order_total || 0)}</span>
                            </div>
                            <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                                <span className="text-xs font-black uppercase text-muted-foreground">Monto Comisión:</span>
                                <span className="text-xl font-black font-mono text-emerald-400">
                                    {formatCLP(payingCommission.amount)}
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                                N° Comprobante o Nota de Transferencia (opcional)
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Transf. #948293 / Banco Estado..."
                                value={paymentNotes}
                                onChange={(e) => setPaymentNotes(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-muted-foreground/60 outline-none focus:border-primary/50"
                            />
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setPayingCommission(null)}
                                disabled={isProcessingPayment}
                                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-muted-foreground hover:text-white transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmPayment}
                                disabled={isProcessingPayment}
                                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-1.5"
                            >
                                {isProcessingPayment ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                Confirmar Pago Realizado
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal: Revertir Pago */}
            {unpayingCommission && (
                <Modal
                    isOpen={!!unpayingCommission}
                    onClose={() => setUnpayingCommission(null)}
                    title="¿Reabrir comisión como pendiente?"
                    maxWidth="max-w-md"
                >
                    <div className="space-y-4 pt-2">
                        <p className="text-xs text-muted-foreground">
                            ¿Estás seguro de que deseas desmarcar la comisión de <strong>{formatCLP(unpayingCommission.amount)}</strong> para <strong>{unpayingCommission.partner_name}</strong>? Volverá al total pendiente de liquidar.
                        </p>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setUnpayingCommission(null)}
                                disabled={isProcessingPayment}
                                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-muted-foreground hover:text-white transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmUnpay}
                                disabled={isProcessingPayment}
                                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                            >
                                {isProcessingPayment ? <Loader2 size={14} className="animate-spin" /> : null}
                                Sí, volver a pendiente
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
