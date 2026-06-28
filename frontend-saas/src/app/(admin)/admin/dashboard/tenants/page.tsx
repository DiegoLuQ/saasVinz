"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus,
    Search,
    ExternalLink,
    Building2,
    Trash2,
    Wrench,
    AlertTriangle,
    CreditCard,
    Calendar,
    ArrowUpRight,
    PauseCircle,
    PlayCircle,
    Download,
    X
} from 'lucide-react';
import { usePolar } from '@/hooks/usePolar';
import { apiRequest } from '@/lib/admin/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import DeleteTenantModal from '@/components/admin/DeleteTenantModal';

import { useAdminTenants, useAdminBootstrap } from '@/hooks/useAdminBootstrap';

export default function TenantsPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const bootstrapTenants = useAdminTenants();
    const { refetch: refetchBootstrap } = useAdminBootstrap();
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<any>(null);
    const { openPortal } = usePolar();

    // Status change modal
    const [statusModal, setStatusModal] = useState<{ tenant: any; action: 'suspend' | 'reactivate' } | null>(null);
    const [statusReason, setStatusReason] = useState('');
    const [statusLoading, setStatusLoading] = useState(false);

    // Bulk selection
    const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

    // Sync local state with bootstrap data
    useEffect(() => {
        if (bootstrapTenants && bootstrapTenants.length > 0) {
            setTenants(bootstrapTenants);
            setLoading(false);
        }
    }, [bootstrapTenants]);

    const fetchData = async () => {
        try {
            await refetchBootstrap();
        } catch (err) {
            console.error('Error refetching tenants:', err);
        }
    };

    const handleCreateTenant = () => {
        router.push('/dashboard/tenants/nuevo');
    };

    const handleEditTenant = (tenant: any) => {
        router.push(`/dashboard/tenants/${tenant.slug}`);
    };

    const handleDeleteClick = (tenant: any) => {
        setSelectedTenant(tenant);
        setDeleteModalOpen(true);
    };

    const handleModalSuccess = () => {
        fetchData();
    };

    const handleOpenStatusModal = (tenant: any, action: 'suspend' | 'reactivate') => {
        setStatusReason(action === 'suspend' ? 'Cuenta suspendida por el administrador.' : '');
        setStatusModal({ tenant, action });
    };

    const handleConfirmStatusChange = async () => {
        if (!statusModal) return;
        setStatusLoading(true);
        try {
            await apiRequest(`/api/internal/creator/tenants/${statusModal.tenant.slug}`, {
                method: 'PUT',
                body: JSON.stringify({
                    status: statusModal.action === 'suspend' ? 'suspended' : 'active',
                    pending_reason: statusModal.action === 'suspend' ? statusReason : '',
                }),
            });
            showToast(
                statusModal.action === 'suspend' ? 'Tenant suspendido correctamente' : 'Tenant reactivado correctamente',
                'success'
            );
            setStatusModal(null);
            fetchData();
        } catch (err: any) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            setStatusLoading(false);
        }
    };

    const toggleSelect = (slug: string) => {
        setSelectedSlugs(prev => {
            const next = new Set(prev);
            next.has(slug) ? next.delete(slug) : next.add(slug);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedSlugs.size === filteredTenants.length) {
            setSelectedSlugs(new Set());
        } else {
            setSelectedSlugs(new Set(filteredTenants.map(t => t.slug)));
        }
    };

    const handleBulkAction = async (action: 'suspend' | 'reactivate' | 'delete') => {
        const slugs = Array.from(selectedSlugs);
        setBulkLoading(true);
        setBulkProgress({ done: 0, total: slugs.length });

        const results = await Promise.allSettled(
            slugs.map(slug =>
                action === 'delete'
                    ? apiRequest(`/api/internal/creator/tenants/${slug}`, { method: 'DELETE' })
                    : apiRequest(`/api/internal/creator/tenants/${slug}`, {
                          method: 'PUT',
                          body: JSON.stringify({
                              status: action === 'suspend' ? 'suspended' : 'active',
                              pending_reason: action === 'suspend' ? 'Suspensión masiva por administrador.' : '',
                          }),
                      }).then(res => { setBulkProgress(p => ({ ...p, done: p.done + 1 })); return res; })
            )
        );

        const failed = results.filter(r => r.status === 'rejected').length;
        const ok = results.length - failed;
        showToast(
            failed === 0
                ? `${ok} tenant(s) procesados correctamente`
                : `${ok} correctos, ${failed} fallidos`,
            failed === 0 ? 'success' : 'error'
        );
        setSelectedSlugs(new Set());
        setBulkDeleteConfirm(false);
        setBulkLoading(false);
        fetchData();
    };

    const handleExportCSV = () => {
        const rows = [
            ['Empresa', 'Slug', 'Plan', 'Estado', 'Vencimiento', 'Precio Mensual', 'Revenue MRR'],
            ...filteredTenants.map(t => [
                t.name,
                t.slug,
                t.plan,
                t.status,
                t.billing_end_date ? new Date(t.billing_end_date).toLocaleDateString('es-CL') : 'N/A',
                t.monthly_price ?? '',
                t.revenue ?? 0,
            ]),
        ];
        const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tenants_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleOpenPolarPortal = async (customerId: string) => {
        try {
            await openPortal(customerId);
        } catch (err: any) {
            showToast('Error al abrir el portal: ' + err.message, 'error');
        }
    };

    const filteredTenants = tenants.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const planColors: Record<string, string> = {
        'FREE': 'text-yellow-400 border-yellow-400/20 bg-yellow-400/10',
        'NORMAL': 'text-blue-400 border-blue-400/20 bg-blue-400/10',
        'PRO': 'text-orange-500 border-orange-500/20 bg-orange-500/10',
        'ULTRA': 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10',
    };

    const planDotColors: Record<string, string> = {
        'FREE': 'bg-yellow-400',
        'NORMAL': 'bg-blue-400',
        'PRO': 'bg-orange-500',
        'ULTRA': 'bg-emerald-400',
    };

    const planNames: Record<string, string> = {
        'FREE': 'Free',
        'NORMAL': 'Normal',
        'PRO': 'Pro',
        'ULTRA': 'Ultra',
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-white italic tracking-tight">Administración de Tenants</h2>
                    <p className="text-white/40 text-sm">Gestiona todas las empresas registradas en la plataforma</p>
                </div>

                <button
                    onClick={handleCreateTenant}
                    className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                    <Plus size={20} /> Nuevo Tenant
                </button>
            </header>

            {/* Toolbar */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o slug..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#0a192f] border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white outline-none focus:border-primary/50 transition-all shadow-xl"
                    />
                </div>
                <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white font-bold py-3 px-5 rounded-2xl transition-all active:scale-95"
                    title="Exportar lista a CSV"
                >
                    <Download size={16} /> CSV
                </button>
            </div>

            {/* Bulk toolbar */}
            {selectedSlugs.size > 0 && (
                <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-2xl px-5 py-3">
                    <span className="text-sm font-bold text-primary flex-1">
                        {bulkLoading
                            ? `Procesando ${bulkProgress.done}/${bulkProgress.total}...`
                            : `${selectedSlugs.size} tenant${selectedSlugs.size > 1 ? 's' : ''} seleccionado${selectedSlugs.size > 1 ? 's' : ''}`}
                    </span>
                    {!bulkLoading && (
                        <>
                            <button
                                onClick={() => handleBulkAction('suspend')}
                                className="flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500 border border-yellow-500/20 text-yellow-400 hover:text-black font-bold text-xs py-2 px-4 rounded-xl transition-all active:scale-95"
                            >
                                <PauseCircle size={14} /> Suspender
                            </button>
                            <button
                                onClick={() => handleBulkAction('reactivate')}
                                className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500 border border-green-500/20 text-green-400 hover:text-black font-bold text-xs py-2 px-4 rounded-xl transition-all active:scale-95"
                            >
                                <PlayCircle size={14} /> Reactivar
                            </button>
                            <button
                                onClick={() => setBulkDeleteConfirm(true)}
                                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500 border border-red-500/20 text-red-400 hover:text-white font-bold text-xs py-2 px-4 rounded-xl transition-all active:scale-95"
                            >
                                <Trash2 size={14} /> Eliminar
                            </button>
                            <button
                                onClick={() => setSelectedSlugs(new Set())}
                                className="text-white/30 hover:text-white transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </>
                    )}
                    {bulkLoading && (
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    )}
                </div>
            )}

            {/* Table */}
            <div className="bg-[#0a192f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p>Cargando empresas...</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-[10px] uppercase font-black text-white/40 tracking-widest">
                            <tr>
                                <th className="pl-6 pr-2 py-5 w-10">
                                    <input
                                        type="checkbox"
                                        checked={filteredTenants.length > 0 && selectedSlugs.size === filteredTenants.length}
                                        onChange={toggleAll}
                                        className="w-4 h-4 rounded accent-primary cursor-pointer"
                                    />
                                </th>
                                <th className="px-8 py-5">Empresa</th>
                                <th className="px-8 py-5">Identificador (Slug)</th>
                                <th className="px-8 py-5">Estado</th>
                                <th className="px-8 py-5">Plan suscripción</th>
                                <th className="px-8 py-5">Vencimiento</th>
                                <th className="px-8 py-5 text-right">Ingresos MRR</th>
                                <th className="px-8 py-5 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredTenants.length > 0 ? filteredTenants.map((tenant) => {
                                 const isFree = tenant.plan === 'FREE';
                                 const now = new Date();
                                 const billingEndDate = tenant.billing_end_date ? new Date(tenant.billing_end_date) : null;
                                 const isExpired = !isFree && billingEndDate && now > billingEndDate;
                                 // Período de gracia: 3 días
                                 const isGraceExpired = !isFree && billingEndDate && now > new Date(billingEndDate.getTime() + 3 * 24 * 60 * 60 * 1000);                                 const getCellClass = (colIndex: number) => {
                                     let base = "px-8 py-5 transition-all duration-300";
                                     if (colIndex === 0) base += " relative";
                                     if (colIndex === 5) base += " text-right font-mono font-bold text-white/90";
                                     if (colIndex === 6) base += " text-center";

                                     if (isGraceExpired) {
                                         base += " border-t border-b border-red-500/30 bg-red-500/[0.03] group-hover:bg-red-500/[0.06]";
                                         if (colIndex === 0) base += " border-l border-l-red-500/30 rounded-l-2xl";
                                         if (colIndex === 6) base += " border-r border-r-red-500/30 rounded-r-2xl";
                                     } else if (isExpired) {
                                         base += " border-t border-b border-orange-500/20 bg-orange-500/[0.02] group-hover:bg-orange-500/[0.04]";
                                         if (colIndex === 0) base += " border-l border-l-orange-500/20 rounded-l-2xl";
                                         if (colIndex === 6) base += " border-r border-r-orange-500/20 rounded-r-2xl";
                                     } else {
                                         base += " border-t border-b border-transparent group-hover:bg-white/5";
                                         if (colIndex === 0) base += " border-l border-l-transparent rounded-l-2xl";
                                         if (colIndex === 6) base += " border-r border-r-transparent rounded-r-2xl";
                                     }
                                     return base;
                                 };

                                 const isSelected = selectedSlugs.has(tenant.slug);
                                 return (
                                     <tr key={tenant.id} className={`group transition-all duration-300 ${isSelected ? 'bg-primary/5' : ''}`}>
                                         <td className="pl-6 pr-2 py-5">
                                             <input
                                                 type="checkbox"
                                                 checked={isSelected}
                                                 onChange={() => toggleSelect(tenant.slug)}
                                                 className="w-4 h-4 rounded accent-primary cursor-pointer"
                                             />
                                         </td>
                                         <td className={getCellClass(0)}>
                                             {isGraceExpired && (
                                                 <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-gradient-to-b from-red-500 to-rose-600 shadow-[0_0_12px_rgba(239,68,68,0.8)] z-10 rounded-l-2xl" />
                                             )}
                                             {!isGraceExpired && isExpired && (
                                                 <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-gradient-to-b from-orange-400 to-amber-500 shadow-[0_0_10px_rgba(249,115,22,0.6)] z-10 rounded-l-2xl" />
                                             )}
                                             <div className="flex items-center gap-3">
                                                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                                     isGraceExpired 
                                                         ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.25)]' 
                                                         : isExpired 
                                                             ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-[0_0_8px_rgba(249,115,22,0.2)]' 
                                                             : 'bg-white/5 text-primary group-hover:scale-110'
                                                 }`}>
                                                     {isGraceExpired || isExpired ? (
                                                         <AlertTriangle size={20} className={isGraceExpired ? "animate-pulse text-red-400" : "text-orange-400"} />
                                                     ) : (
                                                         <Building2 size={20} />
                                                     )}
                                                 </div>
                                                 <div>
                                                     <div className={`font-bold leading-tight transition-colors ${
                                                         isGraceExpired ? 'text-red-200' : isExpired ? 'text-orange-200' : 'text-white'
                                                     }`}>{tenant.name}</div>
                                                     <div className="text-[9px] text-white/30 uppercase font-black mt-0.5 tracking-tighter">SLUG: {tenant.slug}</div>
                                                 </div>
                                             </div>
                                         </td>
                                         <td className={getCellClass(1)}>
                                             <div className="flex items-center gap-2">
                                                 <span className="text-white/40 font-mono text-xs">/{tenant.slug}</span>
                                                 <a href="http://app.localhost:3000" target="_blank" className="p-1.5 hover:bg-white/10 rounded-lg text-white/20 hover:text-primary transition-all" title="Abrir portal de tenants">
                                                     <ExternalLink size={12} />
                                                 </a>
                                             </div>
                                         </td>
                                         <td className={getCellClass(2)}>
                                             {isGraceExpired ? (
                                                 <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.15)]">
                                                     <div className="w-1.5 h-1.5 rounded-full mr-2 bg-red-500 animate-ping" />
                                                     Suspendido
                                                 </span>
                                             ) : !isGraceExpired && isExpired ? (
                                                 <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.15)]">
                                                     <div className="w-1.5 h-1.5 rounded-full mr-2 bg-orange-400 animate-pulse" />
                                                     En Gracia
                                                 </span>
                                             ) : (
                                                 <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${tenant.status === 'active'
                                                     ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                     : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                     }`}>
                                                     <div className={`w-1.5 h-1.5 rounded-full mr-2 ${tenant.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-yellow-500'}`} />
                                                     {tenant.status}
                                                 </span>
                                             )}
                                         </td>
                                         <td className={getCellClass(3)}>
                                             <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${planColors[tenant.plan] || 'bg-white/5 border-white/5 text-white/80'}`}>
                                                 <div className={`w-2 h-2 rounded-full ${planDotColors[tenant.plan] || 'bg-white/20'}`} />
                                                 <span className="text-[10px] font-black tracking-wider uppercase">{planNames[tenant.plan] || tenant.plan}</span>
                                             </div>
                                         </td>
                                         <td className={getCellClass(4)}>
                                             <div className="flex flex-col">
                                                 <div className={`flex items-center gap-1.5 font-mono text-xs ${
                                                     isGraceExpired 
                                                          ? 'text-red-400 font-bold drop-shadow-[0_0_6px_rgba(239,68,68,0.4)]' 
                                                          : isExpired 
                                                              ? 'text-orange-400 font-bold drop-shadow-[0_0_6px_rgba(249,115,22,0.4)]' 
                                                              : 'text-white/80'
                                                 }`}>
                                                     {isGraceExpired || isExpired ? (
                                                         <AlertTriangle size={12} className={isGraceExpired ? "text-red-400" : "text-orange-400"} />
                                                     ) : (
                                                         <Calendar size={12} className="text-primary/50" />
                                                     )}
                                                     {tenant.billing_end_date
                                                          ? new Date(tenant.billing_end_date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
                                                          : 'N/A'
                                                      }
                                                 </div>
                                                 <div className="flex flex-wrap gap-1 mt-1">
                                                     {isGraceExpired && (
                                                          <span className="inline-flex items-center gap-1 text-[8px] bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-[0_0_8px_rgba(239,68,68,0.25)] animate-pulse">
                                                              Vencido y Bloqueado
                                                          </span>
                                                     )}
                                                     {!isGraceExpired && isExpired && (
                                                          <span className="inline-flex items-center gap-1 text-[8px] bg-orange-500/20 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-[0_0_8px_rgba(249,115,22,0.25)]">
                                                              Periodo de Gracia
                                                          </span>
                                                     )}
                                                     {tenant.polar_customer_id && (
                                                          <span className="text-[8px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase w-fit">Polar Active</span>
                                                     )}
                                                 </div>
                                             </div>
                                         </td>
                                         <td className={getCellClass(5)}>
                                             <span className="text-primary/50 mr-1">$</span>
                                             {tenant.revenue.toLocaleString()}
                                         </td>
                                         <td className={getCellClass(6)}>
                                             <div className="flex items-center justify-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                 {tenant.status === 'active' && !isGraceExpired ? (
                                                     <button
                                                         onClick={() => handleOpenStatusModal(tenant, 'suspend')}
                                                         className="w-10 h-10 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-white rounded-xl flex items-center justify-center transition-all duration-300 border border-yellow-500/20 hover:scale-110 active:scale-95"
                                                         title="Suspender tenant"
                                                     >
                                                         <PauseCircle size={18} />
                                                     </button>
                                                 ) : tenant.status === 'suspended' || isGraceExpired ? (
                                                     <button
                                                         onClick={() => handleOpenStatusModal(tenant, 'reactivate')}
                                                         className="w-10 h-10 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white rounded-xl flex items-center justify-center transition-all duration-300 border border-green-500/20 hover:scale-110 active:scale-95"
                                                         title="Reactivar tenant"
                                                     >
                                                         <PlayCircle size={18} />
                                                     </button>
                                                 ) : null}
                                                 {tenant.polar_customer_id && (
                                                     <button
                                                         onClick={() => handleOpenPolarPortal(tenant.polar_customer_id)}
                                                         className="w-10 h-10 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-xl flex items-center justify-center transition-all duration-300 border border-blue-500/20 hover:scale-110 active:scale-95"
                                                         title="Gestionar en Polar"
                                                     >
                                                         <ArrowUpRight size={18} />
                                                     </button>
                                                 )}
                                                 <button
                                                     onClick={() => handleEditTenant(tenant)}
                                                     className="w-10 h-10 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl flex items-center justify-center transition-all duration-300 border border-primary/20 hover:scale-110 active:scale-95"
                                                     title="Administrar"
                                                 >
                                                     <Wrench size={18} />
                                                 </button>
                                                 <button
                                                     onClick={() => router.push(`/dashboard/tenants/${tenant.slug}/facturacion`)}
                                                     className="w-10 h-10 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-xl flex items-center justify-center transition-all duration-300 border border-emerald-500/20 hover:scale-110 active:scale-95"
                                                     title="Configurar Facturación"
                                                 >
                                                     <CreditCard size={18} />
                                                 </button>
                                                 <button
                                                     onClick={() => handleDeleteClick(tenant)}
                                                     className="w-10 h-10 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl flex items-center justify-center transition-all duration-300 border border-red-500/20 hover:scale-110 active:scale-95"
                                                     title="Eliminar Todo"
                                                 >
                                                     <Trash2 size={18} />
                                                 </button>
                                             </div>
                                         </td>
                                     </tr>
                                 );
                             }) : (
                                <tr>
                                    <td colSpan={8} className="px-8 py-20 text-center text-white/20 italic">
                                        No se encontraron empresas con esos criterios
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>


            <DeleteTenantModal
                isOpen={deleteModalOpen}
                tenant={selectedTenant}
                onClose={() => setDeleteModalOpen(false)}
                onSuccess={handleModalSuccess}
            />

            {/* Bulk delete confirmation modal */}
            {bulkDeleteConfirm && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0a192f] border border-red-500/20 rounded-3xl p-8 w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20">
                                <Trash2 size={20} className="text-red-400" />
                            </div>
                            <div>
                                <h3 className="font-black text-white">Eliminar {selectedSlugs.size} tenants</h3>
                                <p className="text-white/40 text-xs">Esta acción es irreversible</p>
                            </div>
                        </div>
                        <p className="text-white/50 text-sm mb-6">
                            Se eliminarán permanentemente <span className="text-red-400 font-bold">{selectedSlugs.size} empresas</span> y todos sus datos. No se puede deshacer.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setBulkDeleteConfirm(false)}
                                className="flex-1 py-3 rounded-2xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 font-bold transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleBulkAction('delete')}
                                className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-400 text-white font-bold transition-all active:scale-95"
                            >
                                Eliminar todo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status change modal */}
            {statusModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0a192f] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                {statusModal.action === 'suspend' ? (
                                    <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center border border-yellow-500/20">
                                        <PauseCircle size={20} className="text-yellow-400" />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20">
                                        <PlayCircle size={20} className="text-green-400" />
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-black text-white">
                                        {statusModal.action === 'suspend' ? 'Suspender Tenant' : 'Reactivar Tenant'}
                                    </h3>
                                    <p className="text-white/40 text-xs">{statusModal.tenant.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setStatusModal(null)} className="text-white/30 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {statusModal.action === 'suspend' && (
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">
                                    Motivo de suspensión
                                </label>
                                <textarea
                                    value={statusReason}
                                    onChange={e => setStatusReason(e.target.value)}
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-yellow-500/50 resize-none transition-all"
                                    placeholder="Ej: Pago vencido, incumplimiento de términos..."
                                />
                            </div>
                        )}

                        {statusModal.action === 'reactivate' && (
                            <p className="text-white/50 text-sm mb-6">
                                El tenant <span className="text-white font-bold">{statusModal.tenant.name}</span> volverá a tener acceso completo a la plataforma.
                            </p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStatusModal(null)}
                                className="flex-1 py-3 rounded-2xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 font-bold transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmStatusChange}
                                disabled={statusLoading}
                                className={`flex-1 py-3 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 ${
                                    statusModal.action === 'suspend'
                                        ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
                                        : 'bg-green-500 hover:bg-green-400 text-black'
                                }`}
                            >
                                {statusLoading ? 'Procesando...' : statusModal.action === 'suspend' ? 'Confirmar Suspensión' : 'Confirmar Reactivación'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

