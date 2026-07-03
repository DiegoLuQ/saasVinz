/**
 * Caché local (localStorage) del catálogo de servicios y planes usado por el
 * formulario de órdenes. Permite mostrar el selector de servicios al instante
 * (sin esperar a la red) y refrescarlo bajo demanda sin recargar toda la página.
 *
 * La caché se versiona y se acota por tenant para evitar mezclar catálogos entre
 * crematorios distintos en el mismo navegador. Tiene un TTL: si está vencida se
 * ignora y se vuelve a pedir a la API.
 */

const PREFIX = 'order_catalog_v1';
// Tiempo de vida de la caché. Pasado este lapso, se considera obsoleta y se
// refresca desde la API en el próximo montaje.
const TTL_MS = 1000 * 60 * 60; // 1 hora

export interface CatalogCache {
    services: any[];
    plans: any[];
    savedAt: number;
}

const keyFor = (tenantId?: number | null) => `${PREFIX}:${tenantId ?? 'anon'}`;

/** Lee la caché del catálogo si existe y no está vencida. */
export function readCatalogCache(tenantId?: number | null): CatalogCache | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(keyFor(tenantId));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CatalogCache;
        if (!parsed || typeof parsed.savedAt !== 'number') return null;
        if (Date.now() - parsed.savedAt > TTL_MS) return null; // vencida
        if (!Array.isArray(parsed.services) || !Array.isArray(parsed.plans)) return null;
        return parsed;
    } catch {
        return null;
    }
}

/** Guarda el catálogo (ya normalizado) en la caché local. */
export function writeCatalogCache(
    tenantId: number | null | undefined,
    data: { services: any[]; plans: any[] }
): void {
    if (typeof window === 'undefined') return;
    try {
        const payload: CatalogCache = {
            services: data.services ?? [],
            plans: data.plans ?? [],
            savedAt: Date.now(),
        };
        localStorage.setItem(keyFor(tenantId), JSON.stringify(payload));
    } catch {
        // Cuota llena o serialización fallida: la caché es best-effort, ignoramos.
    }
}

/** Elimina la caché del catálogo (p. ej. al cerrar sesión). */
export function clearCatalogCache(tenantId?: number | null): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(keyFor(tenantId));
    } catch {
        /* noop */
    }
}
