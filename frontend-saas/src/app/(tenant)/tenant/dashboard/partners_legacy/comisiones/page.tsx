"use client";

import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { Search, Filter, ArrowLeft, ArrowRight, DollarSign, Clock, CheckCircle2, XCircle, AlertCircle, Loader2, CreditCard, Building2, User } from 'lucide-react';
import { useTenant } from '@/app/(tenant)/tenant/context/TenantContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface Commission {
    id: number;
    cremation_id: number;
    partner_id: number;
    partner_name: string;
    amount: number;
    status: string;
    created_at: string;
    pet_name: string;
    service_name: string;
    // Banking
    partner_rut?: string;
    partner_email?: string;
    bank_name?: string;
    account_type?: string;
    account_number?: string;
}

interface Stats {
    total_paid: number;
    total_pending: number;
}

export default function ComisionesPage() {
    const { showToast } = useToast();
    const { tenantData } = useTenant();

    // State
    const [loading, setLoading] = useState(true);
    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [stats, setStats] = useState<Stats>({ total_paid: 0, total_pending: 0 });
    const [totalItems, setTotalItems] = useState(0);

    // Filters & Pagination
    const [page, setPage] = useState(1);
    const [limit] = useState(15);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Modal State
    const [showBankModal, setShowBankModal] = useState(false);
    const [selectedBankInfo, setSelectedBankInfo] = useState<Commission | null>(null);

    // Confirm Modal State
    const [showConfirmPay, setShowConfirmPay] = useState(false);
    const [commissionToPay, setCommissionToPay] = useState<number | null>(null);
    const [isPaying, setIsPaying] = useState(false);

    // Debounce search
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchCommissions = async () => {
        setLoading(true);
        try {
            // Build Query Params
            const params = new URLSearchParams();
            params.append('skip', ((page - 1) * limit).toString());
            params.append('limit', limit.toString());
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (debouncedSearch) params.append('search', debouncedSearch);

            const response = await apiRequest(`/api/internal/partners/commissions?${params.toString()}`);
            setCommissions(response.rows);
            setStats(response.stats);
            setTotalItems(response.total);

        } catch (err) {
            console.error(err);
            showToast('Error al cargar comisiones', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCommissions();
    }, [page, statusFilter, debouncedSearch]);

    const handlePayClick = (id: number) => {
        setCommissionToPay(id);
        setShowConfirmPay(true);
    };

    const confirmPayment = async () => {
        if (!commissionToPay) return;

        setIsPaying(true);
        try {
            await apiRequest(`/api/internal/partners/commissions/${commissionToPay}/pay`, {
                method: 'PATCH'
            });
            showToast('Comisión marcada como pagada', 'success');
            fetchCommissions(); // Refresh list and stats
            setShowConfirmPay(false);
        } catch (err) {
            console.error(err);
            showToast('Error al actualizar estado', 'error');
        } finally {
            setIsPaying(false);
            setCommissionToPay(null);
        }
    };

    const openBankInfo = (comm: Commission) => {
        setSelectedBankInfo(comm);
        setShowBankModal(true);
    };

    // Helpers
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const s = status.toLowerCase();
        if (s === 'pagado') {
            return (
                <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
                    <CheckCircle2 size={12} /> Pagado
                </span>
            );
        } else if (s === 'pendiente') {
            return (
                <span className="bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
                    <Clock size={12} /> Pendiente
                </span>
            );
        } else if (s === 'cancelado') {
            return (
                <span className="bg-red-500/10 text-red-400 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
                    <XCircle size={12} /> Cancelado
                </span>
            );
        }
        return <span className="text-muted-foreground text-xs">{status}</span>;
    };

    const totalPages = Math.ceil(totalItems / limit);

    return (
        <div className="space-y-8 p-4 md:p-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <DollarSign className="text-primary" />
                    Comisiones y Pagos
                </h1>
                <p className="text-muted-foreground mt-1 text-lg">Gestiona y monitorea los pagos de comisiones a tus partners.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-6 rounded-3xl border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10">
                        <CheckCircle2 size={80} />
                    </div>
                    <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-2">Total Pagado</p>
                    <h3 className="text-4xl font-black text-white">{formatCurrency(stats.total_paid)}</h3>
                </div>

                <div className="glass-card p-6 rounded-3xl border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10">
                        <Clock size={80} />
                    </div>
                    <p className="text-xs font-black text-yellow-400 uppercase tracking-widest mb-2">Total Pendiente</p>
                    <h3 className="text-4xl font-black text-white">{formatCurrency(stats.total_pending)}</h3>
                </div>
            </div>

            {/* Filters & Table */}
            <div className="glass-card rounded-[2.5rem] overflow-hidden">
                {/* Function Bar */}
                <div className="p-6 border-b border-white/5 bg-white/5 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por partner..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-background/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:border-primary/50 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(1); // Reset page on filter change
                                }}
                                className="bg-background/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-primary/50 transition-all appearance-none min-w-[150px] cursor-pointer"
                            >
                                <option value="all">Todos los estados</option>
                                <option value="pendiente">Pendiente</option>
                                <option value="pagado">Pagado</option>
                                <option value="cancelado">Cancelado</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <Loader2 className="animate-spin text-primary" size={40} />
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-white/2 border-b border-white/5">
                                        <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Mascota / Servicio</th>
                                        <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Partner</th>
                                        <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Fecha</th>
                                        <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Monto</th>
                                        <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Estado Comisión</th>
                                        <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {commissions.length > 0 ? commissions.map((item) => (
                                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-white">{item.pet_name}</span>
                                                    <span className="text-xs text-muted-foreground">{item.service_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 font-bold text-sm">{item.partner_name}</td>
                                            <td className="px-8 py-6 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</td>
                                            <td className="px-8 py-6 font-bold text-emerald-400">{formatCurrency(item.amount)}</td>
                                            <td className="px-8 py-6 flex justify-center">
                                                <StatusBadge status={item.status} />
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openBankInfo(item)}
                                                        className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                                                        title="Ver Datos Bancarios"
                                                    >
                                                        <CreditCard size={16} />
                                                    </button>
                                                    {item.status.toLowerCase() === 'pendiente' && (
                                                        <button
                                                            onClick={() => handlePayClick(item.id)}
                                                            className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                                            title="Marcar como Pagado"
                                                        >
                                                            <CheckCircle2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="text-center py-20 text-muted-foreground">
                                                No se encontraron comisiones.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {commissions.length > 0 && (
                            <div className="p-6 border-t border-white/5 flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                    Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, totalItems)} de {totalItems} resultados
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ArrowLeft size={16} />
                                    </button>
                                    <span className="flex items-center px-4 font-mono text-sm bg-white/5 rounded-lg">
                                        {page} / {totalPages || 1}
                                    </span>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page >= totalPages}
                                        className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={showConfirmPay}
                onClose={() => setShowConfirmPay(false)}
                onConfirm={confirmPayment}
                title="Confirmar Pago"
                message="¿Estás seguro de que deseas marcar esta comisión como PAGADA? Esta acción actualizará los totales y el estado del registro."
                confirmText="Sí, Marcar Pagado"
                variant="success"
                isLoading={isPaying}
            />

            {/* Banking Modal */}
            {showBankModal && selectedBankInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowBankModal(false)}>
                    <div className="glass-card w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Building2 className="text-primary" size={20} />
                                Datos Bancarios
                            </h3>
                            <button onClick={() => setShowBankModal(false)} className="text-muted-foreground hover:text-white transition-colors">
                                <XCircle size={20} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Nombre Partner</p>
                                    <p className="text-lg font-bold text-white flex items-center gap-2">
                                        <User size={16} className="text-emerald-500" />
                                        {selectedBankInfo.partner_name}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">RUT</p>
                                        <p className="text-white font-mono">{selectedBankInfo.partner_rut || 'No registrado'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Email</p>
                                        <p className="text-white text-sm truncate" title={selectedBankInfo.partner_email}>{selectedBankInfo.partner_email || 'No registrado'}</p>
                                    </div>
                                </div>

                                <div className="h-px bg-white/10 my-2" />

                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Banco</p>
                                        <p className="text-white">{selectedBankInfo.bank_name || 'No registrado'}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Tipo Cuenta</p>
                                            <p className="text-white">{selectedBankInfo.account_type || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Número</p>
                                            <p className="text-white font-mono">{selectedBankInfo.account_number || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowBankModal(false)}
                                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
