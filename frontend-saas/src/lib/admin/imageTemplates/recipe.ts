import type { Bindings } from '@/components/admin/imageTemplates/TemplateCanvas';
import type { DesignRecipe } from '@/lib/tenant/imageTemplates';
import type { PhotoFill, PhotoFills } from './types';

/**
 * Fotos y textos para redibujar un diseño guardado como receta: las fotos y
 * textos de la receta sobre los datos actuales de la mascota, el dueño y el
 * crematorio (`data`, mismas claves que template_bindings del backend).
 * `resolveUrl` convierte las rutas guardadas en URLs (tenant o admin).
 */
export function recipeRender(recipe: DesignRecipe, data: Record<string, string>, resolveUrl: (u: string) => string) {
    const fill = (p?: { url: string | null; zoom: number; offset_x: number; offset_y: number }): PhotoFill =>
        ({ url: p?.url ? resolveUrl(p.url) : null, zoom: p?.zoom ?? 1, offset_x: p?.offset_x ?? 0, offset_y: p?.offset_y ?? 0 });
    const photos: PhotoFills = {
        photo_1: fill(recipe.photos.photo_1), photo_2: fill(recipe.photos.photo_2), photo_3: fill(recipe.photos.photo_3),
        ai: recipe.photos.ai?.url ? fill(recipe.photos.ai) : fill(recipe.photos.photo_1),
    };
    const bindings: Bindings = {
        ...data,
        tenant_logo: data.tenant_logo ? resolveUrl(data.tenant_logo) : '',
        ...(recipe.pet_name ? { pet_name: recipe.pet_name } : {}),
        ...(recipe.date ? { date: recipe.date } : {}),
        phrase: recipe.phrase,
        ai_text: recipe.ai_text,
    };
    return { photos, bindings };
}
