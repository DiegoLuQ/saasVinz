"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, ChevronDown, ChevronRight, Shield, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * FEATURES_REGISTRY: The single source of truth for all available feature flags.
 * Each top-level key is a module. Inside each module, `sections` contain features.
 *
 * This registry drives:
 *   1. The SuperAdmin "Configurar Características" modal
 *   2. The tenant-side useFeatures() hook (only features present in this registry are valid)
 *
 * To add a new feature, simply add it here. No other code change needed in the modal.
 */
export interface FeatureDef {
    key: string;
    label: string;
    description?: string;
}

export interface SectionDef {
    label: string;
    features: FeatureDef[];
}

export interface ModuleDef {
    label: string;
    icon?: string;
    sections: SectionDef[];
}

export const FEATURES_REGISTRY: Record<string, ModuleDef> = {
    dashboard: {
        label: 'Dashboard',
        sections: [
            {
                label: 'General',
                features: [
                    { key: 'dashboard:metricas', label: 'Métricas y Analíticas', description: 'Gráficos de cremaciones, ingresos y tendencias' },
                ],
            },
        ],
    },
    clientes: {
        label: 'Clientes',
        sections: [
            {
                label: 'Gestión',
                features: [
                    { key: 'clientes:crear', label: 'Crear Clientes', description: 'Registrar nuevos dueños de mascotas' },
                    { key: 'clientes:editar', label: 'Editar Clientes' },
                    { key: 'clientes:eliminar', label: 'Eliminar Clientes' },
                ],
            },
        ],
    },
    mascotas: {
        label: 'Mascotas',
        sections: [
            {
                label: 'Gestión',
                features: [
                    { key: 'mascotas:crear', label: 'Crear Mascotas' },
                    { key: 'mascotas:editar', label: 'Editar Mascotas' },
                    { key: 'mascotas:eliminar', label: 'Eliminar Mascotas' },
                ],
            },
            {
                label: 'Memoriales',
                features: [
                    { key: 'mascotas:memorial', label: 'Memoriales Digitales', description: 'Configurar memoriales interactivos públicos para cada mascota' },
                ],
            },
        ],
    },
    servicios: {
        label: 'Gestionar Servicios',
        sections: [
            {
                label: 'General',
                features: [
                    { key: 'servicios:crear', label: 'Crear Servicios' },
                    { key: 'servicios:editar', label: 'Editar Servicios' },
                ],
            },
        ],
    },
    ordenes: {
        label: 'Asignar Servicios',
        sections: [
            {
                label: 'General',
                features: [
                    { key: 'ordenes:crear', label: 'Crear Órdenes de Cremación' },
                    { key: 'ordenes:editar', label: 'Editar Órdenes' },
                    { key: 'ordenes:eliminar', label: 'Cancelar / Eliminar Órdenes' },
                ],
            },
        ],
    },
    inventario: {
        label: 'Inventario',
        sections: [
            {
                label: 'Productos',
                features: [
                    { key: 'inventario:productos:crear', label: 'Crear Productos' },
                    { key: 'inventario:productos:editar', label: 'Editar Productos' },
                    { key: 'inventario:productos:eliminar', label: 'Eliminar Productos' },
                    { key: 'inventario:productos:catalogo', label: 'Catálogo Digital', description: 'Visor de catálogo interactivo de urnas y accesorios' },
                    { key: 'inventario:productos:descargar_pdf', label: 'Descargar Catálogo PDF', description: 'Exportar catálogo de productos como documento PDF' },
                ],
            },
            {
                label: 'Categorías',
                features: [
                    { key: 'inventario:categorias:gestionar', label: 'Gestionar Categorías' },
                ],
            },
            {
                label: 'Proveedores',
                features: [
                    { key: 'inventario:proveedores:gestionar', label: 'Gestionar Proveedores' },
                ],
            },
        ],
    },
    certificados: {
        label: 'Documentos',
        sections: [
            {
                label: 'Repositorio',
                features: [
                    { key: 'certificados:repositorio', label: 'Repositorio de Documentos', description: 'Almacenamiento y gestión de actas y contratos' },
                ],
            },
        ],
    },
    operaciones: {
        label: 'Operaciones',
        sections: [
            {
                label: 'Panel de Trabajo',
                features: [
                    { key: 'operaciones:panel', label: 'Panel de Trabajo', description: 'Listado y asignación de tareas operativas del día' },
                ],
            },
            {
                label: 'Seguimiento',
                features: [
                    { key: 'operaciones:seguimiento:crear', label: 'Crear Seguimientos', description: 'Crear bitácoras digitales de transporte' },
                    { key: 'operaciones:seguimiento:qr_publico', label: 'QR Público de Mascotas', description: 'Código QR para tracking público del memorial' },
                ],
            },
        ],
    },
    pagos: {
        label: 'Órdenes Cremación / Pagos',
        sections: [
            {
                label: 'General',
                features: [
                    { key: 'pagos:ver_historial', label: 'Ver Historial de Pagos', description: 'Muestra el menú "Órdenes Cremación" y el listado de órdenes/pagos' },
                    { key: 'pagos:registrar', label: 'Registrar Pagos Manuales', description: 'Permite registrar pagos físicos (transferencia, efectivo) sobre una orden' },
                ],
            },
            {
                label: 'Acciones en Órdenes Cremación',
                features: [
                    { key: 'certificados:generar_pdf', label: 'Aplicar Certificado', description: 'Habilita el botón para generar el acta/certificado desde la tabla de Órdenes Cremación' },
                    { key: 'certificados:diseno', label: 'Aplicar Diseño', description: 'Habilita el botón de diseño de despedida desde la tabla de Órdenes Cremación' },
                ],
            },
        ],
    },
    veterinarios: {
        label: 'Veterinarios (Partners)',
        sections: [
            {
                label: 'Listado',
                features: [
                    { key: 'veterinarios:gestionar', label: 'Gestionar Partners', description: 'Alta y configuración de clínicas veterinarias' },
                ],
            },
            {
                label: 'Comisiones',
                features: [
                    { key: 'veterinarios:comisiones:ver', label: 'Ver Comisiones', description: 'Consultar comisiones acumuladas por partner' },
                    { key: 'veterinarios:comisiones:liquidar', label: 'Liquidar Comisiones', description: 'Generación y aprobación de reportes de pago' },
                ],
            },
            {
                label: 'Solicitudes',
                features: [
                    { key: 'veterinarios:solicitudes', label: 'Recibir Solicitudes Web', description: 'Formulario público de solicitud de convenio' },
                ],
            },
        ],
    },
    configuracion: {
        label: 'Configuración',
        sections: [
            {
                label: 'General',
                features: [
                    { key: 'configuracion:roles', label: 'Gestionar Roles y Módulos', description: 'RBAC: control de acceso por rol de usuario' },
                    { key: 'configuracion:usuarios', label: 'Gestionar Usuarios', description: 'CRUD de usuarios del tenant' },
                    { key: 'configuracion:avanzada', label: 'Configuración Avanzada', description: 'Ajustes avanzados de la empresa' },
                ],
            },
        ],
    },
};

