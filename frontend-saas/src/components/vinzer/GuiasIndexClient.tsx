'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, Cpu, Globe, ArrowRight, ChevronRight, BookOpen } from 'lucide-react';

import { VinzerNavbar } from './VinzerNavbar';
import { VinzerFooter } from './VinzerFooter';
import { GUIAS, guiaPath, type GuiaAccent } from '@/lib/vinzer/guias';

const ACCENT = {
    sky: {
        icon: ShieldCheck,
        dark: 'bg-[#19B5FE]/10 border-[#19B5FE]/25 text-[#19B5FE]',
        light: 'bg-sky-50 border-sky-200 text-[#0284C7]',
        hoverDark: 'hover:border-[#19B5FE]/40',
        hoverLight: 'hover:border-sky-300',
    },
    gold: {
        icon: Cpu,
        dark: 'bg-[#E7C15A]/10 border-[#E7C15A]/25 text-[#E7C15A]',
        light: 'bg-amber-50 border-amber-200 text-amber-700',
        hoverDark: 'hover:border-[#E7C15A]/40',
        hoverLight: 'hover:border-amber-300',
    },
    emerald: {
        icon: Globe,
        dark: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
        light: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        hoverDark: 'hover:border-emerald-400/40',
        hoverLight: 'hover:border-emerald-300',
    },
} satisfies Record<GuiaAccent, unknown>;

export function GuiasIndexClient() {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        try {
            const savedTheme = localStorage.getItem('vinzer-landing-theme') as 'dark' | 'light' | null;
            // Se lee tras montar (no en el initializer) para no romper la hidratación del SSR.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (savedTheme) setTheme(savedTheme);
        } catch { /* sin storage: tema por defecto */ }
    }, []);

    const toggleTheme = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        try { localStorage.setItem('vinzer-landing-theme', nextTheme); } catch { /* noop */ }
    };

    const isLight = theme === 'light';

    return (
        <div
            className={`min-h-screen transition-colors duration-500 font-sans relative overflow-hidden ${
                isLight
                    ? 'bg-slate-50 text-slate-900 selection:bg-[#0284C7]/20 selection:text-slate-900'
                    : 'bg-[#020210] text-white selection:bg-[#19B5FE]/30 selection:text-white'
            }`}
        >
            <VinzerNavbar theme={theme} toggleTheme={toggleTheme} />

            {/* Glows ambientales sutiles */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[520px] pointer-events-none z-0 overflow-hidden">
                <div
                    className={`absolute top-[5%] left-[10%] w-[480px] h-[480px] blur-[170px] rounded-full ${
                        isLight ? 'bg-sky-400/15 opacity-60' : 'bg-[#19B5FE]/10'
                    }`}
                />
                <div
                    className={`absolute top-[10%] right-[5%] w-[420px] h-[420px] blur-[180px] rounded-full ${
                        isLight ? 'bg-amber-300/10 opacity-50' : 'bg-[#E7C15A]/5'
                    }`}
                />
            </div>

            <header className="relative pt-32 sm:pt-36 pb-10 px-4 sm:px-6 z-10 max-w-6xl mx-auto">
                <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs font-semibold mb-6 flex-wrap">
                    <Link
                        href="/"
                        className={`transition-colors ${isLight ? 'text-slate-500 hover:text-[#0284C7]' : 'text-slate-400 hover:text-[#19B5FE]'}`}
                    >
                        Inicio
                    </Link>
                    <ChevronRight size={13} className={isLight ? 'text-slate-300' : 'text-slate-600'} />
                    <span className={`font-bold ${isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'}`}>Guías B2B</span>
                </nav>

                <div
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border mb-5 ${
                        isLight ? 'bg-sky-50 border-sky-200 text-[#0284C7]' : 'bg-[#19B5FE]/10 border-[#19B5FE]/25 text-[#19B5FE]'
                    }`}
                >
                    <BookOpen size={14} /> Recursos para directores de crematorios
                </div>

                <h1 className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.15] max-w-3xl ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Guías para crematorios de mascotas
                </h1>
                <p className={`mt-5 text-base sm:text-lg leading-relaxed max-w-2xl ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    Protocolos y buenas prácticas para operar con trazabilidad, orden y transparencia hacia las familias
                    y las clínicas veterinarias.
                </p>
            </header>

            <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-20">
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                    {GUIAS.map((g) => {
                        const a = ACCENT[g.accent];
                        const Icon = a.icon;
                        return (
                            <li key={g.slug}>
                                <Link
                                    href={guiaPath(g.slug)}
                                    className={`group h-full flex flex-col rounded-3xl border p-6 sm:p-7 transition-all ${
                                        isLight
                                            ? `bg-white border-slate-200 shadow-sm hover:shadow-md ${a.hoverLight}`
                                            : `bg-gradient-to-b from-[#071120] to-[#020210] border-white/10 ${a.hoverDark}`
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-3 mb-5">
                                        <span className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${isLight ? a.light : a.dark}`}>
                                            <Icon size={20} />
                                        </span>
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${isLight ? a.light : a.dark}`}>
                                            {g.badge}
                                        </span>
                                    </div>

                                    <h2 className={`text-xl sm:text-2xl font-black tracking-tight leading-snug ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                        {g.title}
                                    </h2>
                                    <p className={`mt-3 text-sm leading-relaxed flex-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                                        {g.summary}
                                    </p>

                                    <div className="mt-5 flex flex-wrap gap-1.5">
                                        {g.topics.map((t) => (
                                            <span
                                                key={t}
                                                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                                    isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/5 text-slate-400'
                                                }`}
                                            >
                                                {t}
                                            </span>
                                        ))}
                                    </div>

                                    <span
                                        className={`mt-6 inline-flex items-center gap-1.5 text-sm font-bold ${
                                            isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'
                                        }`}
                                    >
                                        Leer guía
                                        <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                {/* CTA */}
                <div
                    className={`mt-12 rounded-3xl border p-7 sm:p-9 flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-gradient-to-r from-[#071120] to-[#0a0f1f] border-white/10'
                    }`}
                >
                    <div>
                        <h2 className={`text-lg sm:text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            ¿Quieres verlo funcionando en tu crematorio?
                        </h2>
                        <p className={`mt-1.5 text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            Agenda una demo guiada de 20 minutos con nuestro equipo.
                        </p>
                    </div>
                    <a
                        href="/#demo"
                        className={`shrink-0 inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md ${
                            isLight
                                ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-sky-600/20'
                                : 'bg-[#19B5FE] hover:bg-[#0e9ce0] text-[#020210] shadow-[#19B5FE]/20'
                        }`}
                    >
                        Agendar demo <ArrowRight size={15} />
                    </a>
                </div>
            </main>

            <VinzerFooter theme={theme} />
        </div>
    );
}
