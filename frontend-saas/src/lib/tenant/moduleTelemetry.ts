/**
 * Telemetría ligera y no bloqueante para el Sidebar del panel de crematorios.
 * 
 * Características:
 * - Acumula clics en un micro-buffer en memoria.
 * - Despacha en segundo plano (debounce de 15s, umbral de 5 clics, o beforeunload).
 * - Cero latencia para la navegación del usuario.
 * - Si isTrackingEnabled es false, no ejecuta nada.
 */

let clickBuffer: Record<string, number> = {};
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isUnloadHooked = false;

export function recordSidebarClick(moduleKey?: string, isTrackingEnabled?: boolean): void {
    if (!isTrackingEnabled || !moduleKey) {
        return;
    }

    const key = moduleKey.trim().toLowerCase().slice(0, 50);
    if (!key) return;

    clickBuffer[key] = (clickBuffer[key] || 0) + 1;

    // Enganchar flush al cerrar/cambiar pestaña una sola vez
    if (!isUnloadHooked && typeof window !== 'undefined') {
        isUnloadHooked = true;
        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                flushModuleClicks();
            }
        });
        window.addEventListener('beforeunload', () => {
            flushModuleClicks();
        });
    }

    const pendingCount = Object.values(clickBuffer).reduce((acc, n) => acc + n, 0);

    // Si ya acumuló 5 clics, despachar de inmediato
    if (pendingCount >= 5) {
        flushModuleClicks();
        return;
    }

    // Programar flush con debounce de 15 segundos
    if (!flushTimer) {
        flushTimer = setTimeout(() => {
            flushModuleClicks();
        }, 15000);
    }
}

export function flushModuleClicks(): void {
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }

    const keys = Object.keys(clickBuffer);
    if (keys.length === 0) {
        return;
    }

    const payload = {
        clicks: keys.map(k => ({
            module_key: k,
            count: clickBuffer[k]
        }))
    };

    // Vaciar el buffer inmediatamente para evitar duplicados
    clickBuffer = {};

    if (typeof window === 'undefined') return;

    try {
        const bodyStr = JSON.stringify(payload);
        const endpoint = '/api/internal/telemetry/module-clicks';

        // Intentar envío no bloqueante con keepalive
        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: bodyStr,
            keepalive: true,
            credentials: 'include',
        }).catch(() => {
            // Falla silenciosa: la telemetría nunca debe romper la app ni alertar al usuario
        });
    } catch {
        // Ignorar
    }
}
