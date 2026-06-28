const TOKEN_KEY = 'saasc_token';
const COOKIE_DAYS = 7;

// Cookie host-only por diseño: admin.<root> y app.<root> tienen sesiones independientes.

export function getToken(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(^|;\s*)saasc_token=([^;]+)/);
    if (match) {
        const value = decodeURIComponent(match[2]);
        if (value && value !== 'null' && value !== 'undefined') return value;
    }
    return null;
}

export function setToken(token: string): void {
    if (typeof document === 'undefined') return;
    const expires = new Date(Date.now() + COOKIE_DAYS * 24 * 60 * 60 * 1000).toUTCString();
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; expires=${expires}; SameSite=Strict${isSecure ? '; Secure' : ''}`;
}

export function clearToken(): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
    if (typeof window !== 'undefined') {
        try { window.localStorage.removeItem(TOKEN_KEY); } catch {}
    }
}

export function authHeader(): Record<string, string> {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}
