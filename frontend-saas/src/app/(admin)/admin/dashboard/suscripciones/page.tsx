"use client";

import React, { useCallback, useMemo, useState } from 'react';
import { CreditCard, Filter } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import {
    useAdminBootstrap,
    useAdminTransactions,
    useAdminStats
} from '@/hooks/useAdminBootstrap';
import ReceiptPreviewModal from '@/components/admin/receipts/ReceiptPreviewModal';
import DeleteConfirmationModal from '@/components/admin/DeleteConfirmationModal';
import MetricsDashboard from '@/components/admin/subscriptions/MetricsDashboard';
import TransactionsTable from '@/components/admin/subscriptions/TransactionsTable';
import ApprovePaymentModal from '@/components/admin/subscriptions/ApprovePaymentModal';
import RejectPaymentModal from '@/components/admin/subscriptions/RejectPaymentModal';

export default function SubscriptionsAdminPage() {
    const { refetch: refetchBootstrap } = useAdminBootstrap();
    const allTransactions = useAdminTransactions();
    const bootstrapStats = useAdminStats();
    const { showToast } = useToast();

    const [approvingTxn, setApprovingTxn] = useState<any>(null);
    const [rejectingTxn, setRejectingTxn] = useState<any>(null);
    const [submittingApprove, setSubmittingApprove] = useState(false);
    const [submittingReject, setSubmittingReject] = useState(false);

    const [previewData, setPreviewData] = useState<any>(null);

    const [batchDelete, setBatchDelete] = useState<{ ids: number[]; deleting: boolean }>({ ids: [], deleting: false });
    const [singleDelete, setSingleDelete] = useState<{ txn: any | null; deleting: boolean }>({ txn: null, deleting: false });

    const pendingCount = useMemo(
        () => allTransactions.filter(t => t.payment_status === 'pending').length,
        [allTransactions]
    );

    // === Approve ===
    const handleApprove = useCallback((txn: any) => {
        setApprovingTxn(txn);
    }, []);

    const confirmApprove = useCallback(async (endDateIso: string | null) => {
        if (!approvingTxn) return;
        setSubmittingApprove(true);
        try {
            const body: any = {
                payment_status: 'completed',
                notes: (approvingTxn.notes || '') + ' [APROBADO POR ADMIN]'
            };
            if (endDateIso) body.end_date = endDateIso;

            await apiRequest(
                `/api/internal/creator/tenants/${approvingTxn.tenant_id}/billing/transactions/${approvingTxn.id}`,
                { method: 'PUT', body: JSON.stringify(body) }
            );

            setApprovingTxn(null);
            await refetchBootstrap();
            showToast('Pago aprobado', 'success');
        } catch (err: any) {
            showToast('Error: ' + (err.message || 'desconocido'), 'error');
        } finally {
            setSubmittingApprove(false);
        }
    }, [approvingTxn, refetchBootstrap, showToast]);

    // === Reject ===
    const handleReject = useCallback((txn: any) => {
        setRejectingTxn(txn);
    }, []);

    const confirmReject = useCallback(async (reason: string) => {
        if (!rejectingTxn) return;
        setSubmittingReject(true);
        try {
            await apiRequest(
                `/api/internal/creator/tenants/${rejectingTxn.tenant_id}/billing/transactions/${rejectingTxn.id}`,
                {
                    method: 'PUT',
                    body: JSON.stringify({
                        payment_status: 'failed',
                        notes: (rejectingTxn.notes || '') + ` [RECHAZADO: ${reason}]`
                    })
                }
            );
            setRejectingTxn(null);
            await refetchBootstrap();
            showToast('Solicitud rechazada', 'success');
        } catch (err: any) {
            showToast('Error: ' + (err.message || 'desconocido'), 'error');
        } finally {
            setSubmittingReject(false);
        }
    }, [rejectingTxn, refetchBootstrap, showToast]);

    // === Preview receipt ===
    const handlePreviewReceipt = useCallback((txn: any) => {
        setPreviewData({
            tenantName: txn.tenant_name || 'Cliente SaaS',
            tenantId: txn.tenant_id,
            planName: txn.target_plan_name || 'NORMAL',
            cycle: txn.effective_billing_cycle || txn.target_billing_cycle || 'monthly',
            amount: txn.amount,
            startDate: txn.payment_date || txn.created_at,
            endDate: txn.current_billing_end_date || new Date().toISOString()
        });
    }, []);

    // === Batch delete ===
    const handleBatchDelete = useCallback((ids: number[]) => {
        setBatchDelete({ ids, deleting: false });
    }, []);

    const confirmBatchDelete = useCallback(async () => {
        setBatchDelete(prev => ({ ...prev, deleting: true }));
        try {
            await apiRequest('/api/internal/billing/transactions/batch-delete', {
                method: 'POST',
                body: JSON.stringify({ transaction_ids: batchDelete.ids })
            });
            await refetchBootstrap();
            showToast(`${batchDelete.ids.length} transacciones eliminadas`, 'success');
            setBatchDelete({ ids: [], deleting: false });
        } catch (err: any) {
            showToast('Error al eliminar: ' + (err.message || 'desconocido'), 'error');
            setBatchDelete(prev => ({ ...prev, deleting: false }));
        }
    }, [batchDelete.ids, refetchBootstrap, showToast]);

    // === Single delete ===
    const handleDeleteSingle = useCallback((txn: any) => {
        setSingleDelete({ txn, deleting: false });
    }, []);

    const confirmDeleteSingle = useCallback(async () => {
        if (!singleDelete.txn) return;
        setSingleDelete(prev => ({ ...prev, deleting: true }));
        try {
            await apiRequest(`/api/internal/billing/transactions/${singleDelete.txn.id}`, { method: 'DELETE' });
            await refetchBootstrap();
            showToast('Transacción eliminada', 'success');
            setSingleDelete({ txn: null, deleting: false });
        } catch (err: any) {
            showToast('Error al eliminar: ' + (err.message || 'desconocido'), 'error');
            setSingleDelete(prev => ({ ...prev, deleting: false }));
        }
    }, [singleDelete.txn, refetchBootstrap, showToast]);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black mb-2 flex items-center gap-4">
                        <CreditCard className="text-primary" size={40} />
                        Gestión Global de Suscripciones
                    </h1>
                    <p className="text-white/40 font-medium">Supervisa ingresos, aprueba cambios de plan y gestiona la facturación de todos los tenants.</p>
                </div>
                <div className="flex gap-4">
                    <button className="bg-white/5 hover:bg-white/10 text-white/60 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                        <Filter size={16} /> Exportar Reporte
                    </button>
                </div>
            </header>

            <MetricsDashboard
                totalMrr={bootstrapStats?.total_mrr || 0}
                dueTodayCount={bootstrapStats?.due_today_count || 0}
                activeTenants={bootstrapStats?.active_tenants || 0}
                pendingRequests={pendingCount}
                cancellingTenantsCount={bootstrapStats?.cancelling_tenants_count || 0}
                growthData={bootstrapStats?.growth_data || []}
            />

            <TransactionsTable
                transactions={allTransactions}
                onApprove={handleApprove}
                onReject={handleReject}
                onPreviewReceipt={handlePreviewReceipt}
                onDeleteSingle={handleDeleteSingle}
                onBatchDelete={handleBatchDelete}
            />

            <ApprovePaymentModal
                txn={approvingTxn}
                submitting={submittingApprove}
                onClose={() => setApprovingTxn(null)}
                onConfirm={confirmApprove}
            />

            <RejectPaymentModal
                txn={rejectingTxn}
                submitting={submittingReject}
                onClose={() => setRejectingTxn(null)}
                onConfirm={confirmReject}
            />

            <DeleteConfirmationModal
                isOpen={batchDelete.ids.length > 0}
                onClose={() => setBatchDelete({ ids: [], deleting: false })}
                onConfirm={confirmBatchDelete}
                title="Eliminar transacciones seleccionadas"
                description={`¿Eliminar ${batchDelete.ids.length} transacción${batchDelete.ids.length === 1 ? '' : 'es'}? Esta acción no se puede deshacer.`}
                isDeleting={batchDelete.deleting}
            />

            <DeleteConfirmationModal
                isOpen={!!singleDelete.txn}
                onClose={() => setSingleDelete({ txn: null, deleting: false })}
                onConfirm={confirmDeleteSingle}
                title="Eliminar registro"
                description="¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer."
                isDeleting={singleDelete.deleting}
            />

            <ReceiptPreviewModal
                isOpen={!!previewData}
                onClose={() => setPreviewData(null)}
                data={previewData}
            />
        </div>
    );
}
