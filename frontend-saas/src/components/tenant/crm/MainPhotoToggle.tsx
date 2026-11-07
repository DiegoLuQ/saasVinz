import React from 'react';
import { Loader2, Star } from 'lucide-react';

/**
 * Sobre la miniatura de una foto de la mascota: «Principal» si ya lo es,
 * o una estrella para marcarla como principal.
 */
export default function MainPhotoToggle({ isMain, onSelect, busy, disabled, size = 'sm' }: {
    isMain: boolean;
    onSelect: () => void;
    busy?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md';
}) {
    if (isMain) {
        return (
            <span className={`absolute left-1 bottom-1 inline-flex items-center gap-0.5 rounded-md bg-amber-400 text-amber-950 font-black uppercase shadow ${
                size === 'md' ? 'text-[9px] px-1.5 py-0.5' : 'text-[7px] px-1 py-px'}`}>
                <Star size={size === 'md' ? 9 : 7} className="fill-current" /> Principal
            </span>
        );
    }
    if (disabled) return null;
    return (
        <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            disabled={busy}
            title="Hacer principal"
            aria-label="Hacer foto principal"
            className={`absolute left-1 bottom-1 rounded-full bg-black/60 text-white hover:bg-amber-400 hover:text-amber-950 shadow transition-all opacity-80 group-hover:opacity-100 ${
                size === 'md' ? 'p-1.5' : 'p-1'}`}
        >
            {busy ? <Loader2 size={size === 'md' ? 12 : 10} className="animate-spin" /> : <Star size={size === 'md' ? 12 : 10} />}
        </button>
    );
}
