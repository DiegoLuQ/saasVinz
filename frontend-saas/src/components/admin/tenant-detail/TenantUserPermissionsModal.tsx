import React from 'react';
import {
    ShieldCheck,
    Building2,
    Eye,
    UserPlus,
    Pencil,
    Trash2,
    X,
    Activity,
    Settings
} from 'lucide-react';
import { getModuleIcon, PLACEHOLDER_MODULES } from './TenantModulesModal';

interface TenantUserPermissionsModalProps {
    isOpen: boolean;
    userEmail?: string;
    tenantName?: string;
    planLabel?: string;
    planAccentClass?: string;
    availableModules: any[];
    permissions: any[];
    saving: boolean;
    onClose: () => void;
    onTogglePermission: (moduleKey: string, action: string) => void;
    onSave: () => void;
}

const ACTIONS = [
    { key: 'view', label: 'Ver', icon: <Eye size={12} /> },
    { key: 'create', label: 'Crear', icon: <UserPlus size={12} /> },
    { key: 'edit', label: 'Editar', icon: <Pencil size={12} /> },
    { key: 'delete', label: 'Borrar', icon: <Trash2 size={12} /> }
];

export default function TenantUserPermissionsModal({
    isOpen,
    userEmail,
    tenantName,
    planLabel,
    planAccentClass,
    availableModules,
    permissions,
    saving,
    onClose,
    onTogglePermission,
    onSave
}: TenantUserPermissionsModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#061121]/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-4">
            <div className="bg-[#0a192f] border border-white/10 w-full max-w-3xl rounded-[24px] shadow-2xl overflow-hidden animate-zoom-in">
                <div className="p-6 border-b border-white/10 flex justify-between items-start bg-gradient-to-r from-purple-500/10 to-transparent">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white leading-none">Permisos Granulares</h3>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-xs text-white/40 font-medium">Configuración para:</span>
                                    <span className="text-xs text-white font-bold">{userEmail}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pl-14">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                                <Building2 size={12} className="text-white/40" />
                                <span className="text-[10px] font-bold text-white/80 uppercase tracking-wide">
                                    {tenantName || 'Sin Empresa'}
                                </span>
                            </div>
                            {planLabel && (
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${planAccentClass || 'bg-white/5 border-white/5 text-white/40'} bg-opacity-10 border-opacity-20`}>
                                    <span className="text-[10px] font-black uppercase tracking-widest">{planLabel}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-all text-sm"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6">
                    <div className="max-h-[60vh] overflow-y-auto pr-3 custom-scrollbar">
                        <div className="grid grid-cols-1 gap-3">
                            {availableModules.map(m => {
                                const perm = permissions.find(p => p.module_key === m.key);
                                const isPlaceholder = PLACEHOLDER_MODULES.includes(m.key);
                                const actions = isPlaceholder
                                    ? { view: false, create: false, edit: false, delete: false }
                                    : perm?.actions || { view: false, create: false, edit: false, delete: false };

                                return (
                                    <div
                                        key={m.key}
                                        className={`bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                                            isPlaceholder
                                                ? 'opacity-40 grayscale pointer-events-none bg-white/[0.02]'
                                                : 'hover:bg-white/[0.08]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2.5 rounded-xl border ${
                                                isPlaceholder
                                                    ? 'bg-white/5 text-white/20 border-white/5'
                                                    : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                            }`}>
                                                {isPlaceholder ? <X size={20} /> : getModuleIcon(m.key, 20)}
                                            </div>
                                            <div>
                                                <div className={`font-bold uppercase tracking-tight text-xs ${isPlaceholder ? 'text-white/30' : 'text-white'}`}>
                                                    {m.name}
                                                </div>
                                                <div className="text-[10px] text-white/30 italic line-clamp-1">
                                                    {isPlaceholder
                                                        ? 'Módulo en desarrollo - Próximamente.'
                                                        : (m.description || 'Configuración de acceso para este módulo.')}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5">
                                            {ACTIONS.map(action => (
                                                <button
                                                    key={action.key}
                                                    disabled={isPlaceholder}
                                                    onClick={() => !isPlaceholder && onTogglePermission(m.key, action.key)}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase flex items-center gap-2 border transition-all ${
                                                        isPlaceholder
                                                            ? 'bg-white/2 border-white/5 text-white/10 opacity-30 cursor-not-allowed'
                                                            : actions[action.key as keyof typeof actions]
                                                                ? 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                                                                : 'bg-white/5 border-white/10 text-white/20'
                                                    }`}
                                                >
                                                    {action.icon}
                                                    {action.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="w-full mt-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-[16px] font-bold uppercase tracking-wider shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40 transition-all flex items-center justify-center gap-3 active:scale-95 text-xs"
                    >
                        {saving ? <Activity className="animate-spin" size={18} /> : <Settings size={18} />}
                        GUARDAR CONFIGURACIÓN DE ACCESOS
                    </button>
                </div>
            </div>
        </div>
    );
}
