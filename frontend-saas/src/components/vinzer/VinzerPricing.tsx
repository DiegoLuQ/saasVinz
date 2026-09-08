'use client';

import React, { useEffect, useState } from 'react';
import { Star, ShieldCheck, Check, X, Gift } from 'lucide-react';
import type { PublicPlan } from '@/lib/api/plans';

const WHATSAPP_BASE = 'https://wa.me/56982395940?text=';

/**
 * Copy comercial por plan. Los NÚMEROS nunca viven aquí: llegan desde
 * /api/public/plans, que los lee de la misma tabla que aplica los topes.
 * Aquí solo va lo que es puramente de marketing.
 */
const PLAN_COPY: Record<string, {
    category: string;
    tagline: string;
    whatsapp: string;
    highlight?: 'recommended' | 'top';
}> = {
    FREE: {
        category: 'Para empezar',
        tagline: 'Ideal para crematorios que inician o quieren probar la plataforma sin riesgo.',
        whatsapp: 'Hola, quiero solicitar el Plan GRATIS de Vinzer para mi crematorio.',
    },
    TRACK: {
        category: 'Operativo',
        tagline: 'Para crematorios que ya tienen CRM o facturación externos y solo necesitan trazabilidad y control de planta.',
        whatsapp: 'Hola, quiero cotizar el Plan Track de Vinzer.',
    },
    NORMAL: {
        category: 'Profesional',
        tagline: 'Gestión completa para crematorios en crecimiento con flujo constante de servicios.',
        whatsapp: 'Hola, quiero cotizar el Plan Normal de Vinzer.',
    },
    PRO: {
        category: 'Avanzado',
        tagline: 'Potencia y automatización para crematorios de alto volumen y operación exigente.',
        whatsapp: 'Hola, quiero cotizar el Plan PRO de Vinzer.',
        highlight: 'recommended',
    },
    ULTRA: {
        category: 'Empresarial',
        tagline: 'Para empresas consolidadas que además buscan presencia de marca digital.',
        whatsapp: 'Hola, quiero cotizar el Plan ULTRA de Vinzer, incluido el sitio web institucional.',
        highlight: 'top',
    },
};

/**
 * Orden de las tarjetas de pago. Se fija aquí y no por `display_order` porque
 * en la BD ese campo tiene a Track empatado con ULTRA, lo que lo empuja al
 * final. FREE queda fuera de la grilla: tiene su propio bloque.
 */
const PAID_PLAN_ORDER = ['TRACK', 'NORMAL', 'PRO', 'ULTRA'];

const formatCLP = (value: number) => new Intl.NumberFormat('es-CL').format(Math.round(value));

interface VinzerPricingProps {
    theme?: 'dark' | 'light';
    initialPlans?: PublicPlan[] | null;
}

