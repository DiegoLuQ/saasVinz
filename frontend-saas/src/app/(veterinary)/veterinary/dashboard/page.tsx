"use client";

import React, { useState, useEffect } from 'react';
import PartnerLinksTable from '@/components/veterinary/PartnerLinksTable';
import VetCommissionsTable from '@/components/veterinary/VetCommissionsTable';
import { LayoutDashboard, Users, CreditCard, Calendar, DollarSign, Award, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useVeterinaryBootstrap } from '@/hooks/useVeterinaryBootstrap';
import { copyToClipboard } from '@/lib/clipboard';

export default function VeterinaryDashboard() {
    const [activeTab, setActiveTab] = useState<'links' | 'commissions'>('links');
    const { data, isLoading, error } = useVeterinaryBootstrap();
    const [stats, setStats] = useState({
        total_paid: 0,
        total_pending: 0,
        total_referrals: 0,
        paid_this_month: 0
    });

    useEffect(() => {
        if (data) {
            // Calculate stats from bootstrap data
            const totalPending = data.metadata.total_commission_pending || 0;
            const totalReferrals = data.links.reduce((acc: number, link: any) => acc + (link.referrals_count || 0), 0); // Assuming metadata or link has this count, if not we default.

            // For now, if metadata doesn't have all detailed stats, we use what we have
            setStats({
                total_paid: 0, // Field might need to be added to bootstrap or deduced
                total_pending: totalPending,
                total_referrals: data.metadata.active_links_count, // Or actual referrals count if available
                paid_this_month: 0
            });
        }
    }, [data]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-indigo-200/50 text-sm font-medium tracking-widest uppercase">Cargando Panel...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
                <div className="bg-white/[0.05] border border-white/10 p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CreditCard size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-white">Error al cargar</h2>
                    <p className="text-indigo-200/50 mt-2 mb-6 text-sm">No pudimos conectar con el servidor.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-emerald-500 text-[#020617] py-3 rounded-xl font-black uppercase tracking-widest hover:bg-emerald-400 transition-all"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    // Default to first active link for display purposes if multiple links exist
    const primaryLink = data?.links?.[0];

    return (
        <div className="min-h-screen bg-[#020617] text-white selection:bg-emerald-500/30">
            {/* Background Ambience */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
            </div>


            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10 space-y-10">

                {/* Stats Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <p className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-[0.3em] mb-2 px-1">Resumen General</p>
                        <h3 className="text-4xl font-black text-[var(--primary-color)] tracking-tighter drop-shadow-[0_0_25px_rgba(var(--primary-color),0.3)]">
                            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(stats.total_paid)}
                        </h3>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">Total Pagado Histórico</p>
                    </div>
                    <div className="bg-[var(--card-color)] border border-[var(--card-border-color)] rounded-[2rem] p-2 flex gap-2">
                        <div className="px-6 py-3 bg-[var(--primary-color)] text-[var(--primary-foreground)] rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
                            <Calendar size={14} />
                            {new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
                        </div>
                    </div>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Referrals Card */}
                    <div className="group relative bg-[#0B1121] rounded-[2.5rem] border border-white/5 p-8 transition-transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10 overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Users size={80} />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-indigo-200/40 uppercase tracking-[0.2em] mb-4">Vínculos Activos</p>
                            <h2 className="text-5xl font-black tracking-tighter text-white mb-2">{data?.metadata.active_links_count || 0}</h2>
                        </div>
                    </div>

                    {/* Pending Commission */}
                    <div className="group relative bg-[#0B1121] rounded-[2.5rem] border border-white/5 p-8 transition-transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <DollarSign size={80} />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-indigo-200/40 uppercase tracking-[0.2em] mb-4">Comisión Pendiente</p>
                            <h2 className="text-5xl font-black tracking-tighter text-blue-400 mb-2">
                                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(stats.total_pending)}
                            </h2>
                        </div>
                    </div>

                    {/* Model Info */}
                    <div className="group relative bg-[#0B1121] rounded-[2.5rem] border border-white/5 p-8 transition-transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/10 overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Award size={80} />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-indigo-200/40 uppercase tracking-[0.2em] mb-4">Modelo Comercial</p>
                            {primaryLink ? (
                                <div>
                                    <h2 className="text-3xl font-black tracking-tighter text-purple-400 mb-1">
                                        {primaryLink.tipo_comision === 'fijo'
                                            ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(primaryLink.monto_comision)
                                            : `${primaryLink.porcentaje_comision}%`
                                        }
                                    </h2>
                                    <p className="text-xs text-indigo-200/50 uppercase tracking-wider">{primaryLink.tipo_comision}</p>
                                </div>
                            ) : (
                                <h2 className="text-3xl font-black text-white/20">-</h2>
                            )}
                        </div>
                    </div>
                </div>

                {/* Growth Link Section (Only if link is active) */}
                {primaryLink && (
                    <div className="relative rounded-[3rem] overflow-hidden bg-gradient-to-r from-[var(--primary-color)]/20 to-[var(--accent-color)]/20 border border-[var(--card-border-color)] p-10 md:p-14">
                        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                        <div className="flex flex-col xl:flex-row items-center justify-between gap-10 relative z-10">
                            <div className="space-y-6 max-w-2xl">
                                <div className="inline-flex px-4 py-1.5 rounded-full bg-[var(--primary-color)]/20 border border-[var(--primary-color)]/20 backdrop-blur-md">
                                    <span className="text-[10px] font-black text-[var(--primary-color)] uppercase tracking-widest">Enlace de Crecimiento</span>
                                </div>
                                <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-[0.9]">
                                    Compártelo con tus pacientes
                                </h2>
                                <p className="text-lg text-[var(--muted-foreground)] leading-relaxed font-medium">
                                    Este enlace registrará automáticamente los servicios bajo tu convenio.
                                </p>
                            </div>

                            <div className="w-full xl:w-auto flex flex-col items-center gap-4 bg-[var(--card-color)]/90 backdrop-blur-xl p-3 pl-6 pr-3 rounded-[2rem] border border-[var(--card-border-color)] shadow-2xl shadow-[var(--primary-color)]/20">
                                <div className="flex items-center gap-4 w-full">
                                    <ExternalLink className="text-[var(--primary-color)] shrink-0" size={20} />
                                    <span className="font-mono text-xs text-[var(--muted-foreground)] truncate max-w-[200px] selection:bg-[var(--primary-color)]/30">
                                        {`.../registro/${primaryLink.slug_publico}`}
                                    </span>
                                    <button
                                        onClick={() => copyToClipboard(`${window.location.origin}/registro/${primaryLink.slug_publico}`)}
                                        className="bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/80 text-[var(--primary-foreground)] px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[var(--primary-color)]/20"
                                    >
                                        Copiar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs & Content */}
                <div>
                    <div className="flex items-center gap-2 mb-6 bg-[var(--card-color)] p-1.5 rounded-2xl border border-[var(--card-border-color)] w-fit shadow-sm">
                        <button
                            onClick={() => setActiveTab('links')}
                            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2
                                ${activeTab === 'links'
                                    ? 'bg-[var(--primary-color)] text-[var(--primary-foreground)] shadow-lg shadow-[var(--primary-color)]/20'
                                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground-color)] hover:bg-[var(--muted-color)]'
                                }`}
                        >
                            <Users size={14} /> Mis Vínculos
                        </button>
                        <button
                            onClick={() => setActiveTab('commissions')}
                            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2
                                ${activeTab === 'commissions'
                                    ? 'bg-[var(--primary-color)] text-[var(--primary-foreground)] shadow-lg shadow-[var(--primary-color)]/20'
                                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground-color)] hover:bg-[var(--muted-color)]'
                                }`}
                        >
                            <CreditCard size={14} /> Comisiones
                        </button>
                    </div>

                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-[var(--card-color)] rounded-[3rem] border border-[var(--card-border-color)] overflow-hidden p-1"
                    >
                        {/* Pass data to components if needed, or let them use hook/context if they are smart components */}
                        {activeTab === 'links' ? <PartnerLinksTable links={data?.links || []} /> : <VetCommissionsTable commissions={data?.commissions || []} />}
                    </motion.div>
                </div>
            </main>

            {/* Footer */}
            <div className="pt-10 pb-20 text-center relative z-10">
                <p className="text-[10px] text-[var(--primary-color)] font-black uppercase tracking-[0.4em] italic mb-4 opacity-50">Vinzer</p>
            </div>
        </div>
    );
}
