"use client";

/**
 * Línea de tiempo en la gestión familiar (planes Eterno / Infinito). La familia agrega momentos
 * (fecha opcional, título, texto y una foto propia, aparte de la galería) hasta el tope del plan.
 * API: GET/POST /memorials/{uuid}/manage/timeline, PATCH/DELETE .../timeline/{id} (cabecera access-key).
 */
import { useEffect, useRef, useState } from 'react';
import { Clock3, ImagePlus, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { getImageUrl } from '@/lib/tenant/api';
import { compressImage } from '@/lib/clientImageCompressor';
import type { TimelineMoment } from '@/components/memorial/MemorialTimeline';
import { cardClass, mutedClass, primaryBtn, secondaryBtn, titleClass } from './ui';

type Options = { enabled: boolean; max: number; max_text: number; max_title: number; moments: TimelineMoment[] };
type Draft = { id?: number; titulo: string; texto: string; fecha: string; file: File | null; preview: string | null; removePhoto: boolean };

type Props = { uuid: string; accessKey: string; isDark: boolean; locale: Locale; petName: string };

const EMPTY: Draft = { titulo: '', texto: '', fecha: '', file: null, preview: null, removePhoto: false };

export default function TimelineCard({ uuid, accessKey, isDark, locale, petName }: Props) {
    const es = locale === 'es';
    const [opts, setOpts] = useState<Options | null>(null);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const base = `/api/internal/memorials/${uuid}/manage/timeline`;

    useEffect(() => {
        fetch(base, { headers: { 'access-key': accessKey } })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => d && setOpts(d))
            .catch(() => undefined);
    }, [base, accessKey]);

    useEffect(() => () => { if (draft?.preview?.startsWith('blob:')) URL.revokeObjectURL(draft.preview); }, [draft?.preview]);

    if (!opts || !opts.enabled) return null;

    const call = async (url: string, method: string, body?: FormData) => {
        setBusy(true);
        setError(null);
        try {
            const r = await fetch(url, { method, headers: { 'access-key': accessKey }, body });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(typeof j.detail === 'string' ? j.detail : (es ? 'No se pudo guardar.' : 'Could not save.'));
            setOpts(j);
            return true;
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            return false;
        } finally {
            setBusy(false);
        }
    };

    const save = async () => {
        if (!draft) return;
        const fd = new FormData();
        fd.append('titulo', draft.titulo);
        if (draft.texto.trim()) fd.append('texto', draft.texto);
        if (draft.fecha) fd.append('fecha', draft.fecha);
        if (draft.file) fd.append('file', draft.file);
        if (draft.id && draft.removePhoto && !draft.file) fd.append('remove_photo', 'true');
        if (await call(draft.id ? `${base}/${draft.id}` : base, draft.id ? 'PATCH' : 'POST', fd)) setDraft(null);
    };

    const remove = (id: number) => call(`${base}/${id}`, 'DELETE');

    const pickFile = async (f: File | undefined) => {
        if (!f || !draft) return;
        const c = await compressImage(f, 1600, 1600, 0.85).catch(() => f);
        setDraft({ ...draft, file: c, preview: URL.createObjectURL(c), removePhoto: false });
    };

    const full = opts.moments.length >= opts.max;
    const input = `w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500/40 ${isDark ? 'bg-slate-900/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`;
    const fmt = (iso: string) => {
        const [y, m, d] = iso.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString(es ? 'es-CL' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <section className={cardClass(isDark)}>
            <div className="flex items-center gap-2">
                <Clock3 size={18} className={isDark ? 'text-amber-300' : 'text-amber-600'} />
                <h2 className={titleClass(isDark)}>{es ? 'Línea de tiempo' : 'Timeline'}</h2>
                {busy && <Loader2 size={15} className="animate-spin text-slate-400" />}
                <span className={`ml-auto text-xs ${mutedClass(isDark)}`}>{opts.moments.length} / {opts.max}</span>
            </div>
            <p className={`mt-1 text-sm ${mutedClass(isDark)}`}>
                {es
                    ? `Cuenta la historia de ${petName}: el día que llegó, sus lugares favoritos, las travesuras… Cada momento puede tener su propia foto.`
                    : `Tell ${petName}'s story: the day they arrived, favorite places, little mischiefs… Each moment can have its own photo.`}
            </p>

            {opts.moments.length > 0 && (
                <ul className="mt-4 space-y-2">
                    {opts.moments.map((m) => (
                        <li key={m.id} className={`flex items-center gap-3 rounded-2xl border p-2.5 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                            {m.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={getImageUrl(m.image_url) || m.image_url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                            ) : (
                                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${isDark ? 'bg-slate-700/60' : 'bg-slate-100'}`}><Clock3 size={16} className="opacity-50" /></span>
                            )}
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold">{m.titulo}</span>
                                <span className={`text-xs ${mutedClass(isDark)}`}>{m.fecha ? fmt(m.fecha) : (es ? 'Sin fecha' : 'No date')}</span>
                            </span>
                            <button type="button" aria-label={es ? 'Editar' : 'Edit'} disabled={busy}
                                onClick={() => setDraft({ id: m.id, titulo: m.titulo, texto: m.texto || '', fecha: m.fecha || '', file: null, preview: m.image_url ? (getImageUrl(m.image_url) || m.image_url) : null, removePhoto: false })}
                                className={`rounded-full p-2 ${mutedClass(isDark)} hover:text-sky-500`}><Pencil size={15} /></button>
                            <button type="button" aria-label={es ? 'Eliminar' : 'Delete'} disabled={busy} onClick={() => remove(m.id)}
                                className={`rounded-full p-2 ${mutedClass(isDark)} hover:text-rose-500`}><Trash2 size={15} /></button>
                        </li>
                    ))}
                </ul>
            )}

            {draft ? (
                <div className={`mt-4 space-y-3 rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-bold">{draft.id ? (es ? 'Editar momento' : 'Edit moment') : (es ? 'Nuevo momento' : 'New moment')}</p>
                        <button type="button" onClick={() => setDraft(null)} aria-label={es ? 'Cancelar' : 'Cancel'} className={mutedClass(isDark)}><X size={16} /></button>
                    </div>
                    <input className={input} maxLength={opts.max_title} placeholder={es ? 'Título (ej. «Llegó a casa»)' : 'Title (e.g. "Coming home")'}
                        value={draft.titulo} onChange={(e) => setDraft({ ...draft, titulo: e.target.value })} />
                    <label className="block text-xs font-semibold">
                        <span className={mutedClass(isDark)}>{es ? 'Fecha (opcional)' : 'Date (optional)'}</span>
                        <input type="date" className={`${input} mt-1`} max={new Date().toISOString().slice(0, 10)}
                            value={draft.fecha} onChange={(e) => setDraft({ ...draft, fecha: e.target.value })} />
                    </label>
                    <div>
                        <textarea className={input} rows={3} maxLength={opts.max_text} placeholder={es ? 'Cuéntalo con tus palabras…' : 'Tell it in your own words…'}
                            value={draft.texto} onChange={(e) => setDraft({ ...draft, texto: e.target.value })} />
                        <p className={`text-right text-xs ${mutedClass(isDark)}`}>{draft.texto.length} / {opts.max_text}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {draft.preview && !draft.removePhoto ? (
                            <div className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={draft.preview} alt="" className="h-20 w-20 rounded-xl object-cover" />
                                <button type="button" aria-label={es ? 'Quitar foto' : 'Remove photo'}
                                    onClick={() => setDraft({ ...draft, file: null, preview: null, removePhoto: true })}
                                    className="absolute -right-2 -top-2 rounded-full bg-rose-500 p-1 text-white"><X size={12} /></button>
                            </div>
                        ) : null}
                        <button type="button" onClick={() => fileRef.current?.click()} className={secondaryBtn(isDark)}>
                            <ImagePlus size={16} /> {draft.preview && !draft.removePhoto ? (es ? 'Cambiar foto' : 'Change photo') : (es ? 'Agregar foto' : 'Add photo')}
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden"
                            onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
                    </div>
                    <button type="button" onClick={save} disabled={busy || !draft.titulo.trim()} className={`${primaryBtn} w-full disabled:opacity-50`}>
                        {busy ? <Loader2 size={16} className="animate-spin" /> : null} {es ? 'Guardar momento' : 'Save moment'}
                    </button>
                </div>
            ) : (
                <button type="button" onClick={() => setDraft({ ...EMPTY })} disabled={full}
                    className={`${secondaryBtn(isDark)} mt-4 w-full disabled:opacity-50`}>
                    <Plus size={16} /> {full ? (es ? `Llegaste al máximo de ${opts.max} momentos` : `Reached the ${opts.max}-moment limit`) : (es ? 'Agregar un momento' : 'Add a moment')}
                </button>
            )}
            {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}
        </section>
    );
}
