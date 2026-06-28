"use client";

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/admin/api';
import { Megaphone, Plus, Trash2, Edit3, Bell, Info, Gift, AlertTriangle, Activity } from 'lucide-react';

interface Announcement {
    id: number;
    title: string;
    content: string;
    type: string;
    display_type: string;
    is_active: boolean;
    show_once: boolean;
    must_read: boolean;
    priority: number;
}

interface AnnouncementSectionProps {
    tenantId: number;
}

export default function AnnouncementSection({ tenantId }: AnnouncementSectionProps) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        type: 'pending_info',
        display_type: 'modal',
        is_active: true,
        show_once: false,
        must_read: false,
        priority: 0,
        tenant_id: tenantId
    });

    useEffect(() => {
        fetchAnnouncements();
    }, [tenantId]);

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            const data = await apiRequest(`/api/internal/creator/announcements/?tenant_id=${tenantId}`);
            setAnnouncements(data);
        } catch (err) {
            console.error("Error fetching announcements", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await apiRequest('/api/internal/creator/announcements/', {
                method: 'POST',
                body: formData
            });
            setShowForm(false);
            setFormData({
                title: '',
                content: '',
                type: 'pending_info',
                display_type: 'modal',
                is_active: true,
                show_once: false,
                must_read: false,
                priority: 0,
                tenant_id: tenantId
            });
            fetchAnnouncements();
        } catch (err) {
            console.error("Error saving announcement", err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("¿Eliminar este anuncio?")) return;
        try {
            await apiRequest(`/api/internal/creator/announcements/${id}`, {
                method: 'DELETE'
            });
            fetchAnnouncements();
        } catch (err) {
            console.error("Error deleting announcement", err);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'pending_info': return <Info size={16} className="text-blue-400" />;
            case 'suspended_block': return <AlertTriangle size={16} className="text-red-400" />;
            case 'welcome': return <Gift size={16} className="text-primary" />;
            case 'promotion': return <Megaphone size={16} className="text-amber-400" />;
            default: return <Bell size={16} className="text-primary" />;
        }
    };

    return (
        <div className="bg-[#0a192f] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl mt-8">
            <div className="p-6 border-b border-white/10 bg-gradient-to-br from-primary/5 to-transparent flex justify-between items-center">
                <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                    <Megaphone size={18} className="text-primary" />
                    Panel de Anuncios
                </h2>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-all"
                >
                    <Plus size={18} />
                </button>
            </div>

            <div className="p-8">
                {showForm && (
                    <div className="bg-[#0f2642] border border-white/10 rounded-2xl p-6 mb-8 space-y-4 animate-in fade-in slide-in-from-top-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 block">Título del Mensaje</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-[#0a192f] border border-white/5 rounded-xl p-3 text-white outline-none focus:border-primary transition-all font-bold text-sm"
                                    placeholder="Ej: Cuenta en revisión"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 block">Contenido del Mensaje</label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full bg-[#0a192f] border border-white/5 rounded-xl p-3 text-white outline-none focus:border-primary transition-all font-medium text-sm min-h-[100px]"
                                    placeholder="Describe lo que el cliente verá..."
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 block">Tipo</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full bg-[#0a192f] border border-white/5 rounded-xl p-3 text-white outline-none focus:border-primary transition-all font-bold text-xs"
                                >
                                    <option value="pending_info">Información Pendiente</option>
                                    <option value="welcome">Bienvenida</option>
                                    <option value="promotion">Promoción</option>
                                    <option value="update">Actualización</option>
                                    <option value="suspended_block">Aviso Suspensión</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 block">Visualización</label>
                                <select
                                    value={formData.display_type}
                                    onChange={(e) => setFormData({ ...formData, display_type: e.target.value })}
                                    className="w-full bg-[#0a192f] border border-white/5 rounded-xl p-3 text-white outline-none focus:border-primary transition-all font-bold text-xs"
                                >
                                    <option value="modal">Modal (Emergente)</option>
                                    <option value="banner">Banner (Superior)</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-4 border-t border-white/5">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={formData.show_once}
                                    onChange={(e) => setFormData({ ...formData, show_once: e.target.checked })}
                                    className="hidden"
                                />
                                <div className={`w-10 h-5 rounded-full relative transition-all ${formData.show_once ? 'bg-primary' : 'bg-white/10'}`}>
                                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${formData.show_once ? 'right-1' : 'left-1'}`} />
                                </div>
                                <span className="text-[10px] font-black text-white/40 group-hover:text-white transition-colors uppercase tracking-widest">Mostrar solo una vez</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={formData.must_read}
                                    onChange={(e) => setFormData({ ...formData, must_read: e.target.checked })}
                                    className="hidden"
                                />
                                <div className={`w-10 h-5 rounded-full relative transition-all ${formData.must_read ? 'bg-red-500' : 'bg-white/10'}`}>
                                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${formData.must_read ? 'right-1' : 'left-1'}`} />
                                </div>
                                <span className="text-[10px] font-black text-white/40 group-hover:text-white transition-colors uppercase tracking-widest">Lectura Obligatoria</span>
                            </label>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={() => setShowForm(false)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !formData.title || !formData.content}
                                className="flex-[2] py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-20"
                            >
                                {saving ? <Activity className="animate-spin" size={16} /> : 'GUARDAR ANUNCIO'}
                            </button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-12 space-y-4 animate-pulse">
                        <Activity className="text-primary animate-spin" size={32} />
                        <span className="text-[10px] font-black text-white/20 tracking-widest">CARGANDO ANUNCIOS...</span>
                    </div>
                ) : announcements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-white/5 rounded-[32px]">
                        <Bell className="text-white/5 mb-4" size={48} />
                        <h4 className="text-white/40 font-black text-sm uppercase tracking-widest">Sin anuncios activos</h4>
                        <p className="text-white/20 text-xs mt-1">Crea un mensaje para que el tenant lo vea al ingresar.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {announcements.map((a) => (
                            <div key={a.id} className="group bg-[#0f2642] border border-white/5 hover:border-white/10 rounded-2xl p-5 flex items-center justify-between transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-[#0a192f] rounded-xl flex items-center justify-center border border-white/5 group-hover:border-primary/20 transition-all">
                                        {getIcon(a.type)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-black text-white">{a.title}</h4>
                                            {a.show_once && <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black tracking-tighter">UNA VEZ</span>}
                                            {a.must_read && <span className="text-[8px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded font-black tracking-tighter">OBLIGATORIO</span>}
                                        </div>
                                        <p className="text-xs text-white/40 line-clamp-1">{a.content}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleDelete(a.id)}
                                        className="p-2 hover:bg-red-500/10 text-white/20 hover:text-red-500 rounded-lg transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

