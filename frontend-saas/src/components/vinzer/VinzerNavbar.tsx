'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sun,
    Moon,
    Menu,
    X,
    ArrowRight,
    ChevronDown,
    ShieldCheck,
    Cpu,
    BookOpen
} from 'lucide-react';
import { VinzerLogo } from './VinzerLogo';

export interface VinzerNavbarProps {
    theme?: 'dark' | 'light';
    toggleTheme?: () => void;
    activeSection?: string;
    onNavigateSection?: (e: React.MouseEvent<any>, sectionId: string) => void;
}

export const SOLUTIONS_LINKS = [
    {
        title: 'Trazabilidad y Cadena de Custodia',
        href: '/guias/software-trazabilidad-cadena-custodia-crematorios-mascotas',
        badge: 'Transparencia',
        description: '¿Cómo garantizar cero errores y máxima transparencia a las familias?',
        icon: ShieldCheck,
        iconColor: 'text-[#19B5FE]',
        bgIcon: 'bg-[#19B5FE]/10 border-[#19B5FE]/20',
    },
    {
        title: 'Gestión Operativa y Cumplimiento',
        href: '/guias/sistema-gestion-operativa-automatizacion-crematorio-mascotas',
        badge: 'Eficiencia',
        description: 'Control de hornos, recepción veterinaria, logística y certificados.',
        icon: Cpu,
        iconColor: 'text-[#E7C15A]',
        bgIcon: 'bg-[#E7C15A]/10 border-[#E7C15A]/20',
    },
];

