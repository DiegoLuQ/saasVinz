"use client";

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
    Wrench,
    FileText,
    Bell,
    AlertTriangle,
    Users,
    Database,
    Image as ImageIcon,
    CheckCircle2,
} from 'lucide-react';
import SystemHealth, { type HealthMetricsResponse } from '@/components/admin/SaaSMaintenance/SystemHealth';
import GlobalAnnouncementManager from '@/components/admin/SaaSMaintenance/GlobalAnnouncementManager';
import ServerTelemetryMonitor from '@/components/admin/SaaSMaintenance/ServerTelemetryMonitor';
import { useAdminStats } from '@/hooks/useAdminBootstrap';
import { apiRequest } from '@/lib/admin/api';

export default function MaintenancePage() {
    const stats = useAdminStats();
    const { data: healthData } = useQuery<HealthMetricsResponse>({
        queryKey: ['admin-health-metrics'],
        queryFn: () => apiRequest('/api/internal/health/metrics'),
        staleTime: 15000,
    });

    const errors24h = healthData?.metrics?.errors_24h ?? 0;
    const mediaFiles = healthData?.metrics?.media_files ?? 0;
    const activeAnnouncements = healthData?.metrics?.active_announcements ?? 0;

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 w-full max-w-[1850px] mx-auto">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                            <Wrench className="text-primary" size={24} />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight italic uppercase">
                            Mantención <span className="text-primary NOT-italic">SaaS</span>
                        </h1>
                    </div>
                    <p className="text-white/40 font-medium text-sm">
                        Telemetría técnica en tiempo real, anuncios segmentados y auditoría cross-tenant.
                    </p>
                </div>
            </header>

            {/* Monitor Avanzado de Servidor VPS y Base de Datos (Global e Individual) */}
            <ServerTelemetryMonitor />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                {/* Salud + Infraestructura técnica (4/12) */}
                <div className="lg:col-span-4 space-y-6">
                    <SystemHealth />

                    <div className="bg-[#0a192f]/80 backdrop-blur-md border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 blur-[40px] rounded-full -ml-16 -mt-16 pointer-events-none" />

                        <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <Database size={16} className="text-primary" />
                            Telemetría Operativa
                        </h2>

                        <div className="grid grid-cols-2 gap-3.5">
                            {/* Errores 24h */}
                            <Link
                                href="/dashboard/mantencion/logs?status=error"
                                className={`p-4 border rounded-2xl space-y-1 transition-all group ${
                                    errors24h > 0
                                        ? 'bg-rose-500/10 border-rose-500/25 hover:border-rose-500/50'
                                        : 'bg-white/5 border-white/5 hover:border-white/15'
                                }`}
                            >
                                <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                    {errors24h > 0 ? (
                                        <AlertTriangle size={12} className="text-rose-400" />
                                    ) : (
                                        <CheckCircle2 size={12} className="text-emerald-400" />
                                    )}
                                    Errores (24h)
                                </span>
                                <div className={`text-lg font-black ${errors24h > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    {errors24h}
                                </div>
                                <div className="text-[10px] text-white/30 group-hover:text-white/60 transition-colors">
                                    Ver en logs →
                                </div>
                            </Link>

                            {/* Tenants Activos */}
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-1">
                                <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                    <Users size={12} className="text-blue-400" /> Tenants
                                </span>
                                <div className="text-lg font-black text-white">
                                    {stats?.active_tenants ?? 0}{' '}
                                    <span className="text-xs text-white/30 font-medium">/ {stats?.total_tenants ?? 0}</span>
                                </div>
                                <div className="text-[10px] text-white/30">Crematorios activos</div>
                            </div>

                            {/* Archivos en Nube */}
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-1">
                                <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                    <ImageIcon size={12} className="text-sky-400" /> Media Cloud
                                </span>
                                <div className="text-lg font-black text-white">
                                    {mediaFiles.toLocaleString('es-CL')}
                                </div>
                                <div className="text-[10px] text-white/30">Archivos registrados</div>
                            </div>

                            {/* Anuncios Activos */}
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-1">
                                <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                    <Bell size={12} className="text-amber-400" /> Anuncios
                                </span>
                                <div className="text-lg font-black text-amber-400">
                                    {activeAnnouncements}
                                </div>
                                <div className="text-[10px] text-white/30">Publicados activos</div>
                            </div>
                        </div>

                        <Link
                            href="/dashboard/mantencion/logs"
                            className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between group transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <FileText size={18} className="text-white/40 group-hover:text-white transition-colors" />
                                <div>
                                    <div className="text-xs font-bold text-white/85 group-hover:text-white">
                                        Logs de Auditoría Cross-Tenant
                                    </div>
                                    <div className="text-[10px] text-white/35">
                                        Inspeccionar errores, acciones y exportar CSV
                                    </div>
                                </div>
                            </div>
                            <span className="text-white/30 group-hover:text-primary transition-colors text-sm font-black">→</span>
                        </Link>
                    </div>
                </div>

                {/* Anuncios globales (8/12) */}
                <div className="lg:col-span-8">
                    <GlobalAnnouncementManager />
                </div>
            </div>
        </div>
    );
}
