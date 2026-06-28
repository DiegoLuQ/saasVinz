import React from 'react';
import {
    Box,
    LayoutDashboard,
    Users as UsersIcon,
    Dog,
    Palette,
    Flame,
    ShoppingBag,
    CreditCard,
    FileText,
    Settings,
    X,
    Activity,
    CheckCircle
} from 'lucide-react';
import type { ModuleData } from './types';

const ROLES = [
    { id: 'admin', label: 'Admin' },
    { id: 'recepcion', label: 'Recepción' },
    { id: 'operador_cremacion', label: 'Op. Cremación' },
    { id: 'contabilidad', label: 'Contabilidad' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'auditor', label: 'Auditor' },
    { id: 'operator', label: 'Operador Gen.' }
];

const PLACEHOLDER_MODULES = ['reportes', 'comunicaciones', 'marketing', 'auditoria'];

const getModuleIcon = (key: string, size = 16) => {
    switch (key) {
        case 'dashboard': return <LayoutDashboard size={size} />;
        case 'clientes': return <UsersIcon size={size} />;
        case 'mascotas': return <Dog size={size} />;
        case 'servicios': return <Palette size={size} />;
        case 'ordenes': return <Flame size={size} />;
        case 'inventario': return <ShoppingBag size={size} />;
        case 'pagos': return <CreditCard size={size} />;
        case 'certificados': return <FileText size={size} />;
        case 'configuracion': return <Settings size={size} />;
        default: return <Box size={size} />;
    }
};

interface TenantModulesModalProps {
    isOpen: boolean;
    tenantName?: string;
    moduleData: ModuleData;
    moduleRole: string;
    saving: boolean;
    onClose: () => void;
    onChangeRole: (role: string) => void;
    onToggleOverride: (moduleKey: string, isActive: boolean) => void;
    onSave: () => void;
}

export default function TenantModulesModal({
    isOpen,
    tenantName,
    moduleData,
    moduleRole,
    saving,
    onClose,
    onChangeRole,
    onToggleOverride,
    onSave
}: TenantModulesModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#061121]/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
            <div className="bg-[#0a192f] border border-white/10 w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-zoom-in">
                <div className="p-8 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-purple-500/10 to-transparent">
                    <div>
                        <h3 className="text-2xl font-black text-white flex items-center gap-3">
                            <Box size={28} className="text-purple-400" />
                            Módulos por Empresa
                        </h3>
                        <p className="text-white/40 text-xs mt-1 font-medium">
                            Habilitar funciones globales para {tenantName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="col-span-1 md:col-span-2 bg-[#0f2642] p-6 rounded-3xl border border-white/10 mb-2">
                        <label className="text-[10px] uppercase font-black text-white/30 mb-3 block tracking-widest">
                            Configurar Módulos para el Rol:
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {ROLES.map(role => (
                                <button
                                    key={role.id}
                                    onClick={() => onChangeRole(role.id)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                        moduleRole === role.id
                                            ? 'bg-primary text-white shadow-lg shadow-primary/25'
                                            : 'bg-white/5 text-white/40 hover:bg-white/10'
                                    }`}
                                >
                                    {role.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {moduleData.all_modules.map((m: any) => {
                            const inPlan = moduleData.plan_modules.includes(m.key);
                            const override = moduleData.overrides.find((o: any) => o.module_key === m.key && o.role === moduleRole);
                            const isPlaceholder = PLACEHOLDER_MODULES.includes(m.key);
                            const active = isPlaceholder ? false : (override ? override.is_active : inPlan);

                            return (
                                <div
                                    key={m.key}
                                    onClick={() => !isPlaceholder && onToggleOverride(m.key, !active)}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                                        isPlaceholder
                                            ? 'bg-white/5 border-white/5 opacity-50 grayscale pointer-events-none'
                                            : active
                                                ? 'bg-purple-500/10 border-purple-500/30'
                                                : 'bg-white/5 border-white/10 opacity-60 grayscale hover:grayscale-0 hover:bg-white/10'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className={`p-2 rounded-lg ${
                                            isPlaceholder
                                                ? 'bg-white/10 text-white/20'
                                                : active
                                                    ? 'bg-purple-500 text-white'
                                                    : 'bg-white/10 text-white/40'
                                        }`}>
                                            {isPlaceholder ? <X size={16} /> : getModuleIcon(m.key, 16)}
                                        </div>
                                        <div className={`w-10 h-5 rounded-full relative transition-all ${active ? 'bg-purple-500' : 'bg-white/10'}`}>
                                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${active ? 'right-1' : 'left-1'}`} />
                                        </div>
                                    </div>
                                    <div className="font-bold text-sm text-white">{m.name}</div>
                                    <div className="text-[10px] text-white/40 mt-1 line-clamp-2">{m.description}</div>

                                    {inPlan && !override && (
                                        <div className="mt-3 text-[9px] font-black italic text-primary/60 tracking-widest">EN PLAN</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="pt-6 border-t border-white/10 flex gap-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white/50 rounded-2xl font-bold transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onSave}
                            disabled={saving}
                            className="flex-[3] py-4 bg-purple-500 hover:bg-purple-600 text-white rounded-2xl font-black shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            {saving ? <Activity className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                            APLICAR CONFIGURACIÓN
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export { getModuleIcon, PLACEHOLDER_MODULES };
