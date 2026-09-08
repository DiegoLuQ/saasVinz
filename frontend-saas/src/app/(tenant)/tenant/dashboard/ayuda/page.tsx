"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
    HelpCircle,
    BookOpen,
    Users,
    Dog,
    Flame,
    Compass,
    FileText,
    CheckCircle2,
    ChevronDown,
    ArrowRight,
    Search,
    Shield,
    Sparkles,
    PhoneCall,
    ExternalLink,
    LifeBuoy,
    PlayCircle
} from 'lucide-react';
import OnboardingWidget from '@/components/tenant/help/OnboardingWidget';

const FAQS = [
    {
        category: 'Ingreso & Registros',
        question: '¿Puedo registrar una mascota si el cliente aún no existe?',
        answer: 'Sí. Al abrir el formulario de Mascota, encontrarás la opción "+ Nuevo Cliente" justo al lado del selector de cliente. Esto te permite registrar al tutor en un modal emergente de forma inmediata sin perder los datos de la mascota.'
    },
    {
        category: 'Ingreso & Registros',
        question: '¿Por qué es obligatorio ingresar el peso/tamaño de la mascota?',
        answer: 'El peso determina el tramo tarifario (Regla de Precios por Peso) configurado en tu plan y define si la cremación requiere un proceso o urna especial.'
    },
    {
        category: 'Planes & Tarifas',
        question: '¿Cuál es la diferencia entre Plan Individual y Plan Comunitario?',
        answer: 'El Plan Individual garantiza que la mascota sea cremada de forma exclusiva con devolución de sus cenizas en una urna elegida. El Plan Comunitario realiza la cremación de forma colectiva y las cenizas no se devuelven al tutor.'
    },
    {
        category: 'Seguimiento (Tracking)',
        question: '¿Cómo funciona el código de seguimiento (Tracking)?',
        answer: 'Al crear una orden o seguimiento, el sistema genera un código único (ej: TRK-84920). Con este código o mediante el enlace público, el tutor puede consultar el estado del proceso en tiempo real desde la web de tracking sin necesidad de iniciar sesión.'
    },
    {
        category: 'Certificados & Documentos',
        question: '¿Cuándo se habilita la emisión del Certificado de Cremación?',
        answer: 'El certificado se habilita automáticamente una vez que el estado de la orden cambia a "Finalizado" (o "Delivered"). Puedes descargarlo en formato PDF de alta calidad con el diseño corporativo de tu crematorio.'
    },
];

const GUIDE_STEPS = [
    {
        number: '01',
        title: 'Registrar Tutor / Cliente',
        desc: 'Busca al cliente por su RUT. Si es la primera vez que atiende con ustedes, créalo ingresando su Nombre, Teléfono y Correo Electrónico.',
        icon: Users,
        link: '/dashboard/clientes',
        linkText: 'Ir a Clientes'
    },
    {
        number: '02',
        title: 'Registrar Ficha de Mascota',
        desc: 'Ingresa el Nombre, Especie (Perro, Gato, etc.), Raza, Edad y el Peso/Tamaño aproximado. Asígnala a su respectivo tutor.',
        icon: Dog,
        link: '/dashboard/mascotas',
        linkText: 'Ir a Mascotas'
    },
    {
        number: '03',
        title: 'Recepción y Pedido del Servicio',
        desc: 'Define el plan de cremación (Individual / Comunitario) y agrega productos o servicios adicionales (Urna especial, molde de huella, traslado).',
        icon: Flame,
        link: '/dashboard/recepcion-pedidos',
        linkText: 'Ir a Recepción y Pedidos'
    },
    {
        number: '04',
        title: 'Crear Seguimiento & Comprobante',
        desc: 'Inicia la orden de trabajo. Se generará un código de seguimiento público que podrás compartir con la familia por WhatsApp o Email.',
        icon: Compass,
        link: '/dashboard/operaciones/crear-seguimiento',
        linkText: 'Crear Seguimiento'
    },
    {
        number: '05',
        title: 'Emisión de Certificado & Memorial',
        desc: 'Una vez finalizada la cremación, emite el Certificado Oficial en PDF y opcionalmente configura la página de Memorial público.',
        icon: FileText,
        link: '/dashboard/documentos',
        linkText: 'Emitir Documento'
    },
];

