/**
 * Edad de la mascota con unidad (días / semanas / meses / años).
 * Mismo cálculo que el backend (app/utils/pet_age.py): con nacimiento y
 * fallecimiento se propone sola, en la unidad más natural.
 */
export type AgeUnit = 'days' | 'weeks' | 'months' | 'years';

export const AGE_UNITS: AgeUnit[] = ['days', 'weeks', 'months', 'years'];

const LABELS: Record<AgeUnit, [string, string]> = {
    days: ['día', 'días'],
    weeks: ['semana', 'semanas'],
    months: ['mes', 'meses'],
    years: ['año', 'años'],
};

/** Nombre del selector: «Días», «Semanas»… */
export const AGE_UNIT_OPTIONS: { value: AgeUnit; label: string }[] =
    AGE_UNITS.map((u) => ({ value: u, label: LABELS[u][1][0].toUpperCase() + LABELS[u][1].slice(1) }));

export const asAgeUnit = (u: unknown): AgeUnit => (AGE_UNITS.includes(u as AgeUnit) ? (u as AgeUnit) : 'years');

/** «3 semanas», «1 año»; vacío si no hay edad. */
export function formatAge(value: number | string | null | undefined, unit?: string | null): string {
    const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
    if (!n || n < 0) return '';
    const [one, many] = LABELS[asAgeUnit(unit)];
    return `${n} ${n === 1 ? one : many}`;
}

/** «2015» · «2015-03» · «2015-03-12» → fecha (día 1 / 1 de enero si falta). */
function parsePartial(raw?: string | null): Date | null {
    const m = /^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/.exec((raw || '').trim());
    if (!m) return null;
    const d = new Date(Number(m[1]), m[2] ? Number(m[2]) - 1 : 0, m[3] ? Number(m[3]) : 1);
    return Number.isNaN(d.getTime()) ? null : d;
}

export function ageBetween(birth: Date, death: Date): { value: number; unit: AgeUnit } | null {
    const days = Math.floor((death.getTime() - birth.getTime()) / 86_400_000);
    if (days < 0) return null;
    if (days < 31) return { value: Math.max(days, 1), unit: 'days' };
    if (days < 91) return { value: Math.floor(days / 7), unit: 'weeks' };
    const months = (death.getFullYear() - birth.getFullYear()) * 12 + death.getMonth() - birth.getMonth()
        - (death.getDate() < birth.getDate() ? 1 : 0);
    if (months < 24) return { value: Math.max(months, 1), unit: 'months' };
    return { value: Math.floor(months / 12), unit: 'years' };
}

/** Edad calculada con las fechas del formulario; `approx` si alguna no es completa. */
export function ageFromPartialDates(birth?: string | null, death?: string | null):
    { value: number; unit: AgeUnit; approx: boolean } | null {
    const b = parsePartial(birth);
    const d = parsePartial(death);
    if (!b || !d) return null;
    const res = ageBetween(b, d);
    if (!res) return null;
    const full = (s?: string | null) => /^\d{4}-\d{1,2}-\d{1,2}$/.test((s || '').trim());
    return { ...res, approx: !(full(birth) && full(death)) };
}

const DAYS_PER: Record<AgeUnit, number> = { days: 1, weeks: 7, months: 30.44, years: 365.25 };

/** ¿La edad escrita no cuadra con las fechas? (margen: 1 unidad de la calculada o 20 %) */
export function ageMismatch(value: number, unit: AgeUnit, calc: { value: number; unit: AgeUnit }): boolean {
    const a = value * DAYS_PER[unit];
    const b = calc.value * DAYS_PER[calc.unit];
    return Math.abs(a - b) > Math.max(DAYS_PER[calc.unit] * 1.5, b * 0.2);
}
