"use client";

import React from 'react';
import { Activity, Clock, Users } from 'lucide-react';
import RevenueChart from './RevenueChart';

interface MetricsDashboardProps {
    totalMrr: number;
    dueTodayCount: number;
    activeTenants: number;
    pendingRequests: number;
    cancellingTenantsCount: number;
    growthData: { month: string; revenue: number; tenants?: number }[];
}

interface KpiCardProps {
    label: string;
    value: string | number;
    description: string;
    Icon: any;
    accent: string;
    valueColor: string;
}

function KpiCard({ label, value, description, Icon, accent, valueColor }: KpiCardProps) {
    return (
        <div className="bg-white/5 border border-white/5 p-8 rounded-[2rem] flex flex-col justify-between">
            <div>
                <div className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                    <Icon className={accent} size={12} /> {label}
                </div>
                <div className={`text-4xl font-black ${valueColor}`}>{value}</div>
            </div>
            <p className="text-[10px] text-white/20 font-medium mt-4">{description}</p>
        </div>
    );
}

function MetricsDashboard({
    totalMrr,
    dueTodayCount,
    activeTenants,
    pendingRequests,
    cancellingTenantsCount,
    growthData,
}: MetricsDashboardProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <KpiCard
                    label="MRR Actual Est."
                    value={`$${totalMrr.toLocaleString()}`}
                    description="Ingresos mensuales recurrentes base"
                    Icon={Activity}
                    accent="text-emerald-400"
                    valueColor="text-emerald-400"
                />
                <KpiCard
                    label="Pagos Vencen Hoy"
                    value={dueTodayCount}
                    description="Tenants con mensualidad pendiente hoy"
                    Icon={Clock}
                    accent="text-red-400"
                    valueColor="text-red-500"
                />
                <KpiCard
                    label="Suscripciones Activas"
                    value={activeTenants}
                    description="Total de empresas con servicio activo"
                    Icon={Users}
                    accent="text-blue-400"
                    valueColor="text-blue-400"
                />
                <KpiCard
                    label="Solicitudes Pendientes"
                    value={pendingRequests}
                    description="Cambios de plan por aprobar"
                    Icon={Clock}
                    accent="text-yellow-400"
                    valueColor="text-yellow-500"
                />
                <KpiCard
                    label="Cancelaciones Programadas"
                    value={cancellingTenantsCount}
                    description="Tenants que han solicitado no renovar"
                    Icon={Activity}
                    accent="text-amber-500"
                    valueColor="text-amber-500"
                />
            </div>

            <div className="lg:col-span-2 bg-white/5 border border-white/5 p-8 rounded-[2.5rem] flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <div className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-1">Tendencia de Ingresos</div>
                        <h3 className="text-xl font-black">Crecimiento 6M</h3>
                    </div>
                    <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-lg">Real-time</span>
                </div>
                <div className="flex-1 min-h-[160px]">
                    <RevenueChart data={growthData} />
                </div>
            </div>
        </div>
    );
}

export default React.memo(MetricsDashboard);
