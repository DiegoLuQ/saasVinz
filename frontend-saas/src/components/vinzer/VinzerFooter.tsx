'use client';

import React from 'react';
import Link from 'next/link';
import { VinzerLogo } from './VinzerLogo';

interface VinzerFooterProps {
    theme?: 'dark' | 'light';
}

export function VinzerFooter({ theme = 'dark' }: VinzerFooterProps) {
    const isLight = theme === 'light';

    return (
        <footer
            aria-label="Pie de página Vinzer"
            className={`border-t py-16 px-6 relative z-10 transition-colors duration-500 ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#020210] border-white/5'
            }`}
        >
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 mb-12">
                {/* Izquierda: Info de Marca */}
                <div className="md:col-span-4 space-y-6">
                    <VinzerLogo size="md" />
                    <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                        Vinzer es la plataforma de software SaaS especializada en el sector funerario y cremación de mascotas en Chile y Latinoamérica. Aportamos tranquilidad a las familias a través del control y la trazabilidad digital inviolable.
                    </p>
                </div>

                {/* Derecha: Columnas de Enlaces */}
                <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
                    {/* Software */}
                    <div className="space-y-4">
                        <h5 className={`text-[10px] font-black uppercase tracking-wider ${
                            isLight ? 'text-amber-700' : 'text-[#E0B84D]'
                        }`}>
                            Software
                        </h5>
                        <ul className={`space-y-2.5 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                            <li><a href="/#producto" className="hover:text-[#0284C7] transition-colors">Producto & Módulos</a></li>
                            <li><a href="/#trazabilidad" className="hover:text-[#0284C7] transition-colors">Trazabilidad con QR</a></li>
                            <li><a href="/#como-funciona" className="hover:text-[#0284C7] transition-colors">Cómo Funciona</a></li>
                            <li><a href="/#planes" className="hover:text-[#0284C7] transition-colors">Planes y Precios</a></li>
                            <li><Link href="/comparar-planes" className="hover:text-[#0284C7] transition-colors">Comparar Planes</Link></li>
                        </ul>
                    </div>

                    {/* Guías & Recursos SEO */}
                    <div className="space-y-4">
                        <h5 className={`text-[10px] font-black uppercase tracking-wider ${
                            isLight ? 'text-amber-700' : 'text-[#E0B84D]'
                        }`}>
                            Recursos & Guías
                        </h5>
                        <ul className={`space-y-2.5 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                            <li>
                                <Link
                                    href="/guias/software-trazabilidad-cadena-custodia-crematorios-mascotas"
                                    className="hover:text-[#0284C7] transition-colors line-clamp-2"
                                    title="Guía: Trazabilidad y Cadena de Custodia"
                                >
                                    Guía: Trazabilidad y Custodia
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/guias/sistema-gestion-operativa-automatizacion-crematorio-mascotas"
                                    className="hover:text-[#0284C7] transition-colors line-clamp-2"
                                    title="Guía: Gestión Operativa de Hornos"
                                >
                                    Guía: Gestión Operativa de Hornos
                                </Link>
                            </li>
                            <li><a href="/#faqs" className="hover:text-[#0284C7] transition-colors">Preguntas Frecuentes</a></li>
                            <li><a href="/#trazabilidad" className="hover:text-[#0284C7] transition-colors">Trazabilidad en Vivo</a></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div className="space-y-4">
                        <h5 className={`text-[10px] font-black uppercase tracking-wider ${
                            isLight ? 'text-amber-700' : 'text-[#E0B84D]'
                        }`}>
                            Legal & Confianza
                        </h5>
                        <ul className={`space-y-2.5 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                            <li><Link href="/privacidad" className="hover:text-[#0284C7] transition-colors">Privacidad</Link></li>
                            <li><Link href="/terminos" className="hover:text-[#0284C7] transition-colors">Términos del Servicio</Link></li>
                            <li><Link href="/cookies" className="hover:text-[#0284C7] transition-colors">Política de Cookies</Link></li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Línea Inferior de Derechos */}
            <div className={`max-w-7xl mx-auto pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium ${
                isLight ? 'border-slate-100 text-slate-500' : 'border-white/5 text-slate-600'
            }`}>
                <p>© 2026 Vinzer SaaS. Software para crematorios de mascotas. Todos los derechos reservados.</p>
                <div className="flex gap-4">
                    <span className="hover:text-[#0284C7] cursor-pointer">LinkedIn</span>
                    <span className="hover:text-[#0284C7] cursor-pointer">Instagram</span>
                    <a href="/#demo" className="hover:text-[#0284C7]">Contacto B2B</a>
                </div>
            </div>
        </footer>
    );
}
