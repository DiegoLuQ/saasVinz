import { apiRequest } from '@/lib/tenant/api';
import type { AiTextResult, ImageTemplate } from '@/lib/admin/imageTemplates/types';
import type { LayerOverrides } from '@/lib/admin/imageTemplates/overrides';

const BASE = '/api/internal/image-templates';

export interface AiCredits {
    period: string;
    monthly_granted: number;
    monthly_remaining: number;
    extra_remaining: number;
    available: number;
    credit_price_usd: number;
    attempts_per_credit: number;
    session_days: number;
}

export interface AiUsage {
    configured: boolean;
    image_configured: boolean;
    credits: AiCredits;
    /** Duración promedio reciente (s) de cada tipo de generación; null sin datos. */
    avg_seconds: { text: number | null; image: number | null };
}

/** Resultado de un diseño que no llegó al navegador o aún no se guardó/descartó. */
export interface AiRecovery {
    session: AiSession | null;
    image: { generation_id: number; url: string; created_at: string } | null;
    text: { generation_id: number; text: string; created_at: string } | null;
}

/** Diseño abierto con un crédito: N intentos de generación. */
export interface AiSession {
    id: number;
    template_id: number | null;
    pet_id: number | null;
    attempts_used: number;
    max_attempts: number;
    attempts_left: number;
    expires_at: string;
    active: boolean;
}

/** Resultado de generar (texto, ilustración o ambos); cada parte puede fallar sola. */
export interface AiGenerationResult {
    text: AiTextResult | null;
    text_error: string | null;
    image: { url: string; generation_id: number | null } | null;
    image_error: string | null;
    session: AiSession;
}

export interface ResolvedPrompts {
    text_prompt: string;
    image_prompt: string;
    max_chars: number;
}

export function listTenantImageTemplates(page = 1, page_size = 8): Promise<{
    total: number; page: number; page_size: number; items: ImageTemplate[];
}> {
    return apiRequest(`${BASE}?page=${page}&page_size=${page_size}`);
}

/** Valores de los elementos de datos (mascota, dueño, crematorio) que arma el backend. */
export function getRenderData(pet_id: number | null): Promise<Record<string, string>> {
    return apiRequest(`${BASE}/render-data${pet_id != null ? `?pet_id=${pet_id}` : ''}`);
}

export function getAiUsage(): Promise<AiUsage> {
    return apiRequest(`${BASE}/ai/usage`);
}

/** Crédito aún vigente para esta plantilla + mascota (para retomarlo sin gastar otro). */
export function getAiSession(id: number, pet_id: number | null): Promise<AiSession | null> {
    return apiRequest(`${BASE}/${id}/ai/session${pet_id != null ? `?pet_id=${pet_id}` : ''}`);
}

/** Usa 1 crédito y abre un diseño con N intentos. */
export function openAiSession(id: number, pet_id: number | null): Promise<AiSession> {
    return apiRequest(`${BASE}/${id}/ai/session`, { method: 'POST', body: { pet_id } });
}

/** Recupera lo último generado en el diseño vigente (no gasta intentos). */
export function recoverGeneration(id: number, pet_id: number | null): Promise<AiRecovery> {
    return apiRequest(`${BASE}/${id}/ai/recover${pet_id != null ? `?pet_id=${pet_id}` : ''}`);
}

/** Descarta una ilustración: ya no se ofrece recuperarla. */
export function discardGeneration(id: number, generation_id: number): Promise<{ status: string }> {
    return apiRequest(`${BASE}/${id}/ai/generations/${generation_id}/discard`, { method: 'POST' });
}

export function registerTemplateUse(id: number): Promise<{ usage_count: number }> {
    return apiRequest(`${BASE}/${id}/use`, { method: 'POST' });
}

export function resolvePrompts(id: number, pet_id: number | null, details: string): Promise<ResolvedPrompts> {
    return apiRequest(`${BASE}/${id}/ai/prompts`, { method: 'POST', body: { pet_id, details } });
}

export function generateAiText(id: number, body: {
    session_id: number; pet_id: number | null; details: string; prompt?: string;
    /** Reintento sin costo del texto que falló en este diseño (no cuenta intento). */
    free_retry?: boolean;
}): Promise<AiGenerationResult> {
    return apiRequest(`${BASE}/${id}/ai/text`, { method: 'POST', body });
}

interface ImageOpts {
    session_id: number;
    pet_id: number | null;
    details: string;
    aspect_ratio?: string;
    /** Foto real: archivo local o una foto ya guardada en la plataforma. */
    file?: File | null;
    photo_url?: string | null;
}

