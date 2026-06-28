"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, RotateCcw, X } from 'lucide-react';

interface CancellationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    orderId?: string | number;
}

const CancellationModal: React.FC<CancellationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirmar Cancelación",
    orderId
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#0f1115] w-full max-w-md rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl"
                    >
                        {/* Header with Warning Icon */}
                        <div className="bg-red-500/10 p-6 flex flex-col items-center text-center border-b border-white/5">
                            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4 ring-8 ring-red-500/5">
                                <AlertTriangle className="text-red-500" size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-white">{title}</h2>
                            {orderId && <span className="text-xs font-mono text-red-400/60 mt-1 uppercase tracking-widest">Pedido #SRV-{orderId}</span>}
                        </div>

                        {/* Content */}
                        <div className="p-8 space-y-6">
                            <p className="text-gray-400 text-center leading-relaxed">
                                ¿Estás seguro de que deseas cancelar este pedido? Esta acción es irreversible y realizará los siguientes cambios:
                            </p>

                            <div className="space-y-3">
                                <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 group hover:border-red-500/30 transition-colors">
                                    <div className="mt-1 p-1.5 bg-red-500/10 rounded-lg text-red-500">
                                        <RotateCcw size={14} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white uppercase tracking-wider">Restaurar Bodega</p>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">Los productos se devolverán automáticamente al stock.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 group hover:border-red-500/30 transition-colors">
                                    <div className="mt-1 p-1.5 bg-red-500/10 rounded-lg text-red-500">
                                        <Trash2 size={14} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white uppercase tracking-wider">Eliminar Servicios</p>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">Todos los servicios y planes serán quitados del pedido.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 group hover:border-red-500/30 transition-colors">
                                    <div className="mt-1 p-1.5 bg-red-500/10 rounded-lg text-red-500">
                                        <X size={14} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white uppercase tracking-wider">Borrar Multimedia</p>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">La foto de la mascota será eliminada del servidor.</p>
                                    </div>
                                </div>
                            </div>

                            <p className="text-[10px] text-center text-muted-foreground/60 italic">
                                * Se mantendrán únicamente los datos básicos del cliente y la mascota por motivos de auditoría.
                            </p>
                        </div>

                        {/* Footer Buttons */}
                        <div className="p-6 bg-white/5 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-all active:scale-95"
                            >
                                Mantener pedido
                            </button>
                            <button
                                onClick={() => {
                                    onConfirm();
                                    onClose();
                                }}
                                className="flex-1 px-6 py-3 rounded-2xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 shadow-lg shadow-red-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <AlertTriangle size={16} />
                                Confirmar Cancelación
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CancellationModal;
