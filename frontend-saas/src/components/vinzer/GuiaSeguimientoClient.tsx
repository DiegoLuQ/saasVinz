'use client';

import React from 'react';
import Link from 'next/link';
import {
    Smartphone,
    ArrowRight,
    CheckCircle2,
    ChevronRight,
    Clock,
    Sparkles,
    PhoneCall,
    Eye,
    Send,
    Camera,
    BarChart3,
    HelpCircle,
} from 'lucide-react';

import { VinzerNavbar } from './VinzerNavbar';
import { VinzerFooter } from './VinzerFooter';
import { VinzerGuideTOC, TOCItem } from './VinzerGuideTOC';
import { VinzerGuideAccordion } from './VinzerGuideAccordion';
import { VinzerMemorialBanner } from './VinzerMemorialBanner';
import { useVinzerTheme, formatFecha, SectionTitle } from './guide-shared';
import { GUIA_SEGUIMIENTO_FAQ, GUIA_SEGUIMIENTO_SEO } from '@/lib/vinzer/guia-seguimiento';

const TRAZABILIDAD_HREF = '/guias/software-trazabilidad-cadena-custodia-crematorios-mascotas';
const FORMULARIO_HREF = '/guias/formulario-cremacion-mascotas-online';

const TOC_ITEMS: TOCItem[] = [
    { id: 'resumen', label: 'Resumen rápido' },
    { id: 'por-que-llaman', label: '1. Por qué las familias llaman tanto' },
    { id: 'que-ve', label: '2. Qué ve la familia en su enlace' },
    { id: 'como-llega', label: '3. Cómo llega el enlace a la familia' },
    { id: 'que-mostrar', label: '4. Qué mostrar en cada etapa' },
    { id: 'comparativa', label: '5. Sin seguimiento vs. con seguimiento' },
    { id: 'faqs', label: '6. Preguntas frecuentes' },
];

const RESUMEN = [
    'Cada servicio tiene un enlace privado que la familia abre sin cuenta ni contraseña.',
    'La familia ve las etapas, cuál está en curso, el avance y las fotos y comentarios de cada paso.',
    'El enlace llega al enviar el formulario online o desde el panel, por WhatsApp o copiado.',
    'Si pierde el enlace, la familia busca su servicio con el código de 10 caracteres.',
];

const QUE_VE = [
    { titulo: 'Los datos de su mascota', texto: 'Nombre, especie o raza y peso, junto al nombre y logo del crematorio.' },
    { titulo: 'El estado actual y el avance', texto: 'La etapa en curso, el porcentaje de avance y la fecha de la última actualización.' },
    { titulo: 'La línea de tiempo', texto: 'Cada etapa definida por el crematorio, marcada como completada, en curso o pendiente, con su fecha.' },
    { titulo: 'La evidencia de cada etapa', texto: 'Las fotografías y los comentarios que el equipo registró en cada avance.' },
    { titulo: 'Un botón para compartir', texto: 'Para enviar el enlace a otros familiares desde el celular.' },
    { titulo: 'Una tarjeta de recuerdo', texto: 'Con la dedicatoria de la familia y el diseño del crematorio, lista para descargar.' },
];

const MOSTRAR = [
    'Nombra las etapas con palabras que la familia entienda (por ejemplo: "Recibido en el crematorio" en vez de "Ingreso OC").',
    'Elige fotografías respetuosas: la familia verá todo lo que registres en cada etapa.',
    'Escribe comentarios breves y cálidos; son mensajes para una familia en duelo.',
    'Registra cada avance apenas ocurre, para que la fecha de "última actualización" refleje la realidad.',
    'Cuéntale a la familia desde el primer contacto que tendrá un enlace de seguimiento.',
];

const COMPARATIVA = [
    { tema: 'Saber en qué va el servicio', sin: 'Llamar y esperar respuesta', con: 'Abrir el enlace a cualquier hora' },
    { tema: 'Tranquilidad de la familia', sin: 'Incertidumbre entre llamadas', con: 'Etapas con fotos, fechas y comentarios' },
    { tema: 'Tiempo del equipo', sin: 'Interrupciones para responder consultas', con: 'Registrar el avance una vez' },
    { tema: 'Compartir con otros familiares', sin: 'Repetir la información a cada uno', con: 'Reenviar el mismo enlace' },
    { tema: 'Al terminar el servicio', sin: 'Solo la entrega de la urna', con: 'Tarjeta de recuerdo descargable (y homenaje en ULTRA)' },
];

