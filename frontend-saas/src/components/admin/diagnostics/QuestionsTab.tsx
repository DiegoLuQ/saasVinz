"use client";

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { DIAG_API, MODES, type QuestionsResponse } from '@/lib/diagnostics';
import QuestionEditorModal, { EMPTY_OPTIONS, type QuestionDraft } from './QuestionEditorModal';

export default function QuestionsTab() {
    const qc = useQueryClient();
    const { showToast } = useToast();
    const [mode, setMode] = useState<number | null>(null);
    const [editing, setEditing] = useState<QuestionDraft | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

    const { data, isLoading } = useQuery<QuestionsResponse>({
        queryKey: ['admin', 'diagnostics', 'questions', 'all'],
        queryFn: () => apiRequest(`${DIAG_API}/questions?include_inactive=true`),
    });
    const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'diagnostics', 'questions'] });

    const save = useMutation({
        mutationFn: (q: QuestionDraft) => {
            const { id, ...body } = q;
            return apiRequest(id ? `${DIAG_API}/questions/${id}` : `${DIAG_API}/questions`, { method: id ? 'PUT' : 'POST', body });
        },
        onSuccess: () => { showToast('Pregunta guardada', 'success'); setEditing(null); refresh(); },
        onError: (e: Error) => showToast(e.message, 'error'),
    });
    const remove = useMutation({
        mutationFn: (id: number) => apiRequest(`${DIAG_API}/questions/${id}`, { method: 'DELETE' }),
        onSuccess: () => { showToast('Pregunta eliminada', 'success'); setConfirmDelete(null); refresh(); },
        onError: (e: Error) => showToast(e.message, 'error'),
    });

    if (isLoading || !data) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    const visible = data.questions.filter(q => mode === null || q.modes.includes(mode));
    const newQuestion = (): QuestionDraft => ({
        category_id: data.categories[0]?.id ?? 0, text: '', help: '', options: EMPTY_OPTIONS.map(o => ({ ...o })),
        allows_na: false, modes: [20], recommendation: '', vinzer_feature: '', sort_order: data.questions.length, is_active: true,
    });

    return (
        <div className="space-y-4">
            {/* Conteo por modalidad: cada una debe tener exactamente su cantidad de preguntas activas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {MODES.map(m => {
                    const n = data.mode_counts[String(m.value)] ?? 0;
                    const ok = n === m.value;
                    return (
                        <button key={m.value} type="button" onClick={() => setMode(mode === m.value ? null : m.value)}
                            className={`text-left rounded-2xl border p-4 transition-colors ${mode === m.value ? 'border-primary/60 bg-primary/10' : 'border-white/10 bg-white/5 hover:bg-white/[0.07]'}`}>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">{m.label} · {m.value} preguntas</p>
                            <p className={`mt-1 text-sm font-bold flex items-center gap-1.5 ${ok ? 'text-emerald-300' : 'text-amber-300'}`}>
                                {ok ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                                {n} activas{!ok && ` (deberían ser ${m.value})`}
                            </p>
                        </button>
                    );
                })}
            </div>

            <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-white/40">
                    {mode ? `Mostrando la modalidad de ${mode} preguntas. ` : ''}Editar una pregunta no cambia los diagnósticos ya hechos.
                </p>
                <button type="button" onClick={() => setEditing(newQuestion())}
                    className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:brightness-110 flex items-center gap-2 shrink-0">
                    <Plus size={15} /> Nueva pregunta
                </button>
            </div>

            {data.categories.map(cat => {
                const items = visible.filter(q => q.category_id === cat.id);
                if (!items.length) return null;
                return (
                    <section key={cat.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                        <h3 className="px-5 py-3 border-b border-white/10 text-white font-bold flex items-center justify-between">
                            {cat.name} <span className="text-xs text-white/40 font-medium">Peso {cat.weight} %</span>
                        </h3>
                        <ul>
                            {items.map(q => (
                                <li key={q.id} className={`px-5 py-3 border-b border-white/5 last:border-0 flex gap-3 items-start ${q.is_active ? '' : 'opacity-50'}`}>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white font-semibold">{q.text}</p>
                                        <p className="text-[11px] text-white/40 mt-0.5">
                                            {q.options.map(o => `${o.pct} %`).join(' · ')}{q.allows_na && ' · No aplica'}
                                            {' · '}Modalidades: {q.modes.length ? q.modes.join(', ') : 'ninguna'}
                                            {!q.is_active && ' · Inactiva'}
                                        </p>
                                    </div>
                                    <button type="button" onClick={() => setEditing({ ...q, options: q.options.map(o => ({ ...o })) })} aria-label="Editar"
                                        className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10"><Pencil size={15} /></button>
                                    {confirmDelete === q.id ? (
                                        <span className="flex gap-1">
                                            <button type="button" onClick={() => remove.mutate(q.id)} disabled={remove.isPending}
                                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-300 hover:bg-red-500/30">Eliminar</button>
                                            <button type="button" onClick={() => setConfirmDelete(null)}
                                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white/50 hover:bg-white/10">No</button>
                                        </span>
                                    ) : (
                                        <button type="button" onClick={() => setConfirmDelete(q.id)} aria-label="Eliminar"
                                            className="p-2 rounded-lg text-white/40 hover:text-red-300 hover:bg-red-500/10"><Trash2 size={15} /></button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </section>
                );
            })}

            <QuestionEditorModal
                open={!!editing}
                initial={editing}
                categories={data.categories}
                saving={save.isPending}
                onClose={() => setEditing(null)}
                onSave={q => save.mutate(q)}
            />
        </div>
    );
}
