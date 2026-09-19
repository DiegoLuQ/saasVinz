'use client';

import React, { useRef, useState } from 'react';
import { Flame, CheckCircle2, Check, Circle, Heart } from 'lucide-react';

interface VinzerMemorialCardProps {
    className?: string;
}

export function VinzerMemorialCard({ className = '' }: VinzerMemorialCardProps) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [transform, setTransform] = useState<string>('rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!wrapperRef.current) return;
        const rect = wrapperRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Rotación suave de hasta 8 grados
        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;

        setTransform(`rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`);
    };

    const handleMouseLeave = () => {
        setTransform('rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    };

    return (
        <div className={`w-full max-w-[460px] mx-auto select-none ${className}`} style={{ perspective: '1000px' }}>
            <style jsx>{`
                @keyframes rotateBeam {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes lightSweep {
                    0% { top: -30%; opacity: 0; }
                    20% { opacity: 0.6; }
                    80% { opacity: 0.6; }
                    100% { top: 120%; opacity: 0; }
                }
                .beam-border {
                    position: relative;
                    overflow: hidden;
                    border-radius: 2.2rem;
                    padding: 2px;
                }
                .beam-border::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: conic-gradient(
                        from 0deg,
                        transparent 0deg,
                        transparent 240deg,
                        rgba(25, 181, 254, 0.25) 290deg,
                        #19b5fe 360deg
                    );
                    animation: rotateBeam 5s linear infinite;
                    z-index: 0;
                }
                .sweep-glow {
                    position: absolute;
                    left: 0;
                    right: 0;
                    height: 90px;
                    background: linear-gradient(
                        180deg,
                        transparent 0%,
                        rgba(25, 181, 254, 0.12) 50%,
                        rgba(56, 189, 248, 0.25) 75%,
                        transparent 100%
                    );
                    filter: blur(10px);
                    animation: lightSweep 4.5s ease-in-out infinite;
                    pointer-events: none;
                    z-index: 20;
                }
            `}</style>

            {/* Wrapper con el borde giratorio luminoso */}
            <div
                ref={wrapperRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="beam-border shadow-[0_0_50px_-10px_rgba(25,181,254,0.35)] cursor-default transition-all duration-300"
            >
                {/* Tarjeta interior con efecto Tilt */}
                <div
                    style={{
                        transform,
                        transition: 'transform 0.18s cubic-bezier(0.2, 0, 0.2, 1)',
                        transformStyle: 'preserve-3d',
                    }}
                    className="relative bg-[#090F1E]/95 backdrop-blur-2xl rounded-[calc(2.2rem-2px)] p-6 sm:p-7 border border-white/10 z-10 overflow-hidden text-slate-200"
                >
                    {/* Haz de luz que barre la tarjeta */}
                    <div className="sweep-glow" />

                    {/* Encabezado Memorial: Vínculo y Estado */}
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6 relative z-10">
                        <div className="flex items-center gap-3">
                            {/* Icono de llama celeste con pulso */}
                            <div className="w-9 h-9 rounded-xl bg-[#19b5fe]/15 text-[#19b5fe] flex items-center justify-center border border-[#19b5fe]/40 shadow-[0_0_20px_rgba(25,181,254,0.3)]">
                                <Flame size={20} className="animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-xs font-extrabold text-white tracking-wider">PORTAL DEL RECUERDO</h3>
                                <p className="text-[10px] text-[#19b5fe] font-mono mt-0.5 tracking-wide">SEGUIMIENTO PRIVADO DE FAMILIA</p>
                            </div>
                        </div>

                        {/* Badge Acompañando en celeste */}
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#19b5fe]/15 text-[#19b5fe] border border-[#19b5fe]/40 flex items-center gap-1.5 shadow-[0_0_12px_rgba(25,181,254,0.2)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#19b5fe] animate-ping" />
                            Acompañando
                        </span>
                    </div>

                    {/* Homenaje a la Mascota: Foto con marco gradiente celeste */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-[#19b5fe]/[0.06] to-transparent border border-white/[0.08] relative z-10">
                        <div className="flex items-center gap-4">
                            {/* Marco de la foto con gradiente celeste */}
                            <div className="relative w-16 h-16 rounded-2xl p-[2px] bg-gradient-to-tr from-[#19b5fe] to-sky-300 shrink-0 shadow-lg shadow-[#19b5fe]/25">
                                <img
                                    src="https://images.unsplash.com/photo-1544568100-847a948585b9?auto=format&fit=crop&q=80&w=250"
                                    alt="Pelusa descansando en paz"
                                    className="w-full h-full object-cover rounded-[14px]"
                                />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-lg font-black text-white tracking-tight truncate">Pelusa</h4>
                                    <span className="text-xs text-[#19b5fe] font-serif italic drop-shadow-[0_0_10px_rgba(25,181,254,0.4)] shrink-0">
                                        «Siempre en el corazón»
                                    </span>
                                </div>
                                <p className="text-xs text-slate-300 mt-0.5">Gato Persa • Familia Muñoz</p>

                                {/* Badges de validación */}
                                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-[10px] bg-[#19b5fe]/10 text-[#19b5fe] px-2 py-0.5 rounded border border-[#19b5fe]/30 font-bold tracking-wide">
                                        Precinto QR #VP-2026
                                    </span>
                                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                                        <Check size={12} strokeWidth={3} /> Custodia verificada
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Etapas de Trazabilidad */}
                    <div className="mt-5 space-y-2.5 relative z-10">
                        {/* Paso 1: Completado */}
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2.5 text-slate-300">
                                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                                <span>1. Recepción y colocación de precinto</span>
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 shrink-0">09:30 hrs</span>
                        </div>

                        {/* Paso 2: Completado */}
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2.5 text-slate-300">
                                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                                <span>2. Traslado respetuoso a instalaciones</span>
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 shrink-0">10:45 hrs</span>
                        </div>

                        {/* Paso 3: En Proceso (Resaltado en Celeste Neón con Glow) */}
                        <div className="p-3 rounded-xl bg-[#19b5fe]/10 border-2 border-[#19b5fe]/60 flex items-center justify-between text-xs shadow-[0_0_30px_-5px_rgba(25,181,254,0.35)]">
                            <span className="flex items-center gap-2.5 text-white font-bold">
                                <Flame size={16} className="text-[#19b5fe] animate-pulse shrink-0" />
                                <span>3. Cremación Individual en Curso</span>
                            </span>
                            <span className="text-[10px] text-[#19b5fe] font-mono font-bold bg-[#19b5fe]/20 px-2 py-0.5 rounded border border-[#19b5fe]/30 shrink-0">
                                Cámara 02
                            </span>
                        </div>

                        {/* Paso 4: Pendiente */}
                        <div className="p-3 rounded-xl bg-white/[0.01] border border-white/[0.02] flex items-center justify-between text-xs text-slate-500">
                            <span className="flex items-center gap-2.5">
                                <Circle size={14} className="text-slate-600 shrink-0" />
                                <span>4. Preparación de urna y certificado</span>
                            </span>
                            <span className="font-mono text-[10px] shrink-0">Estimado 16:00 hrs</span>
                        </div>
                    </div>

                    {/* Pie de la Tarjeta con detalles en Celeste */}
                    <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400 relative z-10">
                        <span className="flex items-center gap-1.5">
                            <Heart size={14} className="text-rose-400 fill-rose-400/30 shrink-0" />
                            Proceso realizado con amor y respeto
                        </span>
                        <span className="text-[#19b5fe] font-bold font-mono tracking-wide drop-shadow-[0_0_8px_rgba(25,181,254,0.4)]">
                            100% Trazable
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
