"use client";

import { useEffect, useRef, useState } from 'react';
import { Check, Eye, Globe, Loader2, LogOut, Moon, MoreHorizontal, Sun, AlertCircle } from 'lucide-react';
import type { Locale } from '@/lib/translations';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type Props = {
    petName: string;
    publicUrl: string;
    isDark: boolean;
    locale: Locale;
    saveState: SaveState;
    onToggleLocale: () => void;
    onToggleTheme: () => void;
    onLogout: () => void;
};

export default function ManageHeader({ petName, publicUrl, isDark, locale, saveState, onToggleLocale, onToggleTheme, onLogout }: Props) {
    const es = locale === 'es';
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        const close = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [menuOpen]);

    const itemClass = `w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors ${isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'}`;

    return (
        <header className={`sticky top-0 z-30 border-b backdrop-blur-md ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {es ? 'Memorial de' : 'Memorial of'}
                    </p>
                    <h1 className={`text-lg font-bold truncate ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{petName}</h1>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1.5 text-xs ${saveState === 'error' ? 'text-red-500' : isDark ? 'text-slate-400' : 'text-slate-500'}`} aria-live="polite">
                        {saveState === 'saving' && (<><Loader2 size={14} className="animate-spin" /><span className="hidden sm:inline">{es ? 'Guardando…' : 'Saving…'}</span></>)}
                        {saveState === 'saved' && (<><Check size={14} className="text-emerald-500" /><span className="hidden sm:inline">{es ? 'Guardado' : 'Saved'}</span></>)}
                        {saveState === 'error' && (<><AlertCircle size={14} /><span className="hidden sm:inline">{es ? 'No se pudo guardar' : 'Could not save'}</span></>)}
                    </span>

                    <a
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors"
                    >
                        <Eye size={16} />
                        <span>{es ? 'Ver memorial' : 'View memorial'}</span>
                    </a>

                    <div className="relative" ref={menuRef}>
                        <button
                            type="button"
                            onClick={() => setMenuOpen((v) => !v)}
                            aria-label={es ? 'Más opciones' : 'More options'}
                            aria-expanded={menuOpen}
                            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            <MoreHorizontal size={18} />
                        </button>
                        {menuOpen && (
                            <div className={`absolute right-0 mt-2 w-56 rounded-2xl border shadow-xl overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                <button type="button" className={itemClass} onClick={() => { onToggleLocale(); setMenuOpen(false); }}>
                                    <Globe size={16} /> {es ? 'English' : 'Español'}
                                </button>
                                <button type="button" className={itemClass} onClick={() => { onToggleTheme(); setMenuOpen(false); }}>
                                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                                    {isDark ? (es ? 'Modo claro' : 'Light mode') : (es ? 'Modo oscuro' : 'Dark mode')}
                                </button>
                                <button type="button" className={`${itemClass} !text-red-500`} onClick={onLogout}>
                                    <LogOut size={16} /> {es ? 'Cerrar sesión' : 'Log out'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
