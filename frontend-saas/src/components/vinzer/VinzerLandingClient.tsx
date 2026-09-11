'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck,
    Zap,
    Star,
    CheckCircle2,
    ArrowRight,
    X,
    Menu,
    Search,
    CreditCard,
    Sun,
    Moon,
    BarChart3,
    TrendingUp,
    Users,
    Monitor
} from 'lucide-react';

import { VinzerLogo } from './VinzerLogo';
import { VinzerJourney } from './VinzerJourney';
import { VinzerFeatures } from './VinzerFeatures';
import { VinzerPricing } from './VinzerPricing';
import { VinzerWebService } from './VinzerWebService';
import { VinzerFaqs } from './VinzerFaqs';
import { VinzerTracking } from './VinzerTracking';
import { VinzerDemoForm } from './VinzerDemoForm';
import { VinzerWhatsAppFloat } from './VinzerWhatsAppFloat';
import VinzerCarousel from './VinzerCarousel';
import ReCaptchaProvider from '@/components/captcha/ReCaptchaProvider';
import type { PublicPlan } from '@/lib/api/plans';

interface HeroConfig {
    mediaType?: 'image' | 'video';
    backgroundImage?: string;
    bgOpacity?: number;
    videoPosterUrl?: string;
}

interface VinzerLandingClientProps {
    initialConfig?: {
        hero?: HeroConfig;
        [key: string]: unknown;
    } | null;
    initialPlans?: PublicPlan[] | null;
}

const resolveMediaUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function VinzerLandingClient({ initialConfig = null, initialPlans = null }: VinzerLandingClientProps) {
    // Hero Background & Media Config
    const heroConfig = initialConfig?.hero || {};
    const heroBgUrl = heroConfig.backgroundImage || 'https://i.postimg.cc/mD9jZNX2/portada-1.webp';
    const isHeroVideo = heroConfig.mediaType === 'video' || /\.(mp4|webm|mov)(\?.*)?$/i.test(heroBgUrl);
    const heroOpacity = typeof heroConfig.bgOpacity === 'number' ? heroConfig.bgOpacity : 1;

    // Estado para el menú móvil
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Sección activa según el scroll, para resaltar el enlace del navbar
    const [activeSection, setActiveSection] = useState('inicio');
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        const savedTheme = localStorage.getItem('vinzer-landing-theme') as 'dark' | 'light';
        if (savedTheme) {
            setTheme(savedTheme);
        }
    }, []);

    const toggleTheme = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        localStorage.setItem('vinzer-landing-theme', nextTheme);
    };

    useEffect(() => {
        const handleScroll = () => {
            const sections = ['inicio', 'seguimiento', 'modulos', 'trazabilidad', 'sitio-web', 'precios', 'faqs'];
            const scrollPosition = window.scrollY + 250; // offset

            for (const section of sections) {
                const el = document.getElementById(section);
                if (el) {
                    const top = el.offsetTop;
                    const height = el.offsetHeight;
                    if (scrollPosition >= top && scrollPosition < top + height) {
                        setActiveSection(section);
                        break;
                    }
                }
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // run once initially
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleNavLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        e.preventDefault();
        const sectionId = href.replace('#', '');
        const element = document.getElementById(sectionId);
        if (element) {
            const offset = 90; // offset for floating menu
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = element.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
            // Update URL hash without scroll jump
            window.history.pushState(null, '', href);
        }
    };

    return (
        <div className={`min-h-screen transition-colors duration-500 font-sans antialiased overflow-x-hidden ${theme === 'light'
            ? 'bg-[#f8fafc] text-[#0F172A] selection:bg-[#0284C7]/20 selection:text-[#0F172A] [data-theme="light"]'
            : 'bg-[#020210] text-[#FFFFFF] selection:bg-[#19B5FE]/30 selection:text-[#FFFFFF]'
            }`}>
            {/* Luces de Fondo (Glows) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-screen pointer-events-none z-0 overflow-hidden">
                <div className={`absolute top-[-10%] left-[-10%] w-[500px] h-[500px] blur-[150px] rounded-full ${theme === 'light' ? 'bg-[#0284C7]/10' : 'bg-[#19B5FE]/10'
                    }`} />
                <div className={`absolute top-[20%] right-[-10%] w-[600px] h-[600px] blur-[170px] rounded-full ${theme === 'light' ? 'bg-[#D97706]/10' : 'bg-[#E0B84D]/5'
                    }`} />
            </div>

            {/* Header / Barra Superior Flotante Ovalada (15% más ancha: max-w-[1180px]) */}
            <header className="fixed top-4 inset-x-0 z-50 max-w-[1180px] mx-auto px-4 pointer-events-none">
                <nav className={`w-full rounded-full px-7 sm:px-10 py-2.5 sm:py-3 flex items-center justify-between border transition-all duration-300 pointer-events-auto ${theme === 'light'
                    ? 'bg-white/80 backdrop-blur-md border-slate-200/80 shadow-md shadow-slate-900/5'
                    : 'bg-[#020210]/80 backdrop-blur-md border-[#19B5FE]/20 shadow-lg shadow-black/40'
                    }`}>
                    {/* Lado Izquierdo: Logo */}
                    <div className="flex items-center shrink-0">
                        <Link href="/" className="transition-transform duration-300 hover:scale-103 active:scale-95">
                            <VinzerLogo size="sm" />
                        </Link>
                    </div>

                    {/* Links de navegación */}
                    <div className="hidden xl:flex items-center gap-7">
                        {[
                            { href: '#modulos', label: 'Módulos' },
                            { href: '#trazabilidad', label: 'Cómo Funciona' },
                            { href: '/tour', label: 'Tour App', isExternalRoute: true, hidden: true },
                            { href: '#sitio-web', label: 'Sitio Web' },
                            { href: '#precios', label: 'Precios' },
                            { href: '#faqs', label: 'FAQ' },
                            { href: '#seguimiento', label: 'Seguimiento' },
                        ].map((link) => {
                            if (link.isExternalRoute) {
                                return (
                                    <Link
                                        key={link.href + '-' + link.label}
                                        href={link.href}
                                        className={`${link.hidden ? 'hidden' : 'flex'} relative text-[11px] font-bold tracking-widest uppercase transition-all duration-300 focus:outline-none py-1 items-center gap-1.5 ${theme === 'light' ? 'text-cyan-600 hover:text-cyan-700' : 'text-cyan-400 hover:text-cyan-300'
                                            }`}
                                    >
                                        <span>{link.label}</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                    </Link>
                                );
                            }

                            const sectionId = link.href.replace('#', '');
                            const active = activeSection === sectionId;
                            return (
                                <motion.a
                                    key={link.href + '-' + link.label}
                                    href={link.href}
                                    onClick={(e) => handleNavLinkClick(e, link.href)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={`relative text-[11px] font-bold tracking-widest uppercase transition-all duration-300 focus:outline-none py-1
                                        ${active
                                            ? theme === 'light' ? 'text-[#0284C7]' : 'text-[#19B5FE]'
                                            : theme === 'light'
                                                ? 'text-slate-600 hover:text-slate-900'
                                                : 'text-[#C0C0C0] hover:text-[#FFFFFF]'
                                        }`}
                                >
                                    {link.label}
                                    {active && (
                                        <motion.div
                                            layoutId="integratedActiveIndicator"
                                            className={`absolute bottom-0 inset-x-0 h-[2px] ${theme === 'light' ? 'bg-[#0284C7] shadow-[0_0_8px_rgba(2,132,199,0.5)]' : 'bg-[#19B5FE] shadow-[0_0_8px_rgba(25,181,254,0.8)]'
                                                }`}
                                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                </motion.a>
                            );
                        })}
                    </div>

                    {/* Lado Derecho: Acciones Desktop */}
                    <div className="hidden xl:flex items-center gap-3 shrink-0">
                        {/* Switcher Tema Claro / Oscuro */}
                        <button
                            onClick={toggleTheme}
                            className={`p-2 rounded-full border transition-all duration-300 flex items-center justify-center ${theme === 'light'
                                ? 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                                }`}
                            title={theme === 'light' ? 'Cambiar a modo Oscuro' : 'Cambiar a modo Claro'}
                            aria-label="Toggle dark/light theme"
                        >
                            {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
                        </button>

                        <a
                            href="#demo"
                            onClick={(e) => handleNavLinkClick(e, '#demo')}
                            className={`flex items-center justify-center gap-2 font-bold text-xs tracking-wide px-5 py-2.5 rounded-full transition-all duration-300 ${theme === 'light'
                                ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-[0_4px_14px_rgba(2,132,199,0.2)] hover:shadow-[0_6px_20px_rgba(2,132,199,0.3)] hover:scale-[1.02] active:scale-[0.98]'
                                : 'bg-[#19B5FE] hover:bg-[#0e9ce0] text-[#020210] shadow-[0_4px_14px_rgba(25,181,254,0.25)] hover:shadow-[0_6px_20px_rgba(25,181,254,0.35)] hover:scale-[1.02] active:scale-[0.98]'
                                }`}
                        >
                            Solicitar Demo
                            <ArrowRight size={14} className="shrink-0" />
                        </a>
                    </div>

                    {/* Botón Menú Móvil & Theme Toggle */}
                    <div className="flex xl:hidden items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className={`p-2 rounded-full border transition-all duration-300 flex items-center justify-center ${theme === 'light'
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                                : 'bg-white/5 border-white/10 text-cyan-400'
                                }`}
                            aria-label="Toggle dark/light theme"
                        >
                            {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className={`p-2 transition-all duration-300 rounded-full border active:scale-90 ${theme === 'light'
                                ? 'text-slate-700 bg-slate-100 border-slate-200'
                                : 'text-[#C0C0C0] hover:text-[#19B5FE] bg-white/5 border-white/10'
                                }`}
                            aria-label="Open menu"
                        >
                            <Menu size={18} />
                        </button>
                    </div>
                </nav>
            </header>

            {/* Hero Section */}
            <section id="inicio" className="relative pt-28 pb-20 px-4 sm:px-6 z-10 overflow-hidden">
                {/* Background Media (Light & Dark modes) */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    {/* Media de fondo (siempre presente en modo claro y modo oscuro) */}
                    {isHeroVideo ? (
                        <video
                            src={resolveMediaUrl(heroBgUrl)}
                            poster={heroConfig.videoPosterUrl ? resolveMediaUrl(heroConfig.videoPosterUrl) : undefined}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover object-center"
                            style={{ opacity: heroOpacity }}
                            aria-hidden="true"
                        />
                    ) : (
                        <img
                            src={resolveMediaUrl(heroBgUrl)}
                            alt="Hero Background"
                            className="w-full h-full object-cover object-center"
                            style={{ opacity: heroOpacity }}
                            aria-hidden="true"
                        />
                    )}


                </div>

                <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    {/* Contenido de Hero: texto fluido y libre, sin cajas rígidas */}
                    <div className="lg:col-span-7 max-w-3xl space-y-8 text-center lg:text-left">
                        {/* Tag Badge */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-xs transition-all bg-[#19B5FE]/10 border-[#19B5FE]/30 text-[#19B5FE]">
                            <Zap size={14} className="text-[#19B5FE]" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Software integral para la industria funeraria de mascotas</span>
                        </div>

                        {/* Título Principal H1 (SEO) */}
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[62px] font-black tracking-tight leading-[1.08] text-white">
                            Software de control operativo y <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-sky-500 drop-shadow-[0_0_24px_rgba(56,189,248,0.3)]">trazabilidad total</span> para tu crematorio de mascotas.
                        </h1>

                        {/* Subtítulo descriptivo */}
                        <p className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed text-slate-200">
                            Automatiza el registro de servicios, el flujo de trabajo de planta, la emisión de certificados y el seguimiento público para las familias, en un solo sistema en la nube.
                        </p>

                        {/* Botones de acción */}
                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                            <a
                                href="#demo"
                                onClick={(e) => handleNavLinkClick(e, '#demo')}
                                className="group w-full sm:w-auto text-center px-8 py-4 rounded-xl font-bold uppercase tracking-wider text-xs hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3 bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-lg shadow-sky-600/30"
                                id="hero-primary-cta"
                            >
                                <span className="font-extrabold">Agendar demostración gratis</span>
                                <ArrowRight size={16} className="shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
                            </a>

                            <a
                                href="#precios"
                                onClick={(e) => handleNavLinkClick(e, '#precios')}
                                className="group w-full sm:w-auto text-center border border-white/20 bg-white/10 backdrop-blur-md text-white hover:bg-white/20 px-8 py-4 rounded-xl font-bold uppercase tracking-wider text-xs hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3 shadow-xs"
                                id="hero-secondary-cta"
                            >
                                <CreditCard size={16} className="shrink-0" />
                                <span className="font-extrabold">Ver planes y precios</span>
                            </a>
                        </div>

                        {/* Fila de Micro-Confianza / Risk Reversal B2B */}
                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2.5 pt-2 text-xs text-slate-300">
                            <span className="inline-flex items-center gap-1.5 font-semibold">
                                <CheckCircle2 size={15} className="shrink-0 text-cyan-400" />
                                Implementación guiada en 48 hrs
                            </span>
                            <span className="inline-flex items-center gap-1.5 font-semibold">
                                <CheckCircle2 size={15} className="shrink-0 text-cyan-400" />
                                Sin tarjeta ni contratos forzosos
                            </span>
                            <span className="inline-flex items-center gap-1.5 font-semibold">
                                <CheckCircle2 size={15} className="shrink-0 text-cyan-400" />
                                Datos 100% seguros y respaldados
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Buscador público: sección propia, enlazable como #seguimiento */}
            <VinzerTracking theme={theme} />

            {/* 4 pilares operativos + comparativa tradicional vs Vinzer */}
            <VinzerFeatures theme={theme} />

            {/* Cómo funciona: 3 pasos */}
            <VinzerJourney theme={theme} />

            {/* Carrusel Dinámico de Fotos / Software (Opcional según Admin) */}
            <VinzerCarousel config={(initialConfig as any)?.carousel} theme={theme} />

            {/* El sitio web va ANTES de precios para que el visitante llegue
                cargado a la tarjeta ULTRA */}
            <VinzerWebService theme={theme} />

            <VinzerPricing theme={theme} initialPlans={initialPlans} />

            <VinzerFaqs theme={theme} />

            {/* CTA Final: captura del lead en 3 campos */}
            <section id="demo" className="py-28 px-6 relative overflow-hidden z-10 max-w-7xl mx-auto">
                <div className={`relative border rounded-[3rem] p-8 md:p-14 overflow-hidden transition-all duration-500 ${theme === 'light'
                    ? 'bg-white border-slate-200 shadow-2xl shadow-slate-200/60'
                    : 'bg-gradient-to-tr from-[#0b0a24] to-[#020210] border-white/10 shadow-2xl'
                    }`}>
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#19B5FE]/5 to-[#E0B84D]/5 pointer-events-none -z-10" />
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] blur-[120px] rounded-full pointer-events-none -z-10 ${theme === 'light' ? 'bg-[#0284C7]/10' : 'bg-[#19B5FE]/5'
                        }`} />

                    <div className="max-w-3xl mx-auto space-y-5 text-center mb-10">
                        <h2 className={`text-3xl md:text-5xl font-black leading-tight ${theme === 'light' ? 'text-slate-900' : 'text-[#FFFFFF]'
                            }`}>
                            Lleva la trazabilidad de tu crematorio al estándar que tus clientes esperan.
                        </h2>
                        <p className={`text-base font-medium ${theme === 'light' ? 'text-slate-600' : 'text-[#C0C0C0]'
                            }`}>
                            Déjanos tres datos y coordinamos una demostración guiada de la plataforma.
                        </p>
                    </div>

                    <div className="max-w-3xl mx-auto">
                        <ReCaptchaProvider>
                            <VinzerDemoForm theme={theme} />
                        </ReCaptchaProvider>
                    </div>

                    <div className={`max-w-3xl mx-auto mt-8 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${theme === 'light' ? 'border-slate-100' : 'border-white/5'
                        }`}>
                        <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                            ¿Prefieres escribirnos directo?
                        </p>
                        <a
                            href="https://wa.me/56982395940?text=Hola%2C%20quiero%20coordinar%20una%20demo%20de%20Vinzer"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#25D366]/90 text-[#020210] px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-lg shadow-[#25D366]/20 hover:scale-[1.02] active:scale-[0.98]"
                            id="cta-final-btn"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            Coordinar por WhatsApp
                        </a>
                    </div>
                </div>
            </section>

            {/* Footer Semántico */}
            <footer className={`border-t py-16 px-6 relative z-10 transition-colors duration-500 ${theme === 'light'
                ? 'bg-white border-slate-200'
                : 'bg-[#020210] border-white/5'
                }`}>
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 mb-12">
                    {/* Izquierda: Info de Marca */}
                    <div className="md:col-span-5 space-y-6">
                        <VinzerLogo size="md" />
                        <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                            Vinzer es un producto de software especializado para el sector funerario de mascotas. Nuestro compromiso es aportar tranquilidad a las familias a través del control y la trazabilidad digital.
                        </p>
                    </div>

                    {/* Derecha: Columnas de Enlaces */}
                    <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
                        <div className="space-y-4">
                            <h5 className={`text-[10px] font-black uppercase tracking-wider ${theme === 'light' ? 'text-amber-700' : 'text-[#E0B84D]'
                                }`}>Software</h5>
                            <ul className={`space-y-2 text-xs ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                                }`}>
                                <li className="hidden"><Link href="/tour" className="text-cyan-400 font-semibold hover:underline flex items-center gap-1.5">Tour de la App (Capturas) <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">Nuevo</span></Link></li>
                                <li><a href="#trazabilidad" className="hover:text-[#0284C7] transition-colors">Cómo Funciona</a></li>
                                <li><a href="#modulos" className="hover:text-[#0284C7] transition-colors">Módulos del Sistema</a></li>
                                <li><a href="#seguimiento" className="hover:text-[#0284C7] transition-colors">Estado del Servicio</a></li>
                                <li><a href="#precios" className="hover:text-[#0284C7] transition-colors">Planes de Precios</a></li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h5 className={`text-[10px] font-black uppercase tracking-wider ${theme === 'light' ? 'text-amber-700' : 'text-[#E0B84D]'
                                }`}>Recursos</h5>
                            <ul className={`space-y-2 text-xs ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                                }`}>
                                <li><a href="#faqs" className="hover:text-[#0284C7] transition-colors">Preguntas Frecuentes</a></li>
                                <li><Link href="/manual" className="hover:text-[#0284C7] transition-colors">Guías Operativas</Link></li>
                                <li><a href="#trazabilidad" className="hover:text-[#0284C7] transition-colors">Trazabilidad en Vivo</a></li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h5 className={`text-[10px] font-black uppercase tracking-wider ${theme === 'light' ? 'text-amber-700' : 'text-[#E0B84D]'
                                }`}>Legal</h5>
                            <ul className={`space-y-2 text-xs ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                                }`}>
                                <li><Link href="/privacidad" className="hover:text-[#0284C7] transition-colors">Privacidad</Link></li>
                                <li><Link href="/terminos" className="hover:text-[#0284C7] transition-colors">Términos del Servicio</Link></li>
                                <li><Link href="/cookies" className="hover:text-[#0284C7] transition-colors">Política de Cookies</Link></li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Línea Inferior de Derechos */}
                <div className={`max-w-7xl mx-auto pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium ${theme === 'light'
                    ? 'border-slate-100 text-slate-500'
                    : 'border-white/5 text-slate-600'
                    }`}>
                    <p>© 2026 Vinzer SaaS. Todos los derechos reservados.</p>
                    <div className="flex gap-4">
                        <span className="hover:text-[#0284C7] cursor-pointer">LinkedIn</span>
                        <span className="hover:text-[#0284C7] cursor-pointer">Instagram</span>
                        <span className="hover:text-[#0284C7] cursor-pointer">Soporte</span>
                    </div>
                </div>
            </footer>

            {/* Mobile Menu Overlay - Renderizado fuera del Header para evitar Stacking Context Bugs */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="fixed inset-0 z-[100] bg-slate-950/96 backdrop-blur-2xl flex flex-col p-6 xl:hidden overflow-y-auto"
                    >
                        {/* Ambient Glows */}
                        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-[#19B5FE]/10 blur-[100px] pointer-events-none" />
                        <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-indigo-600/5 blur-[80px] pointer-events-none" />

                        {/* Header menu móvil */}
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3">
                                <VinzerLogo size="sm" />
                            </Link>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                aria-label="Close menu"
                                className="p-3 rounded-full bg-white/5 text-[#FFFFFF] hover:bg-white/10 hover:text-[#19B5FE] transition-all border border-white/10"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Contenedor del menú */}
                        <div className="flex-1 flex flex-col justify-between py-4 relative z-10">
                            {/* Quote decorativo de marca */}
                            <div className="mb-6 p-5 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
                                <span className="text-[9px] uppercase tracking-widest text-[#19B5FE] font-black block mb-1">Propósito</span>
                                <p className="text-xs font-medium text-[#C0C0C0] leading-relaxed">
                                    "Acompañamos con el mismo amor con que ellos cuidaron."
                                </p>
                            </div>

                            <nav className="flex flex-col gap-6 items-center text-center w-full max-w-xs mx-auto">
                                {/* Secciones de Navegación */}
                                {[
                                    { href: '#seguimiento', label: 'Estado del Servicio' },
                                    { href: '#modulos', label: 'Módulos' },
                                    { href: '#trazabilidad', label: 'Cómo Funciona' },
                                    { href: '/tour', label: 'Tour App (Capturas)', isExternalRoute: true, hidden: true },
                                    { href: '#sitio-web', label: 'Sitio Web' },
                                    { href: '#precios', label: 'Precios' },
                                    { href: '#faqs', label: 'FAQ' },
                                ].map((link, index) => {
                                    if (link.isExternalRoute) {
                                        return (
                                            <div key={link.href} className={`w-full ${link.hidden ? 'hidden' : ''}`}>
                                                <Link
                                                    href={link.href}
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                    className="group block py-2 relative cursor-pointer select-none"
                                                >
                                                    <span className="text-xs font-mono mr-2 text-cyan-400">
                                                        0{index + 1}.
                                                    </span>
                                                    <span className="text-2xl font-sans tracking-wide font-bold text-cyan-400 group-hover:text-cyan-300">
                                                        {link.label}
                                                    </span>
                                                </Link>
                                            </div>
                                        );
                                    }

                                    const sectionId = link.href.replace('#', '');
                                    const active = activeSection === sectionId;

                                    return (
                                        <div key={link.href} className="w-full">
                                            <motion.a
                                                href={link.href}
                                                onClick={(e) => {
                                                    setIsMobileMenuOpen(false);
                                                    handleNavLinkClick(e, link.href);
                                                }}
                                                whileHover={{ scale: 1.03 }}
                                                whileTap={{ scale: 0.97 }}
                                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                                className="group block py-2 relative cursor-pointer select-none"
                                            >
                                                {/* Número de sección (Ej. 01.) */}
                                                <span className={`text-xs font-mono mr-2 transition-colors duration-300 ${active ? 'text-[#19B5FE]' : 'text-[#19B5FE]/40 group-hover:text-[#19B5FE]/75'
                                                    }`}>
                                                    0{index + 1}.
                                                </span>

                                                {/* Texto del enlace */}
                                                <span className={`text-2xl font-sans tracking-wide font-bold transition-colors duration-300 ${active ? 'text-[#19B5FE]' : 'text-white/80 group-hover:text-white'
                                                    }`}>
                                                    {link.label}
                                                </span>

                                                {/* Indicador Activo Animado con Deslizamiento Fluido */}
                                                {active && (
                                                    <motion.span
                                                        layoutId="activeMobileIndicator"
                                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-[2.5px] bg-[#19B5FE] rounded-full shadow-[0_0_10px_rgba(25,181,254,0.9)]"
                                                    />
                                                )}
                                            </motion.a>
                                        </div>
                                    );
                                })}

                                {/* Divisor estético con gradiente desvanecido */}
                                <div className="h-[1px] w-28 bg-gradient-to-r from-transparent via-white/15 to-transparent my-4" />

                                {/* Botones de Acción */}
                                <div className="flex flex-col gap-3.5 w-full mt-2">
                                    {/* Contáctanos - Diseño Premium Interactivo */}
                                    <motion.a
                                        href="https://wa.me/56982395940?text=Hola%2C%20quiero%20obtener%20una%20cuenta%20GRATIS%20en%20Vinzer"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="group relative w-full py-4 px-8 rounded-full overflow-hidden flex items-center justify-center border border-[#25d366]/30 bg-[#25d366]/5 text-[#25d366] hover:text-[#020210] font-black uppercase tracking-widest text-xs transition-colors duration-300 shadow-[0_0_15px_rgba(37,211,102,0.03)] hover:shadow-[0_0_25px_rgba(37,211,102,0.2)]"
                                    >
                                        {/* Fondo deslizante (Efecto Slide-Fill) */}
                                        <span className="absolute inset-0 w-full h-full bg-[#25d366] transform scale-x-0 origin-left transition-transform duration-300 ease-out group-hover:scale-x-100 z-0" />

                                        {/* Contenido superior (Icono y Texto) */}
                                        <span className="relative z-10 flex items-center justify-center gap-2.5">
                                            {/* Nuevo Ícono: Avión de papel / Enviar mensaje */}
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={2}
                                                stroke="currentColor"
                                                className="w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379L10.3 21.18c-.305.21-.69-.114-.51-.448l1.41-2.61a48.59 48.59 0 01-6.19-2.006c-1.584-.233-2.707-1.626-2.707-3.228V6.741c0-1.602 1.123-2.995 2.707-3.228A48.394 48.394 0 0112 3c2.78 0 5.44.347 8.003 1.013 1.584.233 2.707 1.626 2.707 3.228v4.032c0 1.602-1.123 2.995-2.707 3.228a48.394 48.394 0 01-1.343.185"
                                                />
                                            </svg>
                                            <span>Contáctanos</span>
                                        </span>
                                    </motion.a>
                                </div>
                            </nav>

                            {/* Footer */}
                            <div className="text-center text-[9px] text-[#FFFFFF]/30 tracking-wider uppercase font-semibold mt-10">
                                &copy; {new Date().getFullYear()} Vinzer. Todos los derechos reservados.
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <VinzerWhatsAppFloat
                phone={(initialConfig as any)?.whatsapp?.phone}
                message={(initialConfig as any)?.whatsapp?.message}
                show={(initialConfig as any)?.whatsapp?.show}
            />
        </div>
    );
}
