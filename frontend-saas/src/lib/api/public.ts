
/**
 * Generic API request function for public endpoints.
 * Handles base URL resolution, headers, and error parsing.
 */
const isServer = typeof window === 'undefined';
export const API_URL = !isServer
    ? ''
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

export const publicApiRequest = async (path: string, options: any = {}) => {

    try {
        const res = await fetch(`${API_URL}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!res.ok) {
            let errorData = {};
            try {
                errorData = await res.json();
            } catch (e) {
                console.error("Error parsing error response:", e);
            }
            // Return error object instead of throwing, for cleaner handling in UI
            return {
                error: (errorData as any).detail || 'Error en la petición',
                status: res.status
            };
        }

        return await res.json();
    } catch (error) {
        console.error("Network or fetch error:", error);
        return { error: 'Error de conexión. Verifique su red.', status: 0 };
    }
};
