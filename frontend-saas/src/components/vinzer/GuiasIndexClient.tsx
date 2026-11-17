'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, Cpu, Globe, Smartphone, Heart, ArrowRight, ChevronRight, BookOpen, Building2 } from 'lucide-react';

import { VinzerNavbar } from './VinzerNavbar';
import { VinzerFooter } from './VinzerFooter';
import { GUIAS, guiaPath, type Guia, type GuiaAccent } from '@/lib/vinzer/guias';

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
    violet: {
        icon: Smartphone,
        dark: 'bg-violet-500/10 border-violet-500/25 text-violet-400',
        light: 'bg-violet-50 border-violet-200 text-violet-700',
        hoverDark: 'hover:border-violet-400/40',
        hoverLight: 'hover:border-violet-300',
    },
    rose: {
        icon: Heart,
        dark: 'bg-[#C6A56A]/15 border-[#C6A56A]/35 text-[#E7C15A]',
        light: 'bg-[#F0EAE0] border-[#C6A56A]/45 text-[#5B493D]',
        hoverDark: 'hover:border-[#C6A56A]/55',
        hoverLight: 'hover:border-[#C6A56A]',
    },
} satisfies Record<GuiaAccent, unknown>;

const GUIAS_CREMATORIOS = GUIAS.filter((g) => g.audience === 'crematorios');
const GUIAS_FAMILIAS = GUIAS.filter((g) => g.audience === 'familias');

type AudienceFilter = 'all' | 'crematorios' | 'familias';

