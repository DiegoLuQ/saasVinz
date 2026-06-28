"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
    Save,
    Database,
    Box,
    FileText,
    Trash2,
    Package,
    ShoppingCart,
    Briefcase,
    Users,
    Shield
} from 'lucide-react';
import ManageFeaturesModal, { FEATURES_REGISTRY } from './ManageFeaturesModal';
import { getPlanTheme } from '@/lib/admin/planTheme';
import UnlimitedToggle from './UnlimitedToggle';
import PlanModuleToggle, { type PlanModuleDef } from './PlanModuleToggle';

export interface PlanData {
    id: number;
    name: string;
    price: number;
    max_pets: number;
    max_customers: number;
    max_orders: number;
    max_services: number;
    max_plans: number;
    max_products: number;
    max_users: number;
    max_partners: number;
    allowed_modules: string[];
    features: Record<string, boolean>;
    is_active: boolean;
    display_order: number;
}

interface PlanCardProps {
    plan: PlanData;
    allModules: PlanModuleDef[];
    saving: boolean;
    onSave: (plan: PlanData) => Promise<void> | void;
    onSaveFeatures: (planId: number, features: Record<string, boolean>) => Promise<void> | void;
    onDelete: () => void;
}

const LIMIT_FIELDS: { field: keyof PlanData; label: string; Icon: any }[] = [
    { field: 'max_pets', label: 'Mascotas (Mens.)', Icon: Database },
    { field: 'max_customers', label: 'Clientes (Mens.)', Icon: Users },
    { field: 'max_orders', label: 'Órdenes Crem. (Mens.)', Icon: ShoppingCart },
    { field: 'max_services', label: 'Servicios (Tot.)', Icon: Package },
    { field: 'max_plans', label: 'Planes Int. (Tot.)', Icon: FileText },
    { field: 'max_products', label: 'Productos (Tot.)', Icon: Box },
    { field: 'max_users', label: 'Usuarios (Tot.)', Icon: Users },
    { field: 'max_partners', label: 'Partners (Tot.)', Icon: Briefcase },
];

