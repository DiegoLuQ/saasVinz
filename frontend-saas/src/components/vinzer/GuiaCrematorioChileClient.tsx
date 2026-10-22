'use client';

import React from 'react';
import Link from 'next/link';
import {
    Heart,
    ArrowRight,
    CheckCircle2,
    ChevronRight,
    Clock,
    Sparkles,
    Flame,
    Layers,
    ListOrdered,
    Wallet,
    ShieldCheck,
    MapPin,
    LifeBuoy,
    Scale,
    Flower2,
    HelpCircle,
    Building2,
    ExternalLink,
} from 'lucide-react';

import { VinzerNavbar } from './VinzerNavbar';
import { VinzerFooter } from './VinzerFooter';
import { VinzerGuideTOC, TOCItem } from './VinzerGuideTOC';
import { VinzerGuideAccordion } from './VinzerGuideAccordion';
import { VinzerMemorialBanner } from './VinzerMemorialBanner';
import { useVinzerTheme, formatFecha, SectionTitle } from './guide-shared';
import { GUIA_CREMATORIO_CHILE_FAQ, GUIA_CREMATORIO_CHILE_SEO } from '@/lib/vinzer/guia-crematorio-chile';

const TRAZABILIDAD_HREF = '/guias/software-trazabilidad-cadena-custodia-crematorios-mascotas';
const SEGUIMIENTO_HREF = '/guias/seguimiento-cremacion-mascotas-en-linea';

const LEY_21020_URL = 'https://nuevo.leychile.cl/navegar?idNorma=1106037';
const CODIGO_SANITARIO_URL = 'https://www.leychile.cl/navegar?idNorma=5595';

const TOC_ITEMS: TOCItem[] = [
    { id: 'resumen', label: 'Resumen rápido' },
    { id: 'que-es', label: '1. Qué es un crematorio de mascotas' },
    { id: 'tipos', label: '2. Tipos de cremación' },
    { id: 'como-funciona', label: '3. Cómo funciona la cremación' },
    { id: 'precio', label: '4. Cuánto cuesta' },
    { id: 'como-elegir', label: '5. Cómo elegir un crematorio confiable' },
    { id: 'donde', label: '6. Dónde encontrar crematorios' },
    { id: 'que-hacer', label: '7. Qué hacer cuando fallece una mascota' },
    { id: 'normativa', label: '8. Qué dice la normativa chilena' },
    { id: 'recuerdo', label: '9. Conservar un recuerdo' },
    { id: 'faqs', label: '10. Preguntas frecuentes' },
    { id: 'para-crematorios', label: '¿Tienes un crematorio?' },
];

const RESUMEN = [
    'La cremación individual suele incluir la devolución de las cenizas; la colectiva normalmente no.',
    'El precio depende de la ciudad, el peso, la modalidad, el retiro y los recuerdos que elijas.',
    'Pide siempre por escrito qué incluye el servicio, los plazos y cómo se identifica a tu mascota.',
    'Un buen crematorio puede explicarte cada etapa y mostrarte su trazabilidad.',
];

const ANIMALES = [
    'Perros de diferentes tamaños.',
    'Gatos.',
    'Conejos y otros pequeños animales de compañía.',
    'Otras especies, previa consulta al establecimiento.',
];

const TIPOS = [
    {
        titulo: 'Cremación individual',
        texto: 'El servicio se contrata para una mascota de manera individual, con procedimientos destinados a mantener su identificación durante el proceso. Generalmente contempla la entrega de las cenizas a la familia, según las condiciones contratadas.',
        tip: 'Pregunta cómo se identifica a tu mascota, qué controles se usan y qué documento se entrega al finalizar.',
    },
    {
        titulo: 'Cremación colectiva',
        texto: 'Contempla el tratamiento conjunto de varias mascotas, de acuerdo con el procedimiento del proveedor. Habitualmente no incluye la devolución individualizada de las cenizas.',
        tip: 'Puede ser una alternativa para quienes no desean conservar las cenizas. Confirma las condiciones antes de contratar.',
    },
    {
        titulo: 'Con entrega de cenizas y recuerdos',
        texto: 'Algunos proveedores suman ánforas de distintos materiales, placas con el nombre, certificados de cremación, fotografías conmemorativas, recuerdos personalizados y entrega a domicilio.',
        tip: 'Pueden venir en un plan o contratarse por separado. Revisa siempre qué incluye el precio final.',
    },
];

