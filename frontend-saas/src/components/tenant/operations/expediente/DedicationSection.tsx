"use client";

import React, { useEffect, useState } from 'react';
import { Feather, Pencil, Copy, Check, Wand2, Loader2, X } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { API_BASE_URL } from '@/lib/api';
import { copyToClipboard } from '@/lib/clipboard';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

const MAX = 500;

interface Props {
    orderId: number;
    petName?: string | null;
    dedication?: string | null;
    /** "formulario" = escrita por la familia; "orden" = guardada/editada en la orden */
    source?: 'orden' | 'formulario' | null;
    canEdit?: boolean;
    onSaved: () => void;
}

/** Mensaje sugerido al azar (los administra Vinzer en Contenido > Mensajes de Despedida). */
async function fetchSuggestion(exclude?: number): Promise<{ id: number; text: string } | null> {
    const qs = exclude ? `?exclude=${exclude}` : '';
    const res = await fetch(`${API_BASE_URL}/api/public/farewell-messages/random${qs}`);
    return res.ok ? res.json() : null;
}

/**
 * Carta de despedida de la orden: la escribe la familia en el formulario público
 * o el crematorio aquí (también para órdenes creadas sin formulario). La usan la
 * tarjeta de homenaje y el seguimiento público.
 */
export default function DedicationSection({ orderId, petName, dedication, source, canEdit = true, onSaved }: Props) {
    const { showToast } = useToast();
    const [editing, setEditing] = useState(false);
    // Sin carta y con permiso: se edita directamente, sin pasar por "Agregar"
    const inlineEmpty = canEdit && !dedication;
    const showEditor = editing || inlineEmpty;
    const [text, setText] = useState(dedication || '');
    const [saving, setSaving] = useState(false);
    const [suggesting, setSuggesting] = useState(false);
    const [lastSuggestionId, setLastSuggestionId] = useState<number | undefined>();
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!editing) setText(dedication || '');
    }, [dedication, editing]);

    const personalize = (t: string) =>
        t.replace(/\{nombre_mascota\}/gi, (petName || '').trim() || 'mi compañero').slice(0, MAX);

    const suggest = async () => {
        setSuggesting(true);
        try {
            const s = await fetchSuggestion(lastSuggestionId);
            if (!s) {
                showToast('No hay mensajes sugeridos disponibles', 'info');
                return;
            }
            setLastSuggestionId(s.id);
            setText(personalize(s.text));
            setEditing(true);
        } catch {
            showToast('No se pudo obtener un mensaje sugerido', 'error');
        } finally {
            setSuggesting(false);
        }
    };

    const save = async () => {
        setSaving(true);
        try {
            await apiRequest(`/api/internal/cremations/${orderId}/dedication`, {
                method: 'PUT',
                body: { dedication: text.trim() || null },
            });
            showToast(text.trim() ? 'Carta de despedida guardada' : 'Carta de despedida eliminada', 'success');
            setEditing(false);
            onSaved();
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'No se pudo guardar', 'error');
        } finally {
            setSaving(false);
        }
    };

    const copy = async () => {
        if (dedication && (await copyToClipboard(dedication))) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    };

    return (
        <div className="p-4 rounded-2xl bg-white border border-slate-200 dark:bg-white/5 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Feather size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Carta de despedida</p>
                        <p className="text-[10px] text-slate-500 dark:text-muted-foreground">
                            {source === 'formulario' ? 'Escrita por la familia en el formulario' : dedication ? 'Guardada en la orden' : 'Aparece en la tarjeta de homenaje y en el seguimiento'}
                        </p>
                    </div>
                </div>
                {!showEditor && (
                    <div className="flex items-center gap-1.5 shrink-0">
                        {dedication && (
                            <button type="button" onClick={copy} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-muted-foreground dark:hover:text-white dark:hover:bg-white/10 transition" title="Copiar" aria-label="Copiar carta">
                                {copied ? <Check size={14} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={14} />}
                            </button>
                        )}
                        {canEdit && (
                            <button type="button" onClick={() => setEditing(true)} className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-white dark:bg-white/10 dark:hover:bg-white/20 transition flex items-center gap-1.5">
                                <Pencil size={12} /> {dedication ? 'Editar' : 'Agregar'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {showEditor ? (
                <div className="space-y-2">
                    {inlineEmpty && !editing && (
                        <p className="text-[11px] text-slate-500 dark:text-muted-foreground">
                            Aún no hay carta: la tarjeta de homenaje usa el texto predeterminado. Escríbela o usa un mensaje sugerido.
                        </p>
                    )}
                    <div className="relative">
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value.slice(0, MAX))}
                            maxLength={MAX}
                            rows={5}
                            autoFocus={editing}
                            placeholder={`Unas palabras de despedida para ${petName || 'la mascota'}...`}
                            className="w-full rounded-xl px-3 py-2.5 text-sm leading-relaxed resize-y outline-none bg-white border border-slate-300 text-slate-900 focus:border-primary/60 focus:ring-2 focus:ring-primary/15 dark:bg-black/20 dark:border-white/10 dark:text-white"
                        />
                        <span className={`absolute bottom-2 right-3 text-[10px] tabular-nums ${text.length >= MAX ? 'text-red-600' : 'text-slate-400'}`}>
                            {text.length} / {MAX}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={suggest} disabled={suggesting} className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 dark:text-amber-300 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 transition flex items-center gap-1.5 disabled:opacity-60">
                            {suggesting ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                            {lastSuggestionId ? 'Otro mensaje' : 'Usar mensaje sugerido'}
                        </button>
                        <div className="flex-1" />
                        {(editing || text) && (
                            <button type="button" onClick={() => { setEditing(false); setText(dedication || ''); setLastSuggestionId(undefined); }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-white flex items-center gap-1">
                                <X size={12} /> {inlineEmpty ? 'Limpiar' : 'Cancelar'}
                            </button>
                        )}
                        <button type="button" onClick={save} disabled={saving || text.trim() === (dedication || '').trim()} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-primary hover:opacity-90 transition flex items-center gap-1.5 disabled:opacity-40">
                            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Guardar
                        </button>
                    </div>
                </div>
            ) : dedication ? (
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line italic">“{dedication}”</p>
            ) : (
                <p className="text-xs text-slate-500 dark:text-muted-foreground">
                    Sin carta de despedida. {canEdit && 'Puedes escribirla o usar un mensaje sugerido.'}
                </p>
            )}
        </div>
    );
}
