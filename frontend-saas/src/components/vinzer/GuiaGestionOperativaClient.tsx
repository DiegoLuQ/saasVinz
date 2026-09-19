'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Cpu,
    Flame,
    Truck,
    Receipt,
    PackageCheck,
    BarChart3,
    ArrowRight,
    CheckCircle2,
    ChevronRight,
    TrendingUp,
    Clock,
    DollarSign,
    Layers,
    ClipboardList
} from 'lucide-react';

import { VinzerNavbar } from './VinzerNavbar';
import { VinzerFooter } from './VinzerFooter';
import { VinzerGuideTOC, TOCItem } from './VinzerGuideTOC';
import { VinzerGuideAccordion, GuideFaqItem } from './VinzerGuideAccordion';
import { VinzerMemorialBanner } from './VinzerMemorialBanner';

const TOC_ITEMS: TOCItem[] = [
    { id: 'el-reto-operativo', label: '1. El costo oculto del desorden en planillas Excel' },
    { id: 'los-4-pilares', label: '2. Los 4 Pilares de la Eficiencia Operativa' },
    { id: 'pilar-1', label: '• Control técnico de hornos y tiempos', level: 3 },
    { id: 'pilar-2', label: '• Logística y hojas de ruta con firma digital', level: 3 },
    { id: 'pilar-3', label: '• Formulario inteligente y recepción ágil', level: 3 },
    { id: 'pilar-4', label: '• Control de stock de urnas y relicarios', level: 3 },
    { id: 'tabla-comparativa', label: '3. Métricas: Excel vs. Vinzer en Planta' },
    { id: 'interlinking-custodia', label: '4. Vinculación con Cadena de Custodia' },
    { id: 'faqs', label: '5. Preguntas Frecuentes de Directores y Gerentes' },
];

const FAQ_ITEMS: GuideFaqItem[] = [
    {
        question: '¿Cómo funciona el formulario de recepción de pedidos en Vinzer?',
        answer: 'Está estructurado en 4 pestañas intuitivas: Angelito (ficha del paciente y tutor), Logística (direcciones de retiro y entrega), Evidencia (fotos de recepción y pertenencias) y Comercial (servicios, planes, urnas adicionales y cálculo de ticket). Además cuenta con autoguardado de borradores para nunca perder información.',
    },
    {
        question: '¿Cómo apoya al operador de horno durante la jornada?',
        answer: 'Cada cremación cuenta con un registro técnico donde el operario vincula el número de cámara o ID de horno, el operador responsable, la hora exacta de inicio, término y la temperatura de operación. Esto garantiza trazabilidad interna y control de tiempos por servicio.',
    },
    {
        question: '¿Cuánto tarda la capacitación del personal de planta y choferes?',
        answer: 'La interfaz para operarios de horno y choferes está diseñada con enfoque táctil de alta legibilidad y botones grandes para uso en terreno. El tiempo promedio de adopción del equipo es de menos de 48 horas, eliminando la resistencia al cambio.',
    },
];

