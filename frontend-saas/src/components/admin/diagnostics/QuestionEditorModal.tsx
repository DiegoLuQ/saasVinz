"use client";

import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import Modal from '@/components/admin/Modal';
import { MODES, type DiagCategory, type DiagOption, type DiagQuestion } from '@/lib/diagnostics';

export type QuestionDraft = Omit<DiagQuestion, 'id' | 'category_key' | 'category_name'> & { id?: number };

const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/60';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5';

export const EMPTY_OPTIONS: DiagOption[] = [
    { text: '', pct: 100 }, { text: '', pct: 60 }, { text: '', pct: 25 }, { text: '', pct: 0 },
];

interface Props {
    open: boolean;
    initial: QuestionDraft | null;
    categories: DiagCategory[];
    saving: boolean;
    onClose: () => void;
    onSave: (q: QuestionDraft) => void;
}

export default function QuestionEditorModal({ open, initial, categories, saving, onClose, onSave }: Props) {
    const [q, setQ] = useState<QuestionDraft | null>(initial);
    useEffect(() => { setQ(initial); }, [initial]);
    if (!q) return null;

    const set = <K extends keyof QuestionDraft>(k: K, v: QuestionDraft[K]) => setQ(prev => (prev ? { ...prev, [k]: v } : prev));
    const setOption = (i: number, patch: Partial<DiagOption>) =>
        set('options', q.options.map((o, j) => (j === i ? { ...o, ...patch } : o)));
    const toggleMode = (m: number) =>
        set('modes', q.modes.includes(m) ? q.modes.filter(x => x !== m) : [...q.modes, m].sort((a, b) => a - b));

    const valid = q.text.trim().length >= 3 && q.options.length >= 2 && q.options.every(o => o.text.trim());

    return (
        <Modal isOpen={open} onClose={onClose} title={q.id ? 'Editar pregunta' : 'Nueva pregunta'} maxWidth="max-w-3xl">
            <div className="space-y-4">
                <div className="grid sm:grid-cols-[1fr_220px] gap-3">
                    <div>
                        <label className={labelCls}>Pregunta</label>
                        <input value={q.text} onChange={e => set('text', e.target.value)} maxLength={300} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Categoría</label>
                        <select value={q.category_id} onChange={e => set('category_id', Number(e.target.value))} className={inputCls}>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className={labelCls}>Explicación del «?»</label>
                    <textarea value={q.help ?? ''} onChange={e => set('help', e.target.value)} rows={2} maxLength={600} className={inputCls} />
                </div>

                <div>
                    <label className={labelCls}>Alternativas y % de cumplimiento</label>
                    <div className="space-y-2">
                        {q.options.map((o, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <input value={o.text} onChange={e => setOption(i, { text: e.target.value })} maxLength={200}
                                    placeholder={`Alternativa ${i + 1}`} className={inputCls} />
                                <div className="relative w-24 shrink-0">
                                    <input type="number" min={0} max={100} value={o.pct}
                                        onChange={e => setOption(i, { pct: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                                        className={`${inputCls} pr-7 text-right`} aria-label="Porcentaje" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40">%</span>
                                </div>
                                <button type="button" onClick={() => set('options', q.options.filter((_, j) => j !== i))}
                                    disabled={q.options.length <= 2} aria-label="Quitar alternativa"
                                    className="p-2 rounded-lg text-white/40 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-30"><Trash2 size={15} /></button>
                            </div>
                        ))}
                    </div>
                    {q.options.length < 6 && (
                        <button type="button" onClick={() => set('options', [...q.options, { text: '', pct: 0 }])}
                            className="mt-2 text-xs font-bold text-primary flex items-center gap-1 hover:underline"><Plus size={13} /> Agregar alternativa</button>
                    )}
                    <label className="mt-3 flex items-center gap-2 text-sm text-white/70">
                        <input type="checkbox" checked={q.allows_na} onChange={e => set('allows_na', e.target.checked)} className="accent-primary" />
                        Permitir «No aplica» (no cuenta en el puntaje)
                    </label>
                </div>

                <div>
                    <label className={labelCls}>Aparece en las modalidades</label>
                    <div className="flex gap-2">
                        {MODES.map(m => (
                            <button key={m.value} type="button" onClick={() => toggleMode(m.value)} aria-pressed={q.modes.includes(m.value)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${q.modes.includes(m.value) ? 'bg-primary/20 border-primary/60 text-white' : 'bg-white/5 border-white/10 text-white/50'}`}>
                                {m.value} · {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                        <label className={labelCls}>Recomendación (si responde bajo el umbral)</label>
                        <textarea value={q.recommendation ?? ''} onChange={e => set('recommendation', e.target.value)} rows={3} maxLength={600} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Función de Vinzer que lo resuelve</label>
                        <textarea value={q.vinzer_feature ?? ''} onChange={e => set('vinzer_feature', e.target.value)} rows={3} maxLength={300}
                            placeholder="Vacío = Vinzer no lo resuelve" className={inputCls} />
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <label className="flex items-center gap-2 text-sm text-white/70">
                        <input type="checkbox" checked={q.is_active} onChange={e => set('is_active', e.target.checked)} className="accent-primary" />
                        Activa
                    </label>
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-white/60 hover:bg-white/5">Cancelar</button>
                        <button type="button" disabled={!valid || saving} onClick={() => onSave(q)}
                            className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:brightness-110 disabled:opacity-40 flex items-center gap-2">
                            {saving && <Loader2 size={14} className="animate-spin" />} Guardar
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
