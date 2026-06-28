"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Plan {
    id: number;
    name: string;
    description?: string;
    monthly_price: number;
    annual_price: number;
    features: { name: string; included: boolean }[] | any;
    is_active: boolean;
    recommended?: boolean;
    max_pets?: number;
    max_users?: number;
    max_orders?: number;
    max_services?: number;
    max_products?: number;
    max_customers?: number;
    max_partners?: number;
    allowed_modules?: string[];
}

interface PlanComparisonProps {
    plans: Plan[];
    currentPlanId: number;
    onSelectPlan: (planId: number, interval: 'monthly' | 'annual') => void;
}

export function PlanComparison({ plans, currentPlanId, onSelectPlan }: PlanComparisonProps) {
    const [isAnnual, setIsAnnual] = useState(false);

    const formatPrice = (amount: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
    }

    // Check if the user's current plan is the FREE plan
    const currentPlan = plans.find(p => p.id === currentPlanId);
    const isCurrentPlanFree = currentPlan ? currentPlan.name.toLowerCase().includes('free') : true;

    // Filter plans: hide "FREE" plan if the current plan is not FREE
    const filteredPlans = plans.filter(plan => {
        const planNameLower = plan.name.toLowerCase();
        if (!isCurrentPlanFree && planNameLower.includes('free')) {
            return false;
        }
        return true;
    });

    // Sort plans by price (approx)
    const sortedPlans = [...filteredPlans].sort((a, b) => a.monthly_price - b.monthly_price);

    return (
        <div className="w-full space-y-8 py-6">

            {/* Toggle Annual/Monthly */}
            <div className="flex items-center justify-center space-x-4">
                <span className={cn("text-sm font-medium", !isAnnual && "text-primary")}>Mensual</span>
                <Switch
                    checked={isAnnual}
                    onCheckedChange={setIsAnnual}
                />
                <span className={cn("text-sm font-medium", isAnnual && "text-primary")}>
                    Anual <span className="text-xs text-green-500 font-bold ml-1">(20% de descuento)</span>
                </span>
            </div>

            {/* Plans Grid */}
            <div className={cn(
                "grid grid-cols-1 gap-6",
                sortedPlans.length === 3 ? "md:grid-cols-3 max-w-5xl mx-auto" : "md:grid-cols-2 xl:grid-cols-4"
            )}>
                {sortedPlans.map((plan) => {
                    const planNameLower = plan.name.toLowerCase();
                    const isFree = planNameLower.includes('free');
                    const isPro = planNameLower.includes('pro');
                    const isUltra = planNameLower.includes('ultra');

                    const discount = 0.8;
                    // Definir los precios anuales totales aplicando un 20% de descuento exacto sobre el valor mensual base (mensual * 12 * 0.8)
                    const displayAnnualPrice = Math.round(plan.monthly_price * 12 * discount);

                    // El precio mensual mostrado bajo modalidad anual es el precio anual total dividido por 12
                    const price = isAnnual && plan.monthly_price > 0 ? (displayAnnualPrice / 12) : plan.monthly_price;
                    const isCurrent = plan.id === currentPlanId;
                    // Determine if the user is currently on the PRO plan
                    const currentPlanName = plans.find(p => p.id === currentPlanId)?.name.toLowerCase() || '';
                    const isUserOnPro = currentPlanName.includes('pro');
                    const isUserOnUltra = currentPlanName.includes('ultra');

                    // Special condition: User is on PRO, highlight ULTRA (upsell)
                    const isUltraUpsell = isUserOnPro && isUltra;

                    // Condition: User is on ULTRA (current), make it golden
                    const isUltraCurrent = isCurrent && isUltra;

                    // Parse features
                    let featuresList = [];
                    if (Array.isArray(plan.features)) {
                        featuresList = plan.features;
                    }

                    return (
                        <Card
                            key={plan.id}
                            className={cn(
                                "flex flex-col relative transition-all duration-300 border-2 bg-[#0a192f]/40 backdrop-blur-xl",
                                isCurrent ?
                                    (isUltraCurrent ? "border-amber-400 bg-amber-400/5 shadow-lg shadow-amber-400/10" : "border-primary bg-primary/5 shadow-lg shadow-primary/10")
                                    : "border-white/5",

                                // PRO Highlight (Specially styled to stand out premiumly)
                                isPro ? "border-blue-500/80 bg-gradient-to-b from-blue-950/20 to-[#0a192f]/60 shadow-[0_0_35px_-5px_rgba(59,130,246,0.3)] md:scale-[1.03] hover:md:scale-[1.06] z-10" : "hover:md:scale-[1.02]",

                                // Ultra Upsell Highlight (User is on Pro)
                                isUltraUpsell ? "border-amber-400 shadow-[0_0_25px_-5px_rgba(251,191,36,0.5)] scale-102 z-20 overflow-visible ring-1 ring-amber-400/50" : "",

                                isFree ? "opacity-80 grayscale-[0.5]" : ""
                            )}
                        >
                            {/* Badges */}
                            {isCurrent && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                                    <Badge className={cn(
                                        "text-[10px] text-white border-none px-3 py-0.5 shadow-lg whitespace-nowrap font-black uppercase",
                                        isUltraCurrent ? "bg-amber-500 text-black" : "bg-emerald-500"
                                    )}>Plan Actual</Badge>
                                </div>
                            )}
                            {/* Prominent Popular Badge for PRO */}
                            {isPro && !isCurrent && (
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                                    <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-[10px] text-white border-none px-4 py-1 shadow-lg shadow-blue-500/40 whitespace-nowrap font-black uppercase tracking-widest animate-pulse">
                                        ★ RECOMENDADO ★
                                    </Badge>
                                </div>
                            )}

                            {/* Golden Badge for Ultra Upsell */}
                            {isUltraUpsell && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 w-full text-center px-4">
                                    <Badge className="bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 text-black border-none px-3 py-0.5 shadow-lg shadow-amber-500/40 whitespace-nowrap font-black uppercase tracking-wider animate-shimmer bg-[length:200%_100%] text-[10px]">
                                        ★ Recomendado Para Ti ★
                                    </Badge>
                                </div>
                            )}

                            <CardHeader className="text-center pb-2 pt-8">
                                <CardTitle className={cn(
                                    "text-2xl font-black tracking-tight uppercase",
                                    isPro ? "text-blue-400" : (isUltraUpsell || isUltraCurrent) ? "text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" : "text-white"
                                )}>
                                    {plan.name}
                                </CardTitle>
                                <CardDescription className="text-[10px] h-10 line-clamp-2 mt-2 text-white/40 font-medium">
                                    {plan.description || "Potencia tu negocio con nuestras herramientas avanzadas."}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex-grow pt-4">
                                <div className="text-center mb-6">
                                    <div className="flex items-baseline justify-center gap-1 transition-all duration-300 transform">
                                        <span className={cn(
                                            "text-4xl font-black transition-colors duration-300",
                                            isAnnual ? "text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.3)]" :
                                                (isUltraUpsell || isUltraCurrent) ? "text-amber-100" : "text-white"
                                        )}>
                                            {formatPrice(price)}
                                        </span>
                                        <span className="text-white/40 text-xs font-bold">/mes</span>
                                    </div>
                                    {isAnnual && plan.monthly_price > 0 && (
                                        <p className="text-[9px] font-black text-primary/60 mt-2 uppercase tracking-[0.15em] animate-fade-in bg-primary/5 py-1 px-2 rounded-lg border border-primary/10 inline-block">
                                            FACTURADO {formatPrice(displayAnnualPrice)} ANUALMENTE
                                        </p>
                                    )}

                                    {/* +100 Cremaciones Highlight (Show on Upsell OR Current Ultra) */}
                                    {(isUltraUpsell || isUltraCurrent) && (
                                        <div className="mt-2 bg-amber-500/10 border border-amber-500/20 rounded-md py-1 px-2.5 inline-block">
                                            <span className="text-[10px] font-black text-amber-400 animate-pulse">+100 Cremaciones</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 mb-6 pt-4 border-t border-white/5">
                                    <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-4 text-center">Ventajas Disponibles</p>
                                    <ul className="space-y-2.5">
                                        {/* Standard Limits */}
                                        {plan.max_pets && plan.max_pets !== -1 && (
                                            <li className="flex items-center gap-2.5 text-white/80">
                                                <div className={cn("w-4 h-4 rounded-full flex items-center justify-center shrink-0", (isUltraUpsell || isUltraCurrent) ? "bg-amber-500/20" : "bg-emerald-500/20")}>
                                                    <Check className={cn("h-2.5 w-2.5", (isUltraUpsell || isUltraCurrent) ? "text-amber-500" : "text-emerald-500")} />
                                                </div>
                                                <span className={cn("text-[11px] font-bold", (isUltraUpsell || isUltraCurrent) ? "text-white" : "")}>Hasta {plan.max_pets} mascotas/mes</span>
                                            </li>
                                        )}
                                        {/* Dynamic Features or fallback advantages */}
                                        {(featuresList.length > 0 ? featuresList : [
                                            { name: "Soporte Técnico", included: true },
                                            { name: "Panel de Gestión", included: true },
                                            { name: "Reportes Básicos", included: true },
                                            { name: "Acceso Multi-usuario", included: planNameLower !== 'free' }
                                        ]).map((feature: any, idx: number) => (
                                            <li key={idx} className="flex items-center gap-2.5">
                                                {feature.included ? (
                                                    <>
                                                        <div className={cn("w-4 h-4 rounded-full flex items-center justify-center shrink-0", (isUltraUpsell || isUltraCurrent) ? "bg-amber-500/20" : "bg-emerald-500/20")}>
                                                            <Check className={cn("h-2.5 w-2.5", (isUltraUpsell || isUltraCurrent) ? "text-amber-500" : "text-emerald-500")} />
                                                        </div>
                                                        <span className="text-[11px] font-bold text-white/80">{feature.name}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                                            <X className="h-2.5 w-2.5 text-white/20" />
                                                        </div>
                                                        <span className="text-[11px] font-medium text-white/20 line-through decoration-white/10">{feature.name}</span>
                                                    </>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </CardContent>

                            <CardFooter className="pb-8">
                                <Button
                                    className={cn(
                                        "w-full py-6 rounded-2xl font-black transition-all active:scale-95",
                                        isCurrent ? "bg-white/5 text-white/40 border border-white/10 cursor-not-allowed" :
                                            isUltraUpsell ? "bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black shadow-lg shadow-amber-500/30 border-none" :
                                                isPro ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30" :
                                                    "bg-white/10 hover:bg-white/20 text-white"
                                    )}
                                    disabled={isCurrent || isFree}
                                    onClick={() => onSelectPlan(plan.id, isAnnual ? 'annual' : 'monthly')}
                                >
                                    {isCurrent ? "PLAN ACTUAL" : isFree ? "BLOQUEADO" : isUltraUpsell ? "ACTUALIZAR A ULTRA" : "ELEGIR PLAN"}
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>

            {/* Comparison Table */}
            <div className="mt-20 pt-10 border-t border-white/5">
                <div className="text-center mb-10">
                    <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">Comparativa Detallada</h3>
                    <p className="text-white/40 text-sm">Analiza a fondo las capacidades de cada nivel de suscripción.</p>
                </div>

                <div className="overflow-x-auto rounded-[2rem] border border-white/5 bg-[#0a192f]/20 backdrop-blur-md">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="p-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] w-1/4">Característica</th>
                                {sortedPlans.map(plan => (
                                    <th key={plan.id} className="p-6 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={cn(
                                                "text-sm font-black uppercase tracking-tight",
                                                plan.id === currentPlanId ? "text-emerald-400" :
                                                    plan.name.toLowerCase().includes('pro') ? "text-blue-400" : "text-white"
                                            )}>
                                                {plan.name}
                                            </span>
                                            {plan.id === currentPlanId && <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full">ACTUAL</span>}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {[
                                { label: "Inversión Mensual", key: "monthly_price", format: (v: any) => formatPrice(v) },
                                { label: "Mascotas", key: "max_pets", format: (v: any) => v >= 999999 ? "Ilimitadas" : v },
                                { label: "Usuarios", key: "max_users", format: (v: any) => v >= 999999 ? "Ilimitados" : v },
                                { label: "Órdenes / Ventas", key: "max_orders", format: (v: any) => v >= 999999 ? "Ilimitadas" : v },
                                { label: "Clientes", key: "max_customers", format: (v: any) => v >= 999999 ? "Ilimitados" : v },
                                { label: "Productos", key: "max_products", format: (v: any) => v >= 999999 ? "Ilimitados" : v },
                                { label: "Módulo Clientes", module: "clientes" },
                                { label: "Módulo Mascotas", module: "mascotas" },
                                { label: "Gestión de Servicios", module: "servicios" },
                                { label: "Ventas y Recaudación", module: "ordenes" },
                                { label: "Catálogo de Productos", module: "productos" },
                                { label: "Gestión de Inventario", module: "inventario" },
                                { label: "Certificados Digitales", module: "certificados" },
                                { label: "Control de Pagos / Caja", module: "pagos" },
                                { label: "Veterinarias y Convenios", module: "veterinarios" },
                                { label: "Logística y Operaciones", module: "operaciones" },
                                { label: "Soporte Prioritario", custom: true, values: sortedPlans.map(p => p.name.toLowerCase().includes('pro') || p.name.toLowerCase().includes('ultra')) },
                            ].map((row, idx) => (
                                <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                    <td className="p-6 font-bold text-white/60 text-xs">{row.label}</td>
                                    {sortedPlans.map(plan => (
                                        <td key={plan.id} className="p-6 text-center">
                                            {row.module ? (
                                                <div className="flex justify-center">
                                                    {plan.allowed_modules?.includes(row.module) ? (
                                                        <Check className="h-4 w-4 text-emerald-500" />
                                                    ) : (
                                                        <X className="h-4 w-4 text-white/10" />
                                                    )}
                                                </div>
                                            ) : row.custom ? (
                                                <div className="flex justify-center">
                                                    {(row.values as any)[sortedPlans.indexOf(plan)] ? (
                                                        <Check className="h-4 w-4 text-emerald-500" />
                                                    ) : (
                                                        <X className="h-4 w-4 text-white/10" />
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="font-black text-white/80">
                                                    {(row.format ? row.format((plan as any)[row.key!]) : (plan as any)[row.key!])}
                                                </span>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
