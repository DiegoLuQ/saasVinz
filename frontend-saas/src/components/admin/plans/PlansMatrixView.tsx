"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Check,
    ChevronDown,
    ChevronRight,
    Clock,
    Filter,
    Layers,
    Loader2,
    RotateCcw,
    Save,
    Search,
    Shield,
    Sparkles,
    X,
} from 'lucide-react';
import { getPlanTheme } from '@/lib/admin/planTheme';
import {
    FEATURES_REGISTRY,
    PLAN_EXEMPT_MODULES,
    buildDraftFromPlan,
} from './ManageFeaturesModal';
import type { PlanData } from './PlanCard';
import type { PlanModuleDef } from './PlanModuleToggle';
import PlanCoverageBadge from './PlanCoverageBadge';
import FeatureTrialModal, {
    type TrialRule,
    formatTrialBadge,
    formatTrialTooltip,
} from './FeatureTrialPopover';

interface PlansMatrixViewProps {
    plans: PlanData[];
    allModules: PlanModuleDef[];
    onSavePlan: (plan: PlanData) => Promise<void> | void;
}

type FilterMode = 'all' | 'diff' | 'trials';

interface ActiveTrialModalState {
    planId: number;
    planName: string;
    trialKey: string;
    itemLabel: string;
    itemType: 'module' | 'feature';
    currentRule: TrialRule | null;
    inheritedRule: TrialRule | null;
}

