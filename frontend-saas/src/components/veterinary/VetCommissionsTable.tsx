"use client";

import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/veterinary/api';
import { DollarSign, Search, Calendar, User, FileText, PieChart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Using shared utils or localized date if available, else simple
const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
};

interface VetCommission {
    id: number;
    created_at: string;
    tenant_name?: string;
    pet_name?: string;
    amount: number;
    status: string;
}

export default function VetCommissionsTable({ commissions = [] }: { commissions: VetCommission[] }) {
    if (commissions.length === 0) {
        return (
            <div className="text-center py-12 bg-white/[0.02] rounded-[2rem] border border-white/5 border-dashed">
                <DollarSign className="mx-auto text-indigo-200/20 mb-3" size={48} />
                <h3 className="text-white font-medium">Sin comisiones registradas</h3>
                <p className="text-indigo-200/40 text-sm mt-1">Cuando tus empresas vinculadas generen servicios, aparecerán aquí.</p>
            </div>
        );
    }

    return (
        <div className="bg-[var(--card-color)] rounded-[2rem] border border-[var(--card-border-color)] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[var(--muted-color)]/20 border-b border-[var(--card-border-color)] font-bold text-[var(--muted-foreground)] uppercase text-[10px] tracking-widest">
                        <tr>
                            <th className="px-8 py-5">Fecha</th>
                            <th className="px-8 py-5">Empresa (Partner)</th>
                            <th className="px-8 py-5">Mascota</th>
                            <th className="px-8 py-5">Monto</th>
                            <th className="px-8 py-5 text-right">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--card-border-color)]">
                        {commissions.map((comm) => (
                            <motion.tr
                                key={comm.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="hover:bg-white/[0.02] transition-colors"
                            >
                                <td className="px-8 py-5 text-[var(--muted-foreground)]">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="opacity-50" />
                                        {formatDate(comm.created_at)}
                                    </div>
                                </td>
                                <td className="px-8 py-5 font-bold text-[var(--foreground-color)]">
                                    {comm.tenant_name || 'Empresa Externa'}
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                                        <User size={14} className="opacity-50" />
                                        {comm.pet_name || 'Mascota'}
                                    </div>
                                </td>
                                <td className="px-8 py-5 font-bold text-[var(--primary-color)]">
                                    {formatCurrency(comm.amount)}
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border
                                        ${comm.status === 'pagado'
                                            ? 'bg-[var(--primary-color)]/10 text-[var(--primary-color)] border-[var(--primary-color)]/20'
                                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}
                                    `}>
                                        {comm.status}
                                    </span>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

