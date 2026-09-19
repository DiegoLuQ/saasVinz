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
import { VinzerMemorialCard } from './VinzerMemorialCard';
import { VinzerMemorialBanner } from './VinzerMemorialBanner';
import { VinzerNavbar } from './VinzerNavbar';
import { VinzerFooter } from './VinzerFooter';
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
    const heroConfig = initialConfig?.hero || {};
    const heroBgUrl = heroConfig.backgroundImage || 'https://i.postimg.cc/mD9jZNX2/portada-1.webp';
    const isHeroVideo = heroConfig.mediaType === 'video' || /\.(mp4|webm|mov)(\?.*)?$/i.test(heroBgUrl);
    const heroOpacity = typeof heroConfig.bgOpacity === 'number' ? heroConfig.bgOpacity : 1;
    // Estado de carga para transición suave del media del Hero
    const [isMediaLoaded, setIsMediaLoaded] = useState(false);

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
            const sections = ['inicio', 'producto', 'trazabilidad', 'como-funciona', 'planes', 'faqs'];
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
            {/* Luces de Fondo (Glows solo en dark mode) */}
            {theme === 'dark' && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-screen pointer-events-none z-0 overflow-hidden">
                    <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] blur-[150px] rounded-full bg-[#19B5FE]/10" />
                    <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] blur-[170px] rounded-full bg-[#E0B84D]/5" />
                </div>
            )}

            {/* Header / Barra Superior Flotante con Dropdown Soluciones */}
            <VinzerNavbar
                theme={theme}
                toggleTheme={toggleTheme}
                activeSection={activeSection}
                onNavigateSection={handleNavLinkClick}
            />

            {/* Hero Section */}
            <section id="inicio" className="relative pt-28 pb-20 px-4 sm:px-6 z-10 overflow-hidden">
                {/* Background Media (Light & Dark modes) con transición suave */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-[#020210]">
                    {isHeroVideo ? (
                        <video
                            src={resolveMediaUrl(heroBgUrl)}
                            poster={heroConfig.videoPosterUrl ? resolveMediaUrl(heroConfig.videoPosterUrl) : undefined}
                            autoPlay
                            loop
                            muted
                            playsInline
                            onLoadedData={() => setIsMediaLoaded(true)}
                            className={`w-full h-full object-cover object-center transition-all duration-1000 ease-out ${isMediaLoaded ? 'scale-100 blur-0' : 'scale-105 blur-sm'
                                }`}
                            style={{
                                opacity: isMediaLoaded ? (theme === 'light' ? 0.7 : heroOpacity) : 0,
                                transition: 'opacity 1000ms ease-out, filter 1000ms ease-out, transform 1000ms ease-out'
                            }}
                            aria-hidden="true"
                        />
                    ) : (
                        <picture className="w-full h-full block">
                            <source media="(max-width: 1023px)" srcSet="/images/logomodolight.webp" />
                            <source media="(min-width: 1024px)" srcSet={resolveMediaUrl(heroBgUrl)} />
                            <img
                                ref={(imgNode) => {
                                    if (imgNode && imgNode.complete && !isMediaLoaded) {
                                        setIsMediaLoaded(true);
                                    }
                                }}
                                src={resolveMediaUrl(heroBgUrl)}
                                alt="Hero Background"
                                onLoad={() => setIsMediaLoaded(true)}
                                className={`w-full h-full object-cover object-center ${isMediaLoaded ? 'scale-100 blur-0' : 'scale-105 blur-sm'
                                    }`}
                                style={{
                                    opacity: isMediaLoaded ? (theme === 'light' ? 0.7 : heroOpacity) : 0,
                                    transition: 'opacity 1000ms ease-out, filter 1000ms ease-out, transform 1000ms ease-out'
                                }}
                                aria-hidden="true"
                            />
                        </picture>
                    )}

                    {/* Overlay de contraste: fondo opaco para hacer resaltar las letras blancas en Light Mode */}
                    <div
                        className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${theme === 'light'
                            ? 'bg-slate-950/50'
                            : 'bg-gradient-to-t from-[#020210] via-transparent to-black/30'
                            }`}
                    />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    {/* Contenido de Hero: texto fluido y libre, sin cajas rígidas */}
                    <div className="lg:col-span-7 max-w-3xl space-y-8 text-center lg:text-left">
                        {/* Tag Badge */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-xs transition-all bg-[#19B5FE]/10 border-[#19B5FE]/30 text-[#19B5FE]">
                            <Zap size={14} className="text-[#19B5FE]" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Cuando el vínculo importa, todo cambia</span>
                        </div>

                        {/* Título Principal H1 (SEO) */}
                        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[83px] font-black tracking-tight leading-[1.04] text-white">
                            Software para <span className="text-[#19b5fe] drop-shadow-[0_0_35px_rgba(25,181,254,0.45)]">crematorios</span> de mascotas
                        </h1>

                        {/* Subtítulo descriptivo */}
                        <p className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed text-slate-200">
                            Trazabilidad digital inmutable, registro fotográfico por etapas, emisión de certificados y seguimiento transparente en tiempo real para las familias.
                        </p>

                        {/* Botones de acción */}
                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                            <a
                                href="#demo"
                                onClick={(e) => handleNavLinkClick(e, '#demo')}
                                className="group w-full sm:w-auto text-center px-8 py-4 rounded-xl font-bold uppercase tracking-wider text-xs hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3 bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-lg shadow-sky-600/30"
                                id="hero-primary-cta"
                            >
                                <span className="font-extrabold">Solicitar demostración</span>
                                <ArrowRight size={16} className="shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
                            </a>

                            <a
                                href="#planes"
                                onClick={(e) => handleNavLinkClick(e, '#planes')}
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

            {/* 4 pilares operativos + comparativa tradicional vs Vinzer */}
            <VinzerFeatures theme={theme} />

            {/* Buscador público: sección propia, enlazable como #seguimiento */}
            <VinzerTracking theme={theme} />

            {/* Cómo funciona: 3 pasos */}
            <VinzerJourney theme={theme} />

            {/* Carrusel Dinámico de Fotos / Software (Opcional según Admin) */}
            <VinzerCarousel config={(initialConfig as any)?.carousel} theme={theme} />

            {/* El sitio web va ANTES de precios para que el visitante llegue
                cargado a la tarjeta ULTRA */}
            <VinzerWebService theme={theme} />

            <VinzerPricing theme={theme} initialPlans={initialPlans} />

            <VinzerFaqs theme={theme} />

            {/* CTA Final: captura del lead en 2 columnas con tarjeta interactiva Portal del Recuerdo */}
            <section id="demo" className="py-24 px-4 sm:px-6 relative overflow-hidden z-10 max-w-7xl mx-auto">
                <div className={`relative border rounded-[3rem] p-6 sm:p-10 lg:p-12 xl:p-14 overflow-hidden transition-all duration-500 ${theme === 'light'
                    ? 'bg-white border-slate-200 shadow-2xl shadow-slate-200/60'
                    : 'bg-gradient-to-tr from-[#0b0a24] to-[#020210] border-white/10 shadow-2xl'
                    }`}>
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#19B5FE]/5 to-[#E0B84D]/5 pointer-events-none -z-10" />
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] blur-[140px] rounded-full pointer-events-none -z-10 ${theme === 'light' ? 'bg-[#0284C7]/10' : 'bg-[#19B5FE]/8'
                        }`} />

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                        {/* Columna Izquierda: Mensaje de valor + Formulario */}
                        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                            <div className="space-y-4">
                                <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-xs transition-all ${
                                    theme === 'light'
                                        ? 'bg-sky-500/10 border-sky-500/30 text-sky-700'
                                        : 'bg-[#19B5FE]/10 border-[#19B5FE]/30 text-[#19B5FE]'
                                }`}>
                                    <Zap size={14} className={theme === 'light' ? 'text-sky-600' : 'text-[#19B5FE]'} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                        Demostración guiada sin costo
                                    </span>
                                </div>

                                <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight ${
                                    theme === 'light' ? 'text-slate-900' : 'text-[#FFFFFF]'
                                }`}>
                                    Lleva la trazabilidad de tu crematorio al <span className="text-[#19b5fe] drop-shadow-[0_0_35px_rgba(25,181,254,0.45)]">estándar que tus clientes esperan.</span>
                                </h2>
                                <p className={`text-base sm:text-lg font-normal leading-relaxed ${
                                    theme === 'light' ? 'text-slate-600' : 'text-[#C0C0C0]'
                                }`}>
                                    Déjanos tres datos y coordinamos una demostración guiada de la plataforma. Conoce en vivo la experiencia que tendrán las familias y tu equipo.
                                </p>
                            </div>

                            {/* Formulario */}
                            <div className="w-full pt-1">
                                <ReCaptchaProvider>
                                    <VinzerDemoForm theme={theme} />
                                </ReCaptchaProvider>
                            </div>

                            {/* Canal alternativo WhatsApp */}
                            <div className={`pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${
                                theme === 'light' ? 'border-slate-100' : 'border-white/5'
                            }`}>
                                <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                                    ¿Prefieres escribirnos directamente ahora?
                                </p>
                                <a
                                    href="https://wa.me/56982395940?text=Hola%2C%20quiero%20coordinar%20una%20demo%20de%20Vinzer"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-full font-bold text-xs transition-all ${
                                        theme === 'light'
                                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 shadow-xs'
                                            : 'bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                                    } hover:scale-[1.02] active:scale-[0.98]`}
                                    id="cta-final-btn"
                                >
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-emerald-400" aria-hidden="true">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                    <span>Coordinar por WhatsApp</span>
                                </a>
                            </div>
                        </div>

                        {/* Columna Derecha: Tarjeta Portal del Recuerdo interactiva */}
                        <div className="lg:col-span-5 flex justify-center items-center">
                            <VinzerMemorialCard />
                        </div>
                    </div>
                </div>
            </section>

            {/* Banner Memorial Celestial previo al Footer */}
            <VinzerMemorialBanner theme={theme} />

            {/* Footer Semántico */}
            <VinzerFooter theme={theme} />

            <VinzerWhatsAppFloat
                phone={(initialConfig as any)?.whatsapp?.phone}
                message={(initialConfig as any)?.whatsapp?.message}
                show={(initialConfig as any)?.whatsapp?.show}
            />
        </div>
    );
}
