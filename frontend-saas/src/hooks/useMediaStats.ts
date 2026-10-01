import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/admin/api';

export interface MediaStatsBucket {
    count: number;
    bytes: number;
}

export interface MediaStats {
    total_count: number;
    total_bytes: number;
    images: MediaStatsBucket;
    videos: MediaStatsBucket;
    /** Archivos antiguos sin tamaño registrado (no suman al peso) */
    unknown_size_count: number;
    last_upload_at: string | null;
    by_category: (MediaStatsBucket & { category: string })[];
    /** Solo sin filtro de empresa: crematorios que más espacio ocupan */
    top_tenants: (MediaStatsBucket & { id: number; name: string })[];
}

export interface MediaStatsFilter {
    /** 'all' | 'global' | id del tenant */
    tenant?: string | number;
    category?: string;
    mediaType?: string;
    /** false = no consultar todavía (p. ej. mientras carga el id del tenant) */
    enabled?: boolean;
}

/** Almacenamiento de la biblioteca de medios (SuperAdmin). */
export function useMediaStats({ tenant = 'all', category, mediaType, enabled = true }: MediaStatsFilter = {}) {
    const params = new URLSearchParams();
    if (tenant === 'global') params.set('global_only', 'true');
    else if (tenant !== 'all' && tenant !== undefined && tenant !== '') params.set('tenant_id', String(tenant));
    if (category && category !== 'all') params.set('category', category);
    if (mediaType && mediaType !== 'all') params.set('media_type', mediaType);
    const qs = params.toString();

    return useQuery<MediaStats>({
        queryKey: ['media-stats', qs],
        queryFn: () => apiRequest(`/api/internal/media/stats${qs ? `?${qs}` : ''}`),
        staleTime: 60 * 1000,
        retry: 1,
        enabled,
    });
}

export function formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, i);
    return `${value.toLocaleString('es-CL', { maximumFractionDigits: value >= 100 || i === 0 ? 0 : 1 })} ${units[i]}`;
}
