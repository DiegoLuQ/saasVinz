"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Printer, RefreshCw } from 'lucide-react';
import Modal from '@/components/tenant/Modal';
import { apiRequest } from '@/lib/tenant/api';
import type { Cremation, SelectedPlan, SelectedProduct, SelectedService } from '@/lib/tenant/orders/types';

/**
 * Vista previa del recibo con lo que hay en Editar Orden, aunque no esté
 * guardado. Usa la misma plantilla y cálculo que el recibo real
 * (POST /api/internal/ops-records/receipt/preview; no guarda nada).
 */
interface Props {
    isOpen: boolean;
    onClose: () => void;
    editId: string | null;
    currentCremation: Partial<Cremation>;
    selectedServices: SelectedService[];
    selectedPlans: SelectedPlan[];
    selectedProducts: SelectedProduct[];
}

export default function ReceiptPreviewModal({
    isOpen, onClose, editId, currentCremation, selectedServices, selectedPlans, selectedProducts,
}: Props) {
    const [html, setHtml] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const frameRef = useRef<HTMLIFrameElement>(null);

    const load = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiRequest('/api/internal/ops-records/receipt/preview', {
                method: 'POST',
                body: JSON.stringify({
                    cremation_id: editId ? Number(editId) : null,
                    pet_id: currentCremation.pet_id || null,
                    services: selectedServices.map(s => ({ id: s.service_id, price: s.unit_price || 0, quantity: 1 })),
                    plans: selectedPlans.map(p => ({ id: p.plan_id, price: p.unit_price || 0, quantity: 1 })),
                    products: selectedProducts.map(p => ({ id: p.product_id, price: p.unit_price || 0, quantity: p.quantity || 1, plan_id: p.plan_id ?? null })),
                    weight: currentCremation.weight || null,
                    weight_price: currentCremation.weight_price || 0,
                    discount: currentCremation.discount || 0,
                    agreement_id: currentCremation.agreement_id || null,
                    scheduled_at: currentCremation.scheduled_at || null,
                    address: currentCremation.address || null,
                }),
            });
            setHtml(res.html_content);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'No se pudo generar la vista previa');
        } finally {
            setLoading(false);
        }
    }, [editId, currentCremation, selectedServices, selectedPlans, selectedProducts]);

    // Se genera al abrir (con los datos de ese momento); «Actualizar» la rehace.
    useEffect(() => {
        if (isOpen) load();
        else setHtml(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Vista previa del recibo" maxWidth="max-w-3xl">
            <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                        Con los datos actuales de la orden{editId ? '' : ' (aún sin guardar)'}. No se guarda ni se envía.
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={load}
                            disabled={loading}
                            className="h-9 px-3 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
                        </button>
                        <button
                            type="button"
                            onClick={() => frameRef.current?.contentWindow?.print()}
                            disabled={!html || loading}
                            className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <Printer size={14} /> Imprimir
                        </button>
                    </div>
                </div>

                <div className="relative rounded-2xl border border-border overflow-hidden bg-white h-[70vh]">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
                            <Loader2 className="animate-spin text-primary" size={32} />
                        </div>
                    )}
                    {error ? (
                        <div className="h-full flex items-center justify-center p-6 text-center text-sm text-red-600">{error}</div>
                    ) : html ? (
                        <iframe ref={frameRef} title="Recibo" srcDoc={html} className="w-full h-full border-0" />
                    ) : null}
                </div>
            </div>
        </Modal>
    );
}
