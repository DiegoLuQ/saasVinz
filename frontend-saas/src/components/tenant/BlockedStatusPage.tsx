"use client";

import React from 'react';
import { Lock, AlertTriangle, LogOut, MessageCircle, RefreshCcw, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePolar } from '@/hooks/usePolar';
import { clearToken } from '@/lib/auth/token';

interface BlockedStatusPageProps {
    status: 'inactive' | 'suspended';
    reason?: string;
    tenant?: any;
}

export default function BlockedStatusPage({ status, reason, tenant }: BlockedStatusPageProps) {
    const { openPortal, loading } = usePolar();

    const handleReactivate = async () => {
        if (tenant?.polar_customer_id) {
            await openPortal(tenant.polar_customer_id, window.location.origin + '/tenant/dashboard');
        } else {
            // If no customer ID, redirect to pricing or support
            window.location.href = '/pricing';
        }
    };

    const handleLogout = async () => {
        await clearToken();
        localStorage.removeItem('saasc_user');
        window.location.href = '/login';
    };

    const isSuspended = status === 'suspended';

    return (
        <div className="min-h-screen bg-[#0a192f] flex items-center justify-center p-6 text-white relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-500/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-500/5 rounded-full blur-[120px]" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-white/5 border border-white/10 backdrop-blur-xl p-10 rounded-[2.5rem] text-center relative z-10 shadow-2xl"
            >
                <div className={`w-20 h-20 rounded-3xl ${isSuspended ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'} flex items-center justify-center mx-auto mb-8 shadow-lg`}>
                    {isSuspended ? <AlertTriangle size={40} /> : <Lock size={40} />}
                </div>

                <h1 className="text-3xl font-black mb-4 uppercase tracking-tight">
                    Acceso {isSuspended ? 'Suspendido' : 'Desactivado'}
                </h1>

                <p className="text-white/60 mb-8 font-medium leading-relaxed">
                    Lo sentimos, tu acceso al Panel Administrativo ha sido restringido. {isSuspended ? 'Tu suscripción ha expirado.' : ''}
                </p>

                {(reason || true) && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-10 text-left">
                        <span className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-widest">
                            Estado / Motivo
                        </span>
                        <p className="text-white/80 font-medium italic">
                            "{reason || (isSuspended ? 'Suscripción finalizada en Polar.sh' : 'No se ha proporcionado un motivo específico.')}"
                        </p>
                    </div>
                )}

                <div className="flex flex-col gap-4">
                    {/* Botón de Reactivación Destacado */}
                    {isSuspended && (
                        <button
                            onClick={handleReactivate}
                            disabled={loading}
                            className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 mb-2 group"
                        >
                            {loading ? (
                                <RefreshCcw className="animate-spin" size={20} />
                            ) : (
                                <CreditCard size={20} className="group-hover:rotate-12 transition-transform" />
                            )}
                            {tenant?.polar_customer_id ? 'GESTIONAR Y REACTIVAR' : 'RENOVAR PLAN'}
                        </button>
                    )}

                    <button
                        onClick={() => window.location.href = 'mailto:soporte@tu-dominio.cl'}
                        className="w-full py-4 bg-white/10 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/20 transition-all flex items-center justify-center gap-3"
                    >
                        <MessageCircle size={18} />
                        CONTACTAR SOPORTE
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full py-4 bg-transparent border border-white/10 text-white/60 font-bold rounded-2xl hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-3"
                    >
                        <LogOut size={18} />
                        CERRAR SESIÓN
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
