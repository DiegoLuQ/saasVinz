/**
 * Embudo del catálogo de planes (backend: services/catalog_funnel.py).
 *
 * Cada visitante tiene un id de sesión anónimo por enlace (aleatorio, en
 * localStorage; sin datos personales). El backend guarda una fila por sesión +
 * evento + plan + tamaño, así recargar no infla. El id viaja al formulario en
 * el parámetro `cs` porque el formulario puede abrirse en otro dominio.
 */
export type CatalogEventKind = 'view' | 'size_select' | 'plan_request' | 'whatsapp' | 'form_open';

const SID_RE = /^[A-Za-z0-9_-]{8,40}$/;

function randomId(): string {
    try {
        if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    } catch { /* sin crypto.randomUUID (http) */ }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Id de sesión del visitante para este enlace (se reutiliza el recibido en `cs`). */
export function catalogSessionId(token: string, fromUrl?: string | null): string {
    const key = `vz_cat_sid_${token}`;
    if (fromUrl && SID_RE.test(fromUrl)) {
        try { localStorage.setItem(key, fromUrl); } catch { /* storage bloqueado */ }
        return fromUrl;
    }
    try {
        const saved = localStorage.getItem(key);
        if (saved && SID_RE.test(saved)) return saved;
        const fresh = randomId();
        localStorage.setItem(key, fresh);
        return fresh;
    } catch {
        return randomId();
    }
}

interface TrackParams {
    slug: string;
    token: string;
    kind: CatalogEventKind;
    sessionId: string;
    planId?: number | null;
    weightTier?: string | null;
}

/** Envía el evento sin bloquear (sobrevive a la navegación al formulario o WhatsApp). */
export function trackCatalogEvent({ slug, token, kind, sessionId, planId, weightTier }: TrackParams): void {
    if (typeof window === 'undefined' || !slug || !token || !sessionId) return;
    const url = `/api/public/catalog/${encodeURIComponent(slug)}/${encodeURIComponent(token)}/events`;
    const body = JSON.stringify({
        kind,
        session_id: sessionId,
        plan_id: planId ?? null,
        weight_tier: weightTier ? weightTier.slice(0, 120) : null,
    });
    try {
        fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true })
            .catch(() => { /* las métricas nunca rompen la página */ });
    } catch { /* idem */ }
}
