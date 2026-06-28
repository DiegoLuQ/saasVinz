"use client";

import React from 'react';
import { FileText, FileBadge, FileCheck, Files } from 'lucide-react';
import type { DocumentStats } from '@/hooks/useDocuments';

export type DocType = 'all' | 'certificados' | 'recibos' | 'autorizaciones' | 'otros';

interface DocumentTypeFiltersProps {
    stats: DocumentStats;
    activeType: DocType;
    onChange: (type: DocType) => void;
}

interface FilterCardConfig {
    key: Exclude<DocType, 'all'>;
    label: string;
    description: string;
    icon: React.ReactNode;
    accent: string;
    iconBg: string;
    valueColor: string;
    activeRing: string;
}

const CARDS: FilterCardConfig[] = [
    {
        key: 'certificados',
        label: 'Certificados',
        description: 'Generados al completar servicios',
        icon: <FileText size={20} />,
        accent: 'from-blue-500/15 to-cyan-500/[0.03]',
        iconBg: 'bg-gradient-to-br from-blue-500/25 to-cyan-500/15 text-blue-300 ring-1 ring-blue-400/20',
        valueColor: 'text-blue-300',
        activeRing: 'ring-blue-400/40',
    },
    {
        key: 'recibos',
        label: 'Recibos',
        description: 'Comprobantes de pago',
        icon: <FileBadge size={20} />,
        accent: 'from-emerald-500/15 to-teal-500/[0.03]',
        iconBg: 'bg-gradient-to-br from-emerald-500/25 to-teal-500/15 text-emerald-300 ring-1 ring-emerald-400/20',
        valueColor: 'text-emerald-300',
        activeRing: 'ring-emerald-400/40',
    },
    {
        key: 'autorizaciones',
        label: 'Autorizaciones',
        description: 'Consentimientos legales',
        icon: <FileCheck size={20} />,
        accent: 'from-purple-500/15 to-fuchsia-500/[0.03]',
        iconBg: 'bg-gradient-to-br from-purple-500/25 to-fuchsia-500/15 text-purple-300 ring-1 ring-purple-400/20',
        valueColor: 'text-purple-300',
        activeRing: 'ring-purple-400/40',
    },
    {
        key: 'otros',
        label: 'Otros',
        description: 'Archivos adjuntos',
        icon: <Files size={20} />,
        accent: 'from-orange-500/15 to-amber-500/[0.03]',
        iconBg: 'bg-gradient-to-br from-orange-500/25 to-amber-500/15 text-orange-300 ring-1 ring-orange-400/20',
        valueColor: 'text-orange-300',
        activeRing: 'ring-orange-400/40',
    },
];

export default function DocumentTypeFilters({ stats, activeType, onChange }: DocumentTypeFiltersProps) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {CARDS.map(card => {
                const isActive = activeType === card.key;
                const count = stats[card.key];
                return (
                    <button
                        key={card.key}
                        type="button"
                        onClick={() => onChange(isActive ? 'all' : card.key)}
                        aria-pressed={isActive}
                        aria-label={`Filtrar por ${card.label} (${count})`}
                        title={card.description}
                        className={`
                            text-left relative overflow-hidden p-5 rounded-2xl border transition-all duration-300
                            bg-gradient-to-br ${card.accent}
                            ${isActive
                                ? `ring-2 ${card.activeRing} border-transparent scale-[1.02] shadow-xl shadow-black/30`
                                : 'border-white/[0.06] hover:border-white/[0.14] hover:scale-[1.01]'
                            }
                            active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                        `}
                    >
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
                            {count}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1.5 truncate">
                            {card.description}
                        </p>
                    </button>
                );
            })}
        </div>
    );
}
