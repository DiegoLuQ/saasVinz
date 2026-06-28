'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Menu, X, ChevronRight } from 'lucide-react';
import { getTranslations, type Locale } from '@/lib/translations';

export interface PublicHeaderProps {
    isDark?: boolean;
    customBg?: string;
    transparent?: boolean;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({
    isDark = false,
    customBg,
    transparent = false
}) => {
    const [locale, setLocale] = useState<Locale>('es');
    const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [loginUrl, setLoginUrl] = useState('http://app.localhost:3000');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            const port = window.location.port;
            const protocol = window.location.protocol;
            if (hostname.includes('localhost') || hostname.includes('lvh.me')) {
                const rootDomain = hostname.includes('lvh.me') ? 'lvh.me' : 'localhost';
                setLoginUrl(`${protocol}//app.${rootDomain}${port ? `:${port}` : ''}/login`);
            } else {
                const rootDomainEnv = process.env.NEXT_PUBLIC_ROOT_DOMAIN || hostname;
                setLoginUrl(`${protocol}//app.${rootDomainEnv}/login`);
            }
        }
    }, []);

    const sheetVariants = {
        hidden: { y: '100%' },
        visible: {
            y: 0,
            transition: {
                type: 'spring' as const,
                stiffness: 320,
                damping: 34,
                staggerChildren: 0.06,
                delayChildren: 0.12
            }
        },
        exit: {
            y: '100%',
            transition: { duration: 0.25, ease: 'easeIn' as const }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
        exit: { opacity: 0, y: 10 }
    };


    useEffect(() => {
        // Sync with the same key used in HuellasFooter
        const saved = localStorage.getItem('preferred_locale') as Locale | null;
        if (saved === 'es' || saved === 'en') setLocale(saved);

        const syncLocale = () => {
            const current = localStorage.getItem('preferred_locale') as Locale | null;
            if (current && current !== locale) setLocale(current);
        };

        const handleModalToggle = (e: any) => {
            setIsMenuModalOpen(!!e.detail);
        };

        window.addEventListener('storage', syncLocale);
        window.addEventListener('localeChange', syncLocale);
        window.addEventListener('paw-modal-toggle', handleModalToggle);

        return () => {
            window.removeEventListener('storage', syncLocale);
            window.removeEventListener('localeChange', syncLocale);
            window.removeEventListener('paw-modal-toggle', handleModalToggle);
        };
    }, [locale]);

    // Subtle elevation/contrast change once the user scrolls past the hero top
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 12);
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Lock body scroll while the mobile menu is open
    useEffect(() => {
        if (!isMobileMenuOpen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previous; };
    }, [isMobileMenuOpen]);

    // Close the mobile menu with the Escape key
    useEffect(() => {
        if (!isMobileMenuOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsMobileMenuOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isMobileMenuOpen]);

    const toggleLocale = () => {
        const next: Locale = locale === 'es' ? 'en' : 'es';
        setLocale(next);
        localStorage.setItem('preferred_locale', next);
        // All public pages/components listen for this event and re-render in place — no reload needed
        window.dispatchEvent(new Event('localeChange'));
    };

    const t = getTranslations(locale);

    const pathname = usePathname();
    const navItems = [
        { href: '/memorials', label: t.nav_gallery },
        { href: '/our-services', label: t.nav_services },
        { href: '/planning', label: t.nav_planning },
    ];
    const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

    // Helper to detect brightness for custom background colors
    const isColorDark = (hex?: string) => {
        if (!hex || hex.length < 6) return false;
        try {
            const color = hex.replace('#', '');
            const r = parseInt(color.substring(0, 2), 16);
            const g = parseInt(color.substring(2, 4), 16);
            const b = parseInt(color.substring(4, 6), 16);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            return brightness < 128;
        } catch (e) { return false; }
    };

    const effectiveIsDark = isDark || isMenuModalOpen || (customBg && isColorDark(customBg));

    // Dynamic styling based on theme
    const textMainClass = effectiveIsDark ? 'text-white' : 'text-slate-900';
    const textMutedClass = effectiveIsDark ? 'text-white/75' : 'text-slate-700'; // higher contrast on dark for legible nav links
    return (
        <header
            className="fixed top-6 inset-x-0 z-50 flex justify-center px-4 bg-transparent transition-all duration-500"
            style={customBg && !transparent && !isMenuModalOpen ? { backgroundColor: customBg } : {}}
        >
            {/* Header Outer Glow/Border effect */}
            <div className={`
                w-auto md:w-full max-w-6xl relative
                ${effectiveIsDark 
                    ? 'bg-slate-950/70 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]' 
                    : 'bg-white/80 border-slate-200/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.08)]'}
                backdrop-blur-xl border rounded-full px-5 sm:px-8 transition-all duration-500
                ${isScrolled ? 'py-2 scale-98 border-[#c5a059]/20' : 'py-3'}
            `}>
                {/* Subtle golden ambient top line on hover/scroll */}
                <div className={`absolute top-0 inset-x-12 h-px bg-gradient-to-r from-transparent via-[#c5a059]/50 to-transparent transition-opacity duration-500 ${isScrolled ? 'opacity-100' : 'opacity-0'}`} />

                <div className="relative h-14 flex items-center justify-between gap-8 md:gap-0">

                    {/* LOGO - Lado Izquierdo */}
                    <Link
                        href="/"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 group transition-all duration-300 active:scale-95"
                    >
                        <div className="relative w-11 h-11 bg-black rounded-full flex items-center justify-center shadow-lg shadow-black/30 ring-2 ring-white/10 overflow-hidden transition-all duration-500 group-hover:scale-105 group-hover:ring-[#c5a059]/50 group-hover:shadow-[#c5a059]/20">
                            <img
                                src={`https://pub-${process.env.NEXT_PUBLIC_CLOUDFLARE_R2}/library/gallery/69632b5a-b655-4452-8d25-ddfe7ced4e86.webp`}
                                alt="Paw Memory Logo"
                                className="w-full h-full object-cover mix-blend-screen scale-125 transition-transform duration-700 group-hover:rotate-12 group-hover:scale-135"
                            />
                            {/* Inner golden glow */}
                            <div className="absolute inset-0 rounded-full border border-[#c5a059]/25 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-xl font-serif italic font-extrabold tracking-tight transition-all duration-300 ${effectiveIsDark ? 'text-white group-hover:text-[#c5a059]' : 'text-slate-900 group-hover:text-[#c5a059]'}`}>
                                Paw Memory
                            </span>
                            <span className="text-[7px] uppercase tracking-widest text-[#c5a059] font-bold opacity-80 group-hover:opacity-100 transition-opacity duration-300 -mt-1">
                                Eternal Tribute
                            </span>
                        </div>
                    </Link>

                    {/* NAVEGACIÓN CENTRAL */}
                    <nav className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
                        {navItems.map((item) => {
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={`group relative px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-all duration-300 z-10
                                        ${active ? 'text-[#c5a059]' : `${textMutedClass} hover:text-[#c5a059]`}`}
                                >
                                    {active && (
                                        <motion.span
                                            layoutId="activeNavBackground"
                                            className="absolute inset-0 bg-[#c5a059]/10 border border-[#c5a059]/20 rounded-full z-0"
                                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                    <span className="relative z-10 transition-transform duration-300 group-hover:scale-105 inline-block">{item.label}</span>
                                    <span
                                        className={`pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 h-[2px] rounded-full bg-[#c5a059] transition-all duration-300 z-20
                                            ${active ? 'w-4 opacity-100' : 'w-0 opacity-0 group-hover:w-4 group-hover:opacity-100'}`}
                                    />
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Mobile Menu Button - Visible only on mobile */}
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        aria-label="Abrir menú"
                        aria-expanded={isMobileMenuOpen}
                        aria-controls="mobile-menu"
                        className={`md:hidden p-3 rounded-full transition-all duration-300 ${textMainClass} hover:bg-white/10 active:scale-90 border ${effectiveIsDark ? 'border-white/5 bg-white/5' : 'border-slate-200/50 bg-slate-50/50'}`}
                    >
                        <Menu size={20} className="text-[#c5a059]" />
                    </button>

                    {/* ACCIONES - Lado Derecho */}
                    <div className="hidden md:flex items-center gap-4">
                        {/* Language Toggle Premium */}
                        <button
                            onClick={toggleLocale}
                            aria-label={locale === 'es' ? 'Cambiar idioma a inglés' : 'Switch language to Spanish'}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300
                            ${effectiveIsDark 
                                ? 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-[#c5a059]/40' 
                                : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-[#c5a059]/40'}`}
                        >
                            <Globe size={13} className="text-[#c5a059] animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-widest">
                                <span className={locale === 'es' ? 'text-[#c5a059]' : 'text-stone-500'}>ES</span>
                                <span className="mx-1 opacity-20 text-stone-500">|</span>
                                <span className={locale === 'en' ? 'text-[#c5a059]' : 'text-stone-500'}>EN</span>
                            </span>
                        </button>

                        {/* Botón de Acceso */}
                        <Link
                            href={loginUrl}
                            className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-300
                                ${effectiveIsDark 
                                    ? 'border-white/10 text-white bg-white/5 hover:bg-[#c5a059]/10 hover:border-[#c5a059]' 
                                    : 'border-slate-200 text-slate-800 bg-slate-50 hover:bg-[#c5a059]/10 hover:border-[#c5a059]'}`}
                        >
                            {t.nav_login}
                        </Link>

                        {/* Botón CTA (Estilo Nomad Gear) */}
                        <Link
                            href="/#planes"
                            className={`px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-300 shadow-md
                            ${effectiveIsDark
                                ? 'bg-white text-black hover:bg-[#c5a059] hover:text-white hover:shadow-[#c5a059]/25 hover:shadow-lg'
                                : 'bg-slate-900 text-white hover:bg-[#c5a059] hover:shadow-[#c5a059]/25 hover:shadow-lg'}`}
                        >
                            {t.nav_cta}
                        </Link>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Sheet */}
            <AnimatePresence>
            {isMobileMenuOpen && (
                <div className="md:hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm"
                    />

                    {/* Sheet */}
                    <motion.div
                        id="mobile-menu"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Menú de navegación"
                        variants={sheetVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.5 }}
                        onDragEnd={(_, info) => { if (info.offset.y > 120) setIsMobileMenuOpen(false); }}
                        className="fixed inset-x-0 bottom-0 z-[70] bg-slate-950/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[2.5rem] px-6 pt-3 pb-10 shadow-[0_-8px_40px_rgba(0,0,0,0.5)]"
                    >
                        {/* Ambient glow */}
                        <div className="absolute -top-px left-1/2 -translate-x-1/2 w-48 h-32 rounded-full bg-[#c5a059]/15 blur-[80px] pointer-events-none" />

                        {/* Drag handle */}
                        <div className="flex justify-center pt-1 pb-5 relative z-10 cursor-grab active:cursor-grabbing">
                            <div className="w-12 h-1.5 rounded-full bg-white/20" />
                        </div>

                        <div className="relative z-10 flex flex-col">
                            {/* Marca */}
                            <motion.div variants={itemVariants} className="flex items-center justify-between mb-5">
                                <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center ring-2 ring-[#c5a059]/30 overflow-hidden">
                                        <img
                                            src={`https://pub-${process.env.NEXT_PUBLIC_CLOUDFLARE_R2}/library/gallery/69632b5a-b655-4452-8d25-ddfe7ced4e86.webp`}
                                            alt="Paw Memory Logo"
                                            className="w-full h-full object-cover mix-blend-screen scale-125"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-lg font-serif italic font-bold tracking-tight text-white">Paw Memory</span>
                                        <span className="text-[7px] uppercase tracking-widest text-[#c5a059] font-bold opacity-80 -mt-0.5">Eternal Tribute</span>
                                    </div>
                                </Link>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    aria-label="Cerrar menú"
                                    className="p-2.5 rounded-full bg-white/5 text-white/70 hover:bg-white/10 hover:text-[#c5a059] transition-all border border-white/10"
                                >
                                    <X size={18} />
                                </button>
                            </motion.div>

                            {/* Enlaces */}
                            <nav className="flex flex-col">
                                {navItems.map((item, index) => {
                                    const active = isActive(item.href);
                                    return (
                                        <motion.div key={item.href} variants={itemVariants}>
                                            <Link
                                                href={item.href}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                aria-current={active ? 'page' : undefined}
                                                className={`group flex items-center justify-between py-4 border-b border-white/5 transition-colors ${active ? 'text-[#c5a059]' : 'text-white/90 hover:text-[#c5a059]'}`}
                                            >
                                                <span className="flex items-baseline gap-3">
                                                    <span className="text-[10px] font-mono text-[#c5a059]/50">0{index + 1}</span>
                                                    <span className="text-xl font-serif">{item.label}</span>
                                                </span>
                                                <ChevronRight size={18} className="text-white/30 group-hover:text-[#c5a059] group-hover:translate-x-1 transition-all" />
                                            </Link>
                                        </motion.div>
                                    );
                                })}
                            </nav>

                            {/* Idioma */}
                            <motion.div variants={itemVariants} className="flex items-center justify-center gap-4 py-6">
                                <span className={`text-xs font-bold uppercase tracking-widest ${locale === 'es' ? 'text-[#c5a059]' : 'text-white/40'}`}>ES</span>
                                <button
                                    onClick={toggleLocale}
                                    aria-label={locale === 'es' ? 'Cambiar idioma a inglés' : 'Switch language to Spanish'}
                                    className="w-12 h-6 rounded-full bg-white/10 relative border border-white/10 transition-colors hover:border-[#c5a059]/40"
                                >
                                    <div className={`absolute top-0.5 w-4 h-4 rounded-full shadow-sm transition-all ${locale === 'en' ? 'left-7 bg-white' : 'left-1 bg-[#c5a059]'}`} />
                                </button>
                                <span className={`text-xs font-bold uppercase tracking-widest ${locale === 'en' ? 'text-[#c5a059]' : 'text-white/40'}`}>EN</span>
                            </motion.div>

                            {/* Acciones */}
                            <motion.div variants={itemVariants} className="flex flex-col gap-3">
                                <Link
                                    href={loginUrl}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="px-8 py-3.5 border border-white/10 text-white rounded-full text-xs font-black uppercase tracking-widest bg-white/5 hover:bg-[#c5a059]/10 hover:border-[#c5a059] transition-all text-center"
                                >
                                    {t.nav_login}
                                </Link>
                                <Link
                                    href="/#planes"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="px-8 py-3.5 bg-[#c5a059] text-white rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-[#c5a059]/20 hover:bg-[#b38f4d] hover:shadow-xl transition-all text-center"
                                >
                                    {t.nav_cta}
                                </Link>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            )}
            </AnimatePresence>
        </header>
    );
};
