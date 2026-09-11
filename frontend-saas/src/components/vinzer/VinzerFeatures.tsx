'use client';

import React from 'react';
import {
    LayoutDashboard,
    ShieldCheck,
    Camera,
    FileCheck2,
    Boxes,
    CheckCircle2,
    X,
} from 'lucide-react';

interface VinzerFeaturesProps {
    theme?: 'dark' | 'light';
}

/**
 * Cuatro pilares operativos.
 *
 * Reemplaza a los antiguos bloques `#modulos` (tabs) y `#capacidades` (12
 * tarjetas). Todo el copy describe capacidades que existen en el sistema:
 * no se menciona QR, geolocalización ni app de choferes, porque nada de eso
 * está construido.
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
    'Coordinación por WhatsApp, llamadas y correos sueltos, sin registro centralizado.',
    'Etiquetas de papel escritas a mano que se pueden extraviar o dañar en el proceso.',
    'Certificados impresos en Word, con riesgo de alteración o desorganización.',
    'La familia llama para preguntar y nadie puede darle una respuesta verificable.',
    'Falta de visibilidad y transparencia para la familia durante el proceso.',
];

const modern = [
    'Código de verificación único e irrepetible por cada servicio.',
    'Flujo de trabajo configurable con evidencia fotográfica obligatoria por fase.',
    'Certificados PDF automáticos con firma digital y marca de agua personalizable.',
    'Seguimiento público y transparente en tiempo real para la familia.',
    'Historial completo: cada acción queda registrada con responsable, fecha y detalle.',
];

export function VinzerFeatures({ theme = 'dark' }: VinzerFeaturesProps) {
    const isLight = theme === 'light';

    return (
        <>
            {/* Pilares operativos */}
            <section
                id="modulos"
                className={`py-28 border-y relative z-10 transition-colors duration-500 ${
                    isLight ? 'bg-slate-100/70 border-slate-200' : 'bg-[#0b0a24]/30 border-white/5'
                }`}
            >
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
                            Un solo software para la gestión operativa, trazabilidad y control de tu crematorio
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
            <section id="comparativa" className="py-28 px-6 max-w-7xl mx-auto relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
                    <h2 className={`text-3xl md:text-5xl font-black leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        ¿Por qué los crematorios de mascotas eligen Vinzer?
                    </h2>
                    <p className={`font-medium ${isLight ? 'text-slate-600' : 'text-[#C0C0C0]'}`}>
                        La diferencia entre operar con métodos manuales y centralizar tu negocio en una
                        plataforma con trazabilidad verificable.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                    <div className={`p-7 lg:p-8 rounded-3xl space-y-6 border ${
                        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0b0a24]/10 border-white/5'
                    }`}>
                        <h3 className={`text-lg font-bold flex items-center gap-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            <span className="w-2 h-2 rounded-full bg-red-500" /> Método tradicional / manual
                        </h3>
                        <ul className="space-y-4">
                            {traditional.map((item) => (
                                <li key={item} className={`flex gap-3 text-xs leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                    <X size={16} className="text-red-500 shrink-0 mt-0.5" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className={`p-7 lg:p-8 rounded-3xl space-y-6 relative overflow-hidden border transition-all duration-500 ${
                        isLight
                            ? 'bg-white border-[#0284C7] shadow-xl shadow-sky-500/10'
                            : 'bg-[#0b0a24] border-[#19B5FE]/30 shadow-lg shadow-[#19B5FE]/5'
                    }`}>
                        <div className={`absolute top-0 right-0 w-32 h-32 blur-2xl rounded-full ${
                            isLight ? 'bg-sky-500/10' : 'bg-[#19B5FE]/5'
                        }`} />
                        <h3 className={`text-lg font-bold flex items-center gap-2 relative ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            <span className={`w-2 h-2 rounded-full ${isLight ? 'bg-[#0284C7]' : 'bg-[#19B5FE]'}`} />
                            Gestión moderna con Vinzer
                        </h3>
                        <ul className="space-y-4 relative">
                            {modern.map((item) => (
                                <li key={item} className={`flex gap-3 text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-[#C0C0C0]'}`}>
                                    <CheckCircle2 size={16} className={`shrink-0 mt-0.5 ${isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'}`} />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>
        </>
    );
}
