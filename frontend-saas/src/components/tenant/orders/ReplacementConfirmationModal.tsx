import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check, X } from 'lucide-react';

interface ReplacementConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    type: 'plan' | 'service' | 'product';
    currentName: string;
    newName: string;
    isConflict?: boolean;
    conflictMessage?: string;
    customLabels?: {
        title?: string;
        currentHeader?: string;
        newHeader?: string;
        currentAction?: string;
        newAction?: string;
    };
}

const typeLabels = {
    plan: { title: 'Plan Contratado', color: 'text-primary bg-primary/10 border-primary/20' },
    service: { title: 'Servicio Extra', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
    product: { title: 'Producto / Urna', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
};

export default function ReplacementConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    type,
    currentName,
    newName,
    isConflict = false,
    conflictMessage,
    customLabels,
}: ReplacementConfirmationModalProps) {
    const labelConfig = typeLabels[type] || typeLabels.plan;

    // Handle Escape key to close
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 16 }}
                        transition={{ type: 'spring', duration: 0.4 }}
                        className="relative w-full max-w-md bg-zinc-950 border border-white/[0.08] rounded-3xl p-6 overflow-hidden shadow-2xl z-10"
                    >
                        {/* Elegant light effect on top */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                        {/* Close button */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-muted-foreground/60 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all"
                            aria-label="Cerrar modal"
                        >
                            <X size={16} />
                        </button>

                        <div className="space-y-6">
                            {/* Icon & Category Label */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                                        Atención
                                    </span>
                                    <h3 className="text-sm font-black text-white uppercase tracking-tight">
                                        {customLabels?.title || 'Reemplazar Selección'}
                                    </h3>
                                </div>
                            </div>

                            {/* Message */}
                            <div className="space-y-4">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {conflictMessage || `Solo se permite seleccionar un `}
                                    {!conflictMessage && <strong className="text-white">{labelConfig.title.toLowerCase()}</strong>}
                                    {!conflictMessage && ` por cremación. Al confirmar, se reemplazará la selección actual.`}
                                </p>

                                {/* Comparison box */}
                                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                                    {/* Current */}
                                    <div className="flex items-start justify-between gap-3 text-left">
                                        <div>
                                            <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider block">
                                                {customLabels?.currentHeader || 'Actual'}
                                            </span>
                                            <span className={`text-xs block max-w-[220px] truncate ${isConflict ? 'font-bold text-white/80' : 'font-bold text-muted-foreground/80 line-through'}`}>
                                                {currentName}
                                            </span>
                                        </div>
                                        <span className={`text-[9px] font-bold border px-2 py-0.5 rounded uppercase tracking-wider shrink-0 mt-1 ${isConflict ? 'text-primary bg-primary/10 border-primary/15' : 'text-red-400 bg-red-500/10 border-red-500/15'}`}>
                                            {customLabels?.currentAction || 'Quitar'}
                                        </span>
                                    </div>

                                    {/* Arrow icon */}
                                    <div className="h-px bg-white/[0.06] relative my-1">
                                        <div className="absolute top-1/2 left-4 -translate-y-1/2 bg-zinc-950 px-2 text-[9px] font-bold text-muted-foreground/45 uppercase tracking-wider">
                                            {isConflict ? 'Añadir como' : 'Reemplazar por'}
                                        </div>
                                    </div>

                                    {/* New */}
                                    <div className="flex items-start justify-between gap-3 text-left">
                                        <div>
                                            <span className="text-[9px] font-bold text-amber-500/50 uppercase tracking-wider block">
                                                {customLabels?.newHeader || 'Nuevo'}
                                            </span>
                                            <span className="text-xs font-black text-white truncate block max-w-[220px]">
                                                {newName}
                                            </span>
                                        </div>
                                        <span className={`text-[9px] font-bold border px-2 py-0.5 rounded uppercase tracking-wider shrink-0 mt-1 ${isConflict ? 'text-amber-400 bg-amber-500/10 border-amber-500/15' : 'text-green-400 bg-green-500/10 border-green-500/15'}`}>
                                            {customLabels?.newAction || 'Agregar'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={onConfirm}
                                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
                                >
                                    <Check size={14} strokeWidth={3} />
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
