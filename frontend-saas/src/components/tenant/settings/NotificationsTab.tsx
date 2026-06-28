import React, { useState, useEffect } from 'react';
import { Filter, Search, Bell, MessageCircle, User, Dog, Scissors, Eye, Check, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { apiRequest } from '@/lib/tenant/api';
import { useQueryClient } from '@tanstack/react-query';
import { useInitialNotifications } from '@/hooks/useSessionBootstrap';
import NotificationDetailModal from '@/components/tenant/modals/NotificationDetailModal';
import { parseServerDate, formatChileDateTime } from '@/lib/dates';

export function NotificationsTab() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const bootstrapNotifications = useInitialNotifications();

    const [notifications, setNotifications] = useState<any[]>([]);
    const [notificationsTotal, setNotificationsTotal] = useState(0);
    const [notificationsPage, setNotificationsPage] = useState(0);
    const [notificationsLimit] = useState(15);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');

    const [selectedNotification, setSelectedNotification] = useState<any>(null);
    const [showNotificationModal, setShowNotificationModal] = useState(false);

    const fetchNotifications = async () => {
        try {
            const params = new URLSearchParams({
                skip: (notificationsPage * notificationsLimit).toString(),
                limit: notificationsLimit.toString(),
                include_read: 'true'
            });
            const data = await apiRequest(`/api/internal/notifications?${params.toString()}`);
            setNotifications(data.items);
            setNotificationsTotal(data.total);
        } catch (err: any) {
            showToast('Error al cargar notificaciones', 'error');
        }
    };

    const handleMarkAsRead = async (notificationId: number) => {
        try {
            await apiRequest(`/api/internal/notifications/${notificationId}`, {
                method: 'PATCH',
                body: JSON.stringify({ is_read: true })
            });
            showToast('Notificación marcada como leída', 'success');
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
            fetchNotifications(); // Update local full history
        } catch (err) {
            showToast('Error al actualizar notificación', 'error');
        }
    };

    const handleDeleteNotification = async (notificationId: number) => {
        try {
            await apiRequest(`/api/internal/notifications/${notificationId}`, {
                method: 'DELETE'
            });
            showToast('Notificación eliminada', 'success');
            fetchNotifications();
        } catch (err) {
            showToast('Error al eliminar notificación', 'error');
        }
    };

    useEffect(() => {
        if (bootstrapNotifications && notifications.length === 0) {
            setNotifications(bootstrapNotifications);
        }
    }, [bootstrapNotifications]);

    useEffect(() => {
        fetchNotifications();
    }, [notificationsPage]);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="border-b border-white/5 pb-6">
                <h3 className="text-xl font-bold">Historial de Notificaciones</h3>
                <p className="text-sm text-muted-foreground mt-1">Revisa todas las alertas y mensajes del sistema.</p>
            </div>

            {/* Search and Filters */}
            <div className="glass-card p-6 rounded-3xl space-y-4 border-white/5">
                <div className="flex items-center gap-2 mb-2">
                    <Filter size={18} className="text-primary" />
                    <h4 className="font-bold text-sm">Filtros de Búsqueda</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search by message */}
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar mensaje..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-3 text-sm outline-none focus:border-primary/50 transition-all"
                        />
                    </div>

                    {/* Filter by type */}
                    <div className="relative">
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-3 pr-10 text-sm outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer hover:bg-black/30 text-white"
                        >
                            <option value="all" className="bg-[#1a1f2e] text-white">Todos los tipos</option>
                            <option value="new_submission" className="bg-[#1a1f2e] text-white">Nueva Solicitud</option>
                            <option value="system" className="bg-[#1a1f2e] text-white">Sistema</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" className="text-muted-foreground">
                                <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>

                    {/* Date from */}
                    <input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        placeholder="Desde"
                        className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-3 text-sm outline-none focus:border-primary/50 transition-all"
                        style={{ colorScheme: 'dark' }}
                    />

                    {/* Date to */}
                    <input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        placeholder="Hasta"
                        className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-3 text-sm outline-none focus:border-primary/50 transition-all"
                        style={{ colorScheme: 'dark' }}
                    />
                </div>
            </div>

            {notifications.length === 0 ? (
                <div className="glass-card rounded-[2.5rem] p-12 text-center border-white/5">
                    <Bell size={48} className="mx-auto text-muted-foreground/20 mb-4" />
                    <p className="text-muted-foreground font-medium">No hay notificaciones</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex flex-col gap-3">
                        {notifications
                            .filter((notif) => {
                                const matchesSearch = !searchTerm ||
                                    notif.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    notif.message?.toLowerCase().includes(searchTerm.toLowerCase());
                                const matchesType = filterType === 'all' || notif.type === filterType;
                                const notifDate = parseServerDate(notif.created_at);
                                const matchesDateFrom = !filterDateFrom || (notifDate && notifDate >= new Date(filterDateFrom));
                                const matchesDateTo = !filterDateTo || (notifDate && notifDate <= new Date(filterDateTo + 'T23:59:59'));
                                return matchesSearch && matchesType && matchesDateFrom && matchesDateTo;
                            })
                            .map((notif) => (
                                <motion.div
                                    key={notif.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`glass-card p-5 rounded-2xl border transition-all hover:bg-white/5 group ${notif.is_read ? 'opacity-50 border-white/5' : 'border-primary/20 bg-primary/2'}`}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${notif.type?.toLowerCase() === 'new_submission' ? 'bg-blue-500/15 text-blue-400' :
                                                notif.type?.toLowerCase() === 'system' ? 'bg-purple-500/15 text-purple-400' :
                                                    'bg-white/10 text-muted-foreground'
                                                }`}>
                                                {notif.type?.toLowerCase() === 'new_submission' ? <MessageCircle size={20} /> : <Bell size={20} />}
                                            </div>
                                            <div className="space-y-1 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-white text-base">{notif.title}</h4>
                                                    {!notif.is_read && <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(255,107,0,0.5)]"></span>}
                                                </div>
                                                <p className="text-sm text-white/60 line-clamp-1">{notif.message}</p>

                                                {/* Detalle compacto de cliente/mascota/servicio */}
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
                                                    {notif.data?.owner_name && (
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-lg">
                                                            <User size={12} className="text-primary/70" />
                                                            <span className="font-medium">{notif.data.owner_name}</span>
                                                        </div>
                                                    )}
                                                    {notif.data?.pet_name && (
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-lg">
                                                            <Dog size={12} className="text-blue-400/70" />
                                                            <span className="font-medium">{notif.data.pet_name}</span>
                                                        </div>
                                                    )}
                                                    {notif.data?.service_name && (
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-lg">
                                                            <Scissors size={12} className="text-emerald-400/70" />
                                                            <span className="font-medium">{notif.data.service_name}</span>
                                                        </div>
                                                    )}
                                                    <div className="text-[11px] text-muted-foreground/60 italic ml-auto">
                                                        {formatChileDateTime(notif.created_at)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 md:justify-end shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    setSelectedNotification(notif);
                                                    setShowNotificationModal(true);
                                                }}
                                                className="p-2.5 rounded-xl bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white transition-all transform hover:scale-105"
                                                title="Ver detalles"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            {!notif.is_read && (
                                                <button
                                                    onClick={() => handleMarkAsRead(notif.id)}
                                                    className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all transform hover:scale-105"
                                                    title="Marcar como leída"
                                                >
                                                    <Check size={18} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteNotification(notif.id)}
                                                className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all transform hover:scale-105"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                    </div>

                    {/* Pagination Footer */}
                    <div className="flex items-center justify-between px-2 py-4 border-t border-white/5 mt-4">
                        <p className="text-sm text-muted-foreground">
                            Mostrando <span className="font-bold text-white">{notifications.length}</span> de <span className="font-bold text-white">{notificationsTotal}</span> notificaciones
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setNotificationsPage(prev => Math.max(0, prev - 1))}
                                disabled={notificationsPage === 0}
                                className="p-2 rounded-xl bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div className="flex items-center gap-1 mx-2">
                                <span className="text-sm font-bold text-primary">{notificationsPage + 1}</span>
                                <span className="text-sm text-muted-foreground">de</span>
                                <span className="text-sm font-bold text-white">{Math.ceil(notificationsTotal / notificationsLimit) || 1}</span>
                            </div>
                            <button
                                onClick={() => setNotificationsPage(prev => prev + 1)}
                                disabled={(notificationsPage + 1) * notificationsLimit >= notificationsTotal}
                                className="p-2 rounded-xl bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <NotificationDetailModal
                isOpen={showNotificationModal}
                onClose={() => setShowNotificationModal(false)}
                notification={selectedNotification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDeleteNotification}
            />
        </div>
    );
}
