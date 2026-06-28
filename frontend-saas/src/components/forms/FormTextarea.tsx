'use client';

import React from 'react';

interface FormTextareaProps {
    label: string;
    name: string;
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    required?: boolean;
    maxLength?: number;
    rows?: number;
}

export default function FormTextarea({
    label, name, value, onChange,
    placeholder = '', required = false, maxLength = 1000, rows = 4
}: FormTextareaProps) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <label htmlFor={name} className="block text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
                    {label} {required && <span className="text-rose-400">*</span>}
                </label>
                {maxLength && (
                    <span className={`text-[10px] font-medium tabular-nums ${value.length >= maxLength ? 'text-rose-400' : 'text-slate-400'}`}>
                        {value.length}/{maxLength}
                    </span>
                )}
            </div>
            <textarea
                id={name}
                name={name}
                value={value}
                onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
                placeholder={placeholder}
                required={required}
                rows={rows}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300/40 focus:border-blue-300 transition-all duration-300 resize-none"
            />
        </div>
    );
}
