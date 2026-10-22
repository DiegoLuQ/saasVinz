"use client";

import React, { useState } from 'react';
import { Check, Minus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Plan {
    id: number;
    name: string;
    description?: string;
    monthly_price: number;
    annual_price: number; // puede venir null (plan sin pago anual, ej. Track)
    features?: unknown;
    is_active: boolean;
    recommended?: boolean;
    max_pets?: number;
    max_users?: number;
    max_orders?: number;
    max_services?: number;
    max_products?: number;
    max_customers?: number;
    max_partners?: number;
    can_export?: boolean;
    ai_monthly_credits?: number;
    allowed_modules?: string[];
}

interface PlanComparisonProps {
    plans: Plan[];
    currentPlanId: number;
    onSelectPlan: (planId: number, interval: 'monthly' | 'annual') => void;
    /** El SuperAdmin marca el descuento anual como precio de lanzamiento. */
    launchPromo?: boolean;
}

// Integraciones: casilla del plan ("Configurar Características"); si el plan no la tiene
// guardada, la regla anterior por nombre. Espejo de backend/app/services/plan_features.py.
const NAME_FALLBACK: Record<string, string[]> = {
    'integraciones:widget': ['PRO', 'ULTRA'],
    'integraciones:formulario_incrustable': ['ULTRA'],
    'integraciones:video_bienvenida': ['PRO', 'ULTRA'],
};
const planHas = (p: { name: string; features?: unknown }, key: string) => {
    const v = (p.features as Record<string, unknown> | undefined)?.[key];
    return typeof v === 'boolean' ? v : (NAME_FALLBACK[key] ?? []).includes(p.name.trim().toUpperCase());
};

const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);

const planKey = (p: Plan) => p.name.trim().toUpperCase();
const isFreePlan = (p: Plan) => planKey(p) === 'FREE' || p.monthly_price <= 0;
const hasAnnual = (p: Plan) => !!p.annual_price && p.annual_price > 0 && p.monthly_price > 0;
/** Ahorro del pago anual frente a 12 meses (redondeado), o 0. */
const annualSaving = (p: Plan) =>
    hasAnnual(p) ? Math.max(0, Math.round((1 - p.annual_price! / (p.monthly_price * 12)) * 100)) : 0;
const hasModule = (p: Plan, m: string) => !!p.allowed_modules?.includes(m);
const num = (v: number | undefined) => (v && v >= 999999 ? 'Ilimitado' : (v ?? 0).toLocaleString('es-CL'));

type Row =
    | { label: string; value: (p: Plan) => string | null }
    | { label: string; check: (p: Plan) => boolean };

const LIMIT_ROWS: Row[] = [
    { label: 'Cremaciones al mes', value: p => num(p.max_orders) },
    { label: 'Mascotas al mes', value: p => num(p.max_pets) },
    { label: 'Clientes', value: p => num(p.max_customers) },
    { label: 'Usuarios', value: p => num(p.max_users) },
    { label: 'Convenios veterinarios', value: p => (p.max_partners ? num(p.max_partners) : null) },
    { label: 'Productos', value: p => num(p.max_products) },
    { label: 'Servicios', value: p => num(p.max_services) },
    { label: 'Créditos IA al mes', value: p => (p.ai_monthly_credits ? String(p.ai_monthly_credits) : null) },
];

const FEATURE_ROWS: Row[] = [
    { label: 'Órdenes y seguimiento público', check: p => hasModule(p, 'operaciones') },
    { label: 'Pagos y caja', check: p => hasModule(p, 'pagos') },
    { label: 'Inventario', check: p => hasModule(p, 'inventario') },
    { label: 'Certificados digitales', check: p => hasModule(p, 'certificados') },
    { label: 'Configuración avanzada', check: p => hasModule(p, 'configuracion') },
    { label: 'Veterinarias y comisiones', check: p => hasModule(p, 'veterinarios') && !!p.max_partners },
    { label: 'Exportar datos', check: p => !!p.can_export },
    { label: 'Widget para tu sitio web', check: p => planHas(p, 'integraciones:widget') },
    { label: 'Video de bienvenida', check: p => planHas(p, 'integraciones:video_bienvenida') },
    { label: 'Formulario incrustable', check: p => planHas(p, 'integraciones:formulario_incrustable') },
];

