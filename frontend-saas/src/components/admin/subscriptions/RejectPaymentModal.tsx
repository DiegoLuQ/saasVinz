"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, AlertTriangle } from 'lucide-react';

interface RejectPaymentModalProps {
    txn: any | null;
    submitting: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}

export default function RejectPaymentModal({ txn, submitting, onClose, onConfirm }: RejectPaymentModalProps) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (txn) {
            setReason('');
            setError('');
        }
    }, [txn?.id]);

    const handleConfirm = () => {
        const trimmed = reason.trim();
        if (!trimmed) {
            setError('Indica el motivo del rechazo');
            return;
        }
        if (trimmed.length < 5) {
            setError('Mínimo 5 caracteres');
            return;
        }
        setError('');
        onConfirm(trimmed);
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
                            <div className="flex items-start gap-3">
                                <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-400">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black mb-1">Rechazar Transacción</h3>
                                    <p className="text-white/40 text-xs font-medium">Tenant: {txn.tenant_name || txn.tenant_id}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                disabled={submitting}
                                className="text-white/20 hover:text-white transition-colors disabled:opacity-30"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div className="bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10 text-xs text-rose-200/80 leading-relaxed">
                                Este motivo se guardará en las notas de la transacción y será visible para auditoría. La transacción quedará marcada como <span className="font-bold">fallida</span>.
                            </div>

                            <div>
                                <label className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-2 block">
                                    Motivo del rechazo
                                </label>
                                <textarea
                                    autoFocus
                                    value={reason}
                                    onChange={(e) => { setReason(e.target.value); if (error) setError(''); }}
                                    rows={4}
                                    placeholder="Ej: Comprobante ilegible, monto no coincide con el plan, datos del tenant incorrectos..."
                                    disabled={submitting}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-medium placeholder-white/20 focus:outline-none focus:border-rose-400/50 transition-all resize-none"
                                />
                                {error ? (
                                    <p className="text-rose-400 text-xs font-bold mt-2">{error}</p>
                                ) : (
                                    <p className="text-[10px] text-white/20 mt-2 italic font-medium">{reason.length}/500 caracteres</p>
                                )}
                            </div>

                            <div className="flex gap-4 pt-2">
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
                                    className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-rose-500/20 transition-all disabled:opacity-50"
                                >
                                    {submitting ? 'Rechazando...' : 'Confirmar Rechazo'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
