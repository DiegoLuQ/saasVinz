"use client";

import React from 'react';
import { Layers, Clock, Flame, Sun } from 'lucide-react';

export type OpsFilter = 'all' | 'pendiente' | 'en_proceso' | 'today';

interface OperationsStatsCardsProps {
    counts: {
        all: number;
        pendiente: number;
        en_proceso: number;
        today: number;
    };
    activeFilter: OpsFilter;
    onChange: (filter: OpsFilter) => void;
}

interface CardConfig {
    key: OpsFilter;
    label: string;
    icon: React.ReactNode;
    accent: string;
    iconBg: string;
    valueColor: string;
}

const CARDS: CardConfig[] = [
    {
        key: 'all',
        label: 'Total',
        icon: <Layers size={20} />,
        accent: 'from-white/10 to-white/[0.02] ring-white/15',
        iconBg: 'bg-white/10 text-white',
        valueColor: 'text-white',
    },
    {
        key: 'pendiente',
        label: 'Pendientes',
        icon: <Clock size={20} />,
        accent: 'from-orange-500/15 to-orange-500/[0.02] ring-orange-500/30',
        iconBg: 'bg-gradient-to-br from-orange-500/20 to-orange-600/10 text-orange-300',
        valueColor: 'text-orange-300',
    },
    {
        key: 'en_proceso',
        label: 'En Curso',
        icon: <Flame size={20} />,
        accent: 'from-blue-500/15 to-blue-500/[0.02] ring-blue-500/30',
        iconBg: 'bg-gradient-to-br from-blue-500/20 to-blue-600/10 text-blue-300',
        valueColor: 'text-blue-300',
    },
    {
        key: 'today',
        label: 'Hoy',
        icon: <Sun size={20} />,
        accent: 'from-emerald-500/15 to-emerald-500/[0.02] ring-emerald-500/30',
        iconBg: 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 text-emerald-300',
        valueColor: 'text-emerald-300',
    },
];

export default function OperationsStatsCards({ counts, activeFilter, onChange }: OperationsStatsCardsProps) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {CARDS.map(card => {
                const isActive = activeFilter === card.key;
                const value = counts[card.key];
                return (
                    <button
                        key={card.key}
                        type="button"
                        onClick={() => onChange(card.key)}
                        aria-pressed={isActive}
                        aria-label={`Filtrar por ${card.label} (${value})`}
                        className={`
                            text-left relative overflow-hidden p-5 rounded-2xl border transition-all duration-300
                            bg-gradient-to-br ${card.accent}
                            ${isActive
                                ? 'ring-2 border-transparent scale-[1.02] shadow-xl shadow-black/30'
                                : 'border-white/[0.06] hover:border-white/[0.12] hover:scale-[1.01]'
                            }
                            active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                        `}
                    >
                        {/* Active indicator dot */}
                        {isActive && (
                            <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
                        )}

                        <div className="flex items-start justify-between mb-3">
                            <div className={`p-2.5 rounded-xl ${card.iconBg}`} aria-hidden="true">
                                {card.icon}
                            </div>
                        </div>

                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em] mb-1">
                            {card.label}
                        </p>
                        <p className={`text-3xl lg:text-4xl font-black tracking-tight font-mono ${card.valueColor}`}>
                            {value}
                        </p>
                    </button>
                );
            })}
        </div>
    );
}
