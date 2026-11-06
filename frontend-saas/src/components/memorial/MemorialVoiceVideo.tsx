"use client";

/**
 * Voz y video del memorial (plan Infinito): «Escuchar su voz» (audio ≤ 30 s) y un video ≤ 30 s.
 * Datos: `memorial.voices` / `memorial.videos` (backend app/services/memorial_media.py).
 * Al reproducir cualquiera se pausa la melodía del memorial (PAUSE_MUSIC_EVENT).
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Pause, Play } from 'lucide-react';
import { getImageUrl } from '@/lib/tenant/api';
import { PAUSE_MUSIC_EVENT } from '@/components/memorial/MemorialMusicButton';

export type MemorialMediaItem = { id: number; kind: 'video' | 'voice'; url: string; thumbnail_url?: string | null; duration?: number | null; titulo?: string | null };

type Props = { videos: MemorialMediaItem[]; voices: MemorialMediaItem[]; petName: string; locale: 'es' | 'en'; isDarkMode: boolean };

const src = (u: string) => getImageUrl(u) || u;
const pauseMusic = () => window.dispatchEvent(new Event(PAUSE_MUSIC_EVENT));

function VoiceButton({ item, petName, en, isDarkMode }: { item: MemorialMediaItem; petName: string; en: boolean; isDarkMode: boolean }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => () => audioRef.current?.pause(), []);

    const toggle = () => {
        const a = audioRef.current;
        if (!a) return;
        if (playing) { a.pause(); return; }
        pauseMusic();
        a.play().catch(() => setPlaying(false));
    };

    return (
        <div className={`flex items-center gap-4 rounded-2xl border p-4 backdrop-blur-sm ${isDarkMode ? 'bg-black/30 border-white/10' : 'bg-white/85 border-slate-200 shadow-sm'}`}>
            <audio ref={audioRef} src={src(item.url)} preload="none"
                onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
                onEnded={() => { setPlaying(false); setProgress(0); }}
                onTimeUpdate={(e) => { const a = e.currentTarget; setProgress(a.duration ? a.currentTime / a.duration : 0); }} />
            <button type="button" onClick={toggle} aria-label={playing ? (en ? 'Pause' : 'Pausar') : (en ? `Listen to ${petName}'s voice` : `Escuchar la voz de ${petName}`)}
                className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${isDarkMode ? 'bg-amber-400 text-slate-950' : 'bg-slate-900 text-white'}`}>
                {playing && <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/30" aria-hidden />}
                {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
            </button>
            <div className="min-w-0 flex-1">
                <p className="font-serif text-lg leading-tight">{item.titulo || (en ? `Listen to ${petName}'s voice` : `Escuchar su voz`)}</p>
                <div className={`mt-2 h-1 overflow-hidden rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}>
                    <div className={`h-full transition-[width] duration-200 ${isDarkMode ? 'bg-amber-300' : 'bg-amber-500'}`} style={{ width: `${progress * 100}%` }} />
                </div>
            </div>
        </div>
    );
}

export default function MemorialVoiceVideo({ videos, voices, petName, locale, isDarkMode }: Props) {
    if (!videos?.length && !voices?.length) return null;
    const en = locale === 'en';
    return (
        <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-2xl mx-auto mb-20 space-y-5"
            aria-label={en ? 'Voice and video' : 'Voz y video'}
        >
            <div className="text-center">
                <span className="text-[11px] uppercase tracking-[0.3em] font-bold opacity-60 block mb-1">
                    {en ? 'Still with us' : 'Siempre presente'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-medium">
                    {voices?.length && !videos?.length ? (en ? `${petName}'s voice` : `La voz de ${petName}`) : (en ? 'Memories in motion' : 'Recuerdos en movimiento')}
                </h2>
            </div>
            {voices.map((v) => <VoiceButton key={v.id} item={v} petName={petName} en={en} isDarkMode={isDarkMode} />)}
            {videos.map((v) => (
                <figure key={v.id} className={`overflow-hidden rounded-2xl border ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-slate-200 bg-black shadow-sm'}`}>
                    <video src={src(v.url)} poster={v.thumbnail_url ? src(v.thumbnail_url) : undefined} controls playsInline preload="metadata"
                        onPlay={pauseMusic} className="mx-auto max-h-[70vh] w-full bg-black" />
                    {v.titulo && <figcaption className={`px-4 py-3 text-center font-serif text-base ${isDarkMode ? 'text-white/85' : 'bg-white text-slate-700'}`}>{v.titulo}</figcaption>}
                </figure>
            ))}
        </motion.section>
    );
}
