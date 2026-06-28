"use client";

import { Bell } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
    id: number;
    title: string;
    message: string;
    type: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    action_url?: string;
    is_read: boolean;
    created_at: string;
}

interface NotificationBellProps {
    apiBaseUrl: string; // e.g., "/api/veterinary/notifications", "/api/creator/notifications"
    className?: string;
}

export default function NotificationBell({ apiBaseUrl, className = "" }: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false);
    const queryClient = useQueryClient();

    // Fetch unread count
    const { data: countData } = useQuery({
        queryKey: ['notifications-count', apiBaseUrl],
        queryFn: async () => {
            // Try unread-count endpoint first (veterinary)
            try {
                const res = await fetch(`${apiBaseUrl}/unread-count`);
                if (res.ok) {
                    const data = await res.json();
                    return { unread_count: data.unread_count };
                }
            } catch { }

            // Fallback to regular endpoint
            const res = await fetch(`${apiBaseUrl}?limit=1&include_read=false`);
            const data = await res.json();
            return { unread_count: data.total || 0 };
        },
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    // Fetch notifications when panel is open
    const { data: notifications } = useQuery({
        queryKey: ['notifications', apiBaseUrl],
        queryFn: async () => {
            const res = await fetch(`${apiBaseUrl}?limit=10&include_read=false`);
            const data = await res.json();
            return data.items || [];
        },
        enabled: isOpen, // Only fetch when panel is open
    });

    // Mark as read mutation
    const markAsReadMutation = useMutation({
        mutationFn: async (notificationId: number) => {
            const res = await fetch(`${apiBaseUrl}/${notificationId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_read: true }),
            });
            if (!res.ok) throw new Error('Failed to mark as read');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications-count', apiBaseUrl] });
            queryClient.invalidateQueries({ queryKey: ['notifications', apiBaseUrl] });
        },
    });

    // Mark all as read
    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`${apiBaseUrl}/mark-all-read`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error('Failed to mark all as read');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications-count', apiBaseUrl] });
            queryClient.invalidateQueries({ queryKey: ['notifications', apiBaseUrl] });
            setIsOpen(false);
        },
    });

    const unreadCount = countData?.unread_count || 0;

    const handleNotificationClick = (notif: Notification) => {
        // Mark as read
        if (!notif.is_read) {
            markAsReadMutation.mutate(notif.id);
        }

        // Navigate to action_url if exists
        if (notif.action_url) {
            window.location.href = notif.action_url;
        }

        setIsOpen(false);
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'bg-red-500';
            case 'high': return 'bg-orange-500';
            case 'normal': return 'bg-green-500';
            case 'low': return 'bg-gray-400';
            default: return 'bg-blue-500';
        }
    };

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2.5 rounded-xl hover:bg-[var(--muted-color)] transition-colors"
                aria-label="Notifications"
            >
                <Bell size={20} strokeWidth={2} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Notification Panel */}
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                <h3 className="font-semibold text-lg">Notificaciones</h3>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={() => markAllAsReadMutation.mutate()}
                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        Marcar todas como leídas
                                    </button>
                                )}
                            </div>

                            {/* Notifications List */}
                            <div className="max-h-[500px] overflow-y-auto">
                                {notifications && notifications.length > 0 ? (
                                    notifications.map((notif: Notification) => (
                                        <div
                                            key={notif.id}
                                            onClick={() => handleNotificationClick(notif)}
                                            className="p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors"
                                        >
                                            <div className="flex items-start gap-3">
                                                {/* Priority Indicator */}
                                                <div className={`w-2 h-2 rounded-full mt-2 ${getPriorityColor(notif.priority)}`} />

                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-medium text-sm mb-1 text-gray-900 dark:text-white">
                                                        {notif.title}
                                                    </h4>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                                        {notif.message}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {new Date(notif.created_at).toLocaleDateString('es-ES', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>

                                                {/* Unread Indicator */}
                                                {!notif.is_read && (
                                                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-gray-500">
                                        <Bell size={48} className="mx-auto mb-3 opacity-20" />
                                        <p>No tienes notificaciones nuevas</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
