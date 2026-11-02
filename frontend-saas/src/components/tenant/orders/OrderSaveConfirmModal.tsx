"use client";

import React from 'react';
import { CheckCircle2, Loader2, ArrowRight, AlertTriangle } from 'lucide-react';
import Modal from '@/components/tenant/Modal';
import OrderSummaryView from '@/components/tenant/orders/OrderSummaryView';
import { diffSummaries, type OrderSummary } from '@/lib/tenant/orders/summary';

/**
 * Confirmación antes de crear o actualizar la orden: muestra lo que se va a
 * guardar y, al editar, qué cambia respecto de lo guardado.
 */
interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isSaving: boolean;
    isEdit: boolean;
    ocNumber?: number | null;
    summary: OrderSummary;
    original?: OrderSummary | null;
}

export default function OrderSaveConfirmModal({ isOpen, onClose, onConfirm, isSaving, isEdit, ocNumber, summary, original }: Props) {
    const changes = isEdit && original ? diffSummaries(original, summary) : [];
    const cancelling = summary.status.toLowerCase().startsWith('cancel');

    return (
        <Modal
            isOpen={isOpen}
            onClose={isSaving ? () => {} : onClose}
            title={isEdit ? `Confirmar cambios${ocNumber ? ` · OC #${ocNumber}` : ''}` : 'Confirmar nueva orden'}
            maxWidth="max-w-xl"
        >
            <div className="space-y-4">
                {isEdit && (
                    <section>
                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">
                            {changes.length ? `Se actualizará (${changes.length})` : 'Cambios'}
                        </p>
                        {changes.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No hay cambios respecto de lo guardado.</p>
                        ) : (
                            <ul className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] divide-y divide-amber-500/15 text-xs">
                                {changes.map(c => (
                                    <li key={c.label} className="px-3 py-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                        <span className="font-bold text-foreground min-w-[8rem]">{c.label}</span>
                                        <span className="text-muted-foreground line-through decoration-muted-foreground/50">{c.before}</span>
                                        <ArrowRight size={12} className="text-amber-600 shrink-0" aria-label="pasa a" />
                                        <span className="font-semibold text-foreground">{c.after}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                )}

                {cancelling && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-200 text-xs">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        <span>
                            Al cancelar, los ítems se quitan, los productos vuelven al stock, el total queda en $0 y se elimina la comisión
                            pendiente de la veterinaria (una ya pagada no cambia). Las fotos se conservan.
                        </span>
                    </div>
                )}

                <section>
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">
                        {isEdit ? 'Así quedará la orden' : 'Datos de la orden'}
                    </p>
                    <OrderSummaryView s={summary} />
                </section>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="h-10 px-4 rounded-xl bg-muted border border-border text-foreground/80 hover:bg-muted/70 text-xs font-bold disabled:opacity-50"
                    >
                        Volver a editar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isSaving}
                        autoFocus
                        className="h-10 px-5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:brightness-110 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        {isEdit ? 'Confirmar y actualizar' : 'Confirmar y crear'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
