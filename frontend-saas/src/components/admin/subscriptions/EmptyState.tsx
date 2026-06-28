"use client";

import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
    title?: string;
    description?: string;
}

export default function EmptyState({
    title = 'Sin solicitudes pendientes',
    description = 'Cuando los tenants soliciten cambios de plan o registren pagos, aparecerán aquí.'
}: EmptyStateProps) {
    return (
        <div className="p-16 text-center flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-white/20">
                <Inbox size={28} />
            </div>
            <div className="text-white/40 font-black uppercase tracking-widest text-sm">{title}</div>
            <p className="text-white/30 text-xs font-medium max-w-md">{description}</p>
        </div>
    );
}
