"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { Download, ChevronLeft, Loader2, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import ReceiptTemplate from '@/components/tenant/billing/ReceiptTemplate';
import { useExportReceipt } from '@/hooks/useExportReceipt';

export default function ReceiptPage() {
    const { id } = useParams();
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [receiptData, setReceiptData] = useState<any>(null);
    const { exportToPDF, exporting } = useExportReceipt();
    const [config, setConfig] = useState<any>(null);

    useEffect(() => {
        const fetchReceipt = async () => {
            try {
                setLoading(true);
                let data;

                // If it looks like a reference (starts with POLAR_ or TRANSFER_), use the by-reference endpoint
                if (typeof id === 'string' && (id.startsWith('POLAR_') || id.startsWith('TRANSFER_'))) {
                    data = await apiRequest(`/api/internal/creator/receipts/by-reference/${id}`);
                } else {
                    data = await apiRequest(`/api/internal/creator/receipts/receipts/${id}`);
                }

                setReceiptData(data);

                // Fetch template config
                const templates = await apiRequest('/api/internal/creator/document-templates/templates?category=recibo_suscripcion&is_default=true');
                const defaultTemplate = templates.find((t: any) => t.is_default);
                if (defaultTemplate) {
                    setConfig({
                        ...defaultTemplate.sections_config,
                        advantages_list: defaultTemplate.advantages_list
                    });
                }
            } catch (err: any) {
                console.error("Error fetching receipt:", err);
                showToast("No se pudo cargar el recibo. Es posible que aún no haya sido generado.", "error");
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchReceipt();
    }, [id]);

    const handleDownload = async () => {
        if (!receiptData) return;
        const filename = `recibo-${receiptData.receipt_number}.pdf`;
        await exportToPDF(receiptData, filename);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0f18] flex flex-col items-center justify-center gap-4">
                <Loader2 className="text-primary animate-spin" size={40} />
                <p className="text-white/40 font-medium animate-pulse">Cargando recibo oficial...</p>
            </div>
        );
    }

    if (!receiptData) {
        return (
            <div className="min-h-screen bg-[#0a0f18] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6 font-black text-2xl">!</div>
                <h1 className="text-2xl font-bold mb-2">Recibo no encontrado</h1>
                <p className="text-white/40 max-w-md mb-8">
                    El documento solicitado no existe o aún está siendo procesado por el sistema de facturación.
                </p>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-primary font-bold hover:underline"
                >
                    <ChevronLeft size={20} /> Volver al Dashboard
                </button>
            </div>
        );
    }

    // Map backend Receipt model to ReceiptTemplate structure
    const templateData = {
        id: "receipt-content",
        receiptNumber: receiptData.receipt_number,
        tenantName: receiptData.tenant_name,
        tenantId: receiptData.tenant_id,
        planName: receiptData.plan_name,
        cycle: receiptData.billing_cycle,
        amount: receiptData.amount,
        startDate: receiptData.period_start_date,
        endDate: receiptData.period_end_date,
        advantages: config?.advantages_list,
        config: config,
        issuer: {
            name: receiptData.issuer_name,
            rut: receiptData.issuer_rut,
            address: receiptData.issuer_address,
            email: receiptData.issuer_email,
            logo_url: receiptData.issuer_logo_url,
        }
    };

    return (
        <div className="min-h-screen bg-[#060a11] text-white">
            {/* Minimal Header */}
            <div className="sticky top-0 z-50 bg-[#0a0f18]/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/dashboard/configuracion')}
                        className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/40 hover:text-white"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-sm font-bold flex items-center gap-2">
                            <FileText size={16} className="text-primary" /> Recibo {receiptData.receipt_number}
                        </h1>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">Documento Tributario SaaS</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDownload}
                        disabled={exporting}
                        className="px-6 py-2 bg-primary text-black rounded-xl font-bold text-xs flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/10"
                    >
                        {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        {exporting ? 'Generando...' : 'Descargar Recibo'}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-6 md:p-12 flex justify-center pb-32">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="shadow-2xl shadow-black/50"
                >
                    <ReceiptTemplate {...templateData} />
                </motion.div>
            </div>
        </div>
    );
}
