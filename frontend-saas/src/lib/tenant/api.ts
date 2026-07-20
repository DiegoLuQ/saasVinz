import axios from 'axios';
import { authHeader, clearToken, tryRefreshSession } from '@/lib/auth/token';

const isServer = typeof window === 'undefined';
// v1.4 - ULTIMATE PROXY ENFORCEMENT
// Browser MUST use empty string to force relative paths through Next.js proxy
// Server uses env var or defaults to localhost
export const API_URL = isServer ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') : '';

if (!isServer) {
    console.log('[API CONFIG v1.4] CLIENT-SIDE FORCED RELATIVE PATHS');
    console.log('[API CONFIG v1.4] API_URL:', `"${API_URL}"`);
    console.log('[API CONFIG v1.4] All requests will use Next.js proxy');
}

export const apiRequest = async (url: string, options: any = {}, _isRetry = false): Promise<any> => {

    const fullUrl = `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    if (fullUrl.startsWith('http')) {
        // Warning removed
    }

    try {
        let tenantId: number | null = null;
        try {
            const stored = localStorage.getItem('saasc_user');
            if (stored) tenantId = JSON.parse(stored)?.tenant_id ?? null;
        } catch {}

        const headers: any = {
            ...options.headers,
            // Sesión por cookie httpOnly (viaja sola, same-origin). authHeader()
            // solo emite Bearer para sesiones legacy pre-migración.
            ...authHeader(),
            ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
        };

        // Automatically set Content-Type if there's a body and it's not FormData or URLSearchParams and not already set
        if (options.body && !(options.body instanceof FormData) && !(options.body instanceof URLSearchParams) && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }


        const response = await axios({
            url: fullUrl,
            method: options.method || 'GET',
            data: options.body,
            headers,
        });
        return response.data;
    } catch (error: any) {

        if (error.response) {
            // Handle 401 Unauthorized: intenta renovar la sesión una vez
            // (refresh token en cookie httpOnly) y reintenta la request.
            if (error.response.status === 401) {
                if (!_isRetry && typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                    const refreshed = await tryRefreshSession();
                    if (refreshed) {
                        return apiRequest(url, options, true);
                    }
                    console.warn('[API] Session expired or invalid. Redirecting to login.');
                    await clearToken();
                    localStorage.removeItem('saasc_user');
                    window.location.href = '/login';
                }
            }

            // Handle 402 Payment Required (Resource Limit Reached)
            if (error.response.status === 402) {
                console.warn('[API] Resource limit reached:', error.response.data);
                if (typeof window !== 'undefined') {
                    const detail = error.response.data.detail || error.response.data;
                    window.dispatchEvent(new CustomEvent('plan-limit-exceeded', {
                        detail: {
                            resource: detail.resource,
                            limit: detail.limit,
                            usage: detail.usage,
                            plan: detail.plan,
                            message: detail.message
                        }
                    }));
                }
            }

            // Handle 403 Subscription Expired (Grace Period Exceeded)
            if (error.response.status === 403) {
                const detail = error.response.data?.detail;
                if (detail && typeof detail === 'object' && detail.code === 'subscription_expired') {
                    console.warn('[API] Subscription expired (grace period exceeded):', detail);
                    if (typeof window !== 'undefined') {
                        (window as any).__subscriptionExpiredError = detail;
                        window.dispatchEvent(new CustomEvent('subscription-expired-error', { detail }));
                    }
                }
            }
            const rawDetail = error.response.data?.detail;
            const messageStr = (rawDetail && typeof rawDetail === 'object')
                ? (rawDetail.message || "Error en el servidor")
                : (rawDetail || error.response.data?.message || "Error en el servidor");
            throw {
                status: error.response.status,
                message: messageStr,
                data: error.response.data
            };
        } else if (error.request) {
            throw { message: "Error de conexión: El servidor no responde o hay un problema de CORS." };
        } else {
            throw { message: error.message || "Error desconocido" };
        }
    }
};

export const getImageUrl = (path: string | null) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${API_URL}/${cleanPath}`;
};

// --- Partners V2 (Global Links) ---
export interface VeterinaryBase {
    id: number;
    name: string;
    rut: string;
    slug: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    region?: string;
    country?: string;
}

export interface PartnerLink {
    id: number;
    veterinary: VeterinaryBase;
    status: 'pending' | 'active' | 'rejected';
    slug_publico: string;
    tipo_comision: string;
    monto_comision: number;
    porcentaje_comision: number;
    created_at: string;
}

export const searchGlobalVeterinaries = async (q: string): Promise<VeterinaryBase[]> => {
    if (!q || q.length < 3) return [];
    return apiRequest(`/api/internal/partners/search?q=${encodeURIComponent(q)}`);
};

export const getAvailablePartners = async (): Promise<VeterinaryBase[]> => {
    return apiRequest('/api/internal/partners/available');
};

export const requestPartnerLink = async (data: { veterinary_id: number; tipo_comision: string; monto_comision?: number; porcentaje_comision?: number; referral_message?: string; }) => {
    return apiRequest('/api/internal/partners/link', {
        method: 'POST',
        body: data
    });
};

export const getMyPartners = async (): Promise<PartnerLink[]> => {
    return apiRequest('/api/internal/partners');
};

