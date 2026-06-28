'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Rocket,
    Sparkles,
    Flame,
    CreditCard,
    AlertCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PlanLimitModalProps {
    isOpen?: boolean;
    onClose?: () => void;
    resourceName?: string;
    showTrialOption?: boolean;
}

export const PlanLimitModal = ({
    isOpen: propIsOpen,
    onClose: propOnClose,
    resourceName: propResourceName,
    showTrialOption = true
}: PlanLimitModalProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [resourceName, setResourceName] = useState('');
    const [limitDetail, setLimitDetail] = useState<{ limit?: number; usage?: number; message?: string } | null>(null);
    const router = useRouter();

    // Support both prop-based and event-based opening
    useEffect(() => {
        if (propIsOpen !== undefined) {
            setIsOpen(propIsOpen);
        }
    }, [propIsOpen]);

    useEffect(() => {
        if (propResourceName) {
            setResourceName(propResourceName);
        }
    }, [propResourceName]);

    useEffect(() => {
        const handleLimitExceeded = (e: any) => {
            const allowedResources = ['clientes', 'mascotas', 'pedidos', 'órdenes', 'socios'];
            const resName = (e.detail.resource || '').toLowerCase();

            // Si el recurso no está en la lista permitida, no mostramos nada
            if (!allowedResources.includes(resName)) {
                return;
            }

            setResourceName(e.detail.resource || '');
            setLimitDetail({
                limit: e.detail.limit,
                usage: e.detail.usage,
                message: e.detail.message
            });
            setIsOpen(true);
        };

        window.addEventListener('plan-limit-exceeded', handleLimitExceeded);
        return () => window.removeEventListener('plan-limit-exceeded', handleLimitExceeded);
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        if (propOnClose) propOnClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />
                <motion.div
                    initial={{ scale: 0.9, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 20, opacity: 0 }}
                    className="relative w-full max-w-lg glass-card bg-background/95 backdrop-blur-2xl rounded-3xl sm:rounded-[2.5rem] border border-foreground/10 overflow-hidden shadow-2xl"
                >
                    {/* Decorative Top */}
                    <div className="h-28 sm:h-32 bg-gradient-to-br from-primary/30 via-indigo-500/20 to-transparent relative">
                        <div className="absolute inset-0 flex items-center justify-center pt-6 sm:pt-8">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-primary flex items-center justify-center shadow-[0_0_50px_rgba(var(--primary-rgb),0.5)]">
                                <Rocket className="text-primary-foreground" size={32} />
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full hover:bg-foreground/10 transition-colors text-muted-foreground"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Gradient Divider */}
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                    <div className="p-6 sm:p-10 pt-10 sm:pt-12 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-[10px] font-black uppercase tracking-widest mb-4">
                            <Sparkles size={12} /> Límite Alcanzado
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mb-4 leading-tight">
                            {limitDetail?.limit ? `Has usado ${limitDetail.usage} de ${limitDetail.limit} ${resourceName}` : 'Es hora de subir al siguiente nivel'}
                        </h2>
                        <p className="text-muted-foreground text-sm leading-relaxed mb-8 max-w-sm mx-auto">
                            {limitDetail?.message || `Has alcanzado el límite de ${resourceName || 'recursos'} en tu plan actual. Sigue creciendo sin límites actualizando tu cuenta.`}
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    router.push('/tenant/dashboard/configuracion?tab=facturacion');
                                    handleClose();
                                }}
                                className="w-full py-4 bg-primary text-primary-foreground font-black text-sm rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-wider"
                            >
                                <CreditCard size={18} /> Ver Planes de Facturación
                            </button>

                            {showTrialOption && (
                                <button
                                    onClick={() => {
                                        window.alert('Tu solicitud de prueba de 1 mes ha sido enviada a soporte. Nos contactaremos pronto.');
                                        handleClose();
                                    }}
                                    className="w-full py-4 bg-foreground/5 border border-foreground/10 text-foreground font-bold text-sm rounded-2xl hover:bg-foreground/10 transition-all flex items-center justify-center gap-3"
                                >
                                    <Flame size={18} className="text-orange-400" /> Solicitar Prueba de 1 Mes
                                </button>
                            )}
                        </div>

                        <p className="text-[10px] text-primary mt-8 uppercase tracking-widest font-black italic drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]">
                            Vincer | Cuando el vínculo importa, todo cambia
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
