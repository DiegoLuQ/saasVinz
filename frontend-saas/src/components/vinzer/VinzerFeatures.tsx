'use client';

import React from 'react';
import {
    LayoutDashboard,
    ShieldCheck,
    Camera,
    FileCheck2,
    Boxes,
    CheckCircle2,
    Check,
    Sparkles,
    X,
} from 'lucide-react';

interface VinzerFeaturesProps {
    theme?: 'dark' | 'light';
}

/**
 * Cuatro pilares operativos.
 */
const pillars = [
    {
        icon: ShieldCheck,
        title: 'Trazabilidad y custodia verificable',
        copy: 'Cada servicio genera un código de verificación único y un enlace de seguimiento privado para la familia. El flujo de trabajo es configurable por crematorio y cada acción crítica queda registrada con usuario, hora y cambios en un historial de auditoría completo.',
    },
    {
        icon: Camera,
        title: 'Evidencia fotográfica por fase',
        copy: 'Avanzar una etapa exige adjuntar evidencia: foto, notas y firma del operador. La familia ve esa misma línea de tiempo en tiempo real, sin iniciar sesión y sin llamar a preguntar.',
    },
    {
        icon: FileCheck2,
        title: 'Certificados digitales personalizables',
        copy: 'Certificados PDF automáticos con los datos de la mascota, el tutor, el tipo de servicio, firma digital, marca de agua y numeración correlativa. Las plantillas son editables en secciones, colores, orden y tipografías.',
        note: 'Disponible desde el plan Normal',
    },
    {
        icon: Boxes,
        title: 'Catálogo, inventario y coordinación de retiros',
        copy: 'Control de servicios, productos y ánforas con stock en tiempo real, junto a la asignación de retiros y entregas a los responsables de tu equipo, con dirección y estado de cada tarea.',
    },
];

const traditional = [
    {
        bold: 'WhatsApp saturado:',
        desc: 'Fotos de fichas y datos dispersos entre traslados, recepción y planta.',
    },
    {
        bold: 'Planillas y papel:',
        desc: 'Información duplicada en Excel y riesgo de confundir precintos, fichas o urnas.',
    },
    {
        bold: 'Familias con incertidumbre:',
        desc: 'Llamadas constantes al crematorio preguntando: «¿Dónde está mi mascota y a qué hora termina?».',
    },
    {
        bold: 'Certificados en Word:',
        desc: 'Horas perdidas tipeando actas a mano y ajustando plantillas al final del turno.',
    },
    {
        bold: 'Cero auditoría:',
        desc: 'Imposible reconstruir con certeza qué operador hizo cada tarea ante el reclamo de una familia.',
    },
];

const modern = [
    {
        bold: 'Historial digital único:',
        desc: 'Trazabilidad inmutable con código único de verificación desde el retiro hasta la entrega.',
    },
    {
        bold: 'Operación 100% en la nube:',
        desc: 'Tu equipo actualiza y consulta el estado de cada mascota en segundos desde cualquier computador o celular.',
    },
    {
        bold: 'Tranquilidad familiar automática:',
        desc: 'Los tutores consultan el avance en vivo ingresando su código en la web, sin necesidad de llamarte.',
    },
    {
        bold: 'Certificados en 1 clic:',
        desc: 'Emisión automática en PDF con firma digital, numeración correlativa y diseño personalizable.',
    },
    {
        bold: 'Auditoría blindada:',
        desc: 'Registro de evidencia fotográfica, operador responsable, fecha y hora exacta de cada fase.',
    },
];

