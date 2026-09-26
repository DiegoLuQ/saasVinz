const isServer = typeof window === 'undefined';
export const API_URL = typeof window !== 'undefined'
    ? ''
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

export async function apiRequest(endpoint: string, options: Omit<RequestInit, 'body'> & { body?: any } = {}) {
    // La sesión va en la cookie httpOnly `vet_token` (el navegador la envía sola
    // en peticiones same-origin vía el proxy de Next). Se limpia el token que
    // versiones anteriores guardaban en localStorage.
    if (!isServer) {
        try { localStorage.removeItem('vet_token'); } catch { /* noop */ }
    }

    const isFormData = options.body instanceof FormData;
    const isUrlSearchParams = options.body instanceof URLSearchParams;

    const headers = {
        ...((isFormData || isUrlSearchParams) ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
    } as any;

    const fullUrl = `${API_URL}${endpoint}`;

    if (!isServer) {
        // console.log(`[VET API] ${fullUrl}`);
    }

    const response = await fetch(fullUrl, {
        ...options,
        credentials: 'same-origin',
        headers,
        body: (options.body && !isFormData && !isUrlSearchParams && typeof options.body !== 'string')
            ? JSON.stringify(options.body)
            : options.body,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let message = 'Error en la petición';

        if (typeof errorData.detail === 'string') {
            message = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
            message = errorData.detail.map((e: any) => e.msg).join(', ');
        }

        // Handle 401 Unauthorized
        if (response.status === 401) {
            if (typeof window !== 'undefined' && !window.location.pathname.includes('login')) {
                console.warn('[VET API] Session expired or invalid. Redirecting to login.');
                // El backend ya borró la cookie httpOnly en la respuesta 401.
                window.location.href = '/login';
            }
        }

        const error = new Error(message) as any;
        error.status = response.status;
        throw error;
    }

    return response.json();
}
