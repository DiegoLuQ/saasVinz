"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Bell, Info, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function VeterinaryNotificationsPage() {
    // Mock notifications for now as requested ("las notificaciones que llegarán")
    const notifications = [
        {
            id: 1,
            type: 'info',
            title: 'Bienvenido al Portal 2.0',
            message: 'Hemos actualizado tu panel de gestión. Ahora puedes invitar a tus clientes directamente con tu link de crecimiento.',
            created_at: new Date().toISOString(),
            read: false
        },
        {
            id: 2,
            type: 'success',
            title: 'Comisión Pagada',
            message: 'Se ha transferido el pago de comisiones correspondiente al periodo Marzo 2026.',
            created_at: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
            read: true
        }
    ];

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle size={20} className="text-emerald-400" />;
            case 'warning': return <AlertTriangle size={20} className="text-amber-400" />;
            case 'info': default: return <Info size={20} className="text-blue-400" />;
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-[var(--primary-color)] rounded-2xl flex items-center justify-center text-[var(--background-color)] shadow-lg">
                    <Bell size={28} strokeWidth={2.5} />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-[var(--foreground-color)] tracking-tight uppercase italic">Notificaciones</h1>
                    <p className="text-[var(--muted-foreground)] text-sm font-medium tracking-widest uppercase">Tus alertas y mensajes importantes</p>
                </div>
            </div>

            <div className="space-y-4">
                {notifications.length === 0 ? (
                    <div className="text-center py-12 bg-[var(--card-color)] rounded-[2rem] border border-[var(--card-border-color)] border-dashed">
                        <Bell className="mx-auto text-[var(--muted-foreground)] mb-3" size={48} />
                        <h3 className="text-[var(--foreground-color)] font-medium">No tienes notificaciones nuevas</h3>
                        <p className="text-[var(--muted-foreground)] text-sm mt-1">Te avisaremos cuando suceda algo importante.</p>
                    </div>
                ) : (
                    notifications.map((notif, index) => (
                        <motion.div
                            key={notif.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`relative bg-[var(--card-color)] rounded-2xl border p-6 flex gap-4 transition-all hover:shadow-lg group
                                ${notif.read ? 'border-[var(--card-border-color)] opacity-70 hover:opacity-100' : 'border-[var(--primary-color)]/30 shadow-lg bg-[var(--primary-color)]/[0.02]'}
                            `}
                        >
                            <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                                ${notif.read ? 'bg-[var(--muted-color)] text-[var(--muted-foreground)]' : 'bg-[var(--muted-color)]'}
                            `}>
                                {getIcon(notif.type)}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className={`font-bold text-lg mb-1 ${notif.read ? 'text-[var(--muted-foreground)]' : 'text-[var(--foreground-color)]'}`}>
                                        {notif.title}
                                    </h3>
                                    <span className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] flex items-center gap-1">
                                        <Clock size={10} />
                                        {new Date(notif.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                                    {notif.message}
                                </p>
                            </div>
                            {!notif.read && (
                                <div className="absolute top-6 right-6 w-2 h-2 rounded-full bg-[var(--primary-color)] animate-pulse shadow-lg"></div>
                            )}
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
