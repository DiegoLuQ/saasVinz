"use client";

import React, { useEffect, useRef, useState } from "react";
import { Music, Pause, Play, VolumeX } from "lucide-react";
import { getImageUrl } from "@/lib/tenant/api";

export interface MelodyOption {
    id: number;
    name: string;
    url: string;
    duration?: number | null;
}

interface Props {
    melodies: MelodyOption[];
    loading: boolean;
    selectedId: number | null;
    active: boolean;
    petName?: string;
    onSelect: (id: number | null) => void;
    onToggleActive: (active: boolean) => void;
}

const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "";
    const s = Math.round(seconds);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Melodía del memorial (la sube el SuperAdmin a la Biblioteca; la elige y
 * activa el crematorio). Permite escucharla antes de elegir.
 */
export default function MemorialMelodyPicker({ melodies, loading, selectedId, active, petName, onSelect, onToggleActive }: Props) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playingId, setPlayingId] = useState<number | null>(null);

    // Al cerrar el modal se detiene lo que esté sonando.
    useEffect(() => () => audioRef.current?.pause(), []);

    const togglePreview = (m: MelodyOption) => {
        const audio = audioRef.current;
        if (!audio) return;
        if (playingId === m.id) {
            audio.pause();
            setPlayingId(null);
            return;
        }
        audio.src = getImageUrl(m.url) || m.url;
        audio.play().then(() => setPlayingId(m.id)).catch(() => setPlayingId(null));
    };

    const optionClass = (isSelected: boolean) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
            isSelected
                ? "border-amber-500 bg-amber-500/15 ring-1 ring-amber-500"
                : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-amber-400/60"
        }`;

    return (
        <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-white/10">
            <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />

            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Music size={14} className="text-amber-500" />
                        Melodía del memorial
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Música suave que la familia y los visitantes pueden escuchar en el memorial de {petName || "la mascota"}. Solo suena si la persona toca el botón de música.
                    </p>
                </div>

                {/* Interruptor: melodía activa en el memorial */}
                <button
                    type="button"
                    role="switch"
                    aria-checked={active}
                    disabled={!selectedId}
                    onClick={() => onToggleActive(!active)}
                    className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <span className={`relative w-10 h-6 rounded-full transition-colors ${active && selectedId ? "bg-amber-500" : "bg-slate-300 dark:bg-white/15"}`}>
                        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${active && selectedId ? "translate-x-4" : ""}`} />
                    </span>
                    {active && selectedId ? "Activa en el memorial" : "Desactivada"}
                </button>
            </div>

            {loading ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">Cargando melodías…</p>
            ) : melodies.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">Aún no hay melodías disponibles.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button type="button" onClick={() => onSelect(null)} className={optionClass(!selectedId)}>
                        <span className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 text-slate-500 flex items-center justify-center shrink-0">
                            <VolumeX size={15} />
                        </span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Sin melodía</span>
                    </button>

                    {melodies.map((m) => (
                        <div key={m.id} className={optionClass(selectedId === m.id)}>
                            <button
                                type="button"
                                onClick={() => togglePreview(m)}
                                aria-label={playingId === m.id ? `Pausar ${m.name}` : `Escuchar ${m.name}`}
                                className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 hover:brightness-110"
                            >
                                {playingId === m.id ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                            </button>
                            <button type="button" onClick={() => onSelect(m.id)} className="flex-1 min-w-0 text-left">
                                <span className="block text-xs font-bold text-slate-800 dark:text-white truncate">{m.name}</span>
                                {m.duration ? <span className="block text-[10px] text-slate-500 dark:text-slate-400">{formatDuration(m.duration)}</span> : null}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
