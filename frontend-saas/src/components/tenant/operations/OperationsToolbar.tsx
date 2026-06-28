"use client";

import React from 'react';
import { Search, X } from 'lucide-react';

export type StatusPillFilter = 'all' | 'pendiente' | 'en_proceso' | 'coordinado' | 'completado' | 'cancelado';

interface OperationsToolbarProps {
    searchTerm: string;
    onSearchChange: (term: string) => void;
    statusFilter: StatusPillFilter;
    onStatusFilterChange: (filter: StatusPillFilter) => void;
    counts: Record<StatusPillFilter, number>;
    visibleCount: number;
    totalCount: number;
}

const PILLS: { key: StatusPillFilter; label: string; dot: string }[] = [
    { key: 'all', label: 'Todos', dot: 'bg-white/40' },
    { key: 'pendiente', label: 'Pendientes', dot: 'bg-orange-400' },
    { key: 'en_proceso', label: 'En Proceso', dot: 'bg-blue-400' },
    { key: 'coordinado', label: 'Coordinado', dot: 'bg-indigo-400' },
    { key: 'completado', label: 'Entregados', dot: 'bg-emerald-400' },
    { key: 'cancelado', label: 'Cancelados', dot: 'bg-red-400' },
];

export default function OperationsToolbar({
    searchTerm,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    counts,
    visibleCount,
    totalCount,
}: OperationsToolbarProps) {
    return (
        <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-4 lg:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 lg:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} aria-hidden="true" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Buscar por #SVC, mascota, cliente, comuna..."
                        aria-label="Buscar en la cola de pedidos"
                        className="w-full h-11 bg-black/30 border border-white/[0.08] rounded-xl pl-11 pr-10 text-sm font-medium text-white placeholder:text-muted-foreground/50 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => onSearchChange('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-white hover:bg-white/[0.06] transition-colors"
                            aria-label="Limpiar búsqueda"
                        >
                            <X size={14} aria-hidden="true" />
                        </button>
                    )}
                </div>

                {/* Result count */}
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em] hidden sm:block">
                    <span className="text-white font-mono">{visibleCount}</span>
                    <span className="mx-1">de</span>
                    <span className="font-mono">{totalCount}</span>
                </div>
            </div>

            {/* Pill Filters */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/[0.05]" role="group" aria-label="Filtros rápidos por estado">
                {PILLS.map(pill => {
                    const isActive = pill.key === statusFilter;
                    const count = counts[pill.key];
                    return (
                        <button
                            key={pill.key}
                            type="button"
                            onClick={() => onStatusFilterChange(pill.key)}
                            aria-pressed={isActive}
                            className={`
                                inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-wider transition-all
                                ${isActive
                                    ? 'bg-primary/15 text-primary border-primary/30 shadow-md shadow-primary/10'
                                    : 'bg-white/[0.02] text-muted-foreground border-white/[0.06] hover:bg-white/[0.05] hover:text-white'
                                }
                            `}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} aria-hidden="true" />
                            {pill.label}
                            <span className={`text-[10px] font-mono ${isActive ? 'text-primary' : 'text-muted-foreground/70'}`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
