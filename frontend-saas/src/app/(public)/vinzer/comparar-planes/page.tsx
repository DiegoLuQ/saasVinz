import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Check, Minus, Star } from 'lucide-react';
import { VinzerLogo } from '@/components/vinzer/VinzerLogo';
import { fetchPlanHighlights, fetchPublicPlans, type PlanHighlight, type PublicPlan } from '@/lib/api/plans';
import { planCta, VINZER_WHATSAPP, type PlanCtaKind } from '@/lib/vinzer/planCta';
import { ComparePlansScroller } from '@/components/vinzer/ComparePlansScroller';

export const metadata: Metadata = {
    title: 'Comparar Planes | Vinzer',
    description: 'Compara detalladamente las características de los planes Free, Track, Normal, Pro y Ultra de Vinzer. Elige la mejor opción para modernizar tu crematorio.',
    robots: {
        index: true,
        follow: true,
    }
};

const WHATSAPP_BASE = VINZER_WHATSAPP;

const CTA_CLASS: Record<PlanCtaKind, string> = {
    free: 'bg-emerald-500 hover:bg-emerald-400 text-[#020210]',
    self: 'bg-white hover:bg-slate-200 text-[#020210]',
    recommended: 'bg-[#19B5FE] hover:bg-[#19B5FE]/90 text-[#020210] shadow-md shadow-[#19B5FE]/20',
    sales: 'bg-[#E0B84D]/10 border border-[#E0B84D]/40 hover:bg-[#E0B84D] hover:text-[#020210] text-[#E0B84D]',
};

/** Mismo orden que las tarjetas de la landing; FREE va primero en la tabla. */
const PLAN_ORDER = ['FREE', 'TRACK', 'NORMAL', 'PRO', 'ULTRA'];

const formatCLP = (value: number) => new Intl.NumberFormat('es-CL').format(Math.round(value));

type Cell = string | boolean;
interface Row { name: string; description?: string; cells: Cell[] }
interface Section { category: string; rows: Row[] }

async function fetchAnnualDiscount(): Promise<{ pct: number; launch: boolean } | null> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const r = await fetch(`${baseUrl}/api/public/plans/annual-discount`, { next: { revalidate: 300, tags: ['public-plans'] } });
        return r.ok ? await r.json() : null;
    } catch {
        return null;
    }
}

/**
 * Tabla comparativa completa. Precios, topes y funciones salen de la base:
 * las funciones son las marcadas en Admin → Planes → «Funciones en la web», y
 * qué plan tiene cada una se calcula de sus módulos y características.
 */
