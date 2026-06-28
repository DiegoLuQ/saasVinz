import React from 'react';
import { X, Activity, Users, Dog, Package, ShoppingCart, Briefcase } from 'lucide-react';
import type { AdminBootstrapTenant } from '@/hooks/useAdminBootstrap';

interface TenantStatsModalProps {
    isOpen: boolean;
    tenant: AdminBootstrapTenant | null;
    onClose: () => void;
}

export default function TenantStatsModal({ isOpen, tenant, onClose }: TenantStatsModalProps) {
    if (!isOpen || !tenant) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#1a1f2e] border border-white/10 rounded-[2rem] w-full max-w-3xl overflow-hidden shadow-2xl scale-in-95 zoom-in-95 duration-200 animate-in">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                            <Activity size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">{tenant.name}</h3>
                            <p className="text-white/40 text-sm">Estadísticas de Recursos</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <div className="text-white/40 text-xs font-bold uppercase mb-1">Clientes</div>
                            <div className="text-2xl font-black flex items-center gap-2">
                                <Users size={20} className="text-blue-400" />
                                {tenant.resources?.customers || 0}
                            </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <div className="text-white/40 text-xs font-bold uppercase mb-1">Mascotas</div>
                            <div className="text-2xl font-black flex items-center gap-2">
                                <Dog size={20} className="text-orange-400" />
                                {tenant.resources?.pets || 0}
                            </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <div className="text-white/40 text-xs font-bold uppercase mb-1">Productos</div>
                            <div className="text-2xl font-black flex items-center gap-2">
                                <Package size={20} className="text-purple-400" />
                                {tenant.resources?.products || 0}
                            </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <div className="text-white/40 text-xs font-bold uppercase mb-1">Órdenes Total</div>
                            <div className="text-2xl font-black flex items-center gap-2">
                                <ShoppingCart size={20} className="text-green-400" />
                                {tenant.resources?.orders?.total || 0}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="font-bold mb-4 flex items-center gap-2">
                                <Briefcase size={18} className="text-primary" /> Servicios
                            </h4>
                            <div className="bg-white/5 rounded-2xl p-1">
                                <div className="flex items-center justify-between p-3 border-b border-white/5">
                                    <span className="text-sm font-medium">Activos</span>
                                    <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs font-bold">
                                        {tenant.resources?.services?.active || 0}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3">
                                    <span className="text-sm font-medium text-white/60">Inactivos</span>
                                    <span className="bg-white/10 text-white/60 px-2 py-0.5 rounded text-xs font-bold">
                                        {tenant.resources?.services?.inactive || 0}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold mb-4 flex items-center gap-2">
                                <Activity size={18} className="text-primary" /> Estado de Órdenes
                            </h4>
                            <div className="bg-white/5 rounded-2xl p-1 space-y-px">
                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-t-xl">
                                    <span className="text-sm font-medium">Pendientes</span>
                                    <span className="text-yellow-400 font-bold">
                                        {tenant.resources?.orders?.pending || 0}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-white/5">
                                    <span className="text-sm font-medium">En Proceso</span>
                                    <span className="text-blue-400 font-bold">
                                        {tenant.resources?.orders?.in_process || 0}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-white/5">
                                    <span className="text-sm font-medium">Completados</span>
                                    <span className="text-green-400 font-bold">
                                        {tenant.resources?.orders?.completed || 0}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-b-xl">
                                    <span className="text-sm font-medium text-white/60">Cancelados</span>
                                    <span className="text-red-400 font-bold">
                                        {tenant.resources?.orders?.cancelled || 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-primary/10 to-transparent p-6 rounded-2xl border border-primary/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-primary font-bold uppercase text-xs tracking-wider mb-1">Plan Actual</div>
                                <div className="text-2xl font-black">{tenant.plan}</div>
                            </div>
                            <div className="text-right flex gap-8">
                                <div>
                                    <div className="text-white/40 text-xs font-bold uppercase mb-1">Límite Mascotas</div>
                                    <div className="text-xl font-bold">{tenant.resources?.plan_details?.max_pets || '∞'}</div>
                                </div>
                                <div>
                                    <div className="text-white/40 text-xs font-bold uppercase mb-1">Límite Órdenes</div>
                                    <div className="text-xl font-bold">{tenant.resources?.plan_details?.max_orders || '∞'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
