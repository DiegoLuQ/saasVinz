/**
 * Fechas/horas de la operación (programación de órdenes) con zona horaria.
 *
 * Convención del backend: las columnas `timestamp without time zone` (p. ej.
 * `oc_scheduling.scheduled_at`) guardan la hora en **UTC** sin sufijo. Un
 * `<input type="datetime-local">` en cambio trabaja en hora "de pared".
 * Antes se usaba el texto UTC tal cual como hora local y al guardar se volvía
 * a convertir a UTC: cada guardado corría la hora el desfase (+4 h en Chile).
 *
 * Zona usada: la del crematorio (`tenant.timezone`, configurable por país) y,
 * si no hay, la del navegador.
 */

/** Zona del crematorio si es válida; si no, la del navegador; si no, UTC. */
export function resolveTimeZone(tenantTz?: string | null): string {
    const candidates = [tenantTz, typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : null];
    for (const tz of candidates) {
        if (!tz) continue;
        try {
            new Intl.DateTimeFormat('en-US', { timeZone: tz });
            return tz;
        } catch {
            /* zona inválida: probar la siguiente */
        }
    }
    return 'UTC';
}

/** Interpreta un valor del backend: con zona explícita se respeta; sin zona, es UTC. */
export function parseBackendDate(value?: string | null): Date | null {
    if (!value) return null;
    const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
    const d = new Date(hasZone ? value : `${value.replace(' ', 'T')}Z`);
    return isNaN(d.getTime()) ? null : d;
}

/** Partes de fecha/hora "de pared" de un instante en una zona. */
function wallParts(date: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone, hourCycle: 'h23',
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(date);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    return { y: get('year'), mo: get('month'), d: get('day'), h: get('hour') % 24, mi: get('minute'), s: get('second') };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Instante (valor del backend) → "YYYY-MM-DDTHH:mm" para datetime-local en la zona dada. */
export function toZonedInputValue(value: string | Date | null | undefined, timeZone: string): string {
    const d = value instanceof Date ? value : parseBackendDate(value ?? null);
    if (!d) return '';
    const p = wallParts(d, timeZone);
    return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

/** Hora actual en la zona dada, para el valor por defecto del formulario. */
export function nowZonedInputValue(timeZone: string): string {
    return toZonedInputValue(new Date(), timeZone);
}

/** "YYYY-MM-DDTHH:mm" (hora de pared en la zona) → ISO UTC para el backend. */
export function zonedInputToUtcISO(value: string | null | undefined, timeZone: string): string | null {
    if (!value) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
    if (!m) return null;
    const [y, mo, d, h, mi] = m.slice(1).map(Number);
    const asUtc = Date.UTC(y, mo - 1, d, h, mi);
    // Desfase de la zona en ese momento (dos pasadas: cubre cambios de horario)
    let guess = asUtc;
    for (let i = 0; i < 2; i++) {
        const p = wallParts(new Date(guess), timeZone);
        const wallAsUtc = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
        guess = asUtc - (wallAsUtc - guess);
    }
    return new Date(guess).toISOString();
}
