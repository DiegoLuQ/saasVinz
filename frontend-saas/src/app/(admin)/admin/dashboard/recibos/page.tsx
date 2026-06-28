/**
 * Receipts Management Page
 * Main page for managing subscription receipts
 */
'use client';

import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import ReceiptStats from '@/components/admin/receipts/ReceiptStats';
import ReceiptFilters, { FilterValues } from '@/components/admin/receipts/ReceiptFilters';
import ReceiptsTable, { Receipt } from '@/components/admin/receipts/ReceiptsTable';
import ReceiptDetailModal from '@/components/admin/receipts/ReceiptDetailModal';


export default function ReceiptsPage() {
    const { showToast } = useToast();
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<FilterValues>({
        search: '',
        status: '',
        tenant_id: '',
        date_from: '',
        date_to: '',
    });
    const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        fetchReceipts();
    }, [page, filters]);

    const fetchReceipts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                page_size: pageSize.toString(),
            });

            if (filters.status) params.append('status', filters.status);
            if (filters.tenant_id) params.append('tenant_id', filters.tenant_id);
            if (filters.search) params.append('search', filters.search);

            const response = await fetch(`/api/internal/creator/receipts?${params}`);
            if (response.ok) {
                const data = await response.json();
                setReceipts(data.receipts);
                setTotal(data.total);
            }
        } catch (error) {
            console.error('Error fetching receipts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (newFilters: FilterValues) => {
        setFilters(newFilters);
        setPage(1); // Reset to first page when filters change
    };

    const handleView = (receipt: Receipt) => {
        setSelectedReceipt(receipt);
        setShowPreview(true);
    };

    const handleVoid = async (receipt: Receipt, reason: string) => {
        try {
            const response = await fetch(`/api/internal/creator/receipts/void/${receipt.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ void_reason: reason }),
            });

            if (response.ok) {
                fetchReceipts();
                showToast('Recibo anulado exitosamente', 'success');
            } else {
                const error = await response.json();
                showToast('Error al anular: ' + (error.detail || 'Error desconocido'), 'error');
            }
        } catch (error) {
            console.error('Error voiding receipt:', error);
            showToast('Error al anular el recibo', 'error');
        }
    };

    const handleDelete = async (receipt: Receipt) => {
        if (!confirm('¿Estás seguro de eliminar este recibo permanentemente?')) return;

        try {
            const response = await fetch(`/api/internal/creator/receipts/${receipt.id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                fetchReceipts();
                showToast('Recibo eliminado exitosamente', 'success');
            } else {
                const error = await response.json();
                showToast('Error al eliminar: ' + (error.detail || 'Error desconocido'), 'error');
            }
        } catch (error) {
            console.error('Error deleting receipt:', error);
            showToast('Error al eliminar el recibo', 'error');
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0f18] p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                            <FileText className="w-8 h-8 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white">Gestión de Recibos</h1>
                            <p className="text-white/60">Administra los recibos de suscripción generados</p>
                        </div>
                    </div>
                </div>

                {/* Statistics */}
                <ReceiptStats />

                {/* Filters */}
                <ReceiptFilters onFilterChange={handleFilterChange} />

                {/* Table */}
                <ReceiptsTable
                    receipts={receipts}
                    total={total}
                    page={page}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onView={handleView}
                    onVoid={(receipt) => {
                        setSelectedReceipt(receipt);
                        setShowPreview(true);
                    }}
                    onDelete={handleDelete}
                    loading={loading}
                />

                {/* Detail Modal */}
                {selectedReceipt && (
                    <ReceiptDetailModal
                        receipt={selectedReceipt}
                        isOpen={showPreview}
                        onClose={() => {
                            setShowPreview(false);
                            setSelectedReceipt(null);
                        }}
                        onVoid={handleVoid}
                    />
                )}
            </div>
        </div>
    );
}