const PASOS = [
    { t: 'Contacto con el crematorio', d: 'La familia informa el fallecimiento, indica la ubicación y consulta alternativas, precios, horarios y detalles del retiro.' },
    { t: 'Retiro o recepción de la mascota', d: 'Si el servicio lo contempla, el equipo coordina el retiro desde el domicilio o la clínica. Pregunta por horarios, cobertura y costos de traslado.' },
    { t: 'Identificación y registro', d: 'Un servicio organizado explica cómo registra la recepción y cómo mantiene la identificación de tu mascota en cada etapa.' },
    { t: 'Realización de la cremación', d: 'Se realiza según la modalidad contratada. La duración varía según el tamaño, el equipamiento y la organización del servicio.' },
    { t: 'Preparación y entrega de las cenizas', d: 'Si el servicio incluye devolución, el proveedor informa cómo se preparan, qué recipiente se usa y cuándo estarán disponibles.' },
    { t: 'Cierre del servicio', d: 'Verifica qué documentación recibes, cómo se confirma el término y a quién contactar si tienes dudas.' },
];

const FACTORES_PRECIO = [
    { t: 'Peso de la mascota', d: 'algunos proveedores establecen categorías según el tamaño.' },
    { t: 'Tipo de cremación', d: 'individual o colectiva.' },
    { t: 'Retiro y traslado', d: 'domicilio, clínica veterinaria y distancia recorrida.' },
    { t: 'Ánfora y recuerdos', d: 'materiales, diseños y personalización.' },
    { t: 'Documentación', d: 'certificados y comprobantes incluidos.' },
    { t: 'Entrega', d: 'retiro en el establecimiento o despacho a domicilio, cuando esté disponible.' },
];

const CONDICIONES_ESCRITO = [
    'Modalidad de cremación contratada.',
    'Precio y servicios incluidos.',
    'Retiro y entrega.',
    'Plazo estimado.',
    'Documentación que recibirás.',
    'Procedimiento para resolver consultas o reclamos.',
];

const REGIONES = [
    {
        titulo: 'Crematorio de mascotas en Santiago y la Región Metropolitana',
        texto: 'Consulta si el proveedor realiza retiros a domicilio, trabaja con clínicas veterinarias y ofrece cremación individual o colectiva. Pregunta también por los plazos de entrega de cenizas y los costos de traslado entre comunas.',
    },
    {
        titulo: 'Crematorio de mascotas en el norte de Chile',
        texto: 'En ciudades como Arica, Iquique, Alto Hospicio, Antofagasta y Calama, confirma la cobertura geográfica antes de contratar. Si el proveedor está en otra comuna, pregunta por traslados interurbanos, su costo y cómo se coordina la recepción.',
    },
    {
        titulo: 'Crematorio de mascotas en el centro y sur de Chile',
        texto: "En las regiones de Valparaíso, O'Higgins, Maule, Biobío, La Araucanía, Los Ríos y Los Lagos, comienza la búsqueda por ciudad o región y verifica que el proveedor atienda efectivamente tu localidad.",
    },
];

const PASOS_FALLECIMIENTO = [
    'Contacta a tu veterinario si tienes dudas sobre el fallecimiento o necesitas orientación.',
    'Consulta las alternativas de cremación y las condiciones de cada servicio.',
    'Confirma si el proveedor realiza retiro o requiere recepción en sus instalaciones.',
    'Pregunta por la modalidad de cremación, los plazos y la documentación.',
    'Sigue las instrucciones del veterinario o del proveedor para mantener el cuerpo en condiciones adecuadas hasta el traslado.',
];

const SOFTWARE_BENEFICIOS = [
    'Código único y evidencia fotográfica en cada etapa del servicio.',
    'Enlace de seguimiento en línea para que la familia vea el avance.',
    'Formulario online, certificados y memoriales digitales.',
];

