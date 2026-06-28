import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserPlus, Pencil, UserCircle, Mail, Lock, Activity, Save } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import type { UserFormData } from './types';

interface TenantUserModalProps {
    isOpen: boolean;
    mode: 'create' | 'edit';
    formData: UserFormData;
    saving: boolean;
    onChange: (next: UserFormData) => void;
    onClose: () => void;
    onSave: () => void;
}

export default function TenantUserModal({
    isOpen,
    mode,
    formData,
    saving,
    onChange,
    onClose,
    onSave
}: TenantUserModalProps) {
    // Solo roles habilitados pueden asignarse (el SuperAdmin los gestiona).
    const { data: enabledRoles } = useQuery<{ key: string; label: string }[]>({
        queryKey: ['enabled-roles'],
        queryFn: () => apiRequest('/api/internal/admin/roles/enabled'),
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#061121]/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-4">
            <div className="bg-[#0a192f] border border-white/10 w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-zoom-in">
                <div className="p-8 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-blue-500/10 to-transparent">
                    <div>
                        <h3 className="text-2xl font-black text-white flex items-center gap-3">
                            {mode === 'create' ? <UserPlus size={28} className="text-blue-400" /> : <Pencil size={28} className="text-blue-400" />}
                            {mode === 'create' ? 'Nuevo Usuario' : 'Editar Usuario'}
                        </h3>
                        <p className="text-white/40 text-xs mt-1 font-medium">Configura los accesos para esta cuenta</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-widest">Nombre Completo</label>
                            <div className="relative">
                                <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => onChange({ ...formData, name: e.target.value })}
                                    className="w-full bg-[#0f2642] border border-white/10 rounded-2xl p-4 pl-12 text-white font-bold outline-none focus:border-blue-500 transition-all shadow-inner"
                                    placeholder="Juan Pérez"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-widest">Email de Acceso</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => onChange({ ...formData, email: e.target.value })}
                                    className="w-full bg-[#0f2642] border border-white/10 rounded-2xl p-4 pl-12 text-white font-bold outline-none focus:border-blue-500 transition-all shadow-inner"
                                    placeholder="correo@ejemplo.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-widest">
                                {mode === 'edit' ? 'Nueva Contraseña (Dejar vacío para mantener)' : 'Contraseña Temporal'}
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => onChange({ ...formData, password: e.target.value })}
                                    className="w-full bg-[#0f2642] border border-white/10 rounded-2xl p-4 pl-12 text-white font-bold outline-none focus:border-blue-500 transition-all shadow-inner"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-widest">Rol Asignado</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => onChange({ ...formData, role: e.target.value })}
                                    className="w-full bg-[#0f2642] border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500 transition-all"
                                >
                                    {(enabledRoles || []).filter(r => r.key !== 'creator').map(r => (
                                        <option key={r.key} value={r.key}>{r.label}</option>
                                    ))}
                                    {/* Si el rol actual quedó deshabilitado, mostrarlo igual para no perderlo */}
                                    {formData.role && !(enabledRoles || []).some(r => r.key === formData.role) && (
                                        <option value={formData.role}>{formData.role}</option>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-widest">Estado</label>
                                <div
                                    onClick={() => onChange({ ...formData, is_active: !formData.is_active })}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                        formData.is_active
                                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                            : 'bg-white/5 border-white/10 text-white/20'
                                    }`}
                                >
                                    <span className="text-xs font-black uppercase tracking-widest">
                                        {formData.is_active ? 'ACTIVO' : 'INACTIVO'}
                                    </span>
                                    <Activity size={16} className={formData.is_active ? 'animate-pulse' : ''} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="w-full py-5 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-[24px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                        {saving ? <Activity className="animate-spin" size={20} /> : <Save size={20} />}
                        {mode === 'create' ? 'CREAR USUARIO' : 'ACTUALIZAR DATOS'}
                    </button>
                </div>
            </div>
        </div>
    );
}
