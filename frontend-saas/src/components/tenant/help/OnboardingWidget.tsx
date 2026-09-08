"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
    GraduationCap,
    Users,
    Dog,
    Flame,
    Compass,
    FileText,
    CheckCircle2,
    ArrowRight,
    ChevronRight,
    Sparkles,
    HelpCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

const STEPS = [
    {
        id: 1,
        title: 'Registrar Tutor / Cliente',
        description: 'Ingresa los datos de contacto y ubicación del propietario.',
        icon: Users,
        href: '/dashboard/clientes',
        actionLabel: 'Ir a Clientes',
        color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400',
    },
    {
        id: 2,
        title: 'Inscribir Mascota',
        description: 'Asigna la mascota al cliente indicando especie, raza y peso.',
        icon: Dog,
        href: '/dashboard/mascotas',
        actionLabel: 'Ir a Mascotas',
        color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400',
    },
    {
        id: 3,
        title: 'Seleccionar Plan & Servicios',
        description: 'Elige entre Cremación Individual o Comunitaria y opcionales.',
        icon: Flame,
        href: '/dashboard/recepcion-pedidos',
        actionLabel: 'Recepción y Pedidos',
        color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400',
    },
    {
        id: 4,
        title: 'Crear Seguimiento (Tracking)',
        description: 'Genera el código único para que el tutor siga el proceso.',
        icon: Compass,
        href: '/dashboard/operaciones/crear-seguimiento',
        actionLabel: 'Crear Tracking',
        color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
    },
    {
        id: 5,
        title: 'Emitir Certificado',
        description: 'Descarga el certificado oficial de cremación tras finalizar.',
        icon: FileText,
        href: '/dashboard/documentos',
        actionLabel: 'Emitir Documento',
        color: 'from-rose-500/20 to-red-500/20 border-rose-500/30 text-rose-400',
    },
];

export default function OnboardingWidget() {
    const [activeTab, setActiveTab] = useState(1);

    const currentStep = STEPS.find(s => s.id === activeTab) || STEPS[0];

    return (
        <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 text-primary">
                        <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg sm:text-xl font-bold tracking-tight">Guía de Inicio Rápido</h2>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-primary/10 text-primary border border-primary/20">
                                Tutorial
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            Aprende a realizar un registro completo paso a paso en 5 sencillas etapas.
                        </p>
                    </div>
                </div>

                <Link
                    href="/dashboard/ayuda"
                    className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline self-start sm:self-auto bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-xl transition border border-primary/20"
                >
                    <HelpCircle size={14} />
                    Ver Centro de Ayuda Completo
                </Link>
            </div>

            {/* Stepper Tabs Header */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {STEPS.map(step => {
                    const isActive = step.id === activeTab;
                    const Icon = step.icon;
                    return (
                        <button
                            key={step.id}
                            type="button"
                            onClick={() => setActiveTab(step.id)}
                            className={`
                                flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all text-xs font-semibold
                                ${isActive
                                    ? 'bg-white/10 border-primary/50 text-foreground shadow-lg shadow-primary/5'
                                    : 'bg-white/[0.02] border-white/5 text-muted-foreground hover:bg-white/5 hover:text-foreground'
                                }
                            `}
                        >
                            <div className={`p-1.5 rounded-xl border ${step.color} shrink-0`}>
                                <Icon size={14} />
                            </div>
                            <span className="truncate">{step.id}. {step.title.split(' ')[0]}</span>
                        </button>
                    );
                })}
            </div>

            {/* Step Body Card */}
            <motion.div
                key={currentStep.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`p-6 rounded-2xl bg-gradient-to-r ${currentStep.color} border flex flex-col md:flex-row items-start md:items-center justify-between gap-6`}
            >
                <div className="space-y-2 max-w-xl">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Paso {currentStep.id} de 5
                        </span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        {currentStep.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {currentStep.description}
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
                    <Link
                        href={currentStep.href}
                        className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition active:scale-95"
                    >
                        {currentStep.actionLabel}
                        <ArrowRight size={14} />
                    </Link>

                    {currentStep.id < 5 && (
                        <button
                            type="button"
                            onClick={() => setActiveTab(currentStep.id + 1)}
                            className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground text-xs font-semibold rounded-xl border border-white/5 transition flex items-center gap-1"
                        >
                            Siguiente
                            <ChevronRight size={14} />
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
