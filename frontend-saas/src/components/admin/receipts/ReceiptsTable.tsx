/**
 * Receipts Table Component
 * Displays paginated list of receipts with actions
 */
'use client';

import { useState } from 'react';
import { Eye, Download, XCircle, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export interface Receipt {
    id: number;
    receipt_number: string;
    tenant_id: number;
    tenant_name: string;
    tenant_email?: string;
    tenant_phone?: string;
    tenant_address?: string;
    plan_name: string;
    billing_cycle?: string;
    amount: number;
    currency: string;
    period_start_date?: string;
    period_end_date?: string;
    status: string;
    issued_at: string;
    pdf_url?: string;
    void_reason?: string;
    voided_at?: string;
}

interface ReceiptsTableProps {
    receipts: Receipt[];
    total: number;
    page: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onView: (receipt: Receipt) => void;
    onVoid: (receipt: Receipt) => void;
    onDelete: (receipt: Receipt) => void;
    loading?: boolean;
}

export default function ReceiptsTable({
    receipts,
    total,
    page,
    pageSize,
    onPageChange,
    onView,
    onVoid,
    onDelete,
    loading = false,
}: ReceiptsTableProps) {
    const totalPages = Math.ceil(total / pageSize);

    const getStatusBadge = (status: string) => {
        const styles = {
            active: 'bg-green-500/20 text-green-400 border-green-500/30',
            voided: 'bg-red-500/20 text-red-400 border-red-500/30',
            replaced: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        };

        const labels = {
            active: 'Activo',
            voided: 'Anulado',
            replaced: 'Reemplazado',
        };

        return (
            <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
                    }`}
            >
                {labels[status as keyof typeof labels] || status}
            </span>
        );
    };

    const handleDownload = (receipt: Receipt) => {
        if (!receipt.pdf_url) return;
        window.open(`http://localhost:8000${receipt.pdf_url}`, '_blank');
    };

    if (loading) {
        return (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
                <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
                    <p className="mt-4 text-white/60">Cargando recibos...</p>
                </div>
            </div>
        );
    }

    if (receipts.length === 0) {
        return (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-12 text-center">
                <p className="text-white/60 text-lg">No se encontraron recibos</p>
            </div>
        );
    }

    return (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-white/60 uppercase tracking-wider">
                                Número
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-white/60 uppercase tracking-wider">
                                Cliente
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-white/60 uppercase tracking-wider">
                                Plan
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-white/60 uppercase tracking-wider">
                                Monto
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-white/60 uppercase tracking-wider">
                                Fecha
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-white/60 uppercase tracking-wider">
                                Estado
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-white/60 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {receipts.map((receipt) => (
                            <tr key={receipt.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm font-bold text-blue-400">
                                        {receipt.receipt_number}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-white">
                                        {receipt.tenant_name}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm font-bold text-purple-400">
                                        {receipt.plan_name}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <span className="text-sm font-bold text-white">
                                        ${receipt.amount.toLocaleString('es-CL')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm text-white/60">
                                        {new Date(receipt.issued_at).toLocaleDateString('es-CL')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    {getStatusBadge(receipt.status)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => onView(receipt)}
                                            className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                            title="Ver detalles"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDownload(receipt)}
                                            className="p-1 hover:bg-white/10 rounded text-green-400 transition-colors"
                                            title="Descargar PDF"
                                        >
                                            <Download size={16} />
                                        </button>
                                        {receipt.status === 'active' && (
                                            <button
                                                onClick={() => onVoid(receipt)}
                                                className="p-1 hover:bg-white/10 rounded text-red-400 transition-colors"
                                                title="Anular recibo"
                                            >
                                                <XCircle size={16} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => onDelete(receipt)}
                                            className="p-1 hover:bg-white/10 rounded text-red-500 transition-colors"
                                            title="Eliminar permanentemente"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
                <div className="text-sm text-white/60">
                    Mostrando {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, total)} de {total}{' '}
                    recibos
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onPageChange(page - 1)}
                        disabled={page === 1}
                        className="p-2 rounded-lg border border-white/10 text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            const pageNum = i + 1;
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => onPageChange(pageNum)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${page === pageNum
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>
                    <button
                        onClick={() => onPageChange(page + 1)}
                        disabled={page === totalPages}
                        className="p-2 rounded-lg border border-white/10 text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
