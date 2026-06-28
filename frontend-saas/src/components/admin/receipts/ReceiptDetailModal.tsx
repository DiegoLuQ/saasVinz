/**
 * Receipt Detail Modal Component
 * Displays saved receipt details with download and void actions
 */
'use client';

import { useState } from 'react';
import { X, Download, XCircle, CheckCircle } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with @react-pdf/renderer
const ReceiptPDFViewer = dynamic(() => import('./ReceiptPDFViewer'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center p-12">Cargando visor PDF...</div>
});

interface Receipt {
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
    metadata_json?: string;
}

interface ReceiptDetailModalProps {
    receipt: Receipt | null;
    isOpen: boolean;
    onClose: () => void;
    onVoid: (receipt: Receipt, reason: string) => void;
}

export default function ReceiptDetailModal({
    receipt,
    isOpen,
    onClose,
    onVoid,
}: ReceiptDetailModalProps) {
    const [showVoidDialog, setShowVoidDialog] = useState(false);
    const [voidReason, setVoidReason] = useState('');
    const [showPDFViewer, setShowPDFViewer] = useState(false);

    if (!isOpen || !receipt) return null;

    const handleVoidSubmit = () => {
        if (voidReason.trim()) {
            onVoid(receipt, voidReason);
            setShowVoidDialog(false);
            setVoidReason('');
            onClose();
        }
    };

    const cycleLabels: Record<string, string> = {
        monthly: 'Mensual',
        quarterly: 'Trimestral',
        semiannual: 'Semestral',
        yearly: 'Anual',
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900">Detalle del Recibo</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Número: <span className="font-bold text-blue-600">{receipt.receipt_number}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6">
                    {/* Status Badge */}
                    <div className="flex items-center gap-3">
                        {receipt.status === 'active' && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg border border-green-200">
                                <CheckCircle className="w-5 h-5" />
                                <span className="font-bold">Activo</span>
                            </div>
                        )}
                        {receipt.status === 'voided' && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg border border-red-200">
                                <XCircle className="w-5 h-5" />
                                <span className="font-bold">Anulado</span>
                            </div>
                        )}
                    </div>

                    {/* Client Info */}
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <h3 className="text-sm font-black uppercase tracking-wider text-gray-600 mb-4">
                            Información del Cliente
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs font-medium text-gray-500">Nombre</p>
                                <p className="text-base font-bold text-gray-900">{receipt.tenant_name}</p>
                            </div>
                            {receipt.tenant_email && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500">Email</p>
                                    <p className="text-sm text-gray-700">{receipt.tenant_email}</p>
                                </div>
                            )}
                            {receipt.tenant_phone && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500">Teléfono</p>
                                    <p className="text-sm text-gray-700">{receipt.tenant_phone}</p>
                                </div>
                            )}
                            {receipt.tenant_address && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500">Dirección</p>
                                    <p className="text-sm text-gray-700">{receipt.tenant_address}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Subscription Info */}
                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                        <h3 className="text-sm font-black uppercase tracking-wider text-blue-600 mb-4">
                            Información de Suscripción
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-medium text-blue-600">Plan</p>
                                <p className="text-lg font-black text-blue-900">{receipt.plan_name}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-blue-600">Ciclo</p>
                                <p className="text-base font-bold text-gray-900">
                                    {cycleLabels[receipt.billing_cycle || ''] || receipt.billing_cycle || 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-blue-600">Período</p>
                                <p className="text-sm text-gray-700">
                                    {new Date(receipt.period_start_date || Date.now()).toLocaleDateString('es-CL')} -{' '}
                                    {new Date(receipt.period_end_date || Date.now()).toLocaleDateString('es-CL')}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-blue-600">Monto</p>
                                <p className="text-xl font-black text-blue-900">
                                    ${receipt.amount.toLocaleString('es-CL')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Void Info */}
                    {receipt.status === 'voided' && receipt.void_reason && (
                        <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                            <h3 className="text-sm font-black uppercase tracking-wider text-red-600 mb-2">
                                Motivo de Anulación
                            </h3>
                            <p className="text-sm text-gray-700">{receipt.void_reason}</p>
                            {receipt.voided_at && (
                                <p className="text-xs text-gray-500 mt-2">
                                    Anulado el: {new Date(receipt.voided_at).toLocaleDateString('es-CL')}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Issue Date */}
                    <div>
                        <p className="text-xs font-medium text-gray-500">Fecha de Emisión</p>
                        <p className="text-sm text-gray-700">
                            {new Date(receipt.issued_at).toLocaleDateString('es-CL', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </p>
                    </div>
                </div>

                {/* PDF Viewer Section */}
                <div className="px-8 pb-6">
                    <button
                        onClick={() => setShowPDFViewer(!showPDFViewer)}
                        className="w-full px-6 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 border border-blue-200"
                    >
                        {showPDFViewer ? 'Ocultar' : 'Ver'} Vista Previa del PDF
                    </button>

                    {showPDFViewer && (
                        <div className="mt-4">
                            <ReceiptPDFViewer
                                receipt={{
                                    receipt_number: receipt.receipt_number,
                                    tenant_name: receipt.tenant_name,
                                    plan_name: receipt.plan_name,
                                    billing_cycle: receipt.billing_cycle || 'Mensual',
                                    amount: receipt.amount,
                                    currency: receipt.currency,
                                    period_start_date: receipt.period_start_date || new Date().toISOString(),
                                    period_end_date: receipt.period_end_date || new Date().toISOString(),
                                    issued_at: receipt.issued_at
                                }}
                                showViewer={true}
                            />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-8 py-6 flex items-center justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Cerrar
                    </button>
                    {receipt.status === 'active' && (
                        <button
                            onClick={() => setShowVoidDialog(true)}
                            className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                        >
                            <XCircle className="w-5 h-5" />
                            Anular Recibo
                        </button>
                    )}
                </div>
            </div>

            {/* Void Dialog */}
            {
                showVoidDialog && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
                        <div className="bg-white rounded-xl max-w-md w-full p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Anular Recibo</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Por favor, indica el motivo de la anulación:
                            </p>
                            <textarea
                                value={voidReason}
                                onChange={(e) => setVoidReason(e.target.value)}
                                placeholder="Ej: Error en el monto facturado"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                                rows={4}
                            />
                            <div className="flex items-center justify-end gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setShowVoidDialog(false);
                                        setVoidReason('');
                                    }}
                                    className="px-4 py-2 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleVoidSubmit}
                                    disabled={!voidReason.trim()}
                                    className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Confirmar Anulación
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
