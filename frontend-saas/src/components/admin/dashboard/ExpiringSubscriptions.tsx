import React from 'react';
import { CalendarClock, AlertTriangle } from 'lucide-react';
import type { DueSoonTenant } from '@/hooks/useAdminBootstrap';

interface ExpiringSubscriptionsProps {
    tenants: DueSoonTenant[];
    onManage: (tenant: DueSoonTenant) => void;
}

function daysUntil(dateStr: string): number {
    const now = new Date();
    const target = new Date(dateStr);
    // Comparamos por día calendario, no por milisegundos exactos
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    return Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86400000);
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function DueBadge({ days }: { days: number }) {
    let label: string;
    let classes: string;

    if (days < 0) {
        label = `Vencida hace ${Math.abs(days)} día${Math.abs(days) === 1 ? '' : 's'}`;
        classes = 'bg-red-500/10 text-red-400 border-red-500/20';
    } else if (days === 0) {
        label = 'Vence hoy';
        classes = 'bg-red-500/10 text-red-400 border-red-500/20';
    } else if (days <= 3) {
        label = `Vence en ${days} día${days === 1 ? '' : 's'}`;
        classes = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    } else {
        label = `Vence en ${days} días`;
        classes = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    }

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border whitespace-nowrap ${classes}`}>
            {days <= 0 && <AlertTriangle size={11} />}
            {label}
        </span>
    );
}

export default function ExpiringSubscriptions({ tenants, onManage }: ExpiringSubscriptionsProps) {
    if (tenants.length === 0) return null;

    return (
        <div className="bg-white/5 border border-orange-500/20 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 shrink-0">
                    <CalendarClock size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-lg">Suscripciones por vencer</h3>
                    <p className="text-xs text-white/40">
                        {tenants.length} empresa{tenants.length === 1 ? '' : 's'} requiere{tenants.length === 1 ? '' : 'n'} seguimiento de pago
                    </p>
                </div>
            </div>

            {/* Desktop: tabla */}
            <table className="w-full text-left hidden md:table">
                <thead className="bg-white/5 text-[10px] uppercase font-bold text-white/40">
                    <tr>
                        <th className="px-6 py-4">Empresa</th>
                        <th className="px-6 py-4">Plan</th>
                        <th className="px-6 py-4">Fecha de vencimiento</th>
                        <th className="px-6 py-4">Estado</th>
                        <th className="px-6 py-4 text-right">Acción</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {tenants.map((tenant) => {
                        const days = daysUntil(tenant.billing_end_date);
                        return (
                            <tr key={tenant.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-medium">{tenant.name}</span>
                                        <span className="text-[10px] text-white/40 font-mono">/{tenant.slug}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-bold text-xs">{tenant.plan}</td>
                                <td className="px-6 py-4 text-sm text-white/70 tabular-nums">{formatDate(tenant.billing_end_date)}</td>
                                <td className="px-6 py-4"><DueBadge days={days} /></td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => onManage(tenant)}
                                        className="px-5 py-2.5 bg-orange-500/90 hover:bg-orange-500 rounded-xl text-xs font-bold transition-all border border-orange-400/30 hover:scale-105 active:scale-95 text-white"
                                    >
                                        Gestionar
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Móvil: cards apiladas */}
            <div className="divide-y divide-white/5 md:hidden">
                {tenants.map((tenant) => {
                    const days = daysUntil(tenant.billing_end_date);
                    return (
                        <div key={tenant.id} className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="font-medium truncate">{tenant.name}</div>
                                    <div className="text-[10px] text-white/40 font-mono truncate">/{tenant.slug}</div>
                                </div>
                                <DueBadge days={days} />
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-xs text-white/60">
                                    <span className="font-bold">{tenant.plan}</span>
                                    <span className="mx-1.5 text-white/20">·</span>
                                    <span className="tabular-nums">{formatDate(tenant.billing_end_date)}</span>
                                </div>
                                <button
                                    onClick={() => onManage(tenant)}
                                    className="px-4 py-2 bg-orange-500/90 hover:bg-orange-500 rounded-xl text-xs font-bold transition-all border border-orange-400/30 active:scale-95 text-white shrink-0"
                                >
                                    Gestionar
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
