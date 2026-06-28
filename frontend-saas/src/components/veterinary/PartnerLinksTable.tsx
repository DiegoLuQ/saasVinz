"use client";

import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/veterinary/api';
import { CheckCircle, XCircle, Clock, Building2, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

interface PartnerLink {
    id: number;
    tenant: {
        id: number;
        name: string;
        slug: string;
    };
    status: string;
    tipo_comision: string;
    monto_comision: number;
    porcentaje_comision: number;
    slug_publico?: string;
    created_at: string;
}


export default function PartnerLinksTable({ links = [] }: { links: PartnerLink[] }) {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleAction = async (linkId: number, action: 'accept' | 'reject') => {
        if (!confirm(`¿Estás seguro de que quieres ${action === 'accept' ? 'aceptar' : 'rechazar'} esta solicitud?`)) return;

        setIsProcessing(true);
        try {
            await apiRequest(`/api/veterinary/dashboard/links/${linkId}/${action}`, { method: 'POST' });
            window.location.reload();
        } catch (error) {
            alert("Error al procesar la solicitud");
        } finally {
            setIsProcessing(false);
        }
    };

    if (links.length === 0) {
        return (
            <div className="text-center py-12 bg-white/[0.02] rounded-[2rem] border border-white/5 border-dashed">
                <Building2 className="mx-auto text-indigo-200/20 mb-3" size={48} />
                <h3 className="text-white font-medium">Sin vínculos activos</h3>
                <p className="text-indigo-200/40 text-sm mt-1">Aún no has sido invitado por ninguna empresa funeraria.</p>
            </div>
        );
    }

    return (
        <div className="bg-[var(--card-color)] rounded-[2rem] border border-[var(--card-border-color)] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[var(--muted-color)]/20 border-b border-[var(--card-border-color)] font-bold text-[var(--muted-foreground)] uppercase text-[10px] tracking-widest">
                        <tr>
                            <th className="px-8 py-5">Empresa</th>
                            <th className="px-8 py-5">Estado</th>
                            <th className="px-8 py-5">Acuerdo Comercial</th>
                            <th className="px-8 py-5 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--card-border-color)]">
                        {links.map((link) => (
                            <motion.tr
                                key={link.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="hover:bg-white/[0.02] transition-colors"
                            >
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-[var(--primary-color)]/10 rounded-xl flex items-center justify-center text-[var(--primary-color)] font-bold text-xs uppercase border border-[var(--primary-color)]/20">
                                            {link.tenant?.name?.substring(0, 2)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-[var(--foreground-color)] tracking-tight">{link.tenant?.name}</p>
                                            <p className="text-[10px] text-[var(--muted-foreground)] font-mono">Slug: {link.tenant?.slug}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <StatusBadge status={link.status} />
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex flex-col">
                                        <span className="capitalize text-[var(--foreground-color)] font-medium text-xs">{link.tipo_comision}</span>
                                        <span className="text-[var(--primary-color)] font-bold text-xs">
                                            {link.tipo_comision === 'porcentaje'
                                                ? `${link.porcentaje_comision}%`
                                                : `$${link.monto_comision.toLocaleString()}`}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    {link.status === 'pending' && (
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleAction(link.id, 'accept')}
                                                className="bg-[var(--primary-color)]/10 text-[var(--primary-color)] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--primary-color)]/20 transition-colors flex items-center gap-1 border border-[var(--primary-color)]/20"
                                            >
                                                <CheckCircle size={12} /> Aceptar
                                            </button>
                                            <button
                                                onClick={() => handleAction(link.id, 'reject')}
                                                className="bg-red-500/10 text-red-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-colors flex items-center gap-1 border border-red-500/20"
                                            >
                                                <XCircle size={12} /> Rechazar
                                            </button>
                                        </div>
                                    )}
                                    {link.status === 'active' && (
                                        <span className="text-[10px] text-[var(--primary-color)] font-black uppercase tracking-widest flex items-center justify-end gap-1.5 opacity-80">
                                            <CheckCircle size={12} /> Vinculado
                                        </span>
                                    )}
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        active: "bg-teal-50 text-teal-700 border-teal-100",
        pending: "bg-amber-50 text-amber-700 border-amber-100",
        rejected: "bg-red-50 text-red-700 border-red-100",
    };

    const icons = {
        active: CheckCircle,
        pending: Clock,
        rejected: XCircle,
    };

    const Icon = icons[status as keyof typeof icons] || Clock;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-600'}`}>
            <Icon size={12} strokeWidth={2.5} />
            <span className="capitalize">{status === 'active' ? 'Activo' : status === 'pending' ? 'Pendiente' : 'Rechazado'}</span>
        </span>
    );
}
