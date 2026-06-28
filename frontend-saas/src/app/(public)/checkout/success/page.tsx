'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { CheckCircle2, Loader2, XCircle, Clock, Home, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const SuccessContent = () => {
    const searchParams = useSearchParams();
    const router = useRouter();

    // El checkout de Polar podría pasar parámetros o nosotros en la success_url
    const resourceType = searchParams.get('type');
    const resourceId = searchParams.get('id');
    const plan = searchParams.get('plan');
    const returnUrl = searchParams.get('return') || '/';

    // endpoint de status
    const isServer = typeof window === 'undefined';
    const API_URL = !isServer ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
    const statusEndpoint = `${API_URL}/api/internal/memorials/${resourceId}`;

    const { status, attempts } = usePaymentStatus({
        statusEndpoint,
        targetStatus: 'active',
        maxAttempts: 20
    });

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white font-sans selection:bg-sky-500/30">
            {/* Background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-sky-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-500/10 blur-[100px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full bg-white/5 border border-white/10 p-10 rounded-[3rem] shadow-2xl backdrop-blur-2xl text-center relative z-10"
            >
                {status === 'pending' && (
                    <div className="space-y-8">
                        <div className="relative w-24 h-24 mx-auto">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 border-4 border-sky-500/20 border-t-sky-500 rounded-full shadow-[0_0_20px_rgba(14,165,233,0.3)]"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Clock className="text-sky-400 w-10 h-10" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-black uppercase tracking-widest italic">Confirmando Pago</h1>
                            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">
                                Validando transacción con Polar • Intento {attempts}/20
                            </p>
                        </div>
                        <p className="text-white/60 text-sm leading-relaxed px-4">
                            Estamos activando tus beneficios premium. Por favor no cierres esta ventana.
                        </p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-8">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-24 h-24 bg-emerald-500/20 rounded-3xl mx-auto flex items-center justify-center border border-emerald-500/30 shadow-[0_20px_40px_rgba(16,185,129,0.2)]"
                        >
                            <CheckCircle2 className="text-emerald-400 w-12 h-12" />
                        </motion.div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-black uppercase tracking-tighter italic">¡Pago Exitoso!</h1>
                            {plan && (
                                <span className="inline-block px-4 py-1.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    Suscripción: {plan}
                                </span>
                            )}
                        </div>
                        <p className="text-white/50 text-sm leading-relaxed px-4">
                            Gracias por tu confianza. Tu cuenta ha sido actualizada con éxito y todos tus beneficios están activos.
                        </p>
                        <button
                            onClick={() => router.push(returnUrl)}
                            className="w-full bg-sky-600 hover:bg-sky-50 text-sky-600 hover:text-sky-900 group py-4.5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-sky-600/20 active:scale-95"
                        >
                            <span className="text-white group-hover:text-slate-900 transition-colors">Continuar al Panel</span>
                            <ArrowRight size={18} className="text-white/50 group-hover:text-slate-900 transition-colors" />
                        </button>
                    </div>
                )}

                {status === 'timeout' && (
                    <div className="space-y-8">
                        <div className="w-24 h-24 bg-amber-500/20 rounded-3xl mx-auto flex items-center justify-center border border-amber-500/30 shadow-[0_20px_40px_rgba(245,158,11,0.2)]">
                            <Clock className="text-amber-400 w-12 h-12" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-xl font-black uppercase tracking-widest italic">Casi listo...</h1>
                            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">
                                Activación en proceso
                            </p>
                        </div>
                        <p className="text-white/50 text-sm leading-relaxed px-4">
                            Tu pago fue recibido correctamente, pero la activación está tomando un poco más de lo esperado. No te preocupes, se completará en breve.
                        </p>
                        <button
                            onClick={() => router.push(returnUrl)}
                            className="w-full bg-white/5 hover:bg-white/10 text-white py-4.5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all border border-white/10"
                        >
                            Verificar más tarde
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-8">
                        <div className="w-24 h-24 bg-red-500/20 rounded-3xl mx-auto flex items-center justify-center border border-red-500/30 shadow-[0_20px_40px_rgba(239,68,68,0.2)]">
                            <XCircle className="text-red-400 w-12 h-12" />
                        </div>
                        <h1 className="text-xl font-black uppercase tracking-widest italic">Error de Validación</h1>
                        <p className="text-white/50 text-sm leading-relaxed px-4">
                            Hubo un problema al verificar el estado de tu pago. Si el cargo fue realizado, por favor contacta a nuestro equipo de soporte.
                        </p>
                        <button
                            onClick={() => router.push(returnUrl)}
                            className="w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white py-4.5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all border border-red-500/20"
                        >
                            Regresar
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <SuccessContent />
        </Suspense>
    );
}
