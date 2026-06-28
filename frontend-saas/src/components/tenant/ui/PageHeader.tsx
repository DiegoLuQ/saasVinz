"use client";

import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
    /** Optional back button — calls callback when present */
    onBack?: () => void;
    backLabel?: string;

    /** Optional small badge above title (e.g. section name) */
    badge?: {
        icon?: React.ReactNode;
        label: string;
    };

    /** Main page title (required) */
    title: React.ReactNode;
    /** Optional accent dot color after the title (Tailwind text-* class). Default 'text-primary' */
    titleAccentClass?: string;

    /** Optional subtitle paragraph */
    subtitle?: React.ReactNode;

    /** Right-side actions (buttons, badges). On mobile these stack below the title. */
    actions?: React.ReactNode;

    /** Extra wrapper className */
    className?: string;
}

/**
 * Reusable page header — handles responsive layout consistently across the dashboard.
 *
 * On mobile (< sm): title on top, actions stack below, full width.
 * On tablet+ (≥ md): title on left, actions on right.
 */
export default function PageHeader({
    onBack,
    backLabel = 'Volver',
    badge,
    title,
    titleAccentClass = 'text-primary',
    subtitle,
    actions,
    className = '',
}: PageHeaderProps) {
    return (
        <header className={`flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-6 ${className}`}>
            <div className="min-w-0">
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="inline-flex items-center text-muted-foreground hover:text-white transition-colors mb-3 text-sm font-medium"
                    >
                        <ArrowLeft size={16} className="mr-2" aria-hidden="true" />
                        {backLabel}
                    </button>
                )}

                {badge && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-3">
                        {badge.icon && <span className="text-primary">{badge.icon}</span>}
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.22em]">
                            {badge.label}
                        </span>
                    </div>
                )}

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
                    {title}
                    <span className={`${titleAccentClass} ml-1`}>.</span>
                </h1>

                {subtitle && (
                    <p className="text-muted-foreground mt-1.5 sm:mt-2 text-sm max-w-xl">
                        {subtitle}
                    </p>
                )}
            </div>

            {actions && (
                <div className="flex flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 shrink-0">
                    {actions}
                </div>
            )}
        </header>
    );
}
