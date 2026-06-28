"use client";

import React from 'react';
import {
    CheckCircle2,
    Clock,
    XCircle,
    AlertCircle,
    AlertTriangle,
    RefreshCcw,
} from 'lucide-react';

export type StatusKind = 'transaction' | 'subscription' | 'coupon';

interface StatusBadgeProps {
    /** Domain that the status belongs to. Determines label/icon mapping. */
    kind: StatusKind;
    /** Raw status value coming from the API. */
    status: string;
}

interface BadgeStyle {
    classes: string;
    icon: React.ReactNode;
    label: string;
}

const NEUTRAL: BadgeStyle = {
    classes: 'bg-white/5 text-white/40 border-white/10',
    icon: <AlertCircle size={12} />,
    label: '—',
};

const TRANSACTION_MAP: Record<string, BadgeStyle> = {
    completed: { classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle2 size={12} />, label: 'COMPLETED' },
    pending: { classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: <Clock size={12} />, label: 'PENDING' },
    failed: { classes: 'bg-red-500/10 text-red-400 border-red-500/20', icon: <XCircle size={12} />, label: 'FAILED' },
    refunded: { classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: <RefreshCcw size={12} />, label: 'REFUNDED' },
};

const SUBSCRIPTION_MAP: Record<string, BadgeStyle> = {
    active: { classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle2 size={12} />, label: 'ACTIVE' },
    pending: { classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: <Clock size={12} />, label: 'PENDING' },
    expired: { classes: 'bg-red-500/10 text-red-400 border-red-500/20', icon: <AlertTriangle size={12} />, label: 'EXPIRED' },
    canceled: { classes: 'bg-white/5 text-white/40 border-white/10', icon: <XCircle size={12} />, label: 'CANCELED' },
    trial: { classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: <Clock size={12} />, label: 'TRIAL' },
};

const COUPON_MAP: Record<string, BadgeStyle> = {
    active: { classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle2 size={12} />, label: 'ACTIVO' },
    inactive: { classes: 'bg-red-500/10 text-red-400 border-red-500/20', icon: <XCircle size={12} />, label: 'INACTIVO' },
    expired: { classes: 'bg-red-500/10 text-red-400 border-red-500/20', icon: <AlertTriangle size={12} />, label: 'EXPIRADO' },
    exhausted: { classes: 'bg-red-500/10 text-red-400 border-red-500/20', icon: <XCircle size={12} />, label: 'AGOTADO' },
};

const MAPS: Record<StatusKind, Record<string, BadgeStyle>> = {
    transaction: TRANSACTION_MAP,
    subscription: SUBSCRIPTION_MAP,
    coupon: COUPON_MAP,
};

export default function StatusBadge({ kind, status }: StatusBadgeProps) {
    const map = MAPS[kind] || {};
    const style = map[status] || { ...NEUTRAL, label: (status || '—').toUpperCase() };

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black rounded-full border ${style.classes}`}>
            {style.icon}
            {style.label}
        </span>
    );
}