export default function AyudaPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const [activeSection, setActiveSection] = useState<'tutorial' | 'faq' | 'contacto'>('tutorial');

    const filteredFaqs = FAQS.filter(
        f => f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 pb-12">
            {/* Header Banner */}
            <div className="glass-card rounded-3xl p-6 sm:p-10 border border-white/10 relative overflow-hidden bg-gradient-to-r from-primary/10 via-background to-background">
                <div className="max-w-3xl space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs font-bold text-primary uppercase tracking-wider">
                        <LifeBuoy size={14} />
                        Centro de Ayuda & Capacitación
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                        ¿Cómo usar Vinzer? Guía y Preguntas Frecuentes
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                        Aprende el flujo estándar de trabajo para recepcionar tutores, inscribir mascotas y gestionar el seguimiento hasta la entrega de certificados.
                    </p>
                </div>
            </div>

            {/* Interactive Stepper Widget */}
            <OnboardingWidget />

            {/* Navigation Tabs */}
            <div className="flex border-b border-white/10 gap-6 text-sm font-bold">
                <button
                    type="button"
                    onClick={() => setActiveSection('tutorial')}
                    className={`pb-4 transition border-b-2 flex items-center gap-2 ${activeSection === 'tutorial'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <BookOpen size={16} />
                    Guía de Registro Completa
                </button>
                <button
                    type="button"
                    onClick={() => setActiveSection('faq')}
                    className={`pb-4 transition border-b-2 flex items-center gap-2 ${activeSection === 'faq'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <HelpCircle size={16} />
                    Preguntas Frecuentes ({FAQS.length})
                </button>
            </div>

            {/* Section 1: Detailed Step-by-Step Guide */}
            {activeSection === 'tutorial' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold tracking-tight">Pasos Recomendados de Operación</h2>
                        <span className="text-xs text-muted-foreground">Flujo operativo estandarizado</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {GUIDE_STEPS.map((step) => {
                            const Icon = step.icon;
                            return (
                                <div
                                    key={step.number}
                                    className="glass-card rounded-3xl p-6 space-y-4 border border-white/10 flex flex-col justify-between hover:border-primary/30 transition group"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-2xl font-black text-primary/40 font-mono">
                                                {step.number}
                                            </span>
                                            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-primary group-hover:bg-primary/10 transition">
                                                <Icon size={20} />
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition">
                                            {step.title}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                            {step.desc}
                                        </p>
                                    </div>

                                    <div className="pt-3 border-t border-white/5">
                                        <Link
                                            href={step.link}
                                            className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
                                        >
                                            {step.linkText}
                                            <ArrowRight size={14} />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Section 2: FAQ Accordion */}
            {activeSection === 'faq' && (
                <div className="space-y-6">
                    {/* Search bar */}
                    <div className="relative max-w-xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar en preguntas frecuentes..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-primary/50 text-sm transition"
                        />
                    </div>

                    <div className="space-y-3 max-w-4xl">
                        {filteredFaqs.map((faq, index) => {
                            const isOpen = openFaq === index;
                            return (
                                <div
                                    key={index}
                                    className="glass-card rounded-2xl border border-white/10 overflow-hidden transition"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setOpenFaq(isOpen ? null : index)}
                                        className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm hover:bg-white/[0.02] transition"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-primary/10 text-primary border border-primary/20">
                                                {faq.category}
                                            </span>
                                            <span>{faq.question}</span>
                                        </div>
                                        <ChevronDown
                                            size={18}
                                            className={`text-muted-foreground transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-primary' : ''
                                                }`}
                                        />
                                    </button>

                                    {isOpen && (
                                        <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-muted-foreground border-t border-white/5 leading-relaxed bg-white/[0.01]">
                                            {faq.answer}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {filteredFaqs.length === 0 && (
                            <div className="p-8 text-center glass-card rounded-3xl text-muted-foreground text-sm">
                                No se encontraron preguntas frecuentes para "{searchQuery}".
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
