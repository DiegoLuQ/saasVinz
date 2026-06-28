
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Info } from 'lucide-react';


interface LimitReachedModalProps {
    isOpen: boolean;
    onClose: () => void;
    limit: number;
    planName: string;
}

const LimitReachedModal: React.FC<LimitReachedModalProps> = ({ isOpen, onClose, limit, planName }) => {
    // We can use useTranslations if available, or fallback to hardcoded Spanish for now as per project context
    // const t = useTranslations('Memorial'); 

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
                    >
                        {/* Header */}
                        <div className="relative h-32 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 text-white rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <div className="p-4 bg-white/20 backdrop-blur-md rounded-full">
                                <Lock size={40} className="text-white" />
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 text-center space-y-4">
                            <h3 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white">
                                Límite Alcanzado
                            </h3>

                            <p className="text-zinc-600 dark:text-zinc-300">
                                Este memorial ha alcanzado el límite de <strong>{limit}</strong> dedicatorias permitido por su plan <strong>{planName}</strong>.
                            </p>

                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl flex items-start gap-3 text-left">
                                <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <p className="text-sm text-amber-800 dark:text-amber-200">
                                    No se pueden agregar más dedicatorias en este momento.
                                </p>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full py-3 px-4 bg-zinc-900 dark:bg-white text-white dark:text-black font-medium rounded-xl hover:opacity-90 transition-opacity"
                            >
                                Entendido
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default LimitReachedModal;
