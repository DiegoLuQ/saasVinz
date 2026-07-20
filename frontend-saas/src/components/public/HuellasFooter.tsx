"use client";

import React from 'react';
import {
    Instagram,
    Mail,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { R2_HOST } from '@/lib/r2';

interface HuellasFooterProps {
    locale: 'es' | 'en';
    t: any;
}

export function HuellasFooter({ locale, t }: HuellasFooterProps) {
    const router = useRouter();
    const currentYear = new Date().getFullYear();

    const switchLanguage = (newLocale: 'es' | 'en') => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('preferred_locale', newLocale);
            // Public pages listen for this event and re-render in place — no reload needed
            window.dispatchEvent(new Event('localeChange'));
        }
    };

    // Custom TikTok Icon
    const TikTokIcon = ({ size = 18 }: { size?: number }) => (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
        </svg>
    );

    return (
        <footer className="relative z-50 py-10 bg-[#0b1120] text-slate-100 font-sans border-t border-white/10">
            <div className="max-w-7xl mx-auto px-6 text-center space-y-2">
                <p className="text-xs text-slate-400 tracking-wider">
                    © 2026 Vinzer. {locale === 'en' ? 'All rights reserved.' : 'Todos los derechos reservados.'}
                </p>
                <p className="text-[#19B5FE]/95 font-serif italic text-base">
                    "{locale === 'en' ? 'The value of a dignified farewell' : 'El valor de una despedida digna'}"
                </p>
            </div>
        </footer>
    );
}
