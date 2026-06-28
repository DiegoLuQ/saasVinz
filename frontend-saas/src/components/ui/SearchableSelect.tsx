"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    allowCustom?: boolean; // New prop to allow typing custom values
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Seleccionar o escribir...",
    className = "",
    disabled = false,
    allowCustom = true
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Sync input value with external value
    useEffect(() => {
        // If the current value matches an option, show its label.
        // Otherwise, if custom values are allowed, show the raw value.
        const matchedOption = options.find(o => o.value === value);
        if (matchedOption) {
            setInputValue(matchedOption.label);
        } else if (value && allowCustom) {
            setInputValue(value);
        } else {
            setInputValue("");
        }
    }, [value, options, allowCustom]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // On blur, if valid selection not made and custom not meant to be kept without action... 
                // Actually we update onChange immediately on type, so logic holds.
                // Just reset input visual if purely invalid? 
                // No, sticking to "controlled" via effect covers us.
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(inputValue.toLowerCase())
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setIsOpen(true);

        if (allowCustom) {
            onChange(newValue);
        } else {
            // Only clear if empty? Or wait for selection?
            if (newValue === "") onChange("");
        }
    };

    const handleSelect = (option: Option) => {
        onChange(option.value); // Pass the value (e.g., "Particular")
        setInputValue(option.label); // Show the label (e.g., "Retiro Particular")
        setIsOpen(false);
    };

    const clearInput = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
        setInputValue("");
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onClick={() => !disabled && setIsOpen(true)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`
                        w-full min-h-[42px] px-4 py-2 pr-10 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl 
                        text-xs font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600
                        transition-all duration-200 outline-none
                        focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10
                        disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-900
                    `}
                />

                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {inputValue && !disabled && (
                        <button
                            onClick={clearInput}
                            className="p-1 text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 rounded-full transition-colors"
                        >
                            <X size={12} />
                        </button>
                    )}
                    <ChevronDown size={16} className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} pointerEvents="none" />
                </div>
            </div>

            <AnimatePresence>
                {isOpen && !disabled && filteredOptions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden"
                    >
                        <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                            {filteredOptions.map((option) => (
                                <div
                                    key={option.value}
                                    onClick={() => handleSelect(option)}
                                    className={`
                                        flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer
                                        transition-colors duration-150 group
                                        ${value === option.value ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}
                                    `}
                                >
                                    <span className={`text-xs font-bold uppercase tracking-wide ${value === option.value ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'}`}>
                                        {option.label}
                                    </span>
                                    {value === option.value && (
                                        <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
                                    )}
                                </div>
                            ))}
                            {filteredOptions.length === 0 && (
                                <div className="p-4 text-center text-slate-400 dark:text-slate-500 text-xs font-medium">
                                    No se encontraron resultados
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
