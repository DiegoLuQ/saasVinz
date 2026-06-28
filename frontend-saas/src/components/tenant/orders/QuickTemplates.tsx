"use client";

import React, { useState } from 'react';
import { Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ORDER_TEMPLATES, type OrderTemplate } from '@/lib/tenant/orders/templates';

interface QuickTemplatesProps {
    onApply: (template: OrderTemplate) => void;
    disabled?: boolean;
}

/**
 * Collapsible panel of quick-start templates.
 * Shown only for NEW orders (not edits).
 * Operators can start from common configurations.
 */
export default function QuickTemplates({ onApply, disabled }: QuickTemplatesProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-white/[0.03] rounded-2xl border border-white/10 overflow-hidden transition-colors duration-300">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all"
                aria-expanded={isOpen}
                aria-controls="templates-panel"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/10 rounded-xl" aria-hidden="true">
                        <Zap size={16} className="text-violet-400" />
                    </div>
                    <div className="text-left">
                        <p className="text-xs font-black text-white uppercase tracking-tight">Plantillas Rápidas</p>
                        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Empieza desde una configuración predefinida</p>
                    </div>
                </div>
                {isOpen ? (
                    <ChevronUp size={16} className="text-muted-foreground" />
                ) : (
                    <ChevronDown size={16} className="text-muted-foreground" />
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        id="templates-panel"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-2 gap-3 p-4 pt-0">
                            {ORDER_TEMPLATES.map(template => (
                                <button
                                    key={template.id}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => {
                                        onApply(template);
                                        setIsOpen(false);
                                    }}
                                    className="group flex flex-col items-start gap-2 p-4 bg-white/5 border border-white/5 rounded-xl
                                        hover:bg-violet-500/10 hover:border-violet-500/20 transition-all active:scale-95
                                        disabled:opacity-40 disabled:cursor-not-allowed text-left"
                                    aria-label={`Aplicar plantilla: ${template.name}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg" aria-hidden="true">{template.icon}</span>
                                        <span className="text-[10px] font-black text-white uppercase tracking-wider group-hover:text-violet-300 transition-colors">
                                            {template.name}
                                        </span>
                                    </div>
                                    <p className="text-[9px] text-muted-foreground font-medium leading-snug line-clamp-2">
                                        {template.description}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
