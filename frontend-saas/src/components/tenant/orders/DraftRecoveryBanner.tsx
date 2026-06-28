"use client";

import React from 'react';
import { Clock, RotateCcw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDraftAge } from '@/hooks/tenant/useAutoDraft';

interface DraftRecoveryBannerProps {
    savedAt: string;
    onRestore: () => void;
    onDiscard: () => void;
}

/**
 * Banner shown when a previous auto-saved draft is detected.
 * User can choose to restore or discard it.
 */
export default function DraftRecoveryBanner({ savedAt, onRestore, onDiscard }: DraftRecoveryBannerProps) {
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between gap-4"
                role="alert"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 rounded-xl shrink-0" aria-hidden="true">
                        <Clock size={18} className="text-amber-400" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-amber-300 uppercase tracking-tight">
                            Borrador encontrado
                        </p>
                        <p className="text-[10px] text-amber-400/70 font-bold uppercase tracking-widest mt-0.5">
                            Guardado {formatDraftAge(savedAt)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onRestore}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-xl text-amber-300 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                        aria-label="Restaurar borrador guardado"
                    >
                        <RotateCcw size={12} />
                        Restaurar
                    </button>
                    <button
                        type="button"
                        onClick={onDiscard}
                        className="p-2 text-amber-400/50 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all"
                        aria-label="Descartar borrador"
                    >
                        <X size={16} />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
