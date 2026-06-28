"use client";

import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    loading?: boolean;
    /** Tailwind classes for the active page button. Defaults to a blue accent. */
    activeClass?: string;
    /** Number of page buttons displayed at once. Defaults to 5. */
    windowSize?: number;
}

const DEFAULT_ACTIVE_CLASS = 'bg-blue-500 text-white shadow-lg shadow-blue-500/20';

export default function Pagination({
    page,
    totalPages,
    total,
    pageSize,
    onPageChange,
    loading = false,
    activeClass = DEFAULT_ACTIVE_CLASS,
    windowSize = 5,
}: PaginationProps) {
    const visiblePages = useMemo(() => {
        if (totalPages <= 1) return [] as number[];
        const start = Math.max(
            1,
            Math.min(page - Math.floor(windowSize / 2), totalPages - windowSize + 1)
        );
        const end = Math.min(totalPages, start + windowSize - 1);
        const pages: number[] = [];
        for (let i = Math.max(1, start); i <= end; i++) pages.push(i);
        return pages;
    }, [page, totalPages, windowSize]);

    if (totalPages <= 0) return null;

    const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const rangeEnd = Math.min(page * pageSize, total);

    return (
        <div className="px-8 py-5 border-t border-white/5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white/[0.02]">
            <div className="text-[11px] font-bold uppercase tracking-widest text-white/30">
                Mostrando <span className="text-white/70">{rangeStart}</span>–
                <span className="text-white/70">{rangeEnd}</span> de{' '}
                <span className="text-white/70">{total}</span>
            </div>
            <div className="flex items-center gap-1.5">
                <button
                    type="button"
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={page <= 1 || loading}
                    className="p-2 rounded-lg border border-white/10 text-white/70 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Página anterior"
                >
                    <ChevronLeft size={16} />
                </button>
                {visiblePages.map(n => (
                    <button
                        key={n}
                        type="button"
                        onClick={() => onPageChange(n)}
                        disabled={loading}
                        className={`min-w-[36px] px-3 py-1.5 rounded-lg text-xs font-black tracking-widest transition-colors ${n === page
                            ? activeClass
                            : 'border border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                            }`}
                        aria-current={n === page ? 'page' : undefined}
                    >
                        {n}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages || loading}
                    className="p-2 rounded-lg border border-white/10 text-white/70 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Página siguiente"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}
