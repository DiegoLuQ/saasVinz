'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    ShieldCheck,
    QrCode,
    Camera,
    Flame,
    FileCheck2,
    ArrowRight,
    CheckCircle2,
    AlertTriangle,
    ChevronRight,
    Users,
    Scale,
    Lock,
    Smartphone
} from 'lucide-react';

import { VinzerNavbar } from './VinzerNavbar';
import { VinzerFooter } from './VinzerFooter';
import { VinzerGuideTOC, TOCItem } from './VinzerGuideTOC';
import { VinzerGuideAccordion, GuideFaqItem } from './VinzerGuideAccordion';
import { VinzerMemorialBanner } from './VinzerMemorialBanner';

const TOC_ITEMS: TOCItem[] = [
    { id: 'el-dilema', label: '1. El dilema del sector y riesgo reputacional' },
    { id: 'flujo-paso-a-paso', label: '2. Protocolo de Trazabilidad Digital Vinzer' },
    { id: 'etapa-1', label: '• Recepción y precinto con código único', level: 3 },
    { id: 'etapa-2', label: '• Registro fotográfico y pesaje', level: 3 },
    { id: 'etapa-3', label: '• Protocolo de horno y asignación de tiempos', level: 3 },
    { id: 'etapa-4', label: '• Embalaje y certificado digital infalsificable', level: 3 },
    { id: 'respaldo-legal', label: '3. Respaldo técnico y legal ante reclamos' },
    { id: 'interlinking-operativo', label: '4. Sincronización operativa con planta' },
    { id: 'faqs', label: '5. Preguntas Frecuentes de Directores y Clínicas' },
];

const FAQ_ITEMS: GuideFaqItem[] = [
    {
        question: '¿Cómo demuestro a una veterinaria aliada que el proceso es 100% individual?',
        answer: 'Vinzer genera una bitácora temporal inmutable con marca de tiempo (timestamp) en cada hito. Cada mascota recibe un token y precinto QR inviolable. El operador debe escanear el QR antes de abrir el horno y subir la evidencia fotográfica del ingreso individual. La clínica veterinaria puede consultar este historial desde su propio portal de convenios sin revelar datos de otros clientes.',
    },
    {
        question: '¿Qué respaldo legal y técnico entrega el sistema frente a reclamos o sospechas?',
        answer: 'El certificado de cremación emitido por Vinzer incluye un código de verificación criptográfica (hash) y un código QR de consulta pública permanente. Cualquier tutor o perito puede escanear el certificado y comprobar en el servidor la fecha, hora exacta de inicio/fin del ciclo de cremación, operario responsable y fotografía de custodia, eliminando cualquier ambigüedad.',
    },
    {
        question: '¿Los tutores pueden ver el estado del proceso en tiempo real?',
        answer: 'Sí. El crematorio decide qué hitos mostrar al tutor a través de un enlace de seguimiento sin necesidad de contraseñas. La familia puede verificar cuándo su mascota fue recibida en el centro, cuándo ingresó a la sala de custodia y cuándo sus cenizas están listas para el retiro, mitigando la angustia y llamadas constantes al call center.',
    },
];

