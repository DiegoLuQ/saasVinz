"use client";

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SlideOverProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    width?: string;
}

export default function SlideOver({
    isOpen,
    onClose,
    title,
    subtitle,
    icon,
    children,
    width = 'max-w-md',
}: SlideOverProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            const original = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleEsc);
            return () => {
                document.body.style.overflow = original;
                window.removeEventListener('keydown', handleEsc);
            };
        }
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-[100] flex justify-end"
                    role="dialog"
                    aria-modal="true"
                    aria-label={title}
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className={`relative w-full ${width} h-full flex flex-col bg-zinc-950 border-l border-white/[0.08] shadow-2xl shadow-black/50`}
                    >
                        {/* Header */}
                        <header className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06] bg-black/30 shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                {icon && (
                                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
                                        {icon}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <h2 className="text-sm font-black text-white tracking-tight uppercase truncate">
                                        {title}
                                    </h2>
                                    {subtitle && (
                                        <p className="text-[9px] text-muted-foreground/70 uppercase tracking-[0.18em] truncate">
                                            {subtitle}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2.5 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-white transition-all shrink-0"
                                aria-label="Cerrar panel"
                            >
                                <X size={20} />
                            </button>
                        </header>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
