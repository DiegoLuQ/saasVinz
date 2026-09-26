"use client";

import React, { useState } from 'react';
import PartnerLinksTable from '@/components/veterinary/PartnerLinksTable';
import VetCommissionsTable from '@/components/veterinary/VetCommissionsTable';
import VetReferralsTable from '@/components/veterinary/VetReferralsTable';
import { Users, CreditCard, Calendar, DollarSign, Mail, ExternalLink, Check, Copy, Building2, PawPrint } from 'lucide-react';
import { motion } from 'framer-motion';
import { useVeterinaryBootstrap } from '@/hooks/useVeterinaryBootstrap';
import { copyToClipboard } from '@/lib/clipboard';
import { getPartnerRegistroUrl } from '@/lib/publicUrls';

export default function VeterinaryDashboard() {
    const [activeTab, setActiveTab] = useState<'links' | 'referrals' | 'commissions'>('links');
    const { data, isLoading, error } = useVeterinaryBootstrap();
    const [copiedLinkId, setCopiedLinkId] = useState<number | null>(null);

    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
    const allLinks = data?.links || [];
    const activeLinks = allLinks.filter((l) => l.status === 'active');
    const pendingLinks = allLinks.filter((l) => l.status === 'pending');
    const totalPaid = data?.metadata.total_commission_paid || 0;
    const totalPending = data?.metadata.total_commission_pending || 0;

    const handleCopy = async (linkId: number, url: string) => {
        if (await copyToClipboard(url)) {
            setCopiedLinkId(linkId);
            setTimeout(() => setCopiedLinkId(null), 2000);
        }
    };

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
                            {clp.format(totalPaid)}
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
                            <h2 className="text-5xl font-black tracking-tighter text-white mb-2">{activeLinks.length}</h2>
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
                                {clp.format(totalPending)}
                            </h2>
                        </div>
                    </div>

                    {/* Invitaciones pendientes */}
                    <div className="group relative bg-[#0B1121] rounded-[2.5rem] border border-white/5 p-8 transition-transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/10 overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Mail size={80} />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-indigo-200/40 uppercase tracking-[0.2em] mb-4">Invitaciones Pendientes</p>
                            <h2 className="text-5xl font-black tracking-tighter text-purple-400 mb-2">{pendingLinks.length}</h2>
                            {pendingLinks.length > 0 && (
                                <p className="text-xs text-indigo-200/50">Revísalas en &quot;Mis Vínculos&quot;.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Enlaces de derivación: uno por crematorio activo (cada uno con su comisión) */}
                <section className="space-y-5">
                    <div>
                        <p className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-[0.3em] mb-2 px-1">Enlaces de Derivación</p>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tighter">Compártelos con tus pacientes</h2>
                        <p className="text-sm text-[var(--muted-foreground)] mt-1">
                            Cada crematorio tiene su propio enlace: los servicios que lleguen por él quedan registrados bajo tu convenio.
                        </p>
                    </div>

                    {activeLinks.length === 0 ? (
                        <div className="rounded-[2rem] border border-[var(--card-border-color)] bg-[var(--card-color)] p-8 text-center text-sm text-[var(--muted-foreground)]">
                            {pendingLinks.length > 0
                                ? 'Acepta una invitación en "Mis Vínculos" para obtener tu enlace de derivación.'
                                : 'Aún no tienes convenios activos con crematorios.'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {activeLinks.map((link) => {
                                const url = getPartnerRegistroUrl(link.slug_publico);
                                const copied = copiedLinkId === link.id;
                                return (
                                    <div key={link.id} className="rounded-[2rem] border border-[var(--card-border-color)] bg-[var(--card-color)] p-6 space-y-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="w-11 h-11 shrink-0 rounded-2xl bg-[var(--primary-color)]/15 text-[var(--primary-color)] flex items-center justify-center">
                                                    <Building2 size={20} />
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="font-black text-lg tracking-tight truncate">{link.tenant?.name || 'Crematorio'}</p>
                                                    <p className="text-xs text-[var(--muted-foreground)]">Convenio activo</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-2xl font-black text-purple-400 tracking-tighter">
                                                    {link.tipo_comision === 'fijo' ? clp.format(link.monto_comision || 0) : `${link.porcentaje_comision || 0}%`}
                                                </p>
                                                <p className="text-[10px] text-indigo-200/50 uppercase tracking-wider">
                                                    {link.tipo_comision === 'fijo' ? 'Monto fijo' : 'Comisión'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 bg-black/20 border border-[var(--card-border-color)] rounded-2xl p-2 pl-4">
                                            <ExternalLink className="text-[var(--primary-color)] shrink-0" size={16} />
                                            <span className="font-mono text-xs text-[var(--muted-foreground)] truncate flex-1" title={url}>{url}</span>
                                            <button
                                                onClick={() => handleCopy(link.id, url)}
                                                className="shrink-0 inline-flex items-center gap-1.5 bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/80 text-[var(--primary-foreground)] px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                                            >
                                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                                {copied ? 'Copiado' : 'Copiar'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

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
                            onClick={() => setActiveTab('referrals')}
                            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2
                                ${activeTab === 'referrals'
                                    ? 'bg-[var(--primary-color)] text-[var(--primary-foreground)] shadow-lg shadow-[var(--primary-color)]/20'
                                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground-color)] hover:bg-[var(--muted-color)]'
                                }`}
                        >
                            <PawPrint size={14} /> Derivaciones
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
                        {activeTab === 'links' && <PartnerLinksTable links={data?.links || []} />}
                        {activeTab === 'referrals' && <VetReferralsTable />}
                        {activeTab === 'commissions' && <VetCommissionsTable commissions={data?.commissions || []} />}
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
