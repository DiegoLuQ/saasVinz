const TOKEN_KEY = 'saasc_token';
const SESSION_MARKER_KEY = 'saasc_session';

// S-01: la sesión vive en cookies httpOnly emitidas por el backend (viajan
// solas por el proxy de Next, same-origin). Este módulo ya NO escribe el JWT;
// `saasc_session` es un marcador legible por JS para los guards de login, y
// la lectura de `saasc_token` queda solo como compat con sesiones anteriores
// (cookies legibles emitidas antes de la migración, expiran en <=7 días).
// Cookies host-only por diseño: admin.<root> y app.<root> tienen sesiones independientes.

function readCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]+)`));
    if (match) {
        const value = decodeURIComponent(match[2]);
        if (value && value !== 'null' && value !== 'undefined') return value;
    }
    return null;
}

/** true si hay sesión activa (marcador nuevo o cookie legacy legible). */
export function hasSession(): boolean {
    return readCookie(SESSION_MARKER_KEY) !== null || readCookie(TOKEN_KEY) !== null;
}

/**
 * Compat transitoria: devuelve el JWT solo si existe la cookie legacy legible.
 * Con el flujo nuevo (httpOnly) devuelve null — usar hasSession() para guards.
 */
export function getToken(): string | null {
    return readCookie(TOKEN_KEY);
}

/**
 * Cierra la sesión: revoca el refresh token en el backend (best-effort),
 * y limpia marcador, cookie legacy y datos locales.
 */
export async function clearToken(): Promise<void> {
    if (typeof document === 'undefined') return;
    try {
        // keepalive: la revocación sobrevive al redirect inmediato post-logout.
        await fetch('/api/internal/auth/logout', { method: 'POST', keepalive: true });
    } catch {
        // Sin red igual limpiamos el estado local.
    }
    const expired = 'expires=Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = `${TOKEN_KEY}=; path=/; ${expired}`;
    document.cookie = `${SESSION_MARKER_KEY}=; path=/; ${expired}`;
    if (typeof window !== 'undefined') {
        try { window.localStorage.removeItem(TOKEN_KEY); } catch {}
    }
}

/** Compat: solo emite el header si existe la cookie legacy legible. */
export function authHeader(): Record<string, string> {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// Single-flight del refresh: ante una ráfaga de 401 simultáneos solo se
// dispara UNA llamada a /refresh y el resto espera su resultado.
let refreshPromise: Promise<boolean> | null = null;

/** Intenta renovar la sesión vía refresh token (cookie httpOnly). */
export function tryRefreshSession(): Promise<boolean> {
    if (!refreshPromise) {
        refreshPromise = fetch('/api/internal/auth/refresh', { method: 'POST' })
            .then((res) => res.ok)
            .catch(() => false)
            .finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
}
