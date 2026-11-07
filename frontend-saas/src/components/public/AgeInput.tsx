"use client";

import React from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';
import { AGE_UNIT_OPTIONS, ageMismatch, asAgeUnit, formatAge, type AgeUnit } from '@/lib/petAge';

interface Props {
    value: string;
    unit?: AgeUnit;
    /** true = calculada con las fechas */
    auto?: boolean;
    /** Edad calculada con nacimiento + fallecimiento (null = no hay ambas fechas) */
    calc: { value: number; unit: AgeUnit; approx: boolean } | null;
    onChange: (patch: { age?: string; ageUnit?: AgeUnit; ageAuto?: boolean }) => void;
    label: string;
    hasError?: boolean;
}

/**
 * Edad de la familia en un solo control: número + unidad (días, semanas,
 * meses, años). Con ambas fechas se propone sola y se puede corregir.
 */
export default function AgeInput({ value, unit, auto, calc, onChange, label, hasError }: Props) {
    const current = asAgeUnit(unit);
    const mismatch = !!calc && !auto && !!value && ageMismatch(Number(value), current, calc);

    return (
        <div className="space-y-2">
            <div
                className={`flex items-stretch rounded-[1.25rem] border bg-white dark:bg-slate-950 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all focus-within:ring-4 focus-within:ring-sky-500/5 focus-within:border-sky-500/30 ${
                    hasError ? 'border-red-500/50' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}
            >
                <input
                    type="text"
                    inputMode="numeric"
                    maxLength={3}
                    value={value}
                    placeholder="0"
                    aria-label={label}
                    onChange={(e) => onChange({ age: e.target.value.replace(/\D/g, ''), ageAuto: false })}
                    className="w-16 sm:w-20 shrink-0 bg-transparent text-center text-lg font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-600 outline-none rounded-l-[1.25rem]"
                />
                <div className="w-px my-2.5 bg-slate-200 dark:bg-slate-800" />
                <div className="flex-1 grid grid-cols-4 gap-1 p-1.5" role="radiogroup" aria-label={`${label}: unidad`}>
                    {AGE_UNIT_OPTIONS.map((o) => {
                        const active = current === o.value;
                        return (
                            <button
                                key={o.value}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                onClick={() => onChange({ ageUnit: o.value, ageAuto: false })}
                                className={`rounded-xl px-1 py-2.5 text-[11px] sm:text-xs font-semibold transition ${
                                    active
                                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200'}`}
                            >
                                {o.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {calc && auto && (
                <p className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 px-1">
                    <Sparkles size={12} className="shrink-0" />
                    Calculada con las fechas{calc.approx ? ' (aproximada)' : ''}. Puedes corregirla.
                </p>
            )}
            {mismatch && calc && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-300">
                    <AlertCircle size={13} className="shrink-0 mt-0.5" />
                    <span className="flex-1">
                        Según las fechas serían {calc.approx ? 'unos ' : ''}<b>{formatAge(calc.value, calc.unit)}</b>.
                    </span>
                    <button
                        type="button"
                        onClick={() => onChange({ age: String(calc.value), ageUnit: calc.unit, ageAuto: true })}
                        className="shrink-0 font-bold underline underline-offset-2"
                    >
                        Usar
                    </button>
                </div>
            )}
        </div>
    );
}
