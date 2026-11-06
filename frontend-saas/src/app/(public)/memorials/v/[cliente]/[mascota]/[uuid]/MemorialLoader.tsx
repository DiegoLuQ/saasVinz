"use client";

import React from 'react';
import dynamic from 'next/dynamic';

const MemorialClientPage = dynamic(() => import('./MemorialClientPage'), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center space-y-6 relative overflow-hidden">
            {/* Halo de luz suave de fondo */}
            <div className="absolute w-[450px] h-[450px] rounded-full bg-amber-400/10 blur-[100px] pointer-events-none animate-pulse" />

            <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="relative w-16 h-16 rounded-full flex items-center justify-center bg-amber-400/10 border border-amber-400/30 shadow-[0_0_35px_rgba(245,158,11,0.35)]">
                    <span className="text-2xl animate-bounce">🕊️</span>
                </div>
                <div className="space-y-1.5 text-center">
                    <p className="text-amber-100 font-serif text-lg tracking-[0.2em] uppercase font-light">
                        Preparando santuario
                    </p>
                    <p className="text-amber-200/50 text-xs tracking-widest uppercase font-mono animate-pulse">
                        Encendiendo su luz eterna...
                    </p>
                </div>
            </div>
        </div>
    ),
});

/** Memorial público (carga diferida). `uuid` viene del enlace corto; en el largo se toma de la URL. */
export default function MemorialLoader({ uuid }: { uuid?: string }) {
    return <MemorialClientPage uuid={uuid} />;
}
