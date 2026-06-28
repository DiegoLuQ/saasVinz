"use client";

import React from 'react';

export interface TabItem {
    key: string;
    label: React.ReactNode;
    icon?: React.ReactNode;
    count?: number;
    disabled?: boolean;
}

interface ResponsiveTabsProps {
    tabs: TabItem[];
    activeKey: string;
    onChange: (key: string) => void;
    /** Visual variant — 'pills' (rounded) or 'underline' (border bottom). Default 'pills'. */
    variant?: 'pills' | 'underline';
    /** Optional aria-label for the tablist */
    ariaLabel?: string;
    className?: string;
}

/**
 * Tab navigation that scrolls horizontally on mobile and lays flat on desktop.
 * Uses `overflow-x-auto` with snap so individual tabs feel "stuck" when swiped.
 */
export default function ResponsiveTabs({
    tabs,
    activeKey,
    onChange,
    variant = 'pills',
    ariaLabel,
    className = '',
}: ResponsiveTabsProps) {
    const isPills = variant === 'pills';

    return (
        <div
            role="tablist"
            aria-label={ariaLabel}
            className={`
                flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory
                ${isPills ? '' : 'border-b border-white/[0.06]'}
                ${className}
            `}
        >
            {tabs.map(tab => {
                const isActive = tab.key === activeKey;
                return (
                    <button
                        key={tab.key}
                        role="tab"
                        type="button"
                        aria-selected={isActive}
                        disabled={tab.disabled}
                        onClick={() => !tab.disabled && onChange(tab.key)}
                        className={`
                            shrink-0 snap-start inline-flex items-center gap-2
                            transition-all whitespace-nowrap
                            disabled:opacity-40 disabled:cursor-not-allowed
                            ${isPills
                                ? `px-4 py-2 rounded-full border text-[11px] font-bold uppercase tracking-wider
                                    ${isActive
                                        ? 'bg-primary/15 text-primary border-primary/30 shadow-md shadow-primary/10'
                                        : 'bg-white/[0.02] text-muted-foreground border-white/[0.06] hover:bg-white/[0.05] hover:text-white'
                                    }`
                                : `px-4 py-3 -mb-px border-b-2 text-sm font-bold
                                    ${isActive
                                        ? 'text-primary border-primary'
                                        : 'text-muted-foreground border-transparent hover:text-white'
                                    }`
                            }
                        `}
                    >
                        {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
                        <span>{tab.label}</span>
                        {typeof tab.count === 'number' && (
                            <span
                                className={`
                                    text-[10px] font-mono
                                    ${isActive ? 'text-primary' : 'text-muted-foreground/70'}
                                `}
                            >
                                {tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
