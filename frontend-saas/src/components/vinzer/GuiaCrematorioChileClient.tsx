'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    Heart,
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
    ExternalLink,
    Check,
    ArrowRight,
    Award,
    Camera,
    FileText,
    BookOpen,
} from 'lucide-react';

import { VinzerNavbar } from './VinzerNavbar';
import { VinzerFooter } from './VinzerFooter';
import { VinzerGuideTOC, TOCItem } from './VinzerGuideTOC';
import { VinzerGuideAccordion } from './VinzerGuideAccordion';
import { formatFecha } from './guide-shared';
import { GUIA_CREMATORIO_CHILE_FAQ, GUIA_CREMATORIO_CHILE_SEO } from '@/lib/vinzer/guia-crematorio-chile';

const TRAZABILIDAD_HREF = '/guias/software-trazabilidad-cadena-custodia-crematorios-mascotas';
const SEGUIMIENTO_HREF = '/guias/seguimiento-cremacion-mascotas-en-linea';

const LEY_21020_URL = 'https://nuevo.leychile.cl/navegar?idNorma=1106037';
const CODIGO_SANITARIO_URL = 'https://www.leychile.cl/navegar?idNorma=5595';

const TOC_ITEMS: TOCItem[] = [
    { id: 'resumen', label: 'Resumen rápido' },
    { id: 'que-es', label: '1. Qué es un crematorio de mascotas' },
    { id: 'tipos', label: '2. Cremación individual vs. colectiva' },
    { id: 'como-funciona', label: '3. Cómo funciona el proceso' },
    { id: 'precio', label: '4. Cuánto cuesta en Chile' },
    { id: 'como-elegir', label: '5. Checklist: crematorio confiable' },
    { id: 'trazabilidad', label: '6. La importancia de la trazabilidad' },
    { id: 'donde', label: '7. Dónde encontrar crematorios' },
    { id: 'que-hacer', label: '8. Qué hacer cuando fallece tu mascota' },
    { id: 'normativa', label: '9. Normativa chilena' },
    { id: 'recuerdo', label: '10. Cómo conservar el recuerdo' },
    { id: 'faqs', label: '11. Preguntas frecuentes' },
];

const RESUMEN = [
    'La cremación individual suele incluir la devolución de las cenizas; la colectiva normalmente no.',
    'El precio depende de la ciudad, el peso, la modalidad, el retiro y los recuerdos que elijas.',
    'Pide siempre por escrito qué incluye el servicio, los plazos y cómo se identifica a tu mascota.',
    'Un buen crematorio puede explicarte cada etapa y mostrarte su trazabilidad con respeto.',
];

const ANIMALES = [
    'Perros de diferentes tamaños.',
    'Gatos.',
    'Conejos y otros pequeños animales de compañía.',
    'Otras especies, previa consulta al establecimiento.',
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
    { factor: 'Peso o tamaño de la mascota', impacto: 'Principal determinante', detalle: 'Muchos proveedores establecen tramos por peso (ej. pequeño, mediano, grande, gigante).' },
    { factor: 'Modalidad de cremación', impacto: 'Alto', detalle: 'Individual (con devolución de cenizas) suele tener mayor valor que colectiva.' },
    { factor: 'Retiro y traslado', impacto: 'Variable', detalle: 'Depende de si se retira en domicilio, clínica veterinaria y la distancia entre comunas.' },
    { factor: 'Ánfora o urna', impacto: 'Opcional / Incluido', detalle: 'Madera, cerámica, metal o diseños personalizados según el plan elegido.' },
    { factor: 'Recuerdos y certificados', impacto: 'Opcional / Incluido', detalle: 'Placas grabadas, huellas, fotografías o memorial digital.' },
    { factor: 'Ubicación geográfica', impacto: 'Regional', detalle: 'La oferta y costos logísticos varían entre Santiago, norte, centro y sur del país.' },
];