export default async function CompararPlanesPage() {
    const [rawPlans, highlights, discount] = await Promise.all([fetchPublicPlans(), fetchPlanHighlights(), fetchAnnualDiscount()]);
    const plans: PublicPlan[] = [...(rawPlans ?? [])].sort((a, b) => {
        const ia = PLAN_ORDER.indexOf(a.name.toUpperCase());
        const ib = PLAN_ORDER.indexOf(b.name.toUpperCase());
        if (ia === -1 && ib === -1) return a.price - b.price;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });
    const pct = discount?.pct ?? 0;

    // Créditos IA: precio del crédito adicional por plan (CLP con el tipo de cambio fijo).
    const creditPrices = plans.map((p) => p.ai_extra_credit_clp ?? 0).filter((v) => v > 0);
    const maxCredit = Math.max(0, ...creditPrices);
    const minCredit = creditPrices.length ? Math.min(...creditPrices) : 0;
    const usesAi = (p: PublicPlan) => (p.ai_monthly_credits ?? 0) > 0 || !!p.offers?.includes('certificados:redes');

    const sections: Section[] = [
        {
            category: 'Precios y facturación',
            rows: [
                { name: 'Precio mensual', description: 'Valor mensual en pesos chilenos (CLP)', cells: plans.map((p) => (p.price > 0 ? `$${formatCLP(p.price)} / mes` : 'Gratis')) },
                {
                    name: 'Pago anual',
                    description: pct > 0 ? `Pagando el año completo tienes ${pct} % de descuento` : 'Valor del año completo',
                    cells: plans.map((p) => (p.price > 0 && p.annual_price ? `$${formatCLP(p.annual_price)} / año` : p.price > 0 ? 'Solo mensual' : 'No aplica')),
                },
                { name: 'Permanencia mínima', description: 'Compromiso de permanencia', cells: plans.map(() => 'Sin contrato') },
            ],
        },
        {
            category: 'Volumen y capacidad',
            rows: [
                { name: 'Órdenes de cremación al mes', description: 'Órdenes que puedes ingresar por mes calendario', cells: plans.map((p) => `${p.max_orders} / mes`) },
                { name: 'Usuarios incluidos', description: 'Cuentas para tu equipo', cells: plans.map((p) => `${p.max_users} ${p.max_users === 1 ? 'usuario' : 'usuarios'}`) },
                {
                    name: 'Créditos de homenaje IA incluidos',
                    description: '1 crédito = 1 diseño con IA para una mascota. Se renuevan cada mes.',
                    cells: plans.map((p) => {
                        const n = p.ai_monthly_credits ?? 0;
                        return n > 0 ? `${n} créditos / mes · hasta ${n} ${n === 1 ? 'mascota' : 'mascotas'}` : 'No incluye';
                    }),
                },
                {
                    name: 'Valor crédito adicional (recarga)',
                    description: 'Precio por crédito extra, en pesos chilenos. No vence.',
                    cells: plans.map((p) => {
                        const clp = p.ai_extra_credit_clp ?? 0;
                        if (!clp) return false;
                        const tier = creditPrices.length > 1 && clp === minCredit ? ' · tarifa mayorista'
                            : clp < maxCredit ? ' · tarifa preferencial' : '';
                        return `$${formatCLP(clp)} CLP c/u${tier}`;
                    }),
                },
                {
                    name: 'Intentos por diseño',
                    description: 'Cada crédito permite volver a generar el diseño',
                    cells: plans.map((p) => (usesAi(p) ? `Hasta ${p.ai_attempts_per_credit ?? 3} intentos por plantilla` : false)),
                },
            ],
        },
        ...groupHighlights(highlights ?? []).map(([group, items]) => ({
            category: group,
            rows: items.map((h) => ({ name: h.label, description: h.description || undefined, cells: plans.map((p) => !!p.offers?.includes(h.key)) })),
        })),
    ];

    const highlightCol = plans.findIndex((p) => p.name.toUpperCase() === 'PRO');

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
                    <VinzerLogo size="md" />
                </Link>
                <Link
                    href="/#planes"
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-[#FFFFFF] transition-colors"
                >
                    <ArrowLeft size={14} /> Volver a los planes
                </Link>
            </header>

            <main className="relative z-10 max-w-7xl mx-auto px-6 mt-12 md:mt-20">
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E0B84D]/10 border border-[#E0B84D]/20 rounded-full">
                        <Star size={12} className="text-[#E0B84D]" />
                        <span className="text-[10px] font-bold text-[#E0B84D] uppercase tracking-widest">Comparativa Completa</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-heading font-bold text-[#FFFFFF] leading-tight">
                        Encuentra el plan perfecto para tu crematorio.
                    </h1>
                    <p className="text-slate-400 font-medium">
                        Conoce las diferencias y límites detallados de cada plan. Sin sorpresas, transparencia absoluta.
                    </p>
                    {pct > 0 && discount?.launch && (
                        <p className="text-xs font-semibold text-emerald-300">
                            Precio de lanzamiento: {pct} % de descuento pagando anual, para siempre mientras sigas con tu plan anual.
                        </p>
                    )}
                </div>

                {plans.length === 0 ? (
                    <div className="rounded-3xl border border-white/10 bg-[#0b0a24]/60 p-10 text-center text-sm text-slate-300">
                        No pudimos cargar los planes en este momento.{' '}
                        <a href={`${WHATSAPP_BASE}${encodeURIComponent('Hola, quiero conocer los planes y precios de Vinzer.')}`} target="_blank" rel="noopener noreferrer" className="text-[#19B5FE] font-bold underline">
                            Escríbenos por WhatsApp
                        </a>.
                    </div>
                ) : (
                    <>
                        {/* Hint de scroll: en móvil la tabla excede el viewport */}
                        <div className="xl:hidden flex items-center justify-center gap-2 mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Desliza para comparar los {plans.length} planes · PRO al centro
                            <ArrowLeft size={12} className="rotate-180" />
                        </div>

                        <ComparePlansScroller className="w-full border border-white/10 rounded-3xl bg-[#0b0a24]/60 backdrop-blur-md shadow-2xl">
                            <table className="w-full min-w-[900px] border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-white/10 bg-[#020210]/80">
                                        <th className="p-6 text-xs font-bold uppercase tracking-wider text-slate-400 w-1/4 min-w-[150px] sticky left-0 z-20 bg-[#020210]">Característica</th>
                                        {plans.map((p, i) => {
                                            const hl = i === highlightCol;
                                            return (
                                                <th key={p.name} {...(hl ? { 'data-highlight-col': '' } : {})}
                                                    className={`p-6 text-center relative snap-center ${hl ? 'bg-[#19B5FE]/5 border-x border-white/10' : ''}`}>
                                                    {hl && <div className="absolute top-0 inset-x-0 h-1 bg-[#19B5FE]" />}
                                                    <div className="space-y-1">
                                                        {hl && <span className="text-[9px] font-bold text-[#19B5FE] uppercase tracking-widest">Recomendado</span>}
                                                        <h3 className="text-sm font-bold text-[#FFFFFF] uppercase">{p.name}</h3>
                                                        <p className={`text-[10px] font-bold ${hl ? 'text-[#19B5FE]' : 'text-slate-300'}`}>
                                                            {p.price > 0 ? `$${formatCLP(p.price)} CLP / mes` : '$0 CLP / mes'}
                                                        </p>
                                                        {(() => {
                                                            const cta = planCta(p.name, p.price);
                                                            return (
                                                                <a
                                                                    href={cta.href}
                                                                    {...(cta.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                                                                    className={`inline-block mt-3 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${CTA_CLASS[cta.kind]}`}
                                                                >
                                                                    {cta.label}
                                                                </a>
                                                            );
                                                        })()}
                                                    </div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>

                                <tbody>
                                    {sections.map((section) => (
                                        <React.Fragment key={section.category}>
                                            <tr className="bg-[#020210]/40 border-b border-white/5">
                                                <td colSpan={plans.length + 1} className="p-4 px-6 text-xs font-black uppercase tracking-widest text-[#E0B84D] bg-white/5">
                                                    <div className="sticky left-6 w-max">{section.category}</div>
                                                </td>
                                            </tr>
                                            {section.rows.map((row) => (
                                                <tr key={row.name} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                                    <td className="p-5 px-6 align-top sticky left-0 z-10 bg-[#0b0a24]">
                                                        <div className="font-bold text-xs text-[#FFFFFF]">{row.name}</div>
                                                        {row.description && (
                                                            <div className="hidden md:block text-[10px] text-slate-400 mt-1 leading-normal max-w-xs">{row.description}</div>
                                                        )}
                                                    </td>
                                                    {row.cells.map((cell, i) => (
                                                        <td key={i} className={`p-5 text-center text-xs align-middle ${i === highlightCol ? 'bg-[#19B5FE]/[0.02] border-x border-white/5' : ''}`}>
                                                            {renderCell(cell, i === highlightCol)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </ComparePlansScroller>
                    </>
                )}

                <div className="mt-16 bg-[#0b0a24] border border-white/10 rounded-[2rem] p-8 md:p-12 text-center max-w-4xl mx-auto space-y-6">
                    <h3 className="text-xl md:text-2xl font-black text-[#FFFFFF]">¿Tienes alguna duda sobre qué plan necesitas?</h3>
                    <p className="text-xs md:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        Si tu crematorio tiene necesidades especiales, requiere más usuarios o mayor cupo mensual, podemos crear una cotización personalizada adaptada a tu escala.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4 pt-2">
                        <a
                            href={`${WHATSAPP_BASE}${encodeURIComponent('Hola, quiero hablar con un asesor sobre los planes de Vinzer.')}`}
                            target="_blank"
                            rel="noopener noreferrer"
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

/** Agrupa las funciones por su grupo, respetando el orden configurado. */
function groupHighlights(items: PlanHighlight[]): [string, PlanHighlight[]][] {
    const groups = new Map<string, PlanHighlight[]>();
    for (const h of items) {
        const list = groups.get(h.group) ?? [];
        list.push(h);
        groups.set(h.group, list);
    }
    return [...groups.entries()];
}

function renderCell(val: Cell, isHighlighted = false) {
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
