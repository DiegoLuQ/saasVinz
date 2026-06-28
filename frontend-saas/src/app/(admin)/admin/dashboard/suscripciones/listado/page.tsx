"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CreditCard, 
    Search, 
    Filter, 
    ChevronLeft, 
    ChevronRight, 
    Calendar, 
    Building2, 
    AlertCircle,
    CheckCircle2,
    Clock,
    XCircle,
    MoreVertical,
    ExternalLink,
    RefreshCw,
    ClipboardList,
    Loader2,
    Zap,
    Wrench,
    ArrowUpRight
} from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ReceiptPreviewModal from '@/components/admin/receipts/ReceiptPreviewModal';
import StatusBadge from '@/components/admin/StatusBadge';
import Pagination from '@/components/admin/Pagination';
import CreateSubscriptionModal from '@/components/admin/subscriptions/CreateSubscriptionModal';
import type { Subscription, SubscriptionListResponse } from '@/types/billing';

const PAGE_SIZE = 20;

export default function SubscriptionsListPage() {
    const { showToast } = useToast();
    
    // State
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(1);
    
    // Filters
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [previewData, setPreviewData] = useState<any>(null);
    const [createOpen, setCreateOpen] = useState(false);

    const lastQueryRef = useRef<string>('');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchInput.trim());
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const fetchSubscriptions = useCallback(async () => {
        const params = new URLSearchParams({
            page: String(page),
            page_size: String(PAGE_SIZE)
        });
        
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (debouncedSearch) params.append('search', debouncedSearch);

        const queryKey = params.toString();
        if (queryKey === lastQueryRef.current && !loading) return;
        lastQueryRef.current = queryKey;

        setLoading(true);
        setError(null);
        
        try {
            const data: SubscriptionListResponse = await apiRequest(
                `/api/internal/creator/subscriptions?${queryKey}`
            );
            
            setSubscriptions(data?.subscriptions || []);
            setTotal(data?.total || 0);
            setTotalPages(data?.total_pages || 0);
        } catch (err: any) {
            console.error('Error fetching subscriptions:', err);
            setError(err.message || 'Error al cargar las suscripciones');
            showToast('No se pudieron cargar las suscripciones', 'error');
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, debouncedSearch, showToast]);

    useEffect(() => {
        fetchSubscriptions();
    }, [fetchSubscriptions]);

    const getCycleLabel = (cycle: string) => {
        switch (cycle) {
            case 'monthly': return 'Mensual';
            case 'annual': return 'Anual';
            case 'semiannual': return 'Semestral';
            case 'bimonthly': return 'Bimestral';
            default: return cycle;
        }
    };

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-700">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/15 rounded-2xl text-primary border border-primary/20 shadow-lg shadow-primary/5">
                            <CreditCard size={28} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 block mb-0.5">Control Maestro</span>
                            <h1 className="text-4xl font-black text-white tracking-tight">Suscripciones de Tenants</h1>
                        </div>
                    </div>
                    <p className="text-white/40 font-medium max-w-2xl">
                        Gestiona el ciclo de vida de todos los clientes SaaS. Supervisa estados, renovaciones y facturación global desde un solo lugar.
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => fetchSubscriptions()}
                        disabled={loading}
                        className="p-3 bg-white/5 hover:bg-white/10 text-white/60 rounded-2xl transition-all border border-white/10 disabled:opacity-50"
                        title="Refrescar datos"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button
                        onClick={() => setCreateOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Crear Suscripción <ArrowUpRight size={18} />
                    </button>
                </div>
            </header>

            {/* Premium Search & Filter Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-white/[0.03] p-5 rounded-[2rem] border border-white/10 backdrop-blur-xl shadow-inner">
                <div className="lg:col-span-7 relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" size={20} />
                    <input 
                        type="text"
                        placeholder="Buscar por nombre de empresa, slug o plan..."
                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all font-medium"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                </div>
                
                <div className="lg:col-span-3">
                    <select 
                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-white/60 focus:outline-none focus:border-primary/40 transition-all appearance-none cursor-pointer font-bold"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27white%27 stroke-opacity=%270.2%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1.25rem' }}
                    >
                        <option value="all">Todos los estados</option>
                        <option value="active">🟢 Activas</option>
                        <option value="pending">🟡 Pendientes</option>
                        <option value="expired">🔴 Vencidas</option>
                        <option value="canceled">⚪ Canceladas</option>
                    </select>
                </div>

                <div className="lg:col-span-2 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl text-white/40 font-black text-xs uppercase tracking-widest">
                    {total} Resultados
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white/[0.02] rounded-[3rem] border border-white/5 overflow-hidden backdrop-blur-md shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-white/[0.03]">
                                <th className="px-10 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.25em] border-b border-white/5">Empresa / Tenant</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.25em] border-b border-white/5">Plan & Ciclo</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.25em] border-b border-white/5 text-center">Estado</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.25em] border-b border-white/5">Vigencia</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.25em] border-b border-white/5 text-right">Inversión</th>
                                <th className="px-10 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.25em] border-b border-white/5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            <AnimatePresence mode="wait">
                                {loading ? (
                                    <motion.tr 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <td colSpan={6} className="px-10 py-32 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="relative">
                                                    <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="w-8 h-8 bg-primary/20 rounded-full animate-pulse"></div>
                                                    </div>
                                                </div>
                                                <p className="text-white/20 font-black uppercase tracking-[0.3em] text-xs">Sincronizando con el servidor...</p>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ) : error ? (
                                    <motion.tr
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    >
                                        <td colSpan={6} className="px-10 py-32 text-center">
                                            <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
                                                <div className="p-6 bg-rose-500/10 rounded-full text-rose-500 border border-rose-500/20">
                                                    <AlertCircle size={48} />
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="text-2xl font-black text-white">Error de Conexión</h3>
                                                    <p className="text-white/40 font-medium">{error}</p>
                                                </div>
                                                <button 
                                                    onClick={() => fetchSubscriptions()}
                                                    className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white font-black transition-all border border-white/10 flex items-center gap-2"
                                                >
                                                    <RefreshCw size={18} /> Reintentar Conexión
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ) : subscriptions.length === 0 ? (
                                    <motion.tr
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    >
                                        <td colSpan={6} className="px-10 py-32 text-center">
                                            <div className="flex flex-col items-center gap-4 text-white/10">
                                                <Search size={64} strokeWidth={1} />
                                                <div className="space-y-1">
                                                    <p className="font-black text-xl text-white/20 uppercase tracking-tighter">Sin coincidencias</p>
                                                    <p className="font-medium">Prueba con otros términos o filtros de estado</p>
                                                </div>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ) : (
                                    subscriptions.map((sub, idx) => {
                                        const isExpiringSoon = sub.status === 'active' &&
                                            (new Date(sub.end_date).getTime() - new Date().getTime()) < (7 * 24 * 60 * 60 * 1000);
                                        
                                        return (
                                            <motion.tr 
                                                key={sub.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.03 }}
                                                className="group hover:bg-white/[0.03] transition-all duration-300 cursor-default"
                                            >
                                                <td className="px-10 py-7">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-white/30 group-hover:from-primary/20 group-hover:text-primary group-hover:border-primary/30 transition-all duration-500">
                                                            <Building2 size={24} />
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-white tracking-tight text-xl leading-none mb-1 group-hover:text-primary transition-colors">{sub.tenant_name}</div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-white/20 font-black uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">ID: {sub.tenant_id}</span>
                                                                <span className="text-[10px] text-primary/40 font-bold lowercase">@{sub.tenant_slug}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-7">
                                                    <div className="flex items-center gap-2.5 mb-1">
                                                        <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
                                                        <span className="font-black text-white tracking-[0.1em] uppercase text-sm">{sub.plan_name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-white/30 font-bold uppercase tracking-tighter">
                                                        <Zap size={12} className="text-primary/40" />
                                                        {getCycleLabel(sub.billing_cycle)}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-7 text-center">
                                                    <StatusBadge kind="subscription" status={sub.status} />
                                                </td>
                                                <td className="px-8 py-7">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-sm text-white/80 font-bold">
                                                            <Calendar size={14} className="text-white/20" />
                                                            {format(new Date(sub.end_date), "d 'de' MMM, yyyy", { locale: es })}
                                                        </div>
                                                        {isExpiringSoon && (
                                                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-[10px] font-black text-amber-500 uppercase tracking-tight border border-amber-500/20">
                                                                <Clock size={10} /> Expira pronto
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-7 text-right">
                                                    <div className="text-xl font-black text-white tracking-tighter">
                                                        <span className="text-[10px] font-medium text-white/20 mr-1">$</span>
                                                        {sub.final_price?.toLocaleString('es-CL')}
                                                    </div>
                                                    <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">Pesos Chilenos</div>
                                                </td>
                                                <td className="px-10 py-7 text-right">
                                                    <div className="flex justify-end gap-2.5">
                                                        <button 
                                                            onClick={() => setPreviewData({
                                                                tenantName: sub.tenant_name,
                                                                tenantId: sub.tenant_id,
                                                                planName: sub.plan_name,
                                                                cycle: sub.billing_cycle,
                                                                amount: sub.final_price,
                                                                startDate: sub.start_date,
                                                                endDate: sub.end_date
                                                            })}
                                                            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-primary/20 hover:text-primary border border-white/5 hover:border-primary/30 transition-all flex items-center justify-center group/btn shadow-lg"
                                                            title="Ver Recibo"
                                                        >
                                                            <Search size={18} className="opacity-30 group-hover/btn:opacity-100 transition-opacity" />
                                                        </button>
                                                        {sub.tenant_slug && (
                                                            <button 
                                                                onClick={() => window.location.assign(`/dashboard/tenants/${sub.tenant_slug}`)}
                                                                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 border border-white/5 hover:border-emerald-500/30 transition-all flex items-center justify-center group/btn shadow-lg"
                                                                title="Configurar Tenant"
                                                            >
                                                                <Wrench size={18} className="opacity-30 group-hover/btn:opacity-100 transition-opacity" />
                                                            </button>
                                                        )}
                                                        <button className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white/20 hover:text-white border border-white/5 transition-all flex items-center justify-center shadow-lg">
                                                            <MoreVertical size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {/* Redesigned Pagination */}
                <div className="px-10 py-8 bg-white/[0.01] border-t border-white/5">
                    <Pagination 
                        page={page}
                        totalPages={totalPages}
                        total={total}
                        pageSize={PAGE_SIZE}
                        loading={loading}
                        onPageChange={setPage}
                        activeClass="bg-primary text-white shadow-2xl shadow-primary/40 ring-4 ring-primary/10"
                    />
                </div>
            </div>

            {/* Modal for Receipt Preview */}
            <ReceiptPreviewModal
                isOpen={!!previewData}
                onClose={() => setPreviewData(null)}
                data={previewData}
            />

            {/* Modal: Crear Suscripción */}
            <CreateSubscriptionModal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={() => {
                    lastQueryRef.current = '';
                    fetchSubscriptions();
                }}
                showToast={showToast}
            />
        </div>
    );
}
