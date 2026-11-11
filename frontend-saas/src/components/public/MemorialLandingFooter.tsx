'use client';

import React from 'react';
import { MessageCircle, Globe } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { getLandingContent, whatsappLink, LANDING_SECTIONS } from '@/lib/memorialLanding';

/** Footer de la landing del memorial con el logo oficial de Vinzer. */
export function MemorialLandingFooter({ locale, isDark = false }: { locale: Locale; isDark?: boolean }) {
    const c = getLandingContent(locale);
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'vinzer.cl';

    return (
        <footer className={`border-t transition-colors duration-300 ${
            isDark ? 'bg-[#0b1120] text-slate-300 border-white/10' : 'bg-[#F3EFE7] text-slate-700 border-stone-200/80'
        }`}>
            <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-3 gap-10 items-start">
                <div className="space-y-4 text-center md:text-left">
                    <a href="#" className="inline-flex items-center gap-3">
                        <img src="/logo-vinzer.webp" alt="Vinzer" width={96} height={47} className="h-11 w-auto" />
                        <span className="flex flex-col leading-none">
                            <span className={`text-xl font-serif italic font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Vinzer</span>
                            <span className="text-[9px] uppercase tracking-[0.3em] text-[#c5a059] font-bold mt-1">Memorial</span>
                        </span>
                    </a>
                    <p className={`font-serif italic ${isDark ? 'text-[#19B5FE]/95' : 'text-sky-700'}`}>“{c.footer.tagline}”</p>
                </div>

                <nav className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm md:pt-3">
                    {LANDING_SECTIONS.map(id => (
                        <a key={id} href={`#${id}`} className={`transition-colors ${isDark ? 'text-slate-400 hover:text-[#c5a059]' : 'text-slate-600 hover:text-[#a88234]'}`}>
                            {c.nav[id]}
                        </a>
                    ))}
                </nav>

                <div className="flex flex-col items-center md:items-end gap-3 md:pt-2">
                    <a
                        href={whatsappLink(c.whatsapp_general)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-semibold transition-colors ${
                            isDark
                                ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/20'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                        }`}
                    >
                        <MessageCircle size={16} /> {c.footer.contact}
                    </a>
                    <a
                        href={`https://${rootDomain}`}
                        className={`inline-flex items-center gap-2 text-sm transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <Globe size={15} /> {c.footer.site}
                    </a>
                </div>
            </div>
            <div className={`border-t py-5 text-center text-xs tracking-wider ${isDark ? 'border-white/5 text-slate-500' : 'border-stone-200/80 text-slate-500'}`}>
                © {new Date().getFullYear()} Vinzer. {c.footer.rights}
            </div>
        </footer>
    );
}
