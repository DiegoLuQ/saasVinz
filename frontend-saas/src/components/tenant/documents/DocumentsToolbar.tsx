"use client";

import React from 'react';
import { Search, X, Calendar } from 'lucide-react';

export type DateRange = 'all' | '7d' | '30d';

interface DocumentsToolbarProps {
    searchTerm: string;
    onSearchChange: (term: string) => void;
    dateRange: DateRange;
    onDateRangeChange: (next: DateRange) => void;
    visibleCount: number;
    totalCount: number;
}

const DATE_OPTIONS: { key: DateRange; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: '7d', label: '7 días' },
    { key: '30d', label: '30 días' },
];

export default function DocumentsToolbar({
    searchTerm,
    onSearchChange,
    dateRange,
    onDateRangeChange,
    visibleCount,
    totalCount,
}: DocumentsToolbarProps) {
    return (
        <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-4 lg:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 lg:max-w-xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/70" size={16} aria-hidden="true" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Buscar por mascota, número, ID #cremación o tipo..."
                        aria-label="Buscar en el repositorio"
                        className="w-full h-12 bg-black/30 border border-white/[0.08] rounded-2xl pl-11 pr-10 text-sm font-medium text-white placeholder:text-muted-foreground/50 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all"
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

                {/* Date Range */}
                <div className="flex items-center gap-2" role="group" aria-label="Filtro por rango de fechas">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em] mr-1 hidden md:flex">
                        <Calendar size={11} aria-hidden="true" />
                        Rango
                    </div>
                    {DATE_OPTIONS.map(opt => {
                        const isActive = dateRange === opt.key;
                        return (
                            <button
                                key={opt.key}
                                type="button"
                                onClick={() => onDateRangeChange(opt.key)}
                                aria-pressed={isActive}
                                className={`
                                    px-3.5 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-wider transition-all
                                    ${isActive
                                        ? 'bg-primary/15 text-primary border-primary/30 shadow-md shadow-primary/10'
                                        : 'bg-white/[0.02] text-muted-foreground border-white/[0.06] hover:bg-white/[0.05] hover:text-white'
                                    }
                                `}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>

                {/* Count */}
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em] hidden lg:block lg:ml-auto">
                    <span className="text-white font-mono">{visibleCount}</span>
                    <span className="mx-1">de</span>
                    <span className="font-mono">{totalCount}</span>
                </div>
            </div>
        </div>
    );
}
