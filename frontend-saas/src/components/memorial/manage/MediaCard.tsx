"use client";

/**
 * Video y voz en la gestión familiar (plan Infinito: 1 video + 1 audio de voz, 30 s cada uno).
 * La voz se puede subir o grabar con el micrófono (se corta sola a los 30 s).
 * API: GET/POST /memorials/{uuid}/manage/media, DELETE .../media/{id} (cabecera access-key).
 */
import { useEffect, useRef, useState } from 'react';
import { Film, Loader2, Mic, Square, Trash2, Upload } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { getImageUrl } from '@/lib/tenant/api';
import type { MemorialMediaItem } from '@/components/memorial/MemorialVoiceVideo';
import { cardClass, mutedClass, secondaryBtn, titleClass } from './ui';

type Options = { max_videos: number; max_voice: number; max_seconds: number; videos: MemorialMediaItem[]; voices: MemorialMediaItem[] };
type Props = { uuid: string; accessKey: string; isDark: boolean; locale: Locale; petName: string };
type Kind = 'video' | 'voice';

const src = (u: string) => getImageUrl(u) || u;

export default function MediaCard({ uuid, accessKey, isDark, locale, petName }: Props) {
    const es = locale === 'es';
    const [opts, setOpts] = useState<Options | null>(null);
    const [busy, setBusy] = useState<Kind | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [recording, setRecording] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const recRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const videoInput = useRef<HTMLInputElement>(null);
    const voiceInput = useRef<HTMLInputElement>(null);
    const base = `/api/internal/memorials/${uuid}/manage/media`;

    useEffect(() => {
        fetch(base, { headers: { 'access-key': accessKey } })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => d && setOpts(d))
            .catch(() => undefined);
    }, [base, accessKey]);

    useEffect(() => () => {
        if (timerRef.current) clearInterval(timerRef.current);
        recRef.current?.stream.getTracks().forEach((t) => t.stop());
    }, []);

    if (!opts || (opts.max_videos <= 0 && opts.max_voice <= 0)) return null;
    const max = opts.max_seconds;

    const send = async (kind: Kind, file: Blob, name: string) => {
        setBusy(kind);
        setError(null);
        try {
            const fd = new FormData();
            fd.append('kind', kind);
            fd.append('file', file, name);
            const r = await fetch(base, { method: 'POST', headers: { 'access-key': accessKey }, body: fd });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(typeof j.detail === 'string' ? j.detail : (es ? 'No se pudo subir.' : 'Upload failed.'));
            setOpts(j);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setBusy(null);
        }
    };

    const remove = async (id: number) => {
        setError(null);
        const r = await fetch(`${base}/${id}`, { method: 'DELETE', headers: { 'access-key': accessKey } });
        if (r.ok) setOpts(await r.json());
        else setError(es ? 'No se pudo eliminar.' : 'Could not delete.');
    };

    const stopRec = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (recRef.current?.state === 'recording') recRef.current.stop();
    };

    const startRec = async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const rec = new MediaRecorder(stream);
            const chunks: Blob[] = [];
            rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
            rec.onstop = () => {
                stream.getTracks().forEach((t) => t.stop());
                setRecording(false);
                const type = rec.mimeType || 'audio/webm';
                const blob = new Blob(chunks, { type });
                if (blob.size) send('voice', blob, type.includes('mp4') ? 'voz.m4a' : 'voz.webm');
            };
            recRef.current = rec;
            rec.start();
            setRecording(true);
            setSeconds(0);
            const t0 = Date.now();
            timerRef.current = setInterval(() => {
                const s = Math.floor((Date.now() - t0) / 1000);
                setSeconds(s);
                if (s >= max) stopRec();
            }, 250);
        } catch {
            setError(es ? 'No se pudo usar el micrófono. Revisa los permisos del navegador o sube un archivo.' : 'Microphone unavailable. Check browser permissions or upload a file.');
        }
    };

    const row = `flex items-center gap-3 rounded-2xl border p-3 ${isDark ? 'border-slate-700' : 'border-slate-200'}`;

    return (
        <section className={cardClass(isDark)}>
            <div className="flex items-center gap-2">
                <Film size={18} className={isDark ? 'text-amber-300' : 'text-amber-600'} />
                <h2 className={titleClass(isDark)}>{es ? 'Video y voz' : 'Video and voice'}</h2>
            </div>
            <p className={`mt-1 text-sm ${mutedClass(isDark)}`}>
                {es
                    ? `Un video y un audio de hasta ${max} segundos: verlo correr, oír su ladrido o maullido, o un mensaje con tu voz para ${petName}.`
                    : `A video and an audio clip up to ${max} seconds: watch them run, hear their bark or meow, or a message in your voice for ${petName}.`}
            </p>

            {opts.max_voice > 0 && (
                <div className="mt-4">
                    <p className="mb-2 text-sm font-bold">{es ? 'Su voz' : 'Their voice'}</p>
                    {opts.voices.map((v) => (
                        <div key={v.id} className={row}>
                            <audio src={src(v.url)} controls preload="none" className="h-10 min-w-0 flex-1" />
                            <button type="button" onClick={() => remove(v.id)} aria-label={es ? 'Eliminar' : 'Delete'} className={`rounded-full p-2 ${mutedClass(isDark)} hover:text-rose-500`}><Trash2 size={16} /></button>
                        </div>
                    ))}
                    {opts.voices.length < opts.max_voice && (
                        <div className="flex flex-wrap gap-2">
                            {recording ? (
                                <button type="button" onClick={stopRec} className={`${secondaryBtn(isDark)} border-rose-400 text-rose-500`}>
                                    <Square size={14} fill="currentColor" /> {es ? 'Detener' : 'Stop'} · {seconds}/{max} s
                                </button>
                            ) : (
                                <button type="button" onClick={startRec} disabled={!!busy} className={secondaryBtn(isDark)}>
                                    {busy === 'voice' ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />} {es ? 'Grabar' : 'Record'}
                                </button>
                            )}
                            <button type="button" onClick={() => voiceInput.current?.click()} disabled={!!busy || recording} className={secondaryBtn(isDark)}>
                                <Upload size={16} /> {es ? 'Subir audio' : 'Upload audio'}
                            </button>
                            <input ref={voiceInput} type="file" accept="audio/*" className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) send('voice', f, f.name); e.target.value = ''; }} />
                        </div>
                    )}
                </div>
            )}

            {opts.max_videos > 0 && (
                <div className="mt-5">
                    <p className="mb-2 text-sm font-bold">{es ? 'Video' : 'Video'}</p>
                    {opts.videos.map((v) => (
                        <div key={v.id} className={`${row} flex-col items-stretch`}>
                            <video src={src(v.url)} poster={v.thumbnail_url ? src(v.thumbnail_url) : undefined} controls playsInline preload="metadata" className="max-h-72 w-full rounded-xl bg-black" />
                            <button type="button" onClick={() => remove(v.id)} className={`${secondaryBtn(isDark)} self-end`}><Trash2 size={15} /> {es ? 'Eliminar video' : 'Delete video'}</button>
                        </div>
                    ))}
                    {opts.videos.length < opts.max_videos && (
                        <>
                            <button type="button" onClick={() => videoInput.current?.click()} disabled={!!busy} className={secondaryBtn(isDark)}>
                                {busy === 'video' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                {busy === 'video' ? (es ? 'Procesando video…' : 'Processing video…') : (es ? `Subir video (máx. ${max} s)` : `Upload video (max ${max} s)`)}
                            </button>
                            <input ref={videoInput} type="file" accept="video/*" className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) send('video', f, f.name); e.target.value = ''; }} />
                        </>
                    )}
                </div>
            )}
            {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}
        </section>
    );
}