export function VinzerPricing({ theme = 'dark', initialPlans = null }: VinzerPricingProps) {
    const [isAnnual, setIsAnnual] = useState(false);
    const [plans, setPlans] = useState<PublicPlan[]>(initialPlans ?? []);

    // El servidor ya entrega los planes en el HTML. Este fetch solo cubre el
    // caso de que la landing se haya renderizado sin ellos (API caída al build).
    useEffect(() => {
        if (initialPlans && initialPlans.length > 0) return;
        let cancelled = false;
        fetch('/api/public/plans')
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => { if (!cancelled && Array.isArray(data)) setPlans(data); })
            .catch(() => { /* se muestra el bloque de contacto de respaldo */ });
        return () => { cancelled = true; };
    }, [initialPlans]);

    const isLight = theme === 'light';

    const freePlan = plans.find((p) => p.price === 0) ?? null;
    const paidPlans = plans
        .filter((p) => p.price > 0)
        .sort((a, b) => {
            const ia = PAID_PLAN_ORDER.indexOf(a.name.toUpperCase());
            const ib = PAID_PLAN_ORDER.indexOf(b.name.toUpperCase());
            // Un plan no listado va al final, ordenado por precio.
            if (ia === -1 && ib === -1) return a.price - b.price;
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
        });

    const hasAnnualOffer = paidPlans.some((p) => p.annual_price != null && p.annual_price > 0);


    return (
        <section
            id="precios"
            className={`py-28 border-y relative z-10 transition-colors duration-500 ${
                isLight ? 'bg-slate-100/70 border-slate-200' : 'bg-[#0b0a24]/30 border-white/5'
            }`}
        >
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
                        isLight
                            ? 'bg-sky-500/10 border-sky-500/20 text-[#0284C7]'
                            : 'bg-[#19B5FE]/10 border-[#19B5FE]/20 text-[#19B5FE]'
                    }`}>
                        <Star size={12} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Planes y precios en CLP</span>
                    </div>

                    <h2 className={`text-3xl md:text-5xl font-black leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        Planes diseñados para impulsar el crecimiento de tu crematorio.
                    </h2>

                    {/* Garantía transversal. El seguimiento público no está limitado por plan. */}
                    <div className={`inline-flex items-start sm:items-center gap-2.5 text-left sm:text-center px-4 py-3 rounded-2xl border ${
                        isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-[#C0C0C0]'
                    }`}>
                        <ShieldCheck size={16} className={`shrink-0 mt-0.5 sm:mt-0 ${isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'}`} />
                        <span className="text-[12px] leading-relaxed">
                            Todos los planes incluyen <strong className={isLight ? 'text-slate-900' : 'text-white'}>tus datos aislados y privados</strong>, visibles
                            solo para tu equipo, y el <strong className={isLight ? 'text-slate-900' : 'text-white'}>seguimiento en línea</strong> para las familias.
                        </span>
                    </div>

                    {hasAnnualOffer && (
                        <div className="flex items-center justify-center gap-4 pt-4">
                            <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                                !isAnnual ? (isLight ? 'text-slate-900' : 'text-white') : 'text-slate-400'
                            }`}>
                                Mensual
                            </span>
                            <button
                                onClick={() => setIsAnnual(!isAnnual)}
                                role="switch"
                                aria-checked={isAnnual}
                                className={`relative w-12 h-6 rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                                    isLight
                                        ? 'bg-slate-200 border-slate-300 focus-visible:ring-[#0284C7] focus-visible:ring-offset-slate-100'
                                        : 'bg-white/10 border-white/10 focus-visible:ring-[#19B5FE] focus-visible:ring-offset-[#0b0a24]'
                                }`}
                                aria-label="Alternar entre precio mensual y anual"
                            >
                                <span
                                    className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full transition-transform duration-300 ${
                                        isLight ? 'bg-[#0284C7]' : 'bg-[#19B5FE]'
                                    } ${isAnnual ? 'translate-x-6' : ''}`}
                                />
                            </button>
                            <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                                isAnnual ? (isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]') : 'text-slate-400'
                            }`}>
                                Anual
                            </span>
                        </div>
                    )}
                </div>

                {paidPlans.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                        {paidPlans.map((plan) => (
                            <PlanCard key={plan.name} plan={plan} isAnnual={isAnnual} isLight={isLight} />
                        ))}
                    </div>
                ) : (
                    /* Si los planes no cargan, la sección no puede desaparecer:
                       es el bloque que cierra la venta. Se ofrece la salida directa. */
                    <div className={`rounded-3xl border p-8 text-center max-w-xl mx-auto ${
                        isLight ? 'bg-white border-slate-200' : 'bg-[#020210] border-white/10'
                    }`}>
                        <p className={`text-sm mb-5 ${isLight ? 'text-slate-600' : 'text-[#C0C0C0]'}`}>
                            No pudimos cargar los planes en este momento. Escríbenos y te enviamos
                            el detalle de precios al instante.
                        </p>
                        <a
                            href={`${WHATSAPP_BASE}${encodeURIComponent('Hola, quiero conocer los planes y precios de Vinzer.')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                                isLight ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white' : 'bg-[#19B5FE] hover:brightness-110 text-[#020210]'
                            }`}
                        >
                            Consultar precios por WhatsApp
                        </a>
                    </div>
                )}

                {freePlan && <FreePlanBlock plan={freePlan} isLight={isLight} />}

                <p className={`text-[11px] text-center mt-8 max-w-3xl mx-auto leading-relaxed ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                }`}>
                    Las órdenes se cuentan por mes calendario. Los usuarios son cuentas creadas en tu equipo,
                    no conexiones simultáneas.
                </p>
            </div>
        </section>
    );
}

function PlanCard({ plan, isAnnual, isLight }: { plan: PublicPlan; isAnnual: boolean; isLight: boolean }) {
    const copy = PLAN_COPY[plan.name.toUpperCase()] ?? {
        category: 'Plan',
        tagline: plan.description ?? '',
        whatsapp: `Hola, quiero cotizar el Plan ${plan.name} de Vinzer.`,
    };

    const isRecommended = copy.highlight === 'recommended';
    const isTop = copy.highlight === 'top';

    // El anual solo se muestra si la BD tiene annual_price. Hoy Track no lo tiene:
    // esa tarjeta se queda en mensual en vez de inventar un precio.
    const hasAnnual = plan.annual_price != null && plan.annual_price > 0;
    const showAnnual = isAnnual && hasAnnual;

    const border = isRecommended
        ? (isLight ? 'border-[#0284C7] ring-1 ring-[#0284C7]/30' : 'border-[#19B5FE] ring-1 ring-[#19B5FE]/30')
        : isTop
            ? (isLight ? 'border-amber-400/60' : 'border-[#E0B84D]/40')
            : (isLight ? 'border-slate-200' : 'border-white/5');

    const features: Array<{ label: string; on: boolean }> = [
        { label: `${plan.max_orders} órdenes al mes`, on: true },
        { label: `${plan.max_users} ${plan.max_users === 1 ? 'usuario' : 'usuarios'} de acceso`, on: true },
        { label: 'Seguimiento público en tiempo real', on: true },
        { label: 'Catálogo de servicios y productos', on: true },
        { label: 'Módulo de operaciones y trazabilidad', on: plan.has_operations },
        { label: 'Certificados digitales personalizables', on: plan.has_certificates },
        { label: 'Exportación de reportes y datos', on: plan.can_export },
        { label: 'Widget embebible para tu sitio web', on: plan.has_widget },
    ];

    if (plan.name.toUpperCase() === 'ULTRA') {
        features.push({ label: 'Sitio web institucional incluido', on: true });
    }

    return (
        <div
            className={`relative p-5 lg:p-6 rounded-3xl flex flex-col gap-5 border transition-all duration-300 ${border} ${
                isLight ? 'bg-white shadow-sm hover:shadow-md' : 'bg-[#020210] hover:border-white/20'
            } ${isRecommended ? 'xl:-translate-y-2' : ''}`}
        >
            {isRecommended && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${
                    isLight ? 'bg-[#0284C7] text-white' : 'bg-[#19B5FE] text-[#020210]'
                }`}>
                    ★ Recomendado
                </div>
            )}
            {isTop && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${
                    isLight ? 'bg-amber-500 text-white' : 'bg-[#E0B84D] text-[#020210]'
                }`}>
                    Todo incluido
                </div>
            )}

            <div className="space-y-3">
                <div className={`text-[10px] font-bold uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {copy.category}
                </div>
                <h3 className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{plan.name}</h3>
                <p className={`text-[11px] min-h-[3.5rem] leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    {copy.tagline}
                </p>

                <div className="pt-2">
                    <div className={`text-2xl lg:text-3xl font-black tabular-nums ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        ${formatCLP(showAnnual ? plan.annual_price! : plan.price)}
                        <span className="text-[10px] font-medium text-slate-500"> CLP {showAnnual ? '/ año' : '/ mes'}</span>
                    </div>

                    {showAnnual && plan.annual_savings ? (
                        <div className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${isLight ? 'text-[#0284C7]' : 'text-[#19B5FE]'}`}>
                            Ahorras ${formatCLP(plan.annual_savings)} al año
                        </div>
                    ) : isAnnual && !hasAnnual ? (
                        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                            Solo facturación mensual
                        </div>
                    ) : hasAnnual && !isAnnual ? (
                        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                            Anual: ${formatCLP(plan.annual_price!)} CLP
                        </div>
                    ) : (
                        <div className="text-[9px] mt-1 h-[13px]" aria-hidden="true" />
                    )}
                </div>
            </div>

            <ul className={`space-y-2 border-t pt-4 text-[11px] flex-1 ${
                isLight ? 'border-slate-100 text-slate-700' : 'border-white/5 text-[#C0C0C0]'
            }`}>
                {features.map((f) => (
                    <li key={f.label} className={`flex items-start gap-2 ${f.on ? '' : 'opacity-45'}`}>
                        {f.on ? (
                            <Check size={13} className={`shrink-0 mt-0.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                        ) : (
                            <X size={13} className="shrink-0 mt-0.5 text-slate-500" />
                        )}
                        <span className={f.on ? '' : 'line-through'}>{f.label}</span>
                    </li>
                ))}
            </ul>

            <a
                href={`${WHATSAPP_BASE}${encodeURIComponent(copy.whatsapp)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-center min-h-[44px] py-3 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border flex items-center justify-center ${
                    isRecommended
                        ? isLight
                            ? 'bg-[#0284C7] border-[#0284C7] hover:bg-[#0369A1] text-white'
                            : 'bg-[#19B5FE] border-[#19B5FE] hover:brightness-110 text-[#020210]'
                        : isLight
                            ? 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                }`}
            >
                Cotizar
            </a>
        </div>
    );
}