export function GuiasIndexClient() {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [filter, setFilter] = useState<AudienceFilter>('all');

    useEffect(() => {
        try {
            const savedTheme = localStorage.getItem('vinzer-landing-theme') as 'dark' | 'light' | null;
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
    const showCrematorios = filter === 'all' || filter === 'crematorios';
    const showFamilias = (filter === 'all' || filter === 'familias') && GUIAS_FAMILIAS.length > 0;

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
                    <span className={`font-bold ${isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'}`}>Guías</span>
                </nav>

                <div
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border mb-5 ${
                        isLight ? 'bg-sky-50 border-sky-200 text-[#0284C7]' : 'bg-[#19B5FE]/10 border-[#19B5FE]/25 text-[#19B5FE]'
                    }`}
                >
                    <BookOpen size={14} /> Centro de Guías y Recursos
                </div>

                <h1 className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.15] max-w-3xl ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Guías sobre cremación de mascotas y gestión operativa
                </h1>
                <p className={`mt-5 text-base sm:text-lg leading-relaxed max-w-2xl ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    Información clara para familias que buscan orientación en un momento difícil, y herramientas prácticas
                    para crematorios y clínicas veterinarias.
                </p>

                {/* Selector de segmento */}
                <div className="mt-8 inline-flex flex-wrap gap-2 p-1.5 rounded-2xl border bg-black/15 border-white/10">
                    {([
                        { id: 'all', label: 'Todas las guías' },
                        { id: 'familias', label: 'Para familias y tutores' },
                        { id: 'crematorios', label: 'Para crematorios (B2B)' },
                    ] as const).map((tab) => {
                        const active = filter === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setFilter(tab.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                    active
                                        ? isLight
                                            ? 'bg-[#0284C7] text-white shadow-sm'
                                            : 'bg-[#19B5FE] text-[#020210] shadow-sm'
                                        : isLight
                                            ? 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                                            : 'text-slate-300 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </header>

            <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-20 space-y-16">
                {showFamilias && (
                    <section aria-labelledby="guias-familias">
                        <div
                            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border mb-4 ${
                                isLight ? 'bg-[#F0EAE0] border-[#C6A56A]/45 text-[#5B493D]' : 'bg-[#C6A56A]/15 border-[#C6A56A]/35 text-[#E7C15A]'
                            }`}
                        >
                            <Heart size={14} /> Para familias y tutores
                        </div>
                        <h2 id="guias-familias" className={`text-2xl sm:text-3xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            Guías informativas para despedir a tu mascota
                        </h2>
                        <p className={`mt-3 mb-7 text-sm sm:text-base leading-relaxed max-w-2xl ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                            Contenido cercano, sin lenguaje comercial: qué opciones de cremación existen, qué factores influyen
                            en el precio y cómo elegir un servicio confiable. Vinzer no realiza cremaciones directamente.
                        </p>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                            {GUIAS_FAMILIAS.map((g) => <GuiaCard key={g.slug} g={g} isLight={isLight} />)}
                        </ul>
                    </section>
                )}

                {showCrematorios && (
                    <section aria-labelledby="guias-crematorios">
                        <div
                            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border mb-4 ${
                                isLight ? 'bg-sky-50 border-sky-200 text-[#0284C7]' : 'bg-[#19B5FE]/10 border-[#19B5FE]/25 text-[#19B5FE]'
                            }`}
                        >
                            <Building2 size={14} /> Para profesionales (B2B)
                        </div>
                        <h2 id="guias-crematorios" className={`text-2xl sm:text-3xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            Guías operativas para crematorios de mascotas
                        </h2>
                        <p className={`mt-3 mb-7 text-sm sm:text-base leading-relaxed max-w-2xl ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                            Protocolos y buenas prácticas para operar con trazabilidad, orden interno y comunicación transparente
                            hacia las familias y clínicas veterinarias.
                        </p>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                            {GUIAS_CREMATORIOS.map((g) => <GuiaCard key={g.slug} g={g} isLight={isLight} />)}
                        </ul>
                    </section>
                )}

                {/* CTA B2B solo visible cuando corresponde */}
                {showCrematorios && (
                    <div
                        className={`rounded-3xl border p-7 sm:p-9 flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-gradient-to-r from-[#071120] to-[#0a0f1f] border-white/10'
                        }`}
                    >
                        <div>
                            <h2 className={`text-lg sm:text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                ¿Administras un crematorio y quieres verlo en funcionamiento?
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
                )}
            </main>

            <VinzerFooter theme={theme} />
        </div>
    );
}

function GuiaCard({ g, isLight }: { g: Guia; isLight: boolean }) {
    const a = ACCENT[g.accent];
    const Icon = a.icon;
    const isFamilia = g.audience === 'familias';

    return (
        <li>
            <Link
                href={guiaPath(g.slug)}
                className={`group h-full flex flex-col rounded-3xl border p-6 sm:p-7 transition-all ${
                    isFamilia && isLight
                        ? 'bg-[#FAF8F3] border-[#E6DFD5] shadow-sm hover:shadow-md hover:border-[#C6A56A]'
                        : isLight
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

                <h2 className={`text-xl sm:text-2xl font-black tracking-tight leading-snug ${isFamilia && isLight ? 'text-[#292522]' : isLight ? 'text-slate-900' : 'text-white'}`}>
                    {g.title}
                </h2>
                <p className={`mt-3 text-sm leading-relaxed flex-1 ${isFamilia && isLight ? 'text-[#5B493D]' : isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    {g.summary}
                </p>

                <div className="mt-5 flex flex-wrap gap-1.5">
                    {g.topics.map((t) => (
                        <span
                            key={t}
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                isFamilia && isLight
                                    ? 'bg-[#F0EAE0] text-[#5B493D]'
                                    : isLight
                                        ? 'bg-slate-100 text-slate-600'
                                        : 'bg-white/5 text-slate-400'
                            }`}
                        >
                            {t}
                        </span>
                    ))}
                </div>

                <span
                    className={`mt-6 inline-flex items-center gap-1.5 text-sm font-bold ${
                        isFamilia ? (isLight ? 'text-[#5B493D]' : 'text-[#E7C15A]') : (isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]')
                    }`}
                >
                    Leer guía
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </span>
            </Link>
        </li>
    );
}
