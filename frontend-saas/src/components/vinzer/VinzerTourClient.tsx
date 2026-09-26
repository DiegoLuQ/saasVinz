'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck,
    Camera,
    FileCheck2,
    Boxes,
    Search,
    Play,
    ArrowLeft,
    CheckCircle2,
    ExternalLink,
    Maximize2,
    X,
    Sun,
    Moon,
    Sparkles,
    MessageCircle,
    ChevronRight,
    Lock,
    QrCode
} from 'lucide-react';
import { VinzerLogo } from './VinzerLogo';

interface ModuleItem {
    id: string;
    title: string;
    subtitle: string;
    badge: string;
    description: string;
    seoAlt: string;
    seoCaption: string;
    imageUrl: string;
    tags: string[];
    highlights: string[];
}

const TOUR_MODULES: ModuleItem[] = [
    {
        id: 'recepcion',
        title: 'Recepción y Código de Verificación Único',
        subtitle: 'Registro guiado de la mascota, el tutor y el servicio en una sola orden',
        badge: 'Módulo 01 · Recepción',
        description: 'Al registrar un servicio, Vinzer genera automáticamente un código de verificación único de 10 caracteres y un enlace privado de seguimiento. El formulario de recepción, organizado en 4 pestañas, reúne los datos de la mascota y del tutor, la logística, las fotografías y el detalle comercial, y guarda borradores automáticamente.',
        seoAlt: 'Formulario de recepción de una orden de cremación con código de verificación único en Vinzer',
        seoCaption: 'Formulario de recepción: datos de la mascota y del tutor, retiro programado, fotografías y detalle comercial en una sola orden.',
        imageUrl: 'https://i.postimg.cc/mD9jZNX2/portada-1.webp',
        tags: ['Código Único', 'Formulario en 4 Pestañas', 'Autoguardado'],
        highlights: [
            'Código de verificación único por servicio',
            'Retiro programado, peso estimado y dirección de entrega',
            'Hasta 3 fotografías y notas internas por orden',
            'Enlace de seguimiento listo para compartir con la familia'
        ]
    },
    {
        id: 'bitacora-planta',
        title: 'Operación por Etapas con Evidencia Fotográfica',
        subtitle: 'Cada crematorio define sus etapas y registra cada avance',
        badge: 'Módulo 02 · Operación de Planta',
        description: 'Cada crematorio configura la secuencia real de su servicio (retiro, recepción, cremación, entrega o las que use). Desde el panel de Operaciones, el equipo ve las órdenes pendientes y avanza cada una dejando una fotografía y comentarios, con fecha y hora registradas.',
        seoAlt: 'Panel de operaciones de Vinzer con avance por etapas y evidencia fotográfica',
        seoCaption: 'Panel de operaciones: órdenes pendientes, avance por etapas configurables y registro de fotografías y comentarios.',
        imageUrl: 'https://i.postimg.cc/mD9jZNX2/portada-1.webp',
        tags: ['Etapas Configurables', 'Foto por Etapa', 'Fecha y Hora'],
        highlights: [
            'Etapas del servicio definidas por cada crematorio',
            'Fotografía y comentarios en cada avance',
            'Fecha y hora registradas automáticamente',
            'Vista de órdenes pendientes para todo el equipo'
        ]
    },
    {
        id: 'portal-familias',
        title: 'Portal de Seguimiento en Tiempo Real para Familias',
        subtitle: 'Tranquilidad para los tutores desde su celular, sin llamadas ni contraseñas',
        badge: 'Módulo 03 · Portal Público',
        description: 'Cada familia recibe un enlace privado a un portal sobrio y responsive. Sin crear cuentas, ve las etapas del servicio de su mascota, cuál está en curso y las fotografías y comentarios de cada avance. También puede buscar su servicio con el código de verificación.',
        seoAlt: 'Portal móvil de seguimiento de cremación de mascotas en tiempo real para familias',
        seoCaption: 'Portal público para familias: línea de tiempo del servicio, etapa en curso y evidencias de cada avance con un diseño sereno.',
        imageUrl: 'https://i.postimg.cc/mD9jZNX2/portada-1.webp',
        tags: ['Sin Contraseñas', 'Línea de Tiempo en Vivo', 'Menos Llamadas'],
        highlights: [
            'Acceso con enlace privado, sin usuario ni contraseña',
            'Búsqueda del servicio por código de verificación',
            'Etapas, fotografías y comentarios de cada avance',
            'Diseño responsive pensado para el celular'
        ]
    },
    {
        id: 'certificados-qr',
        title: 'Certificados de Cremación en PDF Personalizables',
        subtitle: 'Plantillas con el diseño de tu crematorio, listas para imprimir o enviar',
        badge: 'Módulo 04 · Certificados',
        description: 'Desde el plan NORMAL, Vinzer genera el certificado de cremación en PDF con los datos de la mascota y del servicio, usando plantillas con el logo, los colores, los textos, la marca de agua y el espacio de firma y sello de tu crematorio.',
        seoAlt: 'Certificado de cremación de mascotas en PDF con plantilla personalizable',
        seoCaption: 'Plantilla de certificado de cremación: personalizable con el logo, los colores, los textos y la firma de tu crematorio.',
        imageUrl: 'https://i.postimg.cc/mD9jZNX2/portada-1.webp',
        tags: ['Plantillas Editables', 'Marca de Agua', 'PDF Listo para Imprimir'],
        highlights: [
            'Plantillas con logo, colores y textos del crematorio',
            'Marca de agua con el logo de fondo',
            'Espacio de firma y sello personalizable',
            'Formatos Carta y Oficio'
        ]
    },
    {
        id: 'inventario-anforas',
        title: 'Inventario de Ánforas, Productos y Catálogo',
        subtitle: 'Stock, precios y catálogo descargable en un solo lugar',
        badge: 'Módulo 05 · Inventario',
        description: 'Controla el stock de ánforas, relicarios y productos con su precio de costo y de venta. Las existencias se descuentan automáticamente cuando un producto se agrega a una orden, y el catálogo completo se puede descargar en PDF para compartirlo con familias y veterinarias.',
        seoAlt: 'Inventario de ánforas y productos con control de stock en Vinzer',
        seoCaption: 'Módulo de inventario y catálogo: stock disponible, precios de costo y venta, y catálogo descargable en PDF.',
        imageUrl: 'https://i.postimg.cc/mD9jZNX2/portada-1.webp',
        tags: ['Control de Stock', 'Descuento Automático', 'Catálogo PDF'],
        highlights: [
            'Stock, precio de costo y precio de venta por producto',
            'Descuento automático al agregar productos a una orden',
            'Catálogo de productos y servicios descargable en PDF',
            'Planes, servicios y productos en un mismo catálogo'
        ]
    }
];

