import { SITE_URL } from './site';

/**
 * ¿La petición llega al sitio de marketing (vinzer.cl / www.vinzer.cl)?
 * El mismo Next sirve app., admin., track., memorial., catalogo., etc.; solo
 * el sitio de marketing debe indexarse y publicar sitemap.
 */
export function isMarketingHost(host: string | null): boolean {
    if (!host) return false;
    const h = host.toLowerCase();
    const siteHost = new URL(SITE_URL).host.toLowerCase();
    if (h === siteHost || h === `www.${siteHost}`) return true;
    // Desarrollo local: raíz sin subdominio.
    return h === 'lvh.me:3000' || h === 'localhost:3000';
}