function PlanCard({ plan, allModules, saving, onSave, onSaveFeatures, onDelete }: PlanCardProps) {
    const [featuresModalOpen, setFeaturesModalOpen] = useState(false);
    const [savingFeatures, setSavingFeatures] = useState(false);
    // State aislado por card: editar este draft no re-renderiza otras cards
    const [draft, setDraft] = useState<PlanData>(plan);

    // Re-sync cuando el plan del padre cambia (ej. tras refetch)
    useEffect(() => {
        setDraft(plan);
    }, [plan]);

    const theme = useMemo(() => getPlanTheme(plan.display_order, plan.name), [plan.display_order, plan.name]);

    const isDirty = useMemo(() => {
        return JSON.stringify(draft) !== JSON.stringify(plan);
    }, [draft, plan]);

    const updateField = <K extends keyof PlanData>(field: K, value: PlanData[K]) => {
        setDraft(prev => ({ ...prev, [field]: value }));
    };

    const toggleModule = (moduleKey: string) => {
        setDraft(prev => {
            const has = prev.allowed_modules.includes(moduleKey);
            const nextModules = has
                ? prev.allowed_modules.filter(m => m !== moduleKey)
                : [...prev.allowed_modules, moduleKey];

            // Auto-toggle all features belonging to this module in features dictionary
            const nextFeatures = { ...(prev.features || {}) };
            const moduleDef = FEATURES_REGISTRY[moduleKey];
            if (moduleDef) {
                const turnOn = !has; // if we are activating, turn on all features of this module
                for (const section of moduleDef.sections) {
                    for (const feat of section.features) {
                        nextFeatures[feat.key] = turnOn;
                    }
                }
            }

            return {
                ...prev,
                allowed_modules: nextModules,
                features: nextFeatures
            };
        });
    };

    return (
        <div className={`bg-[#0a192f] border ${theme.border} rounded-3xl overflow-hidden shadow-xl hover:border-white/20 transition-all flex flex-col`}>
            {/* Header con nombre, precio y botones */}
            <div className={`p-6 border-b border-white/5 flex items-center justify-between ${theme.bg}`}>
                <div className="space-y-2 flex-1 min-w-0 mr-3">
                    <input
                        type="text"
                        value={draft.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        className="text-xl font-black text-white bg-transparent outline-none border-b border-white/0 focus:border-white/20 transition-all w-full"
                    />
                    <div className="flex items-center gap-2">
                        <span className={`${theme.text} font-bold text-sm`}>$</span>
                        <input
                            type="number"
                            value={draft.price}
                            onChange={(e) => updateField('price', parseInt(e.target.value) || 0)}
                            className={`${theme.text} font-bold text-sm bg-transparent outline-none border-b border-white/0 focus:opacity-50 transition-all w-24`}
                        />
                        <span className={`${theme.text} font-bold text-sm`}>/ mes</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => setFeaturesModalOpen(true)}
                        className="p-2.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-xl transition-all border border-blue-500/10 hover:border-blue-500/30"
                        title="Configurar Características"
                    >
                        <Shield size={18} />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition-all border border-red-500/10 hover:border-red-500/30"
                        title="Eliminar plan"
                    >
                        <Trash2 size={18} />
                    </button>
                    <div className="p-3 bg-white/5 rounded-2xl">
                        <Box className="text-white/40" size={24} />
                    </div>
                </div>
            </div>

            {/* Cuerpo */}
            <div className="p-6 space-y-8 flex-1">
                {/* Límites */}
                <div>
                    <div className="flex items-center gap-2 mb-4 opacity-60">
                        <Database size={14} className="text-primary" />
                        <h4 className="text-white text-[11px] font-bold uppercase tracking-widest">Límites de Recursos</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {LIMIT_FIELDS.map(({ field, label, Icon }) => (
                            <UnlimitedToggle
                                key={field as string}
                                label={label}
                                Icon={Icon}
                                value={(draft[field] as number) ?? 0}
                                onChange={(next) => updateField(field, next as any)}
                                theme={theme}
                            />
                        ))}
                    </div>
                </div>

                {/* Módulos */}
                <div>
                    <label className="text-[10px] font-bold uppercase text-white/30 mb-4 block tracking-widest">
                        Módulos Activados en el Plan
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {allModules.map(module => (
                            <PlanModuleToggle
                                key={module.key}
                                module={module}
                                isActive={draft.allowed_modules.includes(module.key)}
                                onToggle={() => toggleModule(module.key)}
                                theme={theme}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer con Guardar */}
            <div className="p-6 bg-white/5 border-t border-white/5">
                <button
                    onClick={() => onSave(draft)}
                    disabled={saving || !isDirty}
                    className={`w-full ${theme.accent} hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg ${theme.shadow} transition-all active:scale-95`}
                >
                    {saving ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Save size={18} />
                    )}
                    {saving
                        ? 'Guardando...'
                        : isDirty
                            ? `Guardar Cambios ${draft.name}`
                            : 'Sin cambios pendientes'}
                </button>
            </div>

            {/* Features Modal */}
            <ManageFeaturesModal
                isOpen={featuresModalOpen}
                onClose={() => setFeaturesModalOpen(false)}
                planName={plan.name}
                initialFeatures={draft.features || {}}
                allowedModules={draft.allowed_modules || []}
                saving={savingFeatures}
                onSave={async (features) => {
                    setSavingFeatures(true);
                    try {
                        await onSaveFeatures(plan.id, features);
                        setFeaturesModalOpen(false);
                    } finally {
                        setSavingFeatures(false);
                    }
                }}
            />
        </div>
    );
}

// React.memo: re-renderiza solo si cambia el plan, allModules, saving, o los handlers.
export default React.memo(PlanCard);