export function VinzerNavbar({
    theme: themeProp,
    toggleTheme: toggleThemeProp,
    activeSection,
    onNavigateSection
}: VinzerNavbarProps) {
    const [localTheme, setLocalTheme] = useState<'dark' | 'light'>(themeProp || 'dark');
    const theme = themeProp ?? localTheme;
    const toggleTheme = toggleThemeProp ?? (() => setLocalTheme((prev) => (prev === 'dark' ? 'light' : 'dark')));

    const pathname = usePathname();
    const router = useRouter();
    const isHomePage = pathname === '/' || pathname === '/vinzer';

    const [isScrolled, setIsScrolled] = useState(false);
    const [isSolutionsOpen, setIsSolutionsOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Scroll listener para efecto sticky compacto
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Cierre al hacer clic fuera del dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsSolutionsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLinkClick = (e: React.MouseEvent, href: string) => {
        setIsMobileMenuOpen(false);
        setIsSolutionsOpen(false);

        if (href.startsWith('#')) {
            if (isHomePage && onNavigateSection) {
                onNavigateSection(e, href);
            } else {
                // Navegar a la home con el hash
                e.preventDefault();
                router.push(`/${href}`);
            }
        }
    };

    const isLight = theme === 'light';

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-50 flex justify-center p-3 sm:p-5 transition-all duration-300 pointer-events-none">
                <nav
                    aria-label="Navegación principal de Vinzer"
                    className={`pointer-events-auto flex items-center justify-between gap-4 sm:gap-6 px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-full border backdrop-blur-xl transition-all duration-500 max-w-[1320px] w-full ${
                        isScrolled ? 'shadow-2xl' : 'shadow-lg'
                    } ${
                        isLight
                            ? isScrolled
                                ? 'bg-white/90 border-slate-200/90 shadow-slate-900/5'
                                : 'bg-white/80 border-slate-200/60 shadow-slate-900/5'
                            : isScrolled
                                ? 'bg-[#020210]/90 border-white/15 shadow-black/80'
                                : 'bg-[#020210]/75 border-white/10 shadow-black/40'
                    }`}
                >
                    {/* Logo Vinzer */}
                    <div className="flex items-center shrink-0">
                        <Link
                            href="/"
                            className="transition-transform duration-300 hover:scale-105 active:scale-95 flex items-center"
                            aria-label="Ir a la página de inicio de Vinzer"
                        >
                            <VinzerLogo size="sm" />
                        </Link>
                    </div>

                    {/* Links de navegación Desktop */}
                    <div className="hidden lg:flex items-center gap-7 xl:gap-9">
                        {/* Producto */}
                        <a
                            href="#producto"
                            onClick={(e) => handleLinkClick(e, '#producto')}
                            className={`relative text-[11px] font-bold tracking-widest uppercase transition-all duration-300 py-1 ${
                                activeSection === 'producto' && isHomePage
                                    ? isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'
                                    : isLight
                                        ? 'text-slate-600 hover:text-slate-900'
                                        : 'text-[#C0C0C0] hover:text-white'
                            }`}
                        >
                            Producto
                            {activeSection === 'producto' && isHomePage && (
                                <span className={`absolute bottom-0 inset-x-0 h-[2px] ${isLight ? 'bg-[#0284C7]' : 'bg-[#19B5FE]'}`} />
                            )}
                        </a>

                        {/* Trazabilidad */}
                        <a
                            href="#trazabilidad"
                            onClick={(e) => handleLinkClick(e, '#trazabilidad')}
                            className={`relative text-[11px] font-bold tracking-widest uppercase transition-all duration-300 py-1 ${
                                activeSection === 'trazabilidad' && isHomePage
                                    ? isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'
                                    : isLight
                                        ? 'text-slate-600 hover:text-slate-900'
                                        : 'text-[#C0C0C0] hover:text-white'
                            }`}
                        >
                            Trazabilidad
                            {activeSection === 'trazabilidad' && isHomePage && (
                                <span className={`absolute bottom-0 inset-x-0 h-[2px] ${isLight ? 'bg-[#0284C7]' : 'bg-[#19B5FE]'}`} />
                            )}
                        </a>

                        {/* Cómo funciona */}
                        <a
                            href="#como-funciona"
                            onClick={(e) => handleLinkClick(e, '#como-funciona')}
                            className={`relative text-[11px] font-bold tracking-widest uppercase transition-all duration-300 py-1 ${
                                activeSection === 'como-funciona' && isHomePage
                                    ? isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'
                                    : isLight
                                        ? 'text-slate-600 hover:text-slate-900'
                                        : 'text-[#C0C0C0] hover:text-white'
                            }`}
                        >
                            Cómo funciona
                            {activeSection === 'como-funciona' && isHomePage && (
                                <span className={`absolute bottom-0 inset-x-0 h-[2px] ${isLight ? 'bg-[#0284C7]' : 'bg-[#19B5FE]'}`} />
                            )}
                        </a>

                        {/* Planes */}
                        <a
                            href="#planes"
                            onClick={(e) => handleLinkClick(e, '#planes')}
                            className={`relative text-[11px] font-bold tracking-widest uppercase transition-all duration-300 py-1 ${
                                activeSection === 'planes' && isHomePage
                                    ? isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'
                                    : isLight
                                        ? 'text-slate-600 hover:text-slate-900'
                                        : 'text-[#C0C0C0] hover:text-white'
                            }`}
                        >
                            Planes
                            {activeSection === 'planes' && isHomePage && (
                                <span className={`absolute bottom-0 inset-x-0 h-[2px] ${isLight ? 'bg-[#0284C7]' : 'bg-[#19B5FE]'}`} />
                            )}
                        </a>

                        {/* FAQ */}
                        <a
                            href="#faqs"
                            onClick={(e) => handleLinkClick(e, '#faqs')}
                            className={`relative text-[11px] font-bold tracking-widest uppercase transition-all duration-300 py-1 ${
                                activeSection === 'faqs' && isHomePage
                                    ? isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'
                                    : isLight
                                        ? 'text-slate-600 hover:text-slate-900'
                                        : 'text-[#C0C0C0] hover:text-white'
                            }`}
                        >
                            FAQ
                            {activeSection === 'faqs' && isHomePage && (
                                <span className={`absolute bottom-0 inset-x-0 h-[2px] ${isLight ? 'bg-[#0284C7]' : 'bg-[#19B5FE]'}`} />
                            )}
                        </a>

                        {/* DROPDOWN GUÍAS (AL FINAL DEL MENÚ) */}
                        <div
                            ref={dropdownRef}
                            className="relative"
                            onMouseEnter={() => setIsSolutionsOpen(true)}
                            onMouseLeave={() => setIsSolutionsOpen(false)}
                        >
                            <button
                                type="button"
                                onClick={() => setIsSolutionsOpen((prev) => !prev)}
                                aria-expanded={isSolutionsOpen}
                                aria-haspopup="true"
                                className={`inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase transition-all duration-300 py-1 focus:outline-none ${
                                    pathname.includes('/guias/')
                                        ? isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'
                                        : isLight
                                            ? 'text-slate-600 hover:text-slate-900'
                                            : 'text-[#C0C0C0] hover:text-white'
                                }`}
                            >
                                <span>Guías</span>
                                <ChevronDown
                                    size={13}
                                    className={`transition-transform duration-300 ${
                                        isSolutionsOpen ? 'rotate-180 text-[#19B5FE]' : 'opacity-70'
                                    }`}
                                />
                            </button>

                            {/* Panel Desplegable Glassmorphism */}
                            <AnimatePresence>
                                {isSolutionsOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                        transition={{ duration: 0.2, ease: 'easeOut' }}
                                        className={`absolute top-full right-0 mt-2 w-[390px] p-2.5 rounded-2xl border backdrop-blur-2xl shadow-2xl z-50 ${
                                            isLight
                                                ? 'bg-white/95 border-slate-200/90 shadow-slate-900/15 text-slate-800'
                                                : 'bg-[#071120]/95 border-[#19B5FE]/25 shadow-black/80 text-white'
                                        }`}
                                    >
                                        <div className="px-3 py-2 mb-1 flex items-center border-b border-white/5">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-[#19B5FE] flex items-center gap-1.5">
                                                <BookOpen size={11} /> Guías y Conocimiento B2B
                                            </span>
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            {SOLUTIONS_LINKS.map((item) => {
                                                const Icon = item.icon;
                                                const isCurrent = pathname === item.href;
                                                return (
                                                    <Link
                                                        key={item.href}
                                                        href={item.href}
                                                        onClick={() => setIsSolutionsOpen(false)}
                                                        className={`group p-3 rounded-xl transition-all duration-200 flex items-start gap-3 border ${
                                                            isCurrent
                                                                ? isLight
                                                                    ? 'bg-sky-50 border-sky-200'
                                                                    : 'bg-white/10 border-[#19B5FE]/30'
                                                                : isLight
                                                                    ? 'border-transparent hover:bg-slate-100 hover:border-slate-200'
                                                                    : 'border-transparent hover:bg-white/5 hover:border-white/10'
                                                        }`}
                                                    >
                                                        <div className={`p-2 rounded-lg border shrink-0 mt-0.5 ${item.bgIcon}`}>
                                                            <Icon size={18} className={item.iconColor} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <h4 className={`text-xs font-bold transition-colors line-clamp-1 ${
                                                                    isLight
                                                                        ? 'text-slate-900 group-hover:text-[#0284C7]'
                                                                        : 'text-white group-hover:text-[#19B5FE]'
                                                                }`}>
                                                                    {item.title}
                                                                </h4>
                                                                <ArrowRight
                                                                    size={12}
                                                                    className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0 text-[#19B5FE] shrink-0"
                                                                />
                                                            </div>
                                                            <p className={`text-[11px] leading-snug mt-0.5 line-clamp-2 ${
                                                                isLight ? 'text-slate-500' : 'text-slate-400'
                                                            }`}>
                                                                {item.description}
                                                            </p>
                                                        </div>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Acciones Desktop: Switcher de tema & Botón Demo */}
                    <div className="hidden lg:flex items-center gap-3 shrink-0">
                        <button
                            onClick={toggleTheme}
                            className={`p-2 rounded-full border transition-all duration-300 flex items-center justify-center ${
                                isLight
                                    ? 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                            title={isLight ? 'Cambiar a modo Oscuro' : 'Cambiar a modo Claro'}
                            aria-label="Cambiar tema de color"
                        >
                            {isLight ? <Sun size={16} /> : <Moon size={16} />}
                        </button>

                        <a
                            href="#demo"
                            onClick={(e) => handleLinkClick(e, '#demo')}
                            className={`flex items-center justify-center gap-2 font-black text-xs tracking-wider uppercase px-5 py-2.5 rounded-full transition-all duration-300 shadow-md ${
                                isLight
                                    ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-sky-600/25 hover:shadow-sky-600/40 hover:scale-[1.03] active:scale-[0.98]'
                                    : 'bg-[#19B5FE] hover:bg-[#0e9ce0] text-[#020210] shadow-[#19B5FE]/25 hover:shadow-[#19B5FE]/40 hover:scale-[1.03] active:scale-[0.98]'
                            }`}
                        >
                            Solicitar demo
                            <ArrowRight size={14} className="shrink-0" />
                        </a>
                    </div>

                    {/* Botón Menú Móvil & Theme Toggle */}
                    <div className="flex lg:hidden items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className={`p-2 rounded-full border transition-all duration-300 flex items-center justify-center ${
                                isLight
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                                    : 'bg-white/5 border-white/10 text-cyan-400'
                            }`}
                            aria-label="Cambiar tema de color"
                        >
                            {isLight ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className={`p-2 transition-all duration-300 rounded-full border active:scale-90 ${
                                isLight
                                    ? 'text-slate-700 bg-slate-100 border-slate-200'
                                    : 'text-[#C0C0C0] hover:text-[#19B5FE] bg-white/5 border-white/10'
                            }`}
                            aria-label="Abrir menú de navegación"
                        >
                            <Menu size={18} />
                        </button>
                    </div>
                </nav>
            </header>

            {/* Menú Móvil (Drawer) */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className={`fixed inset-0 z-[100] flex flex-col p-6 overflow-y-auto ${
                            isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#020210] text-white'
                        }`}
                    >
                        {/* Header del menú móvil */}
                        <div className="flex items-center justify-between pb-6 border-b border-white/10">
                            <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
                                <VinzerLogo size="sm" />
                            </Link>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition-all"
                                aria-label="Cerrar menú"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Enlaces principales */}
                        <div className="flex-1 flex flex-col justify-between py-6">
                            <nav className="flex flex-col gap-4">
                                <a
                                    href="#producto"
                                    onClick={(e) => handleLinkClick(e, '#producto')}
                                    className="text-xl font-bold py-2 border-b border-white/5"
                                >
                                    Producto
                                </a>
                                <a
                                    href="#trazabilidad"
                                    onClick={(e) => handleLinkClick(e, '#trazabilidad')}
                                    className="text-xl font-bold py-2 border-b border-white/5"
                                >
                                    Trazabilidad
                                </a>

                                <a
                                    href="#como-funciona"
                                    onClick={(e) => handleLinkClick(e, '#como-funciona')}
                                    className="text-xl font-bold py-2 border-b border-white/5"
                                >
                                    Cómo funciona
                                </a>
                                <a
                                    href="#planes"
                                    onClick={(e) => handleLinkClick(e, '#planes')}
                                    className="text-xl font-bold py-2 border-b border-white/5"
                                >
                                    Planes
                                </a>
                                <a
                                    href="#faqs"
                                    onClick={(e) => handleLinkClick(e, '#faqs')}
                                    className="text-xl font-bold py-2 border-b border-white/5"
                                >
                                    FAQ
                                </a>

                                {/* Guías Móvil al final */}
                                <div className="py-2 border-b border-white/5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xl font-bold text-[#19B5FE]">Guías</span>
                                    </div>
                                    <div className="mt-3 flex flex-col gap-2 pl-2">
                                        {SOLUTIONS_LINKS.map((item) => {
                                            const Icon = item.icon;
                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                    className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3 active:scale-[0.98] transition-all"
                                                >
                                                    <Icon size={18} className={item.iconColor} />
                                                    <div className="flex-1">
                                                        <div className="text-sm font-bold leading-tight">{item.title}</div>
                                                        <div className="text-xs text-slate-400 mt-1 line-clamp-1">{item.description}</div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            </nav>

                            {/* Botón CTA Demo en móvil */}
                            <div className="pt-6">
                                <a
                                    href="#demo"
                                    onClick={(e) => handleLinkClick(e, '#demo')}
                                    className={`w-full py-3.5 px-6 rounded-xl font-bold text-center flex items-center justify-center gap-2 shadow-lg ${
                                        isLight
                                            ? 'bg-[#0284C7] text-white'
                                            : 'bg-[#19B5FE] text-[#020210]'
                                    }`}
                                >
                                    Solicitar demo
                                    <ArrowRight size={16} />
                                </a>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
