"use client";

import React, { useState, useEffect } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CreatePlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (name: string) => Promise<void> | void;
    creating: boolean;
}

export default function CreatePlanModal({ isOpen, onClose, onConfirm, creating }: CreatePlanModalProps) {
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setName('');
            setError('');
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) {
            setError('Ingresa un nombre para el plan');
            return;
        }
        if (trimmed.length < 3) {
            setError('Mínimo 3 caracteres');
            return;
        }
        setError('');
        await onConfirm(trimmed);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80]"
                        onClick={creating ? undefined : onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-[90%] max-w-md"
                    >
                        <form onSubmit={handleSubmit} className="bg-[#0a192f] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-primary/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                                        <Plus size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-black">Nuevo plan de suscripción</h3>
                                        <p className="text-white/40 text-xs">Define el nombre. Los límites se ajustan después.</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={creating}
                                    className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-30"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 block mb-2">
                                        Nombre del plan
                                    </label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="ej. ELITE, EMPRESARIAL, BÁSICO"
                                        disabled={creating}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder-white/20 focus:outline-none focus:border-primary/50"
                                    />
                                    {error && (
                                        <p className="text-rose-400 text-xs font-bold mt-2">{error}</p>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 bg-white/[0.02] border-t border-white/5 flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={creating}
                                    className="px-5 py-2.5 text-white/60 hover:text-white text-sm font-bold transition-colors disabled:opacity-30"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-6 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-sm font-black rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                                >
                                    {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                    {creating ? 'Creando...' : 'Crear Plan'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