const CHECKLIST_CONFIABLE = [
    { id: 'id', q: '¿Identifican correctamente a la mascota desde el retiro o recepción?' },
    { id: 'proc', q: '¿Explican con claridad el procedimiento individual o colectivo?' },
    { id: 'traz', q: '¿Informan sobre la trazabilidad o registro de etapas del servicio?' },
    { id: 'doc', q: '¿Entregan documentación o certificado al finalizar?' },
    { id: 'plazos', q: '¿Explican los plazos estimados de entrega de las cenizas?' },
    { id: 'cond', q: '¿Permiten conocer por escrito las condiciones y el precio final sin cobros ocultos?' },
];

const TRAZABILIDAD_ETAPAS = [
    'Recepción',
    'Identificación',
    'Registro',
    'Proceso',
    'Finalización',
    'Entrega',
];

const RECUERDOS_OPCIONES = [
    { icon: Flower2, titulo: 'Urnas conmemorativas', texto: 'De madera, cerámica o materiales biodegradables pensadas para el hogar.' },
    { icon: Award, titulo: 'Placas personalizadas', texto: 'Con su nombre, fechas significativas o una frase de despedida.' },
    { icon: Camera, titulo: 'Fotografías y retratos', texto: 'Imágenes físicas o digitales que preserven sus mejores momentos.' },
    { icon: Sparkles, titulo: 'Recuerdos digitales', texto: 'Santuarios en línea donde familiares y amigos dejan dedicatorias.' },
    { icon: Heart, titulo: 'Huellas conmemorativas', texto: 'Moldes en yeso o impresiones de su patita como recuerdo tangible.' },
    { icon: FileText, titulo: 'Certificado de cremación', texto: 'Documento formal que acredita la realización y modalidad del servicio.' },
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
    'Consulta las alternativas de cremación y las condiciones de cada servicio sin apuros innecesarios.',
    'Confirma si el proveedor realiza retiro o requiere recepción en sus instalaciones.',
    'Pregunta por la modalidad de cremación, los plazos y la documentación.',
    'Sigue las instrucciones del veterinario o del proveedor para mantener el cuerpo en condiciones adecuadas hasta el traslado.',
];

function WarmSectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3.5">
            <span className="p-2.5 rounded-xl bg-[#F0EAE0] border border-[#C6A56A]/35 text-[#5B493D] shrink-0">
                {icon}
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-[#292522]">
                {children}
            </h2>
        </div>
    );
}

