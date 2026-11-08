import { apiRequest } from '@/lib/tenant/api';

/** Enlaces oficiales del crematorio (backend: app/services/official_links.py). */
export type OfficialLinkKey = 'form' | 'plans' | 'products';

export interface OfficialCatalogLink { id: number; name: string | null; url: string }

export interface OfficialLinksStatus {
    form: { id: string; name: string } | null;
    plans: OfficialCatalogLink | null;
    products: OfficialCatalogLink | null;
    missing: OfficialLinkKey[];
    missing_labels: string[];
    complete: boolean;
    form_options: { id: string; name: string }[];
}

export const OFFICIAL_LABELS: Record<OfficialLinkKey, string> = {
    form: 'Formulario oficial',
    plans: 'Catálogo de planes oficial',
    products: 'Catálogo de productos oficial',
};

/** Dónde se crea cada cosa si todavía no existe. */
export const OFFICIAL_WHERE: Record<OfficialLinkKey, { href: string; text: string }> = {
    form: { href: '/dashboard/configuracion?tab=formulario', text: 'Configuración → Formulario y Pesos' },
    plans: { href: '/dashboard/gestion-servicios', text: 'Gestión de Servicios → Compartir Catálogo de Planes' },
    products: { href: '/dashboard/inventario/productos', text: 'Inventario → Productos → Compartir Online' },
};

export const getOfficialLinks = (): Promise<OfficialLinksStatus> => apiRequest('/api/internal/official-links');

export const saveOfficialLinks = (body: { form: string | null; plans_token_id: number | null; products_token_id: number | null }): Promise<OfficialLinksStatus> =>
    apiRequest('/api/internal/official-links', { method: 'PUT', body });
