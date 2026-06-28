import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Check, Minus, Star, Heart, Flame, Shield, HelpCircle } from 'lucide-react';
import { VincerLogo } from '@/components/vincer/VincerLogo';

export const metadata: Metadata = {
    title: 'Comparar Planes | Vincer',
    description: 'Compara detalladamente las características de los planes Free, Track, Normal, Pro y Ultra de Vincer. Elige la mejor opción para modernizar tu crematorio.',
    robots: {
        index: true,
        follow: true,
    }
};

interface FeatureRow {
    name: string;
    description: string;
    free: string | boolean;
    track: string | boolean;
    normal: string | boolean;
    pro: string | boolean;
    ultra: string | boolean;
}

interface FeatureCategory {
    category: string;
    features: FeatureRow[];
}

const comparisonData: FeatureCategory[] = [
    {
        category: "Precios y Facturación",
        features: [
            { name: "Precio Mensual", description: "Valor cobrado de forma mensual en pesos chilenos (CLP)", free: "$0 / mes", track: "$29.900 / mes", normal: "$39.900 / mes", pro: "$59.990 / mes", ultra: "$119.000 / mes" },
            { name: "Pago Anual", description: "Valor anual equivalente (ahorro de hasta 2 meses)", free: "No disponible", track: "No disponible", normal: "$299.900 / año", pro: "$599.900 / año", ultra: "$999.900 / año" },
            { name: "Periodo mínimo", description: "Compromiso mínimo de permanencia", free: "Sin contrato", track: "Sin contrato", normal: "Sin contrato", pro: "Sin contrato", ultra: "Sin contrato" },
        ]
    },
    {
        category: "Volumen y Capacidad",
        features: [
            { name: "Mascotas / Órdenes al mes", description: "Cantidad máxima de servicios u órdenes que puedes ingresar mensualmente", free: "10 / mes", track: "35 / mes", normal: "40 / mes", pro: "60 / mes", ultra: "200 / mes (ampliable)" },
            { name: "Usuarios incluidos", description: "Cuentas de usuario para tu personal con roles asignables", free: "2 usuarios", track: "2 usuarios", normal: "3 usuarios", pro: "4 usuarios", ultra: "5 usuarios (ampliable)" },
            { name: "Clientes activos", description: "Límite de clientes en tu base de datos", free: "10 clientes", track: "50 clientes", normal: "50 clientes", pro: "50 clientes", ultra: "100 clientes (ampliable)" },
        ]
    },
    {
        category: "Módulos y Funciones Operativas",
        features: [
            { name: "CRM de Clientes y Mascotas", description: "Base de datos con datos de contacto, RUT, especie, raza y peso", free: true, track: false, normal: true, pro: true, ultra: true },
            { name: "Catálogo y Servicios", description: "Configuración de productos, urnas, servicios adicionales y precios", free: true, track: true, normal: true, pro: true, ultra: true },
            { name: "Control de Inventario", description: "Gestión de existencias de productos físicos y urnas", free: true, track: true, normal: true, pro: true, ultra: true },
            { name: "Flujo Operativo (Workflow)", description: "Registro del paso a paso de cada servicio con firmas del operador", free: false, track: true, normal: true, pro: true, ultra: true },
            { name: "Evidencia Fotográfica", description: "Subir fotografías de respaldo por cada fase completada", free: false, track: true, normal: true, pro: true, ultra: true },
            { name: "Plan de Tracking Público", description: "Línea de tiempo pública con token único para que la familia vea el estado actual sin login", free: "Básico (sin fotos)", track: true, normal: true, pro: true, ultra: true },
            { name: "Certificados de Cremación PDF", description: "Generación automatizada de certificado en formato PDF con firma digital y marca de agua", free: false, track: false, normal: true, pro: true, ultra: true },
            { name: "Memoriales Digitales Personalizados", description: "Homenaje digital para las familias con dedicatorias, fotos, encendido de velas y personalización", free: false, track: false, normal: true, pro: true, ultra: true },
            { name: "Buzón de Dedicatorias Moderado", description: "Filtro de aprobación por el crematorio de los mensajes familiares antes de publicarse", free: false, track: false, normal: true, pro: true, ultra: true },
        ]
    },
    {
        category: "Administración y Seguridad",
        features: [
            { name: "Aislamiento de Datos Multi-Tenant", description: "Garantía de privacidad: tus datos están aislados lógicamente de otros crematorios", free: true, track: true, normal: true, pro: true, ultra: true },
            { name: "Roles de Usuario Granulares (RBAC)", description: "Roles para administración, conductores, recepción, operadores, auditor, etc.", free: true, track: true, normal: true, pro: true, ultra: true },
            { name: "Registro de Auditoría (Audit-Log)", description: "Historial inviolable de quién modificó qué, cuándo y desde dónde", free: true, track: true, normal: true, pro: true, ultra: true },
            { name: "Exportación de Datos Excel/CSV", description: "Descarga de reportes operativos, financieros e información de clientes", free: false, track: false, normal: false, pro: true, ultra: true },
            { name: "Analítica y Reportes Avanzados", description: "Gráficos de volumen de servicios, productos más vendidos y rendimientos de operarios", free: false, track: false, normal: false, pro: false, ultra: true },
        ]
    },
    {
        category: "Soporte y Garantías",
        features: [
            { name: "Soporte Técnico por Email", description: "Canal de soporte estándar", free: "Soporte Comunitario", track: "Soporte Regular", normal: "Soporte Regular", pro: "Soporte Prioritario", ultra: "Soporte Dedicado" },
            { name: "Soporte por WhatsApp", description: "Comunicación directa por chat en tiempo real", free: false, track: false, normal: false, pro: true, ultra: true },
            { name: "Capacitación de Personal", description: "Sesiones de onboarding para el uso de la plataforma por tu equipo", free: false, track: false, normal: "Videotutoriales", pro: "1 Sesión en Vivo", ultra: "Acompañamiento Completo" },
        ]
    }
];

