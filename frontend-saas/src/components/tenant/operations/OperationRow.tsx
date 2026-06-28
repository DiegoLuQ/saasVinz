"use client";

import React from 'react';
import { Dog, MapPin, Calendar, Trash2, ArrowUpRight } from 'lucide-react';
import { API_URL } from '@/lib/tenant/api';
import StatusPillMenu from './StatusPillMenu';
import type { Cremation } from '@/hooks/useCremations';

interface OperationRowProps {
    item: Cremation;
    isUpdatingStatus: boolean;
    onChangeStatus: (id: number, status: string) => void;
    onOpen: (id: number) => void;
    onDelete: (id: number) => void;
}

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

type Urgency = 'overdue' | 'today' | 'upcoming' | 'unscheduled';

function getUrgency(scheduledAt?: string, status?: string): Urgency {
    if (!scheduledAt) return 'unscheduled';
    const s = status ? status.trim().toLowerCase() : '';
    if (['completado', 'entregado', 'completed', 'delivered'].includes(s)) return 'upcoming';

    const d = new Date(scheduledAt);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    if (d < startOfToday) return 'overdue';
    if (d >= startOfToday && d < startOfTomorrow) return 'today';
    return 'upcoming';
}

const URGENCY_STYLES: Record<Urgency, { dotColor: string; dateColor: string; ringColor: string; label?: string }> = {
    overdue: {
        dotColor: 'bg-red-500',
        dateColor: 'text-red-400',
        ringColor: 'ring-red-500/20',
        label: 'Atrasado',
    },
    today: {
        dotColor: 'bg-orange-400',
        dateColor: 'text-orange-300',
        ringColor: 'ring-orange-500/20',
        label: 'Hoy',
    },
    upcoming: {
        dotColor: 'bg-white/30',
        dateColor: 'text-white',
        ringColor: 'ring-white/[0.04]',
    },
    unscheduled: {
        dotColor: 'bg-muted-foreground/40',
        dateColor: 'text-muted-foreground',
        ringColor: 'ring-white/[0.04]',
    },
};

export default function OperationRow({
    item,
    isUpdatingStatus,
    onChangeStatus,
    onOpen,
    onDelete,
}: OperationRowProps) {
    const urgency = getUrgency(item.scheduled_at, item.status);
    const u = URGENCY_STYLES[urgency];

    const petName = item.pet?.name || `Mascota #${item.pet_id}`;
    const customerName = item.pet?.customer?.name?.split(' ')[0] || 'Desconocido';
    const petImg = item.pet?.image_url;

    return (
        <article
            className={`
                bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-2xl
                p-4 lg:p-5 transition-all group ring-1 ${u.ringColor}
                grid grid-cols-12 gap-4 items-center
            `}
        >
            {/* SVC ID */}
            <div className="col-span-3 sm:col-span-2 lg:col-span-1 min-w-0">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.18em] mb-1">SVC</p>
                <p className="text-sm font-mono font-black text-white">#{item.id}</p>
            </div>

            {/* Mascota / Cliente con avatar */}
            <div className="col-span-9 sm:col-span-5 lg:col-span-3 flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-black/30 overflow-hidden border border-white/[0.06] shrink-0 flex items-center justify-center text-primary/60">
                    {petImg ? (
                        <img
                            src={petImg.startsWith('http') ? petImg : `${API_URL}${petImg}`}
                            alt={`Foto de ${petName}`}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <Dog size={18} aria-hidden="true" />
                    )}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-black text-white truncate">{petName}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider truncate">
                        {customerName}
                    </p>
                </div>
            </div>

            {/* Ubicación */}
            <div className="hidden lg:flex col-span-2 items-center gap-2 min-w-0">
                <MapPin size={13} className="text-muted-foreground/60 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{item.city || '—'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{item.region || '—'}</p>
                </div>
            </div>

            {/* Programación con urgencia */}
            <div className="col-span-6 sm:col-span-3 lg:col-span-2 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${u.dotColor} ${urgency === 'overdue' || urgency === 'today' ? 'animate-pulse' : ''}`} aria-hidden="true" />
                    {u.label && (
                        <span className={`text-[9px] font-black uppercase tracking-[0.16em] ${u.dateColor}`}>
                            {u.label}
                        </span>
                    )}
                </div>
                <p className={`text-xs font-bold font-mono ${u.dateColor} flex items-center gap-1`}>
                    <Calendar size={11} aria-hidden="true" />
                    {item.scheduled_at ? new Date(item.scheduled_at).toLocaleDateString('es-CL') : 'Sin fecha'}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">
                    {item.scheduled_at ? new Date(item.scheduled_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : ''}
                </p>
            </div>

            {/* Total */}
            <div className="col-span-6 sm:col-span-2 lg:col-span-1 text-right lg:text-left">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.18em] mb-0.5">Total</p>
                <p className="text-sm font-black text-white font-mono">
                    {CLP.format(item.total_price || 0)}
                </p>
            </div>

            {/* Estado y Acciones (Alineados horizontalmente) */}
            <div className="col-span-12 lg:col-span-3 flex items-center justify-between lg:justify-end gap-3 mt-3 lg:mt-0 pt-3 lg:pt-0 border-t border-white/5 lg:border-none">
                <StatusPillMenu
                    value={item.status}
                    isLoading={isUpdatingStatus}
                    onChange={(next) => onChangeStatus(item.id, next)}
                />
                
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onOpen(item.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/15 border border-primary/25 hover:bg-primary/25 text-primary text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 whitespace-nowrap"
                        aria-label={`Gestionar orden SVC #${item.id}`}
                    >
                        <ArrowUpRight size={13} aria-hidden="true" />
                        Gestionar
                    </button>
                    {(['processing', 'en_proceso', 'pendiente', 'pending', 'received'].includes(item.status.trim().toLowerCase())) && (
                        <button
                            type="button"
                            onClick={() => onDelete(item.id)}
                            className="p-2 rounded-xl text-red-400/40 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90 shrink-0"
                            aria-label={`Eliminar orden SVC #${item.id}`}
                            title="Eliminar"
                        >
                            <Trash2 size={15} aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile-only: overdue/today indicator badge if SVC col was tight */}
            {(urgency === 'overdue' || urgency === 'today') && (
                <span className="sr-only">{urgency === 'overdue' ? 'Atrasado' : 'Para hoy'}</span>
            )}
        </article>
    );
}
