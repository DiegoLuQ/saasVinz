"use client";

import React from 'react';
import { Infinity as InfinityIcon } from 'lucide-react';
import type { PlanTheme } from '@/lib/admin/planTheme';

const UNLIMITED = 999999;

interface UnlimitedToggleProps {
    label: string;
    Icon: React.ComponentType<any>;
    value: number;
    onChange: (next: number) => void;
    theme: PlanTheme;
}

export default function UnlimitedToggle({ label, Icon, value, onChange, theme }: UnlimitedToggleProps) {
    const isUnlimited = value >= UNLIMITED;

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, '');
        const num = parseInt(raw, 10);
        if (Number.isNaN(num)) {
            onChange(0);
        } else {
            onChange(Math.min(num, UNLIMITED - 1));
        }
    };

    const toggleUnlimited = () => {
        onChange(isUnlimited ? 10 : UNLIMITED);
    };

    return (
        <div className="bg-[#0f2642] p-3 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase mb-2">
                <Icon size={10} className={theme.text} />
                {label}
            </div>

            <div className="flex items-center justify-between gap-2">
                {isUnlimited ? (
                    <div className="flex items-center gap-1.5 text-lg font-bold text-white">
                        <InfinityIcon size={18} className={theme.text} />
                        <span className="text-xs uppercase tracking-widest font-black text-white/50">Ilimitado</span>
                    </div>
                ) : (
                    <input
                        type="text"
                        inputMode="numeric"
                        value={value || 0}
                        onChange={handleNumberChange}
                        className="w-full bg-transparent text-lg font-bold text-white outline-none"
                        placeholder="0"
                    />
                )}

                <button
                    type="button"
                    onClick={toggleUnlimited}
                    title={isUnlimited ? 'Establecer un límite' : 'Marcar como ilimitado'}
                    className={`shrink-0 p-1.5 rounded-md transition-colors ${
                        isUnlimited
                            ? `${theme.bg} ${theme.text}`
                            : 'text-white/20 hover:text-white/60 hover:bg-white/5'
                    }`}
                >
                    <InfinityIcon size={14} />
                </button>
            </div>
        </div>
    );
}
