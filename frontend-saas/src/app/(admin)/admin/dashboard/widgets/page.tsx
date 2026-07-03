"use client";

import React, { useMemo, useState } from 'react';
import { Code2, Search, Building2, ChevronRight } from 'lucide-react';
import { useAdminTenants } from '@/hooks/useAdminBootstrap';
import WidgetKeysManager from '@/components/admin/widgets/WidgetKeysManager';

export default function AdminWidgetsPage() {
    const tenants = useAdminTenants();
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<{ id: number; name: string; slug: string; plan?: string } | null>(null);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return tenants;
        return tenants.filter(
            (t) => t.name?.toLowerCase().includes(q) || t.slug?.toLowerCase().includes(q)
        );
    }, [tenants, search]);

    return (
        <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto animate-fade-in pb-20 px-3 sm:px-4 md:px-8">
            {/* Header */}
            <div className="pb-6 border-b border-white/5">
                <div className="bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded w-fit mb-2">
                    Integraciones
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                    <Code2 className="text-primary" size={30} /> Widgets Web
                </h1>
                <p className="text-white/40 text-sm font-medium mt-2">
                    Genera y administra las claves del widget embebible para cada crematorio.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6">
                {/* Selector de tenant */}
                <div className="glass-card rounded-3xl p-5 border-white/5 h-fit lg:sticky lg:top-6 min-w-0">
                    <div className="relative mb-4">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar crematorio…"
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary/50 transition-all"
                        />
                    </div>
                    <div className="space-y-1.5 max-h-[60vh] overflow-y-auto no-scrollbar">
                        {filtered.length === 0 ? (
                            <p className="text-white/40 text-sm text-center py-6">Sin resultados</p>
                        ) : (
                            filtered.map((t) => {
                                const active = selected?.id === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => setSelected({ id: t.id, name: t.name, slug: t.slug, plan: t.plan })}
                                        className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-2 transition-all ${
                                            active ? 'bg-primary/15 border border-primary/30' : 'hover:bg-white/5 border border-transparent'
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Building2 size={14} className={active ? 'text-primary shrink-0' : 'text-white/30 shrink-0'} />
                                                <span className="font-bold text-sm text-white truncate">{t.name}</span>
                                            </div>
                                            <span className="text-[11px] text-white/40">/{t.slug} · {t.plan}</span>
                                        </div>
                                        <ChevronRight size={15} className={active ? 'text-primary' : 'text-white/20'} />
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Gestor de keys */}
                <div className="glass-card rounded-[2rem] p-5 sm:p-7 border-white/5 min-h-[300px] min-w-0 overflow-hidden">
                    {selected ? (
                        <>
                            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/5">
                                <Building2 size={18} className="text-primary" />
                                <h2 className="font-black text-lg text-white">{selected.name}</h2>
                                <span className="text-[11px] text-white/40">/{selected.slug}</span>
                            </div>
                            <WidgetKeysManager key={selected.id} tenantIdentifier={selected.slug} />
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center py-20 text-white/40">
                            <Code2 size={48} className="text-white/10 mb-4" />
                            <p className="font-medium">Selecciona un crematorio para gestionar su widget.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
