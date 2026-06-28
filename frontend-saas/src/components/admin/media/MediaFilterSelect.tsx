"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface FilterOption {
    value: string;
    label: string;
    count?: number;
}

interface MediaFilterSelectProps {
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (value: string) => void;
    icon?: React.ReactNode;
    /** Muestra buscador interno cuando hay muchas opciones. */
    searchable?: boolean;
}

/**
 * Dropdown oscuro y moderno para los filtros de la biblioteca de medios del admin.
 * Glassmorphism, animación de apertura, opción seleccionada resaltada, contadores
 * por opción y buscador opcional. Cierra con click-afuera y Escape.
 */
export default function MediaFilterSelect({
    label,
    value,
    options,
    onChange,
    icon,
    searchable,
}: MediaFilterSelectProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    const selected = options.find(o => o.value === value);
    const showSearch = searchable ?? options.length > 8;

    const filtered = useMemo(() => {
        if (!query.trim()) return options;
        const q = query.toLowerCase();
        return options.filter(o => o.label.toLowerCase().includes(q));
    }, [options, query]);

    useEffect(() => {
        if (!open) { setQuery(''); return; }
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    return (
        <div className="relative" ref={ref}>
            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-[0.12em] mb-1.5 ml-0.5">
                {label}
            </label>

            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`group w-full flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-sm transition-all duration-200 ${
                    open
                        ? 'border-primary/50 bg-white/[0.06] ring-4 ring-primary/10'
                        : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20'
                }`}
            >
                {icon && (
                    <span className={`shrink-0 transition-colors ${open ? 'text-primary' : 'text-white/40 group-hover:text-white/70'}`}>
                        {icon}
                    </span>
                )}
                <span className="flex-1 text-left truncate font-semibold text-white/90">
                    {selected?.label ?? '—'}
                </span>
                {selected?.count !== undefined && (
                    <span className="shrink-0 text-[10px] font-bold text-white/40 tabular-nums bg-white/5 rounded-full px-2 py-0.5">
                        {selected.count}
                    </span>
                )}
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-white/40 transition-transform duration-200 ${open ? 'rotate-180 text-primary' : ''}`}
                />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute z-50 mt-2 w-full min-w-[220px] rounded-2xl border border-white/10 bg-[#0b1220]/95 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden"
                    >
                        {showSearch && (
                            <div className="p-2.5 border-b border-white/5">
                                <div className="relative">
                                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                    <input
                                        autoFocus
                                        value={query}
                                        onChange={e => setQuery(e.target.value)}
                                        placeholder="Buscar…"
                                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-2 pl-8 pr-3 text-xs text-white placeholder:text-white/30 outline-none focus:border-primary/50"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
                            {filtered.length > 0 ? filtered.map(opt => {
                                const isSel = opt.value === value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => { onChange(opt.value); setOpen(false); }}
                                        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-colors ${
                                            isSel
                                                ? 'bg-primary/15 text-primary font-bold'
                                                : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                                        }`}
                                    >
                                        <span className="truncate">{opt.label}</span>
                                        <span className="flex items-center gap-2 shrink-0">
                                            {opt.count !== undefined && (
                                                <span className={`text-[10px] font-bold tabular-nums rounded-full px-1.5 py-0.5 ${isSel ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/40'}`}>
                                                    {opt.count}
                                                </span>
                                            )}
                                            {isSel && <Check size={15} className="text-primary" />}
                                        </span>
                                    </button>
                                );
                            }) : (
                                <div className="py-6 text-center text-white/30 text-xs italic">Sin resultados</div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