export function GuiaGestionOperativaClient() {
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

    const isLight = theme === 'light';

    return (
        <div
            className={`min-h-screen transition-colors duration-500 font-sans relative overflow-hidden ${
                isLight
                    ? 'bg-slate-50 text-slate-900 selection:bg-[#0284C7]/20 selection:text-slate-900'
                    : 'bg-[#020210] text-white selection:bg-[#19B5FE]/30 selection:text-white'
            }`}
        >
            {/* Navbar compartido con soporte de tema */}
            <VinzerNavbar theme={theme} toggleTheme={toggleTheme} />

            {/* Glows ambientales sutiles */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none z-0 overflow-hidden">
                <div
                    className={`absolute top-[5%] right-[10%] w-[500px] h-[500px] blur-[170px] rounded-full transition-opacity duration-500 ${
                        isLight ? 'bg-amber-300/15 opacity-60' : 'bg-[#E7C15A]/10 opacity-100'
                    }`}
                />
                <div
                    className={`absolute top-[15%] left-[5%] w-[450px] h-[450px] blur-[180px] rounded-full transition-opacity duration-500 ${
                        isLight ? 'bg-sky-400/15 opacity-60' : 'bg-[#19B5FE]/10 opacity-100'
                    }`}
                />
            </div>

            {/* Hero & Encabezado */}
            <header className="relative pt-32 sm:pt-36 pb-12 sm:pb-16 px-4 sm:px-6 z-10 max-w-6xl mx-auto">
                {/* Breadcrumbs visuales */}
                <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs font-semibold mb-6 flex-wrap">
                    <Link
                        href="/"
                        className={`transition-colors ${isLight ? 'text-slate-500 hover:text-[#0284C7]' : 'text-slate-400 hover:text-[#19B5FE]'}`}
                    >
                        Inicio
                    </Link>
                    <ChevronRight size={13} className={isLight ? 'text-slate-300' : 'text-slate-600'} />
                    <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>Guías B2B</span>
                    <ChevronRight size={13} className={isLight ? 'text-slate-300' : 'text-slate-600'} />
                    <span className={`font-bold ${isLight ? 'text-amber-600' : 'text-[#E7C15A]'}`}>
                        Gestión Operativa y Hornos
                    </span>
                </nav>

                <div
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border mb-5 ${
                        isLight
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-[#E7C15A]/10 border-[#E7C15A]/25 text-[#E7C15A]'
                    }`}
                >
                    <Cpu size={14} /> Eficiencia y Rentabilidad de Planta
                </div>

                <h1
                    className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.15] max-w-4xl ${
                        isLight ? 'text-slate-900' : 'text-white'
                    }`}
                >
                    Software de Gestión Operativa para Crematorios de Mascotas: Control de Planta, Logística y Formularios Inteligentes
                </h1>

                <p
                    className={`mt-6 text-base sm:text-lg max-w-3xl leading-relaxed ${
                        isLight ? 'text-slate-600' : 'text-slate-300'
                    }`}
                >
                    Controlar un crematorio en planillas Excel fragmentadas genera cuellos de botella y pérdidas de tiempo. Descubre cómo centralizar los registros técnicos de hornos, las hojas de ruta de retiros, el inventario de urnas y los formularios de recepción guiada en una sola pantalla inteligente.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4 pt-2">
                    <a
                        href="/#demo"
                        className={`inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full font-black text-xs uppercase tracking-wider transition-all shadow-lg hover:scale-105 active:scale-95 ${
                            isLight
                                ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-sky-600/25'
                                : 'bg-[#19B5FE] hover:bg-[#0e9ce0] text-[#020210] shadow-[#19B5FE]/25'
                        }`}
                    >
                        Solicitar demo guiada
                        <ArrowRight size={15} />
                    </a>
                    <Link
                        href="/guias/software-trazabilidad-cadena-custodia-crematorios-mascotas"
                        className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs font-bold border transition-all ${
                            isLight
                                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                                : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
                        }`}
                    >
                        Ver Guía de Trazabilidad y Custodia
                    </Link>
                </div>
            </header>

            {/* Layout Principal: Contenido + Sticky TOC */}
            <main className="relative max-w-6xl mx-auto px-4 sm:px-6 pb-20 z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Contenido Editorial (8 cols) */}
                    <article
                        className={`lg:col-span-8 space-y-14 leading-relaxed text-sm sm:text-base ${
                            isLight ? 'text-slate-700' : 'text-slate-300'
                        }`}
                    >
                        {/* SECCIÓN 1: El reto operativo */}
                        <section id="el-reto-operativo" className="space-y-5 scroll-mt-28">
                            <div className="flex items-center gap-3">
                                <span className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
                                    <Clock size={20} />
                                </span>
                                <h2
                                    className={`text-xl sm:text-2xl font-black tracking-tight ${
                                        isLight ? 'text-slate-900' : 'text-white'
                                    }`}
                                >
                                    1. El costo oculto del desorden en planillas Excel
                                </h2>
                            </div>

                            <p>
                                A medida que un crematorio supera las 30 o 50 cremaciones al mes, el control manual colapsa. El personal de recepción anota en un Excel, los choferes coordinan por grupos de WhatsApp desordenados, y el operador de horno trabaja a ciegas sin saber qué servicios son urgentes o cuáles tienen urnas personalizadas pendientes.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
                                <div
                                    className={`p-4 rounded-xl border space-y-1 ${
                                        isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#071120] border-white/10'
                                    }`}
                                >
                                    <div className="text-xs font-mono text-rose-500 font-bold uppercase">Tiempos Muertos</div>
                                    <div className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>Descoordinación</div>
                                    <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Operarios y choferes sin asignación clara de turnos ni prioridades.</p>
                                </div>
                                <div
                                    className={`p-4 rounded-xl border space-y-1 ${
                                        isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#071120] border-white/10'
                                    }`}
                                >
                                    <div className="text-xs font-mono text-amber-500 font-bold uppercase">Horas Perdidas</div>
                                    <div className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>12 hrs / sem</div>
                                    <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Digitando certificados a mano y cuadrando fichas de servicio.</p>
                                </div>
                                <div
                                    className={`p-4 rounded-xl border space-y-1 ${
                                        isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#071120] border-white/10'
                                    }`}
                                >
                                    <div className="text-xs font-mono text-purple-500 font-bold uppercase">Quiebres de Stock</div>
                                    <div className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>Urgencias</div>
                                    <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Urnas agotadas a mitad de servicio familiar.</p>
                                </div>
                            </div>
                        </section>

                        {/* SECCIÓN 2: Los 4 Pilares de la Eficiencia */}
                        <section
                            id="los-4-pilares"
                            className={`space-y-6 scroll-mt-28 border-t pt-10 ${
                                isLight ? 'border-slate-200' : 'border-white/10'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                                    <Layers size={20} />
                                </span>
                                <h2
                                    className={`text-xl sm:text-2xl font-black tracking-tight ${
                                        isLight ? 'text-slate-900' : 'text-white'
                                    }`}
                                >
                                    2. Los 4 Pilares de la Eficiencia Operativa con Vinzer
                                </h2>
                            </div>

                            <p>
                                La plataforma <strong className={isLight ? 'text-slate-900' : 'text-white'}>Vinzer</strong> sustituye múltiples herramientas desconectadas por un motor operativo integral:
                            </p>

                            {/* Pilar 1: Hornos */}
                            <div
                                id="pilar-1"
                                className={`p-6 rounded-2xl border transition-all space-y-3 scroll-mt-28 ${
                                    isLight
                                        ? 'bg-white border-slate-200 shadow-sm hover:border-amber-400'
                                        : 'bg-[#071120] border-white/10 hover:border-[#E7C15A]/40'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-mono font-bold text-amber-500 uppercase tracking-wider">
                                        Pilar 01 • Planta y Hornos
                                    </span>
                                    <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                                        <Flame size={18} />
                                    </span>
                                </div>
                                <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                    Control Técnico de Hornos y Tiempos de Ciclo
                                </h3>
                                <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                                    Lleva una bitácora digital inalterable de cada cremación en planta. Asigna el número de cámara o ID de horno, el operador responsable, la hora exacta de inicio y término, y registra la temperatura alcanzada en el ciclo. Toda la ficha técnica queda vinculada a la orden para auditorías de calidad y control interno.
                                </p>
                            </div>

                            {/* Pilar 2: Logística */}
                            <div
                                id="pilar-2"
                                className={`p-6 rounded-2xl border transition-all space-y-3 scroll-mt-28 ${
                                    isLight
                                        ? 'bg-white border-slate-200 shadow-sm hover:border-[#0284C7]/50'
                                        : 'bg-[#071120] border-white/10 hover:border-[#19B5FE]/40'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-mono font-bold uppercase tracking-wider ${
                                        isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'
                                    }`}>
                                        Pilar 02 • Transporte y Flota
                                    </span>
                                    <span className="p-1.5 rounded-lg bg-[#19B5FE]/10 text-[#19B5FE]">
                                        <Truck size={18} />
                                    </span>
                                </div>
                                <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                    Hojas de Ruta, Checklist de Terreno y Firma Digital
                                </h3>
                                <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                                    Coordina retiros en terreno y entregas de cenizas a domicilio asignando choferes en tiempo real. El conductor accede desde su móvil a las tareas asignadas, completa el checklist obligatorio de pertenencias (manta, collar, juguetes), toma fotografías de evidencia y captura la firma digital del tutor o receptor.
                                </p>
                            </div>

                            {/* Pilar 3: Formulario Inteligente */}
                            <div
                                id="pilar-3"
                                className={`p-6 rounded-2xl border transition-all space-y-3 scroll-mt-28 ${
                                    isLight
                                        ? 'bg-white border-slate-200 shadow-sm hover:border-emerald-500'
                                        : 'bg-[#071120] border-white/10 hover:border-emerald-400/40'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-mono font-bold text-emerald-500 uppercase tracking-wider">
                                        Pilar 03 • Recepción y Registro
                                    </span>
                                    <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                                        <ClipboardList size={18} />
                                    </span>
                                </div>
                                <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                    Formulario Inteligente de Recepción en 4 Pasos
                                </h3>
                                <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                                    Elimina las fichas de papel y los errores de doble digitación. El formulario de ingreso de Vinzer guía al personal paso a paso: desde los datos del animal y tutor (<strong className={isLight ? 'text-slate-800' : 'text-white'}>Angelito</strong>), direcciones geográficas de retiro y entrega (<strong className={isLight ? 'text-slate-800' : 'text-white'}>Logística</strong>), fotografías y pertenencias recibidas (<strong className={isLight ? 'text-slate-800' : 'text-white'}>Evidencia</strong>), hasta el desglose automático de planes, urnas y valores (<strong className={isLight ? 'text-slate-800' : 'text-white'}>Comercial</strong>). Incluye recuperación automática de borradores para que ningún imprevisto borre el trabajo en curso.
                                </p>
                            </div>

                            {/* Pilar 4: Stock */}
                            <div
                                id="pilar-4"
                                className={`p-6 rounded-2xl border transition-all space-y-3 scroll-mt-28 ${
                                    isLight
                                        ? 'bg-white border-slate-200 shadow-sm hover:border-sky-400'
                                        : 'bg-[#071120] border-white/10 hover:border-sky-400/40'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-mono font-bold text-sky-500 uppercase tracking-wider">
                                        Pilar 04 • Bodega y Catálogo
                                    </span>
                                    <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
                                        <PackageCheck size={18} />
                                    </span>
                                </div>
                                <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                    Inventario en Tiempo Real de Urnas, Relicarios y Catálogo Digital
                                </h3>
                                <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                                    Centraliza el stock físico de tus urnas, relicarios, dijes y servicios funerarios. Cada orden descuenta existencias automáticamente de la bodega principal con control exacto de costos y precios de venta, permitiendo además generar y descargar el catálogo comercial completo en PDF para familias y clientes.
                                </p>
                            </div>
                        </section>

                        {/* SECCIÓN 3: Tabla comparativa métrica */}
                        <section
                            id="tabla-comparativa"
                            className={`space-y-5 scroll-mt-28 border-t pt-10 ${
                                isLight ? 'border-slate-200' : 'border-white/10'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="p-2 rounded-xl bg-[#19B5FE]/10 border border-[#19B5FE]/20 text-[#19B5FE]">
                                    <BarChart3 size={20} />
                                </span>
                                <h2
                                    className={`text-xl sm:text-2xl font-black tracking-tight ${
                                        isLight ? 'text-slate-900' : 'text-white'
                                    }`}
                                >
                                    3. Comparativa Operativa: Gestión Tradicional vs. Vinzer SaaS
                                </h2>
                            </div>

                            <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                                Impacto directo cuantificable en la operación mensual de un crematorio de mascotas medio (50–120 servicios/mes):
                            </p>

                            <div
                                className={`overflow-x-auto rounded-2xl border ${
                                    isLight ? 'border-slate-200 bg-white shadow-xs' : 'border-white/10 bg-[#071120]'
                                }`}
                            >
                                <table className="w-full text-left text-xs sm:text-sm">
                                    <thead
                                        className={`uppercase font-mono text-[10px] tracking-wider border-b ${
                                            isLight
                                                ? 'bg-slate-100 text-slate-700 border-slate-200'
                                                : 'bg-[#0a1829] text-slate-400 border-white/10'
                                        }`}
                                    >
                                        <tr>
                                            <th className="p-3.5 sm:p-4">Indicador Clave</th>
                                            <th className="p-3.5 sm:p-4 text-rose-500 font-bold">Gestión Manual / Excel</th>
                                            <th className={`p-3.5 sm:p-4 font-bold ${isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'}`}>
                                                Con Vinzer SaaS
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-white/5'}`}>
                                        <tr>
                                            <td className={`p-3.5 sm:p-4 font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                                Ingreso de órdenes
                                            </td>
                                            <td className="p-3.5 sm:p-4 text-slate-500">8 a 12 min (papel + Excel)</td>
                                            <td className="p-3.5 sm:p-4 text-emerald-500 font-bold">90 segundos con autocompletado</td>
                                        </tr>
                                        <tr>
                                            <td className={`p-3.5 sm:p-4 font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                                Emisión de certificado
                                            </td>
                                            <td className="p-3.5 sm:p-4 text-slate-500">Diseño manual en Word/Photoshop</td>
                                            <td className="p-3.5 sm:p-4 text-emerald-500 font-bold">Instantáneo en PDF con código QR</td>
                                        </tr>
                                        <tr>
                                            <td className={`p-3.5 sm:p-4 font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                                Cálculo comercial y emisión de orden
                                            </td>
                                            <td className="p-3.5 sm:p-4 text-slate-500">Formularios de papel propensos a pérdida</td>
                                            <td className="p-3.5 sm:p-4 text-emerald-500 font-bold">Formulario inteligente con autoguardado de borradores</td>
                                        </tr>
                                        <tr>
                                            <td className={`p-3.5 sm:p-4 font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                                Visibilidad para la familia
                                            </td>
                                            <td className="p-3.5 sm:p-4 text-slate-500">Llamadas continuas al crematorio</td>
                                            <td className="p-3.5 sm:p-4 text-emerald-500 font-bold">Portal web público de seguimiento</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* SECCIÓN 4: Interlinking con Custodia */}
                        <section
                            id="interlinking-custodia"
                            className={`p-7 rounded-2xl border space-y-4 scroll-mt-28 ${
                                isLight
                                    ? 'bg-amber-50/70 border-amber-200 text-slate-800'
                                    : 'bg-gradient-to-br from-[#071120] to-[#0a1b33] border-[#E7C15A]/25 text-white'
                            }`}
                        >
                            <span
                                className={`text-[10px] font-black uppercase tracking-widest block ${
                                    isLight ? 'text-amber-700' : 'text-[#E7C15A]'
                                }`}
                            >
                                La Otra Mitad del Éxito
                            </span>
                            <h3 className={`text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                ¿Cómo blindar la ética y reputación de tu crematorio?
                            </h3>
                            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                                La eficiencia en costos de horno y logística no tiene sentido si una falla en la custodia daña la credibilidad de tu negocio. Si buscas blindar legalmente cada entrega con precintos numerados y registro fotográfico, revisa nuestra guía sobre el{' '}
                                <Link
                                    href="/guias/software-trazabilidad-cadena-custodia-crematorios-mascotas"
                                    className={`font-bold underline underline-offset-4 transition-colors ${
                                        isLight
                                            ? 'text-[#0284C7] decoration-[#0284C7]/40 hover:text-slate-900'
                                            : 'text-[#19B5FE] decoration-[#19B5FE]/40 hover:text-white'
                                    }`}
                                >
                                    sistema de trazabilidad y custodia de mascotas
                                </Link>
                                .
                            </p>
                            <div>
                                <Link
                                    href="/guias/software-trazabilidad-cadena-custodia-crematorios-mascotas"
                                    className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider transition-colors ${
                                        isLight ? 'text-[#0284C7] hover:text-[#0369A1]' : 'text-[#19B5FE] hover:text-white'
                                    }`}
                                >
                                    Leer Guía de Trazabilidad y Custodia <ArrowRight size={13} />
                                </Link>
                            </div>
                        </section>

                        {/* SECCIÓN 5: FAQ Interactivo */}
                        <section
                            id="faqs"
                            className={`space-y-6 scroll-mt-28 border-t pt-10 ${
                                isLight ? 'border-slate-200' : 'border-white/10'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500">
                                    <Cpu size={20} />
                                </span>
                                <h2
                                    className={`text-xl sm:text-2xl font-black tracking-tight ${
                                        isLight ? 'text-slate-900' : 'text-white'
                                    }`}
                                >
                                    5. Preguntas Frecuentes sobre Gestión Operativa
                                </h2>
                            </div>

                            <p className={`text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                Respuestas técnicas sobre adopción en planta, integraciones contables y programación de hornos:
                            </p>

                            <VinzerGuideAccordion items={FAQ_ITEMS} theme={theme} />
                        </section>
                    </article>

                    {/* Barra Lateral Derecha: Table of Contents (4 cols en desktop) */}
                    <aside className="lg:col-span-4 hidden lg:block">
                        <VinzerGuideTOC items={TOC_ITEMS} theme={theme} />

                        {/* Mini Banner CTA Lateral */}
                        <div
                            className={`mt-6 p-6 rounded-2xl border text-center space-y-3 ${
                                isLight
                                    ? 'bg-white border-slate-200 shadow-sm'
                                    : 'bg-gradient-to-b from-[#071120] to-[#020210] border-white/10'
                            }`}
                        >
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto ${
                                    isLight ? 'bg-amber-50 text-amber-600' : 'bg-[#E7C15A]/10 text-[#E7C15A]'
                                }`}
                            >
                                <DollarSign size={20} />
                            </div>
                            <h4 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                ¿Cuánto puedes ahorrar con Vinzer?
                            </h4>
                            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                Calculemos juntos el ahorro en combustible, horas de oficina y llamadas de familias con nuestro equipo.
                            </p>
                            <a
                                href="/#demo"
                                className={`block w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md ${
                                    isLight
                                        ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-sky-600/20'
                                        : 'bg-[#19B5FE] hover:bg-[#0e9ce0] text-[#020210] shadow-[#19B5FE]/20'
                                }`}
                            >
                                Solicitar Diagnóstico Operativo
                            </a>
                        </div>
                    </aside>
                </div>
            </main>

            {/* Banner Celestial Previo al Footer */}
            <div className="relative z-10">
                <VinzerMemorialBanner theme={theme} />
            </div>

            {/* Footer Semántico Vinzer */}
            <VinzerFooter theme={theme} />
        </div>
    );
}
