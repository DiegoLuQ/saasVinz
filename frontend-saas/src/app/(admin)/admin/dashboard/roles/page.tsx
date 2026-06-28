"use client";

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield, Power, Trash2, Pencil, Check, X, Users, Lock, Loader2, LayoutGrid } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

interface RoleRow {
    key: string;
    label: string;
    description: string | null;
    is_system: boolean;
    is_enabled: boolean;
    user_count: number;
    blueprint_count: number;
}

export default function RolesPage() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const { data: roles, isLoading } = useQuery<RoleRow[]>({
        queryKey: ['admin-roles'],
        queryFn: () => apiRequest('/api/internal/admin/roles'),
    });

    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [labelDraft, setLabelDraft] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<RoleRow | null>(null);

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
        // Los selectores de rol también dependen de los habilitados
        queryClient.invalidateQueries({ queryKey: ['enabled-roles'] });
    };

    const toggleEnabled = async (role: RoleRow) => {
        setBusyKey(role.key);
        try {
            await apiRequest(`/api/internal/admin/roles/${role.key}`, {
                method: 'PATCH',
                body: { is_enabled: !role.is_enabled },
            });
            showToast(`Rol ${role.label} ${role.is_enabled ? 'desactivado' : 'activado'}`, 'success');
            refresh();
        } catch (err: any) {
            showToast(err.message || 'Error al actualizar el rol', 'error');
        } finally {
            setBusyKey(null);
        }
    };

    const saveLabel = async (role: RoleRow) => {
        const label = labelDraft.trim();
        if (!label || label === role.label) { setEditingKey(null); return; }
        setBusyKey(role.key);
        try {
            await apiRequest(`/api/internal/admin/roles/${role.key}`, {
                method: 'PATCH',
                body: { label },
            });
            showToast('Etiqueta actualizada', 'success');
            setEditingKey(null);
            refresh();
        } catch (err: any) {
            showToast(err.message || 'Error al renombrar', 'error');
        } finally {
            setBusyKey(null);
        }
    };

    const doDelete = async (role: RoleRow) => {
        setBusyKey(role.key);
        try {
            const res = await apiRequest(`/api/internal/admin/roles/${role.key}`, { method: 'DELETE' });
            showToast(`Rol eliminado (${res.blueprint_removed} blueprint, ${res.config_removed} config)`, 'success');
            setConfirmDelete(null);
            refresh();
        } catch (err: any) {
            showToast(err.message || 'Error al eliminar el rol', 'error');
        } finally {
            setBusyKey(null);
        }
    };

    return (
        <div className="p-8 min-h-screen">
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Shield className="text-primary" size={22} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Gestión de Roles</h1>
                    <p className="text-white/40 text-sm mt-1 max-w-2xl">
                        Activa, desactiva o elimina los roles del sistema. Los roles desactivados se ocultan de la matriz de
                        blueprint, de los selectores de usuario y de la vista del tenant. Los roles de <strong>sistema</strong>
                        (Administrador y SuperAdmin) no son editables.
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-32 text-white/40 gap-3">
                    <Loader2 className="animate-spin" size={20} /> Cargando roles...
                </div>
            ) : (
                <div className="space-y-3">
                    {(roles || []).map(role => (
                        <div
                            key={role.key}
                            className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                                role.is_enabled
                                    ? 'bg-white/[0.03] border-white/10'
                                    : 'bg-white/[0.01] border-white/5 opacity-60'
                            }`}
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${
                                    role.is_system ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-primary/10 border-primary/20 text-primary'
                                }`}>
                                    {role.is_system ? <Lock size={18} /> : <Shield size={18} />}
                                </div>
                                <div className="min-w-0">
                                    {editingKey === role.key ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                autoFocus
                                                value={labelDraft}
                                                onChange={e => setLabelDraft(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') saveLabel(role); if (e.key === 'Escape') setEditingKey(null); }}
                                                className="bg-white/5 border border-primary/40 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
                                            />
                                            <button onClick={() => saveLabel(role)} className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded-lg"><Check size={16} /></button>
                                            <button onClick={() => setEditingKey(null)} className="p-1.5 text-white/40 hover:bg-white/5 rounded-lg"><X size={16} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-white truncate">{role.label}</p>
                                            {!role.is_system && (
                                                <button
                                                    onClick={() => { setEditingKey(role.key); setLabelDraft(role.label); }}
                                                    className="p-1 text-white/30 hover:text-primary transition-colors"
                                                    title="Renombrar"
                                                >
                                                    <Pencil size={13} />
                                                </button>
                                            )}
                                            {role.is_system && (
                                                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">Sistema</span>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 mt-1 text-[11px] text-white/30 font-mono">
                                        <span>{role.key}</span>
                                        <span className="flex items-center gap-1"><Users size={11} /> {role.user_count}</span>
                                        <span className="flex items-center gap-1"><LayoutGrid size={11} /> {role.blueprint_count}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {/* Toggle enabled */}
                                <button
                                    onClick={() => toggleEnabled(role)}
                                    disabled={role.is_system || busyKey === role.key}
                                    title={role.is_system ? 'Rol de sistema (no se puede desactivar)' : (role.is_enabled ? 'Desactivar' : 'Activar')}
                                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                        role.is_enabled
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:border-emerald-400/60'
                                            : 'bg-white/5 text-white/40 border-white/10 hover:border-white/30'
                                    }`}
                                >
                                    {busyKey === role.key ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                                    {role.is_enabled ? 'Activo' : 'Inactivo'}
                                </button>

                                {/* Delete */}
                                <button
                                    onClick={() => setConfirmDelete(role)}
                                    disabled={role.is_system || role.user_count > 0 || busyKey === role.key}
                                    title={
                                        role.is_system ? 'No se puede eliminar un rol de sistema'
                                        : role.user_count > 0 ? `Tiene ${role.user_count} usuario(s)` : 'Eliminar rol'
                                    }
                                    className="p-2.5 rounded-xl text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Confirm delete modal */}
            {confirmDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
                    <div className="relative bg-[#0a192f] border border-white/10 w-full max-w-md rounded-3xl shadow-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                                <Trash2 size={22} />
                            </div>
                            <h3 className="text-xl font-bold text-white">Eliminar rol</h3>
                        </div>
                        <p className="text-white/60 text-sm mb-2">
                            Vas a eliminar el rol <strong className="text-white">{confirmDelete.label}</strong>.
                        </p>
                        <p className="text-white/40 text-xs mb-6 bg-white/5 border border-white/5 rounded-xl p-3">
                            Se desactivará y se limpiarán sus {confirmDelete.blueprint_count} fila(s) de blueprint y su configuración por tenant.
                            El valor del rol permanece en el sistema y puede reactivarse después.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white font-bold text-sm hover:bg-white/5 transition-all">
                                Cancelar
                            </button>
                            <button
                                onClick={() => doDelete(confirmDelete)}
                                disabled={busyKey === confirmDelete.key}
                                className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {busyKey === confirmDelete.key ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
