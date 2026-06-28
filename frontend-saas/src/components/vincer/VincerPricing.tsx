'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';

interface VincerPricingProps {
    loginUrl: string;
}

export function VincerPricing({ loginUrl }: VincerPricingProps) {
    const [isAnnual, setIsAnnual] = useState(false);

    // Precios base
    const priceNormal = 39900;
    const pricePro = 59990;
    const priceUltra = 119000;

    // Descuento del 20%
    const discount = 0.8;

    const formatPrice = (value: number) => {
        return new Intl.NumberFormat('es-CL').format(Math.round(value));
    };

    return (
        <section id="precios" className="py-32 bg-[#0b0a24]/30 border-y border-white/5 relative z-10">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#19B5FE]/10 border border-[#19B5FE]/20 rounded-full">
                        <Star size={12} className="text-[#19B5FE]" />
                        <span className="text-[10px] font-black text-[#19B5FE] uppercase tracking-widest">Planes B2B SaaS · Precios CLP</span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-[#FFFFFF] leading-tight">
                        Honrando su memoria con la excelencia que merecen.
                    </h2>
                    <p className="text-[#C0C0C0] font-medium max-w-2xl mx-auto">
                        Elige el plan ideal para acompañar a las familias con absoluta transparencia y dignidad. Todos incluyen aislamiento de datos multi-tenant y Plan de Tracking público.
                    </p>

                    {/* Toggle Facturación / Descuento */}
                    <div className="flex items-center justify-center gap-4 pt-6">
                        <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${!isAnnual ? 'text-[#FFFFFF]' : 'text-slate-500'}`}>
                            Mensual
                        </span>
                        <button
                            onClick={() => setIsAnnual(!isAnnual)}
                            className="relative w-12 h-6 rounded-full bg-white/10 border border-white/10 transition-colors focus:outline-none"
                            aria-label="Alternar descuento anual"
                        >
                            <div
                                className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-[#19B5FE] transition-transform duration-300 ${
                                    isAnnual ? 'translate-x-6' : ''
                                }`}
                            />
                        </button>
                        <span className={`text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${isAnnual ? 'text-[#19B5FE]' : 'text-slate-500'}`}>
                            Anual <span className="bg-[#19B5FE]/15 text-[#19B5FE] border border-[#19B5FE]/20 px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest">20% DESC</span>
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 lg:gap-6">
                    {/* Plan FREE */}
                    <div className="bg-[#020210] border border-white/5 p-5 lg:p-6 rounded-3xl flex flex-col justify-between gap-5 hover:border-white/10 transition-all duration-300">
                        <div className="space-y-3">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Para Empezar</div>
                            <h3 className="text-xl font-black text-[#FFFFFF]">FREE</h3>
                            <p className="text-[11px] text-slate-400 min-h-[2.5rem] leading-relaxed">Ideal para pequeños crematorios que están empezando.</p>
                            <div className="pt-2">
                                <div className="text-2xl lg:text-3xl font-black text-[#FFFFFF] tabular-nums">$0 <span className="text-[10px] font-medium text-slate-500">CLP / mes</span></div>
                            </div>
                        </div>
                        <ul className="space-y-2 border-t border-white/5 pt-4 text-[11px] text-[#C0C0C0]">
                            <li className="flex items-start gap-2">✓ 10 mascotas / órdenes / clientes al mes</li>
                            <li className="flex items-start gap-2">✓ 2 usuarios</li>
                            <li className="flex items-start gap-2">✓ Inventario + catálogo</li>
                            <li className="flex items-start gap-2">✓ Plan de Tracking público básico</li>
                            <li className="flex items-start gap-2 text-slate-500">— Sin certificados ni operaciones</li>
                        </ul>
                        <Link
                            href={loginUrl}
                            className="text-center min-h-[44px] py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-[#FFFFFF] rounded-xl text-[11px] font-black uppercase tracking-wider transition-all"
                        >
                            Comenzar Gratis
                        </Link>
                    </div>

                    {/* Plan TRACK — Especializado en Operaciones */}
                    <div className="bg-[#020210] border border-blue-400/30 p-5 lg:p-6 rounded-3xl flex flex-col justify-between gap-5 hover:border-blue-400/50 transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-blue-400/15 text-blue-300 border-l border-b border-blue-400/30 px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-bl-xl">
                            Operaciones
                        </div>
                        <div className="space-y-3">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Especializado</div>
                            <h3 className="text-xl font-black text-[#FFFFFF]">TRACK</h3>
                            <p className="text-[11px] text-slate-400 min-h-[2.5rem] leading-relaxed">Foco en operaciones y trazabilidad. Para crematorios con CRM externo.</p>
                            <div className="pt-2">
                                <div className="text-2xl lg:text-3xl font-black text-[#FFFFFF] tabular-nums">
                                    ${formatPrice(isAnnual ? 29900 * discount : 29900)} 
                                    <span className="text-[10px] font-medium text-slate-500"> CLP / mes</span>
                                </div>
                                {isAnnual ? (
                                    <div className="text-[9px] text-[#19B5FE] font-bold uppercase tracking-wider mt-1">Anual: ${formatPrice(29900 * discount * 12)} CLP</div>
                                ) : (
                                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">Anual: ${formatPrice(29900 * 12)} CLP</div>
                                )}
                            </div>
                        </div>
                        <ul className="space-y-2 border-t border-white/5 pt-4 text-[11px] text-[#C0C0C0]">
                            <li className="flex items-start gap-2">✓ 35 mascotas / órdenes / clientes al mes</li>
                            <li className="flex items-start gap-2">✓ 2 usuarios</li>
                            <li className="flex items-start gap-2 text-blue-400">✓ Módulo Operaciones completo</li>
                            <li className="flex items-start gap-2">✓ Inventario + catálogo</li>
                            <li className="flex items-start gap-2 text-blue-400">✓ Plan de Tracking público</li>
                        </ul>
                        <Link
                            href={loginUrl}
                            className="text-center min-h-[44px] py-3 bg-white/5 border border-blue-400/30 hover:bg-blue-400 hover:text-[#020210] text-[#FFFFFF] rounded-xl text-[11px] font-black uppercase tracking-wider transition-all"
                        >
                            Probar Track
                        </Link>
                    </div>

                    {/* Plan NORMAL */}
                    <div className="bg-[#020210] border border-white/5 p-5 lg:p-6 rounded-3xl flex flex-col justify-between gap-5 hover:border-white/10 transition-all duration-300">
                        <div className="space-y-3">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Profesional</div>
                            <h3 className="text-xl font-black text-[#FFFFFF]">NORMAL</h3>
                            <p className="text-[11px] text-slate-400 min-h-[2.5rem] leading-relaxed">Gestión profesional para crematorios con flujo constante.</p>
                            <div className="pt-2">
                                <div className="text-2xl lg:text-3xl font-black text-[#FFFFFF] tabular-nums">
                                    ${formatPrice(isAnnual ? priceNormal * discount : priceNormal)} 
                                    <span className="text-[10px] font-medium text-slate-500"> CLP / mes</span>
                                </div>
                                {isAnnual ? (
                                    <div className="text-[9px] text-[#19B5FE] font-bold uppercase tracking-wider mt-1">Anual: ${formatPrice(priceNormal * discount * 12)} CLP</div>
                                ) : (
                                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">Anual: ${formatPrice(priceNormal * 12)} CLP</div>
                                )}
                            </div>
                        </div>
                        <ul className="space-y-2 border-t border-white/5 pt-4 text-[11px] text-[#C0C0C0]">
                            <li className="flex items-start gap-2">✓ 40 mascotas / órdenes / clientes al mes</li>
                            <li className="flex items-start gap-2">✓ 3 usuarios</li>
                            <li className="flex items-start gap-2">✓ Certificados y operaciones</li>
                            <li className="flex items-start gap-2">✓ Inventario + catálogo</li>
                            <li className="flex items-start gap-2">✓ Plan de Tracking optimizado</li>
                        </ul>
                        <Link
                            href={loginUrl}
                            className="text-center min-h-[44px] py-3 bg-white/5 border border-white/5 hover:bg-white/10 text-[#FFFFFF] rounded-xl text-[11px] font-black uppercase tracking-wider transition-all"
                        >
                            Comenzar Normal
                        </Link>
                    </div>

                    {/* Plan PRO — Recomendado */}
                    <div className="bg-[#0b0a24] border border-[#19B5FE] p-5 lg:p-6 rounded-3xl flex flex-col justify-between gap-5 relative overflow-hidden shadow-lg shadow-[#19B5FE]/5">
                        <div className="absolute top-0 right-0 bg-[#19B5FE] text-[#020210] px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-bl-xl">
                            Recomendado
                        </div>
                        <div className="space-y-3">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#19B5FE]">Avanzado</div>
                            <h3 className="text-xl font-black text-[#FFFFFF]">PRO</h3>
                            <p className="text-[11px] text-[#C0C0C0] min-h-[2.5rem] leading-relaxed">Potencia total para crematorios de alto volumen.</p>
                            <div className="pt-2">
                                <div className="text-2xl lg:text-3xl font-black text-[#FFFFFF] tabular-nums">
                                    ${formatPrice(isAnnual ? pricePro * discount : pricePro)} 
                                    <span className="text-[10px] font-medium text-slate-400"> CLP / mes</span>
                                </div>
                                {isAnnual ? (
                                    <div className="text-[9px] text-[#19B5FE] font-bold uppercase tracking-wider mt-1">Anual: ${formatPrice(pricePro * discount * 12)} CLP</div>
                                ) : (
                                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">Anual: ${formatPrice(pricePro * 12)} CLP</div>
                                )}
                            </div>
                        </div>
                        <ul className="space-y-2 border-t border-white/5 pt-4 text-[11px] text-slate-200">
                            <li className="flex items-start gap-2">✓ 60 mascotas / órdenes / clientes al mes</li>
                            <li className="flex items-start gap-2">✓ 4 usuarios</li>
                            <li className="flex items-start gap-2 text-[#19B5FE]">✓ Exportación de datos habilitada</li>
                            <li className="flex items-start gap-2">✓ Todo lo del plan Normal</li>
                            <li className="flex items-start gap-2 text-[#19B5FE]">✓ Catálogo extendido y operaciones avanzadas</li>
                        </ul>
                        <Link
                            href={loginUrl}
                            className="text-center min-h-[44px] py-3 bg-[#19B5FE] hover:bg-[#19B5FE]/90 text-[#020210] rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-md shadow-[#19B5FE]/15"
                        >
                            Comenzar Demo
                        </Link>
                    </div>

                    {/* Plan ULTRA */}
                    <div className="bg-[#020210] border border-[#E0B84D]/30 p-5 lg:p-6 rounded-3xl flex flex-col justify-between gap-5 hover:border-[#E0B84D]/50 transition-all duration-300">
                        <div className="space-y-3">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#E0B84D]">Empresarial</div>
                            <h3 className="text-xl font-black text-[#FFFFFF]">ULTRA</h3>
                            <p className="text-[11px] text-slate-400 min-h-[2.5rem] leading-relaxed">Para empresas líderes con alto volumen y múltiples puntos de servicio.</p>
                            <div className="pt-2">
                                <div className="text-2xl lg:text-3xl font-black text-[#FFFFFF] tabular-nums">
                                    ${formatPrice(isAnnual ? priceUltra * discount : priceUltra)} 
                                    <span className="text-[10px] font-medium text-slate-500"> CLP / mes</span>
                                </div>
                                {isAnnual ? (
                                    <div className="text-[9px] text-[#19B5FE] font-bold uppercase tracking-wider mt-1">Anual: ${formatPrice(priceUltra * discount * 12)} CLP</div>
                                ) : (
                                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">Anual: ${formatPrice(priceUltra * 12)} CLP</div>
                                )}
                            </div>
                        </div>
                        <ul className="space-y-2 border-t border-white/5 pt-4 text-[11px] text-[#C0C0C0]">
                            <li className="flex items-start gap-2 text-[#E0B84D]">✓ 200 mascotas · 250 órdenes al mes</li>
                            <li className="flex items-start gap-2 text-[#E0B84D]">✓ 5 usuarios · 100 clientes activos</li>
                            <li className="flex items-start gap-2">✓ Todo lo del plan PRO</li>
                            <li className="flex items-start gap-2 text-[#E0B84D]">✓ Exportación + analítica avanzada</li>
                            <li className="flex items-start gap-2 text-[#E0B84D]">✓ Catálogo completo (70 servicios · 300 productos)</li>
                        </ul>
                        <a
                            href="mailto:soporte@vincer.app"
                            className="text-center min-h-[44px] py-3 bg-white/5 border border-[#E0B84D]/30 hover:bg-[#E0B84D] hover:text-[#020210] text-[#FFFFFF] rounded-xl text-[11px] font-black uppercase tracking-wider transition-all"
                        >
                            Agendar Reunión
                        </a>
                    </div>
                </div>

                <p className="text-center text-[10px] uppercase tracking-widest text-slate-500 mt-10">
                    Plan Track sin certificados ni configuración · Pagos mensuales o anuales con descuento
                </p>
            </div>
        </section>
    );
}