function imageForm(opts: ImageOpts): FormData {
    const fd = new FormData();
    fd.append('session_id', String(opts.session_id));
    if (opts.pet_id != null) fd.append('pet_id', String(opts.pet_id));
    fd.append('details', opts.details || '');
    if (opts.aspect_ratio) fd.append('aspect_ratio', opts.aspect_ratio);
    if (opts.file) fd.append('file', opts.file);
    else if (opts.photo_url) fd.append('photo_url', opts.photo_url);
    return fd;
}

export function generateAiImage(id: number, opts: ImageOpts & { prompt?: string }): Promise<AiGenerationResult> {
    const fd = imageForm(opts);
    if (opts.prompt) fd.append('prompt', opts.prompt);
    return apiRequest(`${BASE}/${id}/ai/image`, { method: 'POST', body: fd });
}

/** Texto e ilustración en una sola llamada: cuenta 1 intento. */
export function generateAiBoth(id: number, opts: ImageOpts & { text_prompt?: string; image_prompt?: string }): Promise<AiGenerationResult> {
    const fd = imageForm(opts);
    if (opts.text_prompt) fd.append('text_prompt', opts.text_prompt);
    if (opts.image_prompt) fd.append('image_prompt', opts.image_prompt);
    return apiRequest(`${BASE}/${id}/ai/both`, { method: 'POST', body: fd });
}

/**
 * Guarda en la carpeta `ia` del crematorio (WebP optimizado en el servidor):
 * una ilustración IA confirmada por el usuario o el diseño final exportado.
 */
/** Guarda la ilustración IA confirmada (la única imagen que se guarda de un diseño). */
export function saveTemplateImage(id: number, opts: {
    kind: 'illustration';
    image: Blob;
    pet_id: number | null;
    generation_id?: number | null;
}): Promise<{ url: string }> {
    const fd = new FormData();
    fd.append('kind', opts.kind);
    fd.append('file', opts.image, 'ilustracion.webp');
    if (opts.pet_id != null) fd.append('pet_id', String(opts.pet_id));
    if (opts.generation_id != null) fd.append('generation_id', String(opts.generation_id));
    return apiRequest(`${BASE}/${id}/save`, { method: 'POST', body: fd });
}

export interface RecipePhoto { url: string | null; zoom: number; offset_x: number; offset_y: number }

/** Receta de un diseño final: con la plantilla y los datos de la mascota se vuelve a dibujar. */
export interface DesignRecipe {
    ratio: string;
    ai_text: string;
    phrase: string;
    pet_name: string;
    date: string;
    photos: Partial<Record<'photo_1' | 'photo_2' | 'photo_3' | 'ai', RecipePhoto>>;
    /** Elementos que el crematorio ocultó, movió o achicó en este diseño (la plantilla no cambia). */
    overrides?: LayerOverrides;
}

/** Guarda el diseño final sin subir imagen: solo su receta. */
export function saveDesign(templateId: number, body: { pet_id: number | null; recipe: DesignRecipe }): Promise<{ id: number }> {
    return apiRequest(`${BASE}/${templateId}/designs`, { method: 'POST', body });
}

/** Una plantilla visible para el crematorio (para dibujar diseños guardados). */
export function getTenantImageTemplate(id: number): Promise<ImageTemplate> {
    return apiRequest(`${BASE}/${id}`);
}

/** Lo creado en Diseños para Redes: ilustración IA o tarjeta (con imagen) o diseño (receta, sin imagen). */
export interface TemplateExport {
    id: number;
    title: string;
    /** 'design' = diseño para redes · 'illustration' = ilustración IA · 'digital' = tarjeta de homenaje. */
    kind: 'design' | 'illustration' | 'digital';
    template_id: number | null;
    pet_id: number | null;
    /** null en los diseños nuevos: se dibujan desde `meta`. */
    url: string | null;
    meta?: DesignRecipe | null;
    created_at: string;
}

export function listTemplateExports(params: { q?: string; kind?: 'design' | 'illustration' | 'digital' | 'design,digital';template_id?: number; pet_id?: number; page?: number; page_size?: number }): Promise<{
    total: number; page: number; page_size: number; items: TemplateExport[];
}> {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.kind) qs.set('kind', params.kind);
    if (params.template_id != null) qs.set('template_id', String(params.template_id));
    if (params.pet_id != null) qs.set('pet_id', String(params.pet_id));
    qs.set('page', String(params.page ?? 1));
    qs.set('page_size', String(params.page_size ?? 24));
    return apiRequest(`${BASE}/exports?${qs.toString()}`);
}

/** Asigna (o quita con null) la mascota de un diseño: aparece en las órdenes de esa mascota. */
export function assignTemplateExportPet(id: number, pet_id: number | null): Promise<{ id: number; pet_id: number | null; title: string }> {
    return apiRequest(`${BASE}/exports/${id}`, { method: 'PATCH', body: { pet_id } });
}

export function deleteTemplateExport(id: number): Promise<{ status: string }> {
    return apiRequest(`${BASE}/exports/${id}`, { method: 'DELETE' });
}
