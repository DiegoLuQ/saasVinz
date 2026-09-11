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
        title: 'Admisión y Asignación de Código de Verificación Único',
        subtitle: 'Ingreso rápido de mascotas, custodia y emisión inmediata del código familiar',
        badge: 'Módulo 01 · Recepción',
        description: 'Al registrar a la mascota en recepción o retiro en clínica veterinaria, el sistema genera automáticamente un código alfanumérico único e irrepetible. Este código actúa como llave criptográfica para toda la bitácora de custodia, eliminando el riesgo de confusiones con etiquetas manuales.',
        seoAlt: 'Pantalla de registro de orden con código de verificación único en Vinzer',
        seoCaption: 'Captura del formulario de admisión: registro de datos de la mascota, peso, tutor y asignación automática del identificador único de trazabilidad.',
        imageUrl: 'https://i.postimg.cc/mD9jZNX2/portada-1.webp',
        tags: ['Identificador Criptográfico', 'Registro en 2 Minutos', 'Tutor & Mascota'],
        highlights: [
            'Generación de código irrepetible al instante',
            'Cálculo automático de peso y requerimientos de horno',
            'Envío automático de enlace privado por WhatsApp y correo a la familia',
            'Historial de quién registró el servicio con fecha y hora exacta'
        ]
    },
    {
        id: 'bitacora-planta',
        title: 'Bitácora Operativa de Horno con Evidencia Fotográfica',
        subtitle: 'Validación obligatoria de identidad antes de encender el incinerador',
        badge: 'Módulo 02 · Operación de Planta',
        description: 'La seguridad no es negociable. Antes de ingresar la mascota al horno, el operador escanea o digita el código de verificación y toma una fotografía del cuerpo con su identificador físico. El sistema registra firma digital del operador, hora exacta y bloquea cualquier avance si falta la evidencia.',
        seoAlt: 'Bitácora de incineración con captura de fotos y firma de operador en software Vinzer',
        seoCaption: 'Interfaz del operador de planta: control de etapas de cremación, subida de foto de confirmación y firma de custodia en tiempo real.',
        imageUrl: 'https://i.postimg.cc/mD9jZNX2/portada-1.webp',
        tags: ['Fotos Obligatorias', 'Firma de Operador', 'Anti-Error de Identidad'],
        highlights: [
            'Obligatoriedad de fotografía antes de iniciar el ciclo',
            'Firma táctil del operador responsable en tablet o teléfono',
            'Marca de tiempo inviolable en servidor seguro',
            'Control simultáneo de múltiples cámaras u hornos sin cruces'
        ]
    },
    {
        id: 'portal-familias',
        title: 'Portal de Seguimiento en Tiempo Real para Familias',
        subtitle: 'Tranquilidad total para los tutores desde su móvil, sin llamadas ni contraseñas',
        badge: 'Módulo 03 · Portal Público',
        description: 'Las familias reciben un enlace directo a un portal web elegante y sobrio. Solo ingresando su código único, pueden consultar en qué fase exacta se encuentra su compañero (En Custodia, En Planta, Completado) junto a la fecha y hora de cada paso, reduciendo en más de un 80% las llamadas de consulta.',
        seoAlt: 'Portal móvil familiar de seguimiento de cremación de mascotas en tiempo real',
        seoCaption: 'Vista responsive del portal público para familias: línea de tiempo de custodia, estado del servicio y datos de la mascota con diseño sereno.',
        imageUrl: 'https://i.postimg.cc/mD9jZNX2/portada-1.webp',
        tags: ['Acceso Directo', 'Línea de Tiempo en Vivo', '0% Inquietud Familiar'],
        highlights: [
            'Acceso sin usuario ni contraseña mediante el código único',
            'Visualización de fases autorizadas con diseño respetuoso y sobrio',
            'Descarga directa del certificado digital una vez finalizado el servicio',
            'Totalmente responsive y optimizado para teléfonos móviles'
        ]
    },
    {
        id: 'certificados-qr',
        title: 'Certificados Digitales Oficiales con Código QR de Autenticidad',
        subtitle: 'Documentos PDF inviolables con verificación pública al instante',
        badge: 'Módulo 04 · Certificación Legal',
        description: 'Al concluir el servicio, Vinzer emite automáticamente un certificado oficial en alta resolución PDF con los datos de la mascota, fecha de incineración, sello de agua institucional y un código QR dinámico. Cualquier persona que escanee el código QR accede a la validación de autenticidad en la nube de Vinzer.',
        seoAlt: 'Certificado de cremación de mascotas con código QR dinámico y sello de agua',
        seoCaption: 'Plantilla de certificado digital oficial: personalizable con los colores, sellos y firmas de tu crematorio, con validación de autenticidad mediante código QR.',
        imageUrl: 'https://i.postimg.cc/mD9jZNX2/portada-1.webp',
        tags: ['Código QR Verificable', 'Sello Anti-Falsificación', 'PDF en Alta Definición'],
        highlights: [
            'Código QR público de verificación que demuestra la autenticidad',
            'Personalización de colores, logos, firmas y sellos institucionales',
            'Generación instantánea en PDF listo para imprimir o enviar',
            'Numeración correlativa y correlación con el expediente digital'
        ]
    },
    {
        id: 'inventario-anforas',
        title: 'Gestión de Ánforas, Productos y Logística de Retiros',
        subtitle: 'Control de existencias de urnas, servicios adicionales y despacho',
        badge: 'Módulo 05 · Inventario y Logística',
        description: 'Controla el stock de ánforas estándar y personalizadas, placas conmemorativas y relicarios. El sistema descuenta existencias automáticamente cuando un producto es asignado a una orden y permite gestionar la ruta de retiro o entrega a domicilio con choferes asignados.',
        seoAlt: 'Control de inventario de ánforas y coordinación de retiros en Vinzer',
        seoCaption: 'Módulo de inventario y catálogo: vista de stock disponible, alertas de reposición de urnas y asignación de despachos.',
        imageUrl: 'https://i.postimg.cc/mD9jZNX2/portada-1.webp',
        tags: ['Control de Stock', 'Descuento Automático', 'Rutas de Entrega'],
        highlights: [
            'Catálogo con fotos, precios y niveles mínimos de alerta de existencias',
            'Asignación directa de urnas a cada orden de cremación',
            'Historial de movimientos e ingresos de proveedores',
            'Hoja de ruta clara para el personal de retiro y entrega'
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
                                <div className="text-xs font-bold mt-1 group-hover:text-cyan-300">Horno y Fotos</div>
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
