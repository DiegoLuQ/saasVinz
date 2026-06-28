import React from 'react';

interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    accent?: 'primary' | 'green' | 'blue' | 'purple';
    disabled?: boolean;
}

const ACCENTS = {
    primary: 'bg-primary',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500'
};

export default function Switch({ checked, onChange, accent = 'primary', disabled }: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-40 disabled:cursor-not-allowed ${
                checked ? ACCENTS[accent] : 'bg-white/10'
            }`}
        >
            <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                    checked ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </button>
    );
}
