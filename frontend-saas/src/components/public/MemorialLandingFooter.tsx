'use client';

import React from 'react';
import { MessageCircle, Globe } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { getLandingContent, whatsappLink, LANDING_SECTIONS } from '@/lib/memorialLanding';

/** Footer de la landing del memorial con el logo oficial de Vinzer. */
export function MemorialLandingFooter({ locale }: { locale: Locale }) {
    const c = getLandingContent(locale);
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'vinzer.cl';

    return (
        <footer className="bg-[#0b1120] text-slate-300 border-t border-white/10">
            <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-3 gap-10 items-start">
                <div className="space-y-4 text-center md:text-left">
                    <a href="#" className="inline-flex items-center gap-3">
                        <img src="/logo-vinzer.webp" alt="Vinzer" width={96} height={47} className="h-11 w-auto" />
                        <span className="flex flex-col leading-none">
                            <span className="text-xl font-serif italic font-bold text-white">Vinzer</span>
                            <span className="text-[9px] uppercase tracking-[0.3em] text-[#c5a059] font-bold mt-1">Memorial</span>
                        </span>
                    </a>
                    <p className="text-[#19B5FE]/95 font-serif italic">“{c.footer.tagline}”</p>
                </div>

                <nav className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm md:pt-3">
                    {LANDING_SECTIONS.map(id => (
                        <a key={id} href={`#${id}`} className="text-slate-400 hover:text-[#c5a059] transition-colors">
                            {c.nav[id]}
                        </a>
                    ))}
                </nav>

                <div className="flex flex-col items-center md:items-end gap-3 md:pt-2">
                    <a
                        href={whatsappLink(c.whatsapp_general)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/20 transition-colors"
                    >
                        <MessageCircle size={16} /> {c.footer.contact}
                    </a>
                    <a
                        href={`https://${rootDomain}`}
                        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        <Globe size={15} /> {c.footer.site}
                    </a>
                </div>
            </div>
            <div className="border-t border-white/5 py-5 text-center text-xs text-slate-500 tracking-wider">
                © {new Date().getFullYear()} Vinzer. {c.footer.rights}
            </div>
        </footer>
    );
}
