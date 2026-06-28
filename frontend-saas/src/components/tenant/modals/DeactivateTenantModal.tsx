"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    AlertTriangle,
    CreditCard,
    ShieldAlert,
    ArrowRight,
    ArrowLeft,
    CheckCircle2,
    Lock,
    QrCode,
    Users
} from 'lucide-react';

interface DeactivateTenantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}

export default function DeactivateTenantModal({
    isOpen,
    onClose,
    onConfirm
}: DeactivateTenantModalProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [confirmPhrase, setConfirmPhrase] = useState('');
    const EXPECTED_PHRASE = 'DESACTIVAR MI CUENTA';
    const isPhraseCorrect = confirmPhrase.trim().toUpperCase() === EXPECTED_PHRASE;

    const steps = [
        {
            title: "Impacto en Branding",
            subtitle: "Transición a Modo Invitado",
            icon: Users,
            color: "text-orange-400",
            bg: "bg-orange-500/10"
        },
        {
            title: "Suscripción y Acceso",
            subtitle: "Tu estado en Polar.sh y el Panel",
            icon: CreditCard,
            color: "text-blue-400",
            bg: "bg-blue-500/10"
        },
        {
            title: "Confirmación Final",
            subtitle: "¿Estás seguro de continuar?",
            icon: AlertTriangle,
            color: "text-red-400",
            bg: "bg-red-500/10"
        }
    ];

    const nextStep = () => setStep(prev => Math.min(prev + 1, 3));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm();
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        setConfirmPhrase('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                />

                {/* Modal Body */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-xl bg-[#0f1115] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header with Progress */}
                    <div className="p-8 lg:p-10 border-b border-white/5 relative">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${steps[step - 1].bg} ${steps[step - 1].color}`}>
                                    {React.createElement(steps[step - 1].icon, { size: 24 })}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white leading-none">
                                        {steps[step - 1].title}
                                    </h3>
                                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">
                                        Paso {step} de 3
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="flex gap-2 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-primary"
                                initial={{ width: "33.33%" }}
                                animate={{ width: `${(step / 3) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-10 space-y-8">
                        {step === 1 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-6"
                            >
                                <p className="text-lg text-white/70 leading-relaxed font-medium">
                                    Al cancelar la renovación, tu empresa pasará a <strong>Modo Invitado</strong> en los memoriales públicos:
                                </p>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <ShieldAlert className="text-orange-400 mt-1" size={20} />
                                        <div>
                                            <p className="font-bold text-white text-sm">Ocultación de Marca</p>
                                            <p className="text-white/40 text-xs">Tu nombre y logo ya no aparecerán en los memoriales de tus clientes.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <Users className="text-orange-400 mt-1" size={20} />
                                        <div>
                                            <p className="font-bold text-white text-sm">Acceso Invitados</p>
                                            <p className="text-white/40 text-xs">Los memoriales mostrarán un mensaje de cortesía genérico del sistema.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <QrCode className="text-orange-400 mt-1" size={20} />
                                        <div>
                                            <p className="font-bold text-white text-sm">Continuidad QR</p>
                                            <p className="text-white/40 text-xs">Las mascotas mantendrán su homenaje activo por respeto a las familias.</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-6"
                            >
                                <p className="text-lg text-white/70 leading-relaxed font-medium">
                                    Sobre tu acceso y facturación:
                                </p>
                                <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-3xl space-y-4">
                                    <div className="flex gap-3">
                                        <Lock className="text-blue-400 shrink-0" size={20} />
                                        <p className="text-sm text-blue-100/80">Mantendrás <strong>Acceso Total</strong> al panel hasta el último día contratado.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <CreditCard className="text-blue-400 shrink-0" size={20} />
                                        <p className="text-sm text-blue-100/80">Cancelaremos tu suscripción en <strong>Polar.sh</strong> para evitar nuevos cobros.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <CheckCircle2 className="text-emerald-400 shrink-0" size={20} />
                                        <p className="text-sm text-emerald-100/80">Podrás reactivar tu suscripción en cualquier momento antes del vencimiento.</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-6 text-center"
                            >
                                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
                                    <AlertTriangle size={40} />
                                </div>
                                <h4 className="text-2xl font-black text-white">¿Confirmas la desactivación?</h4>
                                <p className="text-white/60 leading-relaxed">
                                    Escribe <span className="text-white font-bold px-2 py-0.5 bg-white/10 rounded">{EXPECTED_PHRASE}</span> para confirmar tu decisión.
                                </p>
                                <input
                                    type="text"
                                    placeholder="Confirmación de seguridad"
                                    autoFocus
                                    className={`w-full bg-white/5 border ${isPhraseCorrect ? 'border-emerald-500/50' : 'border-white/10'} rounded-2xl py-4 px-6 text-center text-white font-bold outline-none focus:border-red-500/50 transition-all uppercase`}
                                    value={confirmPhrase}
                                    onChange={(e) => setConfirmPhrase(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && isPhraseCorrect && !loading) {
                                            handleConfirm();
                                        }
                                    }}
                                />
                                {isPhraseCorrect && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold"
                                    >
                                        <CheckCircle2 size={14} />
                                        FRASE CORRECTA
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-8 lg:p-10 bg-white/2 border-t border-white/5 flex gap-4">
                        {step > 1 && (
                            <button
                                onClick={prevStep}
                                className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center gap-2"
                            >
                                <ArrowLeft size={18} />
                                Atrás
                            </button>
                        )}

                        {step < 3 ? (
                            <button
                                onClick={nextStep}
                                className="flex-1 py-4 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                            >
                                Siguiente
                                <ArrowRight size={18} />
                            </button>
                        ) : (
                            <button
                                onClick={handleConfirm}
                                disabled={loading || !isPhraseCorrect}
                                className={`flex-1 py-4 ${isPhraseCorrect ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-red-500/20 text-white/20 cursor-not-allowed'} text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2`}
                            >
                                {loading ? "Procesando..." : "Confirmar Suspensión"}
                                <ShieldAlert size={18} />
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
