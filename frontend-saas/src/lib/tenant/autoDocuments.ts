import { apiRequest } from '@/lib/tenant/api';
import type { ImageTemplate } from '@/lib/admin/imageTemplates/types';

export type AutoDocKind = 'certificate' | 'digital' | 'social';

export interface AutoDocSetting {
    enabled: boolean;
    /** null = la predeterminada (certificado / tarjeta). La de redes debe elegirse. */
    template_id: number | null;
}

export type AutoDocumentsSettings = Record<AutoDocKind, AutoDocSetting>;

export interface AutoDocOption {
    id: number;
    name: string;
    global: boolean;
    has_ai_text?: boolean;
    has_ai_image?: boolean;
}

export interface AutoDocuments {
    settings: AutoDocumentsSettings;
    options: Record<AutoDocKind, AutoDocOption[]>;
    defaults: { certificate: { id: number; name: string } | null; digital: { id: number; name: string } | null };
    /** Plantillas que usará "Generar todo". */
    resolved: {
        certificate: { id: number; name: string } | null;
        digital: { id: number; name: string; config: Record<string, unknown> } | null;
        social: (ImageTemplate & { has_ai_text: boolean; has_ai_image: boolean }) | null;
    };
}

const BASE = '/api/internal/auto-documents';

export function getAutoDocuments(): Promise<AutoDocuments> {
    return apiRequest(BASE);
}

export function saveAutoDocuments(settings: AutoDocumentsSettings): Promise<AutoDocuments> {
    return apiRequest(BASE, { method: 'PUT', body: settings });
}
