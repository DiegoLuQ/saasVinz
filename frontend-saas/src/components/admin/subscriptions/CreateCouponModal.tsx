"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Loader2 } from 'lucide-react';

export interface CouponFormData {
    code: string;
    discount_percent: number;
    valid_until: string;
    max_uses: string;
}

interface CreateCouponModalProps {
    isOpen: boolean;
    submitting: boolean;
    onClose: () => void;
    onSubmit: (data: CouponFormData) => void;
}

const initialForm: CouponFormData = {
    code: '',
    discount_percent: 10,
    valid_until: '',
    max_uses: ''
};

export default function CreateCouponModal({ isOpen, submitting, onClose, onSubmit }: CreateCouponModalProps) {
    const [formData, setFormData] = useState<CouponFormData>(initialForm);

    useEffect(() => {
        if (isOpen) setFormData(initialForm);
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-md bg-[#0a0f18] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
                    >
                        <div className="p-10 space-y-8">
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto border border-emerald-500/20 mb-4">
                                    <Ticket size={32} />
                                </div>
                                <h2 className="text-2xl font-black text-white italic tracking-tight">Nuevo Cupón</h2>
                                <p className="text-white/40 text-xs uppercase font-bold tracking-widest">Define las reglas del descuento</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Código del Cupón</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="EJ: VERANO2024"
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all font-black tracking-widest text-center text-lg"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Descuento (%)</label>
                                        <input
                                            required
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={formData.discount_percent}
                                            onChange={e => setFormData({ ...formData, discount_percent: parseInt(e.target.value) })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-6 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all font-bold text-center"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Límite de Usos</label>
                                        <input
                                            type="number"
                                            placeholder="∞"
                                            value={formData.max_uses}
                                            onChange={e => setFormData({ ...formData, max_uses: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-6 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all font-bold text-center"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Válido hasta (Opcional)</label>
                                    <input
                                        type="date"
                                        value={formData.valid_until}
                                        onChange={e => setFormData({ ...formData, valid_until: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-6 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all font-bold"
                                    />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white font-bold rounded-2xl transition-all"
                                    >
                                        CANCELAR
                                    </button>
                                    <button
                                        disabled={submitting}
                                        type="submit"
                                        className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        {submitting && <Loader2 className="animate-spin" size={18} />}
                                        {submitting ? 'CREANDO...' : 'GUARDAR CUPÓN'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
