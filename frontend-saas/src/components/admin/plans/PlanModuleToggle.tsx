"use client";

import React from 'react';
import type { PlanTheme } from '@/lib/admin/planTheme';

export interface PlanModuleDef {
    key: string;
    name: string;
}

interface PlanModuleToggleProps {
    module: PlanModuleDef;
    isActive: boolean;
    onToggle: () => void;
    theme: PlanTheme;
}

export default function PlanModuleToggle({ module, isActive, onToggle, theme }: PlanModuleToggleProps) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={`flex items-center gap-3 p-3 rounded-xl text-xs font-medium transition-all text-left ${
                isActive
                    ? `${theme.bg} text-white border ${theme.border}`
                    : 'bg-[#0f2642] text-white/30 border border-white/5'
            }`}
        >
            <div className={`w-2 h-2 rounded-full ${isActive ? `${theme.accent} shadow-[0_0_8px_rgba(255,255,255,0.3)]` : 'bg-white/10'}`} />
            {module.name}
        </button>
    );
}