export default function CompararPlanesPage() {
    return (
        <div className="min-h-screen bg-[#020210] text-[#FFFFFF] font-sans antialiased overflow-x-hidden relative selection:bg-[#19B5FE]/30 selection:text-[#FFFFFF] pb-20">
            {/* Luces de Fondo (Glows) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-screen pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#19B5FE]/10 blur-[150px] rounded-full" />
                <div className="absolute top-[30%] right-[-10%] w-[600px] h-[600px] bg-[#E0B84D]/5 blur-[170px] rounded-full" />
            </div>

            {/* Header */}
            <header className="relative z-10 max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-white/5">
                <Link href="/">
                    <VincerLogo size="md" />
                </Link>
                <Link 
                    href="/"
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-[#FFFFFF] transition-colors"
                >
                    <ArrowLeft size={14} /> Volver al inicio
                </Link>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-7xl mx-auto px-6 mt-12 md:mt-20">
                {/* Hero Section */}
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E0B84D]/10 border border-[#E0B84D]/20 rounded-full">
                        <Star size={12} className="text-[#E0B84D]" />
                        <span className="text-[10px] font-bold text-[#E0B84D] uppercase tracking-widest">Comparativa Completa</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-heading font-bold text-[#FFFFFF] leading-tight">
                        Encuentra el plan perfecto para tu crematorio.
                    </h1>
                    <p className="text-slate-400 font-medium">
                        Conoce las diferencias y límites detallados de cada una de nuestras versiones. Sin sorpresas, transparencia absoluta.
                    </p>
                </div>
 
                {/* Table wrapper for responsiveness */}
                <div className="w-full overflow-x-auto border border-white/10 rounded-3xl bg-[#0b0a24]/60 backdrop-blur-md shadow-2xl">
                    <table className="w-full min-w-[900px] border-collapse text-left">
                        {/* Table Header */}
                        <thead>
                            <tr className="border-b border-white/10 bg-[#020210]/80">
                                <th className="p-6 text-xs font-bold uppercase tracking-wider text-slate-400 w-1/4">Característica</th>
                                
                                {/* FREE Column */}
                                <th className="p-6 text-center w-[15%]">
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Básico</span>
                                        <h3 className="text-sm font-bold text-[#FFFFFF]">FREE</h3>
                                        <p className="text-[10px] font-bold text-[#19B5FE]">$0 CLP / mes</p>
                                        <a href="https://wa.me/56982395940?text=Hola,%20me%20gustaría%20solicitar%20el%20plan%20Free%20de%20Vincer." target="_blank" rel="noopener noreferrer" className="inline-block mt-3 px-4 py-1.5 bg-white/5 hover:bg-white/10 text-[#FFFFFF] rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all border border-white/10">
                                            Conversemos
                                        </a>
                                    </div>
                                </th>
 
                                {/* TRACK Column */}
                                <th className="p-6 text-center w-[15%] border-x border-white/5">
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-[#19B5FE] uppercase tracking-widest">Operaciones</span>
                                        <h3 className="text-sm font-bold text-[#FFFFFF]">TRACK</h3>
                                        <p className="text-[10px] font-bold text-[#19B5FE]">$29.900 CLP</p>
                                        <a href="https://wa.me/56982395940?text=Hola,%20me%20gustaría%20cotizar%20el%20plan%20Track%20de%20Vincer." target="_blank" rel="noopener noreferrer" className="inline-block mt-3 px-4 py-1.5 bg-white/5 hover:bg-white/10 text-[#FFFFFF] rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all border border-[#19B5FE]/20">
                                            Conversemos
                                        </a>
                                    </div>
                                </th>
 
                                {/* NORMAL Column */}
                                <th className="p-6 text-center w-[15%]">
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Profesional</span>
                                        <h3 className="text-sm font-bold text-[#FFFFFF]">NORMAL</h3>
                                        <p className="text-[10px] font-bold text-[#FFFFFF]">$39.900 CLP</p>
                                        <a href="https://wa.me/56982395940?text=Hola,%20me%20gustaría%20cotizar%20el%20plan%20Normal%20de%20Vincer." target="_blank" rel="noopener noreferrer" className="inline-block mt-3 px-4 py-1.5 bg-white/5 hover:bg-white/10 text-[#FFFFFF] rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all border border-white/10">
                                            Conversemos
                                        </a>
                                    </div>
                                </th>
 
                                {/* PRO Column (Highlighted) */}
                                <th className="p-6 text-center w-[15%] bg-[#19B5FE]/5 border-x border-white/10 relative">
                                    <div className="absolute top-0 inset-x-0 h-1 bg-[#19B5FE]" />
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-[#19B5FE] uppercase tracking-widest">Recomendado</span>
                                        <h3 className="text-sm font-bold text-[#FFFFFF]">PRO</h3>
                                        <p className="text-[10px] font-bold text-[#19B5FE]">$59.990 CLP</p>
                                        <a href="https://wa.me/56982395940?text=Hola,%20me%20gustaría%20cotizar%20el%20plan%20Pro%20de%20Vincer." target="_blank" rel="noopener noreferrer" className="inline-block mt-3 px-4 py-1.5 bg-[#19B5FE] hover:bg-[#19B5FE]/90 text-[#020210] rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all shadow-md shadow-[#19B5FE]/20">
                                            Conversemos
                                        </a>
                                    </div>
                                </th>
 
                                {/* ULTRA Column */}
                                <th className="p-6 text-center w-[15%]">
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-[#E0B84D] uppercase tracking-widest">Corporativo</span>
                                        <h3 className="text-sm font-bold text-[#FFFFFF]">ULTRA</h3>
                                        <p className="text-[10px] font-bold text-[#E0B84D]">$119.000 CLP</p>
                                        <a href="https://wa.me/56982395940?text=Hola,%20me%20gustaría%20cotizar%20el%20plan%20Ultra%20de%20Vincer." target="_blank" rel="noopener noreferrer" className="inline-block mt-3 px-4 py-1.5 bg-[#E0B84D]/10 border border-[#E0B84D]/20 hover:bg-[#E0B84D] hover:text-[#020210] text-[#E0B84D] rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all border border-[#E0B84D]/30">
                                            Conversemos
                                        </a>
                                    </div>
                                </th>
                            </tr>
                        </thead>

                        {/* Table Body */}
                        <tbody>
                            {comparisonData.map((section, sectionIdx) => (
                                <React.Fragment key={sectionIdx}>
                                    {/* Category Heading Row */}
                                    <tr className="bg-[#020210]/40 border-b border-white/5">
                                        <td colSpan={6} className="p-4 px-6 text-xs font-black uppercase tracking-widest text-[#E0B84D] bg-white/5">
                                            {section.category}
                                        </td>
                                    </tr>

                                    {/* Features Rows */}
                                    {section.features.map((feature, featureIdx) => (
                                        <tr 
                                            key={featureIdx} 
                                            className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                                        >
                                            {/* Feature Name & Description */}
                                            <td className="p-5 px-6 align-top">
                                                <div className="font-bold text-xs text-[#FFFFFF]">{feature.name}</div>
                                                <div className="text-[10px] text-slate-400 mt-1 leading-normal max-w-xs">{feature.description}</div>
                                            </td>

                                            {/* FREE Cell */}
                                            <td className="p-5 text-center text-xs align-middle">
                                                {renderCell(feature.free)}
                                            </td>

                                            {/* TRACK Cell */}
                                            <td className="p-5 text-center text-xs align-middle border-x border-white/5">
                                                {renderCell(feature.track)}
                                            </td>

                                            {/* NORMAL Cell */}
                                            <td className="p-5 text-center text-xs align-middle">
                                                {renderCell(feature.normal)}
                                            </td>

                                            {/* PRO Cell (Highlighted column) */}
                                            <td className="p-5 text-center text-xs align-middle bg-[#19B5FE]/[0.02] border-x border-white/5">
                                                {renderCell(feature.pro, true)}
                                            </td>

                                            {/* ULTRA Cell */}
                                            <td className="p-5 text-center text-xs align-middle">
                                                {renderCell(feature.ultra)}
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* FAQ Quick Link / CTA */}
                <div className="mt-16 bg-[#0b0a24] border border-white/10 rounded-[2rem] p-8 md:p-12 text-center max-w-4xl mx-auto space-y-6">
                    <h3 className="text-xl md:text-2xl font-black text-[#FFFFFF]">¿Tienes alguna duda sobre qué plan necesitas?</h3>
                    <p className="text-xs md:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        Si tu crematorio tiene necesidades especiales, requiere más usuarios o mayor cupo mensual de mascotas, podemos crear una cotización personalizada adaptada a tu escala.
                    </p>
                    <div className="flex justify-center gap-4 pt-2">
                        <a 
                            href="mailto:soporte@vincer.app"
                            className="bg-[#19B5FE] hover:bg-[#19B5FE]/90 text-[#020210] px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                            Hablar con un Asesor
                        </a>
                        <Link 
                            href="/#faqs"
                            className="border border-white/10 bg-white/5 hover:bg-white/10 text-[#FFFFFF] px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                            Ver Preguntas Frecuentes
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}

// Helper function to render table cells correctly
function renderCell(val: string | boolean, isHighlighted = false) {
    if (typeof val === 'boolean') {
        return val ? (
            <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#19B5FE]/10 text-[#19B5FE]">
                <Check size={12} strokeWidth={3} />
            </div>
        ) : (
            <div className="inline-flex items-center justify-center w-5 h-5 text-slate-600">
                <Minus size={12} />
            </div>
        );
    }
    return (
        <span className={`font-medium text-xs ${isHighlighted ? 'text-[#19B5FE] font-bold' : 'text-[#C0C0C0]'}`}>
            {val}
        </span>
    );
}