export function GuiaSeguimientoClient() {
    const { theme, isLight, toggleTheme } = useVinzerTheme();

    const strong = isLight ? 'text-slate-900' : 'text-white';
    const muted = isLight ? 'text-slate-600' : 'text-slate-300';
    const card = isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#071120] border-white/10';
    const sectionBorder = isLight ? 'border-slate-200' : 'border-white/10';
    const accent = isLight ? 'text-violet-700' : 'text-violet-400';
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

            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none z-0 overflow-hidden">
                <div className={`absolute top-[5%] left-[10%] w-[500px] h-[500px] blur-[170px] rounded-full ${isLight ? 'bg-violet-300/15 opacity-60' : 'bg-violet-500/10'}`} />
                <div className={`absolute top-[15%] right-[5%] w-[450px] h-[450px] blur-[180px] rounded-full ${isLight ? 'bg-sky-400/15 opacity-60' : 'bg-[#19B5FE]/10'}`} />
            </div>

            <header className="relative pt-32 sm:pt-36 pb-12 sm:pb-16 px-4 sm:px-6 z-10 max-w-6xl mx-auto">
                <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs font-semibold mb-6 flex-wrap">
                    <Link href="/" className={`transition-colors ${isLight ? 'text-slate-500 hover:text-[#0284C7]' : 'text-slate-400 hover:text-[#19B5FE]'}`}>Inicio</Link>
                    <ChevronRight size={13} className={isLight ? 'text-slate-300' : 'text-slate-600'} />
                    <Link href="/guias" className={`transition-colors ${isLight ? 'text-slate-500 hover:text-[#0284C7]' : 'text-slate-400 hover:text-[#19B5FE]'}`}>Guías B2B</Link>
                    <ChevronRight size={13} className={isLight ? 'text-slate-300' : 'text-slate-600'} />
                    <span className={`font-bold ${accent}`}>Seguimiento en línea</span>
                </nav>

                <div
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border mb-5 ${
                        isLight ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-violet-500/10 border-violet-500/25 text-violet-400'
                    }`}
                >
                    <Smartphone size={14} /> Comunicación con familias
                </div>

                <h1 className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.15] max-w-4xl ${strong}`}>
                    {GUIA_SEGUIMIENTO_SEO.headline}
                </h1>

                <p className={`mt-6 text-base sm:text-lg max-w-3xl leading-relaxed ${muted}`}>
                    El <strong className={strong}>seguimiento de la cremación de mascotas en línea</strong> es un enlace privado
                    donde la familia ve, desde su celular, en qué etapa está el servicio de su mascota, con fechas y fotografías.
                    En esta guía verás qué muestra, cómo hacerlo llegar a la familia y qué registrar en cada etapa.
                </p>

                <p className={`mt-4 text-xs font-semibold flex items-center gap-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    <Clock size={13} />
                    <span>
                        Actualizado el <time dateTime={GUIA_SEGUIMIENTO_SEO.dateModified}>{formatFecha(GUIA_SEGUIMIENTO_SEO.dateModified)}</time> · Equipo Vinzer
                    </span>
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4 pt-2">
                    <a
                        href="/#demo"
                        className={`inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full font-black text-xs uppercase tracking-wider transition-all shadow-lg hover:scale-105 active:scale-95 ${
                            isLight ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-sky-600/25' : 'bg-[#19B5FE] hover:bg-[#0e9ce0] text-[#020210] shadow-[#19B5FE]/25'
                        }`}
                    >
                        Solicitar demo guiada <ArrowRight size={15} />
                    </a>
                    <Link
                        href={TRAZABILIDAD_HREF}
                        className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs font-bold border transition-all ${
                            isLight ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200' : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
                        }`}
                    >
                        Ver guía de trazabilidad
                    </Link>
                </div>
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
                        <section id="por-que-llaman" className="space-y-5 scroll-mt-28">
                            <SectionTitle isLight={isLight} icon={<PhoneCall size={20} />} color="bg-rose-500/10 border-rose-500/20 text-rose-500">
                                1. ¿Por qué las familias llaman tanto al crematorio?
                            </SectionTitle>
                            <p>
                                Entregar a una mascota para su cremación es un momento de duelo e incertidumbre. Mientras no reciben
                                noticias, las familias se preguntan dónde está, si ya comenzó el proceso y cuándo podrán recibir sus
                                cenizas. La forma natural de resolverlo es llamar, y cada llamada interrumpe al equipo.
                            </p>
                            <p>
                                Un seguimiento en línea responde esas preguntas antes de que se hagan: la familia sabe dónde mirar y
                                el equipo solo tiene que registrar cada avance una vez.
                            </p>
                        </section>

                        {/* 2 */}
                        <section id="que-ve" className={`space-y-6 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<Eye size={20} />} color="bg-violet-500/10 border-violet-500/20 text-violet-500">
                                2. ¿Qué ve la familia en su enlace de seguimiento?
                            </SectionTitle>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {QUE_VE.map((q) => (
                                    <div key={q.titulo} className={`p-5 rounded-2xl border ${card}`}>
                                        <h3 className={`font-bold ${strong}`}>{q.titulo}</h3>
                                        <p className="text-sm mt-1">{q.texto}</p>
                                    </div>
                                ))}
                            </div>
                            <p className="text-sm">
                                El enlace no requiere cuenta ni contraseña. La página muestra el estado más reciente cada vez que la
                                familia la abre o la recarga. En el plan ULTRA, una vez entregado el servicio, la página se transforma
                                en un espacio de homenaje a la mascota.
                            </p>
                        </section>

                        {/* 3 */}
                        <section id="como-llega" className={`space-y-5 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<Send size={20} />} color="bg-emerald-500/10 border-emerald-500/20 text-emerald-500">
                                3. ¿Cómo llega el enlace de seguimiento a la familia?
                            </SectionTitle>
                            <ol className="space-y-4">
                                {[
                                    { t: 'Al enviar el formulario online', d: <>Si la familia registró la solicitud con el <Link href={FORMULARIO_HREF} className={linkCls}>formulario de cremación online</Link>, recibe su enlace y su código apenas la envía.</> },
                                    { t: 'Desde el panel del crematorio', d: <>El equipo copia el enlace o abre WhatsApp con un mensaje ya redactado para el teléfono del cliente, con un clic.</> },
                                    { t: 'Con el código del servicio', d: <>Si la familia pierde el enlace, lo recupera en la página de seguimiento ingresando el código de 10 caracteres.</> },
                                ].map((item, i) => (
                                    <li key={item.t} className={`flex gap-4 p-5 rounded-2xl border ${card}`}>
                                        <span
                                            className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-sm font-black ${
                                                isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            }`}
                                        >
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
                        <section id="que-mostrar" className={`space-y-5 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<Camera size={20} />} color="bg-amber-500/10 border-amber-500/20 text-amber-500">
                                4. ¿Qué mostrar en cada etapa? Buenas prácticas
                            </SectionTitle>
                            <p>
                                El seguimiento muestra exactamente lo que el equipo registra. Estas prácticas hacen que sea una
                                experiencia de acompañamiento y no solo un informe:
                            </p>
                            <ul className={`p-6 rounded-2xl border space-y-3 ${card}`}>
                                {MOSTRAR.map((t) => (
                                    <li key={t} className="flex items-start gap-2.5 text-sm">
                                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                        <span>{t}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-sm">
                                Para diseñar las etapas y el registro de evidencia paso a paso, revisa la guía de{' '}
                                <Link href={TRAZABILIDAD_HREF} className={linkCls}>trazabilidad y cadena de custodia</Link>.
                            </p>
                        </section>

                        {/* 5 */}
                        <section id="comparativa" className={`space-y-5 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<BarChart3 size={20} />} color="bg-[#19B5FE]/10 border-[#19B5FE]/20 text-[#19B5FE]">
                                5. Sin seguimiento vs. con seguimiento en línea
                            </SectionTitle>
                            <div className={`overflow-x-auto rounded-2xl border ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#071120]'}`}>
                                <table className="w-full text-left text-xs sm:text-sm">
                                    <caption className="sr-only">Comparación entre informar a las familias por teléfono y con seguimiento en línea</caption>
                                    <thead className={`uppercase font-mono text-[10px] tracking-wider border-b ${isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#0a1829] text-slate-400 border-white/10'}`}>
                                        <tr>
                                            <th scope="col" className="p-3.5 sm:p-4">Situación</th>
                                            <th scope="col" className="p-3.5 sm:p-4 text-rose-500 font-bold">Sin seguimiento</th>
                                            <th scope="col" className={`p-3.5 sm:p-4 font-bold ${isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'}`}>Con seguimiento en línea</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-white/5'}`}>
                                        {COMPARATIVA.map((row) => (
                                            <tr key={row.tema}>
                                                <th scope="row" className={`p-3.5 sm:p-4 font-bold ${strong}`}>{row.tema}</th>
                                                <td className="p-3.5 sm:p-4 text-slate-500">{row.sin}</td>
                                                <td className="p-3.5 sm:p-4 text-emerald-500 font-bold">{row.con}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* 6 FAQ */}
                        <section id="faqs" className={`space-y-6 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<HelpCircle size={20} />} color="bg-sky-500/10 border-sky-500/20 text-sky-500">
                                6. Preguntas frecuentes sobre el seguimiento de cremación
                            </SectionTitle>
                            <VinzerGuideAccordion items={GUIA_SEGUIMIENTO_FAQ} theme={theme} />
                            <p className="text-sm">
                                ¿Quieres ver qué incluye cada plan? Revisa la{' '}
                                <Link href="/comparar-planes" className={linkCls}>comparación de planes de Vinzer</Link>{' '}
                                o vuelve al <Link href="/guias" className={linkCls}>índice de guías</Link>.
                            </p>
                        </section>
                    </article>

                    <aside className="lg:col-span-4 hidden lg:block">
                        <VinzerGuideTOC items={TOC_ITEMS} theme={theme} />
                        <div
                            className={`mt-6 p-6 rounded-2xl border text-center space-y-3 ${
                                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-gradient-to-b from-[#071120] to-[#020210] border-white/10'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto ${isLight ? 'bg-violet-50 text-violet-600' : 'bg-violet-500/10 text-violet-400'}`}>
                                <Smartphone size={20} />
                            </div>
                            <h3 className={`text-sm font-bold ${strong}`}>¿Quieres ver lo que ve la familia?</h3>
                            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                Te mostramos en una demo un seguimiento real, desde el registro de una etapa hasta el celular de la familia.
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
