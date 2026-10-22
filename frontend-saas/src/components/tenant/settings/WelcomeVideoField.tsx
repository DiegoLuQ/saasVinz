"use client";

import React, { useState } from 'react';
import { Film, Link2, Loader2, Lock, Trash2, Upload } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { type FormVideo } from '@/lib/publicFormConfig';
import FormVideoPlayer from '@/components/public/FormVideoPlayer';

export const MAX_VIDEO_SECONDS = 30;
const MAX_VIDEO_MB = 80;

// Archivos elegidos y aún no subidos, por su URL local (blob:). Se suben al
// guardar la configuración (uploadPendingVideo), nunca antes.
const pendingFiles = new Map<string, File>();

/** Sube el video si todavía es local; devuelve el video ya guardado en la nube. */
export async function uploadPendingVideo(video: FormVideo | null | undefined): Promise<FormVideo | null> {
    if (!video) return null;
    if (!video.url.startsWith('blob:')) return video;
    const file = pendingFiles.get(video.url);
    if (!file) return null;
    const body = new FormData();
    body.append('file', file);
    const saved = await apiRequest('/api/internal/maintenance/form-video', { method: 'POST', body }) as FormVideo;
    pendingFiles.delete(video.url);
    URL.revokeObjectURL(video.url);
    return saved;
}

const readDuration = (url: string) => new Promise<number>((resolve, reject) => {
    const el = document.createElement('video');
    el.preload = 'metadata';
    el.onloadedmetadata = () => resolve(el.duration);
    el.onerror = () => reject(new Error('No se pudo leer el video'));
    el.src = url;
});

const SOURCE_LABEL: Record<FormVideo['source'], string> = {
    upload: 'Archivo propio',
    vimeo: 'Vimeo',
    cloudflare: 'Cloudflare Stream',
};

interface Props {
    video: FormVideo | null | undefined;
    onChange: (video: FormVideo | null) => void;
    allowed: boolean;
    onError: (msg: string) => void;
}

/**
 * Elegir el video de bienvenida: subir un archivo (≤ 30 s, se procesa al guardar)
 * o pegar un enlace de Vimeo / Cloudflare Stream (se comprueba al instante).
 */
export default function WelcomeVideoField({ video, onChange, allowed, onError }: Props) {
    const [mode, setMode] = useState<'upload' | 'link'>('upload');
    const [link, setLink] = useState('');
    const [checking, setChecking] = useState(false);

    if (!allowed) {
        return (
            <div className="flex items-start gap-2 rounded-xl border border-dashed border-slate-300 dark:border-white/15 p-3 text-xs text-slate-600 dark:text-muted-foreground">
                <Lock size={14} className="shrink-0 mt-0.5" />
                <span>El video de bienvenida está disponible en los planes <b>PRO</b> y <b>ULTRA</b>.</span>
            </div>
        );
    }

    const pickFile = async (file: File | undefined) => {
        if (!file) return;
        if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
            onError(`El video pesa más de ${MAX_VIDEO_MB} MB.`);
            return;
        }
        const url = URL.createObjectURL(file);
        try {
            const duration = await readDuration(url);
            if (duration > MAX_VIDEO_SECONDS + 0.6) {
                URL.revokeObjectURL(url);
                onError(`El video dura ${Math.round(duration)} s y el máximo es ${MAX_VIDEO_SECONDS} s. Recórtalo e inténtalo de nuevo.`);
                return;
            }
            pendingFiles.set(url, file);
            onChange({ source: 'upload', url, duration });
        } catch {
            URL.revokeObjectURL(url);
            onError('No se pudo leer el video. Prueba con un MP4 o MOV.');
        }
    };

    const checkLink = async () => {
        if (!link.trim()) return;
        setChecking(true);
        try {
            const v = await apiRequest('/api/internal/maintenance/form-video/link', {
                method: 'POST',
                body: JSON.stringify({ url: link.trim() }),
            }) as FormVideo;
            onChange(v);
            setLink('');
        } catch (err: unknown) {
            onError((err as Error)?.message || 'No se pudo comprobar el enlace');
        } finally {
            setChecking(false);
        }
    };

    if (video) {
        const pending = video.url.startsWith('blob:');
        return (
            <div className="space-y-2">
                <div className="max-w-sm">
                    <FormVideoPlayer video={video} autoPlay={false} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-muted-foreground">
                    <Film size={13} />
                    <span>{SOURCE_LABEL[video.source]} · {Math.round(video.duration)} s</span>
                    {pending && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 font-bold">Se subirá al guardar</span>}
                    <button
                        type="button"
                        onClick={() => {
                            if (pending) { pendingFiles.delete(video.url); URL.revokeObjectURL(video.url); }
                            onChange(null);
                        }}
                        className="ml-auto inline-flex items-center gap-1 font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                    >
                        <Trash2 size={12} /> Quitar video
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2.5">
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-white/10 text-xs font-bold">
                {([['upload', 'Subir archivo', Upload], ['link', 'Enlace Vimeo / Cloudflare', Link2]] as const).map(([id, label, Icon]) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setMode(id)}
                        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer ${mode === id ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}
                    >
                        <Icon size={13} /> {label}
                    </button>
                ))}
            </div>
            {mode === 'upload' ? (
                <label className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 dark:border-white/15 p-4 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5">
                    <Upload size={18} className="text-slate-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-white">Elegir video (MP4, MOV o WebM)</span>
                    <span className="text-[11px] text-slate-500 dark:text-muted-foreground">Máximo {MAX_VIDEO_SECONDS} segundos y {MAX_VIDEO_MB} MB. Se optimiza y se sube al guardar.</span>
                    <input type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v" className="sr-only"
                        onChange={e => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
                </label>
            ) : (
                <div className="space-y-1.5">
                    <div className="flex gap-2">
                        <input
                            type="url"
                            value={link}
                            onChange={e => setLink(e.target.value)}
                            placeholder="https://vimeo.com/123456789"
                            className="flex-1 min-w-0 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white rounded-xl py-2 px-3 outline-none focus:border-primary"
                        />
                        <button
                            type="button"
                            onClick={checkLink}
                            disabled={checking || !link.trim()}
                            className="px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                        >
                            {checking && <Loader2 size={13} className="animate-spin" />} Comprobar
                        </button>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-muted-foreground">
                        Vimeo (público o «no listado») o Cloudflare Stream (sin URL firmada). Se comprueba que dure {MAX_VIDEO_SECONDS} s o menos.
                    </p>
                </div>
            )}
        </div>
    );
}