/** Collect all feature keys from the registry */
export function getAllFeatureKeys(): string[] {
    const keys: string[] = [];
    for (const mod of Object.values(FEATURES_REGISTRY)) {
        for (const section of mod.sections) {
            for (const feat of section.features) {
                keys.push(feat.key);
            }
        }
    }
    return keys;
}

// ─── Modal Component ───────────────────────────────────────────────────────────

interface ManageFeaturesModalProps {
    isOpen: boolean;
    onClose: () => void;
    planName: string;
    initialFeatures: Record<string, boolean>;
    allowedModules: string[];
    onSave: (features: Record<string, boolean>) => Promise<void> | void;
    saving: boolean;
}

/**
 * Build the canonical feature-draft for a plan:
 *  - Explicit value in `initialFeatures` wins.
 *  - Otherwise, default to TRUE if the feature's module is in `allowedModules`,
 *    else FALSE. This keeps "Configurar Características" coherent with
 *    "Módulos Activados en el Plan".
 */
function buildDraftFromPlan(
    initialFeatures: Record<string, boolean>,
    allowedModules: string[]
): Record<string, boolean> {
    const allowed = new Set(allowedModules);
    const merged: Record<string, boolean> = {};
    for (const [moduleKey, mod] of Object.entries(FEATURES_REGISTRY)) {
        const moduleActive = allowed.has(moduleKey);
        for (const section of mod.sections) {
            for (const feat of section.features) {
                if (!moduleActive) {
                    // Module off => features off (overrides any stale explicit value)
                    merged[feat.key] = false;
                } else if (typeof initialFeatures[feat.key] === 'boolean') {
                    merged[feat.key] = initialFeatures[feat.key];
                } else {
                    merged[feat.key] = true;
                }
            }
        }
    }
    return merged;
}

