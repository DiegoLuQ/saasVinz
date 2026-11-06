/**
 * Utilidades para construir URLs públicas y de gestión de memoriales.
 */

export function slugify(text?: string | null): string {
    if (!text) return 'memorial';
    return text
        .toString()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '') || 'memorial';
}

/**
 * Enlace corto en el subdominio de memoriales: /<crematorio>/<mascota>-<código>.
 * El código (`rec_recuerdos.short_code`, 7 caracteres sin 0/o/1/l/i) siempre trae
 * al menos un dígito: así no se confunde con otras rutas de dos segmentos.
 * Grupo 1 = código. Lo usa el middleware para reescribir a /memorials/s/<código>.
 */
export const MEMORIAL_SHORT_PATH = /^\/[\w-]+\/[\w-]*-((?=[a-z2-9]*[2-9])[abcdefghjkmnpqrstuvwxyz23456789]{7})\/?$/;

export function getPublicMemorialPath(params: {
    id_recuerdo: string;
    tenantSlug?: string | null;
    petName?: string | null;
    /** Código corto del memorial: con él se arma el enlace corto */
    shortCode?: string | null;
}): string {
    const cliente = slugify(params.tenantSlug || 'memorial');
    const mascota = slugify(params.petName || 'mascota');
    if (params.shortCode) return `/${cliente}/${mascota}-${params.shortCode}`;
    return `/memorials/v/${cliente}/${mascota}/${params.id_recuerdo}`;
}
