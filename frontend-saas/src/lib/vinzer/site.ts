/**
 * URL pública del sitio de marketing de Vinzer (canonical, Open Graph, JSON-LD,
 * sitemap). NEXT_PUBLIC_VINZER_URL se hornea en el build (Dockerfile ARG);
 * el fallback es el dominio de producción.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_VINZER_URL || 'https://vinzer.cl').replace(/\/$/, '');

/** URL absoluta para una ruta del sitio: siteUrl('/tour') -> https://vinzer.cl/tour */
export const siteUrl = (path = ''): string => `${SITE_URL}${path}`;
