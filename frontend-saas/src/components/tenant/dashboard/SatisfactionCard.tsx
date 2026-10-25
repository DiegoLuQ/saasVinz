"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquareQuote, Star } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { formatChileDate } from '@/lib/dates';

interface Summary {
    average: number | null;
    count: number;
    distribution: Record<string, number>;
    recent: { rating: number; comment?: string | null; pet_name?: string | null; created_at: string }[];
}

/** Satisfacción de las familias (encuesta al concluir el servicio). Solo aparece con respuestas. */
export default function SatisfactionCard() {
    const { data } = useQuery<Summary>({
        queryKey: ['feedback-summary'],
        queryFn: () => apiRequest('/api/internal/operations/feedback/summary'),
        staleTime: 60_000,
    });
    if (!data || data.count === 0 || data.average == null) return null;
    const comments = data.recent.filter((r) => r.comment);

    return (
        <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 grid gap-5 md:grid-cols-[220px_1fr]" aria-label="Satisfacción de las familias">
            <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Satisfacción de las familias</p>
                <p className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-4xl font-black text-slate-900 dark:text-white">{data.average.toFixed(1).replace('.', ',')}</span>
                    <span className="text-sm font-bold text-slate-400">/ 5</span>
                </p>
                <div className="flex gap-0.5 mt-1" aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={15} className={i <= Math.round(data.average!) ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-700'} />)}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{data.count} respuesta{data.count === 1 ? '' : 's'}</p>
                <div className="mt-3 space-y-1">
                    {[5, 4, 3, 2, 1].map((n) => {
                        const c = data.distribution[String(n)] || 0;
                        return (
                            <div key={n} className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                                <span className="w-3 text-right font-bold">{n}</span>
                                <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    <div className="h-full bg-amber-400" style={{ width: `${(c / data.count) * 100}%` }} />
                                </div>
                                <span className="w-5 text-right">{c}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><MessageSquareQuote size={14} /> Últimos comentarios</p>
                {comments.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Aún no hay comentarios escritos.</p>
                ) : (
                    <ul className="mt-3 space-y-3">
                        {comments.slice(0, 3).map((r, i) => (
                            <li key={i} className="rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-slate-800 p-3">
                                <p className="text-sm text-slate-700 dark:text-slate-200">«{r.comment}»</p>
                                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                    {'★'.repeat(r.rating)} · {r.pet_name || 'Servicio'} · {formatChileDate(r.created_at)}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
