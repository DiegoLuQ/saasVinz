"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle } from 'lucide-react';
import { translateCycle } from './translations';

interface ApprovePaymentModalProps {
    txn: any | null;
    submitting: boolean;
    onClose: () => void;
    onConfirm: (endDateIso: string | null) => void;
}

// Convierte una fecha YYYY-MM-DD del input a ISO usando 23:59:59 LOCAL.
// Esto evita el bug de timezone donde new Date('2026-03-01').toISOString() en UTC-3
// retorna 2026-02-28T21:00:00Z (un día menos).
function toEndOfDayLocalISO(yyyymmdd: string): string {
    const [year, month, day] = yyyymmdd.split('-').map(Number);
    const local = new Date(year, month - 1, day, 23, 59, 59);
    return local.toISOString();
}

export default function ApprovePaymentModal({ txn, submitting, onClose, onConfirm }: ApprovePaymentModalProps) {
    const [customEndDate, setCustomEndDate] = useState('');

    useEffect(() => {
        if (txn) setCustomEndDate('');
    }, [txn?.id]);

    const handleConfirm = () => {
        const iso = customEndDate ? toEndOfDayLocalISO(customEndDate) : null;
        onConfirm(iso);
    };

    return (
        <AnimatePresence>
            {txn && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={submitting ? undefined : onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#0B1121] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-black mb-1">Aprobar Transacción</h3>
                                <p className="text-white/40 text-xs font-medium">Tenant: {txn.tenant_name || txn.tenant_id}</p>
                            </div>
                            <button
                                onClick={onClose}
                                disabled={submitting}
                                className="text-white/20 hover:text-white transition-colors disabled:opacity-30"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <div className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-2">Resumen del Pago</div>
                                <div className="flex justify-between items-end">
                                    <div className="text-3xl font-black text-green-400">${txn.amount.toLocaleString()}</div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-white/70">{txn.target_plan_name}</div>
                                        <div className="text-[10px] text-white/30 uppercase">{translateCycle(txn.target_billing_cycle)}</div>
                                    </div>
                                </div>
                            </div>

                            {txn.current_billing_end_date && (
                                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[10px] text-primary/50 font-black uppercase tracking-widest">Vencimiento Actual</div>
                                        <div className="text-sm font-mono font-bold text-primary">
                                            {new Date(txn.current_billing_end_date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-2 block">
                                    Fecha de Vencimiento del Plan (Próxima Renovación)
                                </label>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:border-primary transition-all color-scheme-dark"
                                />
                                <p className="text-[10px] text-white/20 mt-2 italic font-medium">
                                    * Dejar vacío para usar la fecha calculada automáticamente. Se asume fin del día (23:59) en zona local.
                                </p>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={onClose}
                                    disabled={submitting}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={submitting}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                                >
                                    {submitting ? 'Procesando...' : 'Confirmar Aprobación'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
