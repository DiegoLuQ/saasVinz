"use client";

import React from 'react';
import { Clock, Info, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PendingStatusModalProps {
    isOpen: boolean;
    reason?: string;
}

export default function PendingStatusModal({ isOpen, reason }: PendingStatusModalProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-[#0a192f]/80 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="max-w-lg w-full bg-[#112240] border border-white/10 p-8 lg:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
                >
                    {/* Decorative element */}
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Clock size={120} className="text-primary" />
                    </div>

                    <div className="relative z-10">
                        <div className="w-16 h-16 rounded-2xl bg-primary/20 text-primary flex items-center justify-center mb-8 shadow-lg shadow-primary/10">
                            <Clock size={32} />
                        </div>

                        <h2 className="text-3xl font-black text-white mb-4 leading-tight uppercase tracking-tight">
                            Cuenta en Proceso <br />de Activación
                        </h2>

                        <p className="text-white/60 mb-8 font-medium leading-relaxed text-lg">
                            Tu suscripción está siendo procesada. Mientras tanto, puedes explorar el panel, pero algunas funciones podrían estar limitadas.
                        </p>

                        <div className="bg-[#1d3557]/30 border border-primary/20 rounded-2xl p-6 mb-8">
                            <div className="flex items-center gap-2 mb-3">
                                <Info size={16} className="text-primary" />
                                <span className="text-[10px] uppercase font-black text-primary tracking-widest">
                                    Estado Actual
                                </span>
                            </div>
                            <p className="text-white/90 font-medium italic text-lg leading-relaxed">
                                "{reason || 'Estamos validando tu información de registro y pago inicial.'}"
                            </p>
                        </div>

                        <div className="flex flex-col gap-4">
                            <button
                                onClick={() => window.open('https://api.whatsapp.com/send?phone=TUNUMERO', '_blank')}
                                className="w-full py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20"
                            >
                                <ExternalLink size={18} />
                                CONSULTAR ESTADO VÍA WHATSAPP
                            </button>

                            <p className="text-center text-[11px] text-white/30 font-bold uppercase tracking-[0.2em] mt-2">
                                SaaSCrematorio © 2026
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
