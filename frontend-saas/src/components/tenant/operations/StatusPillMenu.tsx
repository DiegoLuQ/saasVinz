"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const statusColors: Record<string, string> = {
    'pendiente': 'bg-orange-500/15 text-orange-300 border-orange-500/25',
    'en_proceso': 'bg-blue-500/15 text-blue-300 border-blue-500/25',
    'coordinado': 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25',
    'entregado': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    'cancelado': 'bg-red-500/15 text-red-300 border-red-500/25',
};

const statusLabels: Record<string, string> = {
    'pendiente': 'Pendiente',
    'en_proceso': 'En Proceso',
    'coordinado': 'Coordinado',
    'entregado': 'Entregado',
    'cancelado': 'Cancelado',
};

const statusDots: Record<string, string> = {
    'pendiente': 'bg-orange-400',
    'en_proceso': 'bg-blue-400',
    'coordinado': 'bg-indigo-400',
    'entregado': 'bg-emerald-400',
    'cancelado': 'bg-red-400',
};

// Map English/legacy values to the canonical Spanish ones.
// Estado final único = entregado ('completado'/'ready' quedan retirados).
const normalize = (raw: string): string => {
    const v = raw.trim().toLowerCase();
    if (['pending', 'received'].includes(v)) return 'pendiente';
    if (['processing', 'ready'].includes(v)) return 'en_proceso';
    if (['delivered', 'completed', 'completado'].includes(v)) return 'entregado';
    if (['canceled'].includes(v)) return 'cancelado';
    return v;
};

interface StatusPillMenuProps {
    value: string;
    isLoading?: boolean;
    onChange: (next: string) => void;
}

export default function StatusPillMenu({ value, isLoading = false, onChange }: StatusPillMenuProps) {
    const [open, setOpen] = useState(false);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const current = normalize(value);
    const colorClass = statusColors[current] || 'bg-gray-500/15 text-gray-300 border-gray-500/25';
    const dotClass = statusDots[current] || 'bg-gray-400';
    const label = statusLabels[current] || value;

    const openMenu = () => {
        if (isLoading) return;
        if (triggerRef.current) {
            setRect(triggerRef.current.getBoundingClientRect());
        }
        setOpen(true);
    };

    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            const t = e.target as HTMLElement;
            if (!t.closest('[data-status-menu]') && !t.closest('[data-status-trigger]')) {
                setOpen(false);
            }
        };
        const onScroll = () => setOpen(false);
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onClick);
        document.addEventListener('scroll', onScroll, true);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClick);
            document.removeEventListener('scroll', onScroll, true);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const handleSelect = (next: string) => {
        setOpen(false);
        if (next !== current) onChange(next);
    };

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                data-status-trigger
                disabled={isLoading}
                onClick={openMenu}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={`Estado: ${label}. Click para cambiar`}
                className={`
                    inline-flex items-center gap-2 px-3 py-1.5 rounded-full border
                    text-[10px] font-black uppercase tracking-[0.14em] transition-all
                    ${colorClass}
                    ${isLoading ? 'opacity-60 cursor-wait' : 'hover:brightness-125 active:scale-95 cursor-pointer'}
                `}
            >
                <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} aria-hidden="true" />
                <span>{label}</span>
                {isLoading ? (
                    <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                ) : (
                    <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
                )}
            </button>

            {mounted && open && rect && createPortal(
                <AnimatePresence>
                    <motion.div
                        data-status-menu
                        role="listbox"
                        initial={{ opacity: 0, y: -6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.96 }}
                        transition={{ duration: 0.12 }}
                        style={{
                            position: 'fixed',
                            top: rect.bottom + 8,
                            left: Math.max(8, rect.left + rect.width / 2 - 110),
                            width: 220,
                            zIndex: 9999,
                        }}
                        className="bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/60 ring-1 ring-primary/10 overflow-hidden p-1.5"
                    >
                        {Object.entries(statusLabels).map(([key, lbl]) => {
                            const isActive = key === current;
                            return (
                                <button
                                    key={key}
                                    role="option"
                                    aria-selected={isActive}
                                    onClick={() => handleSelect(key)}
                                    className={`
                                        w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left
                                        text-[11px] font-bold uppercase tracking-wider transition-colors
                                        ${isActive ? 'bg-primary/15 text-primary' : 'text-white/80 hover:bg-white/[0.06]'}
                                    `}
                                >
                                    <span className="flex items-center gap-2">
                                        <span className={`w-1.5 h-1.5 rounded-full ${statusDots[key]}`} aria-hidden="true" />
                                        {lbl}
                                    </span>
                                    {isActive && <Check size={12} aria-hidden="true" />}
                                </button>
                            );
                        })}
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
