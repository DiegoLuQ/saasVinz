import { authHeader, clearToken, tryRefreshSession } from '@/lib/auth/token';

export const API_URL = typeof window !== 'undefined'
    ? ''
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

export async function apiRequest(endpoint: string, options: Omit<RequestInit, 'body'> & { body?: any } = {}, _isRetry = false): Promise<any> {
    const isFormData = options.body instanceof FormData;
    const isUrlSearchParams = options.body instanceof URLSearchParams;

    const headers = {
        ...((isFormData || isUrlSearchParams) ? {} : { 'Content-Type': 'application/json' }),
        // Sesión por cookie httpOnly (viaja sola, same-origin). authHeader()
        // solo emite Bearer para sesiones legacy pre-migración.
        ...authHeader(),
        ...options.headers,
    } as any;

    const fullUrl = `${API_URL}${endpoint}`;

    const response = await fetch(fullUrl, {
        ...options,
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
        } else if (errorData.detail && typeof errorData.detail === 'object') {
            message = JSON.stringify(errorData.detail);
        }

        // Handle 401 Unauthorized: intenta renovar la sesión una vez
        // (refresh token en cookie httpOnly) y reintenta la request.
        if (response.status === 401) {
            if (!_isRetry && typeof window !== 'undefined' && !window.location.pathname.includes('iniciar-sesion')) {
                const refreshed = await tryRefreshSession();
                if (refreshed) {
                    return apiRequest(endpoint, options, true);
                }
                console.warn('[API] Session expired or invalid. Redirecting to login.');
                await clearToken();
                window.location.href = '/iniciar-sesion-creador';
            }
        }

        // Trigger global limit exceeded modal if status is 403 and message contains quota/limit keywords
        if (response.status === 403) {
            if (message.toLowerCase().includes('límite') ||
                message.toLowerCase().includes('alcanzado') ||
                message.toLowerCase().includes('plan')
            ) {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('plan-limit-exceeded', { detail: { message } }));
                }
            } else if (
                message.toLowerCase().includes('inactive') ||
                message.toLowerCase().includes('suspended') ||
                message.toLowerCase().includes('inactivo') ||
                message.toLowerCase().includes('suspendido') ||
                message.toLowerCase().includes('acceso denegado')
            ) {
                if (typeof window !== 'undefined') {
                    (window as any).__tenantStatusError = { message };
                    window.dispatchEvent(new CustomEvent('tenant-status-error', { detail: { message } }));
                }
            }
        }

        const error = new Error(message) as any;
        error.status = response.status;
        throw error;
    }

    return response.json();
}

export const getImageUrl = (url: string | null) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;

    // Ensure leading slash if not present
    const cleanPath = url.startsWith('/') ? url : `/${url}`;

    // If it's already a static or storage path, just prefix with API_URL
    if (cleanPath.startsWith('/static') || cleanPath.startsWith('/storage')) {
        return `${API_URL}${cleanPath}`;
    }

    // Default to /storage for submission relative paths
    return `${API_URL}/storage/${url}`;
};

// --- Veterinaries API ---
export interface Veterinary {
    id: number;
    name: string;
    rut: string;
    slug: string;
    email: string;
    is_active: boolean;
    created_at: string;
    address?: string;
    city?: string;
    region?: string;
    country?: string;
    phone?: string;
}

export async function getVeterinaries(search: string = ''): Promise<Veterinary[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    return apiRequest(`/api/internal/creator/veterinaries?${params.toString()}`);
}

export async function getVeterinary(id: number): Promise<Veterinary> {
    return apiRequest(`/api/internal/creator/veterinaries/${id}`);
}

export async function createVeterinary(data: any): Promise<Veterinary> {
    return apiRequest('/api/internal/creator/veterinaries', {
        method: 'POST',
        body: data,
    });
}

export async function updateVeterinary(id: number, data: any): Promise<Veterinary> {
    return apiRequest(`/api/internal/creator/veterinaries/${id}`, {
        method: 'PUT',
        body: data,
    });
}

export async function deleteVeterinary(id: number): Promise<any> {
    return apiRequest(`/api/internal/creator/veterinaries/${id}`, {
        method: 'DELETE',
    });
}
