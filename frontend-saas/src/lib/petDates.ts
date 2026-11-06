/**
 * Fechas de la mascota con precisión (crm_pets.birth_date_precision / death_date_precision):
 * 'day' = fecha completa · 'month' = mes y año (se guarda el día 1) · 'year' = solo el año
 * (se guarda el 1 de enero). Las pantallas y documentos muestran solo lo que se sabe.
 */

export type DatePrecision = 'day' | 'month' | 'year';

export const THIS_YEAR = new Date().getFullYear();
export const MIN_PET_YEAR = 1950;

export const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const PRECISION_LABELS: Record<DatePrecision, string> = { day: 'Fecha completa', month: 'Mes y año', year: 'Solo año' };

/** AAAA-MM-DD de un valor de la API ('' si falta). */
export const toDateInput = (v?: string | null) => (v ? v.slice(0, 10) : '');

/** Valor para la API: mediodía, para que la zona horaria no mueva el día. */
export const toApiDate = (v: string) => (v ? `${v}T12:00:00` : null);

export const isFullDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

export const asPrecision = (p?: string | null): DatePrecision => (p === 'month' || p === 'year' ? p : 'day');

/** Año válido (4 dígitos, 1950–año actual). */
export const validYear = (y: string) => /^\d{4}$/.test(y) && Number(y) >= MIN_PET_YEAR && Number(y) <= THIS_YEAR;

/** Ajusta una fecha AAAA-MM-DD a la precisión (día 1 / 1 de enero). */
export function snapToPrecision(v: string, p: DatePrecision): string {
    if (!isFullDate(v)) return v;
    if (p === 'year') return `${v.slice(0, 4)}-01-01`;
    if (p === 'month') return `${v.slice(0, 7)}-01`;
    return v;
}

/**
 * Texto para mostrar: «2015», «marzo 2015» o DD/MM/AAAA (AAAA-MM-DD con `iso`).
 * Devuelve '' sin fecha.
 */
export function formatPetDate(v?: string | null, precision?: string | null, iso = false): string {
    const d = toDateInput(v);
    if (!d) return '';
    const p = asPrecision(precision);
    if (p === 'year') return d.slice(0, 4);
    if (p === 'month') return `${MONTHS_ES[Number(d.slice(5, 7)) - 1] || d.slice(5, 7)} ${d.slice(0, 4)}`;
    if (iso) return d;
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
}

/* ---------- Formulario de la familia: fecha parcial en texto ----------
 * «2015» (año), «2015-03» (mes y año) o «2015-03-12» (completa).
 */

export const partialPrecision = (v?: string | null): DatePrecision =>
    !v ? 'day' : /^\d{4}$/.test(v) ? 'year' : /^\d{4}-\d{2}$/.test(v) ? 'month' : 'day';

/** Texto legible de una fecha parcial del formulario («2015», «marzo 2015», «12/03/2015»). */
export function formatPartialDate(v?: string | null): string {
    if (!v) return '';
    if (/^\d{4}$/.test(v)) return v;
    if (/^\d{4}-\d{2}$/.test(v)) return `${MONTHS_ES[Number(v.slice(5, 7)) - 1] || v.slice(5, 7)} ${v.slice(0, 4)}`;
    if (isFullDate(v)) return `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}`;
    return v;
}