export default function PlansMatrixView({
    plans,
    allModules,
    onSavePlan,
}: PlansMatrixViewProps) {
    const [showInactive, setShowInactive] = useState(false);
    const [search, setSearch] = useState('');
    const [filterMode, setFilterMode] = useState<FilterMode>('all');
    const [autoSave, setAutoSave] = useState(true);
    const [savingPlanIds, setSavingPlanIds] = useState<Set<number>>(new Set());
    const [trialModal, setTrialModal] = useState<ActiveTrialModalState | null>(null);

    // Todos los módulos: los de ALL_MODULES + cualquiera extra en FEATURES_REGISTRY (ej. integraciones)
    const matrixModules = useMemo(() => {
        const list: { key: string; name: string; isVirtual?: boolean }[] = [...allModules];
        const seen = new Set(list.map((m) => m.key));
        for (const [k, def] of Object.entries(FEATURES_REGISTRY)) {
            if (!seen.has(k)) {
                list.push({ key: k, name: def.label, isVirtual: true });
                seen.add(k);
            }
        }
        return list;
    }, [allModules]);

    const [expandedModules, setExpandedModules] = useState<Set<string>>(
        () => new Set(matrixModules.map((m) => m.key))
    );

    // Estado local editable por plan
    const [drafts, setDrafts] = useState<Record<number, PlanData>>(() => {
        const map: Record<number, PlanData> = {};
        for (const p of plans) {
            map[p.id] = normalizePlanDraft(p);
        }
        return map;
    });

    // Timers de auto-guardado por plan
    const debounceTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

    useEffect(() => {
        setDrafts((prev) => {
            const next: Record<number, PlanData> = {};
            for (const p of plans) {
                next[p.id] = normalizePlanDraft(p);
            }
            return next;
        });
    }, [plans]);

    useEffect(() => {
        return () => {
            for (const t of Object.values(debounceTimers.current)) {
                clearTimeout(t);
            }
        };
    }, []);

    const visiblePlans = useMemo(() => {
        return plans.filter((p) => showInactive || p.is_active !== false);
    }, [plans, showInactive]);

    const inactiveCount = useMemo(
        () => plans.filter((p) => p.is_active === false).length,
        [plans]
    );

    const dirtyPlanIds = useMemo(() => {
        const dirty: number[] = [];
        for (const p of plans) {
            const d = drafts[p.id];
            if (!d) continue;
            const origNorm = normalizePlanDraft(p);
            if (JSON.stringify(d) !== JSON.stringify(origNorm)) {
                dirty.push(p.id);
            }
        }
        return dirty;
    }, [plans, drafts]);

    const triggerSavePlan = async (planDraft: PlanData) => {
        setSavingPlanIds((prev) => new Set(prev).add(planDraft.id));
        try {
            await onSavePlan(planDraft);
        } finally {
            setSavingPlanIds((prev) => {
                const next = new Set(prev);
                next.delete(planDraft.id);
                return next;
            });
        }
    };

    const schedulePlanUpdate = (planId: number, updater: (prev: PlanData) => PlanData) => {
        setDrafts((prev) => {
            const current = prev[planId];
            if (!current) return prev;
            const updated = updater(current);
            if (autoSave) {
                if (debounceTimers.current[planId]) {
                    clearTimeout(debounceTimers.current[planId]);
                }
                debounceTimers.current[planId] = setTimeout(() => {
                    triggerSavePlan(updated);
                }, 650);
            }
            return { ...prev, [planId]: updated };
        });
    };

    const handleSaveAllDirty = async () => {
        for (const id of dirtyPlanIds) {
            if (debounceTimers.current[id]) {
                clearTimeout(debounceTimers.current[id]);
            }
            const d = drafts[id];
            if (d) {
                await triggerSavePlan(d);
            }
        }
    };

    const handleResetChanges = () => {
        for (const t of Object.values(debounceTimers.current)) {
            clearTimeout(t);
        }
        const reset: Record<number, PlanData> = {};
        for (const p of plans) {
            reset[p.id] = normalizePlanDraft(p);
        }
        setDrafts(reset);
    };

    const toggleExpandModule = (modKey: string) => {
        setExpandedModules((prev) => {
            const next = new Set(prev);
            if (next.has(modKey)) next.delete(modKey);
            else next.add(modKey);
            return next;
        });
    };

    const expandAll = () => setExpandedModules(new Set(matrixModules.map((m) => m.key)));
    const collapseAll = () => setExpandedModules(new Set());

    // Acciones de cambio en la matriz
    const handleToggleModule = (planId: number, moduleKey: string, isVirtual?: boolean) => {
        schedulePlanUpdate(planId, (prev) => {
            const nextFeatures = { ...(prev.features || {}) } as Record<string, any>;
            const moduleDef = FEATURES_REGISTRY[moduleKey];

            if (isVirtual || PLAN_EXEMPT_MODULES.includes(moduleKey)) {
                // Módulo exento o virtual (ej. integraciones, dashboard, configuracion):
                // conmuta todas sus características hijas
                const childKeys: string[] = [];
                if (moduleDef) {
                    for (const s of moduleDef.sections) {
                        for (const f of s.features) childKeys.push(f.key);
                    }
                }
                const allOn = childKeys.length > 0 && childKeys.every((k) => !!nextFeatures[k]);
                const turnOn = !allOn;
                for (const k of childKeys) {
                    nextFeatures[k] = turnOn;
                }
                return { ...prev, features: nextFeatures };
            }

            const has = prev.allowed_modules.includes(moduleKey);
            const turnOn = !has;
            const nextModules = turnOn
                ? [...prev.allowed_modules, moduleKey]
                : prev.allowed_modules.filter((m) => m !== moduleKey);

            if (moduleDef) {
                for (const section of moduleDef.sections) {
                    for (const feat of section.features) {
                        nextFeatures[feat.key] = turnOn;
                    }
                }
            }

            return {
                ...prev,
                allowed_modules: nextModules,
                features: nextFeatures,
            };
        });
    };

    const handleToggleFeature = (planId: number, moduleKey: string, featKey: string, isVirtual?: boolean) => {
        schedulePlanUpdate(planId, (prev) => {
            const nextFeatures = { ...(prev.features || {}) } as Record<string, any>;
            const currentlyOn = !!nextFeatures[featKey];
            const nextVal = !currentlyOn;
            nextFeatures[featKey] = nextVal;

            let nextModules = [...(prev.allowed_modules || [])];
            // Si el usuario activa un permiso dentro de un módulo que estaba apagado,
            // encendemos el módulo contenedor automáticamente para que el permiso tenga efecto.
            if (
                nextVal &&
                !isVirtual &&
                !PLAN_EXEMPT_MODULES.includes(moduleKey) &&
                !nextModules.includes(moduleKey)
            ) {
                nextModules.push(moduleKey);
            }

            return {
                ...prev,
                allowed_modules: nextModules,
                features: nextFeatures,
            };
        });
    };

    const handleToggleGlobalFlag = (planId: number, field: 'can_delete' | 'can_export') => {
        schedulePlanUpdate(planId, (prev) => ({
            ...prev,
            [field]: !prev[field],
        }));
    };

    const handleSaveTrialRule = (planId: number, trialKey: string, rule: TrialRule | null) => {
        schedulePlanUpdate(planId, (prev) => {
            const nextFeatures = { ...(prev.features || {}) } as Record<string, any>;
            const currentTrials = { ...(nextFeatures.__trials__ || {}) } as Record<string, TrialRule>;
            if (rule) {
                currentTrials[trialKey] = rule;
            } else {
                delete currentTrials[trialKey];
            }
            nextFeatures.__trials__ = currentTrials;
            return {
                ...prev,
                features: nextFeatures,
            };
        });
    };

    const getTrialRule = (planDraft: PlanData, trialKey: string): TrialRule | null => {
        const trials = (planDraft.features as Record<string, any>)?.__trials__;
        if (!trials || typeof trials !== 'object') return null;
        return trials[trialKey] || null;
    };

    // Filtrado de módulos y características según búsqueda y modo
    const searchLower = search.trim().toLowerCase();

    const shouldShowFeature = (moduleKey: string, featKey: string, featLabel: string, featDesc?: string) => {
        if (searchLower) {
            const modLabel = FEATURES_REGISTRY[moduleKey]?.label || moduleKey;
            const match =
                featLabel.toLowerCase().includes(searchLower) ||
                featKey.toLowerCase().includes(searchLower) ||
                modLabel.toLowerCase().includes(searchLower) ||
                (featDesc || '').toLowerCase().includes(searchLower);
            if (!match) return false;
        }
        if (filterMode === 'diff' && visiblePlans.length > 1) {
            const values = visiblePlans.map((p) => {
                const d = drafts[p.id] || normalizePlanDraft(p);
                return !!d.features?.[featKey];
            });
            return !values.every((v) => v === values[0]);
        }
        if (filterMode === 'trials') {
            return visiblePlans.some((p) => {
                const d = drafts[p.id] || normalizePlanDraft(p);
                return !!(getTrialRule(d, featKey) || getTrialRule(d, `module:${moduleKey}`));
            });
        }
        return true;
    };

    const shouldShowModule = (mod: { key: string; name: string; isVirtual?: boolean }) => {
        const reg = FEATURES_REGISTRY[mod.key];
        const hasMatchingFeature = reg
            ? reg.sections.some((s) =>
                  s.features.some((f) => shouldShowFeature(mod.key, f.key, f.label, f.description))
              )
            : false;

        if (searchLower) {
            const modMatches =
                mod.name.toLowerCase().includes(searchLower) || mod.key.toLowerCase().includes(searchLower);
            return modMatches || hasMatchingFeature;
        }
        if (filterMode === 'diff' && visiblePlans.length > 1) {
            const modDiff = ! visiblePlans
                .map((p) => {
                    const d = drafts[p.id] || normalizePlanDraft(p);
                    return d.allowed_modules.includes(mod.key) || PLAN_EXEMPT_MODULES.includes(mod.key);
                })
                .every((v, _, arr) => v === arr[0]);
            return modDiff || hasMatchingFeature;
        }
        if (filterMode === 'trials') {
            const modHasTrial = visiblePlans.some((p) => {
                const d = drafts[p.id] || normalizePlanDraft(p);
                return !!getTrialRule(d, `module:${mod.key}`);
            });
            return modHasTrial || hasMatchingFeature;
        }
        return true;
    };

    return (
        <div className="space-y-6">
            {/* Tarjetas de resumen de % de cobertura por plan activo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {visiblePlans.map((p) => {
                    const d = drafts[p.id] || normalizePlanDraft(p);
                    const theme = getPlanTheme(d.display_order, d.code || d.name);
                    const isSaving = savingPlanIds.has(p.id);
                    return (
                        <div
                            key={p.id}
                            className={`p-4 rounded-2xl bg-[#0a192f] border ${
                                p.is_active === false ? 'border-white/10 border-dashed opacity-60' : theme.border
                            } shadow-lg space-y-3`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="text-sm font-black text-white truncate">{d.name}</h4>
                                        {d.code && (
                                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/5 text-white/50 border border-white/10">
                                                {d.code}
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-xs font-bold ${theme.text}`}>
                                        ${(d.price || 0).toLocaleString('es-CL')} / mes
                                    </p>
                                </div>
                                {isSaving && <Loader2 size={15} className="animate-spin text-primary shrink-0" />}
                            </div>
                            <PlanCoverageBadge plan={d} allModules={allModules} compact />
                        </div>
                    );
                })}
            </div>

            {/* Barra de herramientas de la matriz */}
            <div className="p-4 rounded-2xl bg-[#0a192f] border border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
                    <div className="relative flex-1 min-w-[220px] max-w-sm">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar módulo, sección o permiso..."
                            className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/30 outline-none focus:border-primary/50"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* Filtros rápidos */}
                    <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/10">
                        <button
                            type="button"
                            onClick={() => setFilterMode('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                filterMode === 'all'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-white/50 hover:text-white'
                            }`}
                        >
                            Todos
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterMode('diff')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                filterMode === 'diff'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-white/50 hover:text-white'
                            }`}
                        >
                            <Filter size={12} />
                            Diferencias
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterMode('trials')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                filterMode === 'trials'
                                    ? 'bg-violet-600 text-white shadow-sm'
                                    : 'text-white/50 hover:text-white'
                            }`}
                        >
                            <Clock size={12} />
                            Con tiempo de vida
                        </button>
                    </div>

                    {inactiveCount > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowInactive((v) => !v)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                showInactive
                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                    : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
                            }`}
                        >
                            {showInactive ? 'Ocultar inactivos' : `Mostrar inactivos (${inactiveCount})`}
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={expandedModules.size > 0 ? collapseAll : expandAll}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/70 transition-all"
                    >
                        {expandedModules.size > 0 ? 'Contraer secciones' : 'Expandir secciones'}
                    </button>

                    <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white/70 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={autoSave}
                            onChange={(e) => setAutoSave(e.target.checked)}
                            className="rounded border-white/20 bg-white/10 text-primary focus:ring-0"
                        />
                        Auto-guardar
                    </label>

                    {!autoSave && dirtyPlanIds.length > 0 && (
                        <>
                            <button
                                type="button"
                                onClick={handleResetChanges}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white/60 transition-all"
                            >
                                <RotateCcw size={13} />
                                Descartar
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveAllDirty}
                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black text-white shadow-lg shadow-emerald-600/20 transition-all"
                            >
                                <Save size={13} />
                                Guardar ({dirtyPlanIds.length})
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Tabla / Matriz Comparativa */}
            <div className="rounded-3xl bg-[#0a192f] border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="border-b border-white/10 bg-[#071326]">
                                <th className="sticky left-0 z-20 bg-[#071326] p-3 sm:p-4 w-[240px] sm:w-[270px] min-w-[210px] max-w-[290px] border-r border-white/10">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-xl bg-primary/15 text-primary">
                                            <Shield size={18} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-white">
                                                Módulos y Permisos por Plan
                                            </div>
                                            <p className="text-[11px] text-white/40 font-normal">
                                                Activa accesos o asigna tiempo de vida (⏱️)
                                            </p>
                                        </div>
                                    </div>
                                </th>
                                {visiblePlans.map((p) => {
                                    const d = drafts[p.id] || normalizePlanDraft(p);
                                    const theme = getPlanTheme(d.display_order, d.code || d.name);
                                    const isSaving = savingPlanIds.has(p.id);
                                    return (
                                        <th
                                            key={p.id}
                                            className="p-3 sm:p-3.5 min-w-[130px] sm:min-w-[145px] text-center align-top border-r border-white/5 last:border-r-0"
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <span className="text-sm font-black text-white">{d.name}</span>
                                                    {isSaving && (
                                                        <Loader2 size={13} className="animate-spin text-primary" />
                                                    )}
                                                </div>
                                                <div className={`text-xs font-bold ${theme.text}`}>
                                                    ${(d.price || 0).toLocaleString('es-CL')}/mes
                                                </div>
                                                <PlanCoverageBadge plan={d} allModules={allModules} compact />
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-white/5 text-sm">
                            {/* Bloque 0: Capacidades Globales del Plan (Eliminar / Exportar) */}
                            {!searchLower && filterMode === 'all' && (
                                <>
                                    <tr className="bg-white/[0.03]">
                                        <td
                                            colSpan={visiblePlans.length + 1}
                                            className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary/80"
                                        >
                                            Capacidades Globales del Sistema
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-white/[0.02] transition-colors">
                                        <td className="sticky left-0 z-10 bg-[#0a192f] px-3.5 sm:px-4 py-2.5 sm:py-3 w-[240px] sm:w-[270px] min-w-[210px] max-w-[290px] border-r border-white/10">
                                            <div className="text-xs font-bold text-white">
                                                Permitir eliminar registros
                                            </div>
                                            <div className="text-[11px] text-white/40">
                                                Autoriza borrar clientes, mascotas u órdenes (can_delete)
                                            </div>
                                        </td>
                                        {visiblePlans.map((p) => {
                                            const d = drafts[p.id] || normalizePlanDraft(p);
                                            return (
                                                <td
                                                    key={p.id}
                                                    className="px-3 py-2.5 text-center border-r border-white/5 last:border-r-0"
                                                >
                                                    <MatrixSwitch
                                                        checked={!!d.can_delete}
                                                        onChange={() => handleToggleGlobalFlag(p.id, 'can_delete')}
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                    <tr className="hover:bg-white/[0.02] transition-colors">
                                        <td className="sticky left-0 z-10 bg-[#0a192f] px-3.5 sm:px-4 py-2.5 sm:py-3 w-[240px] sm:w-[270px] min-w-[210px] max-w-[290px] border-r border-white/10">
                                            <div className="text-xs font-bold text-white">
                                                Permitir exportar datos (Excel / CSV)
                                            </div>
                                            <div className="text-[11px] text-white/40">
                                                Habilita descargas masivas y reportes (can_export)
                                            </div>
                                        </td>
                                        {visiblePlans.map((p) => {
                                            const d = drafts[p.id] || normalizePlanDraft(p);
                                            return (
                                                <td
                                                    key={p.id}
                                                    className="px-3 py-2.5 text-center border-r border-white/5 last:border-r-0"
                                                >
                                                    <MatrixSwitch
                                                        checked={!!d.can_export}
                                                        onChange={() => handleToggleGlobalFlag(p.id, 'can_export')}
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </>
                            )}

                            {/* Bloques por Módulo y sus Secciones */}
                            {matrixModules.filter(shouldShowModule).map((mod) => {
                                const reg = FEATURES_REGISTRY[mod.key];
                                const isExpanded = expandedModules.has(mod.key);
                                const isExempt = PLAN_EXEMPT_MODULES.includes(mod.key);
                                const totalSubFeatures = reg
                                    ? reg.sections.reduce((acc, s) => acc + s.features.length, 0)
                                    : 0;

                                return (
                                    <React.Fragment key={mod.key}>
                                        {/* Fila Cabecera del Módulo */}
                                        <tr className="bg-white/[0.04] hover:bg-white/[0.06] transition-colors">
                                            <td className="sticky left-0 z-10 bg-[#0e213d] px-3.5 sm:px-4 py-3 sm:py-3.5 w-[240px] sm:w-[270px] min-w-[210px] max-w-[290px] border-r border-white/10">
                                                <div className="flex items-center justify-between gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleExpandModule(mod.key)}
                                                        className="flex items-center gap-2 text-left group flex-1 min-w-0"
                                                    >
                                                        {totalSubFeatures > 0 ? (
                                                            isExpanded ? (
                                                                <ChevronDown size={15} className="text-primary shrink-0" />
                                                            ) : (
                                                                <ChevronRight size={15} className="text-white/40 shrink-0" />
                                                            )
                                                        ) : (
                                                            <Layers size={14} className="text-white/40 shrink-0" />
                                                        )}
                                                        <span className="text-xs font-black uppercase tracking-wider text-white group-hover:text-primary transition-colors truncate">
                                                            {mod.name}
                                                        </span>
                                                    </button>
                                                    {totalSubFeatures > 0 && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-white/45 shrink-0">
                                                            {totalSubFeatures} perm.
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {visiblePlans.map((p) => {
                                                const d = drafts[p.id] || normalizePlanDraft(p);
                                                const childKeys: string[] = [];
                                                if (reg) {
                                                    for (const s of reg.sections) {
                                                        for (const f of s.features) childKeys.push(f.key);
                                                    }
                                                }
                                                const activeChildCount = childKeys.filter((k) => !!d.features?.[k]).length;
                                                const moduleActive = mod.isVirtual
                                                    ? activeChildCount > 0
                                                    : isExempt
                                                      ? true
                                                      : d.allowed_modules.includes(mod.key);
                                                const modTrialRule = getTrialRule(d, `module:${mod.key}`);
                                                const badgeText = formatTrialBadge(modTrialRule);

                                                return (
                                                    <td
                                                        key={p.id}
                                                        className="px-3 py-3 text-center border-r border-white/5 last:border-r-0"
                                                    >
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <MatrixSwitch
                                                                checked={moduleActive}
                                                                partial={
                                                                    moduleActive &&
                                                                    childKeys.length > 0 &&
                                                                    activeChildCount > 0 &&
                                                                    activeChildCount < childKeys.length
                                                                }
                                                                onChange={() =>
                                                                    handleToggleModule(p.id, mod.key, mod.isVirtual)
                                                                }
                                                                title={
                                                                    isExempt
                                                                        ? 'Módulo base del sistema (conmuta todas sus secciones)'
                                                                        : moduleActive
                                                                          ? 'Módulo activo en este plan (clic para desactivar)'
                                                                          : 'Módulo inactivo en este plan (clic para activar)'
                                                                }
                                                            />

                                                            {!isExempt && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setTrialModal({
                                                                            planId: p.id,
                                                                            planName: d.name,
                                                                            trialKey: `module:${mod.key}`,
                                                                            itemLabel: `Módulo: ${mod.name}`,
                                                                            itemType: 'module',
                                                                            currentRule: modTrialRule,
                                                                            inheritedRule: null,
                                                                        })
                                                                    }
                                                                    title={formatTrialTooltip(modTrialRule, false)}
                                                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                                                                        badgeText
                                                                            ? 'bg-violet-500/20 text-violet-300 border-violet-500/40 hover:bg-violet-500/30'
                                                                            : 'bg-white/[0.03] text-white/25 border-white/5 hover:text-white/70 hover:border-white/20'
                                                                    }`}
                                                                >
                                                                    <Clock size={11} />
                                                                    {badgeText && <span>{badgeText}</span>}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>

                                        {/* Secciones y Características del Módulo */}
                                        {isExpanded &&
                                            reg &&
                                            reg.sections.map((section) => {
                                                const matchingFeatures = section.features.filter((f) =>
                                                    shouldShowFeature(mod.key, f.key, f.label, f.description)
                                                );
                                                if (matchingFeatures.length === 0) return null;

                                                return (
                                                    <React.Fragment key={`${mod.key}:${section.label}`}>
                                                        {reg.sections.length > 1 && (
                                                            <tr className="bg-white/[0.015]">
                                                                <td
                                                                    colSpan={visiblePlans.length + 1}
                                                                    className="sticky left-0 px-7 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/30"
                                                                >
                                                                    {mod.name} › {section.label}
                                                                </td>
                                                            </tr>
                                                        )}

                                                        {matchingFeatures.map((feat) => (
                                                            <tr
                                                                key={feat.key}
                                                                className="hover:bg-white/[0.025] transition-colors group"
                                                            >
                                                                <td className="sticky left-0 z-10 bg-[#0a192f] group-hover:bg-[#0d203b] px-3.5 sm:px-4 py-2 sm:py-2.5 pl-6 sm:pl-7 w-[240px] sm:w-[270px] min-w-[210px] max-w-[290px] border-r border-white/10 transition-colors">
                                                                    <div className="text-xs font-semibold text-white/85">
                                                                        {feat.label}
                                                                    </div>
                                                                    {feat.description && (
                                                                        <div className="text-[11px] text-white/35 line-clamp-1">
                                                                            {feat.description}
                                                                        </div>
                                                                    )}
                                                                </td>

                                                                {visiblePlans.map((p) => {
                                                                    const d = drafts[p.id] || normalizePlanDraft(p);
                                                                    const modAllowed =
                                                                        mod.isVirtual ||
                                                                        isExempt ||
                                                                        d.allowed_modules.includes(mod.key);
                                                                    const isOn = modAllowed && !!d.features?.[feat.key];
                                                                    const featTrial = getTrialRule(d, feat.key);
                                                                    const modTrial = getTrialRule(d, `module:${mod.key}`);
                                                                    const effectiveTrial = featTrial || modTrial;
                                                                    const isInherited = !featTrial && !!modTrial;
                                                                    const badgeText = formatTrialBadge(effectiveTrial);

                                                                    return (
                                                                        <td
                                                                            key={p.id}
                                                                            className="px-3 py-2.5 text-center border-r border-white/5 last:border-r-0"
                                                                        >
                                                                            <div className="flex items-center justify-center gap-1.5">
                                                                                <MatrixSwitch
                                                                                    checked={isOn}
                                                                                    size="sm"
                                                                                    onChange={() =>
                                                                                        handleToggleFeature(
                                                                                            p.id,
                                                                                            mod.key,
                                                                                            feat.key,
                                                                                            mod.isVirtual
                                                                                        )
                                                                                    }
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        setTrialModal({
                                                                                            planId: p.id,
                                                                                            planName: d.name,
                                                                                            trialKey: feat.key,
                                                                                            itemLabel: `${mod.name} › ${feat.label}`,
                                                                                            itemType: 'feature',
                                                                                            currentRule: featTrial,
                                                                                            inheritedRule: modTrial,
                                                                                        })
                                                                                    }
                                                                                    title={formatTrialTooltip(
                                                                                        effectiveTrial,
                                                                                        isInherited
                                                                                    )}
                                                                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                                                                                        badgeText
                                                                                            ? isInherited
                                                                                                ? 'bg-amber-500/10 text-amber-300/80 border-amber-500/25 border-dashed'
                                                                                                : 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                                                                                            : 'bg-transparent text-white/15 border-transparent group-hover:text-white/40 group-hover:border-white/10 hover:!text-white hover:!border-white/25'
                                                                                    }`}
                                                                                >
                                                                                    <Clock size={10} />
                                                                                    {badgeText && <span>{badgeText}</span>}
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        ))}
                                                    </React.Fragment>
                                                );
                                            })}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Configuración de Tiempo de Vida */}
            {trialModal && (
                <FeatureTrialModal
                    isOpen={true}
                    onClose={() => setTrialModal(null)}
                    planName={trialModal.planName}
                    itemLabel={trialModal.itemLabel}
                    itemType={trialModal.itemType}
                    currentRule={trialModal.currentRule}
                    inheritedRule={trialModal.inheritedRule}
                    onSave={(rule) => handleSaveTrialRule(trialModal.planId, trialModal.trialKey, rule)}
                />
            )}
        </div>
    );
}

function normalizePlanDraft(plan: PlanData): PlanData {
    const code = (plan.code || plan.name || '').trim().toUpperCase();
    const rawFeatures = (plan.features || {}) as Record<string, any>;
    const canonicalBoolMap = buildDraftFromPlan(
        rawFeatures as Record<string, boolean>,
        plan.allowed_modules || [],
        code
    );
    const mergedFeatures: Record<string, any> = { ...canonicalBoolMap };
    if (rawFeatures.__trials__ && typeof rawFeatures.__trials__ === 'object') {
        mergedFeatures.__trials__ = { ...rawFeatures.__trials__ };
    }
    return {
        ...plan,
        allowed_modules: [...(plan.allowed_modules || [])],
        features: mergedFeatures,
    };
}

function MatrixSwitch({
    checked,
    partial = false,
    size = 'md',
    onChange,
    title,
}: {
    checked: boolean;
    partial?: boolean;
    size?: 'sm' | 'md';
    onChange: () => void;
    title?: string;
}) {
    const dims = size === 'sm' ? 'w-8 h-4' : 'w-9 h-5';
    const thumb = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
    const translate = size === 'sm' ? 'translate-x-4' : 'translate-x-4';

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={onChange}
            title={title}
            className={`relative inline-flex items-center rounded-full transition-colors duration-200 cursor-pointer shrink-0 ${dims} ${
                checked
                    ? partial
                        ? 'bg-amber-500/80 hover:bg-amber-500'
                        : 'bg-emerald-500 hover:bg-emerald-400'
                    : 'bg-white/10 hover:bg-white/20'
            }`}
        >
            <span
                className={`inline-block rounded-full bg-white shadow transform transition-transform duration-200 ${thumb} ${
                    checked ? translate : 'translate-x-0.5'
                }`}
            />
        </button>
    );
}

