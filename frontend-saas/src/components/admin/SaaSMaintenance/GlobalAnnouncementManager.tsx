"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL, apiRequest } from '@/lib/admin/api';
import { useAdminAnnouncements, useAdminPlans, useAdminBootstrap } from '@/hooks/useAdminBootstrap';
import {
    Bell,
    Plus,
    X,
    Trash2,
    AlertCircle,
    Info,
    Trophy,
    Megaphone,
    Search,
    Filter,
    ChevronDown,
    Layout,
    HelpCircle,
    Pencil
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
}

interface SubscriptionPlan {
    id: number;
    name: string;
}

export default function GlobalAnnouncementManager() {
    const bootstrapAnnouncements = useAdminAnnouncements();
    const bootstrapPlans = useAdminPlans();
    const { refetch: refetchBootstrap } = useAdminBootstrap();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [filter, setFilter] = useState<'all' | 'global' | 'plan' | 'status'>('all');

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        type: 'alert' as 'info' | 'promo' | 'alert' | 'welcome',
        display_type: 'modal' as 'modal' | 'banner',
        is_active: true,
        show_once: false,
        must_read: false,
        priority: 0,
        target_status: null as string | null,
        target_plan_id: null as number | null
    });

    const fetchAnnouncements = async () => {
        setIsLoading(true);
        try {
            await refetchBootstrap();
        } catch (err: any) {
            console.error("Error refetching bootstrap for announcements:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (bootstrapAnnouncements) {
            setAnnouncements(bootstrapAnnouncements);
            setIsLoading(false);
        }
    }, [bootstrapAnnouncements]);

    useEffect(() => {
        if (bootstrapPlans) {
            setSubscriptionPlans(bootstrapPlans);
        }
    }, [bootstrapPlans]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing && editingId) {
                await apiRequest(`${API_BASE_PATH}/${editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
            } else {
                await apiRequest(API_BASE_PATH, {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
            }
            handleCloseModal();
            fetchAnnouncements();
        } catch (err) {
            console.error("Error saving announcement", err);
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
            target_status: ann.target_status,
            target_plan_id: ann.target_plan_id
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
            target_status: null,
            target_plan_id: null
        });
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar este anuncio?')) return;
        try {
            await apiRequest(`${API_BASE_PATH}/${id}`, {
                method: 'DELETE'
            });
            fetchAnnouncements();
        } catch (err) {
            console.error("Error deleting announcement", err);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'info': return <Info size={16} className="text-blue-400" />;
            case 'promo': return <Trophy size={16} className="text-amber-400" />;
            case 'alert': return <AlertCircle size={16} className="text-red-400" />;
            case 'welcome': return <Megaphone size={16} className="text-emerald-400" />;
            default: return <Bell size={16} />;
        }
    };

    const filteredAnnouncements = announcements.filter(a => {
        if (filter === 'global') return a.target_status === null && a.target_plan_id === null;
        if (filter === 'plan') return a.target_plan_id !== null;
        if (filter === 'status') return a.target_status !== null;
        return true;
    });

    return (
        <div className="bg-[#0a192f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[600px]">
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <Bell size={16} className="text-primary" />
                        Alertas y Anuncios Globales
                    </h2>
                    <p className="text-[10px] text-white/30 font-medium mt-1">Gestión de alertas para inquilinos y segmentos.</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                        {(['all', 'global', 'plan', 'status'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-primary text-white shadow-lg' : 'text-white/30 hover:text-white/60'
                                    }`}
                            >
                                {f === 'all' ? 'Todos' : f === 'global' ? 'Global' : f === 'plan' ? 'Por Plan' : 'Por Estado'}
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
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : filteredAnnouncements.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-white/20 space-y-4">
                            <Layout size={48} strokeWidth={1} />
                            <p className="text-sm font-medium">No hay anuncios configurados</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {filteredAnnouncements.map((ann) => (
                                <motion.div
                                    key={ann.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="group bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 transition-all hover:border-primary/20"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center`}>
                                            {getIcon(ann.type)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="text-sm font-bold text-white">{ann.title}</h3>
                                                {ann.target_status ? (
                                                    <span className="text-[8px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">⚠️ ESTADO: {ann.target_status}</span>
                                                ) : ann.target_plan_id ? (
                                                    <span className="text-[8px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">📦 PLAN #{ann.target_plan_id}</span>
                                                ) : (
                                                    <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">🌐 GLOBAL</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-white/40 line-clamp-1">{ann.content}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(ann)}
                                            className="p-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors border border-white/5"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(ann.id)}
                                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {isAdding && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-[#0a192f] border border-white/10 rounded-[40px] shadow-2xl max-w-2xl w-full overflow-hidden"
                        >
                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
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
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Título del Anuncio</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary/50 transition-all outline-none"
                                            placeholder="Ej: Mantenimiento Programado"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Contenido / Mensaje</label>
                                        <textarea
                                            required
                                            value={formData.content}
                                            onChange={e => setFormData({ ...formData, content: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary/50 transition-all outline-none h-24 resize-none"
                                            placeholder="Detalles del anuncio..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                                <span className="text-lg">⚠️</span>
                                                Segmentación por Estado
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={formData.target_status || ''}
                                                    onChange={e => setFormData({ ...formData, target_status: e.target.value || null })}
                                                    className="w-full bg-[#0f1f3a]/60 border-2 border-white/20 hover:border-primary/50 focus:border-primary rounded-2xl px-4 py-3.5 pr-10 text-sm text-white font-medium transition-all outline-none appearance-none cursor-pointer shadow-sm"
                                                    style={{ backgroundImage: 'none' }}
                                                >
                                                    <option value="" className="bg-[#0a192f] text-white">🌍 Cualquier Estado</option>
                                                    <option value="pending" className="bg-[#0a192f] text-white">⏳ Pendiente</option>
                                                    <option value="active" className="bg-[#0a192f] text-white">✅ Activo</option>
                                                    <option value="suspended" className="bg-[#0a192f] text-white">🚫 Suspendido</option>
                                                    <option value="inactive" className="bg-[#0a192f] text-white">💤 Inactivo</option>
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={18} />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                                <span className="text-lg">🎯</span>
                                                Segmentación por Plan
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={formData.target_plan_id || ''}
                                                    onChange={e => setFormData({ ...formData, target_plan_id: e.target.value ? parseInt(e.target.value) : null })}
                                                    className="w-full bg-[#0f1f3a]/60 border-2 border-white/20 hover:border-primary/50 focus:border-primary rounded-2xl px-4 py-3.5 pr-10 text-sm text-white font-medium transition-all outline-none appearance-none cursor-pointer shadow-sm"
                                                    style={{ backgroundImage: 'none' }}
                                                >
                                                    <option value="" className="bg-[#0a192f] text-white">🌐 Todos los Planes</option>
                                                    {subscriptionPlans.map(plan => (
                                                        <option key={plan.id} value={plan.id} className="bg-[#0a192f] text-white">
                                                            📦 {plan.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={18} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                                <span className="text-lg">📢</span>
                                                Tipo de Mensaje
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={formData.type}
                                                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                                    className="w-full bg-[#0f1f3a]/60 border-2 border-white/20 hover:border-primary/50 focus:border-primary rounded-2xl px-4 py-3.5 pr-10 text-sm text-white font-medium transition-all outline-none appearance-none cursor-pointer shadow-sm"
                                                    style={{ backgroundImage: 'none' }}
                                                >
                                                    <option value="info" className="bg-[#0a192f] text-white">ℹ️ Informativo</option>
                                                    <option value="promo" className="bg-[#0a192f] text-white">🎁 Promocional</option>
                                                    <option value="alert" className="bg-[#0a192f] text-white">🚨 Alerta Crítica</option>
                                                    <option value="welcome" className="bg-[#0a192f] text-white">👋 Bienvenida</option>
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={18} />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                                <span className="text-lg">💬</span>
                                                Formato de Vista
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={formData.display_type}
                                                    onChange={e => setFormData({ ...formData, display_type: e.target.value as any })}
                                                    className="w-full bg-[#0f1f3a]/60 border-2 border-white/20 hover:border-primary/50 focus:border-primary rounded-2xl px-4 py-3.5 pr-10 text-sm text-white font-medium transition-all outline-none appearance-none cursor-pointer shadow-sm"
                                                    style={{ backgroundImage: 'none' }}
                                                >
                                                    <option value="banner" className="bg-[#0a192f] text-white">📌 Banner Superior</option>
                                                    <option value="modal" className="bg-[#0a192f] text-white">🪟 Modal Emergente</option>
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={18} />
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
                                                <p className="text-[10px] text-white/40">El usuario no podrá cerrar la alerta hasta leerla.</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, must_read: !formData.must_read })}
                                            className={`w-12 h-6 rounded-full transition-all relative ${formData.must_read ? 'bg-primary' : 'bg-white/10'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.must_read ? 'right-1' : 'left-1'}`} />
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest py-4 rounded-3xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                                >
                                    {isEditing ? 'Guardar Cambios' : 'Publicar Anuncio Global'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}


