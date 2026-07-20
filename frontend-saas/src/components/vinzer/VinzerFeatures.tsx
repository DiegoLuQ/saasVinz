'use client';

import React, { useState } from 'react';
import {
    LayoutDashboard,
    CheckCircle2,
    Star,
    QrCode,
    MapPin,
    Heart,
    Users,
    Package,
    ClipboardCheck,
    Camera,
    FileCheck,
    Lock,
    ShieldCheck,
    Bell,
    Layers,
    X,
    Eye
} from 'lucide-react';

const tabData = {
    crematorio: {
        title: "Panel Operativo del Crematorio",
        subtitle: "Todo el ciclo del servicio en una sola plataforma.",
        features: [
            "CRM completo de clientes y mascotas (Documento de identidad, contacto, historial, fotos).",
            "Catálogo gestionable: productos, servicios, planes y categorías.",
            "Cola de pedidos con vistas Kanban y Lista, filtros por fecha y estado.",
            "Flujo de trabajo personalizable por crematorio: pasos secuenciales con evidencia fotográfica y notas en cada fase.",
            "Código de verificación único de 10 caracteres por servicio (trazabilidad inviolable).",
            "Roles granulares: admin, recepción, operador, contabilidad, marketing y auditor.",
            "Auditoría completa: cada acción crítica queda registrada con usuario, fecha y cambios."
        ],
        metric: "Cada paso del proceso queda documentado con foto, hora y firma del operador."
    },
    familia: {
        title: "Plan de Tracking Público y Memoriales Digitales",
        subtitle: "La familia acompaña el proceso y honra a su mascota en un espacio digital propio.",
        features: [
            "Plan de Tracking público con token único: la familia ve cada fase del servicio sin necesidad de iniciar sesión.",
            "Línea de tiempo con foto y descripción de cada paso completado.",
            "Memorial digital con diseño personalizable (temas, partículas, fondos).",
            "Dedicatorias y velas virtuales con moderación previa por el crematorio.",
            "Galería de imágenes colaborativa y mensaje de despedida.",
            "Acceso opcional protegido con PIN de 6 dígitos para memoriales privados."
        ],
        metric: "Trazabilidad pública sin login + memorial perpetuo: confianza real para la familia."
    }
};

