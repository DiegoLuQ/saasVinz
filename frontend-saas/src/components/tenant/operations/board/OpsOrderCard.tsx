"use client";

import React from 'react';
import { CheckCircle2, Clock, MapPin, User } from 'lucide-react';
import { parseServerDate, formatChileTime, formatChileDate } from '@/lib/dates';
import { isFinished, isNotStarted, type OpsOrder } from '@/hooks/useOperations';

export interface OpsStep {
    id: number;
    name: string;
}

/** "hace 2 h 15 min" a partir de un ISO del servidor */
export function elapsedLabel(iso: string | null, now: number): string | null {
    const d = parseServerDate(iso);
    if (!d) return null;
    const mins = Math.max(0, Math.floor((now - d.getTime()) / 60000));
    if (mins < 1) return 'recién';
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `${h} h ${mins % 60} min`;
    return `${Math.floor(h / 24)} d ${h % 24} h`;
}

/** Hora programada: "Hoy 14:30", "Atrasada · 12/09 10:00" o fecha corta */
export function scheduleLabel(iso: string | null, now: number): { text: string; overdue: boolean } | null {
    const d = parseServerDate(iso);
    if (!d) return null;
    const time = formatChileTime(iso, { hour12: false });
    const sameDay = formatChileDate(iso) === formatChileDate(new Date(now).toISOString());
    if (sameDay) return { text: `Hoy ${time}`, overdue: false };
    const date = formatChileDate(iso, { day: '2-digit', month: '2-digit' });
    return d.getTime() < now ? { text: `Atrasada · ${date} ${time}`, overdue: true } : { text: `${date} ${time}`, overdue: false };
}

export default function OpsOrderCard({
    order,
    steps,
    now,
    onOpen,
}: {
    order: OpsOrder;
    steps: OpsStep[];
    now: number;
    onOpen: (order: OpsOrder) => void;
}) {
    const finished = isFinished(order);
    const notStarted = isNotStarted(order);
    const stepIndex = steps.findIndex(s => s.id === order.current_step_id);
    const currentStep = stepIndex >= 0 ? steps[stepIndex] : null;
    const progress = finished ? 100 : stepIndex >= 0 && steps.length ? (stepIndex / steps.length) * 100 : 0;
    const schedule = !finished ? scheduleLabel(order.scheduled_at, now) : null;
    const inStep = !finished && !notStarted ? elapsedLabel(order.step_started_at, now) : null;

    return (
        <button
            type="button"
            onClick={() => onOpen(order)}
            className={`glass-card text-left w-full rounded-2xl border p-4 flex flex-col gap-3 transition-colors hover:border-primary/40 ${
                schedule?.overdue ? 'border-red-500/40' : 'border-foreground/10'
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-lg font-black text-foreground leading-tight truncate">{order.pet_name || 'Sin nombre'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                        {[order.pet_species, order.pet_breed, order.weight ? `${order.weight} kg` : null].filter(Boolean).join(' · ')}
                    </p>
                </div>
                <span className="text-[11px] font-mono font-bold text-muted-foreground bg-foreground/5 px-2 py-1 rounded-md shrink-0">
                    #{order.oc_number ?? order.id}
                </span>
            </div>

            {schedule && (
                <p className={`text-sm font-bold flex items-center gap-1.5 ${schedule.overdue ? 'text-red-500' : 'text-foreground'}`}>
                    <Clock size={14} /> {schedule.text}
                </p>
            )}

            <div className="space-y-1 text-xs text-muted-foreground">
                <p className="flex items-center gap-2 truncate"><User size={12} className="shrink-0" /> {order.customer_name || 'Sin cliente'}</p>
                {order.customer_address && (
                    <p className="flex items-center gap-2 truncate"><MapPin size={12} className="shrink-0" /> {order.customer_address}</p>
                )}
            </div>

            <div className="mt-auto pt-3 border-t border-foreground/10 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs font-bold">
                    {finished ? (
                        <span className="flex items-center gap-1.5 text-emerald-500"><CheckCircle2 size={14} /> Entregada</span>
                    ) : notStarted ? (
                        <span className="text-orange-500">Por iniciar</span>
                    ) : (
                        <span className="text-primary truncate">
                            Fase {stepIndex + 1}/{steps.length} · {currentStep?.name ?? 'Sin fase'}
                        </span>
                    )}
                    {inStep && <span className="text-muted-foreground font-medium shrink-0">{inStep}</span>}
                </div>

                <div className="h-1.5 w-full rounded-full bg-foreground/10 overflow-hidden">
                    <div
                        className={`h-full rounded-full ${finished ? 'bg-emerald-500' : 'bg-primary'}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>

            </div>
        </button>
    );
}
