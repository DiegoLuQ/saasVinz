"use client";

/**
 * Música del memorial en la gestión familiar (solo planes Vinzer). La familia guarda hasta
 * `max` melodías de la biblioteca (Recuerdo 1, Eterno/Infinito 3) y elige cuál suena.
 * API: GET /memorials/{uuid}/manage/melodies, PUT /memorials/{uuid}/manage/melody (cabecera access-key).
 */
import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Music, Pause, Play, Star } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { getImageUrl } from '@/lib/tenant/api';
import { cardClass, mutedClass, titleClass } from './ui';

type Melody = { id: number; name: string; url: string; duration?: number | null };
type Options = { enabled: boolean; max: number; favorites: number[]; media_id: number | null; activa: boolean; melodies: Melody[] };

type Props = { uuid: string; accessKey: string; isDark: boolean; locale: Locale; onSaved?: (memorial: unknown) => void };

const fmt = (s?: number | null) => (s ? `${Math.floor(Math.round(s) / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}` : '');

export default function MelodyCard({ uuid, accessKey, isDark, locale, onSaved }: Props) {
    const es = locale === 'es';
    const [opts, setOpts] = useState<Options | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [playing, setPlaying] = useState<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        fetch(`/api/internal/memorials/${uuid}/manage/melodies`, { headers: { 'access-key': accessKey } })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => d && setOpts(d))
            .catch(() => undefined);
        return () => { audioRef.current?.pause(); };
    }, [uuid, accessKey]);

    if (!opts || !opts.enabled || !opts.melodies.length) return null;

    const save = async (next: Pick<Options, 'favorites' | 'media_id' | 'activa'>) => {
        const prev = opts;
        setOpts({ ...opts, ...next });
        setSaving(true);
        setError(null);
        try {
            const r = await fetch(`/api/internal/memorials/${uuid}/manage/melody`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'access-key': accessKey },
                body: JSON.stringify(next),
            });
            if (!r.ok) {
                const j = await r.json().catch(() => ({}));
                throw new Error(typeof j.detail === 'string' ? j.detail : 'No se pudo guardar.');
            }
            onSaved?.(await r.json());
        } catch (e) {
            setOpts(prev);
            setError(e instanceof Error ? e.message : 'No se pudo guardar.');
        } finally {
            setSaving(false);
        }
    };

    const toggleFavorite = (id: number) => {
        const isFav = opts.favorites.includes(id);
        if (opts.max <= 1) {
            // Una sola: elegirla = guardarla y que suene
            save({ favorites: isFav ? [] : [id], media_id: isFav ? null : id, activa: isFav ? false : true });
            return;
        }
        if (isFav) {
            const favorites = opts.favorites.filter((f) => f !== id);
            const media_id = opts.media_id === id ? (favorites[0] ?? null) : opts.media_id;
            save({ favorites, media_id, activa: media_id ? opts.activa : false });
        } else if (opts.favorites.length < opts.max) {
            const favorites = [...opts.favorites, id];
            save({ favorites, media_id: opts.media_id ?? id, activa: opts.media_id ? opts.activa : true });
        }
    };

    const preview = (m: Melody) => {
        const audio = audioRef.current ?? new Audio();
        audioRef.current = audio;
        if (playing === m.id) { audio.pause(); setPlaying(null); return; }
        audio.src = getImageUrl(m.url) || m.url;
        audio.onended = () => setPlaying(null);
        audio.play().then(() => setPlaying(m.id)).catch(() => setPlaying(null));
    };

    const full = opts.favorites.length >= opts.max;
    const rowCls = (on: boolean) => `flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors ${on
        ? (isDark ? 'border-amber-400/50 bg-amber-500/10' : 'border-amber-300 bg-amber-50')
        : (isDark ? 'border-slate-700' : 'border-slate-200')}`;

    return (
        <section className={cardClass(isDark)}>
            <div className="flex items-center gap-2">
                <Music size={18} className={isDark ? 'text-amber-300' : 'text-amber-600'} />
                <h2 className={titleClass(isDark)}>{es ? 'Música del memorial' : 'Memorial music'}</h2>
                {saving && <Loader2 size={15} className="animate-spin text-slate-400" />}
            </div>
            <p className={`mt-1 text-sm ${mutedClass(isDark)}`}>
                {opts.max > 1
                    ? (es ? `Guarda hasta ${opts.max} melodías (★) y elige cuál suena en el memorial.` : `Save up to ${opts.max} melodies (★) and choose which one plays.`)
                    : (es ? 'Elige la melodía que acompaña el memorial.' : 'Choose the melody that plays on the memorial.')}
            </p>

            {opts.media_id && (
                <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" className="accent-amber-500 h-4 w-4" checked={opts.activa}
                        onChange={(e) => save({ favorites: opts.favorites, media_id: opts.media_id, activa: e.target.checked })} />
                    {es ? 'Música activa en el memorial' : 'Music on in the memorial'}
                </label>
            )}

            <ul className="mt-4 space-y-2">
                {opts.melodies.map((m) => {
                    const fav = opts.favorites.includes(m.id);
                    const current = opts.media_id === m.id;
                    return (
                        <li key={m.id} className={rowCls(fav)}>
                            <button type="button" onClick={() => preview(m)} aria-label={playing === m.id ? (es ? 'Pausar' : 'Pause') : (es ? 'Escuchar' : 'Listen')}
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isDark ? 'bg-slate-700 text-slate-100' : 'bg-slate-100 text-slate-700'}`}>
                                {playing === m.id ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                            </button>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold">{m.name}</span>
                                <span className={`text-xs ${mutedClass(isDark)}`}>{fmt(m.duration)}</span>
                            </span>
                            {opts.max > 1 && fav && (
                                <button type="button" onClick={() => !current && save({ favorites: opts.favorites, media_id: m.id, activa: true })}
                                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${current
                                        ? 'bg-amber-500 text-slate-950'
                                        : (isDark ? 'bg-slate-700 text-slate-200' : 'bg-white text-slate-600 border border-slate-200')}`}>
                                    {current ? (es ? 'Suena' : 'Playing') : (es ? 'Que suene' : 'Play this')}
                                </button>
                            )}
                            <button type="button" onClick={() => toggleFavorite(m.id)} disabled={!fav && full && opts.max > 1}
                                aria-label={fav ? (es ? 'Quitar' : 'Remove') : (es ? 'Guardar' : 'Save')}
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full disabled:opacity-30 ${fav ? 'text-amber-500' : mutedClass(isDark)}`}>
                                {opts.max > 1
                                    ? <Star size={18} fill={fav ? 'currentColor' : 'none'} />
                                    : (fav ? <Check size={18} /> : <span className="h-4 w-4 rounded-full border-2 border-current" />)}
                            </button>
                        </li>
                    );
                })}
            </ul>
            {opts.max > 1 && (
                <p className={`mt-3 text-xs ${mutedClass(isDark)}`}>{opts.favorites.length} / {opts.max} {es ? 'guardadas' : 'saved'}</p>
            )}
            {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}
        </section>
    );
}
