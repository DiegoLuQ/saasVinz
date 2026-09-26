'use client';

import React from 'react';
import Link from 'next/link';
import {
    Globe,
    ArrowRight,
    CheckCircle2,
    ChevronRight,
    Clock,
    Sparkles,
    MessageCircle,
    ListOrdered,
    PartyPopper,
    Bell,
    Share2,
    Lightbulb,
    HelpCircle,
} from 'lucide-react';

import { VinzerNavbar } from './VinzerNavbar';
import { VinzerFooter } from './VinzerFooter';
import { VinzerGuideTOC, TOCItem } from './VinzerGuideTOC';
import { VinzerGuideAccordion } from './VinzerGuideAccordion';
import { VinzerMemorialBanner } from './VinzerMemorialBanner';
import { useVinzerTheme, formatFecha, SectionTitle } from './guide-shared';
import { GUIA_FORMULARIO_FAQ, GUIA_FORMULARIO_SEO } from '@/lib/vinzer/guia-formulario-online';

const TRAZABILIDAD_HREF = '/guias/software-trazabilidad-cadena-custodia-crematorios-mascotas';
const GESTION_HREF = '/guias/sistema-gestion-operativa-automatizacion-crematorio-mascotas';

const TOC_ITEMS: TOCItem[] = [
    { id: 'resumen', label: 'Resumen rápido' },
    { id: 'por-que', label: '1. Por qué un formulario y no solo WhatsApp' },
    { id: 'pasos', label: '2. Los 5 pasos del formulario' },
    { id: 'familia-al-enviar', label: '3. Qué recibe la familia al enviar' },
    { id: 'crematorio', label: '4. Qué recibe el crematorio' },
    { id: 'formas-compartir', label: '5. 4 formas de compartir el formulario' },
    { id: 'buenas-practicas', label: '6. Buenas prácticas' },
    { id: 'faqs', label: '7. Preguntas frecuentes' },
];

const RESUMEN = [
    'La familia ingresa sus datos, los de su mascota, el servicio, fotos y una dedicatoria desde el celular.',
    'Al enviar recibe un código y un enlace para seguir el servicio en vivo.',
    'El crematorio recibe una notificación y convierte la solicitud en cliente, mascota y servicios sin volver a digitar.',
    'Puedes compartirlo por WhatsApp, con un enlace permanente, por veterinaria o incrustado en tu sitio web (ULTRA).',
];

const PASOS = [
    { nombre: 'Familia', texto: 'Nombre, teléfono y cómo prefiere que la contacten (WhatsApp o llamada). Lugar de retiro de la mascota y dirección donde se entregarán las cenizas, con región y comuna. Opcionalmente, un código de servicio y comentarios.' },
    { nombre: 'Ángel', texto: 'Los datos de la mascota: nombre, especie, tamaño o peso aproximado y edad.' },
    { nombre: 'Camino', texto: 'El plan y los servicios que ofrece tu crematorio, para que la familia elija cómo honrar a su mascota.' },
    { nombre: 'Recuerdos', texto: 'Hasta 3 fotografías y una dedicatoria de hasta 500 caracteres, que luego puedes usar en el certificado y el memorial.' },
    { nombre: 'Resumen', texto: 'La familia revisa toda la información, corrige lo que necesite y confirma el envío.' },
];

const FORMAS = [
    { forma: 'Enlace temporal', uso: 'Enviar caso a caso por WhatsApp', detalle: 'Vence a los 3 días.' },
    { forma: 'Enlace permanente', uso: 'Sitio web, redes sociales o un QR impreso', detalle: 'No vence.' },
    { forma: 'Enlace por veterinaria', uso: 'Derivaciones de clínicas aliadas', detalle: 'La solicitud queda asociada a la veterinaria.' },
    { forma: 'Incrustado en tu web', uso: 'Formulario dentro de tu propio sitio', detalle: 'Plan ULTRA. Solo en tus dominios autorizados.' },
];

const PRACTICAS = [
    'Responde apenas llegue la notificación: la familia está pasando por un momento difícil.',
    'Usa el enlace temporal para cada caso por WhatsApp y el permanente en tu web y redes.',
    'Mantén tu catálogo de planes y servicios al día: es lo que la familia ve en el paso "Camino".',
    'Confirma siempre con la familia si el servicio es individual o colectivo.',
    'Invita a subir una foto: sirve para identificar a la mascota y para su homenaje.',
];