export default function ManageFeaturesModal({
    isOpen,
    onClose,
    planName,
    initialFeatures,
    allowedModules,
    onSave,
    saving,
}: ManageFeaturesModalProps) {
    const [draft, setDraft] = useState<Record<string, boolean>>({});
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

    const allowedSet = useMemo(() => new Set(allowedModules), [allowedModules]);

    // Initialise draft from prop whenever modal opens
    useEffect(() => {
        if (isOpen) {
            setDraft(buildDraftFromPlan(initialFeatures, allowedModules));
            // Expand all modules by default for better UX
            setExpandedModules(new Set(Object.keys(FEATURES_REGISTRY)));
        }
    }, [isOpen, initialFeatures, allowedModules]);

    const toggleFeature = (key: string, moduleKey: string) => {
        if (!allowedSet.has(moduleKey)) return; // ignore toggles on disabled modules
        setDraft((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleModule = (moduleKey: string) => {
        setExpandedModules((prev) => {
            const next = new Set(prev);
            if (next.has(moduleKey)) next.delete(moduleKey);
            else next.add(moduleKey);
            return next;
        });
    };

    const isDirty = useMemo(() => {
        // 1) Cambios explícitos respecto al estado por defecto del plan.
        if (JSON.stringify(draft) !== JSON.stringify(
            buildDraftFromPlan(initialFeatures, allowedModules)
        )) {
            return true;
        }
        // 2) Flags del registro que AÚN NO están guardados en el plan (ej. features
        //    nuevas como mascotas:memorial / certificados:diseno). Sin esto, un flag
        //    nuevo que aparece en ON por defecto se veía como "sin cambios" y nunca
        //    se persistía. Guardar ahora escribe todas las features explícitamente.
        return getAllFeatureKeys().some((k) => typeof initialFeatures[k] !== 'boolean');
    }, [draft, initialFeatures, allowedModules]);

    // Bulk enable / disable all features in a module
    const setAllInModule = (moduleKey: string, value: boolean) => {
        if (!allowedSet.has(moduleKey)) return;
        const mod = FEATURES_REGISTRY[moduleKey];
        if (!mod) return;
        setDraft((prev) => {
            const next = { ...prev };
            for (const section of mod.sections) {
                for (const feat of section.features) {
                    next[feat.key] = value;
                }
            }
            return next;
        });
    };

    // Count active features per module
    const moduleStats = useMemo(() => {
        const result: Record<string, { total: number; active: number }> = {};
        for (const [moduleKey, mod] of Object.entries(FEATURES_REGISTRY)) {
            let total = 0;
            let active = 0;
            for (const section of mod.sections) {
                for (const feat of section.features) {
                    total++;
                    if (draft[feat.key]) active++;
                }
            }
            result[moduleKey] = { total, active };
        }
        return result;
    }, [draft]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0a192f] border border-white/10 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-500/10 rounded-xl">
                            <Shield className="text-blue-400" size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white">Configurar Características</h2>
                            <p className="text-xs text-white/40 mt-0.5">
                                Plan: <span className="text-blue-400 font-bold">{planName}</span> — Activar o desactivar características granulares
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Body — scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {Object.entries(FEATURES_REGISTRY).map(([moduleKey, mod]) => {
                        const isExpanded = expandedModules.has(moduleKey);
                        const stats = moduleStats[moduleKey];
                        const moduleActive = allowedSet.has(moduleKey);
                        const allActive = stats.active === stats.total;
                        const noneActive = stats.active === 0;

                        return (
                            <div
                                key={moduleKey}
                                className={`border rounded-2xl overflow-hidden bg-white/[0.02] ${
                                    moduleActive ? 'border-white/5' : 'border-white/5 opacity-50'
                                }`}
                            >
                                {/* Module header */}
                                <div
                                    onClick={() => toggleModule(moduleKey)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors cursor-pointer select-none"
                                >
                                    <div className="flex items-center gap-3">
                                        {isExpanded ? (
                                            <ChevronDown size={16} className="text-white/40" />
                                        ) : (
                                            <ChevronRight size={16} className="text-white/40" />
                                        )}
                                        <span className="text-sm font-bold text-white">{mod.label}</span>
                                        {!moduleActive && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-white/5 text-white/40">
                                                Módulo desactivado
                                            </span>
                                        )}
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                            !moduleActive
                                                ? 'bg-white/5 text-white/30'
                                                : allActive
                                                    ? 'bg-emerald-500/10 text-emerald-400'
                                                    : noneActive
                                                        ? 'bg-red-500/10 text-red-400'
                                                        : 'bg-amber-500/10 text-amber-400'
                                        }`}>
                                            {stats.active}/{stats.total}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => setAllInModule(moduleKey, true)}
                                            disabled={!moduleActive}
                                            className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg hover:bg-emerald-500/10 transition-all uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            Todo
                                        </button>
                                        <button
                                            onClick={() => setAllInModule(moduleKey, false)}
                                            disabled={!moduleActive}
                                            className="text-[10px] font-bold text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-all uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            Nada
                                        </button>
                                    </div>
                                </div>

                                {/* Sections & features */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 pb-4 space-y-4">
                                                {mod.sections.map((section, sIdx) => (
                                                    <div key={sIdx}>
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-2 pl-1">
                                                            {section.label}
                                                        </p>
                                                        <div className="space-y-1.5">
                                                            {section.features.map((feat) => (
                                                                <label
                                                                    key={feat.key}
                                                                    className={`flex items-center gap-3 p-2.5 rounded-xl transition-all group select-none ${
                                                                        !moduleActive
                                                                            ? 'bg-white/[0.02] border border-white/5 cursor-not-allowed'
                                                                            : draft[feat.key]
                                                                                ? 'bg-blue-500/10 border border-blue-500/20 cursor-pointer'
                                                                                : 'bg-white/[0.02] border border-white/5 hover:border-white/10 cursor-pointer'
                                                                    }`}
                                                                    title={!moduleActive ? 'Activa el módulo en el plan para configurar esta característica' : undefined}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={!!draft[feat.key] && moduleActive}
                                                                        disabled={!moduleActive}
                                                                        onChange={() => toggleFeature(feat.key, moduleKey)}
                                                                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/30 focus:ring-offset-0 cursor-pointer transition-all shrink-0 disabled:cursor-not-allowed disabled:opacity-40"
                                                                    />
                                                                    <div className="flex-1 min-w-0">
                                                                        <span className={`text-sm font-medium transition-colors ${
                                                                            draft[feat.key] ? 'text-white' : 'text-white/60 group-hover:text-white/80'
                                                                        }`}>
                                                                            {feat.label}
                                                                        </span>
                                                                        {feat.description && (
                                                                            <p className="text-[10px] text-white/30 mt-0.5 truncate">{feat.description}</p>
                                                                        )}
                                                                    </div>
                                                                    <code className="text-[9px] text-white/15 font-mono hidden sm:block shrink-0">{feat.key}</code>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 flex items-center justify-between gap-4 shrink-0">
                    <p className="text-[10px] text-white/30 font-mono">
                        {Object.values(draft).filter(Boolean).length} / {getAllFeatureKeys().length} activos
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 font-bold text-sm transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => onSave(draft)}
                            disabled={saving || !isDirty}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                        >
                            {saving ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save size={16} />
                            )}
                            {saving ? 'Guardando...' : isDirty ? 'Guardar Características' : 'Sin cambios'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
