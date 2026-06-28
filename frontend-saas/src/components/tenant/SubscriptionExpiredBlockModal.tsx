"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Lock, LogOut, RefreshCcw, Mail, ShieldAlert } from 'lucide-react';
import { clearToken } from '@/lib/auth/token';

export interface SubscriptionExpiredDetail {
    code?: string;
    message?: string;
    tenant_name?: string;
    plan?: string;
    billing_cycle?: string;
    amount_due?: number;
    currency?: string;
    billing_end_date?: string;
    grace_limit_date?: string;
    support_email?: string;
    support_whatsapp?: string;
    saas_name?: string;
}

interface Props {
    detail: SubscriptionExpiredDetail;
}

const formatCLP = (value: number | undefined) => {
    const safe = typeof value === 'number' && !isNaN(value) ? value : 0;
    try {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            maximumFractionDigits: 0,
        }).format(safe);
    } catch {
        return `$${Math.round(safe).toLocaleString('es-CL')} CLP`;
    }
};

const formatDate = (iso?: string) => {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return iso;
    }
};

const sanitizePhone = (phone?: string) => (phone || '').replace(/[^\d]/g, '');

export default function SubscriptionExpiredBlockModal({ detail }: Props) {
    const {
        tenant_name,
        plan = 'PRO',
        billing_cycle = 'monthly',
        amount_due = 0,
        billing_end_date,
        support_email = 'soporte@saascrematorio.cl',
        support_whatsapp = '',
        saas_name = 'SaaS Crematorio',
    } = detail || {};

    const phoneDigits = sanitizePhone(support_whatsapp);
    const cycleLabel = billing_cycle === 'annual' ? 'Anual' : 'Mensual';

    const handleWhatsApp = () => {
        if (!phoneDigits) return;
        const msg = encodeURIComponent(
            `Hola ${saas_name}, soy de ${tenant_name || 'mi empresa'} y necesito regularizar el pago de mi suscripción ${plan} (${cycleLabel}). Total a pagar: ${formatCLP(amount_due)}.`
        );
        window.open(`https://wa.me/${phoneDigits}?text=${msg}`, '_blank', 'noopener,noreferrer');
    };

    const handleEmail = () => {
        const subject = encodeURIComponent(`Regularización de Suscripción - ${tenant_name || ''}`);
        const body = encodeURIComponent(
            `Buenas tardes,\n\nSoy de ${tenant_name || ''} y necesito regularizar el pago de mi suscripción.\n\nPlan: ${plan} (${cycleLabel})\nTotal a pagar: ${formatCLP(amount_due)}\n\nQuedo atento(a) a sus instrucciones.\n\nSaludos.`
        );
        window.location.href = `mailto:${support_email}?subject=${subject}&body=${body}`;
    };

    const handleVerifyPayment = () => {
        window.location.reload();
    };

    const handleLogout = () => {
        clearToken();
        try { localStorage.removeItem('saasc_user'); } catch { /* ignore */ }
        window.location.href = '/login';
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-[#0a192f]/95 backdrop-blur-md text-white overflow-y-auto">
            {/* Decorative background glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="relative z-10 w-full max-w-lg bg-white/5 border border-white/10 backdrop-blur-2xl rounded-[2rem] shadow-2xl p-8 sm:p-10"
            >
                {/* Icono Principal */}
                <div className="relative mx-auto w-20 h-20 mb-6">
                    <div className="absolute inset-0 bg-red-500/30 rounded-3xl blur-xl animate-pulse" />
                    <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500/30 to-orange-500/30 border border-red-400/30 flex items-center justify-center">
                        <Lock size={40} className="text-red-300" />
                    </div>
                </div>

                <div className="text-center mb-6">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/15 border border-red-400/20 text-red-300 text-[10px] uppercase font-black tracking-widest mb-3">
                        <ShieldAlert size={12} /> Suscripción Vencida
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-3">
                        Acceso Bloqueado
                    </h1>
                    <p className="text-white/60 font-medium leading-relaxed text-sm sm:text-base">
                        Tu periodo de gracia ha finalizado. Para reactivar el acceso al panel, regulariza el pago contactándonos por los siguientes medios.
                    </p>
                </div>

                {/* Bloque resumen del pago */}
                <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-5 mb-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                            <div className="text-[10px] uppercase font-black text-white/30 tracking-widest mb-1">Plan</div>
                            <div className="text-lg font-bold text-white">{plan}</div>
                            <div className="text-xs text-white/40 mt-0.5">{cycleLabel}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] uppercase font-black text-white/30 tracking-widest mb-1">Vencimiento</div>
                            <div className="text-sm font-bold text-white/80">{formatDate(billing_end_date) || '—'}</div>
                        </div>
                    </div>
                    <div className="h-px bg-white/10 mb-4" />
                    <div className="flex items-end justify-between">
                        <span className="text-[10px] uppercase font-black text-white/30 tracking-widest">Total a pagar</span>
                        <span className="text-3xl font-black bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
                            {formatCLP(amount_due)}
                        </span>
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="flex flex-col gap-3">
                    {phoneDigits && (
                        <button
                            onClick={handleWhatsApp}
                            className="group relative w-full py-4 rounded-2xl font-black text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 shadow-xl shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 overflow-hidden"
                        >
                            <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 animate-pulse rounded-2xl pointer-events-none" />
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                                <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.514 5.26l-.999 3.648 3.974-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.298-.018-.458.13-.606.134-.133.297-.347.446-.521.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479c0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413z" />
                            </svg>
                            CONTACTAR POR WHATSAPP
                        </button>
                    )}

                    <button
                        onClick={handleEmail}
                        className="w-full py-3.5 rounded-2xl font-bold text-white bg-white/10 border border-white/10 hover:bg-white/15 hover:border-white/20 transition-all flex items-center justify-center gap-3"
                    >
                        <Mail size={18} />
                        ENVIAR CORREO A SOPORTE
                    </button>

                    <div className="grid grid-cols-2 gap-3 mt-1">
                        <button
                            onClick={handleVerifyPayment}
                            className="py-3 rounded-2xl font-bold text-white/80 bg-transparent border border-white/15 hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            <RefreshCcw size={16} />
                            VERIFICAR PAGO
                        </button>
                        <button
                            onClick={handleLogout}
                            className="py-3 rounded-2xl font-bold text-white/60 bg-transparent border border-white/15 hover:bg-white/5 hover:text-white/90 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            <LogOut size={16} />
                            CERRAR SESIÓN
                        </button>
                    </div>
                </div>

                {/* Pie de contacto */}
                <div className="mt-7 pt-5 border-t border-white/10 text-center">
                    <div className="text-[10px] uppercase font-black text-white/30 tracking-widest mb-1">Soporte</div>
                    <div className="text-sm text-white/70 font-medium break-words">{support_email}</div>
                    {support_whatsapp && (
                        <div className="text-xs text-white/40 mt-1">WhatsApp: {support_whatsapp}</div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
