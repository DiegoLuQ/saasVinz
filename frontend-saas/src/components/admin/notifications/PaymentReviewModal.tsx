import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { format, addDays } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, CheckCircle, ExternalLink, X, Download, Search } from 'lucide-react';
import { apiRequest, getImageUrl } from '@/lib/admin/api';
import ReceiptPreviewModal from '../receipts/ReceiptPreviewModal';

interface PaymentReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    notification?: any;
    transactionId?: number;
    tenantName?: string;
    amount?: number;
    receiptUrl?: string;
    onSuccess: () => void;
}

export default function PaymentReviewModal({
    isOpen,
    onClose,
    notification,
    transactionId: propTransactionId,
    tenantName: propTenantName,
    amount: propAmount,
    receiptUrl: propReceiptUrl,
    onSuccess
}: PaymentReviewModalProps) {
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState('');
    const [notes, setNotes] = useState('');
    const [imageError, setImageError] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successData, setSuccessData] = useState<any>(null);
    const [previewData, setPreviewData] = useState<any>(null);
    const [transactionStatus, setTransactionStatus] = useState<string>('pending');

    // Initial data from notification or props
    const transactionId = propTransactionId || notification?.data?.transaction_id;
    const amount = propAmount || notification?.data?.amount;
    const receiptUrl = propReceiptUrl || notification?.data?.receipt_url;
    const tenantName = propTenantName || notification?.data?.tenant_name || notification?.title?.split(':')[1]?.trim();

    useEffect(() => {
        if (isOpen) {
            // Reset state
            const today = new Date().toISOString().split('T')[0];
            setStartDate(today);
            calculateEndDate(today);
            setNotes('');
            setImageError(false);
            setZoomLevel(1);
            setShowSuccess(false);
            setSuccessData(null);

            // Fetch transaction status
            if (transactionId && transactionId !== 'undefined' && transactionId !== 'null') {
                fetchTransactionStatus();
            }
        }
    }, [isOpen, transactionId]);

    const fetchTransactionStatus = async () => {
        if (!transactionId || transactionId === 'undefined' || transactionId === 'null') {
            setTransactionStatus('not_found');
            return;
        }
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') || localStorage.getItem('token') : null;
            const res = await fetch(`/api/internal/billing/transactions/${transactionId}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (res.ok) {
                const response = await res.json();
                setTransactionStatus(response.status || 'pending');
            } else {
                setTransactionStatus('not_found');
            }
        } catch (error) {
            console.error('Error fetching transaction status:', error);
            setTransactionStatus('not_found');
        }
    };

    const calculateEndDate = (start: string) => {
        if (!start) return;
        try {
            const date = new Date(start);
            const end = addDays(date, 31);
            setEndDate(end.toISOString().split('T')[0]);
        } catch (e) {
            console.error("Invalid date");
        }
    };

    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setStartDate(val);
        calculateEndDate(val);
    };

    const handleApprove = async () => {
        if (!startDate || !endDate) return;

        setLoading(true);
        try {
            // 1. Approve payment
            const response = await apiRequest(`/api/internal/billing/approve-payment/${transactionId}`, {
                method: 'POST',
                body: JSON.stringify({
                    start_date: new Date(startDate).toISOString(),
                    end_date: new Date(endDate).toISOString(),
                    notes: notes
                })
            });

            // 2. Create receipt record (PDF will be generated on frontend)
            try {
                const receiptData = {
                    tenant_id: notification?.data?.tenant_id,
                    transaction_id: transactionId,
                    tenant_name: tenantName || 'Cliente SaaS',
                    tenant_email: notification?.data?.tenant_email || '',
                    plan_name: notification?.data?.plan_name || 'Plan Estándar',
                    billing_cycle: notification?.data?.billing_cycle || 'monthly',
                    amount: amount || 0,
                    currency: 'CLP',
                    period_start_date: new Date(startDate).toISOString(),
                    period_end_date: new Date(endDate).toISOString()
                };

                const receiptResponse = await apiRequest('/api/internal/creator/receipts/generate', {
                    method: 'POST',
                    body: JSON.stringify(receiptData)
                });

                console.log('✅ Recibo creado:', receiptResponse.receipt_number);
                // Store receipt data for frontend PDF generation
                setSuccessData({
                    ...response,
                    receipt: receiptResponse
                });
            } catch (receiptError) {
                console.error('⚠️ Error al crear recibo (el pago fue aprobado):', receiptError);
                setSuccessData(response);
            }

            setShowSuccess(true);
            onSuccess();
        } catch (error) {
            console.error("Error approving payment", error);
        } finally {
            setLoading(false);
        }
    };

    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 3));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
    const handleResetZoom = () => setZoomLevel(1);

    // If we have neither notification nor transactionId, we can't show anything
    if (!notification && !transactionId) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl bg-[#0f1219] text-white border-white/10 p-0 overflow-hidden gap-0 h-[80vh] flex flex-col">
                {showSuccess ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-green-500 mb-6">
                            <CheckCircle size={48} />
                        </div>
                        <h2 className="text-3xl font-bold mb-2">Pago Aprobado</h2>
                        <p className="text-white/60 mb-8 max-w-md">
                            El plan del tenant **{tenantName}** ha sido actualizado correctamente.
                        </p>

                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 w-full max-w-sm mb-8">
                            <p className="text-sm text-white/40 mb-1 font-medium uppercase tracking-wider">Próxima Fecha de Expiración</p>
                            <p className="text-2xl font-bold text-primary">
                                {endDate ? format(new Date(endDate), 'dd/MM/yyyy') : '---'}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-colors"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={() => {
                                    setPreviewData({
                                        tenantName: tenantName || 'Cliente SaaS',
                                        tenantId: notification?.data?.tenant_id || 0,
                                        planName: notification?.data?.plan_name || 'Plan Estándar',
                                        cycle: notification?.data?.billing_cycle || 'monthly',
                                        amount: amount || 0,
                                        startDate: startDate,
                                        endDate: endDate
                                    });
                                }}
                                className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                            >
                                <Search size={18} />
                                Ver y Descargar Recibo
                            </button>
                        </div>

                        {/* Receipt Preview Modal */}
                        <ReceiptPreviewModal
                            isOpen={!!previewData}
                            onClose={() => setPreviewData(null)}
                            data={previewData}
                        />
                    </div>
                ) : (
                    <div className="flex h-full">
                        {/* Left: Receipt Image */}
                        <div className="w-1/2 bg-black/40 relative flex flex-col items-center justify-center border-r border-white/5 overflow-hidden">
                            <div className="absolute top-4 right-4 z-10 flex gap-2 bg-black/60 p-1.5 rounded-lg backdrop-blur-sm border border-white/10 shadow-lg">
                                <button onClick={handleZoomOut} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-md text-white transition-colors">
                                    <span className="text-xl font-bold mb-1">-</span>
                                </button>
                                <button onClick={handleResetZoom} className="px-2 h-8 flex items-center justify-center hover:bg-white/10 rounded-md text-white transition-colors text-xs font-medium">
                                    {Math.round(zoomLevel * 100)}%
                                </button>
                                <button onClick={handleZoomIn} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-md text-white transition-colors">
                                    <span className="text-xl font-bold mb-1">+</span>
                                </button>
                            </div>

                            {!receiptUrl ? (
                                <div className="text-center text-white/40 p-6">
                                    <p className="font-semibold text-lg mb-1">Sin Comprobante</p>
                                    <p className="text-sm">El usuario no adjuntó una imagen de comprobante para este pago.</p>
                                </div>
                            ) : imageError ? (
                                <div className="text-center text-white/40 p-6">
                                    <p className="font-semibold text-lg mb-1">Error al Cargar Imagen</p>
                                    <p className="text-sm">No se pudo cargar la imagen del comprobante.</p>
                                </div>
                            ) : (
                                <div className="relative w-full h-full flex items-center justify-center overflow-auto p-4 custom-scrollbar">
                                    <div style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.2s ease-out' }} className="origin-center">
                                        <img
                                            src={getImageUrl(receiptUrl)}
                                            alt="Comprobante"
                                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                                            crossOrigin="anonymous"
                                            referrerPolicy="no-referrer"
                                            onError={() => setImageError(true)}
                                        />
                                    </div>
                                    <a href={getImageUrl(receiptUrl)} target="_blank" rel="noopener noreferrer" className="absolute bottom-4 left-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg text-xs flex items-center gap-2 transition-colors z-10">
                                        <ExternalLink size={14} /> Abrir Original
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Right: Details & Action */}
                        <div className="w-1/2 flex flex-col h-full border-l border-white/5">
                            <div className="p-6 border-b border-white/5">
                                <DialogTitle className="text-xl font-bold mb-1">Revisión de Pago</DialogTitle>
                                <DialogDescription className="text-white/40 text-sm">Verifica los detalles antes de aprobar.</DialogDescription>
                            </div>

                            <div className="p-6 flex-1 space-y-6 overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                        <span className="text-xs text-white/40 block mb-1">Tenant</span>
                                        <span className="font-bold">{tenantName}</span>
                                    </div>
                                    <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20 text-green-400">
                                        <span className="text-xs text-green-400/60 block mb-1">Monto Reportado</span>
                                        <span className="font-bold text-lg">${amount ? parseInt(amount).toLocaleString() : '0'}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-white/40 flex items-center gap-2"><CalendarIcon size={12} /> Fecha de Inicio</label>
                                        <input type="date" value={startDate} onChange={handleStartDateChange} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-white/40 flex items-center gap-2"><CalendarIcon size={12} /> Fecha de Expiración</label>
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-white/40">Notas (Opcional)</label>
                                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones internas..." className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none h-20 resize-none text-sm" />
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-white/5 bg-black/20 flex gap-3">
                                <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-colors" disabled={loading}>Cancelar</button>
                                {transactionStatus === 'pending' ? (
                                    <button onClick={handleApprove} className="flex-[2] py-3 rounded-xl font-bold bg-green-500 hover:bg-green-600 text-white transition-colors flex items-center justify-center gap-2" disabled={loading}>
                                        {loading && <Loader2 size={16} className="animate-spin" />}
                                        {loading ? 'Procesando...' : 'Aprobar Pago y Activar'}
                                    </button>
                                ) : transactionStatus === 'not_found' ? (
                                    <div className="flex-[2] py-3 rounded-xl font-bold bg-red-500/20 text-red-400 flex items-center justify-center gap-2 border border-red-500/30 text-xs">
                                        Transacción No Encontrada
                                    </div>
                                ) : (
                                    <div className="flex-[2] py-3 rounded-xl font-bold bg-green-500/20 text-green-400 flex items-center justify-center gap-2 border border-green-500/30">
                                        <CheckCircle size={16} />
                                        Pago Ya Aprobado
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
