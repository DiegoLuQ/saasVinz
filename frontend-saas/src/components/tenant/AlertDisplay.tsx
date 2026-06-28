"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Bell, X, Info, Trophy, Megaphone, MessageCircle } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useAnnouncements } from '@/hooks/useSessionBootstrap';

interface Alert {
    id: number;
    type: 'info' | 'promo' | 'alert' | 'welcome' | 'update';
    display_type: 'modal' | 'banner';
    title: string;
    content: string;
    must_read: boolean;
    show_once: boolean;
    priority: number;
    created_at: string;
    target_plan?: {
        name: string;
    } | null;
    target_status?: string | null;
}

const typeLabels: Record<string, string> = {
    info: 'Información',
    promo: 'Promoción',
    alert: 'Alerta',
    welcome: 'Bienvenida',
    update: 'Actualización'
};

export default function AlertDisplay() {
    const bootstrapAlerts = useAnnouncements();
    const [dismissedAlerts, setDismissedAlerts] = useState<number[]>([]);
    const [lastSeenTimestamp, setLastSeenTimestamp] = useState<number>(0);

    const alerts = bootstrapAlerts as unknown as Alert[];

    useEffect(() => {
        const saved = localStorage.getItem('last_announcement_modal_timestamp');
        if (saved) setLastSeenTimestamp(parseInt(saved));
    }, []);

    const handleDismiss = async (alertId: number) => {
        const alert = alerts.find(a => a.id === alertId);
        if (!alert) return;

        // 1. Locally dismiss
        setDismissedAlerts(prev => [...prev, alertId]);

        // 2. Mark as viewed in backend if show_once
        if (alert.show_once) {
            try {
                await apiRequest(`/api/internal/admin/announcements/${alertId}/view`, {
                    method: 'POST'
                });
            } catch (error) {
                console.error('Error marking alert as viewed:', error);
            }
        }

        // 3. Save timestamp only for modal dismissals (to prevent showing another one immediately)
        if (alert.display_type === 'modal') {
            const now = Date.now();
            localStorage.setItem('last_announcement_modal_timestamp', now.toString());
            setLastSeenTimestamp(now);
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return new Intl.DateTimeFormat('es-CL', { month: 'long', day: 'numeric' }).format(new Date(dateString));
        } catch (e) {
            return '';
        }
    };

    const THROTTLE_MS = 2 * 60 * 60 * 1000; // 2 hours
    const isThrottled = (Date.now() - lastSeenTimestamp) < THROTTLE_MS;

    const visibleAlerts = alerts.filter(a => !dismissedAlerts.includes(a.id));

    // Logic for modals: show if must_read OR not throttled
    const modalAlerts = visibleAlerts.filter(a =>
        a.display_type === 'modal' && (a.must_read || !isThrottled)
    );

    const bannerAlerts = visibleAlerts.filter(a => a.display_type === 'banner');

    const getIcon = (type: string, size = 24) => {
        switch (type) {
            case 'alert': return <AlertCircle className="text-red-400" size={size} />;
            case 'promo': return <Trophy className="text-amber-400" size={size} />;
            case 'info': return <Info className="text-blue-400" size={size} />;
            case 'welcome': return <Megaphone className="text-emerald-400" size={size} />;
            case 'update': return <Bell className="text-primary" size={size} />;
            default: return <Bell className="text-primary" size={size} />;
        }
    };

    const getThemeColors = (type: string) => {
        switch (type) {
            case 'alert': return {
                bg: 'bg-red-500/10',
                border: 'border-red-500/20',
                accent: 'bg-red-500/20',
                glow: 'from-red-500/10 via-red-500/5 to-transparent'
            };
            case 'promo': return {
                bg: 'bg-amber-500/10',
                border: 'border-amber-500/20',
                accent: 'bg-amber-500/20',
                glow: 'from-amber-500/10 via-amber-500/5 to-transparent'
            };
            case 'info': return {
                bg: 'bg-blue-500/10',
                border: 'border-blue-500/20',
                accent: 'bg-blue-500/20',
                glow: 'from-blue-500/10 via-blue-500/5 to-transparent'
            };
            case 'welcome': return {
                bg: 'bg-emerald-500/10',
                border: 'border-emerald-500/20',
                accent: 'bg-emerald-500/20',
                glow: 'from-emerald-500/10 via-emerald-500/5 to-transparent'
            };
            case 'update':
            default: return {
                bg: 'bg-primary/10',
                border: 'border-primary/20',
                accent: 'bg-primary/20',
                glow: 'from-primary/10 via-primary/5 to-transparent'
            };
        }
    };

    return (
        <>
            {/* Banner Alerts */}
            <div className="fixed top-0 left-0 right-0 z-[99999] flex flex-col pointer-events-none">
                <AnimatePresence>
                    {bannerAlerts.map(alert => {
                        const theme = getThemeColors(alert.type);
                        return (
                            <motion.div
                                key={alert.id}
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className={`w-full bg-[#0a192f]/90 ${theme.border} border-b backdrop-blur-md pointer-events-auto overflow-hidden`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-r ${theme.glow} opacity-30 pointer-events-none`} />
                                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-6 relative z-10">
                                    <div className={`p-2 ${theme.bg} rounded-xl`}>
                                        {getIcon(alert.type, 20)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h4 className="font-black text-white text-[10px] uppercase tracking-[0.2em]">{alert.title}</h4>
                                            <span className="text-[9px] text-white/30 italic font-medium">— {typeLabels[alert.type]}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <p className="text-xs text-white/50 font-medium">{alert.content}</p>
                                            <span className="text-[10px] text-white/20 font-medium">{formatDate(alert.created_at)}</span>
                                        </div>
                                    </div>
                                    {!alert.must_read && (
                                        <button
                                            onClick={() => handleDismiss(alert.id)}
                                            className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/20 hover:text-white"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Modal Alerts */}
            <AnimatePresence>
                {modalAlerts.length > 0 && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-[#061121]/95 backdrop-blur-xl"
                            onClick={() => !modalAlerts[0].must_read && handleDismiss(modalAlerts[0].id)}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative max-w-sm w-full bg-white/5 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-2xl"
                        >
                            {/* Decorative background glow */}
                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br ${getThemeColors(modalAlerts[0].type).glow} rounded-full blur-[80px] opacity-20 pointer-events-none`} />

                            <div className="p-10 relative z-10 flex flex-col items-center">
                                {/* Icon Header */}
                                <div className={`w-20 h-20 rounded-3xl ${getThemeColors(modalAlerts[0].type).bg} flex items-center justify-center mb-8 shadow-inner border ${getThemeColors(modalAlerts[0].type).border}`}>
                                    {getIcon(modalAlerts[0].type, 32)}
                                </div>

                                {/* Content */}
                                <div className="text-center space-y-1 mb-4">
                                    <span className="text-[11px] text-white/30 italic font-bold uppercase tracking-widest">
                                        {typeLabels[modalAlerts[0].type]}
                                    </span>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                                        {modalAlerts[0].title}
                                    </h3>
                                    <div className="flex flex-col items-center gap-1 opacity-40">
                                        <span className="text-[11px] text-white font-medium">
                                            {formatDate(modalAlerts[0].created_at)}
                                        </span>
                                        <span className="text-[10px] text-white/70 font-bold tracking-tight">
                                            {modalAlerts[0].target_plan ? `PLAN: ${modalAlerts[0].target_plan.name.toUpperCase()}` : 'DISPONIBLE PARA TODOS LOS PLANES'}
                                        </span>
                                    </div>
                                </div>

                                <p className="text-white/60 font-medium leading-relaxed text-center mb-8">
                                    {modalAlerts[0].content}
                                </p>

                                {/* Footer Actions */}
                                <div className="w-full space-y-3">
                                    {modalAlerts[0].must_read && (
                                        <div className="bg-red-500/10 border border-red-500/10 rounded-2xl p-4 mb-2">
                                            <p className="text-[10px] text-red-500 font-black uppercase tracking-widest text-center">
                                                🚨 LECTURA OBLIGATORIA 🚨
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => handleDismiss(modalAlerts[0].id)}
                                        className="w-full py-4 bg-white text-[#0a192f] font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-white/90 transition-all shadow-xl active:scale-95"
                                    >
                                        {modalAlerts[0].must_read ? 'ENTENDIDO Y CONTINUAR' : 'ENTENDIDO'}
                                    </button>

                                    {modalAlerts[0].type === 'alert' && (
                                        <button
                                            onClick={() => window.location.href = 'mailto:soporte@tu-dominio.cl'}
                                            className="w-full py-3 bg-white/5 text-white/60 text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                                        >
                                            <MessageCircle size={14} />
                                            CONTACTAR SOPORTE
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}