export function GuiaCrematorioChileClient() {
    const { theme, isLight, toggleTheme } = useVinzerTheme();

    const strong = isLight ? 'text-slate-900' : 'text-white';
    const muted = isLight ? 'text-slate-600' : 'text-slate-300';
    const card = isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#071120] border-white/10';
    const sectionBorder = isLight ? 'border-slate-200' : 'border-white/10';
    const accent = isLight ? 'text-rose-700' : 'text-rose-400';
    const linkCls = `font-bold underline underline-offset-4 transition-colors ${
        isLight ? 'text-[#0284C7] decoration-[#0284C7]/40 hover:text-slate-900' : 'text-[#19B5FE] decoration-[#19B5FE]/40 hover:text-white'
    }`;
    const primaryBtn = isLight
        ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-sky-600/25'
        : 'bg-[#19B5FE] hover:bg-[#0e9ce0] text-[#020210] shadow-[#19B5FE]/25';
    const numberBadge = (color: 'rose' | 'emerald') =>
        color === 'rose'
            ? isLight ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            : isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';

    return (
        <div
            className={`min-h-screen transition-colors duration-500 font-sans relative overflow-hidden ${
                isLight
                    ? 'bg-slate-50 text-slate-900 selection:bg-[#0284C7]/20 selection:text-slate-900'
                    : 'bg-[#020210] text-white selection:bg-[#19B5FE]/30 selection:text-white'
            }`}
        >
            <VinzerNavbar theme={theme} toggleTheme={toggleTheme} />

            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none z-0 overflow-hidden">
                <div className={`absolute top-[5%] left-[10%] w-[500px] h-[500px] blur-[170px] rounded-full ${isLight ? 'bg-rose-300/15 opacity-60' : 'bg-rose-500/10'}`} />
                <div className={`absolute top-[15%] right-[5%] w-[450px] h-[450px] blur-[180px] rounded-full ${isLight ? 'bg-sky-400/15 opacity-60' : 'bg-[#19B5FE]/10'}`} />
            </div>

            <header className="relative pt-32 sm:pt-36 pb-12 sm:pb-16 px-4 sm:px-6 z-10 max-w-6xl mx-auto">
                <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs font-semibold mb-6 flex-wrap">
                    <Link href="/" className={`transition-colors ${isLight ? 'text-slate-500 hover:text-[#0284C7]' : 'text-slate-400 hover:text-[#19B5FE]'}`}>Inicio</Link>
                    <ChevronRight size={13} className={isLight ? 'text-slate-300' : 'text-slate-600'} />
                    <Link href="/guias" className={`transition-colors ${isLight ? 'text-slate-500 hover:text-[#0284C7]' : 'text-slate-400 hover:text-[#19B5FE]'}`}>Guías</Link>
                    <ChevronRight size={13} className={isLight ? 'text-slate-300' : 'text-slate-600'} />
                    <span className={`font-bold ${accent}`}>Crematorio de mascotas en Chile</span>
                </nav>

                <div
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border mb-5 ${
                        isLight ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                    }`}
                >
                    <Heart size={14} /> Guía para familias
                </div>

                <h1 className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.15] max-w-4xl ${strong}`}>
                    {GUIA_CREMATORIO_CHILE_SEO.headline}
                </h1>

                <p className={`mt-6 text-base sm:text-lg max-w-3xl leading-relaxed ${muted}`}>
                    Perder a una mascota significa despedirse de un compañero que formó parte de nuestra vida, nuestras
                    rutinas y nuestra familia. Un <strong className={strong}>crematorio de mascotas en Chile</strong> puede
                    ofrecer una alternativa respetuosa para despedir a perros, gatos y otros animales de compañía. En esta
                    guía te explicamos cómo funciona la cremación, qué diferencias hay entre los servicios y qué consultar
                    antes de contratar.
                </p>

                <p className={`mt-4 text-xs font-semibold flex items-center gap-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    <Clock size={13} />
                    <span>
                        Actualizado el <time dateTime={GUIA_CREMATORIO_CHILE_SEO.dateModified}>{formatFecha(GUIA_CREMATORIO_CHILE_SEO.dateModified)}</time> · Equipo Vinzer
                    </span>
                </p>

                {/* Aviso B2B: quien llega buscando ayuda para su crematorio ve de inmediato que Vinzer es software. */}
                <a
                    href="#para-crematorios"
                    className={`mt-8 flex items-start sm:items-center gap-3 max-w-3xl p-4 rounded-2xl border text-sm transition-colors ${
                        isLight ? 'bg-sky-50 border-sky-200 text-slate-700 hover:border-sky-300' : 'bg-[#19B5FE]/5 border-[#19B5FE]/20 text-slate-300 hover:border-[#19B5FE]/40'
                    }`}
                >
                    <Building2 size={18} className={`shrink-0 mt-0.5 sm:mt-0 ${isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'}`} />
                    <span>
                        <strong className={strong}>¿Tienes un crematorio de mascotas?</strong> Vinzer es el software de
                        gestión para crematorios: trazabilidad, seguimiento en línea para las familias, certificados y más.
                    </span>
                    <ArrowRight size={16} className={`shrink-0 hidden sm:block ${isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'}`} />
                </a>
            </header>

            <main className="relative max-w-6xl mx-auto px-4 sm:px-6 pb-20 z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <article className={`lg:col-span-8 space-y-14 leading-relaxed text-sm sm:text-base ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
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

                        {/* 1 */}
                        <section id="que-es" className="space-y-5 scroll-mt-28">
                            <SectionTitle isLight={isLight} icon={<Flame size={20} />} color="bg-rose-500/10 border-rose-500/20 text-rose-500">
                                1. ¿Qué es un crematorio de mascotas?
                            </SectionTitle>
                            <p>
                                Un crematorio de mascotas es un establecimiento o servicio especializado en la cremación de animales
                                de compañía fallecidos. Su finalidad es ofrecer una alternativa para el tratamiento de sus restos y,
                                en determinados servicios, permitir que sus familias conserven las cenizas como recuerdo.
                            </p>
                            <p>
                                Dependiendo del proveedor, el servicio puede incluir el retiro de la mascota desde el domicilio o una
                                clínica veterinaria, su traslado, la cremación, la entrega de cenizas y un certificado del servicio.
                                No todos los crematorios ofrecen las mismas prestaciones: antes de contratar, pregunta qué incluye cada
                                alternativa y cómo se realiza el proceso.
                            </p>

                            <h3 className={`text-lg font-bold pt-2 ${strong}`}>¿Qué animales pueden ser cremados?</h3>
                            <p>La disponibilidad depende de cada proveedor y de sus instalaciones. Algunos servicios reciben:</p>
                            <ul className={`p-6 rounded-2xl border space-y-3 ${card}`}>
                                {ANIMALES.map((t) => (
                                    <li key={t} className="flex items-start gap-2.5 text-sm">
                                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                        <span>{t}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-sm">Al solicitar información, indica la especie, el peso aproximado y la ciudad donde necesitas el servicio.</p>

                            <h3 className={`text-lg font-bold pt-2 ${strong}`}>¿Por qué elegir un servicio de cremación?</h3>
                            <p>
                                La cremación puede ser una alternativa para las familias que desean conservar las cenizas de su
                                mascota, elegir un ánfora o contar con un recuerdo conmemorativo. También puede facilitar el traslado
                                cuando el servicio incluye coordinación con clínicas veterinarias y retiro a domicilio. La decisión
                                depende de las preferencias de cada familia y de las opciones disponibles en su localidad.
                            </p>
                        </section>

                        {/* 2 */}
                        <section id="tipos" className={`space-y-6 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<Layers size={20} />} color="bg-violet-500/10 border-violet-500/20 text-violet-500">
                                2. Tipos de cremación de mascotas en Chile
                            </SectionTitle>
                            <p>
                                Los nombres comerciales pueden variar entre proveedores, por lo que conviene confirmar por escrito qué
                                ofrece cada uno. Estas son las modalidades más habituales:
                            </p>
                            <div className="space-y-4">
                                {TIPOS.map((tipo, i) => (
                                    <div key={tipo.titulo} className={`p-5 sm:p-6 rounded-2xl border ${card}`}>
                                        <h3 className={`text-lg font-bold ${strong}`}>{i + 1}. {tipo.titulo}</h3>
                                        <p className="text-sm mt-2">{tipo.texto}</p>
                                        <p className={`text-sm mt-3 pl-3 border-l-2 ${isLight ? 'border-rose-300 text-slate-600' : 'border-rose-500/40 text-slate-400'}`}>
                                            {tipo.tip}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 3 */}
                        <section id="como-funciona" className={`space-y-5 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<ListOrdered size={20} />} color="bg-emerald-500/10 border-emerald-500/20 text-emerald-500">
                                3. ¿Cómo funciona la cremación de una mascota?
                            </SectionTitle>
                            <p>El procedimiento varía entre establecimientos, pero normalmente se organiza en estas etapas:</p>
                            <ol className="space-y-4">
                                {PASOS.map((item, i) => (
                                    <li key={item.t} className={`flex gap-4 p-5 rounded-2xl border ${card}`}>
                                        <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-sm font-black ${numberBadge('emerald')}`}>
                                            {i + 1}
                                        </span>
                                        <div>
                                            <h3 className={`font-bold ${strong}`}>{item.t}</h3>
                                            <p className="text-sm mt-1">{item.d}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </section>

                        {/* 4 */}
                        <section id="precio" className={`space-y-5 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<Wallet size={20} />} color="bg-amber-500/10 border-amber-500/20 text-amber-500">
                                4. ¿Cuánto cuesta la cremación de una mascota en Chile?
                            </SectionTitle>
                            <p>
                                El precio puede variar según la ciudad, el peso del animal, la modalidad de cremación y los servicios
                                adicionales contratados. Estos son los factores que más influyen:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {FACTORES_PRECIO.map((f) => (
                                    <div key={f.t} className={`p-5 rounded-2xl border ${card}`}>
                                        <h3 className={`font-bold ${strong}`}>{f.t}</h3>
                                        <p className="text-sm mt-1 first-letter:uppercase">{f.d}</p>
                                    </div>
                                ))}
                            </div>
                            <h3 className={`text-lg font-bold pt-2 ${strong}`}>¿Cómo comparar presupuestos?</h3>
                            <p>
                                Solicita al menos dos cotizaciones y comprueba que ambas incluyan los mismos servicios. Pregunta si el
                                valor publicado corresponde al precio final, si existen cobros por retiro, si la entrega de cenizas
                                está incluida y cuánto demora el proceso.
                            </p>
                            <p>
                                No elijas únicamente por el precio. La claridad de las condiciones, la identificación de la mascota y
                                la confianza que transmite el proveedor también son factores importantes.
                            </p>
                        </section>

                        {/* 5 */}
                        <section id="como-elegir" className={`space-y-5 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<ShieldCheck size={20} />} color="bg-[#19B5FE]/10 border-[#19B5FE]/20 text-[#19B5FE]">
                                5. ¿Cómo elegir un crematorio de mascotas confiable?
                            </SectionTitle>

                            <h3 className={`text-lg font-bold ${strong}`}>Verifica sus antecedentes y condiciones de funcionamiento</h3>
                            <p>
                                Pregunta por la identificación de la empresa, sus instalaciones, los permisos o autorizaciones que
                                correspondan a su actividad y la documentación disponible. En Chile, la normativa aplicable debe
                                revisarse según el tipo de instalación y servicio (ver la <a href="#normativa" className={linkCls}>sección de normativa</a>).
                            </p>

                            <h3 className={`text-lg font-bold pt-2 ${strong}`}>Consulta cómo funciona la trazabilidad</h3>
                            <p>
                                La trazabilidad permite registrar y seguir las etapas relevantes del servicio. Antes de contratar una
                                cremación individual, pregunta cómo identifican a la mascota al recibirla, cómo registran los cambios
                                de etapa y qué información pueden entregar a la familia.
                            </p>
                            <p>
                                Un proveedor puede utilizar registros internos, comprobantes, fotografías u otros mecanismos. Algunos
                                crematorios ofrecen incluso un{' '}
                                <Link href={SEGUIMIENTO_HREF} className={linkCls}>seguimiento en línea</Link> donde la familia ve cada
                                etapa con fotos y fechas. Si quieres saber qué es una buena{' '}
                                <Link href={TRAZABILIDAD_HREF} className={linkCls}>cadena de custodia</Link>, revisa nuestra guía.
                            </p>

                            <h3 className={`text-lg font-bold pt-2 ${strong}`}>Revisa las opiniones de otros clientes</h3>
                            <p>
                                Las reseñas ayudan a conocer experiencias sobre la atención, la puntualidad y la comunicación. Busca
                                comentarios de distintas fechas y fíjate en cómo la empresa responde dudas y resuelve inconvenientes.
                            </p>

                            <h3 className={`text-lg font-bold pt-2 ${strong}`}>Solicita las condiciones por escrito</h3>
                            <p>Antes de confirmar, procura tener claridad sobre:</p>
                            <ul className={`p-6 rounded-2xl border space-y-3 ${card}`}>
                                {CONDICIONES_ESCRITO.map((t) => (
                                    <li key={t} className="flex items-start gap-2.5 text-sm">
                                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                        <span>{t}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-sm">
                                La transparencia es especialmente importante cuando la familia atraviesa un momento emocionalmente difícil.
                            </p>
                        </section>

                        {/* 6 */}
                        <section id="donde" className={`space-y-5 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<MapPin size={20} />} color="bg-rose-500/10 border-rose-500/20 text-rose-500">
                                6. ¿Dónde encontrar crematorios de mascotas en Chile?
                            </SectionTitle>
                            <p>
                                La disponibilidad depende de cada región y comuna. Busca proveedores en tu ciudad y confirma
                                directamente su cobertura, sus horarios y las condiciones de atención.
                            </p>
                            <div className="space-y-4">
                                {REGIONES.map((r) => (
                                    <div key={r.titulo} className={`p-5 rounded-2xl border ${card}`}>
                                        <h3 className={`font-bold ${strong}`}>{r.titulo}</h3>
                                        <p className="text-sm mt-1">{r.texto}</p>
                                    </div>
                                ))}
                            </div>
                            <p className="text-sm">
                                No des por hecho que el retiro a domicilio está disponible en todo el territorio.{' '}
                                <strong className={strong}>Consejo:</strong> busca términos como “crematorio de mascotas en [tu ciudad]”,
                                “cremación individual de mascotas en [tu comuna]” o “retiro de mascotas fallecidas en [tu región]”.
                            </p>
                        </section>

                        {/* 7 */}
                        <section id="que-hacer" className={`space-y-5 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<LifeBuoy size={20} />} color="bg-emerald-500/10 border-emerald-500/20 text-emerald-500">
                                7. ¿Qué hacer cuando fallece una mascota?
                            </SectionTitle>
                            <p>Si tu mascota acaba de fallecer, intenta darte el tiempo necesario para tomar una decisión informada.</p>
                            <ol className="space-y-3">
                                {PASOS_FALLECIMIENTO.map((t, i) => (
                                    <li key={t} className={`flex gap-4 items-start p-4 rounded-2xl border ${card}`}>
                                        <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-black ${numberBadge('rose')}`}>
                                            {i + 1}
                                        </span>
                                        <span className="text-sm pt-1.5">{t}</span>
                                    </li>
                                ))}
                            </ol>
                            <p className="text-sm">
                                Si el fallecimiento fue inesperado o existen dudas sobre su causa, consulta con un veterinario antes de
                                autorizar procedimientos que puedan interferir con una evaluación necesaria.
                            </p>
                        </section>

                        {/* 8 */}
                        <section id="normativa" className={`space-y-5 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<Scale size={20} />} color="bg-violet-500/10 border-violet-500/20 text-violet-500">
                                8. ¿Qué dice la normativa chilena sobre la cremación de mascotas?
                            </SectionTitle>
                            <p>
                                Conviene distinguir entre las normas generales sobre tenencia responsable, las exigencias sanitarias
                                aplicables y las reglas específicas que puedan corresponder al establecimiento.
                            </p>
                            <p>
                                La{' '}
                                <a href={LEY_21020_URL} target="_blank" rel="noopener noreferrer" className={linkCls}>
                                    Ley N.º 21.020<ExternalLink size={12} className="inline ml-1 -mt-0.5" />
                                </a>{' '}
                                regula aspectos de la tenencia responsable de mascotas y animales de compañía. Además, el{' '}
                                <a href={CODIGO_SANITARIO_URL} target="_blank" rel="noopener noreferrer" className={linkCls}>
                                    Código Sanitario<ExternalLink size={12} className="inline ml-1 -mt-0.5" />
                                </a>{' '}
                                y las disposiciones sanitarias pertinentes deben revisarse para determinar qué autorizaciones
                                corresponden a una instalación concreta. No se debe asumir que las exigencias para crematorios humanos
                                se aplican automáticamente, en idénticos términos, a todos los servicios para animales.
                            </p>
                            <p>Las reglas municipales y las condiciones de uso de suelo también pueden ser relevantes según la actividad y la comuna.</p>
                            <div className={`p-5 rounded-2xl border text-sm ${card}`}>
                                Si vas a contratar un servicio, pide información sobre sus antecedentes y autorizaciones aplicables.
                                Si deseas abrir un crematorio, consulta directamente con la SEREMI de Salud y la municipalidad
                                correspondientes antes de invertir en instalaciones o equipamiento.
                            </div>
                        </section>

                        {/* 9 */}
                        <section id="recuerdo" className={`space-y-5 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<Flower2 size={20} />} color="bg-rose-500/10 border-rose-500/20 text-rose-500">
                                9. La importancia de conservar un recuerdo de tu mascota
                            </SectionTitle>
                            <p>
                                Cada familia vive la despedida de manera diferente. Para algunas personas, conservar las cenizas es
                                una forma significativa de recordar a su compañero. Otras prefieren un certificado, una fotografía, un
                                objeto conmemorativo o un memorial digital.
                            </p>
                            <p>
                                No existe una única forma correcta de despedirse. Lo importante es conocer las alternativas, tomar una
                                decisión acorde con tus preferencias y sentir que el proceso fue explicado con respeto.
                            </p>
                        </section>

                        {/* 10 FAQ */}
                        <section id="faqs" className={`space-y-6 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<HelpCircle size={20} />} color="bg-sky-500/10 border-sky-500/20 text-sky-500">
                                10. Preguntas frecuentes sobre crematorios de mascotas en Chile
                            </SectionTitle>
                            <VinzerGuideAccordion items={GUIA_CREMATORIO_CHILE_FAQ} theme={theme} />
                        </section>

                        {/* Conclusión */}
                        <section className={`space-y-4 border-t pt-10 ${sectionBorder}`}>
                            <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${strong}`}>
                                Conclusión: una despedida merece respeto y claridad
                            </h2>
                            <p>
                                Encontrar un crematorio de mascotas en Chile implica comparar alternativas, comprender las modalidades
                                disponibles y elegir un proveedor que explique claramente cada etapa del servicio. Antes de decidir,
                                consulta las condiciones, los plazos, los costos y los mecanismos de identificación.
                            </p>
                            <p className={`font-bold ${strong}`}>
                                Porque el vínculo con una mascota no termina en la despedida: permanece en los recuerdos, el cariño y
                                todo lo que compartieron.
                            </p>
                        </section>

                        {/* Bloque B2B */}
                        <section
                            id="para-crematorios"
                            className={`scroll-mt-28 p-6 sm:p-8 rounded-3xl border ${
                                isLight ? 'bg-white border-sky-200 shadow-sm' : 'bg-gradient-to-br from-[#071120] to-[#0a0f1f] border-[#19B5FE]/25'
                            }`}
                        >
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border mb-4 ${
                                isLight ? 'bg-sky-50 border-sky-200 text-[#0284C7]' : 'bg-[#19B5FE]/10 border-[#19B5FE]/25 text-[#19B5FE]'
                            }`}>
                                <Building2 size={13} /> Para crematorios
                            </div>
                            <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${strong}`}>
                                ¿Tienes un crematorio de mascotas? Vinzer es el software para gestionarlo
                            </h2>
                            <p className="mt-3">
                                Vinzer no realiza cremaciones: desarrollamos el <strong className={strong}>software de gestión para
                                crematorios de mascotas</strong> que ayuda a ofrecer exactamente lo que esta guía recomienda pedir.
                            </p>
                            <ul className="mt-5 space-y-2.5">
                                {SOFTWARE_BENEFICIOS.map((b) => (
                                    <li key={b} className="flex items-start gap-2.5 text-sm">
                                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                        <span>{b}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-6 flex flex-wrap items-center gap-4">
                                <a
                                    href="/#demo"
                                    className={`inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full font-black text-xs uppercase tracking-wider transition-all shadow-lg hover:scale-105 active:scale-95 ${primaryBtn}`}
                                >
                                    Solicitar demo guiada <ArrowRight size={15} />
                                </a>
                                <Link href="/guias" className={`text-sm ${linkCls}`}>
                                    Ver guías para crematorios
                                </Link>
                            </div>
                        </section>
                    </article>

                    <aside className="lg:col-span-4 hidden lg:block">
                        <VinzerGuideTOC items={TOC_ITEMS} theme={theme} />
                        <div
                            className={`mt-6 p-6 rounded-2xl border text-center space-y-3 ${
                                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-gradient-to-b from-[#071120] to-[#020210] border-white/10'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto ${isLight ? 'bg-sky-50 text-[#0284C7]' : 'bg-[#19B5FE]/10 text-[#19B5FE]'}`}>
                                <Building2 size={20} />
                            </div>
                            <h3 className={`text-sm font-bold ${strong}`}>¿Eres un crematorio?</h3>
                            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                Vinzer es el software para crematorios de mascotas: trazabilidad, seguimiento para las familias y
                                certificados en un solo lugar.
                            </p>
                            <a
                                href="/#demo"
                                className={`block w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md ${primaryBtn}`}
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
