"use client";

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2, Undo2 } from 'lucide-react';
import Modal from '@/components/tenant/Modal';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

// Lo necesario de GET /api/internal/cremations/{id}/expediente (misma caché que la ficha)
interface ExpedienteLite {
    order: { status_group: 'pendiente' | 'en_proceso' | 'entregado' | 'cancelado'; current_step?: string | null; oc_number?: number | null };
    pet: { name?: string | null };
    timeline: { name: string; state: 'completado' | 'en_curso' | 'pendiente' }[];
}

/** ¿La orden puede retroceder un paso? (pendiente y cancelada, no) */
export const canRevertStatus = (group?: string | null) => group === 'en_proceso' || group === 'entregado';

interface Props {
    isOpen: boolean;
    orderId: number;
    onClose: () => void;
    /** Recibe el estado en que quedó la orden */
    onReverted?: (status: string) => void;
}

/**
 * Confirmación de «Retroceder» (solo dueño del crematorio; el backend lo exige).
 * Retrocede un paso: entregada -> en proceso (última fase) -> fase anterior ->
 * pendiente. Ver PATCH /ops/orders/{id}/revert.
 */
export default function RevertOrderModal({ isOpen, orderId, onClose, onReverted }: Props) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [saving, setSaving] = useState(false);

    const { data: exp, isLoading } = useQuery<ExpedienteLite>({
        queryKey: ['expediente', orderId],
        queryFn: () => apiRequest(`/api/internal/cremations/${orderId}/expediente`),
        enabled: isOpen && !!orderId,
        staleTime: 0,
    });

    const group = exp?.order.status_group;
    const fromDelivered = group === 'entregado';
    let from = '', to = '', detail = '';
    if (exp) {
        const tl = exp.timeline;
        const cur = tl.findIndex((s) => s.state === 'en_curso');
        if (fromDelivered) {
            from = 'Entregado';
            to = exp.order.current_step ? `En proceso · ${exp.order.current_step}` : 'Pendiente';
            detail = 'Se quita la marca de entregada y la hora de término de la última fase. La orden vuelve a aparecer como activa en el Panel de Trabajo y la familia la verá en proceso en el seguimiento.';
        } else if (cur > 0) {
            from = `En proceso · ${tl[cur].name}`;
            to = `En proceso · ${tl[cur - 1].name}`;
            detail = `Se borra la hora de término registrada de «${tl[cur - 1].name}».`;
        } else {
            from = cur === 0 ? `En proceso · ${tl[0].name}` : 'En proceso';
            to = 'Pendiente (sin iniciar)';
            detail = 'La orden queda sin fase, como si no se hubiera iniciado.';
        }
    }

    const handleConfirm = async () => {
        setSaving(true);
        try {
            const res = await apiRequest(`/api/internal/operations/ops/orders/${orderId}/revert`, { method: 'PATCH' });
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['expediente', orderId] }),
                queryClient.invalidateQueries({ queryKey: ['cremations-simple'] }),
                queryClient.invalidateQueries({ queryKey: ['cremations'] }),
            ]);
            showToast('Orden retrocedida', 'success');
            onReverted?.(res?.status || '');
            onClose();
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'No se pudo retroceder la orden', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={saving ? () => {} : onClose} title="Retroceder orden" maxWidth="max-w-md">
            {isLoading || !exp ? (
                <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" /> Cargando…
                </div>
            ) : !canRevertStatus(group) ? (
                <p className="text-xs text-muted-foreground py-4">
                    {group === 'cancelado' ? 'La orden está cancelada.' : 'La orden ya está pendiente: no hay un paso anterior.'}
                </p>
            ) : (
                <div className="space-y-4">
                    {fromDelivered && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-200">
                                {exp.pet.name ? <><strong>{exp.pet.name}</strong> ya figura como </> : 'Esta orden ya figura como '}
                                <strong>entregada</strong>. ¿Seguro que quieres reabrirla?
                            </p>
                        </div>
                    )}
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                        <span className="text-muted-foreground">Estado actual</span>
                        <span className="text-white font-semibold">{from}</span>
                        <span className="text-muted-foreground">Quedará en</span>
                        <span className="text-white font-semibold">{to}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {detail} Las fotos y notas de evidencia se conservan.
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="h-10 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-muted-foreground hover:text-white text-xs font-bold transition disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={saving}
                            className="h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 transition disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Undo2 size={14} />}
                            Retroceder
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
