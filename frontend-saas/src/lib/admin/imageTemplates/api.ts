import { apiRequest } from '@/lib/admin/api';
import type { ImageTemplate, ImageTemplateUpdate } from './types';

const BASE = '/api/internal/creator/image-templates';

export function listImageTemplates(): Promise<ImageTemplate[]> {
    return apiRequest(BASE);
}

export function updateImageTemplate(id: number, payload: ImageTemplateUpdate): Promise<ImageTemplate> {
    return apiRequest(`${BASE}/${id}`, { method: 'PATCH', body: payload });
}

export function deleteImageTemplate(id: number): Promise<{ status: string; message: string }> {
    return apiRequest(`${BASE}/${id}`, { method: 'DELETE' });
}
