'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Menu, X, ChevronRight, Sun, Moon } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { getLandingContent, LANDING_SECTIONS } from '@/lib/memorialLanding';

export interface PublicHeaderProps {
    isDark?: boolean;
    onToggleTheme?: () => void;
    customBg?: string;
    transparent?: boolean;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({
    isDark = false,
    onToggleTheme,
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

    const lc = getLandingContent(locale);

    // Landing one-page: anclas a las secciones de la portada. Desde otras
    // páginas (/memorials, memorial, gestión) llevan a la portada en esa sección.
    const pathname = usePathname();
    const onLanding = pathname === '/' || pathname === '/public';
    const navItems = LANDING_SECTIONS.map(id => ({ id, href: onLanding ? `#${id}` : `/#${id}`, label: lc.nav[id] }));
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const isActive = (id: string) => onLanding && activeSection === id;

    // Resalta la sección visible al hacer scroll (solo en la portada)
    useEffect(() => {
        if (!onLanding) return;
        const sections = LANDING_SECTIONS
            .map(id => document.getElementById(id))
            .filter((el): el is HTMLElement => !!el);
        if (sections.length === 0) return;
        const observer = new IntersectionObserver(
            entries => {
                const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
                if (visible) setActiveSection(visible.target.id);
            },
            { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5] }
        );
        sections.forEach(s => observer.observe(s));
        return () => observer.disconnect();
    }, [onLanding]);

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
    const textMutedClass = effectiveIsDark ? 'text-slate-300' : 'text-slate-600';
    const dividerClass = effectiveIsDark ? 'bg-white/10' : 'bg-stone-200';
    return (
        <header
            className="fixed top-4 sm:top-5 inset-x-0 z-50 flex justify-center px-3 sm:px-6 bg-transparent transition-all duration-500"
            style={customBg && !transparent && !isMenuModalOpen ? { backgroundColor: customBg } : {}}
        >
            {/* Header Outer Pill */}
            <div className={`
                w-full max-w-7xl relative
                ${effectiveIsDark
                    ? 'bg-slate-950/80 border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.45)]'
                    : 'bg-white/85 border-stone-200/80 shadow-[0_10px_35px_rgba(15,23,42,0.06)]'}
                backdrop-blur-xl border rounded-full px-4 sm:px-6 lg:px-7 transition-all duration-500
                ${isScrolled ? 'py-1.5 border-[#c5a059]/30 shadow-[0_12px_38px_rgba(15,23,42,0.09)]' : 'py-2.5'}
            `}>
                {/* Subtle golden ambient top line on scroll */}
                <div className={`absolute top-0 inset-x-12 h-px bg-gradient-to-r from-transparent via-[#c5a059]/50 to-transparent transition-opacity duration-500 ${isScrolled ? 'opacity-100' : 'opacity-0'}`} />

                <div className="relative h-12 flex items-center justify-between gap-4 lg:gap-6">

                    {/* LOGO - Lado Izquierdo */}
                    <Link
                        href="/"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex shrink-0 items-center gap-2.5 pr-1 group transition-all duration-300 active:scale-95"
                    >
                        <img
                            src="/logo-vinzer.webp"
                            alt="Vinzer"
                            width={84}
                            height={41}
                            className="h-8 w-auto transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="flex flex-col leading-none">
                            <span className={`text-lg font-serif italic font-extrabold tracking-tight transition-colors duration-300 ${effectiveIsDark ? 'text-white group-hover:text-[#c5a059]' : 'text-slate-900 group-hover:text-[#a87f32]'}`}>
                                Vinzer
                            </span>
                            <span className="text-[7px] uppercase tracking-[0.24em] text-[#b58938] dark:text-[#c5a059] font-bold mt-0.5">
                                Memorial
                            </span>
                        </div>
                    </Link>

                    {/* Separador visual */}
                    <span className={`hidden xl:block h-5 w-px shrink-0 ${dividerClass}`} aria-hidden="true" />

                    {/* NAVEGACIÓN CENTRAL */}
                    <nav className="hidden xl:flex flex-1 min-w-0 items-center justify-center gap-1 2xl:gap-2 px-1">
                        {navItems.map((item) => {
                            const active = isActive(item.id);
                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    aria-current={active ? 'location' : undefined}
                                    className={`group relative px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.07em] whitespace-nowrap rounded-full transition-colors duration-200 z-10
                                        ${active
                                            ? (effectiveIsDark ? 'text-amber-300' : 'text-amber-800')
                                            : `${textMutedClass} ${effectiveIsDark ? 'hover:text-white hover:bg-white/5' : 'hover:text-slate-900 hover:bg-stone-100/80'}`}`}
                                >
                                    {active && (
                                        <motion.span
                                            layoutId="activeNavBackground"
                                            className={`absolute inset-0 rounded-full z-0 border ${
                                                effectiveIsDark
                                                    ? 'bg-amber-500/15 border-amber-400/25'
                                                    : 'bg-amber-500/10 border-amber-600/20'
                                            }`}
                                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                    <span className="relative z-10">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Separador visual */}
                    <span className={`hidden xl:block h-5 w-px shrink-0 ${dividerClass}`} aria-hidden="true" />

                    {/* Mobile Actions: Theme Toggle + Menu Button */}
                    <div className="xl:hidden flex items-center gap-2 shrink-0">
                        {onToggleTheme && (
                            <button
                                type="button"
                                onClick={onToggleTheme}
                                aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                                title={isDark ? 'Modo claro' : 'Modo oscuro'}
                                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 border cursor-pointer ${
                                    effectiveIsDark
                                        ? 'border-white/10 bg-white/5 text-amber-300 hover:bg-white/10'
                                        : 'border-stone-200 bg-stone-50 text-amber-700 hover:bg-stone-100'
                                }`}
                            >
                                {isDark ? <Sun size={16} /> : <Moon size={16} />}
                            </button>
                        )}
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            aria-label="Abrir menú"
                            aria-expanded={isMobileMenuOpen}
                            aria-controls="mobile-menu"
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${textMainClass} active:scale-90 border cursor-pointer ${effectiveIsDark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-stone-200 bg-stone-50 hover:bg-stone-100'}`}
                        >
                            <Menu size={19} className="text-[#c5a059]" />
                        </button>
                    </div>

                    {/* ACCIONES - Lado Derecho */}
                    <div className="hidden xl:flex shrink-0 items-center gap-2">
                        {onToggleTheme && (
                            <button
                                type="button"
                                onClick={onToggleTheme}
                                aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                                title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                                className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 cursor-pointer
                                ${effectiveIsDark
                                    ? 'border-white/10 bg-white/5 text-amber-300 hover:bg-white/10 hover:border-amber-400/40'
                                    : 'border-stone-200 bg-stone-50/80 text-amber-700 hover:bg-stone-100 hover:border-amber-600/35'}`}
                            >
                                {isDark ? <Sun size={15} /> : <Moon size={15} />}
                            </button>
                        )}

                        {/* Language Toggle Compacto */}
                        <button
                            onClick={toggleLocale}
                            aria-label={locale === 'es' ? 'Cambiar idioma a inglés' : 'Switch language to Spanish'}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer
                            ${effectiveIsDark
                                ? 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-[#c5a059]/40'
                                : 'border-stone-200 bg-stone-50/80 hover:bg-stone-100 hover:border-[#c5a059]/40'}`}
                        >
                            <Globe size={13} className="text-[#b58938] dark:text-[#c5a059]" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                <span className={locale === 'es' ? (effectiveIsDark ? 'text-amber-300' : 'text-amber-800') : 'text-slate-400'}>ES</span>
                                <span className="mx-1 text-slate-300 dark:text-slate-600">/</span>
                                <span className={locale === 'en' ? (effectiveIsDark ? 'text-amber-300' : 'text-amber-800') : 'text-slate-400'}>EN</span>
                            </span>
                        </button>

                        {/* Botón de Acceso */}
                        <Link
                            href={loginUrl}
                            className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.12em] border transition-all duration-200 whitespace-nowrap
                                ${effectiveIsDark
                                    ? 'border-white/15 text-white bg-white/5 hover:bg-white/10 hover:border-[#c5a059]'
                                    : 'border-stone-200 text-slate-700 bg-white hover:bg-stone-50 hover:text-slate-900 hover:border-[#c5a059]'}`}
                        >
                            {lc.nav_login}
                        </Link>

                        {/* Botón CTA */}
                        <Link
                            href="/crear"
                            className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.12em] transition-all duration-200 shadow-sm whitespace-nowrap
                            ${effectiveIsDark
                                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-amber-500/20'
                                : 'bg-slate-900 text-white hover:bg-[#b58938] hover:shadow-md'}`}
                        >
                            {lc.nav_cta}
                        </Link>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Sheet */}
            <AnimatePresence>
            {isMobileMenuOpen && (
                <div className="xl:hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-sm"
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
                        className={`fixed inset-x-0 bottom-0 z-[70] backdrop-blur-2xl border-t rounded-t-[2.5rem] px-6 pt-3 pb-10 shadow-[0_-8px_40px_rgba(0,0,0,0.3)] ${
                            isDark
                                ? 'bg-slate-950/95 border-white/10'
                                : 'bg-[#FAF8F4]/95 border-stone-200'
                        }`}
                    >
                        {/* Ambient glow */}
                        <div className="absolute -top-px left-1/2 -translate-x-1/2 w-48 h-32 rounded-full bg-[#c5a059]/15 blur-[80px] pointer-events-none" />

                        {/* Drag handle */}
                        <div className="flex justify-center pt-1 pb-5 relative z-10 cursor-grab active:cursor-grabbing">
                            <div className={`w-12 h-1.5 rounded-full ${isDark ? 'bg-white/20' : 'bg-stone-300'}`} />
                        </div>

                        <div className="relative z-10 flex flex-col">
                            {/* Marca */}
                            <motion.div variants={itemVariants} className="flex items-center justify-between mb-5">
                                <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3">
                                    <img src="/logo-vinzer.webp" alt="Vinzer" width={82} height={40} className="h-8 w-auto" />
                                    <div className="flex flex-col">
                                        <span className={`text-lg font-serif italic font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Vinzer</span>
                                        <span className="text-[7px] uppercase tracking-[0.26em] text-[#b58938] dark:text-[#c5a059] font-bold -mt-0.5">Memorial</span>
                                    </div>
                                </Link>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    aria-label="Cerrar menú"
                                    className={`p-2.5 rounded-full transition-all border ${
                                        isDark
                                            ? 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-[#c5a059] border-white/10'
                                            : 'bg-white text-slate-600 hover:bg-stone-100 hover:text-slate-900 border-stone-200'
                                    }`}
                                >
                                    <X size={18} />
                                </button>
                            </motion.div>

                            {/* Enlaces */}
                            <nav className="flex flex-col">
                                {navItems.map((item, index) => {
                                    const active = isActive(item.id);
                                    return (
                                        <motion.div key={item.id} variants={itemVariants}>
                                            <Link
                                                href={item.href}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                aria-current={active ? 'location' : undefined}
                                                className={`group flex items-center justify-between py-4 border-b transition-colors ${
                                                    isDark ? 'border-white/5' : 'border-stone-200/80'
                                                } ${
                                                    active
                                                        ? (isDark ? 'text-[#c5a059]' : 'text-amber-700')
                                                        : (isDark ? 'text-white/90 hover:text-[#c5a059]' : 'text-slate-800 hover:text-amber-700')
                                                }`}
                                            >
                                                <span className="flex items-baseline gap-3">
                                                    <span className="text-[10px] font-mono text-[#c5a059]/70">0{index + 1}</span>
                                                    <span className="text-xl font-serif">{item.label}</span>
                                                </span>
                                                <ChevronRight size={18} className={`${isDark ? 'text-white/30' : 'text-slate-400'} group-hover:text-[#c5a059] group-hover:translate-x-1 transition-all`} />
                                            </Link>
                                        </motion.div>
                                    );
                                })}
                            </nav>

                            {/* Idioma y Tema */}
                            <motion.div variants={itemVariants} className="flex items-center justify-center gap-6 py-6">
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-bold uppercase tracking-widest ${locale === 'es' ? 'text-[#b58938] dark:text-[#c5a059]' : 'text-slate-400'}`}>ES</span>
                                    <button
                                        onClick={toggleLocale}
                                        aria-label={locale === 'es' ? 'Cambiar idioma a inglés' : 'Switch language to Spanish'}
                                        className={`w-12 h-6 rounded-full relative border transition-colors ${
                                            isDark ? 'bg-white/10 border-white/10' : 'bg-stone-200 border-stone-300'
                                        }`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 rounded-full shadow-sm transition-all ${locale === 'en' ? 'left-7 bg-white' : 'left-1 bg-[#c5a059]'}`} />
                                    </button>
                                    <span className={`text-xs font-bold uppercase tracking-widest ${locale === 'en' ? 'text-[#b58938] dark:text-[#c5a059]' : 'text-slate-400'}`}>EN</span>
                                </div>

                                {onToggleTheme && (
                                    <button
                                        type="button"
                                        onClick={onToggleTheme}
                                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${
                                            isDark
                                                ? 'border-white/15 bg-white/5 text-amber-300'
                                                : 'border-stone-200 bg-white text-amber-800'
                                        }`}
                                    >
                                        {isDark ? <Sun size={14} /> : <Moon size={14} />}
                                        <span>{isDark ? 'Claro' : 'Oscuro'}</span>
                                    </button>
                                )}
                            </motion.div>

                            {/* Acciones */}
                            <motion.div variants={itemVariants} className="flex flex-col gap-3">
                                <Link
                                    href={loginUrl}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`px-8 py-3.5 border rounded-full text-xs font-black uppercase tracking-widest transition-all text-center ${
                                        isDark
                                            ? 'border-white/10 text-white bg-white/5 hover:bg-[#c5a059]/10 hover:border-[#c5a059]'
                                            : 'border-stone-300 text-slate-800 bg-white hover:border-[#c5a059]'
                                    }`}
                                >
                                    {lc.nav_login}
                                </Link>
                                <Link
                                    href="/crear"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`px-8 py-3.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg transition-all text-center ${
                                        isDark
                                            ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                                            : 'bg-slate-900 text-white hover:bg-[#b58938]'
                                    }`}
                                >
                                    {lc.nav_cta}
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
