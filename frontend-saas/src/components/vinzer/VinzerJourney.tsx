'use client';

import React, { useState } from 'react';
import { ClipboardList, Camera, Heart, Sparkles, Award } from 'lucide-react';

// Tres pasos que corresponden al flujo real del sistema. No se menciona
// escaneo de QR ni app de choferes: esas funciones no existen todavía.
const journeyData = [
    {
        title: "1. Registro del Servicio",
        actor: "Recepción / Formulario Público",
        desc: "El servicio se registra desde el panel del crematorio o mediante un formulario de registro temporal con clave de validación. El sistema emite un código de verificación único y el enlace de seguimiento para la familia.",
        details: "Sin transcripción manual: el servicio queda vinculado al cliente, la mascota, el peso, el tipo de cremación y el plan elegido desde el primer minuto.",
        icon: ClipboardList,
        color: "text-[#19B5FE] bg-[#19B5FE]/10 border-[#19B5FE]/30",
        badge: "Paso Inicial"
    },
    {
        title: "2. Avance del Flujo con Evidencia",
        actor: "Operario de Planta",
        desc: "El operador completa cada fase configurada por el crematorio adjuntando foto, notas y su firma. Coordina además los retiros y entregas asignados a su equipo, con dirección y estado de cada tarea.",
        details: "Cada acción crítica queda auditada con usuario, hora y cambios. La línea de tiempo pública se actualiza al instante, sin que nadie tenga que llamar a preguntar.",
        icon: Camera,
        color: "text-[#f3c052] bg-[#f3c052]/10 border-[#f3c052]/30",
        badge: "Operaciones"
    },
    {
        title: "3. Certificado, Memorial y Entrega",
        actor: "Familia y Despedida",
        desc: "El sistema genera el certificado PDF con firma digital, marca de agua y numeración correlativa, y registra la entrega. Si el crematorio lo activa, la familia recibe el enlace a su memorial digital.",
        details: "El memorial es personalizable (temas, partículas, fondos) y las dedicatorias son moderadas por el crematorio antes de publicarse. Los memoriales privados se protegen con una clave de acceso.",
        icon: Heart,
        color: "text-purple-400 bg-purple-400/10 border-purple-400/30",
        badge: "Entrega Final"
    }
];

interface VinzerJourneyProps {
    theme?: 'dark' | 'light';
}