export function VinzerFeatures() {
    const [activeTab, setActiveTab] = useState<'crematorio' | 'familia'>('crematorio');

    return (
        <>
            {/* Módulos Destacados (Ecosistema Vinzer con Tabs) */}
            <section id="modulos" className="py-32 bg-[#0b0a24]/30 border-y border-white/5 relative z-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#19B5FE]/10 border border-[#19B5FE]/30 rounded-full">
                            <LayoutDashboard size={12} className="text-[#19B5FE]" />
                            <span className="text-[10px] font-black text-[#19B5FE] uppercase tracking-widest">Módulos del Sistema</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black text-[#FFFFFF]">
                            Un solo software para la gestión comercial, operativa y memorial de tu negocio
                        </h2>
                        <p className="text-[#C0C0C0] font-medium">
                            Olvídate de contratar múltiples herramientas inconexas. Vinzer unifica tus operaciones comerciales, B2B y familiares.
                        </p>
                    </div>

                    {/* Selector de Tabs */}
                    <div className="flex justify-center mb-12">
                        <div className="bg-[#020210] border border-white/10 p-1.5 rounded-2xl flex gap-1 sm:gap-2">
                            {(['crematorio', 'familia'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab
                                        ? 'bg-[#19B5FE] text-[#020210] shadow-md shadow-[#19B5FE]/10'
                                        : 'text-slate-400 hover:text-[#FFFFFF]'
                                        }`}
                                >
                                    {tab === 'crematorio' ? 'Operaciones' : 'Memoriales'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Contenido de la Tab */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-7 space-y-6">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#E0B84D]">
                                    {tabData[activeTab].subtitle}
                                </span>
                                <h3 className="text-2xl sm:text-3xl font-black text-[#FFFFFF] mt-1">
                                    {tabData[activeTab].title}
                                </h3>
                            </div>

                            <ul className="space-y-3.5">
                                {tabData[activeTab].features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className="w-5 h-5 rounded bg-[#19B5FE]/10 border border-[#19B5FE]/30 flex items-center justify-center text-[#19B5FE] shrink-0 mt-0.5">
                                            <CheckCircle2 size={12} strokeWidth={3} />
                                        </div>
                                        <span className="text-[#C0C0C0] text-sm">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="p-4 bg-[#19B5FE]/5 border border-[#19B5FE]/20 rounded-2xl text-xs font-semibold text-[#19B5FE] flex items-center gap-2">
                                <Star size={16} fill="#19B5FE" /> {tabData[activeTab].metric}
                            </div>
                        </div>

                        {/* Visual mockup adaptado al tipo de tab */}
                        <div className="lg:col-span-5 bg-[#020210] border border-white/5 rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#E0B84D]/5 to-[#19B5FE]/5" />

                            {activeTab === 'crematorio' && (
                                <div className="space-y-4 relative z-10">
                                    <div className="flex justify-between items-center text-xs font-bold border-b border-white/5 pb-3">
                                        <span>Cola de Pedidos del Día</span>
                                        <span className="text-[#19B5FE]">3 activos</span>
                                    </div>
                                    <div className="space-y-2.5">
                                        <div className="bg-white/5 border border-white/5 p-3.5 rounded-xl">
                                            <div className="flex justify-between text-xs font-bold mb-1.5">
                                                <span className="flex items-center gap-1.5">
                                                    <QrCode size={12} className="text-[#19B5FE]" />
                                                    SVC-8930 · Toby
                                                </span>
                                                <span className="text-[#19B5FE]">Recogida ✓</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] text-slate-500">
                                                <span>Checklist: manta, collar ✓</span>
                                                <span>Firma digital OK</span>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 border border-[#E0B84D]/30 p-3.5 rounded-xl">
                                            <div className="flex justify-between text-xs font-bold mb-1.5">
                                                <span className="flex items-center gap-1.5">
                                                    <QrCode size={12} className="text-[#E0B84D]" />
                                                    SVC-8931 · Luna
                                                </span>
                                                <span className="text-[#E0B84D]">En proceso</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] text-slate-500">
                                                <span>Tracking público activo</span>
                                                <span>Fase 3 de 5</span>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 border border-white/5 p-3.5 rounded-xl">
                                            <div className="flex justify-between text-xs font-bold mb-1.5">
                                                <span className="flex items-center gap-1.5">
                                                    <MapPin size={12} className="text-slate-400" />
                                                    Ruta R-12
                                                </span>
                                                <span className="text-[#C0C0C0]">2 recogidas</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] text-slate-500">
                                                <span>Chofer: J. Pérez</span>
                                                <span>ETA 11:40</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'familia' && (
                                <div className="space-y-4 relative z-10 text-center py-4">
                                    <div className="w-12 h-12 rounded-full bg-[#E0B84D]/10 border border-[#E0B84D]/20 flex items-center justify-center text-[#E0B84D] mx-auto">
                                        <Heart size={22} fill="#E0B84D" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-[#FFFFFF]">Memorial: Toby</h4>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Memorial público · Dedicatorias moderadas</p>
                                    </div>
                                    <div className="flex justify-center gap-1.5">
                                        <span className="px-2.5 py-1 bg-white/5 border border-white/10 text-[9px] font-bold rounded-full text-[#E0B84D]">🕯️ Encender Vela (42)</span>
                                        <span className="px-2.5 py-1 bg-white/5 border border-white/10 text-[9px] font-bold rounded-full text-[#19B5FE]">📸 Fotos (18)</span>
                                    </div>
                                    <div className="border border-white/10 p-3 rounded-xl bg-white/5 text-[11px] text-[#C0C0C0] max-w-[280px] mx-auto italic">
                                        {"\"Gracias Toby por alegrar nuestros días por 12 maravillosos años. Estarás siempre en nuestro corazón.\""}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Comparativa: Tradicional vs Vinzer */}
            <section id="comparativa" className="py-32 px-6 max-w-7xl mx-auto relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    <h2 className="text-3xl md:text-5xl font-black text-[#FFFFFF]">
                        ¿Por qué los crematorios y cementerios de mascotas eligen Vinzer?
                    </h2>
                    <p className="text-[#C0C0C0] font-medium">
                        Descubre la diferencia entre operar con métodos tradicionales y centralizar tu negocio con una plataforma moderna y automatizada.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Columna Tradicional */}
                    <div className="bg-[#0b0a24]/10 border border-white/5 p-8 rounded-3xl space-y-6">
                        <h4 className="text-lg font-bold text-slate-400 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500" /> Método Tradicional / Manual
                        </h4>
                        <ul className="space-y-4">
                            <li className="flex gap-3 text-xs text-slate-500">
                                <X size={16} className="text-red-500 shrink-0 mt-0.5" />
                                <span>Coordinación por WhatsApp, llamadas y correos sueltos, sin registro centralizado.</span>
                            </li>
                            <li className="flex gap-3 text-xs text-slate-500">
                                <X size={16} className="text-red-500 shrink-0 mt-0.5" />
                                <span>Etiquetas de papel escritas a mano que se pueden extraviar o dañar en el proceso.</span>
                            </li>
                            <li className="flex gap-3 text-xs text-slate-500">
                                <X size={16} className="text-red-500 shrink-0 mt-0.5" />
                                <span>Certificados de cremación impresos en Word con riesgo de alteración o desorganización.</span>
                            </li>
                            <li className="flex gap-3 text-xs text-slate-500">
                                <X size={16} className="text-red-500 shrink-0 mt-0.5" />
                                <span>Ausencia de un espacio virtual de recuerdo para que la familia canalice el duelo.</span>
                            </li>
                        </ul>
                    </div>

                    {/* Columna Vinzer */}
                    <div className="bg-[#0b0a24] border border-[#19B5FE]/30 p-8 rounded-3xl space-y-6 relative overflow-hidden shadow-lg shadow-[#19B5FE]/5">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#19B5FE]/5 blur-2xl rounded-full" />
                        <h4 className="text-lg font-bold text-[#FFFFFF] flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#19B5FE]" /> Gestión Moderna con Vinzer
                        </h4>
                        <ul className="space-y-4">
                            <li className="flex gap-3 text-xs text-[#C0C0C0]">
                                <CheckCircle2 size={16} className="text-[#19B5FE] shrink-0 mt-0.5" />
                                <span>Código de verificación único de 10 caracteres por cada servicio.</span>
                            </li>
                            <li className="flex gap-3 text-xs text-[#C0C0C0]">
                                <CheckCircle2 size={16} className="text-[#19B5FE] shrink-0 mt-0.5" />
                                <span>Flujo de trabajo configurable con evidencia fotográfica obligatoria por fase.</span>
                            </li>
                            <li className="flex gap-3 text-xs text-[#C0C0C0]">
                                <CheckCircle2 size={16} className="text-[#19B5FE] shrink-0 mt-0.5" />
                                <span>Certificados PDF automáticos con firma digital y marca de agua personalizable.</span>
                            </li>
                            <li className="flex gap-3 text-xs text-[#C0C0C0]">
                                <CheckCircle2 size={16} className="text-[#19B5FE] shrink-0 mt-0.5" />
                                <span>Plan de Tracking público para la familia + memorial digital interactivo.</span>
                            </li>
                            <li className="flex gap-3 text-xs text-[#C0C0C0]">
                                <CheckCircle2 size={16} className="text-[#19B5FE] shrink-0 mt-0.5" />
                                <span>Auditoría granular: cada acción crítica registrada con usuario, fecha y cambios.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Capacidades del Sistema (Módulos Reales) */}
            <section id="capacidades" className="py-32 bg-[#0b0a24]/30 border-y border-white/5 relative z-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#19B5FE]/10 border border-[#19B5FE]/30 rounded-full">
                            <Layers size={12} className="text-[#19B5FE]" />
                            <span className="text-[10px] font-black text-[#19B5FE] uppercase tracking-widest">Capacidades del Sistema</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black text-[#FFFFFF]">
                            Módulos y funcionalidades clave de nuestro software para crematorios
                        </h2>
                        <p className="text-[#C0C0C0] font-medium">
                            Módulos reales del sistema, mapeados al flujo de trabajo de un crematorio profesional.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {/* CRM */}
                        <div className="bg-[#020210] border border-white/5 p-6 rounded-2xl hover:border-[#19B5FE]/30 transition-all group">
                            <div className="w-11 h-11 rounded-xl bg-[#19B5FE]/10 border border-[#19B5FE]/30 text-[#19B5FE] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Users size={20} />
                            </div>
                            <h3 className="text-sm font-black text-[#FFFFFF] uppercase tracking-wider mb-2">CRM Clientes y Mascotas</h3>
                            <p className="text-xs text-[#C0C0C0] leading-relaxed">
                                Gestión completa de dueños y mascotas con fichas detalladas y galería de fotos.
                            </p>
                        </div>

                        {/* Catálogo */}
                        <div className="bg-[#020210] border border-white/5 p-6 rounded-2xl hover:border-[#19B5FE]/30 transition-all group">
                            <div className="w-11 h-11 rounded-xl bg-[#E0B84D]/10 border border-[#E0B84D]/30 text-[#E0B84D] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Package size={20} />
                            </div>
                            <h3 className="text-sm font-black text-[#FFFFFF] uppercase tracking-wider mb-2">Catálogo y Servicios</h3>
                            <p className="text-xs text-[#C0C0C0] leading-relaxed">
                                Productos, servicios y planes de cremación configurables con precios y disponibilidad.
                            </p>
                        </div>

                        {/* Operaciones / Workflow */}
                        <div className="bg-[#020210] border border-[#19B5FE]/30 p-6 rounded-2xl group shadow-lg shadow-[#19B5FE]/5">
                            <div className="w-11 h-11 rounded-xl bg-[#19B5FE]/10 border border-[#19B5FE]/30 text-[#19B5FE] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <ClipboardCheck size={20} />
                            </div>
                            <h3 className="text-sm font-black text-[#FFFFFF] uppercase tracking-wider mb-2">Flujo Operativo Configurable</h3>
                            <p className="text-xs text-[#C0C0C0] leading-relaxed">
                                Pasos secuenciales con evidencia fotográfica, notas y firma del operador por fase.
                            </p>
                        </div>

                        {/* Evidencia */}
                        <div className="bg-[#020210] border border-white/5 p-6 rounded-2xl hover:border-[#19B5FE]/30 transition-all group">
                            <div className="w-11 h-11 rounded-xl bg-[#19B5FE]/10 border border-[#19B5FE]/30 text-[#19B5FE] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Camera size={20} />
                            </div>
                            <h3 className="text-sm font-black text-[#FFFFFF] uppercase tracking-wider mb-2">Evidencia Fotográfica</h3>
                            <p className="text-xs text-[#C0C0C0] leading-relaxed">
                                Captura directa desde cámara o galería vinculada al paso, operador y timestamp.
                            </p>
                        </div>

                        {/* Certificados */}
                        <div className="bg-[#020210] border border-[#E0B84D]/30 p-6 rounded-2xl group">
                            <div className="w-11 h-11 rounded-xl bg-[#E0B84D]/10 border border-[#E0B84D]/30 text-[#E0B84D] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <FileCheck size={20} />
                            </div>
                            <h3 className="text-sm font-black text-[#FFFFFF] uppercase tracking-wider mb-2">Certificados PDF
                                <span className="ml-2 text-[8px] bg-[#E0B84D]/10 text-[#E0B84D] border border-[#E0B84D]/30 px-1.5 py-0.5 rounded-full">PRO+</span>
                            </h3>
                            <p className="text-xs text-[#C0C0C0] leading-relaxed">
                                Generación automática con firma digital, marca de agua y numeración secuencial.
                            </p>
                        </div>

                        {/* Memoriales */}
                        <div className="bg-[#020210] border border-white/5 p-6 rounded-2xl hover:border-[#19B5FE]/30 transition-all group">
                            <div className="w-11 h-11 rounded-xl bg-purple-400/10 border border-purple-400/30 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Heart size={20} />
                            </div>
                            <h3 className="text-sm font-black text-[#FFFFFF] uppercase tracking-wider mb-2">Memoriales Digitales
                                <span className="ml-2 text-[8px] bg-[#E0B84D]/10 text-[#E0B84D] border border-[#E0B84D]/30 px-1.5 py-0.5 rounded-full">ULTRA</span>
                            </h3>
                            <p className="text-xs text-[#C0C0C0] leading-relaxed">
                                Memorial interactivo, dedicatorias moderadas, velas virtuales y galería colaborativa.
                            </p>
                        </div>

                        {/* Plan de Tracking */}
                        <div className="bg-[#020210] border border-[#19B5FE]/30 p-6 rounded-2xl group shadow-lg shadow-[#19B5FE]/5">
                            <div className="w-11 h-11 rounded-xl bg-[#19B5FE]/10 border border-[#19B5FE]/30 text-[#19B5FE] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Eye size={20} />
                            </div>
                            <h3 className="text-sm font-black text-[#FFFFFF] uppercase tracking-wider mb-2">Plan de Tracking Público</h3>
                            <p className="text-xs text-[#C0C0C0] leading-relaxed">
                                Token único por servicio. La familia ve cada fase sin necesidad de iniciar sesión.
                            </p>
                        </div>

                        {/* RBAC */}
                        <div className="bg-[#020210] border border-white/5 p-6 rounded-2xl hover:border-[#19B5FE]/30 transition-all group">
                            <div className="w-11 h-11 rounded-xl bg-[#E0B84D]/10 border border-[#E0B84D]/30 text-[#E0B84D] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Lock size={20} />
                            </div>
                            <h3 className="text-sm font-black text-[#FFFFFF] uppercase tracking-wider mb-2">Roles y Permisos Granulares</h3>
                            <p className="text-xs text-[#C0C0C0] leading-relaxed">
                                Admin, recepción y operador con permisos granulares por módulo y acción.
                            </p>
                        </div>

                        {/* Auditoría */}
                        <div className="bg-[#020210] border border-white/5 p-6 rounded-2xl hover:border-[#19B5FE]/30 transition-all group">
                            <div className="w-11 h-11 rounded-xl bg-blue-400/10 border border-blue-400/30 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <ShieldCheck size={20} />
                            </div>
                            <h3 className="text-sm font-black text-[#FFFFFF] uppercase tracking-wider mb-2">Auditoría Completa</h3>
                            <p className="text-xs text-[#C0C0C0] leading-relaxed">
                                Cada acción crítica registrada con usuario, fecha, cambios y contexto completo.
                            </p>
                        </div>

                        {/* Notificaciones */}
                        <div className="bg-[#020210] border border-white/5 p-6 rounded-2xl hover:border-[#19B5FE]/30 transition-all group">
                            <div className="w-11 h-11 rounded-xl bg-[#19B5FE]/10 border border-[#19B5FE]/30 text-[#19B5FE] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Bell size={20} />
                            </div>
                            <h3 className="text-sm font-black text-[#FFFFFF] uppercase tracking-wider mb-2">Notificaciones y Avisos</h3>
                            <p className="text-xs text-[#C0C0C0] leading-relaxed">
                                Alertas internas por solicitudes, avances de servicio y pagos automáticos.
                            </p>
                        </div>

                        {/* Multi-tenant */}
                        <div className="bg-[#020210] border border-white/5 p-6 rounded-2xl hover:border-[#19B5FE]/30 transition-all group">
                            <div className="w-11 h-11 rounded-xl bg-indigo-400/10 border border-indigo-400/30 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <LayoutDashboard size={20} />
                            </div>
                            <h3 className="text-sm font-black text-[#FFFFFF] uppercase tracking-wider mb-2">Privacidad y seguridad de datos</h3>
                            <p className="text-xs text-[#C0C0C0] leading-relaxed">
                                Cada crematorio opera en su propio espacio seguro con aislamiento estricto de datos.
                            </p>
                        </div>

                        {/* Formularios públicos */}
                        <div className="bg-[#020210] border border-white/5 p-6 rounded-2xl hover:border-[#19B5FE]/30 transition-all group">
                            <div className="w-11 h-11 rounded-xl bg-[#E0B84D]/10 border border-[#E0B84D]/30 text-[#E0B84D] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <QrCode size={20} />
                            </div>
                            <h3 className="text-sm font-black text-[#FFFFFF] uppercase tracking-wider mb-2">Formularios Públicos</h3>
                            <p className="text-xs text-[#C0C0C0] leading-relaxed">
                                Enlaces temporales con PIN para que las familias inicien solicitudes desde fuera.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
