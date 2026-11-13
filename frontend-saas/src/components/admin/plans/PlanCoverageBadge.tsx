"use client";

import React, { useMemo } from 'react';
import { Layers } from 'lucide-react';
import {
    FEATURES_REGISTRY,
    PLAN_EXEMPT_MODULES,
    buildDraftFromPlan,
    getAllFeatureKeys,
} from './ManageFeaturesModal';
import type { PlanData } from './PlanCard';
import type { PlanModuleDef } from './PlanModuleToggle';

export interface PlanCoverageStats {
    pct: number;
    activeModules: number;
    totalModules: number;
    activeFeatures: number;
    totalFeatures: number;
    trialCount: number;
}

export function computePlanCoverage(
    plan: Pick<PlanData, 'name' | 'code' | 'allowed_modules' | 'features'>,
    allModules: PlanModuleDef[],
): PlanCoverageStats {
    const code = (plan.code || plan.name || '').trim().toUpperCase();
    const allowedSet = new Set([...(plan.allowed_modules || []), ...PLAN_EXEMPT_MODULES]);

    const totalModules = allModules.length;
    const activeModules = allModules.filter((m) => allowedSet.has(m.key)).length;

    const allFeatKeys = getAllFeatureKeys();
    const totalFeatures = allFeatKeys.length;
    const resolvedFeatures = buildDraftFromPlan(
        (plan.features || {}) as Record<string, boolean>,
        plan.allowed_modules || [],
        code,
    );
    const activeFeatures = allFeatKeys.filter((k) => resolvedFeatures[k]).length;

    // Porcentaje ponderado: 50% peso módulos principales + 50% peso secciones/permisos granulares
    const modRatio = totalModules > 0 ? activeModules / totalModules : 0;
    const featRatio = totalFeatures > 0 ? activeFeatures / totalFeatures : 0;
    const pct = Math.round((modRatio * 0.5 + featRatio * 0.5) * 100);

    // Contar cuántos módulos o características activas tienen tiempo de vida (trial)
    const rawTrials = ((plan.features as Record<string, any>)?.__trials__ || {}) as Record<string, any>;
    let trialCount = 0;
    for (const [k, rule] of Object.entries(rawTrials)) {
        if (!rule || typeof rule !== 'object' || !rule.mode) continue;
        if (k.startsWith('module:')) {
            const modKey = k.slice('module:'.length);
            if (allowedSet.has(modKey)) trialCount++;
        } else if (resolvedFeatures[k]) {
            trialCount++;
        }
    }

    return {
        pct,
        activeModules,
        totalModules,
        activeFeatures,
        totalFeatures,
        trialCount,
    };
}

interface PlanCoverageBadgeProps {
    plan: Pick<PlanData, 'name' | 'code' | 'allowed_modules' | 'features'>;
    allModules: PlanModuleDef[];
    compact?: boolean;
}

export default function PlanCoverageBadge({ plan, allModules, compact = false }: PlanCoverageBadgeProps) {
    const stats = useMemo(() => computePlanCoverage(plan, allModules), [plan, allModules]);

    const colorConfig = useMemo(() => {
        if (stats.pct >= 85) {
            return {
                bar: 'from-emerald-500 to-teal-400',
                badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                text: 'text-emerald-400',
            };
        }
        if (stats.pct >= 50) {
            return {
                bar: 'from-sky-500 to-blue-400',
                badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
                text: 'text-sky-400',
            };
        }
        return {
            bar: 'from-amber-500 to-orange-400',
            badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
            text: 'text-amber-400',
        };
    }, [stats.pct]);

    if (compact) {
        return (
            <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1">
                        <Layers size={11} className={colorConfig.text} />
                        Cobertura
                    </span>
                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${colorConfig.badge}`}>
                        {stats.pct}%
                    </span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className={`h-full bg-gradient-to-r ${colorConfig.bar} transition-all duration-300 rounded-full`}
                        style={{ width: `${stats.pct}%` }}
                    />
                </div>
                <div className="flex items-center justify-between text-[10px] text-white/45 font-medium">
                    <span>{stats.activeModules}/{stats.totalModules} mód.</span>
                    <span>{stats.activeFeatures}/{stats.totalFeatures} perm.</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Layers size={14} className={colorConfig.text} />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                        Módulos y Secciones Adquiridas
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {stats.trialCount > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">
                            ⏱️ {stats.trialCount} temporal{stats.trialCount === 1 ? '' : 'es'}
                        </span>
                    )}
                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${colorConfig.badge}`}>
                        {stats.pct}% del sistema
                    </span>
                </div>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                    className={`h-full bg-gradient-to-r ${colorConfig.bar} transition-all duration-300 rounded-full`}
                    style={{ width: `${stats.pct}%` }}
                />
            </div>
            <div className="flex items-center justify-between text-[11px] text-white/40 font-medium">
                <span>
                    <strong className="text-white/80">{stats.activeModules}</strong> de {stats.totalModules} módulos activos
                </span>
                <span>
                    <strong className="text-white/80">{stats.activeFeatures}</strong> de {stats.totalFeatures} permisos habilitados
                </span>
            </div>
        </div>
    );
}

