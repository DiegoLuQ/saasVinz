"use client";

import React, { useState } from 'react';
import { MONTHS_ES, PRECISION_LABELS, THIS_YEAR, MIN_PET_YEAR, isFullDate, snapToPrecision, validYear, type DatePrecision } from '@/lib/petDates';

interface Props {
    /** AAAA-MM-DD o '' */
    value: string;
    precision: DatePrecision;
    /** Se llama con una fecha completa (o '') y la precisión; un año a medio escribir no se informa. */
    onChange: (value: string, precision: DatePrecision) => void;
    /** Al salir del campo o cambiar de modo (para guardar al momento). */
    onCommit?: (value: string, precision: DatePrecision) => void;
    max?: string;
    min?: string;
    className?: string;
    /** Clases del selector de modo (para fondos oscuros). */
    toggleClassName?: string;
    ariaLabel?: string;
    disabled?: boolean;
}

const MODES: DatePrecision[] = ['day', 'month', 'year'];

/** «Fecha completa / Mes y año / Solo año» + el campo que corresponda. */
export default function PetDateInput({ value, precision, onChange, onCommit, max, min, className = '', toggleClassName, ariaLabel, disabled }: Props) {
    const [yearText, setYearText] = useState(value.slice(0, 4));
    const [month, setMonth] = useState(value ? value.slice(5, 7) : '');
    const [prevValue, setPrevValue] = useState(value);
    if (value !== prevValue) {
        setPrevValue(value);
        setYearText(value.slice(0, 4));
        if (value) setMonth(value.slice(5, 7));
    }

    const setMode = (next: DatePrecision) => {
        if (next === precision) return;
        const v = snapToPrecision(value, next);
        onChange(v, next);
        onCommit?.(v, next);
    };
    // Mes y año / año: fecha completa solo cuando el año es válido (y hay mes)
    const build = (y: string, m: string, p: DatePrecision) =>
        !validYear(y) ? '' : p === 'year' ? `${y}-01-01` : m ? `${y}-${m}-01` : '';

    const btn = (active: boolean) => `px-2 py-0.5 rounded-md text-[10px] font-bold normal-case tracking-normal transition-colors ${active
        ? 'bg-primary/15 text-primary'
        : 'text-slate-500 hover:text-slate-800 dark:text-white/40 dark:hover:text-white/70'}`;
    const partial = precision !== 'day' && yearText !== '' && !validYear(yearText);

    const yearInput = (
        <input
            type="text" inputMode="numeric" maxLength={4} placeholder={`Ej: ${THIS_YEAR - 8}`}
            value={yearText} disabled={disabled} aria-label={ariaLabel ? `${ariaLabel} (año)` : 'Año'}
            onChange={(e) => {
                const y = e.target.value.replace(/\D/g, '').slice(0, 4);
                setYearText(y);
                const d = build(y, month, precision);
                if (d || y === '') onChange(d, precision);
            }}
            onBlur={() => onCommit?.(build(yearText, month, precision), precision)}
            className={`${className} ${partial ? '!border-amber-500/60' : ''}`}
        />
    );

    return (
        <div className="space-y-1">
            <div className={toggleClassName || 'inline-flex flex-wrap rounded-lg p-0.5 border bg-slate-100 border-slate-200 dark:bg-black/30 dark:border-white/10'}>
                {MODES.map((m) => (
                    <button key={m} type="button" disabled={disabled} className={btn(precision === m)} onClick={() => setMode(m)}>
                        {PRECISION_LABELS[m]}
                    </button>
                ))}
            </div>
            {precision === 'day' ? (
                <input
                    type="date" value={isFullDate(value) ? value : ''} max={max} min={min} disabled={disabled} aria-label={ariaLabel}
                    onChange={(e) => onChange(e.target.value, 'day')}
                    onBlur={(e) => onCommit?.(e.target.value, 'day')}
                    className={className}
                />
            ) : precision === 'month' ? (
                <div className="grid grid-cols-[1.4fr_1fr] gap-1.5">
                    <select value={month} disabled={disabled} aria-label={ariaLabel ? `${ariaLabel} (mes)` : 'Mes'}
                        onChange={(e) => {
                            const m = e.target.value;
                            setMonth(m);
                            const d = build(yearText, m, 'month');
                            onChange(d, 'month');
                            onCommit?.(d, 'month');
                        }}
                        className={className}>
                        <option value="">Mes</option>
                        {MONTHS_ES.map((name, i) => (
                            <option key={name} value={String(i + 1).padStart(2, '0')}>{name[0].toUpperCase() + name.slice(1)}</option>
                        ))}
                    </select>
                    {yearInput}
                </div>
            ) : yearInput}
            {partial && <p className="text-[10px] text-amber-600 dark:text-amber-400">Año con 4 dígitos ({MIN_PET_YEAR}–{THIS_YEAR}).</p>}
        </div>
    );
}
