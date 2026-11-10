"use client";

import React from 'react';
import { ExternalLink } from 'lucide-react';

interface HuellasFooterProps {
    locale?: 'es' | 'en';
    t?: any;
    isDarkMode?: boolean;
    transparent?: boolean;
    className?: string;
}

export function HuellasFooter({
    locale = 'es',
    t,
    isDarkMode = true,
    transparent = false,
    className = ''
}: HuellasFooterProps) {
    const currentYear = new Date().getFullYear();

    return (
        <footer
            className={`relative z-50 py-10 font-sans transition-colors ${
                transparent
                    ? (isDarkMode ? 'border-t border-white/5 text-white/60' : 'border-t border-slate-200 text-slate-500')
                    : 'bg-[#0b1120] text-slate-100 border-t border-white/10'
            } ${className}`}
        >
            <div className="max-w-7xl mx-auto px-6 text-center space-y-3">
                {/* Firma discreta y elegante: Tecnología por Vinzer · Crea un memorial */}
                <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs">
                    <span>
                        Tecnología por{' '}
                        <a
                            href="https://vinzer.cl"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`font-semibold hover:underline transition-colors ${
                                isDarkMode ? 'text-white/80 hover:text-white' : 'text-slate-800 hover:text-black'
                            }`}
                        >
                            Vinzer
                        </a>
                    </span>
                    <span className="opacity-40">·</span>
                    <a
                        href="https://vinzer.cl"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 font-medium hover:underline transition-colors ${
                            isDarkMode ? 'text-white/70 hover:text-amber-300' : 'text-slate-600 hover:text-amber-700'
                        }`}
                    >
                        <span>Crea un memorial para tu mascota</span>
                        <ExternalLink size={12} className="opacity-70" />
                    </a>
                </div>

                <p className="text-[11px] opacity-60 tracking-wider">
                    © {currentYear} Vinzer. {locale === 'en' ? 'All rights reserved.' : 'Todos los derechos reservados.'}
                </p>
                <p className={`font-serif italic text-sm ${isDarkMode ? 'text-[#19B5FE]/90' : 'text-sky-700/80'}`}>
                    "{locale === 'en' ? 'The value of a dignified farewell' : 'El valor de una despedida digna'}"
                </p>
            </div>
        </footer>
    );
}
