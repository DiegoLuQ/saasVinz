import React from 'react';
import { ArrowLeft, Save, Activity } from 'lucide-react';

interface BillingHeaderProps {
    tenantName?: string;
    saving: boolean;
    onBack: () => void;
    onCrumbTenants: () => void;
    onCrumbTenant: () => void;
    onSave: () => void;
}

export default function BillingHeader({
    tenantName,
    saving,
    onBack,
    onCrumbTenants,
    onCrumbTenant,
    onSave
}: BillingHeaderProps) {
    return (
        <>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/20 pt-4">
                <span className="cursor-pointer hover:text-primary transition-colors" onClick={onCrumbTenants}>Tenants</span>
                <span>/</span>
                <span className="cursor-pointer hover:text-white transition-colors" onClick={onCrumbTenant}>{tenantName}</span>
                <span>/</span>
                <span className="text-white/40">Facturación</span>
            </div>

            <div className="flex items-center justify-between pb-6 border-b border-white/5">
                <div className="flex items-center gap-5">
                    <button
                        onClick={onBack}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/70 transition-all"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <div className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded w-fit mb-2">
                            Gestión Financiera
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Facturación & Planes</h1>
                    </div>
                </div>
                <button
                    onClick={onSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all active:scale-95 disabled:opacity-50"
                >
                    {saving ? <Activity className="animate-spin" /> : <Save size={20} />}
                    GUARDAR CONFIGURACIÓN
                </button>
            </div>
        </>
    );
}
