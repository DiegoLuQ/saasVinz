/**
 * URLs públicas por subdominio (seguimiento y memoriales).
 *
 * Centraliza la construcción de enlaces para que el subdominio se configure en
 * un solo lugar vía variables de entorno y se reutilice en toda la app:
 *   - Seguimiento  -> NEXT_PUBLIC_TRACKING_BASE_URL  (ej. http://track.lvh.me:3000)
 *   - Memoriales   -> NEXT_PUBLIC_MEMORIAL_BASE_URL  (ej. http://memorial.lvh.me:3000)
 *
 * Si la variable no está definida, se deriva del host actual (quitando el
 * subdominio `app.`/`www.`) usando los subdominios `track.` y `memorial.`.
 */

/** Dominio raíz derivado del host actual, sin el subdominio de la app. */
function rootFromHost(): string {
    if (typeof window === 'undefined') {
        return process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'lvh.me:3000';
    }
    return window.location.host.replace(/^app\./, '').replace(/^www\./, '');
}

function currentProtocol(): string {
    return typeof window !== 'undefined' ? window.location.protocol : 'https:';
}

/** Base del subdominio de seguimiento (track.). */
export function getTrackingBaseUrl(): string {
    if (process.env.NEXT_PUBLIC_TRACKING_BASE_URL) {
        return process.env.NEXT_PUBLIC_TRACKING_BASE_URL;
    }
    return `${currentProtocol()}//track.${rootFromHost()}`;
}

/** Base del subdominio de memoriales (memorial.). */
export function getMemorialBaseUrl(): string {
    if (process.env.NEXT_PUBLIC_MEMORIAL_BASE_URL) {
        return process.env.NEXT_PUBLIC_MEMORIAL_BASE_URL;
    }
    // Dominio de marca dedicado, si está configurado (ej. pawmemory.pet).
    if (process.env.NEXT_PUBLIC_MEMORIAL_DOMAIN && typeof window !== 'undefined'
        && !window.location.host.includes('lvh.me')
        && !window.location.host.includes('localhost')) {
        return `https://${process.env.NEXT_PUBLIC_MEMORIAL_DOMAIN}`;
    }
    return `${currentProtocol()}//memorial.${rootFromHost()}`;
}

/** Enlace público de seguimiento de una orden. */
export function buildTrackingUrl(tenantSlug: string, petName: string, code: string): string {
    return `${getTrackingBaseUrl()}/${tenantSlug}/track/${encodeURIComponent(petName || 'mascota')}/${code}`;
}

/** Enlace público de un memorial. */
export function buildMemorialUrl(tenantSlug: string, petName: string, idRecuerdo: string): string {
    const petSlug = (petName || 'memorial').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    return `${getMemorialBaseUrl()}/memorials/v/${tenantSlug}/${petSlug}/${idRecuerdo}`;
}
