'use client';

import React from 'react';
import { Globe, Plug, Search, CheckCircle2, MessageSquare, Sparkles } from 'lucide-react';

const WHATSAPP_URL =
    'https://wa.me/56982395940?text=Hola%2C%20quiero%20cotizar%20el%20Plan%20ULTRA%20de%20Vinzer%2C%20incluido%20el%20sitio%20web%20institucional.';

// Los tres beneficios están amarrados al Plan Ultra, no vendidos como un
// servicio de agencia aparte.
const valueProps = [
    {
        icon: Globe,
        title: 'Marca blanca completa',
        description:
            'Tu propio dominio (ej. www.tucrematorio.cl) con diseño sobrio y empático, tu logotipo y tus colores. Las familias entran a tu marca, no a la nuestra.',
    },
    {
        icon: Search,
        title: 'Buscador de seguimiento integrado',
        description:
            'Las familias consultan el estado del servicio dentro de tu propia web, conectada a tu panel Vinzer.',
    },
    {
        icon: Plug,
        title: 'Catálogo de servicios y ánforas',
        description:
            'Muestra tus tipos de cremación, tus productos y tus ánforas directamente desde el catálogo que ya administras en Vinzer.',
    },
];

const includes = [
    'Diseño personalizado con tu marca y colores',
    'Tu propio dominio (lo registras a tu nombre)',
    'Hosting incluido mientras mantengas tu Plan ULTRA',
    'Página de servicios con descripción y precios',
    'Buscador de seguimiento conectado a tu panel',
    'Catálogo de servicios, productos y ánforas',
    'Optimización para que te encuentren en Google',
    'Se ve perfecto en celular, tablet y computador',
];

interface VinzerWebServiceProps {
    theme?: 'dark' | 'light';
}

