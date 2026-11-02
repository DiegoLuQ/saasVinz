"use client";

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, EyeOff, MessageCircle, MoreHorizontal, Pencil, Trash2, X } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { cardClass, mutedClass, primaryBtn, secondaryBtn, titleClass, type Dedication } from './ui';

type Props = {
    dedications: Dedication[];
    limit: number;
    isDark: boolean;
    locale: Locale;
    onStatus: (id: number, estado: Dedication['estado']) => Promise<void>;
    onEdit: (id: number, data: { mensajero: string; mensaje: string }) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
};

export default function PendingMessages({ dedications, limit, isDark, locale, onStatus, onEdit, onDelete }: Props) {
    const es = locale === 'es';
    const pending = dedications.filter((d) => d.estado === 'pendiente');
    const published = dedications.filter((d) => d.estado === 'aprobado');
    const hidden = dedications.filter((d) => d.estado === 'rechazado');
    const [showPublished, setShowPublished] = useState(false);
    const [showHidden, setShowHidden] = useState(false);
    const [toDelete, setToDelete] = useState<number | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);

    const run = async (id: number, fn: () => Promise<void>) => {
        setBusyId(id);
        try { await fn(); } finally { setBusyId(null); }
    };

    const rowProps = { isDark, locale, busyId, run, onStatus, onEdit, askDelete: setToDelete };

    return (
        <section className={cardClass(isDark)}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className={titleClass(isDark)}>{es ? 'Mensajes de familiares y amigos' : 'Messages from family and friends'}</h2>
                    <p className={`text-sm mt-1 ${mutedClass(isDark)}`}>
                        {pending.length > 0
                            ? (es
                                ? `${pending.length} ${pending.length === 1 ? 'mensaje espera' : 'mensajes esperan'} tu aprobación.`
                                : `${pending.length} ${pending.length === 1 ? 'message is' : 'messages are'} waiting for your approval.`)
                            : (es ? 'No hay mensajes por revisar.' : 'No messages to review.')}
                    </p>
                </div>
                {pending.length > 0 && (
                    <span className="shrink-0 min-w-7 h-7 px-2 rounded-full bg-amber-500 text-slate-950 text-sm font-bold flex items-center justify-center">
                        {pending.length}
                    </span>
                )}
            </div>

            {pending.length > 0 && (
                <ul className="mt-4 space-y-3">
                    {pending.map((d) => (
                        <li key={d.id_dedicatoria} className={`rounded-2xl border p-4 ${isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50/60 border-amber-200'}`}>
                            <MessageBody d={d} isDark={isDark} />
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    disabled={busyId === d.id_dedicatoria}
                                    onClick={() => run(d.id_dedicatoria, () => onStatus(d.id_dedicatoria, 'aprobado'))}
                                    className={`${primaryBtn} !bg-emerald-600 hover:!bg-emerald-700`}
                                >
                                    <Check size={16} /> {es ? 'Publicar' : 'Publish'}
                                </button>
                                <button
                                    type="button"
                                    disabled={busyId === d.id_dedicatoria}
                                    onClick={() => run(d.id_dedicatoria, () => onStatus(d.id_dedicatoria, 'rechazado'))}
                                    className={secondaryBtn(isDark)}
                                >
                                    <X size={16} /> {es ? 'No publicar' : "Don't publish"}
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {dedications.length === 0 && (
                <p className={`mt-4 text-sm flex items-center gap-2 ${mutedClass(isDark)}`}>
                    <MessageCircle size={16} />
                    {es
                        ? 'Cuando alguien deje un mensaje en el memorial, aparecerá aquí para que decidas si se publica.'
                        : 'When someone leaves a message on the memorial, it will appear here for you to decide whether to publish it.'}
                </p>
            )}

            {published.length > 0 && (
                <Collapsible
                    open={showPublished}
                    onToggle={() => setShowPublished((v) => !v)}
                    label={es ? `Publicados (${published.length})` : `Published (${published.length})`}
                    isDark={isDark}
                >
                    {published.map((d) => <MessageRow key={d.id_dedicatoria} d={d} {...rowProps} />)}
                </Collapsible>
            )}

            {hidden.length > 0 && (
                <Collapsible
                    open={showHidden}
                    onToggle={() => setShowHidden((v) => !v)}
                    label={es ? `No publicados (${hidden.length})` : `Not published (${hidden.length})`}
                    isDark={isDark}
                >
                    {hidden.map((d) => <MessageRow key={d.id_dedicatoria} d={d} {...rowProps} />)}
                </Collapsible>
            )}

            {dedications.length > 0 && (
                <p className={`mt-4 text-xs ${mutedClass(isDark)}`}>
                    {es
                        ? `El memorial recibe hasta ${limit} mensajes (${pending.length + published.length} usados).`
                        : `The memorial accepts up to ${limit} messages (${pending.length + published.length} used).`}
                </p>
            )}

            {toDelete !== null && (
                <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={() => setToDelete(null)}>
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={`w-full max-w-sm rounded-3xl border p-6 text-center space-y-4 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
                    >
                        <h3 className={titleClass(isDark)}>{es ? '¿Eliminar este mensaje?' : 'Delete this message?'}</h3>
                        <p className={`text-sm ${mutedClass(isDark)}`}>{es ? 'Esta acción no se puede deshacer.' : 'This cannot be undone.'}</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => setToDelete(null)} className={secondaryBtn(isDark)}>
                                {es ? 'Cancelar' : 'Cancel'}
                            </button>
                            <button
                                type="button"
                                onClick={async () => { const id = toDelete; setToDelete(null); await run(id, () => onDelete(id)); }}
                                className={`${primaryBtn} !bg-red-600 hover:!bg-red-700`}
                            >
                                {es ? 'Eliminar' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

function MessageBody({ d, isDark }: { d: Dedication; isDark: boolean }) {
    return (
        <div className="min-w-0">
            <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                {d.mensajero}
                <span className={`ml-2 text-xs font-normal ${mutedClass(isDark)}`}>{new Date(d.fecha).toLocaleDateString()}</span>
            </p>
            <p className={`mt-1 text-sm leading-relaxed whitespace-pre-line break-words ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{d.mensaje}</p>
        </div>
    );
}

function Collapsible({ open, onToggle, label, isDark, children }: { open: boolean; onToggle: () => void; label: string; isDark: boolean; children: React.ReactNode }) {
    return (
        <div className={`mt-4 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
            <button type="button" onClick={onToggle} className={`w-full flex items-center justify-between text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                {label}
                <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && <ul className="mt-3 space-y-3">{children}</ul>}
        </div>
    );
}

type RowProps = {
    d: Dedication;
    isDark: boolean;
    locale: Locale;
    busyId: number | null;
    run: (id: number, fn: () => Promise<void>) => Promise<void>;
    onStatus: Props['onStatus'];
    onEdit: Props['onEdit'];
    askDelete: (id: number) => void;
};

function MessageRow({ d, isDark, locale, busyId, run, onStatus, onEdit, askDelete }: RowProps) {
    const es = locale === 'es';
    const [menuOpen, setMenuOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState({ mensajero: d.mensajero, mensaje: d.mensaje });
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        const close = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [menuOpen]);

    const inputClass = `w-full rounded-xl border px-3 py-2 text-sm outline-none ${isDark ? 'bg-slate-900 border-slate-600 text-slate-100 focus:border-sky-500' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-sky-400'}`;
    const itemClass = `w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left ${isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'}`;
    const isPublished = d.estado === 'aprobado';

    if (editing) {
        return (
            <li className={`rounded-2xl border p-4 space-y-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <input className={inputClass} value={draft.mensajero} onChange={(e) => setDraft({ ...draft, mensajero: e.target.value })} placeholder={es ? 'Nombre' : 'Name'} />
                <textarea className={`${inputClass} resize-none`} rows={3} value={draft.mensaje} onChange={(e) => setDraft({ ...draft, mensaje: e.target.value })} placeholder={es ? 'Mensaje' : 'Message'} />
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => { setEditing(false); setDraft({ mensajero: d.mensajero, mensaje: d.mensaje }); }} className={secondaryBtn(isDark)}>
                        {es ? 'Cancelar' : 'Cancel'}
                    </button>
                    <button
                        type="button"
                        disabled={busyId === d.id_dedicatoria}
                        onClick={() => run(d.id_dedicatoria, async () => { await onEdit(d.id_dedicatoria, draft); setEditing(false); })}
                        className={primaryBtn}
                    >
                        <Check size={16} /> {es ? 'Guardar' : 'Save'}
                    </button>
                </div>
            </li>
        );
    }

    return (
        <li className={`rounded-2xl border p-4 flex gap-3 ${isDark ? 'border-slate-700' : 'border-slate-200'} ${isPublished ? '' : 'opacity-75'}`}>
            <div className="flex-1 min-w-0"><MessageBody d={d} isDark={isDark} /></div>
            <div className="relative shrink-0" ref={menuRef}>
                <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    disabled={busyId === d.id_dedicatoria}
                    aria-label={es ? 'Opciones del mensaje' : 'Message options'}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <MoreHorizontal size={18} />
                </button>
                {menuOpen && (
                    <div className={`absolute right-0 mt-1 w-48 z-10 rounded-2xl border shadow-xl overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <button
                            type="button"
                            className={itemClass}
                            onClick={() => { setMenuOpen(false); run(d.id_dedicatoria, () => onStatus(d.id_dedicatoria, isPublished ? 'rechazado' : 'aprobado')); }}
                        >
                            {isPublished ? <><EyeOff size={15} /> {es ? 'Dejar de publicar' : 'Unpublish'}</> : <><Check size={15} /> {es ? 'Publicar' : 'Publish'}</>}
                        </button>
                        <button type="button" className={itemClass} onClick={() => { setMenuOpen(false); setEditing(true); }}>
                            <Pencil size={15} /> {es ? 'Editar' : 'Edit'}
                        </button>
                        <button type="button" className={`${itemClass} !text-red-500`} onClick={() => { setMenuOpen(false); askDelete(d.id_dedicatoria); }}>
                            <Trash2 size={15} /> {es ? 'Eliminar' : 'Delete'}
                        </button>
                    </div>
                )}
            </div>
        </li>
    );
}