/** Lo que se destaca en la tarjeta: topes principales + funciones incluidas. */
function cardHighlights(p: Plan): string[] {
    const out = [
        `${num(p.max_orders)} cremaciones al mes`,
        `${num(p.max_customers)} clientes · ${num(p.max_users)} usuarios`,
    ];
    if (p.max_partners) out.push(`${num(p.max_partners)} convenios veterinarios`);
    if (p.ai_monthly_credits) out.push(`${p.ai_monthly_credits} créditos IA al mes`);
    for (const row of FEATURE_ROWS) {
        if ('check' in row && row.check(p)) out.push(row.label);
    }
    return out;
}

export function PlanComparison({ plans, currentPlanId, onSelectPlan, launchPromo = false }: PlanComparisonProps) {
    const [isAnnual, setIsAnnual] = useState(false);

    const currentPlan = plans.find(p => p.id === currentPlanId);
    const onFree = currentPlan ? isFreePlan(currentPlan) : true;
    // FREE solo se muestra a quien todavía está en FREE.
    const sortedPlans = plans
        .filter(p => onFree || !isFreePlan(p) || p.id === currentPlanId)
        .sort((a, b) => a.monthly_price - b.monthly_price);
    const savings = sortedPlans.filter(hasAnnual).map(annualSaving);
    const maxSaving = Math.max(0, ...savings);
    // Mismo descuento en todos los planes = precio de lanzamiento (no "hasta").
    const sameSaving = savings.length > 0 && savings.every(v => v === maxSaving);
    const recommendedId = sortedPlans.find(p => planKey(p) === 'PRO')?.id;

    return (
        <div className="@container w-full space-y-10">
            {/* Mensual / Anual */}
            <div className="flex justify-center">
                <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200 dark:bg-white/5 dark:border-white/10" role="tablist" aria-label="Ciclo de pago">
                    {([[false, 'Mensual'], [true, 'Anual']] as const).map(([annual, label]) => (
                        <button
                            key={label}
                            type="button"
                            role="tab"
                            aria-selected={isAnnual === annual}
                            onClick={() => setIsAnnual(annual)}
                            className={cn(
                                'px-5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2',
                                isAnnual === annual
                                    ? 'bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white'
                                    : 'text-slate-500 hover:text-slate-800 dark:text-white/50 dark:hover:text-white'
                            )}
                        >
                            {label}
                            {annual && maxSaving > 0 && (
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                                    {sameSaving ? '' : 'hasta '}−{maxSaving}%
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {launchPromo && maxSaving > 0 && <LaunchNotice saving={maxSaving} same={sameSaving} />}

            {/* Tarjetas */}
            <div className={cn('grid grid-cols-1 gap-5 @xl:grid-cols-2', sortedPlans.length >= 4 ? '@6xl:grid-cols-4' : '@4xl:grid-cols-3')}>
                {sortedPlans.map(plan => {
                    const isCurrent = plan.id === currentPlanId;
                    const isRecommended = plan.id === recommendedId && !isCurrent;
                    const free = isFreePlan(plan);
                    const annualAvailable = hasAnnual(plan);
                    const showAnnual = isAnnual && annualAvailable;
                    const saving = annualSaving(plan);
                    const perMonth = showAnnual ? plan.annual_price! / 12 : plan.monthly_price;

                    return (
                        <div
                            key={plan.id}
                            className={cn(
                                'relative flex flex-col rounded-3xl border-2 p-6 transition-shadow',
                                isCurrent
                                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-500/[0.06]'
                                    : isRecommended
                                        ? 'border-primary bg-white shadow-lg shadow-primary/10 dark:bg-white/[0.04]'
                                        : 'border-slate-200 bg-white hover:shadow-md dark:border-white/10 dark:bg-white/[0.02]'
                            )}
                        >
                            {(isCurrent || isRecommended) && (
                                <span className={cn(
                                    'absolute -top-3 left-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm',
                                    isCurrent ? 'bg-emerald-500 text-white' : 'bg-primary text-primary-foreground'
                                )}>
                                    {isCurrent ? 'Tu plan actual' : 'Recomendado'}
                                </span>
                            )}

                            <div className="min-h-[4.5rem]">
                                <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">{plan.name}</h4>
                                {plan.description && (
                                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-white/50">{plan.description}</p>
                                )}
                            </div>

                            <div className="mt-4 pb-5 border-b border-slate-200 dark:border-white/10">
                                <div className="flex items-baseline gap-1 flex-wrap">
                                    <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                                        {free ? 'Gratis' : formatPrice(perMonth)}
                                    </span>
                                    {!free && <span className="text-sm font-semibold text-slate-500 dark:text-white/40">/mes</span>}
                                </div>
                                <p className="mt-1 min-h-[1.25rem] text-xs text-slate-600 dark:text-white/50">
                                    {free ? 'Para empezar' : showAnnual ? (
                                        <>
                                            {formatPrice(plan.annual_price!)} al año
                                            {saving > 0 && <span className="ml-1.5 font-bold text-emerald-700 dark:text-emerald-400">Ahorras {saving}%{launchPromo ? ' · precio de lanzamiento' : ''}</span>}
                                        </>
                                    ) : isAnnual && !annualAvailable ? 'Solo pago mensual' : 'Pago mensual'}
                                </p>
                            </div>

                            <ul className="mt-5 space-y-2.5 flex-1">
                                {cardHighlights(plan).map(item => (
                                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-white/80">
                                        <span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center shrink-0">
                                            <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
                                        </span>
                                        <span className="leading-snug">{item}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                type="button"
                                disabled={isCurrent || free}
                                onClick={() => onSelectPlan(plan.id, showAnnual ? 'annual' : 'monthly')}
                                className={cn(
                                    'mt-6 w-full py-3 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:cursor-not-allowed',
                                    isCurrent || free
                                        ? 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-white/40'
                                        : isRecommended
                                            ? 'bg-primary text-primary-foreground hover:opacity-90 shadow-md shadow-primary/20'
                                            : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/20'
                                )}
                            >
                                {isCurrent ? 'Plan actual' : free ? 'No disponible' : `Elegir ${plan.name}${showAnnual ? ' anual' : ''}`}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Comparativa */}
            <div>
                <div className="mb-4">
                    <h4 className="text-lg font-black text-slate-900 dark:text-white">Comparativa detallada</h4>
                    <p className="text-sm text-slate-600 dark:text-white/50">Topes y funciones de cada plan.</p>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.02]">
                    <table className="w-full min-w-[560px] text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-white/10">
                                <th className="sticky left-0 z-10 bg-white dark:bg-[#121826] p-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
                                    Plan
                                </th>
                                {sortedPlans.map(plan => (
                                    <th
                                        key={plan.id}
                                        className={cn(
                                            'p-4 text-center min-w-[110px]',
                                            plan.id === currentPlanId && 'bg-emerald-50 dark:bg-emerald-500/[0.08]'
                                        )}
                                    >
                                        <span className="block font-black uppercase text-slate-900 dark:text-white">{plan.name}</span>
                                        {plan.id === currentPlanId && (
                                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Actual</span>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <SectionRow label="Precio" span={sortedPlans.length} />
                            <tr className="border-b border-slate-100 dark:border-white/5">
                                <RowLabel>Mensual</RowLabel>
                                {sortedPlans.map(p => (
                                    <Cell key={p.id} current={p.id === currentPlanId}>
                                        <span className="font-bold text-slate-900 dark:text-white">{isFreePlan(p) ? 'Gratis' : formatPrice(p.monthly_price)}</span>
                                    </Cell>
                                ))}
                            </tr>
                            <tr className="border-b border-slate-100 dark:border-white/5">
                                <RowLabel>
                                    Anual
                                    {maxSaving > 0 && (
                                        <span className="block text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                                            {sameSaving ? `${maxSaving}% dcto.` : 'Con descuento'}{launchPromo ? ' · lanzamiento' : ''}
                                        </span>
                                    )}
                                </RowLabel>
                                {sortedPlans.map(p => (
                                    <Cell key={p.id} current={p.id === currentPlanId}>
                                        {hasAnnual(p) ? (
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {formatPrice(p.annual_price!)}
                                                {annualSaving(p) > 0 && <span className="block text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">−{annualSaving(p)}%</span>}
                                            </span>
                                        ) : <Dash />}
                                    </Cell>
                                ))}
                            </tr>

                            <SectionRow label="Límites" span={sortedPlans.length} />
                            {LIMIT_ROWS.map(row => (
                                <tr key={row.label} className="border-b border-slate-100 dark:border-white/5">
                                    <RowLabel>{row.label}</RowLabel>
                                    {sortedPlans.map(p => {
                                        const v = 'value' in row ? row.value(p) : null;
                                        return (
                                            <Cell key={p.id} current={p.id === currentPlanId}>
                                                {v ? <span className="font-semibold text-slate-800 dark:text-white/90">{v}</span> : <Dash />}
                                            </Cell>
                                        );
                                    })}
                                </tr>
                            ))}

                            <SectionRow label="Funciones" span={sortedPlans.length} />
                            {FEATURE_ROWS.map(row => (
                                <tr key={row.label} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                                    <RowLabel>{row.label}</RowLabel>
                                    {sortedPlans.map(p => (
                                        <Cell key={p.id} current={p.id === currentPlanId}>
                                            {'check' in row && row.check(p)
                                                ? <Check className="inline h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
                                                : <Dash />}
                                        </Cell>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/40">
                    <Sparkles size={12} /> Los créditos IA mensuales no se acumulan; puedes comprar créditos extra en «Compra de créditos».
                </p>
            </div>
        </div>
    );
}

/** Precio anual de lanzamiento, válido para los primeros crematorios que se suscriban. */
function LaunchNotice({ saving, same }: { saving: number; same: boolean }) {
    return (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/25 dark:bg-emerald-500/[0.07]">
            <span className="shrink-0 w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <Sparkles size={16} />
            </span>
            <div>
                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                    Precio de lanzamiento: {same ? '' : 'hasta '}{saving}% de descuento pagando anual{same ? ' en todos los planes' : ''}
                </p>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-300/70 mt-0.5">
                    Beneficio exclusivo para los primeros crematorios que se suscriban. Al contratar el plan anual, mantienes este precio para siempre mientras sigas con tu plan anual.
                </p>
            </div>
        </div>
    );
}

function SectionRow({ label, span }: { label: string; span: number }) {
    return (
        <tr className="bg-slate-50 dark:bg-white/[0.03]">
            <td colSpan={span + 1} className="px-4 py-2 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-white/40">
                {label}
            </td>
        </tr>
    );
}

function RowLabel({ children }: { children: React.ReactNode }) {
    return (
        <td className="sticky left-0 z-10 bg-white dark:bg-[#121826] px-4 py-3 text-left text-[13px] font-medium text-slate-700 dark:text-white/70">
            {children}
        </td>
    );
}

function Cell({ current, children }: { current: boolean; children: React.ReactNode }) {
    return (
        <td className={cn('px-4 py-3 text-center', current && 'bg-emerald-50/70 dark:bg-emerald-500/[0.06]')}>
            {children}
        </td>
    );
}

function Dash() {
    return <Minus className="inline h-4 w-4 text-slate-300 dark:text-white/15" aria-label="No incluido" />;
}