export function GuiaTrazabilidadClient() {
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
            {/* Navbar compartido con soporte para cambio de tema */}
            <VinzerNavbar theme={theme} toggleTheme={toggleTheme} />

            {/* Glows ambientales sutiles */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none z-0 overflow-hidden">
                <div
                    className={`absolute top-[5%] left-[10%] w-[500px] h-[500px] blur-[170px] rounded-full transition-opacity duration-500 ${
                        isLight ? 'bg-sky-400/15 opacity-60' : 'bg-[#19B5FE]/10 opacity-100'
                    }`}
                />
                <div
                    className={`absolute top-[15%] right-[5%] w-[450px] h-[450px] blur-[180px] rounded-full transition-opacity duration-500 ${
                        isLight ? 'bg-indigo-300/10 opacity-50' : 'bg-cyan-600/5 opacity-100'
                    }`}
                />
            </div>

            {/* Hero & Encabezado con Mockup 3D */}
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
                    <span className={`font-bold ${isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'}`}>
                        Trazabilidad y Cadena de Custodia
                    </span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                    {/* Columna Izquierda: Texto y CTAs (7 cols) */}
                    <div className="lg:col-span-7 space-y-5">
                        <div
                            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                                isLight
                                    ? 'bg-sky-50 border-sky-200 text-[#0284C7]'
                                    : 'bg-[#19B5FE]/10 border-[#19B5FE]/25 text-[#19B5FE]'
                            }`}
                        >
                            <ShieldCheck size={14} /> Estándar de Seguridad y Ética Funeraria
                        </div>

                        <h1
                            className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.15] ${
                                isLight ? 'text-slate-900' : 'text-white'
                            }`}
                        >
                            ¿Cómo Garantizar la Trazabilidad y Cadena de Custodia en un Crematorio de Mascotas?
                        </h1>

                        <p
                            className={`text-base sm:text-lg leading-relaxed ${
                                isLight ? 'text-slate-600' : 'text-slate-300'
                            }`}
                        >
                            Para un crematorio de mascotas, la confianza no es un argumento comercial: es la base misma del negocio. Descubre cómo implementar una cadena de custodia digital a prueba de errores humanos mediante códigos QR únicos, evidencia fotográfica inmutable y certificados con verificación criptográfica.
                        </p>

                        <div className="flex flex-wrap items-center gap-4 pt-2">
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
                                href="/guias/sistema-gestion-operativa-automatizacion-crematorio-mascotas"
                                className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs font-bold border transition-all ${
                                    isLight
                                        ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                                        : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
                                }`}
                            >
                                Ver Guía de Gestión Operativa
                            </Link>
                        </div>
                    </div>

                    {/* Columna Derecha: Mockup 3D de Trazabilidad (5 cols) */}
                    <div className="lg:col-span-5 flex justify-center items-center relative">
                        {/* Resplandor detrás del mockup */}
                        <div
                            className={`absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full blur-[80px] pointer-events-none ${
                                isLight ? 'bg-[#0284C7]/20' : 'bg-[#19B5FE]/20'
                            }`}
                        />

                        <div className="relative z-10 max-w-[280px] sm:max-w-[320px] md:max-w-[340px] drop-shadow-2xl transition-transform duration-500 hover:scale-[1.02]">
                            <Image
                                src="/images/MockupVinzer_comprimido.webp"
                                alt="Portal de seguimiento y trazabilidad digital Vinzer en smartphone"
                                width={360}
                                height={720}
                                priority
                                className="w-full h-auto object-contain drop-shadow-2xl"
                            />
                            {/* Badge flotante sobre el mockup */}
                            <div
                                className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full border backdrop-blur-md shadow-xl text-[11px] font-bold tracking-wide whitespace-nowrap flex items-center gap-2 ${
                                    isLight
                                        ? 'bg-white/90 border-slate-200 text-slate-800 shadow-slate-900/10'
                                        : 'bg-black/80 border-[#19B5FE]/40 text-white shadow-black/60'
                                }`}
                            >
                                <Smartphone size={13} className="text-[#19B5FE]" />
                                Portal del Tutor en Vivo
                            </div>
                        </div>
                    </div>
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
                        {/* SECCIÓN 1: El dilema del sector */}
                        <section id="el-dilema" className="space-y-5 scroll-mt-28">
                            <div className="flex items-center gap-3">
                                <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                                    <AlertTriangle size={20} />
                                </span>
                                <h2
                                    className={`text-xl sm:text-2xl font-black tracking-tight ${
                                        isLight ? 'text-slate-900' : 'text-white'
                                    }`}
                                >
                                    1. El dilema del sector: la sombra de la duda y el dolor familiar
                                </h2>
                            </div>

                            <p>
                                Cuando una familia despide a su perro o gato, se encuentra en su momento de mayor vulnerabilidad emocional. En ese contexto, el mayor temor de un tutor es la <strong>incertidumbre</strong>: <em>¿Son realmente las cenizas de mi mascota? ¿Hubo mezcla con otros cuerpos? ¿Fue un servicio individual auténtico?</em>
                            </p>

                            <div
                                className={`p-5 rounded-2xl border my-6 ${
                                    isLight
                                        ? 'bg-amber-50/70 border-amber-200 text-slate-800'
                                        : 'bg-[#071120] border-amber-500/20 text-slate-300'
                                }`}
                            >
                                <h4 className="text-sm font-bold text-amber-600 dark:text-amber-300 flex items-center gap-2 mb-2">
                                    <Scale size={16} /> El costo de una falla en la custodia:
                                </h4>
                                <ul className="space-y-2 text-xs sm:text-sm list-disc list-inside">
                                    <li>Destrucción irreversible de la reputación de la marca en redes sociales y reseñas de Google.</li>
                                    <li>Pérdida inmediata de convenios comerciales con clínicas veterinarias que derivan pacientes.</li>
                                    <li>Riesgo de litigios legales por incumplimiento contractual y daño moral.</li>
                                </ul>
                            </div>

                            <p>
                                Los crematorios que aún gestionan sus retiros y salas con libretas de papel, pizarras o planillas Excel quedan totalmente expuestos al <strong>error de transcripción humana</strong>. Basta con que un número de orden se borre o un rótulo se desprenda para desencadenar una crisis irreparable.
                            </p>
                        </section>

                        {/* SECCIÓN 2: Flujo Paso a Paso Vinzer */}
                        <section
                            id="flujo-paso-a-paso"
                            className={`space-y-6 scroll-mt-28 border-t pt-10 ${
                                isLight ? 'border-slate-200' : 'border-white/10'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="p-2 rounded-xl bg-[#19B5FE]/10 border border-[#19B5FE]/20 text-[#19B5FE]">
                                    <ShieldCheck size={20} />
                                </span>
                                <h2
                                    className={`text-xl sm:text-2xl font-black tracking-tight ${
                                        isLight ? 'text-slate-900' : 'text-white'
                                    }`}
                                >
                                    2. Protocolo de Trazabilidad Digital Vinzer: 4 Etapas Inviolables
                                </h2>
                            </div>

                            <p>
                                El software <strong className={isLight ? 'text-slate-900' : 'text-white'}>Vinzer</strong> transforma la cadena de custodia en un proceso digital hermético donde cada paso depende tecnológicamente del anterior:
                            </p>

                            {/* Etapa 1 */}
                            <div
                                id="etapa-1"
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
                                        Etapa 01 • Punto de Origen
                                    </span>
                                    <span className="p-1.5 rounded-lg bg-[#19B5FE]/10 text-[#19B5FE]">
                                        <QrCode size={18} />
                                    </span>
                                </div>
                                <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                    Recepción en Clínica o Domicilio con Precinto QR Único
                                </h3>
                                <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                                    Al momento de retirar el cuerpo en la clínica veterinaria o el domicilio del tutor, el chofer o chofer-operador genera o asigna un <strong>precinto físico numerado con código QR</strong> vinculado de inmediato a la orden en la nube. Desde ese segundo, la mascota deja de ser una anotación manual y pasa a ser un registro activo en el servidor.
                                </p>
                            </div>

                            {/* Etapa 2 */}
                            <div
                                id="etapa-2"
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
                                        Etapa 02 • Ingreso al Centro
                                    </span>
                                    <span className="p-1.5 rounded-lg bg-[#19B5FE]/10 text-[#19B5FE]">
                                        <Camera size={18} />
                                    </span>
                                </div>
                                <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                    Registro Fotográfico de Custodia y Control de Pesaje
                                </h3>
                                <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                                    Al arribar a las instalaciones del crematorio, el operador escanea el precinto QR con su smartphone o tablet industrial. La plataforma solicita una fotografía de confirmación del precinto intacto y el peso de entrada. Esto garantiza que la custodia no sufrió ninguna alteración durante el traslado logístico.
                                </p>
                            </div>

                            {/* Etapa 3 */}
                            <div
                                id="etapa-3"
                                className={`p-6 rounded-2xl border transition-all space-y-3 scroll-mt-28 ${
                                    isLight
                                        ? 'bg-white border-slate-200 shadow-sm hover:border-amber-400'
                                        : 'bg-[#071120] border-white/10 hover:border-[#19B5FE]/40'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-mono font-bold text-amber-500 uppercase tracking-wider">
                                        Etapa 03 • Proceso de Horno
                                    </span>
                                    <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                                        <Flame size={18} />
                                    </span>
                                </div>
                                <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                    Protocolo de Horno, Asignación de Operador y Candado Temporal
                                </h3>
                                <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                                    En un servicio individual, el sistema exige escanear el código QR frente a la puerta del horno asignado antes de habilitar el inicio del ciclo. Vinzer registra el identificador del horno, el nombre del operador calificado y la duración exacta en minutos. Si el ciclo requiere 75 minutos, el sistema impide marcar la orden como completada antes de ese plazo biológico/térmico.
                                </p>
                            </div>

                            {/* Etapa 4 */}
                            <div
                                id="etapa-4"
                                className={`p-6 rounded-2xl border transition-all space-y-3 scroll-mt-28 ${
                                    isLight
                                        ? 'bg-white border-slate-200 shadow-sm hover:border-emerald-500'
                                        : 'bg-[#071120] border-white/10 hover:border-emerald-400/40'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-mono font-bold text-emerald-500 uppercase tracking-wider">
                                        Etapa 04 • Entrega Final
                                    </span>
                                    <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                                        <FileCheck2 size={18} />
                                    </span>
                                </div>
                                <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                    Embalaje en Urna y Certificado Digital Inviolable
                                </h3>
                                <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                                    Tras el enfriamiento y molienda de cenizas, se transfieren a la urna sellada con un nuevo sello adhesivo QR. El sistema emite automáticamente el <strong>Certificado Oficial de Cremación en PDF</strong> con un código hash único. Al escanear el QR del certificado, la familia accede a su portal del recuerdo donde valida la legitimidad de su servicio.
                                </p>
                            </div>
                        </section>

                        {/* SECCIÓN 3: Respaldo Legal */}
                        <section
                            id="respaldo-legal"
                            className={`space-y-5 scroll-mt-28 border-t pt-10 ${
                                isLight ? 'border-slate-200' : 'border-white/10'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                                    <Lock size={20} />
                                </span>
                                <h2
                                    className={`text-xl sm:text-2xl font-black tracking-tight ${
                                        isLight ? 'text-slate-900' : 'text-white'
                                    }`}
                                >
                                    3. Respaldo Técnico y Legal frente a Reclamos
                                </h2>
                            </div>

                            <p>
                                Uno de los mayores activos de Vinzer para directores de crematorios es su capacidad de actuar como <strong>auditoría neutral e inalterable</strong>. Cada evento registrado guarda una marca de tiempo inmutable en el servidor que no puede ser editada por operarios para tapar retrasos o errores.
                            </p>

                            <p>
                                Si un cliente o una clínica veterinaria presenta una queja o expresa desconfianza, el director del crematorio no necesita buscar papeles arrugados: abre el expediente digital de la mascota en un clic, descarga el informe cronológico detallado con fotografías fechadas y demuestra la impecabilidad de su trabajo con respaldo pericial.
                            </p>
                        </section>

                        {/* SECCIÓN 4: Interlinking Estratégico */}
                        <section
                            id="interlinking-operativo"
                            className={`p-7 rounded-2xl border space-y-4 scroll-mt-28 ${
                                isLight
                                    ? 'bg-sky-50/70 border-sky-200 text-slate-800'
                                    : 'bg-gradient-to-br from-[#071120] to-[#0a1b33] border-[#19B5FE]/25 text-white'
                            }`}
                        >
                            <span
                                className={`text-[10px] font-black uppercase tracking-widest block ${
                                    isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'
                                }`}
                            >
                                Sincronización Integral
                            </span>
                            <h3 className={`text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                ¿Cómo impacta la trazabilidad en la rentabilidad de tu planta?
                            </h3>
                            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                                La cadena de custodia no debe aislarse de la eficiencia de hornos y combustible. Para aprender cómo organizar los ciclos de encendido, planificar traslados y liquidar comisiones a veterinarias aliadas sin planillas Excel, te recomendamos leer nuestro artículo especializado sobre el{' '}
                                <Link
                                    href="/guias/sistema-gestion-operativa-automatizacion-crematorio-mascotas"
                                    className={`font-bold underline underline-offset-4 transition-colors ${
                                        isLight
                                            ? 'text-[#0284C7] decoration-[#0284C7]/40 hover:text-slate-900'
                                            : 'text-[#19B5FE] decoration-[#19B5FE]/40 hover:text-white'
                                    }`}
                                >
                                    software de optimización operativa para crematorios
                                </Link>
                                .
                            </p>
                            <div>
                                <Link
                                    href="/guias/sistema-gestion-operativa-automatizacion-crematorio-mascotas"
                                    className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider transition-colors ${
                                        isLight ? 'text-[#0284C7] hover:text-[#0369A1]' : 'text-[#19B5FE] hover:text-white'
                                    }`}
                                >
                                    Leer Guía Operativa y Hornos <ArrowRight size={13} />
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
                                <span className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500">
                                    <Users size={20} />
                                </span>
                                <h2
                                    className={`text-xl sm:text-2xl font-black tracking-tight ${
                                        isLight ? 'text-slate-900' : 'text-white'
                                    }`}
                                >
                                    5. Preguntas Frecuentes de Directores y Clínicas
                                </h2>
                            </div>

                            <p className={`text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                Respuestas técnicas a las inquietudes más recurrentes al modernizar el protocolo de custodia con tecnología SaaS:
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
                                    isLight ? 'bg-sky-50 text-[#0284C7]' : 'bg-[#19B5FE]/10 text-[#19B5FE]'
                                }`}
                            >
                                <CheckCircle2 size={20} />
                            </div>
                            <h4 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                ¿Quieres ver la trazabilidad en vivo?
                            </h4>
                            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                Agenda una videollamada personalizada de 20 minutos con uno de nuestros especialistas de producto.
                            </p>
                            <a
                                href="/#demo"
                                className={`block w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md ${
                                    isLight
                                        ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-sky-600/20'
                                        : 'bg-[#19B5FE] hover:bg-[#0e9ce0] text-[#020210] shadow-[#19B5FE]/20'
                                }`}
                            >
                                Agendar Demo Guiada
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
