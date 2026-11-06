"use client";

import React, { useState } from 'react';
import { MONTHS_ES, PRECISION_LABELS, THIS_YEAR, partialPrecision, validYear, type DatePrecision } from '@/lib/petDates';

interface Props {
    /** «2015» · «2015-03» · «2015-03-12» · '' */
    value: string;
    onChange: (value: string) => void;
    /** Clases del campo (input-emotional + error). */
    className?: string;
    ariaLabel?: string;
}

const MODES: DatePrecision[] = ['day', 'month', 'year'];

/**
 * Fecha del formulario de la familia: completa, mes y año o solo el año
 * (muchas familias no recuerdan el día). Se envía como texto parcial y el
 * backend guarda la precisión en la ficha (utils/partial_dates.py).
 */
export default function PartialDateInput({ value, onChange, className = '', ariaLabel }: Props) {
    const [mode, setMode] = useState<DatePrecision>(partialPrecision(value));
    const [year, setYear] = useState(value.slice(0, 4));
    const [month, setMonth] = useState(value.length >= 7 ? value.slice(5, 7) : '');
    // Si el valor cambia desde afuera (borrador recuperado), se sincroniza al renderizar
    const [prevValue, setPrevValue] = useState(value);
    if (value !== prevValue) {
        setPrevValue(value);
        if (value) {
            setMode(partialPrecision(value));
            setYear(value.slice(0, 4));
            if (value.length >= 7) setMonth(value.slice(5, 7));
        }
    }

    const emit = (m: DatePrecision, y: string, mo: string) => {
        if (m === 'year') onChange(validYear(y) ? y : '');
        else if (m === 'month') onChange(validYear(y) && mo ? `${y}-${mo}` : '');
    };
    const switchMode = (m: DatePrecision) => {
        setMode(m);
        if (m === 'day') onChange('');
        else emit(m, year, month);
    };
    const today = new Date().toISOString().slice(0, 10);
    const partial = mode !== 'day' && year !== '' && !validYear(year);

    const yearInput = (
        <input type="text" inputMode="numeric" maxLength={4} placeholder={mode === 'month' ? 'Año' : `Año (ej: ${THIS_YEAR - 8})`}
            aria-label={ariaLabel ? `${ariaLabel} (año)` : 'Año'} value={year}
            onChange={(e) => { const y = e.target.value.replace(/\D/g, '').slice(0, 4); setYear(y); emit(mode, y, month); }}
            className={className} />
    );

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={ariaLabel}>
                {MODES.map((m) => (
                    <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => switchMode(m)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${mode === m
                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                            : 'bg-white/60 text-slate-600 border-slate-300 hover:border-slate-500 dark:bg-white/5 dark:text-slate-300 dark:border-white/15'}`}>
                        {PRECISION_LABELS[m]}
                    </button>
                ))}
            </div>
            {mode === 'day' ? (
                <input type="date" value={/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''} max={today}
                    aria-label={ariaLabel} onChange={(e) => onChange(e.target.value)} className={className} />
            ) : mode === 'month' ? (
                <div className="grid grid-cols-[1.3fr_1fr] gap-2">
                    <select value={month} aria-label={ariaLabel ? `${ariaLabel} (mes)` : 'Mes'}
                        onChange={(e) => { setMonth(e.target.value); emit('month', year, e.target.value); }}
                        className={className}>
                        <option value="">Mes</option>
                        {MONTHS_ES.map((name, i) => (
                            <option key={name} value={String(i + 1).padStart(2, '0')}>{name[0].toUpperCase() + name.slice(1)}</option>
                        ))}
                    </select>
                    {yearInput}
                </div>
            ) : yearInput}
            {partial && <p className="text-xs text-amber-600">Escribe el año con 4 dígitos.</p>}
        </div>
    );
}
