"use client";

import { useEffect, useRef, useState } from 'react';
import { Music, Pause } from 'lucide-react';

interface Props {
    url: string;
    name?: string;
    locale?: 'es' | 'en';
}

const TARGET_VOLUME = 0.6;

/**
 * Botón flotante de la melodía del memorial (elegida por el crematorio).
 * Nunca suena sola: los navegadores bloquean el audio automático y conviene
 * respetar a quien entra. Al tocarlo suena en bucle con una entrada suave.
 */
export default function MemorialMusicButton({ url, name, locale = 'es' }: Props) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [playing, setPlaying] = useState(false);
    const es = locale !== 'en';

    useEffect(() => () => {
        if (fadeRef.current) clearInterval(fadeRef.current);
        audioRef.current?.pause();
    }, []);

    const toggle = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (fadeRef.current) clearInterval(fadeRef.current);
        if (playing) {
            audio.pause();
            setPlaying(false);
            return;
        }
        audio.volume = 0;
        audio.play().then(() => {
            setPlaying(true);
            fadeRef.current = setInterval(() => {
                const next = Math.min(TARGET_VOLUME, audio.volume + 0.05);
                audio.volume = next;
                if (next >= TARGET_VOLUME && fadeRef.current) clearInterval(fadeRef.current);
            }, 120);
        }).catch(() => setPlaying(false));
    };

    const label = playing
        ? (es ? 'Pausar melodía' : 'Pause melody')
        : (es ? 'Escuchar melodía' : 'Play melody');

    return (
        <>
            <audio ref={audioRef} src={url} loop preload="none" />
            <button
                type="button"
                onClick={toggle}
                aria-label={label}
                aria-pressed={playing}
                title={name ? `${label}: ${name}` : label}
                className="fixed bottom-5 right-5 z-50 flex items-center gap-2 pl-3 pr-4 h-11 rounded-full border border-amber-200/40 bg-slate-950/60 text-amber-100 backdrop-blur-md shadow-[0_0_24px_rgba(251,191,36,0.25)] hover:bg-slate-900/80 transition-colors"
            >
                <span className="relative w-6 h-6 flex items-center justify-center">
                    {playing ? <Pause size={16} fill="currentColor" /> : <Music size={16} />}
                    {playing && <span className="absolute inset-0 rounded-full border border-amber-300/60 animate-ping" />}
                </span>
                <span className="text-xs font-semibold">{playing ? (es ? 'Sonando' : 'Playing') : (es ? 'Melodía' : 'Melody')}</span>
            </button>
        </>
    );
}