export function VinzerJourney({ theme = 'dark' }: VinzerJourneyProps) {
    const [journeyStep, setJourneyStep] = useState<number>(0);

    return (
        <section id="trazabilidad" className="py-32 px-6 relative z-10 max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
                    theme === 'light'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-700'
                        : 'bg-[#E0B84D]/10 border-[#E0B84D]/20 text-[#E0B84D]'
                }`}>
                    <Award size={12} className={theme === 'light' ? 'text-amber-600' : 'text-[#E0B84D]'} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Confianza Total para las Familias</span>
                </div>
                <h2 className={`text-3xl md:text-5xl font-black ${
                    theme === 'light' ? 'text-slate-900' : 'text-[#FFFFFF]'
                }`}>
                    Cómo funciona: tres pasos para la administración y el control funerario
                </h2>
                <p className={`font-medium ${
                    theme === 'light' ? 'text-slate-600' : 'text-[#C0C0C0]'
                }`}>
                    El miedo de las familias es real: ¿son estas las cenizas de mi mascota? Vinzer responde con un código de verificación único, evidencia por fase y auditoría de cada acción.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                {/* Izquierda: Selector de Pasos */}
                <div className="lg:col-span-5 space-y-4">
                    {journeyData.map((step, idx) => (
                        <button
                            key={idx}
                            onClick={() => setJourneyStep(idx)}
                            className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 flex gap-4 ${
                                journeyStep === idx
                                    ? theme === 'light'
                                        ? 'bg-white border-[#0284C7] shadow-md shadow-sky-500/10'
                                        : 'bg-[#0b0a24] border-[#19B5FE] shadow-lg shadow-[#19B5FE]/5'
                                    : theme === 'light'
                                        ? 'bg-white/80 border-slate-200/80 hover:bg-white hover:border-slate-300'
                                        : 'bg-white/5 border-white/5 hover:bg-white/[0.08]'
                                }`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                                journeyStep === idx
                                    ? theme === 'light'
                                        ? 'text-[#0284C7] bg-sky-50 border-sky-200'
                                        : 'text-[#19B5FE] bg-[#19B5FE]/10 border-[#19B5FE]/30'
                                    : theme === 'light'
                                        ? 'text-slate-500 bg-slate-100 border-slate-200'
                                        : 'text-slate-400 bg-white/5 border-white/5'
                                }`}>
                                <step.icon size={20} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className={`font-bold text-sm ${
                                        theme === 'light' ? 'text-slate-900' : 'text-[#FFFFFF]'
                                    }`}>{step.title}</h4>
                                    <span className={`text-[9px] uppercase tracking-wider font-bold ${
                                        theme === 'light' ? 'text-slate-500' : 'text-slate-500'
                                    }`}>({step.actor})</span>
                                </div>
                                <p className={`text-xs mt-1 line-clamp-1 ${
                                    theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                                }`}>{step.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Derecha: Detalle Animado */}
                <div className={`lg:col-span-7 border rounded-[2.5rem] p-8 min-h-[350px] flex flex-col justify-between relative overflow-hidden transition-all duration-500 ${
                    theme === 'light'
                        ? 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'
                        : 'bg-[#0b0a24] border-white/10'
                }`}>
                    {/* Brillo decorativo */}
                    <div className={`absolute top-0 right-0 w-64 h-64 blur-3xl rounded-full ${
                        theme === 'light' ? 'bg-sky-500/10' : 'bg-[#19B5FE]/5'
                    }`} />

                    <div className="relative z-10 space-y-6">
                        <div className="flex justify-between items-center">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${
                                theme === 'light' ? 'text-amber-600' : 'text-[#E0B84D]'
                            }`}>
                                Detalle del Flujo de Trabajo
                            </span>
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                theme === 'light'
                                    ? 'bg-sky-50 text-[#0284C7] border-sky-200'
                                    : 'bg-[#19B5FE]/15 text-[#19B5FE] border-[#19B5FE]/30'
                            }`}>
                                {journeyData[journeyStep].badge}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <h3 className={`text-2xl font-bold ${
                                theme === 'light' ? 'text-slate-900' : 'text-[#FFFFFF]'
                            }`}>
                                {journeyData[journeyStep].title}
                            </h3>
                            <p className={`text-sm leading-relaxed ${
                                theme === 'light' ? 'text-slate-600' : 'text-[#C0C0C0]'
                            }`}>
                                {journeyData[journeyStep].desc}
                            </p>
                            <div className={`p-4 rounded-xl border ${
                                theme === 'light'
                                    ? 'bg-amber-500/5 border-amber-500/20'
                                    : 'bg-white/5 border-white/5'
                            }`}>
                                <h5 className={`text-xs font-bold flex items-center gap-1.5 ${
                                    theme === 'light' ? 'text-amber-700' : 'text-[#E0B84D]'
                                }`}>
                                    <Sparkles size={12} className={theme === 'light' ? 'text-amber-600' : 'text-[#E0B84D]'} /> Valor para el negocio:
                                </h5>
                                <p className={`text-xs mt-1 ${
                                    theme === 'light' ? 'text-slate-700' : 'text-slate-400'
                                }`}>
                                    {journeyData[journeyStep].details}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className={`pt-8 border-t flex items-center justify-between text-xs font-mono ${
                        theme === 'light' ? 'border-slate-100 text-slate-500' : 'border-white/5 text-slate-500'
                    }`}>
                        <span>Actor principal: {journeyData[journeyStep].actor}</span>
                        <span>Paso {journeyStep + 1} de {journeyData.length}</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
