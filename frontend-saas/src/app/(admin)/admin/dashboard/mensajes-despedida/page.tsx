"use client";

import React, { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareHeart, Plus, Pencil, Trash2, Loader2, X, Check, PawPrint } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

type FarewellMessage = {
    id: number;
    text: string;
    is_active: boolean;
    created_at?: string | null;
};

const MAX = 500;
const TOKEN = '{nombre_mascota}';
const PREVIEW_NAME = 'Luna';
const ENDPOINT = '/api/internal/creator/farewell-messages';

/** Mensajes de despedida sugeridos: el formulario público ofrece uno al azar en la
 *  Carta de Despedida cuando la familia no puede escribir. */
export default function FarewellMessagesPage() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { data: messages = [], isLoading } = useQuery<FarewellMessage[]>({
        queryKey: ['admin-farewell-messages'],
        queryFn: () => apiRequest(ENDPOINT),
    });

    const [editingId, setEditingId] = useState<number | null>(null);
    const [text, setText] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [saving, setSaving] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-farewell-messages'] });
    const activeCount = messages.filter(m => m.is_active).length;

    const resetForm = () => {
        setEditingId(null);
        setText('');
        setIsActive(true);
    };

    const startEdit = (m: FarewellMessage) => {
        setEditingId(m.id);
        setText(m.text);
        setIsActive(m.is_active);
        textareaRef.current?.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Inserta {nombre_mascota} donde está el cursor
    const insertToken = () => {
        const el = textareaRef.current;
        if (!el || text.length + TOKEN.length > MAX) return;
        const start = el.selectionStart ?? text.length;
        const end = el.selectionEnd ?? text.length;
        const next = text.slice(0, start) + TOKEN + text.slice(end);
        setText(next);
        requestAnimationFrame(() => {
            el.focus();
            el.setSelectionRange(start + TOKEN.length, start + TOKEN.length);
        });
    };

    const handleSave = async () => {
        if (!text.trim()) return;
        setSaving(true);
        try {
            await apiRequest(editingId ? `${ENDPOINT}/${editingId}` : ENDPOINT, {
                method: editingId ? 'PUT' : 'POST',
                body: { text: text.trim(), is_active: isActive },
            });
            showToast(editingId ? 'Mensaje actualizado' : 'Mensaje agregado', 'success');
            resetForm();
            refresh();
        } catch (err: unknown) {
            showToast('Error: ' + (err instanceof Error ? err.message : ''), 'error');
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (m: FarewellMessage) => {
        try {
            await apiRequest(`${ENDPOINT}/${m.id}`, { method: 'PUT', body: { text: m.text, is_active: !m.is_active } });
            refresh();
        } catch (err: unknown) {
            showToast('Error: ' + (err instanceof Error ? err.message : ''), 'error');
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await apiRequest(`${ENDPOINT}/${id}`, { method: 'DELETE' });
            showToast('Mensaje eliminado', 'success');
            if (editingId === id) resetForm();
            setConfirmDeleteId(null);
            refresh();
        } catch (err: unknown) {
            showToast('Error: ' + (err instanceof Error ? err.message : ''), 'error');
        }
    };

    const preview = (t: string) => t.split(TOKEN).join(PREVIEW_NAME);

    return (
        <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 min-h-screen">
            <header>
                <h2 className="text-3xl font-black text-white italic tracking-tight flex items-center gap-3">
                    <MessageSquareHeart className="text-primary" size={28} /> Mensajes de Despedida
                </h2>
                <p className="text-white/40 text-sm mt-1">
                    Cuando una familia no puede escribir su Carta de Despedida, el formulario le ofrece uno de estos mensajes al azar.
                    <span className="text-white/60 font-bold"> · {activeCount} activo{activeCount === 1 ? '' : 's'} de {messages.length}</span>
                </p>
            </header>

            {/* Editor */}
            <div className="bg-[#0a192f] border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                        {editingId ? 'Editar mensaje' : 'Nuevo mensaje'}
                    </h3>
                    <span className={`text-xs font-mono tabular-nums ${text.length >= MAX ? 'text-red-400' : 'text-white/40'}`}>
                        {text.length} / {MAX}
                    </span>
                </div>

                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={e => setText(e.target.value.slice(0, MAX))}
                    maxLength={MAX}
                    rows={5}
                    placeholder={`Ej: Gracias de corazón, ${TOKEN}, por cada día de amor incondicional...`}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white leading-relaxed outline-none focus:border-primary/50 resize-y transition-all placeholder:text-white/20"
                />

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={insertToken}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-xl px-3 py-2 transition-all"
                    >
                        <PawPrint size={13} /> Insertar {TOKEN}
                    </button>
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-white/60 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={e => setIsActive(e.target.checked)}
                            className="w-4 h-4 accent-primary cursor-pointer"
                        />
                        Activo (se ofrece en el formulario)
                    </label>
                    <div className="flex-1" />
                    {editingId && (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-white/50 hover:text-white px-3 py-2"
                        >
                            <X size={14} /> Cancelar
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !text.trim()}
                        className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl px-5 py-2.5 shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-40"
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : editingId ? <Check size={14} /> : <Plus size={14} />}
                        {editingId ? 'Guardar cambios' : 'Agregar mensaje'}
                    </button>
                </div>

                {text.trim() && (
                    <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">
                            Vista previa (mascota: {PREVIEW_NAME})
                        </p>
                        <p className="text-sm text-white/80 italic leading-relaxed whitespace-pre-line">{preview(text)}</p>
                        {!text.includes(TOKEN) && (
                            <p className="text-[11px] text-amber-400/80 mt-2">
                                Sugerencia: incluye {TOKEN} para que el mensaje lleve el nombre de la mascota.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Listado */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16 text-white/40 gap-2">
                        <Loader2 className="animate-spin" size={18} /> Cargando mensajes...
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center py-16 text-white/30 italic border border-dashed border-white/10 rounded-3xl">
                        Aún no hay mensajes. Mientras no haya ninguno activo, el formulario no muestra la sugerencia.
                    </div>
                ) : messages.map(m => (
                    <div
                        key={m.id}
                        className={`bg-[#0a192f] border rounded-2xl p-5 flex gap-4 transition-all ${
                            editingId === m.id ? 'border-primary/50' : 'border-white/10'
                        } ${m.is_active ? '' : 'opacity-60'}`}
                    >
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-white/85 leading-relaxed whitespace-pre-line">
                                {m.text.split(TOKEN).map((part, i, arr) => (
                                    <React.Fragment key={i}>
                                        {part}
                                        {i < arr.length - 1 && (
                                            <span className="text-primary font-bold bg-primary/10 rounded px-1">{TOKEN}</span>
                                        )}
                                    </React.Fragment>
                                ))}
                            </p>
                            <div className="flex items-center gap-3 mt-3 text-[10px] font-bold uppercase tracking-wider">
                                <span className={m.is_active ? 'text-green-400' : 'text-white/30'}>
                                    {m.is_active ? '● Activo' : '○ Inactivo'}
                                </span>
                                <span className="text-white/30 font-mono normal-case">{m.text.length} / {MAX}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                            {confirmDeleteId === m.id ? (
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="text-[11px] font-bold text-white/50 hover:text-white px-2 py-1.5"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => handleDelete(m.id)}
                                        className="text-[11px] font-bold text-white bg-red-500 hover:bg-red-400 rounded-lg px-3 py-1.5"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => toggleActive(m)}
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                                            m.is_active
                                                ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                                                : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                                        }`}
                                        title={m.is_active ? 'Desactivar' : 'Activar'}
                                        aria-label={m.is_active ? 'Desactivar mensaje' : 'Activar mensaje'}
                                    >
                                        <Check size={15} />
                                    </button>
                                    <button
                                        onClick={() => startEdit(m)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center border bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-white transition-all"
                                        title="Editar"
                                        aria-label="Editar mensaje"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={() => setConfirmDeleteId(m.id)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center border bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                        title="Eliminar"
                                        aria-label="Eliminar mensaje"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
