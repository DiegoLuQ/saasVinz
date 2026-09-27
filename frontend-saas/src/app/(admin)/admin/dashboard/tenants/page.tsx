"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus,
    Search,
    MapPin,
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

import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function TenantsPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    // Lista completa (el bootstrap del dashboard solo trae las 15 más recientes)
    const { data: tenants = [], isLoading: loading } = useQuery<any[]>({
        queryKey: ['admin-tenants'],
        queryFn: () => apiRequest('/api/internal/creator/tenants'),
        staleTime: 30 * 1000,
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [planFilter, setPlanFilter] = useState('');
    const [regionFilter, setRegionFilter] = useState('');

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

    // Tras un cambio se refrescan la tabla y el dashboard (que también lista tenants)
    const fetchData = () => {
        queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
        queryClient.invalidateQueries({ queryKey: ['admin-bootstrap'] });
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
                (action === 'delete'
                    ? apiRequest(`/api/internal/creator/tenants/${slug}`, { method: 'DELETE' })
                    : apiRequest(`/api/internal/creator/tenants/${slug}`, {
                          method: 'PUT',
                          body: JSON.stringify({
                              status: action === 'suspend' ? 'suspended' : 'active',
                              pending_reason: action === 'suspend' ? 'Suspensión masiva por administrador.' : '',
                          }),
                      })
                ).finally(() => setBulkProgress(p => ({ ...p, done: p.done + 1 })))
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
            ['Empresa', 'Slug', 'Ciudad', 'Región', 'País', 'Plan', 'Estado', 'Vencimiento', 'Revenue MRR'],
            ...filteredTenants.map(t => [
                t.name,
                t.slug,
                t.city ?? '',
                t.region ?? '',
                t.country ?? '',
                t.plan,
                t.status,
                t.billing_end_date ? new Date(t.billing_end_date).toLocaleDateString('es-CL') : 'N/A',
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

    const q = searchTerm.trim().toLowerCase();
    const filteredTenants = tenants.filter(t =>
        (!q || [t.name, t.slug, t.city, t.region, t.country].some(v => (v || '').toLowerCase().includes(q))) &&
        (!planFilter || t.plan === planFilter) &&
        (!regionFilter || t.region === regionFilter)
    );
    const planOptions = Array.from(new Set(tenants.map(t => t.plan).filter(Boolean))) as string[];
    const regionOptions = (Array.from(new Set(tenants.map(t => t.region).filter(Boolean))) as string[]).sort();

    const planColors: Record<string, string> = {
        'FREE': 'text-yellow-400 border-yellow-400/20 bg-yellow-400/10',
        'TRACK': 'text-cyan-400 border-cyan-400/20 bg-cyan-400/10',
        'NORMAL': 'text-blue-400 border-blue-400/20 bg-blue-400/10',
        'PRO': 'text-orange-500 border-orange-500/20 bg-orange-500/10',
        'ULTRA': 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10',
    };

    const planDotColors: Record<string, string> = {
        'FREE': 'bg-yellow-400',
        'TRACK': 'bg-cyan-400',
        'NORMAL': 'bg-blue-400',
        'PRO': 'bg-orange-500',
        'ULTRA': 'bg-emerald-400',
    };

    const planNames: Record<string, string> = {
        'FREE': 'Free',
        'TRACK': 'Track',
        'NORMAL': 'Normal',
        'PRO': 'Pro',
        'ULTRA': 'Ultra',
    };

    const selectCls = 'bg-[#0a192f] border border-white/10 rounded-2xl py-3.5 px-4 text-sm text-white/80 outline-none focus:border-primary/50 transition-all cursor-pointer';
    const actionBtn = 'w-8 h-8 rounded-lg flex items-center justify-center transition-all border active:scale-95';

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 min-h-screen">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-white italic tracking-tight">Administración de Tenants</h2>
                    <p className="text-white/40 text-sm">
                        Gestiona todas las empresas registradas en la plataforma
                        {!loading && <span className="text-white/60 font-bold"> · {filteredTenants.length} de {tenants.length}</span>}
                    </p>
                </div>

                <button
                    onClick={handleCreateTenant}
                    className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                    <Plus size={20} /> Nuevo Tenant
                </button>
            </header>

            {/* Toolbar */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, slug, ciudad, región o país..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#0a192f] border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white outline-none focus:border-primary/50 transition-all shadow-xl"
                    />
                </div>
                <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className={selectCls} aria-label="Filtrar por plan">
                    <option value="">Todos los planes</option>
                    {planOptions.map(p => <option key={p} value={p}>{planNames[p] || p}</option>)}
                </select>
                <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} className={selectCls} aria-label="Filtrar por región">
                    <option value="">Todas las regiones</option>
                    {regionOptions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
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
                    <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-[10px] uppercase font-black text-white/40 tracking-widest">
                            <tr>
                                <th className="pl-5 pr-2 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        checked={filteredTenants.length > 0 && selectedSlugs.size === filteredTenants.length}
                                        onChange={toggleAll}
                                        className="w-4 h-4 rounded accent-primary cursor-pointer"
                                        aria-label="Seleccionar todos"
                                    />
                                </th>
                                <th className="px-4 py-4">Empresa</th>
                                <th className="px-4 py-4">Ubicación</th>
                                <th className="px-4 py-4">Estado</th>
                                <th className="px-4 py-4">Plan</th>
                                <th className="px-4 py-4">Vencimiento</th>
                                <th className="px-4 py-4 text-right">MRR</th>
                                <th className="px-4 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredTenants.length > 0 ? filteredTenants.map((tenant) => {
                                const isFree = tenant.plan === 'FREE';
                                const now = new Date();
                                const billingEndDate = tenant.billing_end_date ? new Date(tenant.billing_end_date) : null;
                                const isExpired = !isFree && billingEndDate && now > billingEndDate;
                                // Período de gracia: 3 días
                                const isGraceExpired = !isFree && billingEndDate && now > new Date(billingEndDate.getTime() + 3 * 24 * 60 * 60 * 1000);
                                const rowTint = isGraceExpired
                                    ? 'bg-red-500/[0.04] hover:bg-red-500/[0.07]'
                                    : isExpired
                                        ? 'bg-orange-500/[0.03] hover:bg-orange-500/[0.05]'
                                        : 'hover:bg-white/[0.03]';
                                const isSelected = selectedSlugs.has(tenant.slug);
                                const place = [tenant.city, tenant.region].filter(Boolean).join(', ');

                                return (
                                    <tr key={tenant.id} className={`group transition-colors ${isSelected ? 'bg-primary/5' : rowTint}`}>
                                        <td className="pl-5 pr-2 py-4 relative">
                                            {(isGraceExpired || isExpired) && (
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isGraceExpired ? 'bg-red-500' : 'bg-orange-400'}`} />
                                            )}
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelect(tenant.slug)}
                                                className="w-4 h-4 rounded accent-primary cursor-pointer"
                                                aria-label={`Seleccionar ${tenant.name}`}
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${
                                                    isGraceExpired
                                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                        : isExpired
                                                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                                            : 'bg-white/5 text-primary'
                                                }`}>
                                                    {isGraceExpired || isExpired ? <AlertTriangle size={16} /> : <Building2 size={16} />}
                                                </div>
                                                <div className="min-w-0">
                                                    <button
                                                        onClick={() => handleEditTenant(tenant)}
                                                        className={`font-bold leading-tight truncate max-w-[220px] block text-left hover:underline ${
                                                            isGraceExpired ? 'text-red-200' : isExpired ? 'text-orange-200' : 'text-white'
                                                        }`}
                                                        title={tenant.name}
                                                    >
                                                        {tenant.name}
                                                    </button>
                                                    <div className="text-[10px] text-white/30 font-mono mt-0.5">/{tenant.slug}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            {place || tenant.country ? (
                                                <div className="flex items-start gap-1.5 min-w-0">
                                                    <MapPin size={12} className="text-primary/50 mt-0.5 shrink-0" />
                                                    <div className="min-w-0">
                                                        <div className="text-xs text-white/80 truncate max-w-[180px]" title={place}>{place || '—'}</div>
                                                        <div className="text-[10px] text-white/35 uppercase tracking-wider font-bold">{tenant.country || '—'}</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-white/20 italic">Sin ubicación</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            {isGraceExpired ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border bg-red-500/10 text-red-400 border-red-500/20">
                                                    <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-red-500" />
                                                    Bloqueado
                                                </span>
                                            ) : isExpired ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border bg-orange-500/10 text-orange-400 border-orange-500/20">
                                                    <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-orange-400" />
                                                    En gracia
                                                </span>
                                            ) : (
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${tenant.status === 'active'
                                                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                    : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${tenant.status === 'active' ? 'bg-green-400' : 'bg-yellow-500'}`} />
                                                    {tenant.status === 'active' ? 'Activo' : tenant.status === 'suspended' ? 'Suspendido' : tenant.status}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${planColors[tenant.plan] || 'bg-white/5 border-white/5 text-white/80'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${planDotColors[tenant.plan] || 'bg-white/20'}`} />
                                                <span className="text-[10px] font-black tracking-wider uppercase">{planNames[tenant.plan] || tenant.plan}</span>
                                            </div>
                                            {tenant.demo_plan_name && (
                                                <div className="text-[9px] text-violet-300 font-bold uppercase tracking-wider mt-1">Demo {tenant.demo_plan_name}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className={`flex items-center gap-1.5 font-mono text-xs whitespace-nowrap ${
                                                isGraceExpired ? 'text-red-400 font-bold' : isExpired ? 'text-orange-400 font-bold' : 'text-white/70'
                                            }`}>
                                                <Calendar size={12} className="opacity-50" />
                                                {billingEndDate
                                                    ? billingEndDate.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
                                                    : 'N/A'}
                                            </div>
                                            {tenant.polar_customer_id && (
                                                <span className="inline-block mt-1 text-[8px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase">Polar</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-right font-mono font-bold text-white/90 whitespace-nowrap">
                                            <span className="text-primary/50 mr-0.5">$</span>
                                            {Number(tenant.revenue || 0).toLocaleString('es-CL')}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {tenant.status === 'active' && !isGraceExpired ? (
                                                    <button
                                                        onClick={() => handleOpenStatusModal(tenant, 'suspend')}
                                                        className={`${actionBtn} bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-black border-yellow-500/20`}
                                                        title="Suspender"
                                                        aria-label={`Suspender ${tenant.name}`}
                                                    >
                                                        <PauseCircle size={15} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleOpenStatusModal(tenant, 'reactivate')}
                                                        className={`${actionBtn} bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-black border-green-500/20`}
                                                        title="Reactivar"
                                                        aria-label={`Reactivar ${tenant.name}`}
                                                    >
                                                        <PlayCircle size={15} />
                                                    </button>
                                                )}
                                                {tenant.polar_customer_id && (
                                                    <button
                                                        onClick={() => handleOpenPolarPortal(tenant.polar_customer_id)}
                                                        className={`${actionBtn} bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border-blue-500/20`}
                                                        title="Gestionar en Polar"
                                                        aria-label={`Gestionar ${tenant.name} en Polar`}
                                                    >
                                                        <ArrowUpRight size={15} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleEditTenant(tenant)}
                                                    className={`${actionBtn} bg-primary/10 hover:bg-primary text-primary hover:text-white border-primary/20`}
                                                    title="Administrar"
                                                    aria-label={`Administrar ${tenant.name}`}
                                                >
                                                    <Wrench size={15} />
                                                </button>
                                                <button
                                                    onClick={() => router.push(`/dashboard/tenants/${tenant.slug}/facturacion`)}
                                                    className={`${actionBtn} bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border-emerald-500/20`}
                                                    title="Facturación"
                                                    aria-label={`Facturación de ${tenant.name}`}
                                                >
                                                    <CreditCard size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(tenant)}
                                                    className={`${actionBtn} bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border-red-500/20`}
                                                    title="Eliminar"
                                                    aria-label={`Eliminar ${tenant.name}`}
                                                >
                                                    <Trash2 size={15} />
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
                    </div>
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

