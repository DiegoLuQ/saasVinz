export const API_BASE_URL = typeof window !== 'undefined'
    ? ''
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

export const apiRequest = fetcher;

type FetchOptions = RequestInit & {
    token?: string;
};

/**
 * Error de API con status y payload originales, para que los consumidores
 * (React Query, modales de upsell) puedan distinguir 401/402/403/etc.
 * `message` siempre es un string legible, incluso cuando el backend envía
 * `detail` como objeto (p. ej. el 402 de límite de plan).
 */
export class ApiError extends Error {
    status: number;
    payload: unknown;

    constructor(message: string, status: number, payload: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.payload = payload;
    }
}

function extractErrorMessage(errorData: unknown, fallback: string): string {
    if (!errorData || typeof errorData !== 'object') return fallback;
    const detail = (errorData as { detail?: unknown; message?: unknown }).detail;
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail === 'object') {
        // El backend envía detail como objeto en errores de límite de plan (402):
        // {error, resource, limit, usage, plan, message}
        const msg = (detail as { message?: unknown }).message;
        if (typeof msg === 'string') return msg;
        return JSON.stringify(detail);
    }
    const message = (errorData as { message?: unknown }).message;
    if (typeof message === 'string') return message;
    return fallback;
}

export async function fetcher<T>(
    endpoint: string,
    { token, ...options }: FetchOptions = {}
): Promise<T> {
    const headers = new Headers(options.headers);

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    // Ensure Content-Type is set for JSON bodies unless it's FormData
    if (!headers.has('Content-Type') && !(typeof FormData !== 'undefined' && options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const fallback = `API Error: ${response.statusText}`;
        let errorData: unknown = null;
        try {
            errorData = await response.json();
        } catch { }

        throw new ApiError(extractErrorMessage(errorData, fallback), response.status, errorData);
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}
