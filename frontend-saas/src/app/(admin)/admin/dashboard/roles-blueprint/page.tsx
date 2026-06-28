"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, Save, Lock, Info, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

interface EnabledRole { key: string; label: string; is_system: boolean; }

// Módulo estructural: siempre activo, no editable (espejo del backend).
// 'dashboard' SÍ es controlable por rol.
const PROTECTED_MODULES = new Set(['perfil']);

type CellState = 'disabled' | 'optional' | 'mandatory';

// Ciclo al hacer clic: Sin acceso -> Opcional -> Obligatorio -> Sin acceso
const NEXT_STATE: Record<CellState, CellState> = {
    disabled: 'optional',
    optional: 'mandatory',
    mandatory: 'disabled',
};

const STATE_STYLE: Record<CellState, { label: string; cls: string }> = {
    disabled: { label: 'Sin acceso', cls: 'bg-white/[0.03] text-white/30 border-white/5 hover:border-white/20' },
    optional: { label: 'Opcional', cls: 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:border-amber-400/60' },
    mandatory: { label: 'Obligatorio', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40 hover:border-emerald-400/70' },
};

interface ModuleDef { id: number; key: string; name: string; icon?: string | null; }
interface BlueprintRow { id: number; role: string; module_key: string; is_mandatory: boolean; }

const cellKey = (role: string, moduleKey: string) => `${role}::${moduleKey}`;

export default function RolesBlueprintPage() {
    const { showToast } = useToast();

    const { data: modules, isLoading: loadingModules } = useQuery<ModuleDef[]>({
        queryKey: ['rbac-modules'],
        queryFn: () => apiRequest('/api/internal/rbac/modules'),
    });

    const { data: blueprint, isLoading: loadingBlueprint } = useQuery<BlueprintRow[]>({
        queryKey: ['rbac-blueprint'],
        queryFn: () => apiRequest('/api/internal/rbac/blueprint'),
    });

    // Columnas = roles habilitados (se excluye 'creator': el SuperAdmin hace bypass).
    const { data: enabledRoles, isLoading: loadingRoles } = useQuery<EnabledRole[]>({
        queryKey: ['enabled-roles'],
        queryFn: () => apiRequest('/api/internal/admin/roles/enabled'),
    });
    const ROLES = useMemo(
        () => (enabledRoles || []).filter(r => r.key !== 'creator').map(r => ({ key: r.key, label: r.label })),
        [enabledRoles]
    );

    // Estado editable de la matriz: { 'role::module_key': CellState }
    const [matrix, setMatrix] = useState<Record<string, CellState>>({});
    const [initial, setInitial] = useState<Record<string, CellState>>({});
    const [saving, setSaving] = useState(false);

    // Construir la matriz inicial cuando llegan módulos + blueprint
    useEffect(() => {
        if (!modules || !blueprint || ROLES.length === 0) return;
        const next: Record<string, CellState> = {};
        for (const role of ROLES) {
            for (const m of modules) {
                if (PROTECTED_MODULES.has(m.key)) continue;
                next[cellKey(role.key, m.key)] = 'disabled';
            }
        }
        for (const row of blueprint) {
            const k = cellKey(row.role, row.module_key);
            if (k in next) next[k] = row.is_mandatory ? 'mandatory' : 'optional';
        }
        setMatrix(next);
        setInitial(next);
    }, [modules, blueprint, ROLES]);

    const editableModules = useMemo(
        () => (modules || []).filter(m => !PROTECTED_MODULES.has(m.key)),
        [modules]
    );
    const protectedModules = useMemo(
        () => (modules || []).filter(m => PROTECTED_MODULES.has(m.key)),
        [modules]
    );

    const isDirty = useMemo(
        () => Object.keys(matrix).some(k => matrix[k] !== initial[k]),
        [matrix, initial]
    );

    const cycleCell = (role: string, moduleKey: string) => {
        const k = cellKey(role, moduleKey);
        setMatrix(prev => ({ ...prev, [k]: NEXT_STATE[prev[k] ?? 'disabled'] }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const cells = Object.entries(matrix).map(([k, state]) => {
                const [role, module_key] = k.split('::');
                return { role, module_key, state };
            });
            const res = await apiRequest('/api/internal/rbac/blueprint/update', {
                method: 'POST',
                body: { cells },
            });
            setInitial(matrix);
            showToast(`Blueprint guardado (${res.upserts} cambios, ${res.deletes} retiros)`, 'success');
        } catch (err: any) {
            showToast(err.message || 'Error al guardar el blueprint', 'error');
        } finally {
            setSaving(false);
        }
    };

    const loading = loadingModules || loadingBlueprint || loadingRoles;

    return (
        <div className="p-8 min-h-screen">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Shield className="text-primary" size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Blueprint de Roles y Módulos</h1>
                        <p className="text-white/40 text-sm mt-1 max-w-2xl">
                            Define globalmente, para cada rol, qué módulos son <span className="text-emerald-300 font-semibold">obligatorios</span>,
                            cuáles son <span className="text-amber-300 font-semibold">opcionales</span> (el Admin del tenant decide) o
                            están <span className="text-white/60 font-semibold">sin acceso</span>.
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={!isDirty || saving}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                        isDirty && !saving
                            ? 'bg-primary text-white hover:opacity-90 shadow-lg shadow-primary/20'
                            : 'bg-white/5 text-white/30 cursor-not-allowed'
                    }`}
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? 'Guardando...' : isDirty ? 'Guardar cambios' : 'Sin cambios'}
                </button>
            </div>

            {/* Aviso sobre interacción con el plan */}
            <div className="flex items-start gap-3 mb-6 p-4 rounded-xl bg-sky-500/5 border border-sky-500/15 text-sky-200/80 text-xs leading-relaxed">
                <Info size={16} className="shrink-0 mt-0.5 text-sky-400" />
                <p>
                    El blueprint es la capa global de roles. El <strong>plan de suscripción de cada tenant sigue siendo el techo</strong>:
                    un módulo marcado como obligatorio aquí solo aparece si el plan del tenant lo incluye. Los módulos estructurales
                    (<code className="text-white/70">dashboard</code>, <code className="text-white/70">perfil</code>) están siempre activos y no son editables.
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-32 text-white/40 gap-3">
                    <Loader2 className="animate-spin" size={20} /> Cargando matriz...
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0a192f]/60">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="sticky left-0 z-10 bg-[#0a192f] text-left px-5 py-4 text-[11px] uppercase tracking-widest text-white/40 font-bold border-b border-white/5 min-w-[220px]">
                                    Módulo
                                </th>
                                {ROLES.map(r => (
                                    <th key={r.key} className="px-3 py-4 text-center text-[10px] uppercase tracking-wider text-white/50 font-bold border-b border-white/5 min-w-[120px]">
                                        {r.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Filas editables */}
                            {editableModules.map(m => (
                                <tr key={m.key} className="group">
                                    <td className="sticky left-0 z-10 bg-[#0a192f] px-5 py-3 border-b border-white/5">
                                        <div className="text-sm font-semibold text-white/90">{m.name}</div>
                                        <div className="text-[10px] text-white/30 font-mono">{m.key}</div>
                                    </td>
                                    {ROLES.map(r => {
                                        const state = matrix[cellKey(r.key, m.key)] ?? 'disabled';
                                        const style = STATE_STYLE[state];
                                        return (
                                            <td key={r.key} className="px-2 py-2 text-center border-b border-white/5">
                                                <button
                                                    onClick={() => cycleCell(r.key, m.key)}
                                                    className={`w-full px-2 py-2 rounded-lg border text-[11px] font-bold transition-all ${style.cls}`}
                                                    title="Clic para cambiar: Sin acceso → Opcional → Obligatorio"
                                                >
                                                    {style.label}
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}

                            {/* Filas protegidas (no editables) */}
                            {protectedModules.map(m => (
                                <tr key={m.key} className="bg-white/[0.015]">
                                    <td className="sticky left-0 z-10 bg-[#0a192f] px-5 py-3 border-b border-white/5">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
                                            <Lock size={13} className="text-white/30" /> {m.name}
                                        </div>
                                        <div className="text-[10px] text-white/30 font-mono pl-5">{m.key}</div>
                                    </td>
                                    {ROLES.map(r => (
                                        <td key={r.key} className="px-2 py-2 text-center border-b border-white/5">
                                            <div className="w-full px-2 py-2 rounded-lg border border-white/5 bg-white/[0.02] text-[11px] font-bold text-white/30">
                                                Siempre activo
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Leyenda */}
            <div className="flex flex-wrap items-center gap-4 mt-5 text-[11px]">
                <span className="text-white/40 font-bold uppercase tracking-widest">Leyenda:</span>
                {(['mandatory', 'optional', 'disabled'] as CellState[]).map(s => (
                    <span key={s} className={`inline-flex items-center px-3 py-1.5 rounded-lg border font-bold ${STATE_STYLE[s].cls}`}>
                        {STATE_STYLE[s].label}
                    </span>
                ))}
            </div>
        </div>
    );
}
