import React from 'react';
import { Zap } from 'lucide-react';

/** «Prioridad»: la orden tiene un plan marcado como prioritario (Gestión de Servicios → plan). */
export default function PriorityBadge({ plan, size = 'sm', className = '' }: { plan?: string | null; size?: 'sm' | 'md'; className?: string }) {
    if (!plan) return null;
    return (
        <span
            title={`Plan prioritario: ${plan}`}
            className={`inline-flex items-center gap-1 rounded-md font-black uppercase tracking-wide bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/40 shrink-0 ${
                size === 'md' ? 'text-[11px] px-2 py-1' : 'text-[9px] px-1.5 py-0.5'} ${className}`}
        >
            <Zap size={size === 'md' ? 12 : 10} className="fill-current" /> Prioridad
        </span>
    );
}