export function VinzerFeatures({ theme = 'dark' }: VinzerFeaturesProps) {
    const isLight = theme === 'light';

    return (
        <>
            {/* Pilares operativos */}
            <section
                id="producto"
                className={`py-28 border-y relative z-10 transition-colors duration-500 ${
                    isLight ? 'bg-slate-100/70 border-slate-200' : 'bg-[#0b0a24]/30 border-white/5'
                }`}
            >
                <div id="modulos" className="sr-only" />
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
                            isLight
                                ? 'bg-sky-500/10 border-sky-500/20 text-[#0284C7]'
                                : 'bg-[#19B5FE]/10 border-[#19B5FE]/30 text-[#19B5FE]'
                        }`}>
                            <LayoutDashboard size={12} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Módulos del sistema</span>
                        </div>

                        <h2 className={`text-3xl md:text-5xl font-black leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            Todo el proceso en un solo lugar
                        </h2>

                        <p className={`font-medium ${isLight ? 'text-slate-600' : 'text-[#C0C0C0]'}`}>
                            Olvídate de contratar múltiples herramientas inconexas. Estos son los cuatro pilares
                            sobre los que trabaja tu equipo todos los días.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
                        {pillars.map(({ icon: Icon, title, copy, note }) => (
                            <div
                                key={title}
                                className={`rounded-3xl p-7 lg:p-8 border transition-all duration-300 group ${
                                    isLight
                                        ? 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-[#0284C7]/40'
                                        : 'bg-[#020210] border-white/5 hover:border-[#19B5FE]/30'
                                }`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 border transition-transform group-hover:scale-105 ${
                                    isLight
                                        ? 'bg-sky-50 border-sky-200 text-[#0284C7]'
                                        : 'bg-[#19B5FE]/10 border-[#19B5FE]/25 text-[#19B5FE]'
                                }`}>
                                    <Icon size={22} />
                                </div>

                                <h3 className={`text-lg font-black mb-3 leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                    {title}
                                </h3>

                                <p className={`text-[13px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-[#C0C0C0]'}`}>
                                    {copy}
                                </p>

                                {note && (
                                    <div className={`inline-flex items-center mt-4 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                        isLight
                                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                                            : 'bg-[#E0B84D]/10 border-[#E0B84D]/25 text-[#E0B84D]'
                                    }`}>
                                        {note}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Comparativa: método tradicional vs Vinzer.
                Se conserva a propósito: es el bloque que rompe la objeción real
                de este mercado ("lo hago con Excel y WhatsApp"). */}
            {/* Comparativa: El cuello de botella operativo (Método tradicional vs Vinzer) */}
            <section id="comparativa" className="py-24 lg:py-32 px-4 sm:px-6 max-w-7xl mx-auto relative z-10">
                {/* Header con Badge y Título de Alto Impacto */}
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    {/* Badge con paleta oficial de Vinzer */}
                    <div
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-xs ${
                            isLight
                                ? 'bg-sky-50 border-sky-200 text-[#0284C7]'
                                : 'bg-[#19B5FE]/10 border-[#19B5FE]/30 text-[#19B5FE]'
                        }`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-[#0284C7]' : 'bg-[#19B5FE]'} animate-pulse`} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            El cuello de botella operativo
                        </span>
                    </div>

                    <h2
                        className={`text-3xl sm:text-4xl md:text-5xl lg:text-[50px] font-black tracking-tight leading-[1.12] ${
                            isLight ? 'text-slate-900' : 'text-white'
                        }`}
                    >
                        Crecer es una gran noticia.{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-sky-500 drop-shadow-[0_0_24px_rgba(56,189,248,0.25)] block sm:inline">
                            Perder el control del día a día, no.
                        </span>
                    </h2>

                    <p
                        className={`text-sm sm:text-base font-normal max-w-2xl mx-auto leading-relaxed ${
                            isLight ? 'text-slate-600' : 'text-slate-300'
                        }`}
                    >
                        A medida que aumentan los servicios y retiros diarios, la administración de un crematorio colapsa si depende de libretas de papel y mensajes de WhatsApp.
                    </p>
                </div>

                {/* Grid 2 Columnas: Tradicional vs Vinzer */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-stretch">
                    {/* Columna Izquierda: Método Tradicional */}
                    <div
                        className={`p-7 sm:p-9 rounded-[2rem] flex flex-col justify-between border transition-all ${
                            isLight
                                ? 'bg-white border-slate-200 shadow-lg shadow-slate-200/50'
                                : 'bg-[#050B14]/80 backdrop-blur-xl border-white/10 shadow-2xl'
                        }`}
                    >
                        <div className="space-y-6">
                            <h3
                                className={`text-xs font-black uppercase tracking-wider flex items-center gap-2.5 ${
                                    isLight ? 'text-slate-700' : 'text-slate-300'
                                }`}
                            >
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                Método tradicional / manual
                            </h3>

                            <ul className="space-y-4">
                                {traditional.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm leading-relaxed">
                                        <X size={17} className="text-red-500 shrink-0 mt-0.5" />
                                        <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>
                                            <strong className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>
                                                {item.bold}{' '}
                                            </strong>
                                            {item.desc}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div
                            className={`pt-6 mt-6 border-t text-[11px] italic ${
                                isLight ? 'border-slate-200 text-slate-400' : 'border-white/5 text-slate-500'
                            }`}
                        >
                            Operación frágil, dependiente de la memoria y propensa al error humano.
                        </div>
                    </div>

                    {/* Columna Derecha: Vinzer SaaS (Recomendado) */}
                    <div
                        className={`p-7 sm:p-9 rounded-[2rem] flex flex-col justify-between relative overflow-visible border-2 transition-all duration-300 ${
                            isLight
                                ? 'bg-white border-[#0284C7] shadow-xl shadow-sky-500/15'
                                : 'bg-[#071022]/90 backdrop-blur-2xl border-[#19B5FE]/50 shadow-[0_0_40px_rgba(25,181,254,0.12)]'
                        }`}
                    >
                        {/* Pill Badge flotante RECOMENDADO */}
                        <div className="absolute -top-3.5 right-6 sm:right-8 z-20">
                            <span
                                className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${
                                    isLight
                                        ? 'bg-[#0284C7] text-white shadow-sky-600/30'
                                        : 'bg-[#19B5FE] text-[#020210] shadow-[0_0_20px_rgba(25,181,254,0.5)]'
                                }`}
                            >
                                Recomendado
                            </span>
                        </div>

                        {/* Glow interior decorativo */}
                        <div
                            className={`absolute top-0 right-0 w-56 h-56 blur-3xl rounded-full pointer-events-none -z-10 ${
                                isLight ? 'bg-sky-500/10' : 'bg-[#19B5FE]/10'
                            }`}
                        />

                        <div className="space-y-6">
                            <h3
                                className={`text-xs font-black uppercase tracking-wider flex items-center gap-2.5 ${
                                    isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'
                                }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${isLight ? 'bg-[#0284C7]' : 'bg-[#19B5FE]'}`} />
                                Gestión moderna con Vinzer
                            </h3>

                            <ul className="space-y-4">
                                {modern.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm leading-relaxed">
                                        <Check
                                            size={17}
                                            className={`shrink-0 mt-0.5 stroke-[2.5] ${
                                                isLight ? 'text-[#0284C7]' : 'text-cyan-400'
                                            }`}
                                        />
                                        <span className={isLight ? 'text-slate-700' : 'text-slate-200'}>
                                            <strong className={`font-bold ${isLight ? 'text-slate-950' : 'text-white'}`}>
                                                {item.bold}{' '}
                                            </strong>
                                            {item.desc}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Footer de la tarjeta con Control Total */}
                        <div
                            className={`pt-6 mt-6 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-semibold ${
                                isLight ? 'border-slate-200 text-slate-600' : 'border-white/10 text-slate-300'
                            }`}
                        >
                            <span>Software para crematorios 100% en la nube</span>
                            <span
                                className={`inline-flex items-center gap-1.5 font-bold ${
                                    isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'
                                }`}
                            >
                                Control total <Sparkles size={13} />
                            </span>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