export default function VinzerTourClient() {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [activeModuleId, setActiveModuleId] = useState<string>('recepcion');
    const [activeLightboxImg, setActiveLightboxImg] = useState<{ url: string; title: string; caption: string } | null>(null);
    const [youtubeUrl, setYoutubeUrl] = useState<string>('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');

    useEffect(() => {
        const saved = localStorage.getItem('vinzer-landing-theme') as 'dark' | 'light';
        if (saved) setTheme(saved);
    }, []);

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem('vinzer-landing-theme', next);
    };

    // Keyboard ESC to close lightbox
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setActiveLightboxImg(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className={`min-h-screen transition-colors duration-500 font-sans antialiased selection:bg-cyan-500/30 selection:text-white ${
            theme === 'light' ? 'bg-[#F8FAFC] text-slate-900' : 'bg-[#030712] text-white'
        }`}>
            {/* Header / Nav */}
            <header className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-colors duration-300 ${
                theme === 'light' ? 'bg-white/90 border-slate-200' : 'bg-[#030712]/90 border-cyan-500/20'
            }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/" className="hover:scale-102 transition-transform">
                            <VinzerLogo size="sm" />
                        </Link>
                        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <Sparkles size={12} />
                            <span>Tour Oficial de la Plataforma</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            aria-label="Alternar modo claro y oscuro"
                            className={`p-2.5 rounded-full border transition-colors ${
                                theme === 'light'
                                    ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
                                    : 'bg-white/5 border-white/10 text-cyan-400 hover:bg-white/10'
                            }`}
                        >
                            {theme === 'light' ? <Sun size={17} /> : <Moon size={17} />}
                        </button>

                        <Link
                            href="/"
                            className={`hidden md:inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border transition-all ${
                                theme === 'light'
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                            }`}
                        >
                            <ArrowLeft size={14} />
                            <span>Volver a la Portada</span>
                        </Link>

                        <a
                            href="https://wa.me/56982395940?text=Hola%2C%20vi%20el%20Tour%20de%20Vinzer%20y%20quiero%20una%20demostracion%20en%20vivo"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition-all hover:scale-102"
                        >
                            <MessageCircle size={15} />
                            <span>Pedir Demo</span>
                        </a>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative overflow-hidden pb-24">
                {/* Backlight Ambient Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none -z-10">
                    <div className="absolute top-10 left-1/4 w-[500px] h-[350px] bg-cyan-500/10 blur-[130px] rounded-full" />
                    <div className="absolute top-32 right-1/4 w-[400px] h-[300px] bg-sky-500/10 blur-[120px] rounded-full" />
                </div>

                {/* Hero Section */}
                <section className="pt-16 pb-12 max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                        <ShieldCheck size={15} className="text-cyan-400" />
                        <span>Arquitectura y Capturas Reales</span>
                    </div>

                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
                        Descubre cómo <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-teal-300 bg-clip-text text-transparent">Vinzer</span> profesionaliza cada etapa de tu servicio
                    </h1>

                    <p className={`text-base sm:text-lg max-w-3xl mx-auto leading-relaxed ${
                        theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                        Olvídate de las etiquetas de papel y la incertidumbre. Explora nuestras capturas de pantalla, flujos fotográficos y el video demostrativo para conocer la solución de trazabilidad más completa del mercado.
                    </p>

                    {/* Quick navigation pill links */}
                    <div className="pt-4 flex flex-wrap items-center justify-center gap-2">
                        {TOUR_MODULES.map((mod) => (
                            <a
                                key={mod.id}
                                href={`#${mod.id}`}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                                    theme === 'light'
                                        ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
                                        : 'bg-white/5 hover:bg-cyan-500/10 border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300'
                                }`}
                            >
                                {mod.title.split(' ')[0]} {mod.title.split(' ')[1]}
                            </a>
                        ))}
                        <a
                            href="#video-demo"
                            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all flex items-center gap-1.5"
                        >
                            <Play size={12} className="fill-cyan-300" />
                            <span>Ver Video Demo</span>
                        </a>
                    </div>
                </section>

                {/* Video Demo Section (YouTube) */}
                <section id="video-demo" className="py-12 max-w-5xl mx-auto px-4 sm:px-6">
                    <div className={`p-6 sm:p-8 rounded-3xl border shadow-2xl relative overflow-hidden ${
                        theme === 'light'
                            ? 'bg-white border-slate-200 shadow-slate-200/80'
                            : 'bg-slate-900/80 border-cyan-500/20 shadow-cyan-950/50'
                    }`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div>
                                <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                                    Paso a Paso en Video
                                </span>
                                <h2 className="text-2xl sm:text-3xl font-extrabold mt-1">
                                    Demostración Guiada en Video
                                </h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>HD 1080p</span>
                                </span>
                            </div>
                        </div>

                        {/* YouTube Iframe Player */}
                        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-inner">
                            <iframe
                                src={youtubeUrl}
                                title="Demostración Completa de Vinzer Software para Crematorios de Mascotas"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                className="absolute inset-0 w-full h-full"
                                loading="lazy"
                            />
                        </div>

                        {/* Video Key Chapters */}
                        <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <a
                                href="#recepcion"
                                className="p-3 rounded-xl bg-white/5 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 transition-all text-left group"
                            >
                                <div className="text-[10px] font-mono text-cyan-400">00:00 - Minuto 1</div>
                                <div className="text-xs font-bold mt-1 group-hover:text-cyan-300">Admisión y Código</div>
                            </a>
                            <a
                                href="#bitacora-planta"
                                className="p-3 rounded-xl bg-white/5 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 transition-all text-left group"
                            >
                                <div className="text-[10px] font-mono text-cyan-400">01:15 - Minuto 2</div>
                                <div className="text-xs font-bold mt-1 group-hover:text-cyan-300">Etapas y Fotos</div>
                            </a>
                            <a
                                href="#portal-familias"
                                className="p-3 rounded-xl bg-white/5 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 transition-all text-left group"
                            >
                                <div className="text-[10px] font-mono text-cyan-400">02:40 - Minuto 3</div>
                                <div className="text-xs font-bold mt-1 group-hover:text-cyan-300">Portal Familias</div>
                            </a>
                            <a
                                href="#certificados-qr"
                                className="p-3 rounded-xl bg-white/5 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 transition-all text-left group"
                            >
                                <div className="text-[10px] font-mono text-cyan-400">03:50 - Minuto 4</div>
                                <div className="text-xs font-bold mt-1 group-hover:text-cyan-300">Certificados QR</div>
                            </a>
                        </div>
                    </div>
                </section>

                {/* Modules Showcase */}
                <section className="py-12 max-w-6xl mx-auto px-4 sm:px-6 space-y-20">
                    <div className="text-center max-w-2xl mx-auto space-y-2">
                        <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
                            Catálogo Visual Detallado
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold">
                            Cada Pantalla Diseñada para la Operación Diaria
                        </h2>
                    </div>

                    {TOUR_MODULES.map((module, index) => {
                        const isEven = index % 2 === 0;
                        return (
                            <article
                                key={module.id}
                                id={module.id}
                                className={`scroll-mt-28 p-6 sm:p-10 rounded-3xl border transition-all ${
                                    theme === 'light'
                                        ? 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'
                                        : 'bg-slate-900/60 border-cyan-500/20 shadow-2xl shadow-cyan-950/30'
                                }`}
                            >
                                <div className={`grid lg:grid-cols-12 gap-8 items-center ${isEven ? '' : 'lg:flex-row-reverse'}`}>
                                    {/* Text Info */}
                                    <div className={`lg:col-span-6 space-y-5 ${isEven ? 'order-1' : 'order-1 lg:order-2'}`}>
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                            <span>{module.badge}</span>
                                        </div>

                                        <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                                            {module.title}
                                        </h3>

                                        <p className="text-sm font-semibold text-cyan-400/90">
                                            {module.subtitle}
                                        </p>

                                        <p className={`text-sm leading-relaxed ${
                                            theme === 'light' ? 'text-slate-600' : 'text-slate-300'
                                        }`}>
                                            {module.description}
                                        </p>

                                        {/* Highlights list */}
                                        <div className="space-y-2.5 pt-2">
                                            {module.highlights.map((item, hIdx) => (
                                                <div key={hIdx} className="flex items-start gap-2.5 text-xs font-medium">
                                                    <CheckCircle2 size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                                                    <span className={theme === 'light' ? 'text-slate-700' : 'text-slate-200'}>
                                                        {item}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Tags */}
                                        <div className="flex flex-wrap gap-2 pt-3">
                                            {module.tags.map((tag, tIdx) => (
                                                <span
                                                    key={tIdx}
                                                    className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border ${
                                                        theme === 'light'
                                                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                                                            : 'bg-white/5 text-slate-300 border-white/10'
                                                    }`}
                                                >
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Screenshot Figure */}
                                    <figure className={`lg:col-span-6 space-y-3 ${isEven ? 'order-2' : 'order-2 lg:order-1'}`}>
                                        <div
                                            onClick={() => setActiveLightboxImg({
                                                url: module.imageUrl,
                                                title: module.title,
                                                caption: module.seoCaption
                                            })}
                                            className="group relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-black/40 border border-cyan-500/20 cursor-pointer shadow-lg transition-transform hover:scale-[1.01]"
                                        >
                                            <img
                                                src={module.imageUrl}
                                                alt={module.seoAlt}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
                                                <span className="text-xs text-white font-medium flex items-center gap-1.5">
                                                    <Maximize2 size={14} className="text-cyan-400" />
                                                    <span>Click para ampliar en alta definición</span>
                                                </span>
                                                <span className="text-[10px] font-mono bg-cyan-500 text-black font-black px-2 py-0.5 rounded">
                                                    ZOOM
                                                </span>
                                            </div>
                                        </div>
                                        <figcaption className={`text-[11px] italic px-1 ${
                                            theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                                        }`}>
                                            <strong>Figura {index + 1}:</strong> {module.seoCaption}
                                        </figcaption>
                                    </figure>
                                </div>
                            </article>
                        );
                    })}
                </section>

                {/* Final Call to Action Section */}
                <section className="mt-20 max-w-5xl mx-auto px-4 sm:px-6">
                    <div className={`p-8 sm:p-12 rounded-3xl border relative overflow-hidden text-center space-y-6 ${
                        theme === 'light'
                            ? 'bg-white border-slate-200 shadow-2xl shadow-slate-200'
                            : 'bg-gradient-to-b from-slate-900 via-[#0a192f] to-slate-900 border-cyan-500/30 shadow-2xl shadow-cyan-950/60'
                    }`}>
                        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/10">
                            <Sparkles size={32} />
                        </div>

                        <div className="max-w-2xl mx-auto space-y-3">
                            <h2 className="text-3xl sm:text-4xl font-black">
                                ¿Listo para digitalizar tu crematorio con el estándar de Vinzer?
                            </h2>
                            <p className={`text-sm sm:text-base leading-relaxed ${
                                theme === 'light' ? 'text-slate-600' : 'text-slate-300'
                            }`}>
                                Coordinemos una demostración en vivo guiada por uno de nuestros especialistas para resolver las dudas de tu equipo y cotizar según tu volumen mensual.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                            <a
                                href="https://wa.me/56982395940?text=Hola%2C%20estuve%20revisando%20el%20Tour%20de%20la%20App%20de%20Vinzer%20y%20me%20gustaria%20agendar%20una%20reunion%20de%20demostracion"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-sm shadow-xl shadow-emerald-500/25 transition-all hover:scale-102 active:scale-98"
                            >
                                <MessageCircle size={18} />
                                <span>Coordinar Demo por WhatsApp</span>
                            </a>

                            <Link
                                href="/#demo"
                                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border font-bold text-sm transition-all ${
                                    theme === 'light'
                                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                                        : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                                }`}
                            >
                                <span>Completar Formulario de Contacto</span>
                                <ChevronRight size={16} />
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            {/* Interactive Image Lightbox Modal */}
            <AnimatePresence>
                {activeLightboxImg && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setActiveLightboxImg(null)}
                        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 cursor-zoom-out"
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="relative max-w-5xl w-full bg-slate-900 rounded-2xl border border-cyan-500/30 overflow-hidden shadow-2xl cursor-default"
                        >
                            <button
                                onClick={() => setActiveLightboxImg(null)}
                                className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 text-white hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                                aria-label="Cerrar vista ampliada"
                            >
                                <X size={20} />
                            </button>

                            <div className="relative aspect-[16/10] w-full bg-black">
                                <img
                                    src={activeLightboxImg.url}
                                    alt={activeLightboxImg.title}
                                    className="w-full h-full object-contain"
                                />
                            </div>

                            <div className="p-4 sm:p-6 bg-slate-950 border-t border-white/10 space-y-1 text-left">
                                <h4 className="text-base font-bold text-white">
                                    {activeLightboxImg.title}
                                </h4>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    {activeLightboxImg.caption}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Simple Footer */}
            <footer className={`py-8 border-t text-center text-xs transition-colors ${
                theme === 'light' ? 'bg-white border-slate-200 text-slate-500' : 'bg-[#030712] border-white/5 text-slate-500'
            }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <VinzerLogo size="sm" />
                        <span className="text-[11px]">&copy; {new Date().getFullYear()} Vinzer. Todos los derechos reservados.</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold">
                        <Link href="/" className="hover:text-cyan-400 transition-colors">Inicio</Link>
                        <Link href="/#precios" className="hover:text-cyan-400 transition-colors">Precios</Link>
                        <Link href="/#faqs" className="hover:text-cyan-400 transition-colors">Preguntas Frecuentes</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
