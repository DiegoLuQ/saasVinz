/**
 * Métricas del formulario oficial (backend: services/form_funnel.py).
 *
 * Solo se envían cuando el backend dice que este es el formulario oficial del
 * crematorio (`track_form` en /api/public/tenant/{slug}). Id de sesión anónimo
 * por crematorio + formulario (aleatorio, localStorage; sin datos personales),
 * que se renueva al enviar el formulario. El backend guarda cada evento una vez
 * por sesión, así recargar no infla.
 */
export type FormEventKind =
    | 'open' | 'step_view' | 'field_error' | 'back' | 'size_select' | 'service_select'
    | 'photo_add' | 'welcome_video' | 'souvenir_click' | 'whatsapp_click'
    | 'submit_click' | 'submit_error' | 'submitted';

const SID_RE = /^[A-Za-z0-9_-]{8,40}$/;

function randomId(): string {
    try {
        if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    } catch { /* sin crypto.randomUUID (http) */ }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

const key = (slug: string, form: string | null) => `vz_form_sid_${slug}_${form || 'main'}`;

/** Id de sesión de esta visita (se mantiene mientras haya borrador). */
export function formSessionId(slug: string, form: string | null): string {
    try {
        const saved = localStorage.getItem(key(slug, form));
        if (saved && SID_RE.test(saved)) return saved;
        const fresh = randomId();
        localStorage.setItem(key(slug, form), fresh);
        return fresh;
    } catch {
        return randomId();
    }
}

/** Tras enviar: la próxima visita cuenta como una nueva. */
export function resetFormSession(slug: string, form: string | null): void {
    try { localStorage.removeItem(key(slug, form)); } catch { /* storage bloqueado */ }
}

/** Envía el evento sin bloquear; nunca rompe el formulario. */
export function sendFormEvent(slug: string, sessionId: string, kind: FormEventKind, detail?: string | null, form?: string | null): void {
    if (typeof window === 'undefined' || !slug || !sessionId) return;
    const body = JSON.stringify({ session_id: sessionId, kind, detail: detail ? detail.slice(0, 60) : null, form: form || null });
    try {
        fetch(`/api/public/tenant/${encodeURIComponent(slug)}/form-events`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true,
        }).catch(() => { /* las métricas nunca rompen la página */ });
    } catch { /* idem */ }
}
