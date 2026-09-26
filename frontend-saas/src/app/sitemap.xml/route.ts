import { siteUrl } from '@/lib/vinzer/site';
import { isMarketingHost } from '@/lib/vinzer/seo-host';
import { GUIAS, guiaPath } from '@/lib/vinzer/guias';
import { GUIA_GESTION_SLUG, GUIA_GESTION_SEO } from '@/lib/vinzer/guia-gestion-operativa';
import { GUIA_TRAZABILIDAD_SLUG, GUIA_TRAZABILIDAD_SEO } from '@/lib/vinzer/guia-trazabilidad';
import { GUIA_FORMULARIO_SLUG, GUIA_FORMULARIO_SEO } from '@/lib/vinzer/guia-formulario-online';

/** Fecha de última modificación conocida por guía (las demás páginas no la declaran). */
const GUIA_LASTMOD: Record<string, string> = {
    [GUIA_GESTION_SLUG]: GUIA_GESTION_SEO.dateModified,
    [GUIA_TRAZABILIDAD_SLUG]: GUIA_TRAZABILIDAD_SEO.dateModified,
    [GUIA_FORMULARIO_SLUG]: GUIA_FORMULARIO_SEO.dateModified,
};

interface Entry { path: string; lastmod?: string }

/**
 * sitemap.xml solo para el sitio de marketing (los demás hosts responden 404).
 * Las guías salen de lib/vinzer/guias.ts: una guía nueva aparece sola.
 */
export function GET(request: Request) {
    if (!isMarketingHost(request.headers.get('host'))) {
        return new Response('Not found', { status: 404 });
    }

    const entries: Entry[] = [
        { path: '/' },
        { path: '/tour' },
        { path: '/comparar-planes' },
        { path: '/guias' },
        ...GUIAS.map((g) => ({ path: guiaPath(g.slug), lastmod: GUIA_LASTMOD[g.slug] })),
    ];

    const urls = entries
        .map((e) => `  <url>\n    <loc>${siteUrl(e.path === '/' ? '' : e.path)}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ''}\n  </url>`)
        .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
        },
    });
}
