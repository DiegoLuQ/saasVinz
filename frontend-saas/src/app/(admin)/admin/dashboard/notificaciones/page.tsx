"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell,
    CheckCircle,
    Clock,
    Search,
    Filter,
    ArrowRight,
    Loader2,
    Archive,
    Trash2,
    AlertCircle,
    Info,
    CreditCard
} from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { useRouter } from 'next/navigation';

interface Notification {
    id: number;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
    data: any;
}

import PaymentReviewModal from '@/components/admin/notifications/PaymentReviewModal';

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread'>('unread');
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
    const router = useRouter();

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await apiRequest(`/api/internal/creator/notifications?include_read=${filter === 'all'}`);
            setNotifications(data.items || []);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [filter]);

    const handleMarkAsRead = async (id: number) => {
        try {
            await apiRequest(`/api/internal/creator/notifications/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ is_read: true })
            });
            // Update local state instead of refetching for smoothness
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            if (filter === 'unread') {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await apiRequest('/api/internal/creator/notifications/mark-all-read', {
                method: 'POST'
            });
            fetchNotifications();
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const handleDeleteNotification = async (id: number) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta notificación?')) {
            return;
        }
        try {
            await apiRequest(`/api/internal/creator/notifications/${id}`, {
                method: 'DELETE'
            });
            // Update local state instead of refetching for smoothness
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };


    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'plan_change_request': return <CreditCard className="text-primary" size={20} />;
            case 'payment_report': return <CheckCircle className="text-green-400" size={20} />;
            case 'system': return <Info className="text-blue-400" size={20} />;
            default: return <Bell className="text-white/40" size={20} />;
        }
    };

    const handleAction = (notif: Notification) => {
        if (notif.type === 'plan_change_request') {
            router.push('/dashboard'); // Go to main dashboard where requests are processed
        } else if (notif.type === 'payment_report') {
            setSelectedNotification(notif);
            setReviewModalOpen(true);
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-10">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-white mb-2">Notificaciones</h1>
                    <p className="text-white/40 font-medium">Gestiona las alertas del sistema y solicitudes de tenants.</p>
                </div>
                <div className="flex gap-3">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-1 flex">
                        <button
                            onClick={() => setFilter('unread')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === 'unread' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                        >
                            Pendientes
                        </button>
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === 'all' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                        >
                            Todas
                        </button>
                    </div>
                    <button
                        onClick={handleMarkAllRead}
                        className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
                    >
                        <CheckCircle size={16} /> Marcar todo como leído
                    </button>
                </div>
            </header>

            <div className="space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-primary" size={40} />
                    </div>
                ) : notifications.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {notifications.map((notif) => (
                            <motion.div
                                key={notif.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`group relative bg-black/20 border border-white/5 p-6 rounded-[2rem] hover:border-primary/30 transition-all backdrop-blur-md overflow-hidden ${!notif.is_read ? 'ring-1 ring-primary/20' : ''}`}
                            >
                                {!notif.is_read && (
                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                                )}

                                <div className="flex items-start justify-between gap-6">
                                    <div className="flex items-start gap-5">
                                        <div className="shrink-0 w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                                            {getTypeIcon(notif.type)}
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-bold text-white text-lg">{notif.title}</h3>
                                                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <p className="text-white/60 text-sm leading-relaxed max-w-2xl">{notif.message}</p>

                                            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-white/30 tracking-tight">
                                                    <Clock size={12} />
                                                    {new Date(notif.created_at).toLocaleDateString()}
                                                </div>
                                                {notif.type === 'plan_change_request' && (
                                                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-primary/60 tracking-tight">
                                                        <CreditCard size={12} />
                                                        Solicitud de Plan
                                                    </div>
                                                )}
                                                {notif.type === 'payment_report' && (
                                                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-green-400/60 tracking-tight">
                                                        <CheckCircle size={12} />
                                                        Pago Reportado
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => handleAction(notif)}
                                            className="px-4 py-2 bg-primary/20 hover:bg-primary text-white rounded-xl text-[10px] font-black transition-all flex items-center gap-2 border border-primary/20"
                                        >
                                            REVISAR <ArrowRight size={14} />
                                        </button>
                                        {!notif.is_read && (
                                            <button
                                                onClick={() => handleMarkAsRead(notif.id)}
                                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl text-[10px] font-black transition-all border border-white/5"
                                            >
                                                LEÍDA
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteNotification(notif.id)}
                                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500 hover:text-white text-red-400 rounded-xl text-[10px] font-black transition-all border border-red-500/20 flex items-center justify-center gap-1.5"
                                        >
                                            <Trash2 size={12} /> ELIMINAR
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-white/20 border border-white/5">
                            <Bell size={40} />
                        </div>
                        <div>
                            <p className="text-white/60 font-bold">No tienes notificaciones {filter === 'unread' ? 'pendientes' : ''}.</p>
                            <p className="text-white/20 text-sm">Todo está al día en el sistema.</p>
                        </div>
                    </div>
                )}
            </div>

            <PaymentReviewModal
                isOpen={reviewModalOpen}
                onClose={() => setReviewModalOpen(false)}
                notification={selectedNotification}
                onSuccess={() => {
                    fetchNotifications();
                    // Optionally show toast
                }}
            />
        </div>
    );
}
