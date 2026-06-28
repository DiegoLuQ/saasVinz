'use client';

import React from 'react';

interface FormDatePickerProps {
    label: string;
    name: string;
    value: string;
    onChange: (val: string) => void;
    required?: boolean;
}

export default function FormDatePicker({
    label, name, value, onChange, required = false
}: FormDatePickerProps) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={name} className="block text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
                {label} {required && <span className="text-rose-400">*</span>}
            </label>
            <input
                id={name}
                name={name}
                type="date"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300/40 focus:border-blue-300 transition-all duration-300"
            />
        </div>
    );
}
