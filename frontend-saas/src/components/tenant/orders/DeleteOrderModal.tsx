"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import Modal from '@/components/tenant/Modal';
import { apiRequest } from '@/lib/tenant/api';
import { useDeleteCremation } from '@/hooks/useCremations';

// GET /api/internal/cremations/{id}/delete-preview
interface DeletePreview {
    oc_number?: number | null;
    verification_code?: string | null;
    pet_name?: string | null;
    customer_name?: string | null;
    servicios: number;
    planes: number;
    productos: number;
    certificados: number;
    documentos: number;
    evidencias: number;
    fotos: number;
    tareas_logistica: number;
    comision: { amount: number; status: string } | null;
    fotos_mascota: number;
}

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

interface Props {
    isOpen: boolean;
    orderId: number;
    onClose: () => void;
    onDeleted: () => void;
}

// Montar solo mientras está abierto (así la confirmación parte desmarcada).
export default function DeleteOrderModal({ isOpen, orderId, onClose, onDeleted }: Props) {
    const [confirmed, setConfirmed] = useState(false);
    const deleteMutation = useDeleteCremation();


    const { data: preview, isLoading, error } = useQuery<DeletePreview>({
        queryKey: ['cremation-delete-preview', orderId],
        queryFn: () => apiRequest(`/api/internal/cremations/${orderId}/delete-preview`),
        enabled: isOpen && !!orderId,
        staleTime: 0,
    });

    const handleDelete = async () => {
        try {
            await deleteMutation.mutateAsync(orderId);
            onDeleted();
        } catch {
            // el hook ya muestra el toast de error
        }
    };

    // Solo lo que existe en esta orden; los datos de la orden siempre se borran.
    const lines: string[] = [];
    if (preview) {
        lines.push('Los datos de la orden: logística, agenda, detalle financiero y estado de la operación');
        const sales = [
            preview.planes ? plural(preview.planes, 'plan', 'planes') : '',
            preview.servicios ? plural(preview.servicios, 'servicio', 'servicios') : '',
            preview.productos ? plural(preview.productos, 'producto', 'productos') + ' (vuelven al stock)' : '',
        ].filter(Boolean);
        if (sales.length) lines.push(`Lo vendido: ${sales.join(', ')}`);
        if (preview.evidencias) lines.push(`${plural(preview.evidencias, 'registro', 'registros')} de etapas del proceso (evidencias)`);
        if (preview.fotos) lines.push(`${plural(preview.fotos, 'foto', 'fotos')} de la orden y de las etapas (se borran del almacenamiento)`);
        if (preview.certificados) lines.push(`${plural(preview.certificados, 'certificado emitido', 'certificados emitidos')}`);
        if (preview.documentos) lines.push(`${plural(preview.documentos, 'documento adjunto', 'documentos adjuntos')}`);
        if (preview.tareas_logistica) lines.push(`${plural(preview.tareas_logistica, 'tarea', 'tareas')} de retiro/entrega`);
        if (preview.comision) lines.push(`La comisión de la veterinaria (${CLP.format(preview.comision.amount || 0)}, ${preview.comision.status})`);
        if (preview.fotos_mascota) lines.push(`${plural(preview.fotos_mascota, 'foto', 'fotos')} de la mascota (es su única orden)`);
        if (preview.verification_code) lines.push(`El enlace de seguimiento de la familia (código ${preview.verification_code}) deja de funcionar`);
    }

    const busy = deleteMutation.isPending;

    return (
        <Modal isOpen={isOpen} onClose={busy ? () => {} : onClose} title="Eliminar orden" maxWidth="max-w-lg">
            <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-200">
                        Vas a eliminar la orden
                        {preview?.oc_number ? <strong> OC #{String(preview.oc_number).padStart(4, '0')}</strong> : null}
                        {preview?.pet_name ? <> de <strong>{preview.pet_name}</strong></> : null}
                        {preview?.customer_name ? <> ({preview.customer_name})</> : null}.
                        {' '}Esta acción <strong>no se puede deshacer</strong>.
                    </p>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                        <Loader2 size={14} className="animate-spin" /> Revisando lo que se eliminará…
                    </div>
                ) : error ? (
                    <p className="text-xs text-rose-300">
                        {error instanceof Error ? error.message : 'No se pudo revisar la orden.'}
                    </p>
                ) : preview && (
                    <>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">Se eliminará</p>
                            <ul className="space-y-1.5 text-xs text-white list-disc pl-5">
                                {lines.map((l) => <li key={l}>{l}</li>)}
                            </ul>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">No se elimina</p>
                            <p className="text-xs text-muted-foreground">
                                La mascota y el cliente siguen en el CRM, igual que su memorial si tiene uno.
                            </p>
                        </div>

                        <label className="flex items-start gap-2 text-xs text-white cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={confirmed}
                                onChange={(e) => setConfirmed(e.target.checked)}
                                className="mt-0.5 accent-rose-500"
                            />
                            Entiendo que se eliminará todo lo anterior y no se puede recuperar.
                        </label>
                    </>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="h-10 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-muted-foreground hover:text-white text-xs font-bold transition disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={!confirmed || !preview || busy}
                        className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Eliminar orden
                    </button>
                </div>
            </div>
        </Modal>
    );
}
