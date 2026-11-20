import React from 'react';
import { Zap } from 'lucide-react';

/** «Prioridad»: la orden tiene un plan marcado como prioritario (Gestión de Servicios → plan). */
export default function PriorityBadge({
    plan,
    size = 'sm',
    className = '',
    showLabel = false,
}: {
    plan?: string | null;
    size?: 'sm' | 'md';
    className?: string;
    /** Si es true muestra el texto "Prioridad", por defecto false (solo icono de rayo). */
    showLabel?: boolean;
}) {
    if (!plan) return null;
    return (
        <span
            title={`Plan prioritario: ${plan}`}
            aria-label={`Plan prioritario: ${plan}`}
            className={`inline-flex items-center justify-center rounded-md font-black uppercase tracking-wide bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/40 shrink-0 ${
                showLabel
                    ? size === 'md'
                        ? 'text-[11px] px-2 py-1 gap-1'
                        : 'text-[9px] px-1.5 py-0.5 gap-1'
                    : size === 'md'
                        ? 'p-1'
                        : 'p-0.5 px-1'
            } ${className}`}
        >
            <Zap size={size === 'md' ? 12 : 10} className="fill-current text-orange-500 dark:text-orange-400" />
            {showLabel && <span>Prioridad</span>}
        </span>
    );
}

