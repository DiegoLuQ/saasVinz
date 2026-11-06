/**
 * Fechas de la mascota con «solo año» (crm_pets.birth_date_year_only / death_date_year_only):
 * la fecha se guarda el 1 de enero de ese año y se muestra solo el año.
 */

export const THIS_YEAR = new Date().getFullYear();
export const MIN_PET_YEAR = 1950;

/** AAAA-MM-DD de un valor de la API ('' si falta). */
export const toDateInput = (v?: string | null) => (v ? v.slice(0, 10) : '');

/** Valor para la API: mediodía, para que la zona horaria no mueva el día. */
export const toApiDate = (v: string) => (v ? `${v}T12:00:00` : null);

export const isFullDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Año escrito (4 dígitos, 1950–año actual) → AAAA-01-01; '' si no es válido. */
export function yearToDate(year: string): string {
    const ok = /^\d{4}$/.test(year) && Number(year) >= MIN_PET_YEAR && Number(year) <= THIS_YEAR;
    return ok ? `${year}-01-01` : '';
}

/**
 * Texto para mostrar: «2015» con solo año; si no, DD/MM/AAAA (o AAAA-MM-DD con `iso`).
 * Devuelve '' sin fecha.
 */
export function formatPetDate(v?: string | null, yearOnly?: boolean, iso = false): string {
    const d = toDateInput(v);
    if (!d) return '';
    if (yearOnly) return d.slice(0, 4);
    if (iso) return d;
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
}