export function GuiaCrematorioChileClient() {
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

    const toggleCheck = (id: string) => {
        setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const checkedCount = Object.values(checkedItems).filter(Boolean).length;

    return (
        <div className="min-h-screen bg-[#FAF8F3] text-[#292522] selection:bg-[#C6A56A]/25 selection:text-[#292522] font-sans relative overflow-hidden">
            {/* Navbar en modo claro para integrarse con la estética cálida */}
            <VinzerNavbar theme="light" />

            {/* Halo cálido sumamente sutil */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[420px] pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[6%] left-[12%] w-[420px] h-[420px] blur-[150px] rounded-full bg-[#C6A56A]/15 opacity-70" />
                <div className="absolute top-[12%] right-[8%] w-[360px] h-[360px] blur-[150px] rounded-full bg-[#F0EAE0] opacity-90" />
            </div>

            <header className="relative pt-32 sm:pt-36 pb-10 sm:pb-14 px-4 sm:px-6 z-10 max-w-6xl mx-auto">
                <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs font-medium mb-6 flex-wrap text-[#77716A]">
                    <Link href="/" className="hover:text-[#5B493D] transition-colors">Inicio</Link>
                    <ChevronRight size={13} className="text-[#C6A56A]" />
                    <Link href="/guias" className="hover:text-[#5B493D] transition-colors">Guías</Link>
                    <ChevronRight size={13} className="text-[#C6A56A]" />
                    <span className="font-semibold text-[#5B493D]">Crematorio de mascotas en Chile</span>
                </nav>

                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide border border-[#C6A56A]/40 bg-[#F0EAE0] text-[#5B493D] mb-5">
                    <Heart size={13} className="text-[#C6A56A]" /> Guía informativa para familias
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold tracking-tight leading-[1.15] max-w-4xl text-[#292522]">
                    {GUIA_CREMATORIO_CHILE_SEO.headline}
                </h1>

                <p className="mt-6 text-base sm:text-lg max-w-3xl leading-relaxed text-[#5B493D]">
                    Perder a una mascota significa despedirse de un compañero que formó parte de nuestra vida, nuestras
                    rutinas y nuestra familia. Conocer las opciones de cremación, los factores de precio y cómo elegir un
                    servicio respetuoso puede darte calma para tomar una decisión informada.
                </p>

                <p className="mt-4 text-xs font-medium flex items-center gap-2 text-[#77716A]">
                    <Clock size={13} className="text-[#C6A56A]" />
                    <span>
                        Actualizado el <time dateTime={GUIA_CREMATORIO_CHILE_SEO.dateModified}>{formatFecha(GUIA_CREMATORIO_CHILE_SEO.dateModified)}</time> · Guía editorial Vinzer
                    </span>
                </p>
            </header>

            <main className="relative max-w-6xl mx-auto px-4 sm:px-6 pb-24 z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
                    <article className="lg:col-span-8 space-y-14 leading-relaxed text-sm sm:text-base text-[#292522]/90">
                        {/* Resumen rápido */}
                        <section id="resumen" className="p-6 sm:p-7 rounded-2xl border border-[#C6A56A]/35 bg-[#F0EAE0]/65 scroll-mt-28">
                            <h2 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2 text-[#5B493D]">
                                <Sparkles size={16} className="text-[#C6A56A]" /> En pocas palabras
                            </h2>
                            <ul className="space-y-2.5">
                                {RESUMEN.map((r) => (
                                    <li key={r} className="flex items-start gap-2.5 text-sm text-[#292522]">
                                        <CheckCircle2 size={16} className="text-[#C6A56A] shrink-0 mt-0.5" />
                                        <span>{r}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        {/* 1. Qué es */}
                        <section id="que-es" className="space-y-5 scroll-mt-28">
                            <WarmSectionTitle icon={<Flame size={20} />}>
                                1. ¿Qué es un crematorio de mascotas?
                            </WarmSectionTitle>
                            <p>
                                Un crematorio de mascotas es un establecimiento o servicio especializado en la cremación de animales
                                de compañía fallecidos. Su finalidad es ofrecer una alternativa digna para el tratamiento de sus
                                restos y, en determinados servicios, permitir que sus familias conserven las cenizas como recuerdo.
                            </p>
                            <p>
                                Dependiendo del proveedor, el servicio puede incluir el retiro de la mascota desde el domicilio o una
                                clínica veterinaria, su traslado, la cremación, la entrega de cenizas y un certificado del servicio.
                                No todos los crematorios ofrecen las mismas prestaciones: antes de contratar, tómate un momento para
                                preguntar qué incluye cada alternativa.
                            </p>

                            <h3 className="text-lg font-serif font-bold pt-2 text-[#292522]">¿Qué animales pueden ser cremados?</h3>
                            <p className="text-[#5B493D]">La disponibilidad depende de cada proveedor y de sus instalaciones. Habitualmente reciben:</p>
                            <ul className="p-6 rounded-2xl border border-[#E6DFD5] bg-white space-y-3">
                                {ANIMALES.map((t) => (
                                    <li key={t} className="flex items-start gap-2.5 text-sm">
                                        <CheckCircle2 size={16} className="text-[#C6A56A] shrink-0 mt-0.5" />
                                        <span>{t}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-sm text-[#77716A]">
                                Al solicitar información, indica la especie, el peso aproximado y la ciudad donde necesitas el servicio.
                            </p>
                        </section>

                        {/* 2. Tipos de cremación (Comparativa lado a lado) */}
                        <section id="tipos" className="space-y-6 scroll-mt-28 border-t border-[#E6DFD5] pt-10">
                            <WarmSectionTitle icon={<Layers size={20} />}>
                                2. Tipos de cremación de mascotas en Chile
                            </WarmSectionTitle>
                            <p>
                                Los nombres comerciales pueden variar entre proveedores, por lo que conviene confirmar por escrito qué
                                ofrece cada uno. Estas son las dos modalidades principales:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="p-6 rounded-2xl border border-[#C6A56A]/45 bg-white shadow-sm flex flex-col justify-between">
                                    <div>
                                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#F0EAE0] text-[#5B493D] mb-3">
                                            Con devolución
                                        </span>
                                        <h3 className="text-xl font-serif font-bold text-[#292522]">Cremación individual</h3>
                                        <p className="text-sm text-[#5B493D] mt-2 leading-relaxed">
                                            El servicio se contrata para una sola mascota, con procedimientos destinados a mantener su
                                            identificación durante todo el proceso.
                                        </p>
                                        <ul className="mt-4 space-y-2 text-sm text-[#292522]">
                                            <li className="flex items-start gap-2">
                                                <CheckCircle2 size={15} className="text-[#C6A56A] shrink-0 mt-0.5" />
                                                <span>Recuperación de las cenizas de tu mascota.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle2 size={15} className="text-[#C6A56A] shrink-0 mt-0.5" />
                                                <span>Alternativas de urnas, ánforas y recuerdos.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle2 size={15} className="text-[#C6A56A] shrink-0 mt-0.5" />
                                                <span>Suele incluir certificado de cremación.</span>
                                            </li>
                                        </ul>
                                    </div>
                                    <p className="text-xs mt-5 pt-3 border-t border-[#F0EAE0] text-[#77716A]">
                                        Consulta siempre cómo se identifica a tu mascota y qué documento se entrega al finalizar.
                                    </p>
                                </div>

                                <div className="p-6 rounded-2xl border border-[#E6DFD5] bg-white/80 flex flex-col justify-between">
                                    <div>
                                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FAF8F3] border border-[#E6DFD5] text-[#77716A] mb-3">
                                            Sin devolución individual
                                        </span>
                                        <h3 className="text-xl font-serif font-bold text-[#292522]">Cremación colectiva</h3>
                                        <p className="text-sm text-[#5B493D] mt-2 leading-relaxed">
                                            Contempla el tratamiento conjunto de varias mascotas, de acuerdo con el procedimiento
                                            sanitario del proveedor.
                                        </p>
                                        <ul className="mt-4 space-y-2 text-sm text-[#292522]">
                                            <li className="flex items-start gap-2">
                                                <CheckCircle2 size={15} className="text-[#77716A] shrink-0 mt-0.5" />
                                                <span>Generalmente no contempla devolución de cenizas.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle2 size={15} className="text-[#77716A] shrink-0 mt-0.5" />
                                                <span>Alternativa respetuosa para quienes no buscan conservarlas.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle2 size={15} className="text-[#77716A] shrink-0 mt-0.5" />
                                                <span>Costo habitualmente menor al servicio individual.</span>
                                            </li>
                                        </ul>
                                    </div>
                                    <p className="text-xs mt-5 pt-3 border-t border-[#F0EAE0] text-[#77716A]">
                                        Confirma las condiciones específicas de disposición final antes de contratar.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* 3. Cómo funciona */}
                        <section id="como-funciona" className="space-y-5 scroll-mt-28 border-t border-[#E6DFD5] pt-10">
                            <WarmSectionTitle icon={<ListOrdered size={20} />}>
                                3. ¿Cómo funciona la cremación de una mascota?
                            </WarmSectionTitle>
                            <p>El procedimiento varía entre establecimientos, pero normalmente se organiza en estas etapas:</p>
                            <ol className="space-y-3.5">
                                {PASOS.map((item, i) => (
                                    <li key={item.t} className="flex gap-4 p-5 rounded-2xl border border-[#E6DFD5] bg-white">
                                        <span className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold bg-[#F0EAE0] text-[#5B493D] border border-[#C6A56A]/40">
                                            {i + 1}
                                        </span>
                                        <div>
                                            <h3 className="font-bold text-[#292522]">{item.t}</h3>
                                            <p className="text-sm text-[#5B493D] mt-1">{item.d}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </section>

                        {/* 4. Precios en Chile */}
                        <section id="precio" className="space-y-5 scroll-mt-28 border-t border-[#E6DFD5] pt-10">
                            <WarmSectionTitle icon={<Wallet size={20} />}>
                                4. ¿Cuánto cuesta la cremación de una mascota en Chile?
                            </WarmSectionTitle>
                            <p>
                                No existe una tarifa única nacional: el precio cambia según la región, el peso de la mascota y lo
                                que incluya el servicio. Esta tabla resume los factores que explican las diferencias de presupuesto:
                            </p>
                            <div className="overflow-x-auto rounded-2xl border border-[#E6DFD5] bg-white">
                                <table className="w-full text-left text-xs sm:text-sm">
                                    <thead className="bg-[#F0EAE0]/70 text-[#5B493D] text-[11px] uppercase tracking-wider border-b border-[#E6DFD5]">
                                        <tr>
                                            <th scope="col" className="p-3.5 sm:p-4 font-bold">Factor</th>
                                            <th scope="col" className="p-3.5 sm:p-4 font-bold">Impacto</th>
                                            <th scope="col" className="p-3.5 sm:p-4 font-bold">Qué considerar al cotizar</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F0EAE0]">
                                        {FACTORES_PRECIO.map((f) => (
                                            <tr key={f.factor}>
                                                <th scope="row" className="p-3.5 sm:p-4 font-semibold text-[#292522]">{f.factor}</th>
                                                <td className="p-3.5 sm:p-4">
                                                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF8F3] border border-[#E6DFD5] text-[#5B493D]">
                                                        {f.impacto}
                                                    </span>
                                                </td>
                                                <td className="p-3.5 sm:p-4 text-[#5B493D]">{f.detalle}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-5 rounded-2xl border border-[#C6A56A]/35 bg-[#F0EAE0]/45 text-sm text-[#5B493D]">
                                <strong className="text-[#292522]">Consejo al comparar presupuestos:</strong> solicita al menos dos
                                cotizaciones y verifica si el valor informado es el precio final (si incluye retiro, entrega a
                                domicilio, urna básica y certificado).
                            </div>
                        </section>

                        {/* 5. Checklist interactivo: cómo elegir un crematorio confiable */}
                        <section id="como-elegir" className="space-y-5 scroll-mt-28 border-t border-[#E6DFD5] pt-10">
                            <WarmSectionTitle icon={<ShieldCheck size={20} />}>
                                5. ¿Cómo elegir un crematorio confiable?
                            </WarmSectionTitle>
                            <p>
                                En un momento de duelo, tener una lista clara te ayuda a preguntar lo esencial con tranquilidad.
                                Puedes usar este checklist al conversar con cada proveedor:
                            </p>

                            <div className="rounded-2xl border border-[#C6A56A]/40 bg-white p-5 sm:p-6 space-y-3 shadow-sm">
                                <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#F0EAE0]">
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#5B493D]">
                                        Checklist de verificación ({checkedCount}/{CHECKLIST_CONFIABLE.length})
                                    </span>
                                    {checkedCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setCheckedItems({})}
                                            className="text-xs text-[#77716A] hover:text-[#292522] underline"
                                        >
                                            Reiniciar
                                        </button>
                                    )}
                                </div>
                                <ul className="space-y-2.5">
                                    {CHECKLIST_CONFIABLE.map((item) => {
                                        const isChecked = !!checkedItems[item.id];
                                        return (
                                            <li key={item.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleCheck(item.id)}
                                                    aria-pressed={isChecked}
                                                    className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                                                        isChecked
                                                            ? 'bg-[#F0EAE0]/65 border-[#C6A56A]/60 text-[#292522]'
                                                            : 'bg-[#FAF8F3]/60 border-[#E6DFD5] hover:border-[#C6A56A]/50 text-[#292522]'
                                                    }`}
                                                >
                                                    <span
                                                        className={`w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                                            isChecked
                                                                ? 'bg-[#5B493D] border-[#5B493D] text-white'
                                                                : 'bg-white border-[#C6A56A]/60'
                                                        }`}
                                                    >
                                                        {isChecked && <Check size={13} strokeWidth={3} />}
                                                    </span>
                                                    <span className={`text-sm ${isChecked ? 'font-medium' : ''}`}>{item.q}</span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            <p className="text-sm text-[#5B493D]">
                                Revisa además opiniones de otras familias en Google y pide siempre por escrito la modalidad contratada,
                                el plazo de entrega y los mecanismos de identificación.
                            </p>
                        </section>

                        {/* 6. La importancia de la trazabilidad */}
                        <section id="trazabilidad" className="space-y-5 scroll-mt-28 border-t border-[#E6DFD5] pt-10">
                            <WarmSectionTitle icon={<BookOpen size={20} />}>
                                6. La importancia de la trazabilidad
                            </WarmSectionTitle>
                            <p>
                                La trazabilidad consiste en mantener identificada a tu mascota y registrar cada etapa importante del
                                servicio, especialmente cuando contratas una cremación individual. Esto aporta certeza y tranquilidad
                                a la familia.
                            </p>

                            <div className="p-5 sm:p-6 rounded-2xl border border-[#E6DFD5] bg-white">
                                <p className="text-xs font-bold uppercase tracking-wider text-[#77716A] mb-4">
                                    Ejemplo referencial de etapas de seguimiento
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                                    {TRAZABILIDAD_ETAPAS.map((etapa, idx) => (
                                        <div
                                            key={etapa}
                                            className="p-3 rounded-xl bg-[#FAF8F3] border border-[#E6DFD5] text-center flex flex-col items-center justify-center gap-1"
                                        >
                                            <span className="text-[10px] font-bold text-[#C6A56A]">0{idx + 1}</span>
                                            <span className="text-xs font-semibold text-[#292522]">{etapa}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-[#77716A] mt-4">
                                    * Cada crematorio define sus propios protocolos internos y etapas de atención. Algunos proveedores
                                    ofrecen comprobantes fotográficos o un{' '}
                                    <Link href={SEGUIMIENTO_HREF} className="underline text-[#5B493D] font-semibold hover:text-[#292522]">
                                        enlace de seguimiento en línea
                                    </Link>{' '}
                                    (puedes leer más sobre{' '}
                                    <Link href={TRAZABILIDAD_HREF} className="underline text-[#5B493D] font-semibold hover:text-[#292522]">
                                        cadena de custodia
                                    </Link>
                                    ).
                                </p>
                            </div>
                        </section>

                        {/* 7. Dónde encontrar crematorios */}
                        <section id="donde" className="space-y-5 scroll-mt-28 border-t border-[#E6DFD5] pt-10">
                            <WarmSectionTitle icon={<MapPin size={20} />}>
                                7. ¿Dónde encontrar crematorios de mascotas en Chile?
                            </WarmSectionTitle>
                            <p>
                                La disponibilidad depende de cada región y comuna. Busca proveedores en tu ciudad y confirma
                                directamente su cobertura, horarios y condiciones de traslado.
                            </p>
                            <div className="space-y-3.5">
                                {REGIONES.map((r) => (
                                    <div key={r.titulo} className="p-5 rounded-2xl border border-[#E6DFD5] bg-white">
                                        <h3 className="font-bold text-[#292522]">{r.titulo}</h3>
                                        <p className="text-sm text-[#5B493D] mt-1">{r.texto}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 8. Qué hacer cuando fallece */}
                        <section id="que-hacer" className="space-y-5 scroll-mt-28 border-t border-[#E6DFD5] pt-10">
                            <WarmSectionTitle icon={<LifeBuoy size={20} />}>
                                8. ¿Qué hacer cuando fallece una mascota?
                            </WarmSectionTitle>
                            <p>Si tu mascota acaba de fallecer, intenta darte un respiro para tomar una decisión con calma.</p>
                            <ol className="space-y-3">
                                {PASOS_FALLECIMIENTO.map((t, i) => (
                                    <li key={t} className="flex gap-4 items-start p-4 rounded-2xl border border-[#E6DFD5] bg-white">
                                        <span className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold bg-[#F0EAE0] text-[#5B493D] border border-[#C6A56A]/40">
                                            {i + 1}
                                        </span>
                                        <span className="text-sm text-[#292522] pt-1">{t}</span>
                                    </li>
                                ))}
                            </ol>
                        </section>

                        {/* 9. Normativa chilena */}
                        <section id="normativa" className="space-y-5 scroll-mt-28 border-t border-[#E6DFD5] pt-10">
                            <WarmSectionTitle icon={<Scale size={20} />}>
                                9. ¿Qué dice la normativa chilena?
                            </WarmSectionTitle>
                            <p>
                                Conviene distinguir entre las normas generales sobre tenencia responsable, las exigencias sanitarias
                                aplicables y las reglas municipales correspondientes al establecimiento:
                            </p>
                            <p>
                                La{' '}
                                <a href={LEY_21020_URL} target="_blank" rel="noopener noreferrer" className="underline font-semibold text-[#5B493D] hover:text-[#292522]">
                                    Ley N.º 21.020<ExternalLink size={12} className="inline ml-1 -mt-0.5" />
                                </a>{' '}
                                regula la tenencia responsable de mascotas y animales de compañía, mientras que el{' '}
                                <a href={CODIGO_SANITARIO_URL} target="_blank" rel="noopener noreferrer" className="underline font-semibold text-[#5B493D] hover:text-[#292522]">
                                    Código Sanitario<ExternalLink size={12} className="inline ml-1 -mt-0.5" />
                                </a>{' '}
                                y las disposiciones sanitarias y municipales determinan las autorizaciones aplicables según cada
                                instalación.
                            </p>
                        </section>

                        {/* 10. Cómo conservar el recuerdo */}
                        <section id="recuerdo" className="space-y-5 scroll-mt-28 border-t border-[#E6DFD5] pt-10">
                            <WarmSectionTitle icon={<Flower2 size={20} />}>
                                10. Cómo conservar el recuerdo de tu mascota
                            </WarmSectionTitle>
                            <p>
                                No existe una única manera de despedirse. Cada familia elige la forma que más sentido le haga para
                                honrar el vínculo compartido:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {RECUERDOS_OPCIONES.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <div key={item.titulo} className="p-5 rounded-2xl border border-[#E6DFD5] bg-white space-y-2">
                                            <div className="w-9 h-9 rounded-xl bg-[#F0EAE0] border border-[#C6A56A]/35 flex items-center justify-center text-[#5B493D]">
                                                <Icon size={17} />
                                            </div>
                                            <h3 className="font-bold text-sm text-[#292522]">{item.titulo}</h3>
                                            <p className="text-xs text-[#77716A] leading-relaxed">{item.texto}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* 11. Preguntas frecuentes */}
                        <section id="faqs" className="space-y-6 scroll-mt-28 border-t border-[#E6DFD5] pt-10">
                            <WarmSectionTitle icon={<HelpCircle size={20} />}>
                                11. Preguntas frecuentes
                            </WarmSectionTitle>
                            <VinzerGuideAccordion items={GUIA_CREMATORIO_CHILE_FAQ} theme="light" />
                        </section>

                        {/* Cierre informativo respetuoso (sin venta agresiva de software) */}
                        <section className="space-y-5 border-t border-[#E6DFD5] pt-10">
                            <div className="p-7 sm:p-8 rounded-3xl border border-[#C6A56A]/40 bg-[#F0EAE0]/60 space-y-4">
                                <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#292522]">
                                    Un recuerdo que permanece
                                </h2>
                                <p className="text-sm sm:text-base text-[#5B493D] leading-relaxed">
                                    Cada mascota deja una historia y un vínculo único. Informarse sobre las alternativas disponibles
                                    permite tomar una decisión consciente y encontrar una manera serena de conservar su recuerdo.
                                </p>
                                <p className="pt-3 border-t border-[#C6A56A]/30 text-xs text-[#77716A] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <span>
                                        Vinzer es una plataforma tecnológica especializada en la gestión de crematorios de mascotas.
                                        No realiza directamente servicios de cremación.
                                    </span>
                                    <Link href="/guias" className="inline-flex items-center gap-1 font-semibold text-[#5B493D] hover:text-[#292522] shrink-0">
                                        Explorar más guías <ArrowRight size={13} />
                                    </Link>
                                </p>
                            </div>
                        </section>
                    </article>

                    {/* Sidebar solo con índice limpio para lectura cómoda */}
                    <aside className="lg:col-span-4 hidden lg:block">
                        <VinzerGuideTOC items={TOC_ITEMS} theme="light" />
                    </aside>
                </div>
            </main>

            <VinzerFooter theme="light" />
        </div>
    );
}
