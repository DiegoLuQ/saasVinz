import { siteUrl } from '@/lib/vinzer/site';
import { isMarketingHost } from '@/lib/vinzer/seo-host';

/**
 * robots.txt según el host: el sitio de marketing se indexa y declara su
 * sitemap; los demás subdominios (app, admin, track, memorial, catalogo,
 * portal veterinario…) se excluyen por completo — son paneles privados o
 * páginas de familias que no deben aparecer en buscadores.
 */
export function GET(request: Request) {
    const marketing = isMarketingHost(request.headers.get('host'));
    // En el host de marketing el middleware también sirve páginas de tenants y
    // familias (formularios, seguimiento, catálogos, memoriales, embed): se
    // bloquean explícitamente aunque alguien las enlace.
    const body = marketing
        ? [
            'User-agent: *',
            'Allow: /',
            'Disallow: /api/',
            'Disallow: /embed/',
            'Disallow: /memorials/',
            'Disallow: /portal-veterinaria/',
            'Disallow: /*/form',
            'Disallow: /*/track/',
            'Disallow: /*/catalogo/',
            '',
            `Sitemap: ${siteUrl('/sitemap.xml')}`,
            '',
        ].join('\n')
        : ['User-agent: *', 'Disallow: /', ''].join('\n');

    return new Response(body, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
        },
    });
}
