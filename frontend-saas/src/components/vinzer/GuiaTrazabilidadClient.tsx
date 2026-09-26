'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    ShieldCheck,
    Hash,
    Camera,
    Layers,
    FileCheck2,
    Smartphone,
    ArrowRight,
    CheckCircle2,
    AlertTriangle,
    ChevronRight,
    Users,
    Scale,
    ListChecks,
    Clock,
    Sparkles,
    MessageSquareWarning,
} from 'lucide-react';

import { VinzerNavbar } from './VinzerNavbar';
import { VinzerFooter } from './VinzerFooter';
import { VinzerGuideTOC, TOCItem } from './VinzerGuideTOC';
import { VinzerGuideAccordion } from './VinzerGuideAccordion';
import { VinzerMemorialBanner } from './VinzerMemorialBanner';
import { GUIA_TRAZABILIDAD_FAQ, GUIA_TRAZABILIDAD_SEO } from '@/lib/vinzer/guia-trazabilidad';

const GESTION_HREF = '/guias/sistema-gestion-operativa-automatizacion-crematorio-mascotas';

const TOC_ITEMS: TOCItem[] = [
    { id: 'resumen', label: 'Resumen rápido' },
    { id: 'que-es', label: '1. Qué es la cadena de custodia y por qué importa' },
    { id: 'protocolo', label: '2. Protocolo de trazabilidad en 5 etapas' },
    { id: 'etapa-1', label: '• Registro con código único', level: 3 },
    { id: 'etapa-2', label: '• Retiro y recepción con fotografías', level: 3 },
    { id: 'etapa-3', label: '• Proceso en planta por etapas', level: 3 },
    { id: 'etapa-4', label: '• Entrega y certificado', level: 3 },
    { id: 'etapa-5', label: '• Seguimiento para la familia', level: 3 },
    { id: 'reclamos', label: '3. Cómo responder ante un reclamo' },
    { id: 'checklist', label: '4. Checklist de trazabilidad' },
    { id: 'faqs', label: '5. Preguntas frecuentes' },
];

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** 'YYYY-MM-DD' -> '26 de septiembre de 2026' (sin Date: evita desfases de zona horaria entre SSR y cliente). */
const formatFecha = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} de ${MESES[m - 1]} de ${y}`;
};

const RESUMEN = [
    'Identifica cada servicio con un código único y úsalo en todas las etiquetas físicas.',
    'Fotografía a la mascota al recibirla y en cada traspaso importante.',
    'Registra el avance por etapas con fecha, hora, foto y comentario.',
    'Da a la familia un enlace para seguir el proceso sin tener que llamar.',
];

const CHECKLIST = [
    'Cada servicio tiene un código único que aparece en la etiqueta física de la mascota y de la urna.',
    'Se fotografía a la mascota con su etiqueta al momento de recibirla.',
    'El tipo de servicio (individual o colectivo) queda registrado y confirmado con la familia.',
    'Cada etapa del proceso se registra con fecha, hora y evidencia fotográfica.',
    'Solo los roles autorizados pueden editar o eliminar registros.',
    'La familia recibe un enlace de seguimiento y el código de su servicio.',
    'La urna se entrega rotulada con el mismo código del servicio y con su certificado.',
];

interface Etapa {
    id: string;
    n: string;
    tag: string;
    icon: React.ReactNode;
    title: string;
    planta: string;
    vinzer: string;
}

const ETAPAS: Etapa[] = [
    {
        id: 'etapa-1', n: '01', tag: 'Solicitud', icon: <Hash size={18} />,
        title: 'Registro del servicio con un código único',
        planta: 'Desde el primer contacto, identifica el servicio con un código que acompañará a la mascota en todas sus etiquetas físicas. Confirma con la familia si el servicio es individual o colectivo.',
        vinzer: 'Cada orden recibe automáticamente un código de verificación único de 10 caracteres y un enlace privado de seguimiento. La solicitud puede ingresarla el equipo o la propia familia desde el formulario online.',
    },
    {
        id: 'etapa-2', n: '02', tag: 'Retiro y recepción', icon: <Camera size={18} />,
        title: 'Retiro y recepción con evidencia fotográfica',
        planta: 'Al retirar o recibir a la mascota, fotografíala junto a su etiqueta con el código. Es la evidencia más valiosa ante cualquier duda posterior.',
        vinzer: 'La orden guarda la fecha y hora del retiro programado, notas internas y hasta 3 fotografías de recepción. Si la familia usó el formulario online, también quedan las fotos que ella subió.',
    },
    {
        id: 'etapa-3', n: '03', tag: 'Planta', icon: <Layers size={18} />,
        title: 'Proceso en planta registrado por etapas',
        planta: 'Define las etapas reales de tu operación (recepción, cremación, enfriamiento, entrega o las que uses) y documenta cada traspaso con una fotografía.',
        vinzer: 'Cada crematorio configura sus propias etapas. El equipo avanza la orden desde el panel de Operaciones y deja en cada etapa una fotografía y comentarios, con fecha y hora registradas.',
    },
    {
        id: 'etapa-4', n: '04', tag: 'Entrega', icon: <FileCheck2 size={18} />,
        title: 'Entrega de cenizas y certificado de cremación',
        planta: 'Rotula la urna con el mismo código del servicio y entrégala junto al certificado. Registra la entrega como la última etapa.',
        vinzer: 'Desde el plan NORMAL, Vinzer genera el certificado de cremación en PDF a partir de una plantilla con el diseño del crematorio. Además puedes crear un memorial online para la familia.',
    },
    {
        id: 'etapa-5', n: '05', tag: 'Familia', icon: <Smartphone size={18} />,
        title: 'Seguimiento en vivo para la familia',
        planta: 'Informa a la familia desde el inicio cómo puede seguir el proceso. Menos incertidumbre significa menos llamadas y más confianza.',
        vinzer: 'La familia abre su enlace de seguimiento sin cuenta ni contraseña y ve las etapas, cuál está en curso y las fotografías y comentarios de cada avance. También puede buscar su servicio con el código de 10 caracteres.',
    },
];

function SectionTitle({ icon, color, isLight, children }: {
    icon: React.ReactNode; color: string; isLight: boolean; children: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-3">
            <span className={`p-2 rounded-xl border ${color}`}>{icon}</span>
            <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{children}</h2>
        </div>
    );
}

function EtapaCard({ etapa, isLight }: { etapa: Etapa; isLight: boolean }) {
    const accent = isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]';
    return (
        <div id={etapa.id} className={`p-6 rounded-2xl border space-y-4 scroll-mt-28 ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#071120] border-white/10'}`}>
            <div className="flex items-center justify-between">
                <span className={`text-xs font-mono font-bold uppercase tracking-wider ${accent}`}>Etapa {etapa.n} • {etapa.tag}</span>
                <span className={`p-1.5 rounded-lg ${isLight ? 'bg-sky-50' : 'bg-[#19B5FE]/10'} ${accent}`}>{etapa.icon}</span>
            </div>
            <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{etapa.title}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm leading-relaxed">
                <div className={`p-4 rounded-xl ${isLight ? 'bg-slate-50 text-slate-600' : 'bg-white/[0.03] text-slate-300'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>En tu planta</p>
                    <p>{etapa.planta}</p>
                </div>
                <div className={`p-4 rounded-xl border ${isLight ? 'bg-sky-50/60 border-sky-100 text-slate-700' : 'bg-[#19B5FE]/5 border-[#19B5FE]/15 text-slate-200'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-wider mb-1.5 ${accent}`}>Con Vinzer</p>
                    <p>{etapa.vinzer}</p>
                </div>
            </div>
        </div>
    );
}

export function GuiaTrazabilidadClient() {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        try {
            const savedTheme = localStorage.getItem('vinzer-landing-theme') as 'dark' | 'light' | null;
            // Se lee tras montar (no en el initializer) para no romper la hidratación del SSR.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (savedTheme) setTheme(savedTheme);
        } catch { /* sin storage: tema por defecto */ }
    }, []);

    const toggleTheme = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        try { localStorage.setItem('vinzer-landing-theme', nextTheme); } catch { /* noop */ }
    };

    const isLight = theme === 'light';
    const strong = isLight ? 'text-slate-900' : 'text-white';
    const muted = isLight ? 'text-slate-600' : 'text-slate-300';
    const card = isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#071120] border-white/10';
    const sectionBorder = isLight ? 'border-slate-200' : 'border-white/10';
    const linkCls = `font-bold underline underline-offset-4 transition-colors ${
        isLight ? 'text-[#0284C7] decoration-[#0284C7]/40 hover:text-slate-900' : 'text-[#19B5FE] decoration-[#19B5FE]/40 hover:text-white'
    }`;

    return (
        <div
            className={`min-h-screen transition-colors duration-500 font-sans relative overflow-hidden ${
                isLight
                    ? 'bg-slate-50 text-slate-900 selection:bg-[#0284C7]/20 selection:text-slate-900'
                    : 'bg-[#020210] text-white selection:bg-[#19B5FE]/30 selection:text-white'
            }`}
        >
            <VinzerNavbar theme={theme} toggleTheme={toggleTheme} />

            {/* Glows ambientales sutiles */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none z-0 overflow-hidden">
                <div className={`absolute top-[5%] left-[10%] w-[500px] h-[500px] blur-[170px] rounded-full ${isLight ? 'bg-sky-400/15 opacity-60' : 'bg-[#19B5FE]/10'}`} />
                <div className={`absolute top-[15%] right-[5%] w-[450px] h-[450px] blur-[180px] rounded-full ${isLight ? 'bg-indigo-300/10 opacity-50' : 'bg-cyan-600/5'}`} />
            </div>

            {/* Hero */}
            <header className="relative pt-32 sm:pt-36 pb-12 sm:pb-16 px-4 sm:px-6 z-10 max-w-6xl mx-auto">
                <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs font-semibold mb-6 flex-wrap">
                    <Link href="/" className={`transition-colors ${isLight ? 'text-slate-500 hover:text-[#0284C7]' : 'text-slate-400 hover:text-[#19B5FE]'}`}>
                        Inicio
                    </Link>
                    <ChevronRight size={13} className={isLight ? 'text-slate-300' : 'text-slate-600'} />
                    <Link href="/guias" className={`transition-colors ${isLight ? 'text-slate-500 hover:text-[#0284C7]' : 'text-slate-400 hover:text-[#19B5FE]'}`}>
                        Guías B2B
                    </Link>
                    <ChevronRight size={13} className={isLight ? 'text-slate-300' : 'text-slate-600'} />
                    <span className={`font-bold ${isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'}`}>Trazabilidad y cadena de custodia</span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                    <div className="lg:col-span-7 space-y-5">
                        <div
                            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                                isLight ? 'bg-sky-50 border-sky-200 text-[#0284C7]' : 'bg-[#19B5FE]/10 border-[#19B5FE]/25 text-[#19B5FE]'
                            }`}
                        >
                            <ShieldCheck size={14} /> Confianza y transparencia con las familias
                        </div>

                        <h1 className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.15] ${strong}`}>
                            {GUIA_TRAZABILIDAD_SEO.headline}
                        </h1>

                        <p className={`text-base sm:text-lg leading-relaxed ${muted}`}>
                            La <strong className={strong}>trazabilidad en un crematorio de mascotas</strong> permite demostrar, en cada
                            momento, dónde está la mascota y qué se hizo con ella hasta entregar sus cenizas. En esta guía verás un
                            protocolo práctico de cadena de custodia y cómo apoyarlo con un software para crematorios.
                        </p>

                        <p className={`text-xs font-semibold flex items-center gap-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            <Clock size={13} />
                            <span>
                                Actualizado el <time dateTime={GUIA_TRAZABILIDAD_SEO.dateModified}>{formatFecha(GUIA_TRAZABILIDAD_SEO.dateModified)}</time> · Equipo Vinzer
                            </span>
                        </p>

                        <div className="flex flex-wrap items-center gap-4 pt-2">
                            <a
                                href="/#demo"
                                className={`inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full font-black text-xs uppercase tracking-wider transition-all shadow-lg hover:scale-105 active:scale-95 ${
                                    isLight ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-sky-600/25' : 'bg-[#19B5FE] hover:bg-[#0e9ce0] text-[#020210] shadow-[#19B5FE]/25'
                                }`}
                            >
                                Solicitar demo guiada
                                <ArrowRight size={15} />
                            </a>
                            <Link
                                href={GESTION_HREF}
                                className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs font-bold border transition-all ${
                                    isLight ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200' : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
                                }`}
                            >
                                Ver guía de gestión operativa
                            </Link>
                        </div>
                    </div>

                    {/* Mockup del seguimiento en celular */}
                    <div className="lg:col-span-5 flex justify-center items-center relative">
                        <div className={`absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full blur-[80px] pointer-events-none ${isLight ? 'bg-[#0284C7]/20' : 'bg-[#19B5FE]/20'}`} />
                        <div className="relative z-10 max-w-[280px] sm:max-w-[320px] md:max-w-[340px] drop-shadow-2xl">
                            <Image
                                src="/images/MockupVinzer_comprimido.webp"
                                alt="Seguimiento en vivo de la cremación de una mascota en el celular de la familia"
                                width={360}
                                height={720}
                                priority
                                className="w-full h-auto object-contain drop-shadow-2xl"
                            />
                            <div
                                className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full border backdrop-blur-md shadow-xl text-[11px] font-bold tracking-wide whitespace-nowrap flex items-center gap-2 ${
                                    isLight ? 'bg-white/90 border-slate-200 text-slate-800' : 'bg-black/80 border-[#19B5FE]/40 text-white'
                                }`}
                            >
                                <Smartphone size={13} className="text-[#19B5FE]" />
                                Seguimiento en vivo para la familia
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="relative max-w-6xl mx-auto px-4 sm:px-6 pb-20 z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <article className={`lg:col-span-8 space-y-14 leading-relaxed text-sm sm:text-base ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        {/* Resumen rápido */}
                        <section id="resumen" className={`p-6 rounded-2xl border scroll-mt-28 ${card}`}>
                            <h2 className={`text-base font-black uppercase tracking-wider mb-4 flex items-center gap-2 ${strong}`}>
                                <Sparkles size={16} className="text-amber-500" /> Resumen rápido
                            </h2>
                            <ul className="space-y-2.5">
                                {RESUMEN.map((r) => (
                                    <li key={r} className="flex items-start gap-2.5 text-sm">
                                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                        <span>{r}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        {/* 1. Qué es y por qué importa */}
                        <section id="que-es" className="space-y-5 scroll-mt-28">
                            <SectionTitle isLight={isLight} icon={<AlertTriangle size={20} />} color="bg-amber-500/10 border-amber-500/20 text-amber-500">
                                1. ¿Qué es la cadena de custodia y por qué importa en un crematorio de mascotas?
                            </SectionTitle>
                            <p>
                                La <strong className={strong}>cadena de custodia</strong> es el registro continuo de dónde está la mascota y quién
                                es responsable de ella, desde que el crematorio la recibe hasta que la familia recibe sus cenizas.
                            </p>
                            <p>
                                Cuando una familia despide a su perro o gato, su mayor temor es la incertidumbre:{' '}
                                <em>¿son realmente las cenizas de mi mascota?, ¿fue un servicio individual?</em> Un crematorio que puede
                                mostrar evidencia de cada etapa responde esas preguntas antes de que se conviertan en un reclamo.
                            </p>
                            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-amber-50/70 border-amber-200 text-slate-800' : 'bg-[#071120] border-amber-500/20 text-slate-300'}`}>
                                <h3 className={`text-sm font-bold flex items-center gap-2 mb-2 ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>
                                    <Scale size={16} /> Lo que arriesga un crematorio sin trazabilidad
                                </h3>
                                <ul className="space-y-2 text-xs sm:text-sm list-disc list-inside">
                                    <li>Daño a su reputación en redes sociales y reseñas.</li>
                                    <li>Pérdida de la confianza de las veterinarias que le derivan servicios.</li>
                                    <li>Reclamos difíciles de responder sin evidencia ordenada.</li>
                                </ul>
                            </div>
                        </section>

                        {/* 2. Protocolo en 5 etapas */}
                        <section id="protocolo" className={`space-y-6 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<ShieldCheck size={20} />} color="bg-[#19B5FE]/10 border-[#19B5FE]/20 text-[#19B5FE]">
                                2. Protocolo de trazabilidad para crematorios de mascotas en 5 etapas
                            </SectionTitle>
                            <p>
                                Cada etapa combina una <strong className={strong}>buena práctica en planta</strong> con lo que registra el
                                software. La tecnología ordena la evidencia, pero la disciplina del equipo es la que la genera.
                            </p>
                            {ETAPAS.map((e) => (
                                <EtapaCard key={e.id} etapa={e} isLight={isLight} />
                            ))}
                        </section>

                        {/* 3. Reclamos */}
                        <section id="reclamos" className={`space-y-5 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<MessageSquareWarning size={20} />} color="bg-emerald-500/10 border-emerald-500/20 text-emerald-500">
                                3. Cómo responder ante un reclamo con evidencia
                            </SectionTitle>
                            <p>
                                Si una familia o una veterinaria aliada expresa una duda, no hace falta buscar papeles: abre la orden del
                                servicio y revisa los datos de recepción, las fotografías y el avance por etapas con su fecha y hora.
                                Puedes compartir el mismo enlace de seguimiento que ve la familia para mostrar el historial completo.
                            </p>
                            <p>
                                Para que esa evidencia sea confiable, protégela: usa los <strong className={strong}>roles y permisos</strong>{' '}
                                de Vinzer para limitar quién puede editar o eliminar registros, y asigna el rol de auditor (solo lectura)
                                a quien deba revisar sin modificar.
                            </p>
                        </section>

                        {/* 4. Checklist */}
                        <section id="checklist" className={`space-y-5 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<ListChecks size={20} />} color="bg-purple-500/10 border-purple-500/20 text-purple-500">
                                4. Checklist de trazabilidad para tu crematorio
                            </SectionTitle>
                            <ul className={`p-6 rounded-2xl border space-y-3 ${card}`}>
                                {CHECKLIST.map((c) => (
                                    <li key={c} className="flex items-start gap-2.5 text-sm">
                                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                        <span>{c}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        {/* Enlace a la guía de gestión */}
                        <section
                            className={`p-7 rounded-2xl border space-y-4 ${
                                isLight ? 'bg-sky-50/70 border-sky-200 text-slate-800' : 'bg-gradient-to-br from-[#071120] to-[#0a1b33] border-[#19B5FE]/25 text-white'
                            }`}
                        >
                            <span className={`text-[10px] font-black uppercase tracking-widest block ${isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'}`}>
                                Siguiente lectura
                            </span>
                            <h2 className={`text-xl font-bold ${strong}`}>La trazabilidad empieza con una operación ordenada</h2>
                            <p className={`text-xs sm:text-sm leading-relaxed ${muted}`}>
                                Recepción sin papel, formulario online para familias e inventario de urnas: revisa la guía de{' '}
                                <Link href={GESTION_HREF} className={linkCls}>gestión operativa para crematorios de mascotas</Link>.
                            </p>
                        </section>

                        {/* 5. FAQ */}
                        <section id="faqs" className={`space-y-6 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<Users size={20} />} color="bg-sky-500/10 border-sky-500/20 text-sky-500">
                                5. Preguntas frecuentes sobre trazabilidad y cremación de mascotas
                            </SectionTitle>
                            <VinzerGuideAccordion items={GUIA_TRAZABILIDAD_FAQ} theme={theme} />
                            <p className="text-sm">
                                ¿Quieres ver qué incluye cada plan? Revisa la{' '}
                                <Link href="/comparar-planes" className={linkCls}>comparación de planes de Vinzer</Link>{' '}
                                o vuelve al <Link href="/guias" className={linkCls}>índice de guías</Link>.
                            </p>
                        </section>
                    </article>

                    {/* Barra lateral */}
                    <aside className="lg:col-span-4 hidden lg:block">
                        <VinzerGuideTOC items={TOC_ITEMS} theme={theme} />

                        <div
                            className={`mt-6 p-6 rounded-2xl border text-center space-y-3 ${
                                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-gradient-to-b from-[#071120] to-[#020210] border-white/10'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto ${isLight ? 'bg-sky-50 text-[#0284C7]' : 'bg-[#19B5FE]/10 text-[#19B5FE]'}`}>
                                <CheckCircle2 size={20} />
                            </div>
                            <h3 className={`text-sm font-bold ${strong}`}>¿Quieres ver el seguimiento en vivo?</h3>
                            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                Te mostramos en una demo cómo se registra cada etapa y qué ve la familia en su celular.
                            </p>
                            <a
                                href="/#demo"
                                className={`block w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md ${
                                    isLight ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-sky-600/20' : 'bg-[#19B5FE] hover:bg-[#0e9ce0] text-[#020210] shadow-[#19B5FE]/20'
                                }`}
                            >
                                Agendar demo guiada
                            </a>
                        </div>
                    </aside>
                </div>
            </main>

            <div className="relative z-10">
                <VinzerMemorialBanner theme={theme} />
            </div>

            <VinzerFooter theme={theme} />
        </div>
    );
}
