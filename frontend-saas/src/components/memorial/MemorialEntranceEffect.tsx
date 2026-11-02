"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Sparkles, Heart } from "lucide-react";

interface MemorialEntranceEffectProps {
    scenario: "normal" | "altar" | "cielo" | "constelacion" | string;
    petName?: string;
    children: React.ReactNode;
}

export default function MemorialEntranceEffect({
    scenario,
    petName = "tu angelito",
    children,
}: MemorialEntranceEffectProps) {
    const [entered, setEntered] = useState(false);

    useEffect(() => {
        // Trigger entrance immediately on mount
        const timer = setTimeout(() => {
            setEntered(true);
        }, 80);
        return () => clearTimeout(timer);
    }, []);

    const isAltar = scenario === "altar" || scenario === "minimalista";
    const isCielo = scenario === "cielo" || scenario === "arcoiris" || scenario === "jardin";
    const isConstelacion = scenario === "constelacion";
    const isNormal = !isAltar && !isCielo && !isConstelacion;

    return (
        <div className="relative w-full overflow-hidden">
            {/* ══════════════════════════════════════════════════════════════
                1. VELO DE LUZ INICIAL (Disuelve cualquier salto de carga)
            ══════════════════════════════════════════════════════════════ */}
            <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/90 backdrop-blur-md"
            >
                <motion.div
                    initial={{ scale: 0.85, opacity: 1 }}
                    animate={{ scale: 1.3, opacity: 0 }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    className="flex flex-col items-center justify-center gap-3 text-center"
                >
                    <div className="relative w-16 h-16 rounded-full flex items-center justify-center bg-amber-400/10 border border-amber-400/30 shadow-[0_0_40px_rgba(245,158,11,0.4)]">
                        {isAltar && <Flame size={28} className="text-amber-300 animate-pulse" />}
                        {isCielo && <Sparkles size={28} className="text-sky-300 animate-pulse" />}
                        {isConstelacion && <Sparkles size={28} className="text-indigo-300 animate-pulse" />}
                        {isNormal && <Heart size={26} className="text-amber-200 animate-pulse" />}
                    </div>
                    <span className="text-xs uppercase tracking-[0.3em] font-serif text-amber-100/70">
                        {petName}
                    </span>
                </motion.div>
            </motion.div>

            {/* ══════════════════════════════════════════════════════════════
                2. AURA ATMOSFÉRICA SEGÚN EL ESCENARIO (Bloom de apertura)
            ══════════════════════════════════════════════════════════════ */}
            {/* A) ALTAR DE LUZ: Aurora dorada que nace desde el centro hacia afuera */}
            {isAltar && (
                <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: [0.7, 1.25, 1], opacity: [0, 0.85, 0.4] }}
                    transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
                    className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center"
                >
                    <div
                        className="w-[850px] h-[850px] rounded-full blur-[140px]"
                        style={{
                            background:
                                "radial-gradient(circle, rgba(251,191,36,0.45) 0%, rgba(217,119,6,0.25) 45%, rgba(180,83,9,0.08) 70%, transparent 85%)",
                        }}
                    />
                </motion.div>
            )}

            {/* B) CIELO INFINITO: Apertura de velo celestial etéreo */}
            {isCielo && (
                <>
                    <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: [0.6, 1.3, 1], opacity: [0, 0.9, 0.35] }}
                        transition={{ duration: 2.0, ease: [0.16, 1, 0.3, 1] }}
                        className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center"
                    >
                        <div
                            className="w-[900px] h-[900px] rounded-full blur-[150px]"
                            style={{
                                background:
                                    "radial-gradient(circle, rgba(56,189,248,0.5) 0%, rgba(224,242,254,0.3) 40%, rgba(14,165,233,0.1) 70%, transparent 85%)",
                            }}
                        />
                    </motion.div>

                    {/* Velo de nubes que se abre a los costados al iniciar */}
                    <motion.div
                        initial={{ opacity: 0.6, x: 0 }}
                        animate={{ opacity: 0, x: -160 }}
                        transition={{ duration: 1.6, ease: "easeOut" }}
                        className="pointer-events-none fixed top-0 left-0 w-1/2 h-full bg-gradient-to-r from-sky-100/30 to-transparent blur-3xl z-10"
                    />
                    <motion.div
                        initial={{ opacity: 0.6, x: 0 }}
                        animate={{ opacity: 0, x: 160 }}
                        transition={{ duration: 1.6, ease: "easeOut" }}
                        className="pointer-events-none fixed top-0 right-0 w-1/2 h-full bg-gradient-to-l from-sky-100/30 to-transparent blur-3xl z-10"
                    />
                </>
            )}

            {/* C) CONSTELACIÓN ETERNA: Resplandor de nebulosa cósmica y polvo estelar */}
            {isConstelacion && (
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: [0.5, 1.35, 1], opacity: [0, 0.95, 0.35] }}
                    transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1] }}
                    className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center"
                >
                    <div
                        className="w-[950px] h-[950px] rounded-full blur-[160px]"
                        style={{
                            background:
                                "radial-gradient(circle, rgba(129,140,248,0.5) 0%, rgba(251,191,36,0.25) 35%, rgba(67,56,202,0.15) 65%, transparent 85%)",
                        }}
                    />
                </motion.div>
            )}

            {/* D) JARDÍN CELESTIAL / BÁSICO: Amanecer cálido suave */}
            {isNormal && (
                <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: [0.7, 1.2, 1], opacity: [0, 0.75, 0.25] }}
                    transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
                    className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center"
                >
                    <div
                        className="w-[800px] h-[800px] rounded-full blur-[130px]"
                        style={{
                            background:
                                "radial-gradient(circle, rgba(253,230,138,0.4) 0%, rgba(254,243,199,0.25) 45%, rgba(245,158,11,0.08) 70%, transparent 85%)",
                        }}
                    />
                </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                3. CONTENIDO PRINCIPAL: TRANSICIÓN SUAVE ORQUESTADA
            ══════════════════════════════════════════════════════════════ */}
            <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 14, filter: "blur(8px)" }}
                animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    filter: "blur(0px)",
                }}
                transition={{
                    duration: 1.25,
                    ease: [0.16, 1, 0.3, 1],
                    delay: 0.05,
                }}
                className="relative z-10 w-full"
            >
                {children}
            </motion.div>
        </div>
    );
}

