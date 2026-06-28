"use client";

import React from 'react';
import { GitCompare } from 'lucide-react';
import type { Cremation } from '@/lib/tenant/orders/types';

interface ChangeDiffBadgeProps {
    field: string;
    originalValue?: string | number | null;
    currentValue?: string | number | null;
}

/**
 * Small badge that appears next to a field when editing an existing order
 * and the value has been modified from the original.
 * Shows a "Modificado" indicator with the original value on hover.
 */
export default function ChangeDiffBadge({ field, originalValue, currentValue }: ChangeDiffBadgeProps) {
    // Normalize for comparison
    const origStr = String(originalValue ?? '').trim();
    const currStr = String(currentValue ?? '').trim();

    if (origStr === currStr) return null;

    return (
        <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-[8px] font-black text-yellow-400 uppercase tracking-widest ml-2 cursor-help align-middle"
            title={`Valor original: ${origStr || '(vacío)'}`}
            aria-label={`Campo ${field} modificado. Valor original: ${origStr || 'vacío'}`}
        >
            <GitCompare size={8} aria-hidden="true" />
            Modificado
        </span>
    );
}

/**
 * Utility: compare two cremation objects and return list of changed fields.
 */
export function getChangedFields(
    original: Partial<Cremation>,
    current: Partial<Cremation>
): string[] {
    const fields: (keyof Cremation)[] = [
        'pet_id', 'status', 'scheduled_at', 'weight', 'weight_price',
        'region', 'city', 'address', 'notes', 'discount',
    ];

    return fields.filter(field => {
        const origVal = String(original[field] ?? '').trim();
        const currVal = String(current[field] ?? '').trim();
        return origVal !== currVal;
    });
}
