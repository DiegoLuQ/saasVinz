"use client";

import React from 'react';
import Link from 'next/link';
import { Wrench, FileText, Bell, TrendingUp, Users, Database } from 'lucide-react';
import SystemHealth from '@/components/admin/SaaSMaintenance/SystemHealth';
import GlobalAnnouncementManager from '@/components/admin/SaaSMaintenance/GlobalAnnouncementManager';
import { useAdminAnnouncements, useAdminStats } from '@/hooks/useAdminBootstrap';

export default function MaintenancePage() {
    const announcements = useAdminAnnouncements();
    const stats = useAdminStats();
    const activeAnnouncements = announcements.length;

    const formatCLP = (amount?: number) => {
        if (amount === undefined || amount === null) return '$0';
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
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
                    <p className="text-white/40 font-medium">Salud del sistema, anuncios globales y logs cross-tenant.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Salud + atajos */}
                <div className="lg:col-span-1 space-y-6">
                    <SystemHealth />

                    <div className="bg-[#0a192f]/60 backdrop-blur-md border border-white/10 rounded-[2rem] p-6 space-y-6 shadow-2xl relative overflow-hidden">
                        {/* Background Glow */}
                        <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 blur-[40px] rounded-full -ml-16 -mt-16 pointer-events-none" />

                        <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <Database size={16} className="text-primary" />
                            Infraestructura SaaS
                        </h2>

                        <div className="grid grid-cols-2 gap-4">
                            {/* MRR Card */}
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-1">
                                <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                    <TrendingUp size={12} className="text-emerald-400" /> MRR
                                </span>
                                <div className="text-sm font-black text-emerald-400 truncate">
                                    {formatCLP(stats?.total_mrr)}
                                </div>
                            </div>

                            {/* Tenants Card */}
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-1">
                                <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                    <Users size={12} className="text-blue-400" /> Tenants
                                </span>
                                <div className="text-sm font-black text-white">
                                    {stats?.active_tenants ?? 0} <span className="text-[10px] text-white/30 font-medium">/ {stats?.total_tenants ?? 0}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Link
                                href="/dashboard/mantencion/logs"
                                className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl flex items-center justify-between group transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <FileText size={18} className="text-white/40 group-hover:text-white transition-colors" />
                                    <div>
                                        <div className="text-xs font-bold text-white/80 group-hover:text-white">Logs de Auditoría</div>
                                        <div className="text-[9px] text-white/30">Eventos cross-tenant</div>
                                    </div>
                                </div>
                                <span className="text-white/30 group-hover:text-primary transition-colors text-sm font-black">→</span>
                            </Link>

                            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Bell size={18} className="text-amber-400" />
                                    <div>
                                        <div className="text-xs font-bold text-white/80">Anuncios Activos</div>
                                        <div className="text-[9px] text-white/30">Visibles para todos</div>
                                    </div>
                                </div>
                                <span className="px-3 py-1 bg-amber-400/10 border border-amber-400/20 rounded-full text-xs font-black text-amber-400">
                                    {activeAnnouncements}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Anuncios globales */}
                <div className="lg:col-span-2">
                    <GlobalAnnouncementManager />
                </div>
            </div>
        </div>
    );
}

