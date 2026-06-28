"use client";

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: string;
    zIndex?: string;
}

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = 'max-w-2xl',
    zIndex = 'z-[300]',
}: ModalProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            const original = document.body.style.overflow;
            if (original !== 'hidden') {
                document.body.style.overflow = 'hidden';
            }
            window.addEventListener('keydown', handleEsc);
            return () => {
                const openModals = document.querySelectorAll('[aria-modal="true"]');
                if (openModals.length <= 1) {
                    document.body.style.overflow = '';
                }
                window.removeEventListener('keydown', handleEsc);
            };
        }
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className={`fixed inset-0 ${zIndex} flex items-center justify-center p-3 sm:p-4`}
                    role="dialog"
                    aria-modal="true"
                    aria-label={title}
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Body — flex column so header stays put while content scrolls */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 16 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className={`
                            relative w-full ${maxWidth}
                            max-h-[90dvh] flex flex-col
                            bg-card border border-white/10 rounded-3xl sm:rounded-[2.5rem]
                            shadow-2xl overflow-hidden
                        `}
                    >
                        {/* Header (sticky) */}
                        <div className="flex items-center justify-between p-4 sm:p-6 lg:p-8 border-b border-white/5 bg-white/[0.02] shrink-0">
                            <h3 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight truncate pr-2">
                                {title}
                            </h3>
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2.5 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-foreground transition-all shrink-0"
                                aria-label="Cerrar modal"
                            >
                                <X size={20} aria-hidden="true" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
