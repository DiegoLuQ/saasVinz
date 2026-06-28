"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Box, Key } from 'lucide-react';

interface TenantLayoutHeaderProps {
    tenantName?: string;
    tenantId?: number;
    tenantSlug?: string;
    onOpenModules: () => void;
}

export default function TenantLayoutHeader({
    tenantName,
    tenantId,
    tenantSlug,
    onOpenModules
}: TenantLayoutHeaderProps) {
    const router = useRouter();

    return (
        <>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/20 pt-4">
                <span className="cursor-pointer hover:text-primary transition-colors" onClick={() => router.push('/dashboard/tenants')}>
                    Tenants
                </span>
                <span>/</span>
                <span className="text-white/40">{tenantName}</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
                <div className="flex items-start gap-5">
                    <button
                        onClick={() => router.back()}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/70 hover:text-white transition-all shadow-xl"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div className="space-y-1">
                        <div className="bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded w-fit mb-2">
                            Empresa Registrada
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">
                            {tenantName || 'Editar Empresa'}
                        </h1>
                        <div className="flex items-center gap-4 text-white/40 text-sm font-medium">
                            <span className="flex items-center gap-1.5"><Key size={14} className="text-primary" /> ID: {tenantId}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                            <span className="flex items-center gap-1.5"><Box size={14} className="text-blue-400" /> Slug: /{tenantSlug}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={onOpenModules}
                        className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/10"
                    >
                        <Box size={18} className="text-purple-400" />
                        Módulos
                    </button>
                </div>
            </div>
        </>
    );
}
