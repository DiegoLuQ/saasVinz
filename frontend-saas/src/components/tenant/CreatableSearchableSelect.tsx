"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
    value: string | number;
    label: string;
}

interface CreatableSearchableSelectProps {
    options: Option[];
    value: string | number | null;
    onChange: (value: string | number) => void;
    onCreate?: (value: string) => void; // Callback when a new item is created
    placeholder?: string;
    className?: string;
    required?: boolean;
    icon?: React.ReactNode;
    triggerClassName?: string;
}

export default function CreatableSearchableSelect({
    options,
    value,
    onChange,
    onCreate,
    placeholder = 'Seleccionar...',
    className = '',
    required = false,
    icon,
    triggerClassName = ''
}: CreatableSearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Get selected option label or value
    const getDisplayValue = () => {
        const found = options.find(opt => opt.value === value);
        if (found) return found.label;
        // If value exists but not in options, it might be a newly created raw value or just an ID we don't know yet? 
        // For this use case, we usually rely on 'options' being up to date, OR 'value' implies the ID.
        // However, if we support 'creatable', we might have a case where value is a string name?
        // Let's assume 'value' is always the ID, and we rely on updating 'options' externally or locally.

        // Actually for the "Badge" requirement, the user might want to see the text they just typed.
        // But the parent manages state. Let's assume parent passes us updated options/value.
        return value ? String(value) : placeholder;
    };

    // Better getDisplay strategy:
    // If value matches an option ID, show label.
    // If value is a string and NOT an ID, show value? No, value usually ID.
    // We will rely on options finding it.

    // Improve: If we passed a 'displayValue' prop? No, let's keep it simple.

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Check if search term exactly matches an existing option
    const exactMatch = options.some(opt => opt.label.toLowerCase() === searchTerm.toLowerCase());

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
        }
    }, [isOpen]);

    const handleSelect = (optionValue: string | number) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleCreate = () => {
        if (onCreate && searchTerm.trim()) {
            onCreate(searchTerm.trim());
            setIsOpen(false);
            setSearchTerm('');
        }
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Input/Trigger */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full backdrop-blur-md border rounded-2xl py-3 px-5 flex items-center justify-between cursor-pointer transition-all duration-300 group shadow-lg shadow-black/5 ${isOpen ? 'border-primary/50 ring-4 ring-primary/10' : 'border-white/10'} ${triggerClassName || 'bg-[#1a1f2e]/40 hover:bg-[#1a1f2e]/60'} ${isOpen && !triggerClassName ? 'bg-[#1a1f2e]/60' : ''}`}
            >
                <div className="flex items-center flex-1 min-w-0 mr-2">
                    {icon && <div className={`mr-3 text-muted-foreground group-hover:text-primary transition-all duration-300 ${isOpen ? 'text-primary scale-110' : ''}`}>{icon}</div>}
                    <span className={`block truncate text-sm font-bold tracking-tight ${!value ? 'text-muted-foreground/60' : 'text-white'}`}>
                        {options.find(opt => opt.value === value)?.label || (value && isNaN(Number(value)) ? value : placeholder)}
                    </span>
                </div>
                <ChevronDown size={18} className={`text-muted-foreground transition-all duration-500 group-hover:text-primary ${isOpen ? 'rotate-180 text-primary' : ''}`} />
            </div>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute z-80 w-full mt-3 bg-[#0f172a] border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/10"
                    >
                        {/* Search Input */}
                        <div className="p-4 border-b border-white/5 sticky top-0 bg-[#0f172a]/20 backdrop-blur-md z-10 rounded-t-3xl">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={14} />
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Buscar o crear..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground/40 transition-all font-medium"
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            if (filteredOptions.length > 0 && !exactMatch) {
                                                handleSelect(filteredOptions[0].value);
                                            } else if (!exactMatch && searchTerm.trim()) {
                                                handleCreate();
                                            }
                                        }
                                        if (e.key === 'Escape') setIsOpen(false);
                                    }}
                                />
                            </div>
                        </div>

                        {/* Options List */}
                        <div className="overflow-y-auto flex-1 p-2 max-h-[300px] scrollbar-thin scrollbar-thumb-white/10">
                            {/* Create Option */}
                            {searchTerm && !exactMatch && onCreate && (
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCreate();
                                    }}
                                    className="px-5 py-3 rounded-2xl text-sm cursor-pointer transition-all duration-200 flex items-center gap-2 group/create bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 mb-2 border border-emerald-500/20"
                                >
                                    <Plus size={14} className="group-hover/create:scale-110 transition-transform" />
                                    <span className="font-bold">Crear "{searchTerm}"</span>
                                </div>
                            )}

                            {filteredOptions.length > 0 ? (
                                <div className="space-y-1">
                                    {filteredOptions.map((option) => (
                                        <div
                                            key={option.value}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelect(option.value);
                                            }}
                                            className={`px-5 py-3 rounded-2xl text-sm cursor-pointer transition-all duration-200 flex items-center justify-between group/opt ${option.value === value
                                                ? 'bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20'
                                                : 'hover:bg-white/5 text-muted-foreground hover:text-white'
                                                }`}
                                        >
                                            <span className="truncate">{option.label}</span>
                                            {option.value === value && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                !searchTerm && (
                                    <div className="p-8 text-center">
                                        <Search size={24} className="mx-auto text-muted-foreground/20 mb-2" />
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50">
                                            Sin resultados
                                        </p>
                                    </div>
                                )
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
