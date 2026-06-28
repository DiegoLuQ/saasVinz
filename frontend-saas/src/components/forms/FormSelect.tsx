'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SelectOption {
    label: string;
    value: string;
}

interface FormSelectProps {
    label: string;
    name: string;
    value: string;
    onChange: (val: string) => void;
    options: (string | SelectOption)[];
    required?: boolean;
    placeholder?: string;
}

export default function FormSelect({
    label, name, value, onChange, options, required = false, placeholder = 'Seleccionar...'
}: FormSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
    };

    const getLabel = (val: string) => {
        const opt = options.find(o => typeof o === 'string' ? o === val : o.value === val);
        if (!opt) return val;
        return typeof opt === 'string' ? opt : opt.label;
    };

    return (
        <div className="space-y-1.5" ref={containerRef}>
            <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
                {label} {required && <span className="text-rose-400">*</span>}
            </label>

            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-300 text-sm ${isOpen
                        ? 'border-blue-400 bg-white ring-4 ring-blue-500/5'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                        } ${value ? 'text-slate-800' : 'text-slate-400'}`}
                >
                    <span className="truncate">{getLabel(value) || placeholder}</span>
                    <ChevronDown
                        size={16}
                        className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 5, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="absolute z-[120] w-full bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 overflow-hidden"
                        >
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                {options.map((opt) => {
                                    const optValue = typeof opt === 'string' ? opt : opt.value;
                                    const optLabel = typeof opt === 'string' ? opt : opt.label;
                                    const isSelected = value === optValue;

                                    return (
                                        <button
                                            key={optValue}
                                            type="button"
                                            onClick={() => handleSelect(optValue)}
                                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-colors ${isSelected
                                                ? 'bg-blue-50 text-blue-600 font-bold'
                                                : 'text-slate-600 hover:bg-slate-50'
                                                }`}
                                        >
                                            {optLabel}
                                            {isSelected && <Check size={14} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <input type="hidden" name={name} value={value} required={required} />
        </div>
    );
}
