'use client';

import React, { useState } from 'react';
import {
    PawPrint,
    ShieldCheck,
    Check,
    Flame,
    Clock,
    FileBadge,
    Info,
    Sparkles,
    ChevronRight,
} from 'lucide-react';

interface VinzerTrackingDemoProps {
    theme?: 'dark' | 'light';
}

interface StepItem {
    id: number;
    title: string;
    shortName: string;
    status: 'completed' | 'active' | 'pending';
    time: string;
    subtitle: string;
    desc: string;
    details: string;
    operator: string;
}

const STEPS: StepItem[] = [
    {
        id: 0,
        title: '1. Coordinación y Registro',
        shortName: 'Coordinación',
        status: 'completed',
        time: '09:30 hrs',
        subtitle: 'Solicitud confirmada',
        desc: 'Servicio confirmado directamente con la familia. Generación inmediata de la ficha técnica y código único de trazabilidad.',
        details: 'Orden de servicio #OS-2026-981 generada digitalmente. Notificación y enlace de seguimiento enviados a la familia.',
        operator: 'Atención al Cliente • Base Central',
    },
    {
        id: 1,
        title: '2. Retiro en Domicilio',
        shortName: 'Retiro',
        status: 'completed',
        time: '10:15 hrs',
        subtitle: 'Domicilio Familiar',
        desc: 'Retiro respetuoso en el hogar de la familia Muñoz. Colocación de precinto de seguridad numerado en presencia del tutor.',
        details: 'Precinto inviolable #VP-892 instalado y fotografiado en domicilio antes del traslado.',
        operator: 'Conductor / Operador: M. Castro',
    },
    {
        id: 2,
        title: '3. Ingreso a Planta y Custodia',
        shortName: 'Ingreso Planta',
        status: 'completed',
        time: '11:00 hrs',
        subtitle: 'Instalaciones Centrales',
        desc: 'Llegada a planta del crematorio. Validación de precinto, pesaje digital certificado (4.2 kg) y asignación de cámara fría.',
        details: 'Pesaje verificado con báscula calibrada: 4.20 kg. Custodia en cámara de preservación individual.',
        operator: 'Operador de Planta: R. Lagos',
    },
    {
        id: 3,
        title: '4. Cremación Individual en Curso',
        shortName: 'Cremación',
        status: 'active',
        time: 'Iniciado 12:40 hrs',
        subtitle: 'Cámara Individual 02',
        desc: 'Supervisada por Operador Técnico: R. Valenzuela. Sensor térmico activo a 850°C y registro continuo.',
        details: 'Cámara individual refractaria 02. Inicio certificado a las 12:40 hrs. Monitoreo constante de ciclo.',
        operator: 'Operador Técnico: R. Valenzuela',
    },
    {
        id: 4,
        title: '5. Preparación de Cenizas',
        shortName: 'Preparación',
        status: 'pending',
        time: 'Pendiente',
        subtitle: 'Enfriamiento y Urna',
        desc: 'Proceso de enfriamiento gradual, tratamiento fino y depósito en la urna seleccionada por la familia.',
        details: 'Control de calidad final, sellado de urna y preparación de reliquias conmemorativas.',
        operator: 'Área de Acabados y Custodia',
    },
    {
        id: 5,
        title: '6. Entrega a la Familia',
        shortName: 'Entrega',
        status: 'pending',
        time: 'Pendiente',
        subtitle: 'Urna y Certificado',
        desc: 'Entrega solemne en el domicilio de la familia junto al certificado de defunción y trazabilidad digital inviolable.',
        details: 'Emisión de Certificado Notarial Digital con numeración correlativa y código QR verificable.',
        operator: 'Coordinación con Familia Muñoz',
    },
];