export function GuiaFormularioOnlineClient() {
    const { theme, isLight, toggleTheme } = useVinzerTheme();

    const strong = isLight ? 'text-slate-900' : 'text-white';
    const muted = isLight ? 'text-slate-600' : 'text-slate-300';
    const card = isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#071120] border-white/10';
    const sectionBorder = isLight ? 'border-slate-200' : 'border-white/10';
    const accent = isLight ? 'text-emerald-700' : 'text-emerald-400';
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
                <div className={`absolute top-[5%] left-[10%] w-[500px] h-[500px] blur-[170px] rounded-full ${isLight ? 'bg-emerald-300/15 opacity-60' : 'bg-emerald-500/10'}`} />
                <div className={`absolute top-[15%] right-[5%] w-[450px] h-[450px] blur-[180px] rounded-full ${isLight ? 'bg-sky-400/15 opacity-60' : 'bg-[#19B5FE]/10'}`} />
            </div>

            <header className="relative pt-32 sm:pt-36 pb-12 sm:pb-16 px-4 sm:px-6 z-10 max-w-6xl mx-auto">
                <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs font-semibold mb-6 flex-wrap">
                    <Link href="/" className={`transition-colors ${isLight ? 'text-slate-500 hover:text-[#0284C7]' : 'text-slate-400 hover:text-[#19B5FE]'}`}>Inicio</Link>
                    <ChevronRight size={13} className={isLight ? 'text-slate-300' : 'text-slate-600'} />
                    <Link href="/guias" className={`transition-colors ${isLight ? 'text-slate-500 hover:text-[#0284C7]' : 'text-slate-400 hover:text-[#19B5FE]'}`}>Guías B2B</Link>
                    <ChevronRight size={13} className={isLight ? 'text-slate-300' : 'text-slate-600'} />
                    <span className={`font-bold ${accent}`}>Formulario de cremación online</span>
                </nav>

                <div
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border mb-5 ${
                        isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                    }`}
                >
                    <Globe size={14} /> Atención a familias
                </div>

                <h1 className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.15] max-w-4xl ${strong}`}>
                    {GUIA_FORMULARIO_SEO.headline}
                </h1>

                <p className={`mt-6 text-base sm:text-lg max-w-3xl leading-relaxed ${muted}`}>
                    Un <strong className={strong}>formulario de cremación de mascotas online</strong> permite que la familia
                    envíe su solicitud completa —datos, dirección de retiro, servicio elegido y fotografías— sin largas
                    conversaciones por teléfono. En esta guía verás cómo funciona, qué recibe cada parte y cuándo usar
                    cada forma de compartirlo.
                </p>

                <p className={`mt-4 text-xs font-semibold flex items-center gap-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    <Clock size={13} />
                    <span>
                        Actualizado el <time dateTime={GUIA_FORMULARIO_SEO.dateModified}>{formatFecha(GUIA_FORMULARIO_SEO.dateModified)}</time> · Equipo Vinzer
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
                        {/* Resumen */}
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

                        {/* 1. Por qué */}
                        <section id="por-que" className="space-y-5 scroll-mt-28">
                            <SectionTitle isLight={isLight} icon={<MessageCircle size={20} />} color="bg-rose-500/10 border-rose-500/20 text-rose-500">
                                1. ¿Por qué recibir solicitudes con un formulario y no solo por WhatsApp?
                            </SectionTitle>
                            <p>
                                WhatsApp es el primer contacto natural de una familia que acaba de perder a su mascota, pero coordinar
                                un servicio completo por chat significa muchos mensajes de ida y vuelta: faltan datos, se pierden
                                direcciones y alguien del equipo tiene que transcribir todo a mano.
                            </p>
                            <p>
                                Un formulario ordena esa conversación: la familia responde una sola vez, a su ritmo, y el crematorio
                                recibe la información completa y lista para trabajar. WhatsApp sigue siendo útil, ahora para enviar el
                                enlace y acompañar.
                            </p>
                        </section>

                        {/* 2. Pasos */}
                        <section id="pasos" className={`space-y-6 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<ListOrdered size={20} />} color="bg-emerald-500/10 border-emerald-500/20 text-emerald-500">
                                2. ¿Qué pide el formulario? Los 5 pasos
                            </SectionTitle>
                            <p>
                                El formulario de Vinzer acompaña a la familia con una frase en cada paso y muestra su avance. Si cierra
                                la página, puede retomar donde quedó en el mismo dispositivo.
                            </p>
                            <ol className="space-y-4">
                                {PASOS.map((p, i) => (
                                    <li key={p.nombre} className={`flex gap-4 p-5 rounded-2xl border ${card}`}>
                                        <span
                                            className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-sm font-black ${
                                                isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            }`}
                                        >
                                            {i + 1}
                                        </span>
                                        <div>
                                            <h3 className={`font-bold ${strong}`}>{p.nombre}</h3>
                                            <p className="text-sm mt-1">{p.texto}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </section>

                        {/* 3. Familia al enviar */}
                        <section id="familia-al-enviar" className={`space-y-5 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<PartyPopper size={20} />} color="bg-amber-500/10 border-amber-500/20 text-amber-500">
                                3. ¿Qué recibe la familia al enviar la solicitud?
                            </SectionTitle>
                            <ul className={`p-6 rounded-2xl border space-y-3 ${card}`}>
                                {[
                                    'Un código de solicitud para identificar su caso al hablar con el crematorio.',
                                    'Un enlace de seguimiento en vivo, que puede copiar o compartir por WhatsApp.',
                                    'Si subió una fotografía, una tarjeta de homenaje con la dedicatoria, lista para descargar.',
                                    'Los próximos pasos: revisión de la solicitud y contacto por el medio que eligió.',
                                ].map((t) => (
                                    <li key={t} className="flex items-start gap-2.5 text-sm">
                                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                        <span>{t}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-sm">
                                El seguimiento es el mismo que describimos en la guía de{' '}
                                <Link href={TRAZABILIDAD_HREF} className={linkCls}>trazabilidad y cadena de custodia</Link>.
                            </p>
                        </section>

                        {/* 4. Crematorio */}
                        <section id="crematorio" className={`space-y-5 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<Bell size={20} />} color="bg-[#19B5FE]/10 border-[#19B5FE]/20 text-[#19B5FE]">
                                4. ¿Qué recibe el crematorio?
                            </SectionTitle>
                            <p>
                                Cada envío genera una <strong className={strong}>notificación en el panel de Vinzer</strong>. Al abrirla, el
                                equipo ve la solicitud completa con sus fotografías y, desde ahí, crea el cliente, la mascota y los
                                servicios con un clic cada uno, sin volver a digitar la información. Luego el servicio sigue el flujo
                                normal descrito en la guía de{' '}
                                <Link href={GESTION_HREF} className={linkCls}>gestión operativa</Link>.
                            </p>
                        </section>

                        {/* 5. Formas de compartir */}
                        <section id="formas-compartir" className={`space-y-5 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<Share2 size={20} />} color="bg-purple-500/10 border-purple-500/20 text-purple-500">
                                5. 4 formas de compartir el formulario
                            </SectionTitle>
                            <div className={`overflow-x-auto rounded-2xl border ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#071120]'}`}>
                                <table className="w-full text-left text-xs sm:text-sm">
                                    <caption className="sr-only">Formas de compartir el formulario de cremación online y cuándo usar cada una</caption>
                                    <thead className={`uppercase font-mono text-[10px] tracking-wider border-b ${isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#0a1829] text-slate-400 border-white/10'}`}>
                                        <tr>
                                            <th scope="col" className="p-3.5 sm:p-4">Forma</th>
                                            <th scope="col" className="p-3.5 sm:p-4">Ideal para</th>
                                            <th scope="col" className="p-3.5 sm:p-4">Detalle</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-white/5'}`}>
                                        {FORMAS.map((f) => (
                                            <tr key={f.forma}>
                                                <th scope="row" className={`p-3.5 sm:p-4 font-bold ${strong}`}>{f.forma}</th>
                                                <td className="p-3.5 sm:p-4">{f.uso}</td>
                                                <td className={`p-3.5 sm:p-4 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{f.detalle}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-emerald-50/60 border-emerald-200' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                                <h3 className={`font-bold mb-1.5 ${strong}`}>El formulario dentro de tu sitio web</h3>
                                <p className="text-sm">
                                    En el plan ULTRA puedes mostrar el formulario en tu propia web: pegas un fragmento de código en una
                                    página existente o publicas una página completa, por ejemplo en <em>form.tu-crematorio.cl</em>. El
                                    formulario solo se muestra en los dominios que autorices y ajusta su alto automáticamente. La
                                    información llega igual a tu panel de Vinzer.
                                </p>
                            </div>
                        </section>

                        {/* 6. Buenas prácticas */}
                        <section id="buenas-practicas" className={`space-y-5 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<Lightbulb size={20} />} color="bg-amber-500/10 border-amber-500/20 text-amber-500">
                                6. Buenas prácticas para recibir solicitudes online
                            </SectionTitle>
                            <ul className={`p-6 rounded-2xl border space-y-3 ${card}`}>
                                {PRACTICAS.map((t) => (
                                    <li key={t} className="flex items-start gap-2.5 text-sm">
                                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                        <span>{t}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        {/* 7. FAQ */}
                        <section id="faqs" className={`space-y-6 scroll-mt-28 border-t pt-10 ${sectionBorder}`}>
                            <SectionTitle isLight={isLight} icon={<HelpCircle size={20} />} color="bg-sky-500/10 border-sky-500/20 text-sky-500">
                                7. Preguntas frecuentes sobre el formulario de cremación online
                            </SectionTitle>
                            <VinzerGuideAccordion items={GUIA_FORMULARIO_FAQ} theme={theme} />
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
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto ${isLight ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                <Globe size={20} />
                            </div>
                            <h3 className={`text-sm font-bold ${strong}`}>¿Quieres probar el formulario?</h3>
                            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                Te mostramos en una demo cómo lo ve la familia y cómo llega la solicitud a tu panel.
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
