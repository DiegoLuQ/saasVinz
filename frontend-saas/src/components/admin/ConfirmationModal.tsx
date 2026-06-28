import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    type?: 'success' | 'warning' | 'danger' | 'info';
    loading?: boolean;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'info',
    loading = false
}: ConfirmationModalProps) {

    const colors = {
        success: {
            bg: 'bg-green-500/10',
            icon: 'text-green-400',
            button: 'bg-green-500 hover:bg-green-600 shadow-green-500/20',
            border: 'border-green-500/20'
        },
        warning: {
            bg: 'bg-yellow-500/10',
            icon: 'text-yellow-400',
            button: 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/20',
            border: 'border-yellow-500/20'
        },
        danger: {
            bg: 'bg-red-500/10',
            icon: 'text-red-400',
            button: 'bg-red-500 hover:bg-red-600 shadow-red-500/20',
            border: 'border-red-500/20'
        },
        info: {
            bg: 'bg-primary/10',
            icon: 'text-primary',
            button: 'bg-primary hover:bg-primary/90 shadow-primary/20',
            border: 'border-primary/20'
        }
    };

    const config = colors[type];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-md bg-[#1a1f2e] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl"
                >
                    <div className="p-8">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className={`w-16 h-16 rounded-2xl ${config.bg} flex items-center justify-center ${config.icon}`}>
                                {type === 'success' && <CheckCircle size={32} />}
                                {type === 'warning' && <AlertTriangle size={32} />}
                                {type === 'danger' && <X size={32} />}
                                {type === 'info' && <Info size={32} />}
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-white">{title}</h3>
                                <div className="text-white/60 text-sm leading-relaxed">
                                    {message}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl font-bold text-white/60 transition-all active:scale-95"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={loading}
                                className={`flex-1 px-6 py-3 ${config.button} text-white rounded-xl font-black shadow-lg shadow-black/20 transition-all active:scale-95 flex items-center justify-center gap-2`}
                            >
                                {loading && (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                )}
                                {confirmText}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