/**
 * Plan gratuito.
 *
 * Va fuera de la grilla a propósito: mezclar un plan de $0 con los de pago
 * ancla el precio hacia abajo y desordena la comparación. Aquí funciona como
 * puerta de entrada para quien recién parte.
 */
function FreePlanBlock({ plan, isLight }: { plan: PublicPlan; isLight: boolean }) {
    const copy = PLAN_COPY.FREE;

    const highlights = [
        `${plan.max_orders} órdenes al mes`,
        `${plan.max_users} ${plan.max_users === 1 ? 'usuario' : 'usuarios'} de acceso`,
        'Seguimiento público para las familias',
        'Catálogo de servicios y productos',
    ];

    return (
        <div
            className={`mt-8 rounded-3xl border p-7 md:p-9 grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-10 items-center ${
                isLight
                    ? 'bg-white border-slate-200 shadow-sm'
                    : 'bg-[#020210] border-white/10'
            }`}
        >
            <div className="lg:col-span-7 space-y-4">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${
                    isLight
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                }`}>
                    <Gift size={12} />
                    {copy.category}
                </div>

                <h3 className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    ¿Recién partes? Prueba Vinzer gratis.
                </h3>

                <p className={`text-sm leading-relaxed max-w-xl ${isLight ? 'text-slate-600' : 'text-[#C0C0C0]'}`}>
                    {copy.tagline} Sin tarjeta, sin contrato y sin plazo: usas la plataforma completa
                    con un volumen acotado y subes de plan cuando tu operación lo pida.
                </p>

                <ul className={`grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[11px] pt-1 ${
                    isLight ? 'text-slate-700' : 'text-[#C0C0C0]'
                }`}>
                    {highlights.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                            <Check size={13} className={`shrink-0 mt-0.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-4 lg:items-end lg:text-right">
                <div>
                    <div className={`text-4xl font-black tabular-nums ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        $0
                        <span className="text-[11px] font-medium text-slate-500"> CLP / mes</span>
                    </div>
                    <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${
                        isLight ? 'text-emerald-700' : 'text-emerald-400'
                    }`}>
                        Plan {plan.name} · 100 % gratis
                    </div>
                </div>

                <a
                    href={`${WHATSAPP_BASE}${encodeURIComponent(copy.whatsapp)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2.5 min-h-[48px] w-full lg:w-auto px-7 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-[#020210] text-[11px] font-black uppercase tracking-wider transition-all shadow-lg shadow-[#25D366]/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0" aria-hidden="true">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Solicitar por WhatsApp
                </a>

                <p className={`text-[10px] leading-relaxed max-w-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    La activación se valida por WhatsApp. Escríbenos desde el número oficial
                    registrado de tu crematorio.
                </p>
            </div>
        </div>
    );
}
