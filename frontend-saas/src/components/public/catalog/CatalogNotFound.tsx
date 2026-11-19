"use client";

import React, { useEffect } from 'react';
import { Heart, Sparkles, RotateCw } from 'lucide-react';
import { getMainRootUrl } from '@/lib/publicUrls';

interface Props {
    /** Texto alternativo (ej. el error que devolvió la API). */
    message?: string | null;
    /** Muestra «Reintentar» (útil cuando pudo ser un fallo de conexión). */
    showRetry?: boolean;
}

/**
 * Pantalla cálida para catálogos que no existen: raíz de catalogo.<dominio>,
 * enlaces incompletos (/crematorio sin token) o tokens inválidos.
 * Respeta el tema guardado (localStorage 'theme') o el del sistema.
 */
export default function CatalogNotFound({ message, showRetry = false }: Props) {
    useEffect(() => {
        let saved: string | null = null;
        try { saved = localStorage.getItem('theme'); } catch { /* sin almacenamiento */ }
        const dark = saved === 'dark' || (saved !== 'light' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
        document.documentElement.setAttribute('data-mode', dark ? 'dark' : 'light');
    }, []);

    return (
        <main className="min-h-[100dvh] bg-slate-50 text-slate-900 dark:bg-[#0a0d14] dark:text-white flex items-center justify-center px-4 py-10 sm:px-6 relative overflow-hidden">
            {/* Halo suave de fondo */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2 w-[22rem] h-[22rem] sm:w-[32rem] sm:h-[32rem] rounded-full bg-amber-300/20 dark:bg-amber-400/10 blur-[110px]" />
                <div className="absolute right-[-6rem] bottom-[-6rem] w-72 h-72 rounded-full bg-sky-300/20 dark:bg-indigo-500/10 blur-[100px]" />
            </div>

            <section className="relative z-10 w-full max-w-lg text-center">
                <div className="rounded-[2rem] border border-slate-200/80 bg-white/85 dark:border-white/10 dark:bg-[#111622]/85 backdrop-blur-xl shadow-2xl shadow-slate-900/5 dark:shadow-black/40 px-6 py-10 sm:px-12 sm:py-14">
                    {/* Ícono: huella con corazón */}
                    <div className="mx-auto mb-7 relative w-20 h-20 sm:w-24 sm:h-24">
                        <div className="absolute inset-0 rounded-full bg-amber-100 dark:bg-amber-400/10 animate-pulse motion-reduce:animate-none" />
                        <div className="absolute inset-2 rounded-full bg-white dark:bg-[#0a0d14] border border-amber-200 dark:border-amber-400/20 flex items-center justify-center">
                            <PawHeart />
                        </div>
                    </div>

                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400 mb-3">
                        Catálogo no encontrado
                    </p>
                    <h1 className="font-serif text-2xl sm:text-3xl font-bold leading-snug text-slate-900 dark:text-white mb-4">
                        Este camino no lleva a ningún catálogo
                    </h1>
                    <p className="text-sm sm:text-base leading-relaxed text-slate-600 dark:text-neutral-400 mb-2">
                        {message || 'Cada crematorio comparte su catálogo con un enlace personal. Puede que el enlace esté incompleto o que ya no esté disponible.'}
                    </p>
                    <p className="text-sm sm:text-base leading-relaxed text-slate-600 dark:text-neutral-400 mb-8">
                        Si estás despidiendo a un compañero de vida, pide el enlace completo a tu crematorio: con gusto te lo enviarán.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 sm:justify-center">
                        {showRetry && (
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-bold text-sm transition-colors active:scale-[0.98]"
                            >
                                <RotateCw size={16} />
                                Reintentar
                            </button>
                        )}
                        <a
                            href="https://vinzer.cl"
                            // En local/otros dominios apunta a la raíz del host actual
                            onClick={(e) => { e.currentTarget.href = getMainRootUrl(); }}
                            className={`inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-2xl font-bold text-sm transition-colors active:scale-[0.98] ${showRetry
                                ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10'
                                : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'}`}
                        >
                            <Sparkles size={16} />
                            Conocer Vinzer
                        </a>
                    </div>
                </div>

                <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-neutral-500">
                    <Heart size={12} className="text-rose-400" fill="currentColor" />
                    Cada historia merece un adiós digno
                </p>
            </section>
        </main>
    );
}

function PawHeart() {
    return (
        <svg viewBox="0 0 48 48" className="w-9 h-9 sm:w-11 sm:h-11 text-amber-600 dark:text-amber-400" fill="currentColor" aria-hidden>
            <ellipse cx="12" cy="17" rx="4" ry="5.2" />
            <ellipse cx="20.5" cy="10.5" rx="4" ry="5.4" />
            <ellipse cx="29.5" cy="10.5" rx="4" ry="5.4" />
            <ellipse cx="37" cy="17" rx="4" ry="5.2" />
            <path d="M24.5 42c-.4 0-.8-.1-1.1-.4C16 36 14 32.2 14 28.9c0-3.4 2.6-6 5.8-6 1.9 0 3.6.9 4.7 2.4 1.1-1.5 2.8-2.4 4.7-2.4 3.2 0 5.8 2.6 5.8 6 0 3.3-2 7.1-9.4 12.7-.3.3-.7.4-1.1.4z" />
        </svg>
    );
}
