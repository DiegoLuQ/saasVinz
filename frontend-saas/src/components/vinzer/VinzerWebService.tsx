'use client';

import React from 'react';
import { Globe, Plug, Search, CheckCircle2, MessageSquare, Sparkles } from 'lucide-react';

const WHATSAPP_URL =
    'https://wa.me/56982395940?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20el%20servicio%20de%20sitio%20web%20para%20crematorio';

const valueProps = [
    {
        icon: Globe,
        title: 'Especialistas en el nicho',
        description:
            'Diseñamos para el contexto emocional correcto — familias que buscan confiar en un servicio funerario para su mascota. No es una plantilla genérica.',
    },
    {
        icon: Plug,
        title: 'Integración nativa con Vinzer',
        description:
            'El formulario de contacto del sitio conecta directo con el CRM de tu cuenta Vinzer. Los datos de los clientes potenciales ingresan automáticamente.',
    },
    {
        icon: Search,
        title: 'SEO para tu ciudad',
        description:
            'Tu sitio aparece cuando buscan "crematorio de mascotas en [ciudad]". Metadatos, schema y copy optimizados para el nicho desde el día uno.',
    },
];

const includes = [
    'Diseño personalizado con tu marca y colores',
    'Dominio + hosting el primer año incluidos',
    'Página de servicios con descripción y precios',
    'Formulario integrado con tu CRM Vinzer',
    'SEO básico (metadatos, schema, sitemap)',
    'Responsive mobile-first',
    'Enlace directo a tracking público y memorial digital',
    'Entrega en 7–10 días hábiles',
];

export function VinzerWebService() {
    return (
        <section
            id="sitio-web"
            className="py-32 relative z-10 border-y border-white/5 overflow-hidden"
        >
            {/* Resplandor decorativo celeste */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#19B5FE]/8 blur-[160px]" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-[#19B5FE]/5 blur-[140px]" />
            </div>

            <div className="max-w-7xl mx-auto px-6 relative">
                {/* Encabezado */}
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#19B5FE]/10 border border-[#19B5FE]/20 rounded-full">
                        <Globe size={11} className="text-[#19B5FE]" />
                        <span className="text-[10px] font-black text-[#19B5FE] uppercase tracking-widest">
                            Servicio adicional · Especialistas en crematorios
                        </span>
                    </div>

                    <h2 className="text-3xl md:text-5xl font-black text-[#FFFFFF] leading-tight">
                        Tu crematorio merece un sitio web que{' '}
                        <span className="text-[#19B5FE]">transmita confianza</span>{' '}
                        desde el primer clic
                    </h2>

                    <p className="text-[#C0C0C0] font-medium max-w-2xl mx-auto">
                        Somos especialistas en crear sitios web para crematorios de mascotas. Sabemos qué
                        buscan las familias y cómo generar la confianza que necesitan antes de llamar.
                    </p>
                </div>

                {/* Tarjetas de propuesta de valor */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
                    {valueProps.map(({ icon: Icon, title, description }) => (
                        <div
                            key={title}
                            className="bg-[#020210] border border-[#19B5FE]/15 hover:border-[#19B5FE]/35 rounded-3xl p-7 space-y-4 transition-all duration-300 group"
                        >
                            <div className="w-11 h-11 rounded-2xl bg-[#19B5FE]/10 border border-[#19B5FE]/20 flex items-center justify-center group-hover:bg-[#19B5FE]/15 transition-colors">
                                <Icon size={20} className="text-[#19B5FE]" />
                            </div>
                            <h3 className="text-base font-black text-[#FFFFFF]">{title}</h3>
                            <p className="text-[12px] text-[#C0C0C0] leading-relaxed">{description}</p>
                        </div>
                    ))}
                </div>

                {/* Banner ULTRA */}
                <div className="mb-6 flex items-center gap-4 bg-gradient-to-r from-[#E0B84D]/10 to-[#E0B84D]/5 border border-[#E0B84D]/30 rounded-2xl px-6 py-4">
                    <div className="w-9 h-9 rounded-xl bg-[#E0B84D]/15 border border-[#E0B84D]/30 flex items-center justify-center shrink-0">
                        <Sparkles size={16} className="text-[#E0B84D]" />
                    </div>
                    <p className="text-[12px] text-[#C0C0C0] leading-snug">
                        <span className="text-[#E0B84D] font-black">Plan ULTRA</span> incluye tu sitio web{' '}
                        <span className="text-white font-bold">gratis para siempre</span> — sin costo adicional mientras mantengas tu suscripción. Solo pagas el dominio, que es tuyo.
                    </p>
                </div>

                {/* Checklist + CTA */}
                <div className="bg-[#0b0a24] border border-[#19B5FE]/20 rounded-[2.5rem] p-8 md:p-12 flex flex-col lg:flex-row gap-10 items-start">
                    {/* Lista de qué incluye */}
                    <div className="flex-1 space-y-4">
                        <p className="text-[10px] font-black text-[#19B5FE] uppercase tracking-widest mb-5">
                            ¿Qué incluye el servicio?
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {includes.map((item) => (
                                <li key={item} className="flex items-start gap-3 text-[12px] text-[#C0C0C0]">
                                    <CheckCircle2 size={15} className="text-[#19B5FE] shrink-0 mt-0.5" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Divisor vertical en desktop */}
                    <div className="hidden lg:block w-px self-stretch bg-[#19B5FE]/10" />

                    {/* CTA */}
                    <div className="lg:w-64 xl:w-72 flex flex-col gap-5 shrink-0">
                        <p className="text-sm text-[#C0C0C0] leading-relaxed">
                            Cuéntanos sobre tu crematorio y te enviamos una propuesta sin compromiso.
                        </p>
                        <a
                            href={WHATSAPP_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2.5 min-h-[52px] px-6 py-3 bg-[#19B5FE] hover:bg-[#0e9ce0] text-[#020210] rounded-2xl font-black text-[12px] uppercase tracking-wider transition-all duration-300 shadow-lg shadow-[#19B5FE]/25 hover:shadow-[#19B5FE]/40 active:scale-[0.98]"
                        >
                            <MessageSquare size={18} />
                            Quiero mi sitio web
                        </a>
                        <div className="flex items-center justify-center gap-1.5">
                            <Sparkles size={11} className="text-[#E0B84D]" />
                            <p className="text-[10px] text-[#E0B84D] font-bold text-center">
                                Gratis para siempre con Plan ULTRA
                            </p>
                        </div>
                        <p className="text-[10px] text-slate-500 text-center -mt-3">
                            Respuesta en menos de 24 h · Sin compromiso
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
