"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, ChevronDown, ChevronRight, Lock, Rocket, X } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useCanOpen } from '@/hooks/useCanOpen';

interface Step { key: string; title: string; description: string; href: string; done: boolean }
interface Progress { show: boolean; steps: Step[]; done: number; total: number }

/**
 * «Configura tu crematorio»: primeros pasos del inicio. Cada paso se marca solo
 * con datos reales (GET /api/internal/onboarding/progress). Solo la ve el admin
 * de los crematorios nuevos; desaparece al completar todo o al cerrarla.
 * Los pasos cuya sección el plan no incluye (p. ej. Configuración en FREE) se
 * muestran con candado, sin enlace, y no cuentan para el avance.
 */
export default function OnboardingChecklist() {
    const qc = useQueryClient();
    const [open, setOpen] = useState(true);
    const { data } = useQuery<Progress>({
        queryKey: ['onboarding-progress'],
        queryFn: () => apiRequest('/api/internal/onboarding/progress'),
        staleTime: 30_000,
        refetchOnWindowFocus: true,
    });
    const dismiss = useMutation({
        mutationFn: () => apiRequest('/api/internal/onboarding/dismiss', { method: 'POST' }),
        onSuccess: () => qc.setQueryData<Progress>(['onboarding-progress'], (d) => (d ? { ...d, show: false } : d)),
    });

    const { canOpen, ready } = useCanOpen();

    if (!data?.show || !ready) return null;
    const steps = data.steps.map((s) => ({ ...s, locked: !canOpen(s.href) }));
    const available = steps.filter((s) => !s.locked);
    const done = available.filter((s) => s.done).length;
    if (available.length === 0 || done === available.length) return null;
    const pct = Math.round((done / available.length) * 100);
    const next = available.find((s) => !s.done);

    return (
        <section className="rounded-3xl border border-sky-200 dark:border-sky-900/60 bg-white dark:bg-slate-900 shadow-sm overflow-hidden" aria-label="Primeros pasos">
            <div className="flex items-start gap-3 p-4 sm:p-5">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 flex items-center justify-center shrink-0">
                    <Rocket size={19} />
                </div>
                <button type="button" onClick={() => setOpen((v) => !v)} className="flex-1 min-w-0 text-left" aria-expanded={open}>
                    <p role="heading" aria-level={2} className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                        Configura tu crematorio
                        <span className="text-xs font-bold text-sky-700 dark:text-sky-300">{done} de {available.length}</span>
                        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`} />
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {next ? `Siguiente: ${next.title}` : '¡Todo listo!'}
                    </p>
                    <div className="mt-2.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-sky-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                </button>
                <button type="button" onClick={() => dismiss.mutate()} disabled={dismiss.isPending}
                    title="Ocultar esta guía" aria-label="Ocultar esta guía"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 shrink-0">
                    <X size={16} />
                </button>
            </div>

            {open && (
                <ol className="border-t border-slate-100 dark:border-slate-800 grid sm:grid-cols-2 lg:grid-cols-3">
                    {steps.map((s) => (
                        <li key={s.key} className="border-b sm:border-r border-slate-100 dark:border-slate-800">
                            {s.locked ? (
                                <div className="flex items-start gap-3 p-4 h-full opacity-60" title="Esta sección no está incluida en tu plan">
                                    <Lock size={18} className="text-slate-400 shrink-0 mt-0.5" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-bold text-slate-500 dark:text-slate-400">{s.title}</span>
                                        <span className="block text-xs text-amber-700 dark:text-amber-400 mt-0.5">No incluido en tu plan</span>
                                    </span>
                                </div>
                            ) : (
                            <Link href={s.href} className={`flex items-start gap-3 p-4 h-full transition-colors ${s.done ? 'opacity-60' : 'hover:bg-sky-50/60 dark:hover:bg-sky-500/5'}`}>
                                {s.done
                                    ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                                    : <Circle size={18} className="text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />}
                                <span className="min-w-0 flex-1">
                                    <span className={`block text-sm font-bold ${s.done ? 'text-slate-500 dark:text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>{s.title}</span>
                                    <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.description}</span>
                                </span>
                                {!s.done && <ChevronRight size={16} className="text-slate-400 shrink-0 mt-0.5" />}
                            </Link>
                            )}
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
