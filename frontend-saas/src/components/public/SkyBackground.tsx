"use client";

import React, { useMemo } from 'react';

/**
 * Fondo decorativo sereno: cielo con nubes y estrellas sutiles.
 * Tono pastel (amanecer/atardecer suave). Tamaño y densidad responsive.
 */
export default function SkyBackground() {
    // Estrellas con posiciones determinísticas para evitar mismatch SSR/CSR
    const stars = useMemo(() => {
        const seed = [
            { x: 8, y: 12, size: 2, delay: 0 },
            { x: 18, y: 22, size: 1, delay: 0.6 },
            { x: 32, y: 8, size: 2, delay: 1.4 },
            { x: 46, y: 30, size: 1, delay: 0.3 },
            { x: 60, y: 14, size: 2, delay: 0.9 },
            { x: 74, y: 24, size: 1, delay: 1.7 },
            { x: 85, y: 10, size: 2, delay: 0.5 },
            { x: 92, y: 26, size: 1, delay: 1.1 },
            { x: 12, y: 40, size: 1, delay: 0.2 },
            { x: 38, y: 48, size: 2, delay: 1.5 },
            { x: 68, y: 42, size: 1, delay: 0.8 },
            { x: 88, y: 50, size: 1, delay: 1.3 },
        ];
        return seed;
    }, []);

    return (
        <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none transition-colors duration-1000">
            {/* Capa 1: gradiente cielo (amanecer suave / noche estrellada) */}
            <div className="absolute inset-0 bg-gradient-to-b from-sky-100 via-rose-50 to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-all duration-1000" />

            {/* Capa 2: glow lateral (sol/atardecer) */}
            <div className="absolute top-[-15%] right-[-15%] w-[60%] h-[60%] bg-amber-200/40 dark:bg-emerald-950/15 rounded-full blur-[120px] transition-all duration-1000" />
            <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] bg-sky-200/40 dark:bg-indigo-950/15 rounded-full blur-[120px] transition-all duration-1000" />

            {/* Capa 3: estrellas con twinkle */}
            <div className="absolute inset-0 opacity-30 dark:opacity-90 transition-opacity duration-1000">
                {stars.map((s, i) => (
                    <span
                        key={i}
                        className="absolute rounded-full bg-white animate-pulse"
                        style={{
                            top: `${s.y}%`,
                            left: `${s.x}%`,
                            width: `${s.size}px`,
                            height: `${s.size}px`,
                            opacity: 0.7,
                            boxShadow: '0 0 6px rgba(255,255,255,0.7)',
                            animationDelay: `${s.delay}s`,
                            animationDuration: '3s',
                        }}
                    />
                ))}
            </div>

            {/* Capa 4: nubes SVG en distintas alturas (más sutiles en la noche) */}
            <svg
                className="absolute top-[8%] left-[-5%] w-[55%] sm:w-[40%] md:w-[30%] opacity-70 dark:opacity-10 transition-opacity duration-1000"
                viewBox="0 0 200 80"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M40 60 Q20 60 20 40 Q20 25 40 25 Q45 10 65 12 Q85 5 95 22 Q115 18 120 35 Q140 30 145 50 Q155 55 150 65 Q140 72 125 68 Q105 78 85 70 Q65 75 50 68 Q40 70 40 60 Z"
                    fill="white"
                    fillOpacity="0.85"
                />
            </svg>

            <svg
                className="absolute top-[35%] right-[-5%] w-[60%] sm:w-[35%] md:w-[28%] opacity-60 dark:opacity-10 transition-opacity duration-1000"
                viewBox="0 0 200 80"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M40 60 Q20 60 20 40 Q20 25 40 25 Q45 10 65 12 Q85 5 95 22 Q115 18 120 35 Q140 30 145 50 Q155 55 150 65 Q140 72 125 68 Q105 78 85 70 Q65 75 50 68 Q40 70 40 60 Z"
                    fill="white"
                    fillOpacity="0.8"
                />
            </svg>

            <svg
                className="hidden sm:block absolute top-[60%] left-[12%] w-[30%] md:w-[22%] opacity-50 dark:opacity-5 transition-opacity duration-1000"
                viewBox="0 0 200 80"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M40 60 Q20 60 20 40 Q20 25 40 25 Q45 10 65 12 Q85 5 95 22 Q115 18 120 35 Q140 30 145 50 Q155 55 150 65 Q140 72 125 68 Q105 78 85 70 Q65 75 50 68 Q40 70 40 60 Z"
                    fill="white"
                    fillOpacity="0.75"
                />
            </svg>

            <svg
                className="hidden md:block absolute bottom-[15%] right-[20%] w-[20%] opacity-50 dark:opacity-5 transition-opacity duration-1000"
                viewBox="0 0 200 80"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M40 60 Q20 60 20 40 Q20 25 40 25 Q45 10 65 12 Q85 5 95 22 Q115 18 120 35 Q140 30 145 50 Q155 55 150 65 Q140 72 125 68 Q105 78 85 70 Q65 75 50 68 Q40 70 40 60 Z"
                    fill="white"
                    fillOpacity="0.7"
                />
            </svg>

            {/* Capa 5: niebla suave en la base */}
            <div className="absolute bottom-0 left-0 right-0 h-[25%] bg-gradient-to-t from-white/40 dark:from-slate-950/50 to-transparent transition-all duration-1000" />
        </div>
    );
}
