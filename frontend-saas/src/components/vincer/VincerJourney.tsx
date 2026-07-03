'use client';

import React, { useState } from 'react';
import { QrCode, MapPin, Flame, Heart, Sparkles, Award } from 'lucide-react';

const journeyData = [
    {
        title: "1. Registro del Servicio",
        actor: "Recepción / Formulario Público",
        desc: "El servicio se registra desde el panel del crematorio o mediante un formulario público temporal (con PIN de validación). El sistema genera un código de verificación único de 10 caracteres y un token de tracking para la familia.",
        details: "Sin transcripción manual: el QR del servicio queda vinculado al cliente, mascota, peso, tipo de cremación y plan elegido desde el inicio.",
        icon: QrCode,
        color: "text-[#19B5FE] bg-[#19B5FE]/10 border-[#19B5FE]/30",
        badge: "Paso Inicial"
    },
    {
        title: "2. Recogida Certificada",
        actor: "Chofer / Logística",
        desc: "El chofer recibe la alerta en su móvil, escanea la etiqueta QR y completa un checklist en vivo de pertenencias (manta, collar, juguetes) más la firma digital de recepción del responsable.",
        details: "El checklist queda registrado como evidencia auditada y la familia recibe automáticamente el enlace de Tracking en tiempo real con su token único.",
        icon: MapPin,
        color: "text-[#f3c052] bg-[#f3c052]/10 border-[#f3c052]/30",
        badge: "Logística"
    },
    {
        title: "3. Confirmación e Inicio de Cremación",
        actor: "Operario de Planta",
        desc: "Al llegar a planta, el operario escanea nuevamente el QR para validar la identidad de la mascota y el tipo de servicio (individual o colectivo) antes de iniciar el proceso.",
        details: "El sistema registra el avance fase a fase con evidencia fotográfica opcional y firma del operario. La familia ve el cambio de estado en tiempo real en su Plan de Tracking.",
        icon: Flame,
        color: "text-red-400 bg-red-400/10 border-red-400/30",
        badge: "Operaciones"
    },
    {
        title: "4. Certificado y Memorial",
        actor: "Familia y Despedida",
        desc: "El sistema genera el certificado PDF con firma digital, marca de agua y numeración secuencial. La familia recibe el enlace a su Memorial Digital y puede dejar dedicatorias, encender velas virtuales y subir fotos.",
        details: "El memorial es personalizable (temas, partículas, fondos). Las dedicatorias son moderadas por el crematorio antes de publicarse. Acceso opcional protegido con PIN de 6 dígitos para memoriales privados.",
        icon: Heart,
        color: "text-purple-400 bg-purple-400/10 border-purple-400/30",
        badge: "Entrega Final"
    }
];

export function VincerJourney() {
    const [journeyStep, setJourneyStep] = useState<number>(0);

    return (
        <section id="trazabilidad" className="py-32 px-6 relative z-10 max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E0B84D]/10 border border-[#E0B84D]/20 rounded-full">
                    <Award size={12} className="text-[#E0B84D]" />
                    <span className="text-[10px] font-black text-[#E0B84D] uppercase tracking-widest">Confianza Total para las Familias</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-[#FFFFFF]">
                    Trazabilidad QR inviolable para la administración y control funerario
                </h2>
                <p className="text-[#C0C0C0] font-medium">
                    El miedo de las familias es real: ¿Son estas las cenizas de mi mascota? Vincer responde a esta inquietud con tecnología inviolable de punta a punta.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                {/* Izquierda: Selector de Pasos */}
                <div className="lg:col-span-5 space-y-4">
                    {journeyData.map((step, idx) => (
                        <button
                            key={idx}
                            onClick={() => setJourneyStep(idx)}
                            className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 flex gap-4 ${journeyStep === idx
                                ? 'bg-[#0b0a24] border-[#19B5FE] shadow-lg shadow-[#19B5FE]/5'
                                : 'bg-white/5 border-white/5 hover:bg-white/[0.08]'
                                }`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${journeyStep === idx ? 'text-[#19B5FE] bg-[#19B5FE]/10 border-[#19B5FE]/30' : 'text-slate-400 bg-white/5 border-white/5'
                                }`}>
                                <step.icon size={20} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-sm text-[#FFFFFF]">{step.title}</h4>
                                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">({step.actor})</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1 line-clamp-1">{step.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Derecha: Detalle Animado */}
                <div className="lg:col-span-7 bg-[#0b0a24] border border-white/10 rounded-[2.5rem] p-8 min-h-[350px] flex flex-col justify-between relative overflow-hidden">
                    {/* Brillo decorativo */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#19B5FE]/5 blur-3xl rounded-full" />

                    <div className="relative z-10 space-y-6">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#E0B84D]">
                                Detalle del Flujo de Trabajo
                            </span>
                            <span className="bg-[#19B5FE]/15 text-[#19B5FE] border border-[#19B5FE]/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                                {journeyData[journeyStep].badge}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-2xl font-bold text-[#FFFFFF]">
                                {journeyData[journeyStep].title}
                            </h3>
                            <p className="text-[#C0C0C0] text-sm leading-relaxed">
                                {journeyData[journeyStep].desc}
                            </p>
                            <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                                <h5 className="text-xs font-bold text-[#E0B84D] flex items-center gap-1.5">
                                    <Sparkles size={12} className="text-[#E0B84D]" /> Valor para el negocio:
                                </h5>
                                <p className="text-xs text-slate-400 mt-1">
                                    {journeyData[journeyStep].details}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/5 flex items-center justify-between text-xs text-slate-500 font-mono">
                        <span>Actor principal: {journeyData[journeyStep].actor}</span>
                        <span>Paso {journeyStep + 1} de 4</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
