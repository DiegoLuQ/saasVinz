"use client";

import React, { useEffect, useState } from 'react';
import { THIS_YEAR, MIN_PET_YEAR, isFullDate, yearToDate } from '@/lib/petDates';

interface Props {
    /** AAAA-MM-DD o '' */
    value: string;
    yearOnly: boolean;
    /** Se llama con una fecha completa (o '') y el modo; un año a medio escribir no se informa. */
    onChange: (value: string, yearOnly: boolean) => void;
    /** Al salir del campo o cambiar de modo (para guardar al momento). */
    onCommit?: (value: string, yearOnly: boolean) => void;
    max?: string;
    min?: string;
    className?: string;
    ariaLabel?: string;
    disabled?: boolean;
}

/** Interruptor «Fecha exacta / Solo año» + el campo que corresponda. */
export default function PetDateInput({ value, yearOnly, onChange, onCommit, max, min, className = '', ariaLabel, disabled }: Props) {
    const [yearText, setYearText] = useState(value.slice(0, 4));
    useEffect(() => { setYearText(value.slice(0, 4)); }, [value]);

    const setMode = (next: boolean) => {
        if (next === yearOnly) return;
        // Pasar a «solo año» deja el 1 de enero de ese año
        const v = next && isFullDate(value) ? `${value.slice(0, 4)}-01-01` : value;
        onChange(v, next);
        onCommit?.(v, next);
    };
    const btn = (active: boolean) => `px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${active
        ? 'bg-primary/15 text-primary'
        : 'text-slate-500 hover:text-slate-800 dark:text-white/40 dark:hover:text-white/70'}`;
    const partial = yearOnly && yearText !== '' && !yearToDate(yearText);

    return (
        <div className="space-y-1">
            <div className="inline-flex rounded-lg p-0.5 border bg-slate-100 border-slate-200 dark:bg-black/30 dark:border-white/10">
                <button type="button" disabled={disabled} className={btn(!yearOnly)} onClick={() => setMode(false)}>Fecha exacta</button>
                <button type="button" disabled={disabled} className={btn(yearOnly)} onClick={() => setMode(true)}>Solo año</button>
            </div>
            {yearOnly ? (
                <input
                    type="text" inputMode="numeric" maxLength={4} placeholder={`Ej: ${THIS_YEAR - 8}`}
                    value={yearText} disabled={disabled} aria-label={ariaLabel}
                    onChange={(e) => {
                        const y = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setYearText(y);
                        const d = yearToDate(y);
                        if (d || y === '') onChange(d, true);
                    }}
                    onBlur={() => onCommit?.(yearToDate(yearText), true)}
                    className={`${className} ${partial ? '!border-amber-500/60' : ''}`}
                />
            ) : (
                <input
                    type="date" value={value} max={max} min={min} disabled={disabled} aria-label={ariaLabel}
                    onChange={(e) => onChange(e.target.value, false)}
                    onBlur={(e) => onCommit?.(e.target.value, false)}
                    className={className}
                />
            )}
            {partial && <p className="text-[10px] text-amber-600 dark:text-amber-400">Año con 4 dígitos ({MIN_PET_YEAR}–{THIS_YEAR}).</p>}
        </div>
    );
}
