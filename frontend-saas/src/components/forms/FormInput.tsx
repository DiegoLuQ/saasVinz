'use client';

import React from 'react';

interface FormInputProps {
    label: string;
    name: string;
    value: string;
    onChange: (val: string) => void;
    type?: 'text' | 'email' | 'tel' | 'number';
    placeholder?: string;
    required?: boolean;
    maxLength?: number;
}

export default function FormInput({
    label, name, value, onChange,
    type = 'text', placeholder = '', required = false, maxLength
}: FormInputProps) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={name} className="block text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
                {label} {required && <span className="text-rose-400">*</span>}
            </label>
            <input
                id={name}
                name={name}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                maxLength={maxLength}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300/40 focus:border-blue-300 transition-all duration-300"
            />
        </div>
    );
}
