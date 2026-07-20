'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import {
    ChevronRight,
    ShieldCheck,
    Zap,
    Heart,
    Star,
    CheckCircle2,
    Sparkles,
    ArrowRight,
    X,
    Eye,
    Menu,
    Layers,
    CreditCard,
    HelpCircle,
    LogIn,
    MessageSquare
} from 'lucide-react';

import { VinzerLogo } from './VinzerLogo';
import { VinzerJourney } from './VinzerJourney';
import { VinzerFeatures } from './VinzerFeatures';
import { VinzerPricing } from './VinzerPricing';
import { VinzerWebService } from './VinzerWebService';
import { VinzerFaqs } from './VinzerFaqs';
import TrackingSearch from '@/components/public/TrackingSearch';

export default function VinzerLandingClient(props: any) {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    // Estado para el modal de video
    const [isVideoOpen, setIsVideoOpen] = useState(false);

    // Estado para el menú móvil
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Estado para la sección activa en scroll y loginUrl
    const [activeSection, setActiveSection] = useState('trazabilidad');
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

        const handleScroll = () => {
            const sections = ['inicio', 'trazabilidad', 'vision', 'modulos', 'precios', 'faqs', 'sitio-web'];
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
        <div className="min-h-screen bg-[#020210] text-[#FFFFFF] selection:bg-[#19B5FE]/30 selection:text-[#FFFFFF] font-sans antialiased overflow-x-hidden">
            {/* Luces de Fondo (Glows) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-screen pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#19B5FE]/10 blur-[150px] rounded-full" />
                <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-[#E0B84D]/5 blur-[170px] rounded-full" />
                <div className="absolute top-[60%] left-[20%] w-[500px] h-[500px] bg-indigo-600/5 blur-[160px] rounded-full" />
            </div>

            {/* Header / Barra Superior Clásica Integrada (Ancho Completo) */}
            <header className="fixed top-0 inset-x-0 z-50 w-full bg-[#020210]/90 backdrop-blur-md border-b border-[#19B5FE]/20 flex items-center transition-all duration-300 h-16 md:h-20 px-6">
                <div className="w-full max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
                    {/* Lado Izquierdo: Logo */}
                    <div className="flex items-center shrink-0">
                        <Link href="/" className="transition-transform duration-300 hover:scale-103 active:scale-95">
                            <VinzerLogo size="sm" />
                        </Link>
                    </div>

                    {/* xl: los 7 items + CTA necesitan ~1100px; entre md y xl el nav
                        desktop se rompía (items en dos líneas chocando con el CTA) */}
                    <nav className="hidden xl:flex items-center gap-8">
                        {[
                            { href: '#inicio', label: 'Inicio' },
                            { href: '#vision', label: 'Visión' },
                            { href: '#trazabilidad', label: 'Trazabilidad' },
                            { href: '#modulos', label: 'Módulos' },
                            { href: '#precios', label: 'Precios' },
                            { href: '#faqs', label: 'FAQs' },
                            { href: '#sitio-web', label: 'Sitio Web' },
                        ].map((link) => {
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
                                            ? 'text-[#19B5FE]'
                                            : 'text-[#C0C0C0] hover:text-[#FFFFFF]'
                                        }`}
                                >
                                    {link.label}
                                    {active && (
                                        <motion.div
                                            layoutId="integratedActiveIndicator"
                                            className="absolute bottom-0 inset-x-0 h-[2px] bg-[#19B5FE] shadow-[0_0_8px_rgba(25,181,254,0.8)]"
                                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                </motion.a>
                            );
                        })}
                    </nav>

                    {/* Lado Derecho: Acciones Desktop */}
                    <div className="hidden xl:flex items-center gap-4 shrink-0">
                        <a
                            href="https://wa.me/56982395940?text=Hola%2C%20quiero%20obtener%20una%20cuenta%20GRATIS%20en%20Vinzer"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 bg-[#19B5FE] hover:bg-[#0e9ce0] text-[#020210] font-black text-xs tracking-wider px-6 py-2.5 rounded-full transition-all duration-300 shadow-[0_4px_14px_rgba(25,181,254,0.3)] hover:shadow-[0_4px_20px_rgba(25,181,254,0.5)] hover:scale-103 active:scale-97"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-5 h-5 shrink-0"
                                aria-hidden="true"
                            >
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            </svg>
                            Contáctanos
                        </a>
                    </div>

                    {/* Botón Menú Móvil */}
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="xl:hidden p-2.5 text-[#C0C0C0] hover:text-[#19B5FE] transition-all duration-300 rounded-xl bg-white/5 border border-white/10 active:scale-90"
                        aria-label="Open menu"
                    >
                        <Menu size={18} />
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            <section id="inicio" className="relative pt-36 md:pt-44 pb-20 px-6 z-10">
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://i.postimg.cc/mD9jZNX2/portada-1.webp"
                        alt=""
                        className="w-full h-full object-cover object-center"
                        aria-hidden="true"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#020210] via-[#020210]/90 to-[#020210]/60 opacity-60" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020210] via-transparent to-[#020210]/80 opacity-50" />
                </div>
                <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    {/* Contenido de Hero */}
                    <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
                        {/* Tag Badge */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#19B5FE]/10 border border-[#19B5FE]/30 rounded-full">
                            <Zap size={14} className="text-[#19B5FE]" />
                            <span className="text-[10px] font-black text-[#19B5FE] uppercase tracking-widest">Planes y Precios en CLP · Software para Crematorios</span>
                        </div>

                        {/* Título Principal H1 (SEO) */}
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] text-[#FFFFFF]">
                            Software de Gestión y <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#19B5FE] via-[#19B5FE] to-[#E0B84D]">Trazabilidad QR</span> para Crematorios de Mascotas.
                        </h1>

                        {/* Subtítulo descriptivo */}
                        <p className="text-base sm:text-lg md:text-xl text-[#C0C0C0] max-w-2xl mx-auto lg:mx-0 font-medium leading-relaxed">
                            Optimiza la gestión operativa, registra cada paso del servicio con evidencia fotográfica y ofrece a las familias una despedida con absoluta transparencia y hermosos memoriales digitales.
                        </p>

                        {/* Botones de acción */}
                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                            {/* Botón Principal (WhatsApp) */}
                            <a
                                href="https://wa.me/56982395940?text=Hola%2C%20quiero%20obtener%20una%20cuenta%20GRATIS%20en%20Vinzer"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group w-full sm:w-auto text-center bg-[#25D366] text-[#020210] px-8 py-4 rounded-3xl font-bold uppercase tracking-wider text-xs hover:bg-[#20ba5a] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-xl shadow-[#25D366]/10 flex items-center justify-center gap-3"
                                id="hero-primary-cta"
                            >
                                {/* Icono de WhatsApp con estilo Outline */}
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="w-5 h-5 shrink-0"
                                    aria-hidden="true"
                                >
                                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                                </svg>

                                <span className="font-extrabold">Obtén tu cuenta GRATIS</span>

                                {/* Flecha con animación al hacer hover (gracias a la clase group-hover) */}
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                                >
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                    <polyline points="12 5 19 12 12 19"></polyline>
                                </svg>
                            </a>

                            {/* Botón Secundario */}
                            <button
                                onClick={() => setIsVideoOpen(true)}
                                className="group w-full sm:w-auto text-center border border-[#E0B84D]/30 bg-[#E0B84D]/5 px-8 py-4 rounded-3xl font-bold uppercase tracking-wider text-xs hover:bg-[#E0B84D]/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-[#E0B84D] flex items-center justify-center gap-3"
                                id="hero-secondary-cta"
                            >
                                <span className="font-extrabold">Ver cómo funciona</span>

                                {/* Icono de Ojo con animación sutil */}
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110"
                                >
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </button>
                        </div>

                        {/* Badge de Seguridad */}
                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 pt-4 text-slate-400 text-xs">
                            <span className="flex items-center gap-1.5">
                                <ShieldCheck size={16} className="text-[#E0B84D]" /> Trazabilidad garantizada desde el ingreso
                            </span>
                            <span className="flex items-center gap-1.5">
                                <CheckCircle2 size={16} className="text-[#19B5FE]" /> Gestión integral de mascotas y servicios
                            </span>
                        </div>
                    </div>

                    {/* Simulación del Software en Hero (Aesthetic UI) */}
                    <div className="lg:col-span-5 relative mt-8 lg:mt-0">
                        {/* Glow decorativo detrás del mockup */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#19B5FE]/10 to-indigo-600/10 rounded-[2.5rem] blur-2xl -z-10" />

                        {/* Interfaz de Software Simulada */}
                        <div className="bg-[#0b0a24]/90 border border-white/10 rounded-[2.5rem] p-6 shadow-2xl backdrop-blur-sm overflow-hidden">
                            {/* Barra superior de la ventana del navegador */}
                            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono tracking-wider bg-white/5 px-3 py-1 rounded-full">
                                    track.vinzer.cl
                                </div>
                                <div className="w-4" /> {/* Spacer */}
                            </div>

                            {/* Header del Dashboard */}
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#E0B84D]">Estado del Servicio</span>
                                    <h4 className="text-lg font-bold text-[#FFFFFF] mt-0.5">Seguimiento QR #VNC-8930</h4>
                                </div>
                                <div className="bg-[#19B5FE]/10 border border-[#19B5FE]/30 text-[#19B5FE] px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                                    En Proceso
                                </div>
                            </div>

                            {/* Info de la Mascota */}
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3 mb-6">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">Mascota:</span>
                                    <span className="font-semibold text-[#FFFFFF]">Toby (Labrador, 32kg)</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">Registrado por:</span>
                                    <span className="font-semibold text-[#FFFFFF]">Recepción · J. Pérez</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">Servicio Contratado:</span>
                                    <span className="font-semibold text-[#E0B84D] flex items-center gap-1">
                                        Cremación Individual Premium <Star size={12} fill="#E0B84D" />
                                    </span>
                                </div>
                            </div>

                            {/* Línea de tiempo visual */}
                            <div className="space-y-4">
                                <div className="relative pl-6 pb-2 border-l border-[#19B5FE]">
                                    <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-[#19B5FE] ring-4 ring-[#19B5FE]/20" />
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-[#FFFFFF]">Ingresado en Portal Vet</span>
                                        <span className="text-slate-400 text-[10px]">10:30 AM</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Escaneado y etiquetado con éxito.</p>
                                </div>

                                <div className="relative pl-6 pb-2 border-l border-white/10">
                                    <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-[#19B5FE] ring-4 ring-[#19B5FE]/20" />
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-[#FFFFFF]">Custodia Confirmada</span>
                                        <span className="text-slate-400 text-[10px]">11:15 AM</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Recogido por chofer (Sello #S-293).</p>
                                </div>

                                <div className="relative pl-6">
                                    <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-white/20 animate-ping" />
                                    <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-white/30" />
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-[#C0C0C0]">En Planta / Crematorio</span>
                                        <span className="text-slate-500 text-[10px]">En espera</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Validando identidad QR previo al inicio del proceso.</p>
                                </div>
                            </div>

                            {/* Campo de seguimiento por código (funcional) */}
                            <div className="mt-6 border-t border-white/5 pt-5">
                                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-3 text-center">
                                    ¿Eres familia? Sigue el servicio con tu código
                                </p>
                                <TrackingSearch theme="dark" buttonLabel="Buscar" placeholder="Ej: SMROE2STJ4" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Sección: Visión Vinzer */}
            <section id="vision" className="py-32 px-6 relative z-10 overflow-hidden">
                <div className="max-w-6xl mx-auto">
                    {/* Encabezado de marca */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-16">
                        <div className="lg:col-span-8 space-y-4 text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E0B84D]/10 border border-[#E0B84D]/20 rounded-full">
                                <Sparkles size={12} className="text-[#E0B84D]" />
                                <span className="text-[10px] font-black text-[#E0B84D] uppercase tracking-widest">Nuestra Visión</span>
                            </div>
                            <h2 className="text-3xl md:text-5xl font-black text-[#FFFFFF] leading-tight">
                                Tecnología empática para la gestión funeraria <br className="hidden md:block" />
                                y cremación de mascotas
                            </h2>
                            <p className="text-[#C0C0C0] font-medium leading-relaxed max-w-3xl">
                                Vinzer nace con el propósito de transformar la industria funeraria de mascotas en Latinoamérica: convertir un proceso opaco y burocrático en una experiencia transparente, dignificada y digital, donde ninguna familia tenga que dudar del cuidado y la identidad de su compañero.
                            </p>
                        </div>
                        <div className="lg:col-span-4 flex justify-center lg:justify-end">
                            <img
                                src="https://i.postimg.cc/ZqnZQ0f5/gata-calico-transp-1.webp"
                                alt="Gata Calico Vinzer"
                                className="max-h-[300px] w-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)] transform hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                    </div>

                    {/* Pilares (3 columnas) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                        {/* Pilar 1: Confianza */}
                        <div className="bg-[#0b0a24] border border-white/10 rounded-3xl p-7 lg:p-8 relative overflow-hidden group hover:border-[#19B5FE]/30 transition-colors duration-500">
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#19B5FE]/5 blur-3xl rounded-full group-hover:bg-[#19B5FE]/10 transition-colors duration-500" />
                            <div className="relative">
                                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#19B5FE] mb-3">Misión</div>
                                <h3 className="text-xl font-bold text-[#FFFFFF] mb-4 leading-tight">
                                    Trazabilidad inviolable.
                                </h3>
                                <p className="text-xs text-[#C0C0C0] leading-relaxed">
                                    Cada servicio queda registrado con código único, evidencia fotográfica obligatoria por fase y auditoría granular. La familia sigue el proceso en tiempo real sin pedir explicaciones.
                                </p>
                            </div>
                        </div>

                        {/* Pilar 2: Empatía */}
                        <div className="bg-[#0b0a24] border border-[#E0B84D]/20 rounded-3xl p-7 lg:p-8 relative overflow-hidden group shadow-lg shadow-[#E0B84D]/5 hover:border-[#E0B84D]/40 transition-colors duration-500">
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#E0B84D]/10 blur-3xl rounded-full group-hover:bg-[#E0B84D]/15 transition-colors duration-500" />
                            <div className="relative">
                                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#E0B84D] mb-3">Visión</div>
                                <h3 className="text-xl font-bold text-[#FFFFFF] mb-4 leading-tight">
                                    Memoria perpetua.
                                </h3>
                                <p className="text-xs text-[#C0C0C0] leading-relaxed">
                                    Cada despedida merece un homenaje que perdure: memoriales interactivos, dedicatorias, velas digitales y galería colaborativa. Convertimos el duelo en un acto de gratitud compartida.
                                </p>
                            </div>
                        </div>

                        {/* Pilar 3: Modernidad */}
                        <div className="bg-[#0b0a24] border border-white/10 rounded-3xl p-7 lg:p-8 relative overflow-hidden group hover:border-purple-400/30 transition-colors duration-500">
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-400/5 blur-3xl rounded-full group-hover:bg-purple-400/10 transition-colors duration-500" />
                            <div className="relative">
                                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 mb-3">Valores</div>
                                <h3 className="text-xl font-bold text-[#FFFFFF] mb-4 leading-tight">
                                    Tecnología con respeto.
                                </h3>
                                <p className="text-xs text-[#C0C0C0] leading-relaxed">
                                    Construimos software empático: cada interfaz, cada notificación y cada certificado está diseñado pensando en el momento más sensible de una familia. Sin distracciones, sin trámites fríos.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Frase de cierre */}
                    <div className="mt-16 max-w-3xl mx-auto text-center">
                        <p className="text-base sm:text-lg md:text-xl text-[#FFFFFF] font-light italic leading-relaxed">
                            <span className="text-[#E0B84D]">&ldquo;</span>
                            Creemos que el respeto por una mascota se mide en cada detalle del proceso. Vinzer existe para que cada crematorio pueda demostrarlo.
                            <span className="text-[#E0B84D]">&rdquo;</span>
                        </p>
                        <div className="mt-6 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                            <div className="w-8 h-px bg-slate-700" />
                            Equipo Vinzer
                            <div className="w-8 h-px bg-slate-700" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Barra de Capacidades Verificables del Sistema */}
            <section className="py-12 border-y border-white/5 bg-[#020210]/40 relative z-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        <div className="space-y-1">
                            <div className="text-3xl md:text-4xl font-black text-[#19B5FE]">10 caracteres</div>
                            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Código de Verificación Único</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-3xl md:text-4xl font-black text-[#FFFFFF]">5 planes</div>
                            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">FREE · TRACK · NORMAL · PRO · ULTRA</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-3xl md:text-4xl font-black text-[#E0B84D]">3 roles</div>
                            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">ADMIN · RECEPCIÓN · OPERADOR</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-3xl md:text-4xl font-black text-[#FFFFFF]">24/7</div>
                            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Tracking Público sin Login</div>
                        </div>
                    </div>
                </div>
            </section>

            <VinzerJourney />

            <VinzerFeatures />

            <VinzerPricing loginUrl={loginUrl} />

            <VinzerFaqs />

            <VinzerWebService />

            {/* CTA Final */}
            <section className="py-28 px-6 relative overflow-hidden z-10 max-w-7xl mx-auto">
                <div className="relative bg-gradient-to-tr from-[#0b0a24] to-[#020210] border border-white/10 rounded-[3rem] p-10 md:p-16 text-center space-y-8 overflow-hidden shadow-2xl">
                    {/* Fondo decorativo con resplandor verde esmeralda y oro */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#19B5FE]/5 to-[#E0B84D]/5 pointer-events-none -z-10" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#19B5FE]/5 blur-[120px] rounded-full pointer-events-none -z-10" />

                    <div className="max-w-3xl mx-auto space-y-6">
                        <h2 className="text-3xl md:text-6xl font-black text-[#FFFFFF] leading-tight">
                            ¿Listo para digitalizar y automatizar tu crematorio de mascotas?
                        </h2>
                        <p className="text-base md:text-lg text-[#C0C0C0] font-medium">
                            Únete a la red nacional de crematorios digitales que priorizan la trazabilidad, la eficiencia y el cuidado emocional de las familias.
                        </p>
                    </div>

                    <div className="flex items-center justify-center pt-4">
                        <a
                            href="https://wa.me/56982395940?text=Hola%2C%20quiero%20obtener%20una%20cuenta%20GRATIS%20en%20Vinzer"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#25D366]/90 text-[#020210] px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-[#25D366]/20"
                            id="cta-final-btn"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            Obtén tu cuenta GRATIS por WhatsApp
                        </a>
                    </div>
                </div>
            </section>

            {/* Footer Semántico */}
            <footer className="border-t border-white/5 bg-[#020210] py-16 px-6 relative z-10">
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
                            <h5 className="text-[10px] font-black uppercase tracking-wider text-[#E0B84D]">Software</h5>
                            <ul className="space-y-2 text-xs text-slate-400">
                                <li><a href="#trazabilidad" className="hover:text-[#19B5FE] transition-colors">Trazabilidad QR</a></li>
                                <li><a href="#modulos" className="hover:text-[#19B5FE] transition-colors">Módulos del Sistema</a></li>
                                <li><a href="#precios" className="hover:text-[#19B5FE] transition-colors">Planes de Precios</a></li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h5 className="text-[10px] font-black uppercase tracking-wider text-[#E0B84D]">Recursos</h5>
                            <ul className="space-y-2 text-xs text-slate-400">
                                <li><a href="#faqs" className="hover:text-[#19B5FE] transition-colors">Preguntas Frecuentes</a></li>
                                <li><Link href="/manual" className="hover:text-[#19B5FE] transition-colors">Guías Operativas</Link></li>
                                <li><Link href="/memorials" className="hover:text-[#19B5FE] transition-colors">Memoriales Públicos</Link></li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h5 className="text-[10px] font-black uppercase tracking-wider text-[#E0B84D]">Legal</h5>
                            <ul className="space-y-2 text-xs text-slate-400">
                                <li><Link href="/privacidad" className="hover:text-[#19B5FE] transition-colors">Privacidad</Link></li>
                                <li><Link href="/terminos" className="hover:text-[#19B5FE] transition-colors">Términos del Servicio</Link></li>
                                <li><Link href="/cookies" className="hover:text-[#19B5FE] transition-colors">Política de Cookies</Link></li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Línea Inferior de Derechos */}
                <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 font-medium">
                    <p>© 2026 Vinzer SaaS. Todos los derechos reservados.</p>
                    <div className="flex gap-4">
                        <span className="hover:text-[#19B5FE] cursor-pointer">LinkedIn</span>
                        <span className="hover:text-[#19B5FE] cursor-pointer">Instagram</span>
                        <span className="hover:text-[#19B5FE] cursor-pointer">Soporte</span>
                    </div>
                </div>
            </footer>

            {/* Modal de Video */}
            <AnimatePresence>
                {isVideoOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                        onClick={() => setIsVideoOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-4xl aspect-video bg-[#0b0a24] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setIsVideoOpen(false)}
                                className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-[#FFFFFF] transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <div className="w-full h-full flex items-center justify-center">
                                <iframe
                                    src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                                    title="Vinzer - Cómo funciona"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="w-full h-full"
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                                    { href: '#inicio', label: 'Inicio' },
                                    { href: '#vision', label: 'Visión' },
                                    { href: '#trazabilidad', label: 'Trazabilidad' },
                                    { href: '#modulos', label: 'Módulos' },
                                    { href: '#precios', label: 'Precios' },
                                    { href: '#faqs', label: 'FAQs' },
                                    { href: '#sitio-web', label: 'Sitio Web' },
                                ].map((link, index) => {
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
        </div>
    );
}
