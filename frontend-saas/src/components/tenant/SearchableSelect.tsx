"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
    value: string | number;
    label: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string | number | (string | number)[];
    onChange: (value: any) => void;
    placeholder?: string;
    className?: string;
    required?: boolean;
    isMulti?: boolean;
    icon?: React.ReactNode;
    triggerClassName?: string;
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Seleccionar...',
    className = '',
    required = false,
    isMulti = false,
    icon,
    triggerClassName = ''
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
    const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
    const [dynamicMaxHeight, setDynamicMaxHeight] = useState(280);
    const containerRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const getDisplayValue = () => {
        if (isMulti && Array.isArray(value)) {
            if (value.length === 0) return placeholder;
            const labels = value.map(v => options.find(opt => opt.value === v)?.label).filter(Boolean);
            if (labels.length === 1) return labels[0];
            return `${labels.length} seleccionados`;
        }
        const selected = options.find(opt => opt.value === value);
        return selected ? selected.label : placeholder;
    };

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const updatePosition = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setDropdownRect(rect);

            const margin = 16;
            const spaceBelow = window.innerHeight - rect.bottom - margin;
            const spaceAbove = rect.top - margin;
            // Abrimos siempre hacia el lado con MÁS espacio y limitamos la altura
            // del panel completo (header + lista) al espacio realmente disponible,
            // sin forzar un mínimo que lo haga desbordar la pantalla. Así la lista
            // siempre cabe en el viewport y scrollea internamente (antes, dentro de
            // un modal el panel se salía por abajo y se cortaban opciones y scroll).
            const preferBottom = spaceBelow >= spaceAbove;
            const available = preferBottom ? spaceBelow : spaceAbove;

            setPlacement(preferBottom ? 'bottom' : 'top');
            setDynamicMaxHeight(Math.min(340, Math.max(0, available)));
        }
    };

    // Use useLayoutEffect to calculate position immediately when isOpen changes to true
    // before the browser paints the component
    useLayoutEffect(() => {
        if (isOpen) {
            updatePosition();
            const handleUpdate = () => updatePosition();
            window.addEventListener('scroll', handleUpdate, true);
            window.addEventListener('resize', handleUpdate);
            return () => {
                window.removeEventListener('scroll', handleUpdate, true);
                window.removeEventListener('resize', handleUpdate);
            };
        } else {
            setSearchTerm('');
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                const target = event.target as HTMLElement;
                if (target.closest('.searchable-select-dropdown')) return;
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue: string | number) => {
        if (isMulti) {
            const currentValues = Array.isArray(value) ? value : [];
            const newValue = currentValues.includes(optionValue)
                ? currentValues.filter(v => v !== optionValue)
                : [...currentValues, optionValue];
            onChange(newValue);
        } else {
            onChange(optionValue);
            setIsOpen(false);
        }
    };

    const handleToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const newState = !isOpen;
        if (newState) {
            updatePosition();
        }
        setIsOpen(newState);
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                onClick={handleToggle}
                className={`w-full h-[52px] backdrop-blur-md border rounded-2xl px-5 flex items-center justify-between cursor-pointer transition-all duration-300 group shadow-lg shadow-black/5 ${isOpen ? 'border-primary/50 ring-4 ring-primary/10 bg-black/20' : 'border-white/10 bg-card/40 hover:bg-card/60'
                    } ${triggerClassName}`}
            >
                <div className="flex items-center min-w-0 flex-1">
                    {icon && <div className={`mr-3 transition-colors ${isOpen ? 'text-primary' : 'text-muted-foreground'}`}>{icon}</div>}
                    <span className={`block truncate text-sm font-bold tracking-tight ${(!value || (Array.isArray(value) && value.length === 0)) ? 'text-muted-foreground/40' : 'text-foreground'}`}>
                        {getDisplayValue()}
                    </span>
                </div>
                <ChevronDown size={18} className={`text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
            </div>

            {isOpen && mounted && dropdownRect && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        top: placement === 'bottom' ? dropdownRect.bottom + 8 : 'auto',
                        bottom: placement === 'top' ? window.innerHeight - dropdownRect.top + 8 : 'auto',
                        left: dropdownRect.left,
                        width: dropdownRect.width,
                        zIndex: 9999,
                        maxHeight: dynamicMaxHeight, // Panel completo (header + lista), acotado al viewport
                    }}
                    className="searchable-select-dropdown bg-white border-2 border-primary rounded-xl shadow-2xl flex flex-col overflow-hidden"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="p-3 border-b border-gray-200 bg-gray-50 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                autoFocus
                                placeholder="Filtrar opciones..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded-lg py-2 pl-9 pr-3 text-xs outline-none focus:border-primary text-gray-900"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    {/* List */}
                    <div className="overflow-y-auto flex-1 min-h-0 p-2 bg-white">
                        {filteredOptions.length > 0 ? (
                            <div className="space-y-1">
                                {filteredOptions.map((option) => {
                                    const isSelected = isMulti
                                        ? (Array.isArray(value) && value.includes(option.value))
                                        : value === option.value;

                                    return (
                                        <div
                                            key={option.value}
                                            onClick={() => handleSelect(option.value)}
                                            className={`px-4 py-3 rounded-xl text-sm cursor-pointer transition-all flex items-center justify-between ${isSelected
                                                ? 'bg-primary text-white font-bold shadow-lg'
                                                : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900 font-medium'
                                                }`}
                                        >
                                            <span>{option.label}</span>
                                            {isSelected && <Check size={16} className="text-white" />}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-8 text-center text-gray-400 italic text-xs">
                                No se encontraron resultados
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div >
    );
}
