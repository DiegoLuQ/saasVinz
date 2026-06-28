"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import {
    Heart,
    Package,
    ShoppingBag,
    Users as UsersIcon,
    Wrench,
    AlertTriangle,
    CheckCircle2
} from 'lucide-react';
import { useTenantDetail } from '@/hooks/useTenantDetail';

interface QuotaBarProps {
    label: string;
    used: number;
    limit: number | null;
    Icon: any;
    accent: string;
}

function QuotaBar({ label, used, limit, Icon, accent }: QuotaBarProps) {
    const isUnlimited = limit === null || limit === undefined || limit <= 0;
    const pct = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
    const danger = !isUnlimited && pct >= 90;
    const warning = !isUnlimited && pct >= 70 && pct < 90;
    const barColor = danger ? 'bg-rose-500' : warning ? 'bg-amber-400' : 'bg-emerald-500';

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2 bg-white/5 rounded-xl ${accent}`}>
                        <Icon size={18} />
                    </div>
                    <div>
                        <div className="text-[10px] uppercase tracking-widest font-bold text-white/30">{label}</div>
                        <div className="text-2xl font-black text-white leading-tight">
                            {used.toLocaleString()}
                            <span className="text-white/30 text-sm font-medium ml-1">
                                / {isUnlimited ? '∞' : limit.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
                {isUnlimited ? (
                    <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">Ilimitado</span>
                ) : danger ? (
                    <AlertTriangle size={18} className="text-rose-400" />
                ) : (
                    <CheckCircle2 size={18} className="text-emerald-400/60" />
                )}
            </div>

            {!isUnlimited && (
                <>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${barColor} transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <div className="text-[10px] font-bold text-white/40">
                        {pct.toFixed(1)}% utilizado
                    </div>
                </>
            )}
        </div>
    );
}

interface BreakdownProps {
    label: string;
    items: { label: string; value: number; color: string }[];
}

function Breakdown({ label, items }: BreakdownProps) {
    const total = items.reduce((acc, it) => acc + it.value, 0);
    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="text-[10px] uppercase tracking-widest font-bold text-white/30">{label}</div>
            <div className="text-3xl font-black text-white">{total.toLocaleString()}</div>
            <div className="space-y-1.5">
                {items.map(it => {
                    const pct = total > 0 ? (it.value / total) * 100 : 0;
                    return (
                        <div key={it.label} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-white/60 font-medium">{it.label}</span>
                                <span className="text-white/40 font-mono">{it.value} <span className="text-white/20">· {pct.toFixed(0)}%</span></span>
                            </div>
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className={`h-full ${it.color}`} style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function TenantUsoPage() {
    const params = useParams();
    const tenantSlug = params.slug as string;
    const { data, isLoading } = useTenantDetail(tenantSlug);

    if (isLoading) return <div className="text-white/40 text-sm">Cargando uso...</div>;

    const resources = data?.tenant?.resources;
    if (!resources) {
        return <div className="text-white/40 text-sm">No hay datos de uso disponibles para este tenant.</div>;
    }

    const planDetails = resources.plan_details || {};

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">Cuotas del Plan</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <QuotaBar
                        label="Mascotas registradas"
                        used={resources.pets || 0}
                        limit={planDetails.max_pets}
                        Icon={Heart}
                        accent="text-pink-400"
                    />
                    <QuotaBar
                        label="Órdenes / Cremaciones"
                        used={resources.orders?.total || 0}
                        limit={planDetails.max_orders}
                        Icon={ShoppingBag}
                        accent="text-amber-400"
                    />
                </div>
            </div>

            <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">Recursos sin cuota</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                        <UsersIcon size={18} className="text-blue-400 mb-3" />
                        <div className="text-[10px] uppercase tracking-widest font-bold text-white/30">Clientes</div>
                        <div className="text-2xl font-black text-white">{(resources.customers || 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                        <Package size={18} className="text-purple-400 mb-3" />
                        <div className="text-[10px] uppercase tracking-widest font-bold text-white/30">Productos</div>
                        <div className="text-2xl font-black text-white">{(resources.products || 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                        <Wrench size={18} className="text-cyan-400 mb-3" />
                        <div className="text-[10px] uppercase tracking-widest font-bold text-white/30">Servicios activos</div>
                        <div className="text-2xl font-black text-white">{(resources.services?.active || 0).toLocaleString()}</div>
                        <div className="text-[10px] text-white/30 mt-1">{resources.services?.inactive || 0} inactivos</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                        <Heart size={18} className="text-pink-400 mb-3" />
                        <div className="text-[10px] uppercase tracking-widest font-bold text-white/30">Mascotas</div>
                        <div className="text-2xl font-black text-white">{(resources.pets || 0).toLocaleString()}</div>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">Distribución de Órdenes</h2>
                <Breakdown
                    label="Estado de cremaciones"
                    items={[
                        { label: 'Pendientes', value: resources.orders?.pending || 0, color: 'bg-amber-400' },
                        { label: 'En proceso', value: resources.orders?.in_process || 0, color: 'bg-blue-400' },
                        { label: 'Completadas', value: resources.orders?.completed || 0, color: 'bg-emerald-500' },
                        { label: 'Canceladas', value: resources.orders?.cancelled || 0, color: 'bg-rose-500' },
                    ]}
                />
            </div>
        </div>
    );
}
