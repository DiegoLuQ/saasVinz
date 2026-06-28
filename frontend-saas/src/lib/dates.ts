/**
 * Helpers para fechas que vienen del backend.
 *
 * Postgres guarda timestamps en UTC, pero algunos serializadores eliminan
 * el sufijo "Z" o el offset. JavaScript entonces los interpreta como hora
 * local del browser, lo que produce un desfase visible (en Chile UTC-4
 * aparecen 4h adelantadas).
 *
 * `parseServerDate` asume UTC cuando el ISO no incluye tz info.
 */

const HAS_TZ = /(Z|[+-]\d{2}:?\d{2})$/;
const CHILE_TZ = 'America/Santiago';

export function parseServerDate(iso: string | null | undefined): Date | null {
    if (!iso) return null;
    const safeIso = HAS_TZ.test(iso) ? iso : `${iso}Z`;
    const d = new Date(safeIso);
    return isNaN(d.getTime()) ? null : d;
}

export function formatChileDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}): string {
    const d = parseServerDate(iso);
    if (!d) return '';
    return d.toLocaleDateString('es-CL', { timeZone: CHILE_TZ, ...opts });
}

export function formatChileTime(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}): string {
    const d = parseServerDate(iso);
    if (!d) return '';
    return d.toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: CHILE_TZ,
        ...opts,
    });
}

export function formatChileDateTime(iso: string | null | undefined): string {
    const d = parseServerDate(iso);
    if (!d) return '';
    return d.toLocaleString('es-CL', {
        timeZone: CHILE_TZ,
        dateStyle: 'short',
        timeStyle: 'short',
    });
}
