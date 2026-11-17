"use client";

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/admin/api';
import { useAdminPlans, useAdminTenants, useAdminBootstrap } from '@/hooks/useAdminBootstrap';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import {
    Bell,
    Plus,
    X,
    Trash2,
    AlertCircle,
    Info,
    Trophy,
    Megaphone,
    ChevronDown,
    Layout,
    Pencil,
    Eye,
    Building2,
} from 'lucide-react';

const API_BASE_PATH = '/api/internal/creator/announcements';

interface Announcement {
    id: number;
    tenant_id: number | null;
    target_status: string | null;
    target_plan_id: number | null;
    type: 'info' | 'promo' | 'alert' | 'welcome';
    display_type: 'modal' | 'banner';
    title: string;
    content: string;
    is_active: boolean;
    show_once: boolean;
    must_read: boolean;
    priority: number;
    created_at: string;
    views_count?: number;
}

type SegmentFilter = 'all' | 'global' | 'tenant' | 'plan' | 'status';

export default function GlobalAnnouncementManager() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const subscriptionPlans = useAdminPlans();
    const tenants = useAdminTenants();
    const { refetch: refetchBootstrap } = useAdminBootstrap();

    const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
        queryKey: ['creator-announcements'],
        queryFn: () => apiRequest(API_BASE_PATH),
        staleTime: 15000,
    });

    const [isAdding, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [filter, setFilter] = useState<SegmentFilter>('all');

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        type: 'alert' as 'info' | 'promo' | 'alert' | 'welcome',
        display_type: 'modal' as 'modal' | 'banner',
        is_active: true,
        show_once: false,
        must_read: false,
        priority: 0,
        tenant_id: null as number | null,
        target_status: null as string | null,
        target_plan_id: null as number | null,
    });

    const planNameById = useMemo(() => {
        const map = new Map<number, string>();
        for (const p of subscriptionPlans || []) {
            map.set(p.id, p.name);
        }
        return map;
    }, [subscriptionPlans]);

    const tenantNameById = useMemo(() => {
        const map = new Map<number, string>();
        for (const t of tenants || []) {
            map.set(t.id, t.name);
        }
        return map;
    }, [tenants]);

    const refreshAll = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['creator-announcements'] }),
            queryClient.invalidateQueries({ queryKey: ['admin-health-metrics'] }),
            refetchBootstrap(),
        ]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isEditing && editingId) {
                await apiRequest(`${API_BASE_PATH}/${editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData),
                });
                showToast('Anuncio actualizado correctamente', 'success');
            } else {
                await apiRequest(API_BASE_PATH, {
                    method: 'POST',
                    body: JSON.stringify(formData),
                });
                showToast('Anuncio publicado correctamente', 'success');
            }
            handleCloseModal();
            await refreshAll();
        } catch (err: any) {
            showToast(err?.message || 'Error al guardar anuncio', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (ann: Announcement) => {
        setTogglingId(ann.id);
        try {
            const updated = await apiRequest(`${API_BASE_PATH}/${ann.id}/toggle`, {
                method: 'PATCH',
            });
            showToast(
                updated?.is_active ? `Anuncio "${ann.title}" activado` : `Anuncio "${ann.title}" pausado`,
                'success'
            );
            await refreshAll();
        } catch (err: any) {
            showToast(err?.message || 'No se pudo cambiar el estado', 'error');
        } finally {
            setTogglingId(null);
        }
    };

    const handleEdit = (ann: Announcement) => {
        setFormData({
            title: ann.title,
            content: ann.content,
            type: ann.type,
            display_type: ann.display_type,
            is_active: ann.is_active,
            show_once: ann.show_once,
            must_read: ann.must_read,
            priority: ann.priority,
            tenant_id: ann.tenant_id,
            target_status: ann.target_status,
            target_plan_id: ann.target_plan_id,
        });
        setEditingId(ann.id);
        setIsEditing(true);
        setIsAdding(true);
    };

    const handleCloseModal = () => {
        setIsAdding(false);
        setIsEditing(false);
        setEditingId(null);
        setFormData({
            title: '',
            content: '',
            type: 'alert',
            display_type: 'modal',
            is_active: true,
            show_once: false,
            must_read: false,
            priority: 0,
            tenant_id: null,
            target_status: null,
            target_plan_id: null,
        });
    };

    const handleDeleteConfirmed = async (id: number) => {
        try {
            await apiRequest(`${API_BASE_PATH}/${id}`, { method: 'DELETE' });
            showToast('Anuncio eliminado', 'success');
            setConfirmDeleteId(null);
            await refreshAll();
        } catch (err: any) {
            showToast(err?.message || 'Error al eliminar anuncio', 'error');
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'info':
                return <Info size={16} className="text-blue-400" />;
            case 'promo':
                return <Trophy size={16} className="text-amber-400" />;
            case 'alert':
                return <AlertCircle size={16} className="text-red-400" />;
            case 'welcome':
                return <Megaphone size={16} className="text-emerald-400" />;
            default:
                return <Bell size={16} />;
        }
    };

    const filteredAnnouncements = announcements.filter((a) => {
        if (filter === 'global') return a.tenant_id === null && a.target_status === null && a.target_plan_id === null;
        if (filter === 'tenant') return a.tenant_id !== null;
        if (filter === 'plan') return a.target_plan_id !== null;
        if (filter === 'status') return a.target_status !== null;
        return true;
    });

    return (
        <div className="bg-[#0a192f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-[600px] max-h-[760px]">
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-white/[0.02] flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <Bell size={16} className="text-primary" />
                        Alertas y Anuncios Globales
                    </h2>
                    <p className="text-[11px] text-white/40 font-medium mt-1">
                        Gestión de alertas globales, por plan, por estado o dirigidas a un crematorio específico.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-wrap bg-white/5 p-1 rounded-xl border border-white/5">
                        {([
                            ['all', 'Todos'],
                            ['global', 'Global'],
                            ['tenant', 'Crematorio'],
                            ['plan', 'Plan'],
                            ['status', 'Estado'],
                        ] as const).map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => setFilter(key)}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                    filter === key
                                        ? 'bg-primary text-white shadow-lg'
                                        : 'text-white/40 hover:text-white/75'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all shadow-lg shadow-primary/20 active:scale-95"
                    >
                        <Plus size={16} />
                        Crear Anuncio
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <AnimatePresence mode="popLayout">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                    ) : filteredAnnouncements.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-white/25 space-y-3">
                            <Layout size={44} strokeWidth={1.2} />
                            <p className="text-sm font-medium">No hay anuncios para este filtro</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {filteredAnnouncements.map((ann) => {
                                const planLabel = ann.target_plan_id
                                    ? planNameById.get(ann.target_plan_id) || `#${ann.target_plan_id}`
                                    : null;
                                const tenantLabel = ann.tenant_id
                                    ? tenantNameById.get(ann.tenant_id) || `#${ann.tenant_id}`
                                    : null;

                                return (
                                    <motion.div
                                        key={ann.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        className={`group border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                                            ann.is_active
                                                ? 'bg-white/5 border-white/10 hover:bg-white/[0.08] hover:border-primary/25'
                                                : 'bg-white/[0.02] border-white/5 opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3.5 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                                                {getIcon(ann.type)}
                                            </div>
                                            <div className="min-w-0 space-y-1">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <h3 className="text-sm font-bold text-white truncate">{ann.title}</h3>
                                                    {!ann.is_active && (
                                                        <span className="text-[9px] bg-white/10 text-white/50 px-2 py-0.5 rounded-full font-black uppercase">
                                                            Pausado
                                                        </span>
                                                    )}
                                                    {tenantLabel && (
                                                        <span className="inline-flex items-center gap-1 text-[9px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full font-black uppercase">
                                                            <Building2 size={10} />
                                                            {tenantLabel}
                                                        </span>
                                                    )}
                                                    {ann.target_status && (
                                                        <span className="text-[9px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-black uppercase">
                                                            Estado: {ann.target_status}
                                                        </span>
                                                    )}
                                                    {planLabel && (
                                                        <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-black uppercase">
                                                            Plan {planLabel}
                                                        </span>
                                                    )}
                                                    {!tenantLabel && !ann.target_status && !planLabel && (
                                                        <span className="text-[9px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-black uppercase">
                                                            Global
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-white/50 line-clamp-1">{ann.content}</p>
                                                <div className="flex items-center gap-3 text-[10px] text-white/35">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Eye size={11} />
                                                        <strong className="text-white/70">{ann.views_count ?? 0}</strong> lecturas
                                                    </span>
                                                    <span>·</span>
                                                    <span>{ann.display_type === 'modal' ? 'Modal' : 'Banner'}</span>
                                                    {ann.must_read && (
                                                        <>
                                                            <span>·</span>
                                                            <span className="text-rose-400 font-bold">Lectura obligatoria</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                            {/* Switch rápido Activo / Inactivo */}
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={ann.is_active}
                                                disabled={togglingId === ann.id}
                                                onClick={() => handleToggleActive(ann)}
                                                title={ann.is_active ? 'Pausar anuncio' : 'Activar anuncio'}
                                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer disabled:opacity-40 ${
                                                    ann.is_active ? 'bg-emerald-500' : 'bg-white/15'
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                        ann.is_active ? 'translate-x-4.5' : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>

                                            <button
                                                onClick={() => handleEdit(ann)}
                                                className="p-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors border border-white/5"
                                                title="Editar anuncio"
                                            >
                                                <Pencil size={14} />
                                            </button>

                                            {confirmDeleteId === ann.id ? (
                                                <div className="flex items-center gap-1 bg-rose-500/15 border border-rose-500/30 rounded-lg px-2 py-1">
                                                    <button
                                                        onClick={() => handleDeleteConfirmed(ann.id)}
                                                        className="text-[10px] font-black text-rose-400 hover:text-rose-300"
                                                    >
                                                        Confirmar
                                                    </button>
                                                    <span className="text-white/20">|</span>
                                                    <button
                                                        onClick={() => setConfirmDeleteId(null)}
                                                        className="text-[10px] font-bold text-white/50 hover:text-white"
                                                    >
                                                        No
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmDeleteId(ann.id)}
                                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                                    title="Eliminar anuncio"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Create / Edit Modal */}
            <AnimatePresence>
                {isAdding && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 12 }}
                            className="bg-[#0a192f] border border-white/10 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto"
                        >
                            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight italic">
                                        {isEditing ? 'Editar' : 'Nueva'}{' '}
                                        <span className="text-primary NOT-italic">Alerta/Anuncio</span>
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">
                                            Título del Anuncio
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary/50 transition-all outline-none"
                                            placeholder="Ej: Mantenimiento Programado"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">
                                            Contenido / Mensaje
                                        </label>
                                        <textarea
                                            required
                                            value={formData.content}
                                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary/50 transition-all outline-none h-24 resize-none"
                                            placeholder="Detalles del anuncio..."
                                        />
                                    </div>

                                    {/* Segmentación por Crematorio específico */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                            <Building2 size={13} className="text-sky-400" />
                                            Crematorio Destinatario (Opcional)
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={formData.tenant_id || ''}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        tenant_id: e.target.value ? parseInt(e.target.value) : null,
                                                    })
                                                }
                                                className="w-full bg-[#0f1f3a]/60 border-2 border-white/15 hover:border-primary/50 focus:border-primary rounded-2xl px-4 py-3 pr-10 text-sm text-white font-medium transition-all outline-none appearance-none cursor-pointer"
                                            >
                                                <option value="" className="bg-[#0a192f] text-white">
                                                    🌐 Todos los crematorios (según filtros abajo)
                                                </option>
                                                {(tenants || []).map((t) => (
                                                    <option key={t.id} value={t.id} className="bg-[#0a192f] text-white">
                                                        🏢 {t.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
                                                size={18}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">
                                                Segmentación por Estado
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={formData.target_status || ''}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, target_status: e.target.value || null })
                                                    }
                                                    className="w-full bg-[#0f1f3a]/60 border-2 border-white/15 hover:border-primary/50 focus:border-primary rounded-2xl px-4 py-3 pr-10 text-sm text-white font-medium transition-all outline-none appearance-none cursor-pointer"
                                                >
                                                    <option value="" className="bg-[#0a192f] text-white">
                                                        Cualquier Estado
                                                    </option>
                                                    <option value="pending" className="bg-[#0a192f] text-white">
                                                        Pendiente
                                                    </option>
                                                    <option value="active" className="bg-[#0a192f] text-white">
                                                        Activo
                                                    </option>
                                                    <option value="suspended" className="bg-[#0a192f] text-white">
                                                        Suspendido
                                                    </option>
                                                    <option value="inactive" className="bg-[#0a192f] text-white">
                                                        Inactivo
                                                    </option>
                                                </select>
                                                <ChevronDown
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
                                                    size={18}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">
                                                Segmentación por Plan
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={formData.target_plan_id || ''}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            target_plan_id: e.target.value ? parseInt(e.target.value) : null,
                                                        })
                                                    }
                                                    className="w-full bg-[#0f1f3a]/60 border-2 border-white/15 hover:border-primary/50 focus:border-primary rounded-2xl px-4 py-3 pr-10 text-sm text-white font-medium transition-all outline-none appearance-none cursor-pointer"
                                                >
                                                    <option value="" className="bg-[#0a192f] text-white">
                                                        Todos los Planes
                                                    </option>
                                                    {subscriptionPlans.map((plan) => (
                                                        <option
                                                            key={plan.id}
                                                            value={plan.id}
                                                            className="bg-[#0a192f] text-white"
                                                        >
                                                            Plan {plan.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
                                                    size={18}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">
                                                Tipo de Mensaje
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={formData.type}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, type: e.target.value as any })
                                                    }
                                                    className="w-full bg-[#0f1f3a]/60 border-2 border-white/15 hover:border-primary/50 focus:border-primary rounded-2xl px-4 py-3 pr-10 text-sm text-white font-medium transition-all outline-none appearance-none cursor-pointer"
                                                >
                                                    <option value="info" className="bg-[#0a192f] text-white">
                                                        Informativo
                                                    </option>
                                                    <option value="promo" className="bg-[#0a192f] text-white">
                                                        Promocional
                                                    </option>
                                                    <option value="alert" className="bg-[#0a192f] text-white">
                                                        Alerta Crítica
                                                    </option>
                                                    <option value="welcome" className="bg-[#0a192f] text-white">
                                                        Bienvenida
                                                    </option>
                                                </select>
                                                <ChevronDown
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
                                                    size={18}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">
                                                Formato de Vista
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={formData.display_type}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, display_type: e.target.value as any })
                                                    }
                                                    className="w-full bg-[#0f1f3a]/60 border-2 border-white/15 hover:border-primary/50 focus:border-primary rounded-2xl px-4 py-3 pr-10 text-sm text-white font-medium transition-all outline-none appearance-none cursor-pointer"
                                                >
                                                    <option value="banner" className="bg-[#0a192f] text-white">
                                                        Banner Superior
                                                    </option>
                                                    <option value="modal" className="bg-[#0a192f] text-white">
                                                        Modal Emergente
                                                    </option>
                                                </select>
                                                <ChevronDown
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
                                                    size={18}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex bg-white/5 border border-white/5 rounded-2xl p-4 items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-500">
                                                <AlertCircle size={16} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-white">Lectura Obligatoria</p>
                                                <p className="text-[10px] text-white/40">
                                                    El usuario no podrá cerrar la alerta hasta confirmarla.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, must_read: !formData.must_read })}
                                            className={`w-12 h-6 rounded-full transition-all relative ${
                                                formData.must_read ? 'bg-primary' : 'bg-white/10'
                                            }`}
                                        >
                                            <div
                                                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                                                    formData.must_read ? 'right-1' : 'left-1'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                                >
                                    {saving
                                        ? 'Guardando...'
                                        : isEditing
                                          ? 'Guardar Cambios'
                                          : 'Publicar Anuncio'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
