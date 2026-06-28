"use client";

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/admin/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import {
    useAdminBootstrap,
    useAdminStats,
    useAdminTenants,
    useAdminPlans,
    useAdminTransactions,
    useAdminDueSoon,
    type AdminBootstrapTenant,
    type DueSoonTenant
} from '@/hooks/useAdminBootstrap';
import PaymentReviewModal from '@/components/admin/notifications/PaymentReviewModal';
import DashboardSkeleton from '@/components/admin/dashboard/DashboardSkeleton';
import DashboardHeader from '@/components/admin/dashboard/DashboardHeader';
import StatsOverview from '@/components/admin/dashboard/StatsOverview';
import PendingTransactions from '@/components/admin/dashboard/PendingTransactions';
import TenantsTable from '@/components/admin/dashboard/TenantsTable';
import ExpiringSubscriptions from '@/components/admin/dashboard/ExpiringSubscriptions';
import TenantStatsModal from '@/components/admin/dashboard/TenantStatsModal';
import RejectTransactionModal from '@/components/admin/dashboard/RejectTransactionModal';

export default function CreatorDashboard() {
    const router = useRouter();
    const { showToast } = useToast();

    const { refetch: refetchBootstrap } = useAdminBootstrap();
    const bootstrapStats = useAdminStats();
    const bootstrapTenants = useAdminTenants();
    const bootstrapPlans = useAdminPlans();
    const allTransactions = useAdminTransactions();

    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTenantData, setSelectedTenantData] = useState<AdminBootstrapTenant | null>(null);
    const [statsModalOpen, setStatsModalOpen] = useState(false);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedTxn, setSelectedTxn] = useState<any>(null);
    const [rejectingTxn, setRejectingTxn] = useState<any>(null);

    const stats = bootstrapStats || { total_tenants: 0, active_tenants: 0, total_revenue: 0 };
    const tenants = bootstrapTenants || [];
    const availablePlans = bootstrapPlans || [];
    const dueSoonTenants = useAdminDueSoon();

    // Cuenta para la card "Vencen en 7 días": solo las próximas (no vencidas).
    // Viene del backend calculado sobre TODOS los tenants — antes se calculaba
    // sobre los 15 recientes del bootstrap y omitía tenants antiguos.
    const dueIn7Days = useMemo(() => {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        return dueSoonTenants.filter(t => new Date(t.billing_end_date) >= startOfToday).length;
    }, [dueSoonTenants]);

    const planBreakdown = useMemo(() => {
        const counts: Record<string, number> = {};
        tenants.forEach(t => { counts[t.plan] = (counts[t.plan] ?? 0) + 1; });
        const order = ['FREE', 'Track', 'NORMAL', 'PRO', 'ULTRA'];
        return order.filter(p => counts[p]).map(p => ({ plan: p, count: counts[p] }));
    }, [tenants]);
    const pendingTransactions = useMemo(
        () => allTransactions.filter(t => t.payment_status === 'pending'),
        [allTransactions]
    );
    const loading = !bootstrapStats && !error;

    const filteredTenants = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return tenants;
        return tenants.filter(t =>
            t.name?.toLowerCase().includes(q) ||
            t.slug?.toLowerCase().includes(q) ||
            t.email?.toLowerCase().includes(q) ||
            t.rut?.toLowerCase().includes(q)
        );
    }, [tenants, searchQuery]);

    const fetchData = async () => {
        try {
            setError('');
            await refetchBootstrap();
        } catch (err: any) {
            console.error('Error refetching dashboard data:', err);
            setError(err.message || 'Error al cargar el dashboard');
        }
    };

    const handleNewTenant = () => router.push('/dashboard/tenants/nuevo');
    const handleSeeAllTenants = () => router.push('/dashboard/tenants');
    const handleEditTenant = (tenant: AdminBootstrapTenant) => router.push(`/dashboard/tenants/${tenant.slug}`);

    const handleViewStats = (tenant: AdminBootstrapTenant) => {
        setSelectedTenantData(tenant);
        setStatsModalOpen(true);
    };

    const handleApproveTransaction = (txn: any) => {
        setSelectedTxn(txn);
        setReviewModalOpen(true);
    };

    const handleRejectTransaction = (txn: any) => {
        setRejectingTxn(txn);
    };

    const handleConfirmReject = async (reason: string) => {
        if (!rejectingTxn) return;
        try {
            await apiRequest(
                `/api/internal/creator/tenants/${rejectingTxn.tenant_id}/billing/transactions/${rejectingTxn.id}`,
                {
                    method: 'PUT',
                    body: JSON.stringify({
                        payment_status: 'failed',
                        notes: rejectingTxn.notes + ` [RECHAZADO: ${reason || 'Sin motivo especificado'}]`
                    })
                }
            );
            setRejectingTxn(null);
            fetchData();
            showToast('Transacción rechazada', 'success');
        } catch (err: any) {
            showToast('Error al rechazar: ' + err.message, 'error');
        }
    };

    if (loading) return <DashboardSkeleton />;

    if (error) return (
        <div className="p-8 flex items-center justify-center flex-col gap-4 min-h-[60vh]">
            <div className="text-red-400 text-xl font-bold">⚠️ Error</div>
            <div className="text-white/60">{error}</div>
            <button
                onClick={fetchData}
                className="px-6 py-3 bg-primary rounded-xl font-bold hover:bg-primary/90"
            >
                Reintentar
            </button>
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10">
            <DashboardHeader
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onNewTenant={handleNewTenant}
            />

            <PendingTransactions
                pendingTransactions={pendingTransactions}
                tenants={tenants}
                availablePlans={availablePlans}
                onApprove={handleApproveTransaction}
                onReject={handleRejectTransaction}
            />

            <StatsOverview
                totalTenants={stats.total_tenants}
                activeTenants={stats.active_tenants}
                totalRevenue={stats.total_revenue}
                dueIn7Days={dueIn7Days}
            />

            <ExpiringSubscriptions
                tenants={dueSoonTenants}
                onManage={(tenant: DueSoonTenant) => router.push(`/dashboard/tenants/${tenant.slug}`)}
            />

            {planBreakdown.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-5">Distribución por Plan</h3>
                    <div className="space-y-3">
                        {planBreakdown.map(({ plan, count }) => {
                            const pct = stats.total_tenants > 0 ? Math.round((count / stats.total_tenants) * 100) : 0;
                            const colors: Record<string, string> = {
                                FREE: 'bg-yellow-400',
                                Track: 'bg-cyan-400',
                                NORMAL: 'bg-blue-400',
                                PRO: 'bg-orange-500',
                                ULTRA: 'bg-emerald-400',
                            };
                            const textColors: Record<string, string> = {
                                FREE: 'text-yellow-400',
                                Track: 'text-cyan-400',
                                NORMAL: 'text-blue-400',
                                PRO: 'text-orange-500',
                                ULTRA: 'text-emerald-400',
                            };
                            return (
                                <div key={plan} className="flex items-center gap-4">
                                    <span className={`text-[10px] font-black uppercase tracking-wider w-14 ${textColors[plan] ?? 'text-white/60'}`}>{plan}</span>
                                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${colors[plan] ?? 'bg-white/20'}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-bold text-white/60 w-16 text-right">{count} ({pct}%)</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <TenantsTable
                tenants={filteredTenants}
                searchQuery={searchQuery}
                limit={15}
                onViewStats={handleViewStats}
                onEditTenant={handleEditTenant}
                onSeeAll={handleSeeAllTenants}
            />

            <TenantStatsModal
                isOpen={statsModalOpen}
                tenant={selectedTenantData}
                onClose={() => setStatsModalOpen(false)}
            />

            <RejectTransactionModal
                isOpen={!!rejectingTxn}
                onClose={() => setRejectingTxn(null)}
                onConfirm={handleConfirmReject}
            />

            <PaymentReviewModal
                isOpen={reviewModalOpen}
                onClose={() => setReviewModalOpen(false)}
                transactionId={selectedTxn?.id}
                tenantName={tenants.find(t => t.id === selectedTxn?.tenant_id)?.name}
                amount={selectedTxn?.amount}
                receiptUrl={selectedTxn?.payment_reference?.startsWith('http') ? selectedTxn.payment_reference : undefined}
                onSuccess={() => {
                    fetchData();
                    setReviewModalOpen(false);
                }}
            />
        </div>
    );
}
