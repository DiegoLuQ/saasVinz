/**
 * Utilidades para construir URLs públicas y de gestión de memoriales.
 */

export function slugify(text?: string | null): string {
    if (!text) return 'memorial';
    return text
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '') || 'memorial';
}

export function getPublicMemorialPath(params: {
    id_recuerdo: string;
    tenantSlug?: string | null;
    petName?: string | null;
}): string {
    const cliente = slugify(params.tenantSlug || 'memorial');
    const mascota = slugify(params.petName || 'mascota');
    return `/memorials/v/${cliente}/${mascota}/${params.id_recuerdo}`;
}