export function VinzerTrackingDemo({ theme = 'dark' }: VinzerTrackingDemoProps) {
    const isLight = theme === 'light';
    const [selectedStep, setSelectedStep] = useState<number>(3); // 0-indexed, default: Cremación activa

    const activeStepData = STEPS[selectedStep] || STEPS[3];

    return (
        <div className="w-full">
            {/* Header de la sección explicativa */}
            <div className="text-center max-w-3xl mx-auto mb-8 space-y-3">
                <div
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-xs ${
                        isLight
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    }`}
                >
                    <ShieldCheck size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                        Demostración en vivo • Cómo funciona
                    </span>
                </div>
                <h2
                    className={`text-2xl sm:text-3xl font-black tracking-tight ${
                        isLight ? 'text-slate-900' : 'text-white'
                    }`}
                >
                    Evidencia digital
                </h2>
                <p
                    className={`text-sm sm:text-base font-medium max-w-2xl mx-auto ${
                        isLight ? 'text-slate-600' : 'text-slate-300'
                    }`}
                >
                    Línea de custodia y seguimiento paso a paso: haz clic en cada etapa para ver cómo se registra la información, los operadores responsables y la evidencia digital que recibe la familia.
                </p>
            </div>

            {/* Contenedor Principal (Tarjeta Glassmorphism) */}
            <div
                className={`w-full rounded-3xl border p-5 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden transition-all duration-500 ${
                    isLight
                        ? 'bg-white border-slate-200/90 shadow-slate-200/60'
                        : 'bg-[#071022]/80 backdrop-blur-2xl border-white/10 shadow-black/60'
                }`}
            >
                {/* Luces decorativas sutiles */}
                <div
                    className={`absolute -top-24 -left-24 w-80 h-80 rounded-full blur-[110px] pointer-events-none -z-10 ${
                        isLight ? 'bg-cyan-500/10' : 'bg-cyan-500/10'
                    }`}
                />
                <div
                    className={`absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-[120px] pointer-events-none -z-10 ${
                        isLight ? 'bg-sky-500/10' : 'bg-sky-600/10'
                    }`}
                />

                {/* Encabezado del Servicio y Mascota Simulada */}
                <div
                    className={`flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b ${
                        isLight ? 'border-slate-200' : 'border-white/[0.08]'
                    }`}
                >
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-sky-400 p-[2px] shadow-lg shadow-cyan-500/20">
                                <div
                                    className={`w-full h-full rounded-[14px] flex items-center justify-center overflow-hidden ${
                                        isLight ? 'bg-slate-50' : 'bg-[#071022]'
                                    }`}
                                >
                                    <PawPrint className="w-7 h-7 text-cyan-500" />
                                </div>
                            </div>
                            <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                                <span
                                    className={`relative inline-flex rounded-full h-4 w-4 bg-cyan-500 border-2 ${
                                        isLight ? 'border-white' : 'border-[#071022]'
                                    }`}
                                />
                            </span>
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h4
                                    className={`text-2xl font-bold tracking-tight ${
                                        isLight ? 'text-slate-900' : 'text-white'
                                    }`}
                                >
                                    Pelusa
                                </h4>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                                    En Planta
                                </span>
                            </div>
                            <p
                                className={`text-xs sm:text-sm mt-0.5 ${
                                    isLight ? 'text-slate-500' : 'text-slate-400'
                                }`}
                            >
                                Gato Persa{' '}
                                <span className={isLight ? 'text-slate-300' : 'text-slate-600'}>•</span> Familia Muñoz{' '}
                                <span className={isLight ? 'text-slate-300' : 'text-slate-600'}>•</span>{' '}
                                <span
                                    className={`font-mono font-bold ${
                                        isLight ? 'text-slate-700' : 'text-slate-200'
                                    }`}
                                >
                                    ID: #VP-2026-981
                                </span>
                            </p>
                        </div>
                    </div>

                    <div
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border self-start md:self-auto ${
                            isLight
                                ? 'bg-slate-50 border-slate-200'
                                : 'bg-[#0B172E]/80 border-white/5'
                        }`}
                    >
                        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                        <div className="text-xs">
                            <p
                                className={`font-semibold ${
                                    isLight ? 'text-slate-800' : 'text-slate-200'
                                }`}
                            >
                                Certificación Digital Inalterable
                            </p>
                            <p className={isLight ? 'text-slate-500' : 'text-slate-400'}>
                                Custodia 100% verificada con QR
                            </p>
                        </div>
                    </div>
                </div>

                {/* Subtítulo y estado de progreso */}
                <div className="mt-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                            Trazabilidad en tiempo real
                        </h4>
                        <p
                            className={`text-xs mt-0.5 ${
                                isLight ? 'text-slate-500' : 'text-slate-400'
                            }`}
                        >
                            Línea de custodia individual garantizada
                        </p>
                    </div>
                    <div
                        className={`text-xs font-medium ${
                            isLight ? 'text-slate-600' : 'text-slate-300'
                        }`}
                    >
                        Etapa actual:{' '}
                        <span className="text-cyan-600 dark:text-cyan-300 font-extrabold">
                            4 de 6 (Cremación en curso)
                        </span>
                    </div>
                </div>

                {/* Stepper Horizontal (Desplazable con scroll suave en pantallas estrechas) */}
                <div className="overflow-x-auto no-scrollbar pb-4 pt-2">
                    <div className="min-w-[920px] relative px-2">
                        {/* LÍNEA CONECTORA HORIZONTAL */}
                        {/* Fondo gris de la línea inactiva */}
                        <div
                            className={`absolute top-[42px] left-[6%] right-[6%] h-[3px] -z-0 ${
                                isLight ? 'bg-slate-200' : 'bg-slate-800'
                            }`}
                        />
                        {/* Línea completada con gradiente hasta el paso 4 (Cremación) */}
                        <div className="absolute top-[42px] left-[6%] w-[58%] h-[3px] bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 -z-0 shadow-[0_0_12px_rgba(34,211,238,0.6)]" />

                        {/* GRID DE LOS 6 PASOS */}
                        <div className="grid grid-cols-6 gap-4 relative z-10">
                            {STEPS.map((step) => {
                                const isSelected = selectedStep === step.id;
                                const isCompleted = step.status === 'completed';
                                const isActive = step.status === 'active';
                                const isPending = step.status === 'pending';

                                return (
                                    <div
                                        key={step.id}
                                        onClick={() => setSelectedStep(step.id)}
                                        className={`group flex flex-col items-center cursor-pointer select-none transition-all duration-300 ${
                                            isActive ? 'scale-105' : 'hover:scale-[1.02]'
                                        } ${isPending && !isSelected ? 'opacity-70 hover:opacity-100' : ''}`}
                                    >
                                        {/* Icono circular de la etapa */}
                                        {isCompleted && (
                                            <div
                                                className={`w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-md transition-all duration-300 ${
                                                    isLight
                                                        ? 'bg-emerald-50 border-2 border-emerald-400 text-emerald-600 shadow-sm'
                                                        : 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                                } ${isSelected ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900' : ''}`}
                                            >
                                                <Check className="w-7 h-7 stroke-[2.5]" />
                                            </div>
                                        )}

                                        {isActive && (
                                            <div className="relative w-16 h-16 rounded-2xl bg-cyan-500/20 border-2 border-cyan-400 text-cyan-500 dark:text-cyan-300 flex items-center justify-center backdrop-blur-xl shadow-[0_0_30px_rgba(34,211,238,0.35)]">
                                                <span className="animate-ping absolute inset-0 rounded-2xl bg-cyan-400/30" />
                                                <Flame className="w-8 h-8 relative z-10 text-cyan-500 dark:text-cyan-300 animate-pulse" />
                                            </div>
                                        )}

                                        {isPending && (
                                            <div
                                                className={`w-14 h-14 rounded-2xl border flex items-center justify-center backdrop-blur-sm transition-colors ${
                                                    isLight
                                                        ? 'bg-slate-100 border-slate-300 text-slate-400'
                                                        : 'bg-[#0B172E] border-slate-700 text-slate-500'
                                                } ${isSelected ? 'ring-2 ring-cyan-400 ring-offset-2' : ''}`}
                                            >
                                                <div
                                                    className={`w-3.5 h-3.5 rounded-full border-2 ${
                                                        isLight ? 'border-slate-400' : 'border-slate-600'
                                                    }`}
                                                />
                                            </div>
                                        )}

                                        {/* Tarjeta inferior con información de la etapa */}
                                        <div
                                            className={`mt-3.5 w-full rounded-2xl p-3 text-center transition-all ${
                                                isActive
                                                    ? isLight
                                                        ? 'bg-sky-50 border-2 border-sky-400 shadow-md shadow-sky-500/10'
                                                        : 'bg-[#0B172E]/95 border-2 border-cyan-400/60 shadow-lg shadow-cyan-500/15'
                                                    : isSelected
                                                    ? isLight
                                                        ? 'bg-slate-100 border border-sky-300 shadow-xs'
                                                        : 'bg-[#0B172E] border border-cyan-400/40 shadow-md'
                                                    : isLight
                                                    ? 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
                                                    : 'bg-[#0B172E]/50 hover:bg-[#0B172E] border border-white/5'
                                            }`}
                                        >
                                            {/* Badge de estado */}
                                            {isCompleted && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 mb-1">
                                                    ✓ Completado
                                                </span>
                                            )}
                                            {isActive && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-black bg-cyan-400/20 text-cyan-600 dark:text-cyan-300 mb-1 border border-cyan-400/40">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
                                                    EN PROCESO
                                                </span>
                                            )}
                                            {isPending && (
                                                <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium mb-1 ${
                                                        isLight
                                                            ? 'bg-slate-200 text-slate-600'
                                                            : 'bg-slate-800 text-slate-400'
                                                    }`}
                                                >
                                                    ○ En espera
                                                </span>
                                            )}

                                            <h5
                                                className={`font-bold text-xs sm:text-sm truncate ${
                                                    isActive
                                                        ? isLight
                                                            ? 'text-sky-900 font-extrabold'
                                                            : 'text-white font-extrabold'
                                                        : isLight
                                                        ? 'text-slate-800'
                                                        : 'text-slate-200'
                                                }`}
                                            >
                                                {step.shortName}
                                            </h5>

                                            <p
                                                className={`text-[11px] font-mono mt-0.5 ${
                                                    isActive
                                                        ? isLight
                                                            ? 'text-sky-700 font-bold'
                                                            : 'text-cyan-300 font-semibold'
                                                        : isLight
                                                        ? 'text-slate-500'
                                                        : 'text-slate-400'
                                                }`}
                                            >
                                                {step.time}
                                            </p>

                                            <p
                                                className={`text-[10px] truncate mt-0.5 ${
                                                    isLight ? 'text-slate-400' : 'text-slate-500'
                                                }`}
                                            >
                                                {step.subtitle}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Panel de Detalles de la Etapa Seleccionada */}
                <div
                    className={`mt-6 p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300 ${
                        isLight
                            ? 'bg-slate-50 border-sky-200 shadow-xs'
                            : 'bg-[#050B14]/90 border-cyan-500/25 shadow-lg'
                    }`}
                >
                    <div className="flex items-start sm:items-center gap-3.5">
                        <div
                            className={`p-2.5 rounded-xl shrink-0 ${
                                isLight
                                    ? 'bg-sky-100 text-sky-700'
                                    : 'bg-cyan-500/10 text-cyan-400'
                            }`}
                        >
                            <Info className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h5
                                    className={`text-sm font-bold ${
                                        isLight ? 'text-slate-900' : 'text-white'
                                    }`}
                                >
                                    {activeStepData.title}
                                </h5>
                                <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                        activeStepData.status === 'completed'
                                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                            : activeStepData.status === 'active'
                                            ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300'
                                            : isLight
                                            ? 'bg-slate-200 text-slate-600'
                                            : 'bg-slate-800 text-slate-400'
                                    }`}
                                >
                                    {activeStepData.status === 'completed'
                                        ? 'Verificado'
                                        : activeStepData.status === 'active'
                                        ? 'Monitoreo activo'
                                        : 'Pendiente de ejecución'}
                                </span>
                            </div>
                            <p
                                className={`text-xs mt-1 leading-relaxed ${
                                    isLight ? 'text-slate-600' : 'text-slate-400'
                                }`}
                            >
                                {activeStepData.desc}
                            </p>
                            <p
                                className={`text-[11px] font-mono mt-1 ${
                                    isLight ? 'text-slate-500' : 'text-slate-400'
                                }`}
                            >
                                <span className="font-sans font-semibold text-cyan-600 dark:text-cyan-400">
                                    Responsable:
                                </span>{' '}
                                {activeStepData.operator}
                            </p>
                        </div>
                    </div>

                    <div
                        className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 self-end sm:self-auto ${
                            isLight
                                ? 'bg-white border-slate-200 text-slate-700 shadow-2xs'
                                : 'bg-white/5 border-white/10 text-slate-200'
                        }`}
                    >
                        <FileBadge className="w-4 h-4 text-cyan-500 shrink-0" />
                        <span>Bitácora Digital</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
