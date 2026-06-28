"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Bell,
    Dog,
    User,
    Building2,
    Trash2,
    Check,
    Calendar,
    Clock,
    CreditCard,
    Info,
    AlertCircle,
    CheckCircle2,
    Database,
    MessageCircle
} from 'lucide-react';
import { formatChileDate, formatChileTime } from '@/lib/dates';

interface NotificationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    notification: any;
    onMarkAsRead?: (id: number) => void;
    onDelete?: (id: number) => void;
}

export default function NotificationDetailModal({
    isOpen,
    onClose,
    notification,
    onMarkAsRead,
    onDelete
}: NotificationDetailModalProps) {
    if (!notification) return null;

    const getTypeConfig = (type: string) => {
        const t = type?.toLowerCase();
        if (t === 'new_submission') return {
            label: 'Nueva Solicitud',
            icon: Dog,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20'
        };
        if (t === 'system') return {
            label: 'Sistema',
            icon: Info,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20'
        };
        if (t === 'billing' || t === 'payment_report' || t === 'payment_approved') return {
            label: 'Facturación',
            icon: CreditCard,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20'
        };
        return {
            label: 'Notificación',
            icon: Bell,
            color: 'text-white/40',
            bg: 'bg-white/5',
            border: 'border-white/10'
        };
    };

    const config = getTypeConfig(notification.type);

    // Format data keys for display
    const formatKey = (key: string) => {
        return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    />

                    {/* Modal Body */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                        className="relative w-full max-w-2xl bg-[#0f1115]/90 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header Section */}
                        <div className="p-8 lg:p-10 border-b border-white/5 relative">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${config.bg} ${config.color} ${config.border}`}>
                                        {config.label?.toUpperCase() || 'SISTEMA'}
                                    </div>
                                    {!notification.is_read && (
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-primary/20">
                                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                            Nuevo
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-none">
                                    {notification.title}
                                </h3>
                                <div className="flex items-center gap-4 text-white/30 text-xs font-bold uppercase tracking-widest">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={14} className="text-primary/50" />
                                        {formatChileDate(notification.created_at)}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock size={14} className="text-primary/50" />
                                        {formatChileTime(notification.created_at)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content Section */}
                        <div className="p-8 lg:p-10 space-y-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {/* Message */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-4 bg-primary rounded-full" />
                                    <h4 className="text-[10px] uppercase font-black text-white/30 tracking-[0.2em]">Cuerpo del Mensaje</h4>
                                </div>
                                <p className="text-xl text-white/80 leading-relaxed font-medium">
                                    {notification.message}
                                </p>
                            </div>

                            {/* Dynamic Data Grid */}
                            {notification.data && Object.keys(notification.data).filter(k => k !== 'notes' && k !== 'receipt_url').length > 0 && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-4 bg-primary rounded-full" />
                                        <h4 className="text-[10px] uppercase font-black text-white/30 tracking-[0.2em]">Detalles Técnicos</h4>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {Object.entries(notification.data)
                                            .filter(([key]) =>
                                                key !== 'notes' &&
                                                key !== 'receipt_url' &&
                                                !key.toLowerCase().endsWith('_id') &&
                                                key.toLowerCase() !== 'id'
                                            )
                                            .map(([key, value]: [string, any]) => {
                                                // Handle special keys with better icons
                                                let Icon = Database;
                                                let colorClass = "text-white/40";
                                                let bgClass = "bg-white/5";

                                                if (key.includes('pet')) { Icon = Dog; colorClass = "text-blue-400"; bgClass = "bg-blue-500/10"; }
                                                if (key.includes('owner') || key.includes('client')) { Icon = User; colorClass = "text-orange-400"; bgClass = "bg-orange-500/10"; }
                                                if (key.includes('service') || key.includes('plan')) { Icon = Building2; colorClass = "text-emerald-400"; bgClass = "bg-emerald-500/10"; }
                                                if (key.includes('id') || key.includes('transaction')) { Icon = Database; colorClass = "text-purple-400"; bgClass = "bg-purple-500/10"; }
                                                if (key.includes('date')) { Icon = Calendar; colorClass = "text-yellow-400"; bgClass = "bg-yellow-500/10"; }

                                                return (
                                                    <div
                                                        key={key}
                                                        className="bg-white/2 border border-white/5 p-5 rounded-3xl flex items-center gap-4 transition-all hover:bg-white/5 group"
                                                    >
                                                        <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${bgClass} ${colorClass} group-hover:scale-110 transition-transform`}>
                                                            <Icon size={24} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-0.5">{formatKey(key)}</p>
                                                            <p className="text-white font-bold truncate text-base">
                                                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}

                            {/* Admin Notes Section (Highlighted per user request) */}
                            {notification.data?.notes && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-4 bg-orange-500 rounded-full" />
                                        <h4 className="text-[10px] uppercase font-black text-orange-500/60 tracking-[0.2em]">Notas de Administración</h4>
                                    </div>
                                    <div className="bg-orange-500/5 border border-orange-500/20 p-6 rounded-[2rem] relative overflow-hidden group">
                                        <MessageCircle className="absolute -right-4 -bottom-4 w-24 h-24 text-orange-500/10 -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
                                        <p className="text-lg text-orange-100 font-medium italic relative z-10">
                                            "{notification.data.notes}"
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Section */}
                        <div className="p-8 lg:p-10 bg-white/2 border-t border-white/5 flex flex-col sm:flex-row justify-end gap-3">
                            {!notification.is_read && onMarkAsRead && (
                                <button
                                    onClick={() => {
                                        onMarkAsRead(notification.id);
                                        // Usually we close after marking as read in a detail view, 
                                        // but we can let the parent decide.
                                    }}
                                    className="flex-1 sm:flex-none px-8 py-4 bg-emerald-500 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={18} />
                                    Marcar como Leído
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={() => onDelete(notification.id)}
                                    className="flex-1 sm:flex-none px-8 py-4 bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/20 text-white/60 hover:text-red-400 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 group"
                                >
                                    <Trash2 size={18} className="group-hover:rotate-12 transition-transform" />
                                    Eliminar
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
