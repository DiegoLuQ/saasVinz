import { apiRequest } from '@/lib/admin/api';
import type { AiMeta, AiTextResult, ImageTemplate, ImageTemplateCreate, ImageTemplateUpdate, TemplateUsage } from './types';

const BASE = '/api/internal/creator/image-templates';

export function listImageTemplates(): Promise<ImageTemplate[]> {
    return apiRequest(BASE);
}

export function getImageTemplate(id: number): Promise<ImageTemplate> {
    return apiRequest(`${BASE}/${id}`);
}

export function createImageTemplate(payload: ImageTemplateCreate): Promise<ImageTemplate> {
    return apiRequest(BASE, { method: 'POST', body: payload });
}

export function updateImageTemplate(id: number, payload: ImageTemplateUpdate): Promise<ImageTemplate> {
    return apiRequest(`${BASE}/${id}`, { method: 'PATCH', body: payload });
}

export function duplicateImageTemplate(id: number): Promise<ImageTemplate> {
    return apiRequest(`${BASE}/${id}/duplicate`, { method: 'POST' });
}

export function deleteImageTemplate(id: number): Promise<{ status: string; message: string }> {
    return apiRequest(`${BASE}/${id}`, { method: 'DELETE' });
}

export function uploadTemplateAsset(file: File): Promise<{ url: string; width?: number; height?: number }> {
    const fd = new FormData();
    fd.append('file', file);
    return apiRequest(`${BASE}/upload-asset`, { method: 'POST', body: fd });
}

export function getAiMeta(): Promise<AiMeta> {
    return apiRequest(`${BASE}/ai/meta`);
}

export function testAiText(prompt: string, max_chars: number): Promise<AiTextResult> {
    return apiRequest(`${BASE}/ai/test-text`, { method: 'POST', body: { prompt, max_chars } });
}

/** Foto de prueba: archivo local o una imagen ya guardada en la biblioteca (no se vuelve a subir). */
export function testAiImage(prompt: string, photo: { file?: File | null; url?: string | null }, aspect_ratio?: string): Promise<{ url: string; duration_ms?: number | null }> {
    const fd = new FormData();
    fd.append('prompt', prompt);
    if (photo.file) fd.append('file', photo.file);
    else if (photo.url) fd.append('photo_url', photo.url);
    if (aspect_ratio) fd.append('aspect_ratio', aspect_ratio);
    return apiRequest(`${BASE}/ai/test-image`, { method: 'POST', body: fd });
}

/** Uso por plantilla (clave = id de la plantilla): crematorios, totales y últimos creados. */
export function getTemplatesUsage(latest = 5): Promise<Record<string, TemplateUsage>> {
    return apiRequest(`${BASE}/stats/usage?latest=${latest}`);
}

/** Imagen de ejemplo de la plantilla (la ven los crematorios). null = quitarla. Funciona aunque esté en uso. */
export function setTemplateExample(id: number, url: string | null): Promise<ImageTemplate> {
    return apiRequest(`${BASE}/${id}/example`, { method: 'PUT', body: { url } });
}

/** Lo creado con una plantilla en todos los crematorios (antes de borrarlo). */
export interface TemplateExportsPreview {
    template_id: number;
    usage_count: number;
    designs: number;
    illustrations: number;
    others: number;
    generations_with_image: number;
    files: number;
    bytes: number;
    tenants: string[];
}

export function getTemplateExportsPreview(id: number): Promise<TemplateExportsPreview> {
    return apiRequest(`${BASE}/${id}/exports/preview`);
}

/** Borra diseños, ilustraciones IA y sus archivos en R2; con `unlock` la plantilla vuelve a ser editable. */
export function purgeTemplateExports(id: number, unlock: boolean): Promise<{
    exports_deleted: number; files_found: number; files_deleted: number; files_kept_shared: number; files_failed: number; unlocked: boolean;
}> {
    return apiRequest(`${BASE}/${id}/exports?unlock=${unlock}`, { method: 'DELETE' });
}