export function VinzerWebService({ theme = 'dark' }: VinzerWebServiceProps) {
    return (
        <section
            id="sitio-web"
            className={`py-32 relative z-10 border-y overflow-hidden transition-colors duration-500 ${
                theme === 'light'
                    ? 'bg-slate-100/70 border-slate-200'
                    : 'border-white/5'
            }`}
        >
            {/* Resplandor decorativo celeste */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className={`absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[160px] ${
                    theme === 'light' ? 'bg-[#0284C7]/10' : 'bg-[#19B5FE]/8'
                }`} />
                <div className={`absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full blur-[140px] ${
                    theme === 'light' ? 'bg-[#0284C7]/5' : 'bg-[#19B5FE]/5'
                }`} />
            </div>

            <div className="max-w-7xl mx-auto px-6 relative">
                {/* Encabezado */}
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-5">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
                        theme === 'light'
                            ? 'bg-sky-500/10 border-sky-500/20 text-[#0284C7]'
                            : 'bg-[#19B5FE]/10 border-[#19B5FE]/20 text-[#19B5FE]'
                    }`}>
                        <Globe size={11} className={theme === 'light' ? 'text-[#0284C7]' : 'text-[#19B5FE]'} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            💎 Exclusivo Plan Ultra
                        </span>
                    </div>

                    <h2 className={`text-3xl md:text-5xl font-black leading-tight ${
                        theme === 'light' ? 'text-slate-900' : 'text-[#FFFFFF]'
                    }`}>
                        Tu crematorio merece un sitio web que{' '}
                        <span className={theme === 'light' ? 'text-[#0284C7]' : 'text-[#19B5FE]'}>transmita confianza</span>{' '}
                        desde el primer clic
                    </h2>

                    <p className={`font-medium max-w-2xl mx-auto ${
                        theme === 'light' ? 'text-slate-600' : 'text-[#C0C0C0]'
                    }`}>
                        El Plan Ultra incluye tu propia página web institucional personalizada con tu marca,
                        logotipo y colores, conectada a Vinzer. Las familias conocen tus servicios
                        y consultan el estado de su mascota directamente en tu dominio.
                    </p>
                </div>

                {/* Tarjetas de propuesta de valor */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
                    {valueProps.map(({ icon: Icon, title, description }) => (
                        <div
                            key={title}
                            className={`rounded-3xl p-7 space-y-4 transition-all duration-300 group border ${
                                theme === 'light'
                                    ? 'bg-white border-slate-200 shadow-sm hover:border-[#0284C7] hover:shadow-md'
                                    : 'bg-[#020210] border-[#19B5FE]/15 hover:border-[#19B5FE]/35'
                            }`}
                        >
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-colors ${
                                theme === 'light'
                                    ? 'bg-sky-50 border-sky-200 text-[#0284C7]'
                                    : 'bg-[#19B5FE]/10 border-[#19B5FE]/20 text-[#19B5FE]'
                            }`}>
                                <Icon size={20} className={theme === 'light' ? 'text-[#0284C7]' : 'text-[#19B5FE]'} />
                            </div>
                            <h3 className={`text-base font-black ${
                                theme === 'light' ? 'text-slate-900' : 'text-[#FFFFFF]'
                            }`}>{title}</h3>
                            <p className={`text-[12px] leading-relaxed ${
                                theme === 'light' ? 'text-slate-600' : 'text-[#C0C0C0]'
                            }`}>{description}</p>
                        </div>
                    ))}
                </div>

                {/* Banner ULTRA */}
                <div className={`mb-6 flex items-center gap-4 border rounded-2xl px-6 py-4 ${
                    theme === 'light'
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-gradient-to-r from-[#E0B84D]/10 to-[#E0B84D]/5 border-[#E0B84D]/30'
                }`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        theme === 'light'
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-700'
                            : 'bg-[#E0B84D]/15 border-[#E0B84D]/30 text-[#E0B84D]'
                    }`}>
                        <Sparkles size={16} className={theme === 'light' ? 'text-amber-700' : 'text-[#E0B84D]'} />
                    </div>
                    <p className={`text-[12px] leading-snug ${
                        theme === 'light' ? 'text-slate-700' : 'text-[#C0C0C0]'
                    }`}>
                        El <span className={`font-black ${theme === 'light' ? 'text-amber-700' : 'text-[#E0B84D]'}`}>Plan ULTRA</span> incluye tu sitio web{' '}
                        <span className={`font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>sin costo adicional</span> mientras mantengas tu suscripción. Solo pagas el dominio, que se registra a tu nombre.
                    </p>
                </div>

                {/* Checklist + CTA */}
                <div className={`rounded-[2.5rem] p-8 md:p-12 flex flex-col lg:flex-row gap-10 items-start border transition-all duration-500 ${
                    theme === 'light'
                        ? 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'
                        : 'bg-[#0b0a24] border-[#19B5FE]/20'
                }`}>
                    {/* Lista de qué incluye */}
                    <div className="flex-1 space-y-4">
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-5 ${
                            theme === 'light' ? 'text-[#0284C7]' : 'text-[#19B5FE]'
                        }`}>
                            ¿Qué incluye tu sitio web?
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {includes.map((item) => (
                                <li key={item} className={`flex items-start gap-3 text-[12px] ${
                                    theme === 'light' ? 'text-slate-700' : 'text-[#C0C0C0]'
                                }`}>
                                    <CheckCircle2 size={15} className={`shrink-0 mt-0.5 ${
                                        theme === 'light' ? 'text-[#0284C7]' : 'text-[#19B5FE]'
                                    }`} />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Divisor vertical en desktop */}
                    <div className={`hidden lg:block w-px self-stretch ${
                        theme === 'light' ? 'bg-slate-200' : 'bg-[#19B5FE]/10'
                    }`} />

                    {/* CTA */}
                    <div className="lg:w-64 xl:w-72 flex flex-col gap-5 shrink-0">
                        <p className={`text-sm leading-relaxed ${
                            theme === 'light' ? 'text-slate-600' : 'text-[#C0C0C0]'
                        }`}>
                            Cuéntanos sobre tu crematorio y coordinamos la puesta en marcha de tu Plan ULTRA.
                        </p>
                        <a
                            href={WHATSAPP_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center justify-center gap-2.5 min-h-[52px] px-6 py-3 rounded-2xl font-black text-[12px] uppercase tracking-wider transition-all duration-300 shadow-lg active:scale-[0.98] ${
                                theme === 'light'
                                    ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-sky-500/25'
                                    : 'bg-[#19B5FE] hover:bg-[#0e9ce0] text-[#020210] shadow-[#19B5FE]/25'
                            }`}
                        >
                            <MessageSquare size={18} />
                            Cotizar Plan ULTRA
                        </a>
                        <div className="flex items-center justify-center gap-1.5">
                            <Sparkles size={11} className={theme === 'light' ? 'text-amber-600' : 'text-[#E0B84D]'} />
                            <p className={`text-[10px] font-bold text-center ${
                                theme === 'light' ? 'text-amber-700' : 'text-[#E0B84D]'
                            }`}>
                                Incluido con tu Plan ULTRA
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
