import { getImageUrl } from '@/lib/tenant/api';

/** Config de plantilla de homenaje (forma libre; la interpreta FarewellPreview). */
export type FarewellConfig = { format?: string; elements?: Record<string, unknown>; [key: string]: unknown };

export const DEFAULT_FAREWELL_CONFIG: FarewellConfig = {
    format: '1:1',
    theme: 'warm',
    styles: { font: 'serif', color: '#1e293b', background: '#FDFBF7' },
    frame: { enabled: true, color: '#d4af37', width: 6, margin: 10 },
    petNameFormatting: { bold: true, fontSize: 38, fontFamily: 'Playfair Display', textAlign: 'center', letterSpacing: 2 },
    subtitleFormatting: { bold: false, italic: true, fontSize: 14, textAlign: 'center', width: 420 },
    textFormatting: { bold: false, italic: true, fontSize: 15, textAlign: 'center', width: 440, lineHeight: 1.6 },
    imageSettings: {
        image2: { shape: 'circle', size: 180, borderColor: '#d4af37', borderWidth: 4, glow: { enabled: true, color: 'rgba(212, 175, 55, 0.5)', size: 24 } },
    },
    backgroundImage: { url: null, opacity: 0 },
};

export const DEFAULT_FAREWELL_TEXT =
    'Gracias por cada instante de ternura y amor incondicional. Tu recuerdo vivirá por siempre en nuestra memoria.';

/** Dimensiones reales de la tarjeta según el formato de la plantilla (mismo cálculo que el formulario público). */
export function farewellCardDims(format: string) {
    const h = 550;
    if (format === '9:16') return { width: h * (9 / 16), height: h };
    if (format === '3:4' || format === '4:3') return { width: h * (3 / 4), height: h };
    return { width: h, height: h };
}

interface TenantLike {
    name?: string | null;
    logo_url?: string | null;
    social_media?: Record<string, unknown> | null;
}

/**
 * Config final de la tarjeta de homenaje de una mascota: la plantilla del
 * crematorio + nombre, dedicatoria, foto y datos del crematorio (logo, nombre,
 * web/redes), igual que el seguimiento público y el formulario.
 */
export function buildFarewellConfig(
    templateConfig: Record<string, unknown> | null | undefined,
    data: { petName?: string | null; dedication?: string | null; photoUrl?: string | null },
    tenant: TenantLike | null | undefined,
): FarewellConfig {
    const base: FarewellConfig = (templateConfig as FarewellConfig) || DEFAULT_FAREWELL_CONFIG;
    const baseEls = (base.elements || {}) as Record<string, unknown>;
    const socialMedia = tenant?.social_media || {};
    return {
        ...base,
        elements: {
            ...baseEls,
            petName: data.petName || 'Tu Angelito',
            subtitle: '',
            farewellText: data.dedication || DEFAULT_FAREWELL_TEXT,
            image2Url: data.photoUrl ? getImageUrl(data.photoUrl) : null,
            tenantLogoUrl: tenant?.logo_url ? getImageUrl(tenant.logo_url) : null,
            tenantName: (baseEls.tenantName && String(baseEls.tenantName).trim()) || tenant?.name || '',
            tenantWebsite: (baseEls.tenantWebsite && String(baseEls.tenantWebsite).trim()) || '{sitio_web}',
            tenantSocialMedia: socialMedia,
        },
        tenantSocialMedia: socialMedia,
    };
}
