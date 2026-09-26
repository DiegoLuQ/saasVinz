'use client';

import React, { useState, useEffect } from 'react';

export type VinzerTheme = 'dark' | 'light';

const THEME_KEY = 'vinzer-landing-theme';

/** Tema claro/oscuro del sitio Vinzer, persistido entre páginas. */
export function useVinzerTheme() {
    const [theme, setTheme] = useState<VinzerTheme>('dark');

    useEffect(() => {
        try {
            const saved = localStorage.getItem(THEME_KEY) as VinzerTheme | null;
            // Se lee tras montar (no en el initializer) para no romper la hidratación del SSR.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (saved) setTheme(saved);
        } catch { /* sin storage: tema por defecto */ }
    }, []);

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        try { localStorage.setItem(THEME_KEY, next); } catch { /* noop */ }
    };

    return { theme, isLight: theme === 'light', toggleTheme };
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** 'YYYY-MM-DD' -> '26 de septiembre de 2026' (sin Date: evita desfases de zona horaria entre SSR y cliente). */
export function formatFecha(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} de ${MESES[m - 1]} de ${y}`;
}

export function SectionTitle({ icon, color, isLight, children }: {
    icon: React.ReactNode; color: string; isLight: boolean; children: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-3">
            <span className={`p-2 rounded-xl border ${color}`}>{icon}</span>
            <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{children}</h2>
        </div>
    );
}
