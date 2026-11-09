'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Compass, Sparkles, HeartHandshake, Eye, ShieldCheck, Quote } from 'lucide-react';

interface VinzerPurposeProps {
    theme?: 'dark' | 'light';
}

export function VinzerPurpose({ theme = 'dark' }: VinzerPurposeProps) {
    const isLight = theme === 'light';

    return (
        <section
            id="proposito"
            className={`relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden transition-colors duration-500 ${
                isLight ? 'bg-gradient-to-b from-slate-50 via-white to-slate-50' : 'bg-[#020210]'
            }`}
        >
            {/* Elementos ambientales de fondo */}
            <div className="absolute inset-0 pointer-events-none -z-10">
                <div
                    className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] blur-[150px] rounded-full ${
                        isLight ? 'bg-[#0284C7]/8' : 'bg-[#19B5FE]/10'
                    }`}
                />
                <div
                    className={`absolute bottom-10 right-10 w-80 h-80 blur-[130px] rounded-full ${
                        isLight ? 'bg-amber-400/8' : 'bg-[#E7C15A]/8'
                    }`}
                />
            </div>

            <div className="max-w-6xl mx-auto space-y-16 sm:space-y-20 relative z-10">
                {/* Cabecera / Eslogan Central */}
                <div className="text-center max-w-3xl mx-auto space-y-5">
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-xs transition-all bg-[#19B5FE]/10 border-[#19B5FE]/30 text-[#19B5FE]"
                    >
                        <Compass size={14} className="text-[#19B5FE]" />
                        <span className="text-[11px] font-black uppercase tracking-widest">
                            Propósito
                        </span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className={`text-3xl sm:text-4xl md:text-5xl lg:text-[46px] font-black tracking-tight leading-[1.15] ${
                            isLight ? 'text-slate-900' : 'text-white'
                        }`}
                    >
                        «Cuando el vínculo importa, <span className="text-[#19B5FE]">todo cambia</span>».
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className={`text-base sm:text-lg leading-relaxed ${
                            isLight ? 'text-slate-600' : 'text-slate-300/90'
                        }`}
                    >
                        Detrás de cada cremación hay una familia y una historia irreemplazable. Construimos tecnología
                        diseñada para honrar esa confianza con máxima transparencia y sensibilidad.
                    </motion.p>
                </div>

                {/* 2 Columnas Editoriales: Misión & Visión */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
                    {/* Bloque Misión */}
                    <motion.div
                        initial={{ opacity: 0, y: 25 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className={`relative rounded-3xl p-8 sm:p-10 border transition-all duration-300 flex flex-col justify-between ${
                            isLight
                                ? 'bg-white border-slate-200/90 shadow-xl shadow-slate-200/50 hover:border-slate-300'
                                : 'bg-gradient-to-b from-white/[0.06] to-white/[0.02] border-white/10 hover:border-white/20 shadow-2xl'
                        }`}
                    >
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div
                                    className={`p-3 rounded-2xl border ${
                                        isLight
                                            ? 'bg-sky-50 border-sky-200 text-[#0284C7]'
                                            : 'bg-[#19B5FE]/10 border-[#19B5FE]/25 text-[#19B5FE]'
                                    }`}
                                >
                                    <HeartHandshake size={24} />
                                </div>
                                <span
                                    className={`text-xs font-black tracking-widest uppercase ${
                                        isLight ? 'text-slate-400' : 'text-white/40'
                                    }`}
                                >
                                    01 · Pilar Operativo
                                </span>
                            </div>

                            <div className="space-y-3">
                                <h3
                                    className={`text-2xl font-bold tracking-tight ${
                                        isLight ? 'text-slate-900' : 'text-white'
                                    }`}
                                >
                                    Nuestra misión
                                </h3>
                                <p
                                    className={`text-sm sm:text-base leading-relaxed ${
                                        isLight ? 'text-slate-600' : 'text-slate-300/85'
                                    }`}
                                >
                                    Desarrollar soluciones tecnológicas que simplifiquen y profesionalicen la gestión de crematorios de mascotas, conectando a las empresas con las familias mediante herramientas que entreguen transparencia, trazabilidad y experiencias conmemorativas significativas.
                                </p>
                            </div>
                        </div>

                        {/* Cita de impacto interna */}
                        <div
                            className={`mt-8 pt-6 border-t rounded-2xl p-4 flex items-start gap-3 ${
                                isLight
                                    ? 'bg-sky-50/60 border-sky-100 text-slate-800'
                                    : 'bg-[#19B5FE]/[0.06] border-[#19B5FE]/15 text-slate-200'
                            }`}
                        >
                            <Quote size={20} className="text-[#19B5FE] shrink-0 mt-0.5" />
                            <p className="text-xs sm:text-sm font-medium italic leading-relaxed">
                                «Queremos que cada proceso sea más sencillo para quienes trabajan en él y más cercano para quienes confían en él».
                            </p>
                        </div>
                    </motion.div>

                    {/* Bloque Visión */}
                    <motion.div
                        initial={{ opacity: 0, y: 25 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className={`relative rounded-3xl p-8 sm:p-10 border transition-all duration-300 flex flex-col justify-between ${
                            isLight
                                ? 'bg-white border-slate-200/90 shadow-xl shadow-slate-200/50 hover:border-slate-300'
                                : 'bg-gradient-to-b from-white/[0.06] to-white/[0.02] border-white/10 hover:border-white/20 shadow-2xl'
                        }`}
                    >
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div
                                    className={`p-3 rounded-2xl border ${
                                        isLight
                                            ? 'bg-amber-50 border-amber-200 text-amber-600'
                                            : 'bg-[#E7C15A]/10 border-[#E7C15A]/25 text-[#E7C15A]'
                                    }`}
                                >
                                    <Sparkles size={24} />
                                </div>
                                <span
                                    className={`text-xs font-black tracking-widest uppercase ${
                                        isLight ? 'text-slate-400' : 'text-white/40'
                                    }`}
                                >
                                    02 · Horizonte y Futuro
                                </span>
                            </div>

                            <div className="space-y-3">
                                <h3
                                    className={`text-2xl font-bold tracking-tight ${
                                        isLight ? 'text-slate-900' : 'text-white'
                                    }`}
                                >
                                    Nuestra visión
                                </h3>
                                <p
                                    className={`text-sm sm:text-base leading-relaxed ${
                                        isLight ? 'text-slate-600' : 'text-slate-300/85'
                                    }`}
                                >
                                    Transformar la industria funeraria de mascotas mediante tecnología que conecte, acompañe y preserve cada recuerdo.
                                </p>
                            </div>
                        </div>

                        {/* Bloque de aspiración */}
                        <div
                            className={`mt-8 pt-6 border-t rounded-2xl p-4 flex items-start gap-3 ${
                                isLight
                                    ? 'bg-amber-50/60 border-amber-100 text-slate-800'
                                    : 'bg-[#E7C15A]/[0.06] border-[#E7C15A]/15 text-slate-200'
                            }`}
                        >
                            <ShieldCheck size={20} className="text-[#E7C15A] shrink-0 mt-0.5" />
                            <p className="text-xs sm:text-sm font-medium leading-relaxed">
                                Aspiramos a convertirnos en una plataforma de referencia para crematorios y servicios funerarios de mascotas, impulsando una gestión más eficiente, transparente, profesional y humana.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

