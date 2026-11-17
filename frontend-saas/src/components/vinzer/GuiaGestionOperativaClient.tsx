'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    Cpu,
    Globe,
    Camera,
    Smartphone,
    PackageCheck,
    BarChart3,
    ArrowRight,
    CheckCircle2,
    ChevronRight,
    Clock,
    Layers,
    ClipboardList,
    ListChecks,
    Sparkles,
    Workflow,
    ShieldCheck,
    Users,
    Building2,
} from 'lucide-react';

import { VinzerNavbar } from './VinzerNavbar';
import { VinzerFooter } from './VinzerFooter';
import { VinzerGuideTOC, TOCItem } from './VinzerGuideTOC';
import { VinzerGuideAccordion } from './VinzerGuideAccordion';
import { VinzerMemorialBanner } from './VinzerMemorialBanner';
import { GUIA_GESTION_FAQ, GUIA_GESTION_SEO } from '@/lib/vinzer/guia-gestion-operativa';

const TRAZABILIDAD_HREF = '/guias/software-trazabilidad-cadena-custodia-crematorios-mascotas';

const TOC_ITEMS: TOCItem[] = [
    { id: 'resumen', label: 'Resumen rápido' },
    { id: 'el-reto-operativo', label: '1. Por qué Excel y WhatsApp fallan' },
    { id: 'los-pilares', label: '2. Los 5 pilares en Vinzer' },
    { id: 'pilar-1', label: '• Recepción sin papel en 4 pestañas', level: 3 },
    { id: 'pilar-2', label: '• Solicitudes online de familias', level: 3 },
    { id: 'pilar-3', label: '• Etapas con evidencia fotográfica', level: 3 },
    { id: 'pilar-4', label: '• Seguimiento en vivo', level: 3 },
    { id: 'pilar-5', label: '• Inventario de urnas', level: 3 },
    { id: 'flujo-operativo', label: '3. Flujo operativo de principio a fin' },
    { id: 'tabla-comparativa', label: '4. Excel y WhatsApp vs. Vinzer' },
    { id: 'beneficios', label: '5. Beneficios para el negocio' },
    { id: 'como-implementar', label: '6. Cómo implementarlo en 5 pasos' },
    { id: 'faqs', label: '7. Preguntas frecuentes' },
];

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const formatFecha = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} de ${MESES[m - 1]} de ${y}`;
};

const RESUMEN = [
    'Centraliza cada servicio en una orden con datos de la mascota, del tutor, logística, fotos y detalle comercial.',
    'Deja que las familias y las veterinarias aliadas ingresen la solicitud por su cuenta con un formulario online.',
    'Define tus propias etapas de servicio y registra cada avance con fotografía y comentarios.',
    'Da a cada familia un enlace de seguimiento en vivo y controla el stock de urnas automáticamente.',
];

const FLUJO_ETAPAS = [
    { step: '01', titulo: 'Recepción de solicitud', desc: 'Online o directa en recepción' },
    { step: '02', titulo: 'Registro de mascota', desc: 'Ficha única y datos del tutor' },
    { step: '03', titulo: 'Creación de orden', desc: 'Plan, urna, servicios y código' },
    { step: '04', titulo: 'Coordinación retiro', desc: 'Domicilio o clínica veterinaria' },
    { step: '05', titulo: 'Ingreso a planta', desc: 'Confirmación en operaciones' },
    { step: '06', titulo: 'Avance de etapas', desc: 'Fotos, comentarios y hora' },
    { step: '07', titulo: 'Finalización y PDF', desc: 'Certificado y preparación urna' },
    { step: '08', titulo: 'Entrega a la familia', desc: 'Cierre y tarjeta de recuerdo' },
];

const COMPARATIVA = [
    { indicador: 'Registro de un servicio', antes: 'Ficha en papel y planilla, datos repetidos', ahora: 'Formulario guiado en 4 pestañas con autoguardado' },
    { indicador: 'Solicitudes de familias', antes: 'Llamadas y mensajes de WhatsApp', ahora: 'Formulario online con fotos, servicios y dedicatoria' },
    { indicador: 'Estado de cada servicio', antes: 'Preguntar al operador de turno', ahora: 'Etapas propias con foto, comentario, fecha y hora' },
    { indicador: 'Información para la familia', antes: 'Llamadas constantes al crematorio', ahora: 'Enlace público de seguimiento en vivo' },
    { indicador: 'Stock de urnas', antes: 'Conteo manual y quiebres sorpresa', ahora: 'Descuento automático al agregar el producto a la orden' },
    { indicador: 'Certificado de cremación', antes: 'Diseño manual en Word', ahora: 'PDF generado desde plantilla (desde el plan NORMAL)' },
];

const BENEFICIOS_NEGOCIO = [
    { icon: Layers, title: 'Mayor organización', desc: 'Toda la operación diaria ordenada en un solo panel sin hojas sueltas ni planillas duplicadas.' },
    { icon: ShieldCheck, title: 'Mejor control operativo', desc: 'Trazabilidad clara de quién realizó cada avance, en qué horario y con qué evidencia.' },
    { icon: BarChart3, title: 'Información centralizada', desc: 'Historial de clientes, mascotas, clínicas veterinarias y órdenes accesible por rol.' },
    { icon: Smartphone, title: 'Mejor experiencia familiar', desc: 'Transparencia serena para las familias con seguimiento en vivo y menos llamadas de consulta.' },
    { icon: Building2, title: 'Mayor profesionalización', desc: 'Imagen sólida frente a tutores y clínicas veterinarias aliadas desde el primer contacto.' },
    { icon: Users, title: 'Comunicación entre áreas', desc: 'Recepción, conductores y operadores de planta trabajan sincronizados sobre la misma orden.' },
];

const PASOS = [
    { titulo: 'Define las etapas de tu servicio', texto: 'Configura la secuencia real de tu crematorio (por ejemplo: retiro, recepción, cremación, entrega). Esas mismas etapas son las que verá la familia.' },
    { titulo: 'Carga tu catálogo', texto: 'Registra planes, servicios, urnas y productos con precio de costo, precio de venta y stock disponible.' },
    { titulo: 'Crea los usuarios por rol', texto: 'Recepción, operación, conductor o contabilidad: cada persona ve solo los módulos que necesita.' },
    { titulo: 'Comparte el formulario online', texto: 'Envía el enlace a las familias y crea enlaces propios para tus veterinarias aliadas.' },
    { titulo: 'Registra y avanza las órdenes', texto: 'Cada solicitud se convierte en una orden; el equipo la avanza de etapa dejando evidencia fotográfica.' },
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

function Pilar({ id, tag, tagColor, icon, title, isLight, children }: {
    id: string; tag: string; tagColor: string; icon: React.ReactNode; title: string; isLight: boolean; children: React.ReactNode;
}) {
    return (
        <div id={id} className={`p-6 rounded-2xl border transition-all space-y-3 scroll-mt-28 ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#071120] border-white/10'}`}>
            <div className="flex items-center justify-between">
                <span className={`text-xs font-mono font-bold uppercase tracking-wider ${tagColor}`}>{tag}</span>
                <span className={`p-1.5 rounded-lg ${isLight ? 'bg-slate-100' : 'bg-white/5'} ${tagColor}`}>{icon}</span>
            </div>
            <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{title}</h3>
            <div className={`text-xs sm:text-sm leading-relaxed space-y-2 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{children}</div>
        </div>
    );
}

export function GuiaGestionOperativaClient() {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        try {
            const savedTheme = localStorage.getItem('vinzer-landing-theme') as 'dark' | 'light' | null;
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
                <div className={`absolute top-[5%] right-[10%] w-[500px] h-[500px] blur-[170px] rounded-full ${isLight ? 'bg-amber-300/15 opacity-60' : 'bg-[#E7C15A]/10'}`} />
                <div className={`absolute top-[15%] left-[5%] w-[450px] h-[450px] blur-[180px] rounded-full ${isLight ? 'bg-sky-400/15 opacity-60' : 'bg-[#19B5FE]/10'}`} />
            </div>

            {/* Hero B2B de conversión con mockup real del software */}
            <header className="relative pt-32 sm:pt-36 pb-12 sm:pb-16 px-4 sm:px-6 z-10 max-w-6xl mx-auto">
                <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs font-semibold mb-6 flex-wrap">
                    <Link href="/" className={`transition-colors ${isLight ? 'text-slate-500 hover:text-[#0284C7]' : 'text-slate-400 hover:text-[#19B5FE]'}`}>
                        Inicio
                    </Link>
                    <ChevronRight size={13} className={isLight ? 'text-slate-300' : 'text-slate-600'} />
                    <Link href="/guias" className={`transition-colors ${isLight ? 'text-slate-500 hover:text-[#0284C7]' : 'text-slate-400 hover:text-[#19B5FE]'}`}>
                        Guías
                    </Link>
                    <ChevronRight size={13} className={isLight ? 'text-slate-300' : 'text-slate-600'} />
                    <span className={`font-bold ${isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'}`}>Gestión operativa</span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
                    <div className="lg:col-span-7">
                        <div
                            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border mb-5 ${
                                isLight ? 'bg-sky-50 border-sky-200 text-[#0284C7]' : 'bg-[#19B5FE]/10 border-[#19B5FE]/25 text-[#19B5FE]'
                            }`}
                        >
                            <Cpu size={14} /> Software B2B para crematorios de mascotas
                        </div>

                        <h1 className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.12] ${strong}`}>
                            {GUIA_GESTION_SEO.headline}
                        </h1>

                        <p className={`mt-5 text-base sm:text-lg leading-relaxed ${muted}`}>
                            Deja atrás las planillas y centraliza cada servicio, desde la recepción hasta la entrega de las
                            cenizas: registro guiado, etapas con evidencia, inventario de urnas y seguimiento para las familias.
                        </p>

                        <p className={`mt-4 text-xs font-semibold flex items-center gap-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            <Clock size={13} />
                            <span>
                                Actualizado el <time dateTime={GUIA_GESTION_SEO.dateModified}>{formatFecha(GUIA_GESTION_SEO.dateModified)}</time> · Equipo Vinzer
                            </span>
                        </p>

                        <div className="mt-8 flex flex-wrap items-center gap-4">
                            <a
                                href="/#demo"
                                className={`inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full font-black text-xs uppercase tracking-wider transition-all shadow-lg hover:scale-105 active:scale-95 ${
                                    isLight ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-sky-600/25' : 'bg-[#19B5FE] hover:bg-[#0e9ce0] text-[#020210] shadow-[#19B5FE]/25'
                                }`}
                            >
                                Solicitar una demostración
                                <ArrowRight size={15} />
                            </a>
                            <a
                                href="#los-pilares"
                                className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs font-bold border transition-all ${
                                    isLight ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200' : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
                                }`}
                            >
                                Conocer cómo funciona
                            </a>
                        </div>
                    </div>

                    <div className="lg:col-span-5">
                        <div className={`rounded-3xl border p-3 shadow-2xl ${isLight ? 'bg-white border-slate-200' : 'bg-[#071120] border-[#19B5FE]/20'}`}>
                            <div className="relative rounded-2xl overflow-hidden bg-[#020210]">
                                <Image
                                    src="/images/MockupVinzer_comprimido.webp"
                                    alt="Vista general de la plataforma de gestión operativa Vinzer para crematorios de mascotas"
                                    width={900}
                                    height={620}
                                    priority
                                    className="w-full h-auto object-cover"
                                />
                            </div>
                            <div className="pt-3 px-2 flex items-center justify-between text-[11px]">
                                <span className={isLight ? 'text-slate-500 font-medium' : 'text-slate-400 font-medium'}>
                                    Panel operativo y seguimiento Vinzer
                                </span>
                                <Link href="/tour" className={`font-bold ${isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'} hover:underline`}>
                                    Ver tour →
                                </Link>
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

                        {/* 1. El reto operativo */}
                        <section id="el-reto-operativo" className="space-y-5 scroll-mt-28">
                            <SectionTitle isLight={isLight} icon={<Clock size={20} />} color="bg-rose-500/10 border-rose-500/20 text-rose-500">
                                1. ¿Por qué el Excel y WhatsApp dejan de funcionar en un crematorio de mascotas?
                            </SectionTitle>
                            <p>
                                Mientras hay pocos servicios, una planilla y un grupo de WhatsApp alcanzan. Cuando el volumen crece,
                                la información queda repartida: recepción anota en un lugar, los conductores coordinan por mensajes,
                                el equipo de planta pregunta qué sigue y las familias llaman para saber en qué estado está su mascota.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
                                {[
                                    { tag: 'Información repartida', color: 'text-rose-500', title: 'Datos duplicados', text: 'La misma ficha se escribe en papel, en Excel y en el chat, con errores al copiar.' },
                                    { tag: 'Familias sin respuesta', color: 'text-amber-500', title: 'Llamadas constantes', text: 'Sin un canal de seguimiento, cada consulta interrumpe al equipo.' },
                                    { tag: 'Bodega a ciegas', color: 'text-purple-500', title: 'Quiebres de stock', text: 'Urnas que se agotan sin aviso a mitad de un servicio.' },
                                ].map((c) => (
                                    <div key={c.tag} className={`p-4 rounded-xl border space-y-1 ${card}`}>
                                        <div className={`text-xs font-mono font-bold uppercase ${c.color}`}>{c.tag}</div>
                                        <div className={`text-lg font-black ${strong}`}>{c.title}</div>
                                        <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{c.text}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 2. Los 5 pilares */}
                        <section id="los-pilares" className={`space-y-6 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<Layers size={20} />} color="bg-amber-500/10 border-amber-500/20 text-amber-500">
                                2. Los 5 pilares de una operación ordenada
                            </SectionTitle>
                            <p>
                                Un <strong className={strong}>sistema para crematorios de mascotas</strong> debe resolver cinco frentes a la vez.
                                Así los cubre <strong className={strong}>Vinzer</strong>:
                            </p>

                            <Pilar isLight={isLight} id="pilar-1" tag="Pilar 01 • Recepción" tagColor="text-emerald-500" icon={<ClipboardList size={18} />} title="Recepción sin papel: una orden en 4 pestañas">
                                <p>
                                    Cada servicio se registra en un formulario guiado que evita la doble digitación:{' '}
                                    <strong className={strong}>Angelito</strong> (mascota y tutor),{' '}
                                    <strong className={strong}>Logística</strong> (fecha y hora de retiro programado, peso estimado y dirección de entrega),{' '}
                                    <strong className={strong}>Evidencia</strong> (notas internas y hasta 3 fotografías) y{' '}
                                    <strong className={strong}>Comercial</strong> (planes, servicios, urnas y productos con el total de la orden).
                                </p>
                                <p>El formulario guarda borradores automáticamente, así que una interrupción no borra el trabajo.</p>
                            </Pilar>

                            <Pilar isLight={isLight} id="pilar-2" tag="Pilar 02 • Solicitudes online" tagColor={isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'} icon={<Globe size={18} />} title="Formulario online para familias y veterinarias aliadas">
                                <p>
                                    La familia puede ingresar la solicitud de cremación por su cuenta desde el celular: sus datos, los de su
                                    mascota, los servicios que elige, fotografías y una dedicatoria. El crematorio comparte un enlace
                                    temporal o permanente, y cada veterinaria aliada tiene su propio enlace para derivar servicios.
                                </p>
                                <p>En el plan ULTRA, el mismo formulario se puede incrustar en el sitio web del crematorio.</p>
                            </Pilar>

                            <Pilar isLight={isLight} id="pilar-3" tag="Pilar 03 • Planta" tagColor="text-amber-500" icon={<Camera size={18} />} title="Etapas del servicio con evidencia fotográfica">
                                <p>
                                    Cada crematorio define sus propias etapas (retiro, recepción, cremación, entrega o las que use). Desde el
                                    panel de Operaciones el equipo ve qué órdenes están pendientes y avanza cada una dejando una fotografía y
                                    comentarios, con fecha y hora registradas. El resultado es un historial completo de cada servicio.
                                </p>
                            </Pilar>

                            <Pilar isLight={isLight} id="pilar-4" tag="Pilar 04 • Familias" tagColor="text-sky-500" icon={<Smartphone size={18} />} title="Seguimiento en vivo para la familia">
                                <p>
                                    Cada orden tiene un enlace público de seguimiento. La familia ve en qué etapa está el servicio de su mascota,
                                    con la fotografía y los comentarios de cada avance, sin crear cuentas ni contraseñas. Menos llamadas para
                                    el equipo y más tranquilidad para quien está pasando por un momento difícil.
                                </p>
                            </Pilar>

                            <Pilar isLight={isLight} id="pilar-5" tag="Pilar 05 • Bodega" tagColor="text-purple-500" icon={<PackageCheck size={18} />} title="Inventario de urnas y catálogo en PDF">
                                <p>
                                    Cada producto (urnas, relicarios, accesorios) tiene stock, precio de costo y precio de venta. Al agregarlo a
                                    una orden, las existencias se descuentan solas. El catálogo completo de productos y servicios se puede
                                    descargar en PDF para compartirlo con familias y veterinarias.
                                </p>
                            </Pilar>
                        </section>

                        {/* 3. Flujo Operativo Visual */}
                        <section id="flujo-operativo" className={`space-y-6 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<Workflow size={20} />} color="bg-[#19B5FE]/10 border-[#19B5FE]/20 text-[#19B5FE]">
                                3. Flujo operativo completo: de principio a fin
                            </SectionTitle>
                            <p>
                                Así se conecta cada área del crematorio dentro de Vinzer para mantener control desde el primer contacto
                                hasta la entrega final:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                                {FLUJO_ETAPAS.map((etapa) => (
                                    <div
                                        key={etapa.step}
                                        className={`p-4 rounded-2xl border relative flex flex-col justify-between gap-2 ${card}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-md ${
                                                isLight ? 'bg-sky-50 text-[#0284C7]' : 'bg-[#19B5FE]/10 text-[#19B5FE]'
                                            }`}>
                                                {etapa.step}
                                            </span>
                                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                        </div>
                                        <div>
                                            <h3 className={`text-sm font-bold ${strong}`}>{etapa.titulo}</h3>
                                            <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{etapa.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 4. Tabla comparativa */}
                        <section id="tabla-comparativa" className={`space-y-5 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<BarChart3 size={20} />} color="bg-[#19B5FE]/10 border-[#19B5FE]/20 text-[#19B5FE]">
                                4. Excel y WhatsApp vs. un software para crematorios de mascotas
                            </SectionTitle>
                            <div className={`overflow-x-auto rounded-2xl border ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#071120]'}`}>
                                <table className="w-full text-left text-xs sm:text-sm">
                                    <caption className="sr-only">Comparación entre la gestión con Excel y WhatsApp y la gestión con Vinzer</caption>
                                    <thead className={`uppercase font-mono text-[10px] tracking-wider border-b ${isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#0a1829] text-slate-400 border-white/10'}`}>
                                        <tr>
                                            <th scope="col" className="p-3.5 sm:p-4">Tarea</th>
                                            <th scope="col" className="p-3.5 sm:p-4 text-rose-500 font-bold">Excel y WhatsApp</th>
                                            <th scope="col" className={`p-3.5 sm:p-4 font-bold ${isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'}`}>Con Vinzer</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-white/5'}`}>
                                        {COMPARATIVA.map((row) => (
                                            <tr key={row.indicador}>
                                                <th scope="row" className={`p-3.5 sm:p-4 font-bold ${strong}`}>{row.indicador}</th>
                                                <td className="p-3.5 sm:p-4 text-slate-500">{row.antes}</td>
                                                <td className="p-3.5 sm:p-4 text-emerald-500 font-bold">{row.ahora}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* 5. Beneficios para el negocio */}
                        <section id="beneficios" className={`space-y-6 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<Sparkles size={20} />} color="bg-emerald-500/10 border-emerald-500/20 text-emerald-500">
                                5. Beneficios concretos para tu crematorio
                            </SectionTitle>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {BENEFICIOS_NEGOCIO.map((b) => {
                                    const Icon = b.icon;
                                    return (
                                        <div key={b.title} className={`p-5 rounded-2xl border space-y-2 ${card}`}>
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                                isLight ? 'bg-sky-50 text-[#0284C7]' : 'bg-[#19B5FE]/10 text-[#19B5FE]'
                                            }`}>
                                                <Icon size={18} />
                                            </div>
                                            <h3 className={`text-sm font-bold ${strong}`}>{b.title}</h3>
                                            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{b.desc}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* 6. Cómo implementar */}
                        <section id="como-implementar" className={`space-y-6 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<ListChecks size={20} />} color="bg-emerald-500/10 border-emerald-500/20 text-emerald-500">
                                6. Cómo implementar un software de gestión en tu crematorio en 5 pasos
                            </SectionTitle>
                            <ol className="space-y-4">
                                {PASOS.map((p, i) => (
                                    <li key={p.titulo} className="flex gap-4">
                                        <span
                                            className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-black ${
                                                isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            }`}
                                        >
                                            {i + 1}
                                        </span>
                                        <div>
                                            <h3 className={`font-bold ${strong}`}>{p.titulo}</h3>
                                            <p className="text-sm mt-1">{p.texto}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </section>

                        {/* Enlace a la guía de trazabilidad */}
                        <section
                            className={`p-7 rounded-2xl border space-y-4 ${
                                isLight ? 'bg-amber-50/70 border-amber-200 text-slate-800' : 'bg-gradient-to-br from-[#071120] to-[#0a1b33] border-[#E7C15A]/25 text-white'
                            }`}
                        >
                            <span className={`text-[10px] font-black uppercase tracking-widest block ${isLight ? 'text-amber-700' : 'text-[#E7C15A]'}`}>
                                Siguiente lectura
                            </span>
                            <h2 className={`text-xl font-bold ${strong}`}>Orden operativo y confianza van de la mano</h2>
                            <p className={`text-xs sm:text-sm leading-relaxed ${muted}`}>
                                Una operación ordenada es la base para demostrar a las familias que su mascota fue tratada con respeto.
                                Revisa cómo construir un{' '}
                                <Link href={TRAZABILIDAD_HREF} className={linkCls}>protocolo de trazabilidad y cadena de custodia</Link>{' '}
                                con registro fotográfico y seguimiento para la familia.
                            </p>
                        </section>

                        {/* 7. FAQ */}
                        <section id="faqs" className={`space-y-6 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<Cpu size={20} />} color="bg-sky-500/10 border-sky-500/20 text-sky-500">
                                7. Preguntas frecuentes sobre la gestión operativa de un crematorio de mascotas
                            </SectionTitle>
                            <VinzerGuideAccordion items={GUIA_GESTION_FAQ} theme={theme} />
                            <p className="text-sm">
                                ¿Quieres ver qué incluye cada plan? Revisa la{' '}
                                <Link href="/comparar-planes" className={linkCls}>comparación de planes de Vinzer</Link>{' '}
                                o vuelve al <Link href="/guias" className={linkCls}>índice de guías</Link>.
                            </p>
                        </section>

                        {/* CTA Final B2B */}
                        <section
                            className={`p-7 sm:p-9 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-6 ${
                                isLight ? 'bg-sky-50 border-sky-200' : 'bg-gradient-to-r from-[#071120] to-[#0b1b36] border-[#19B5FE]/30'
                            }`}
                        >
                            <div className="space-y-2">
                                <h2 className={`text-xl sm:text-2xl font-black ${strong}`}>
                                    Profesionaliza la gestión de tu crematorio.
                                </h2>
                                <p className={`text-xs sm:text-sm max-w-xl ${muted}`}>
                                    Centraliza tus operaciones, organiza tus servicios y ofrece una experiencia más transparente a las
                                    familias con Vinzer.
                                </p>
                            </div>
                            <a
                                href="/#demo"
                                className={`shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg ${
                                    isLight ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white' : 'bg-[#19B5FE] hover:bg-[#0e9ce0] text-[#020210]'
                                }`}
                            >
                                Solicitar una demostración <ArrowRight size={15} />
                            </a>
                        </section>
                    </article>

                    {/* Barra lateral: índice + CTA */}
                    <aside className="lg:col-span-4 hidden lg:block">
                        <VinzerGuideTOC items={TOC_ITEMS} theme={theme} />

                        <div
                            className={`mt-6 p-6 rounded-2xl border text-center space-y-3 ${
                                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-gradient-to-b from-[#071120] to-[#020210] border-white/10'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto ${isLight ? 'bg-amber-50 text-amber-600' : 'bg-[#E7C15A]/10 text-[#E7C15A]'}`}>
                                <CheckCircle2 size={20} />
                            </div>
                            <h3 className={`text-sm font-bold ${strong}`}>¿Tu operación calza con Vinzer?</h3>
                            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                Revisemos juntos tu flujo actual y cómo se vería con etapas, formulario online y seguimiento para familias.
                            </p>
                            <a
                                href="/#demo"
                                className={`block w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md ${
                                    isLight ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-sky-600/20' : 'bg-[#19B5FE] hover:bg-[#0e9ce0] text-[#020210] shadow-[#19B5FE]/20'
                                }`}
                            >
                                Solicitar demo guiada
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
