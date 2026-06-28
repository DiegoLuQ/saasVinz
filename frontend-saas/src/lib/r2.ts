export const R2_DOMAIN = process.env.NEXT_PUBLIC_CLOUDFLARE_R2 || '';
export const R2_HOST = `pub-${R2_DOMAIN}`;
export const R2_URL = `https://${R2_HOST}`;

/**
 * Generates a full R2 URL for a given path.
 * Handles paths that already start with / or not.
 */
export const getR2Url = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${R2_URL}${cleanPath}`;
};

/**
 * Checks if a URL is served from our R2 bucket.
 */
export const isR2Url = (url: string) => {
    if (!url) return false;
    return url.includes(R2_DOMAIN);
};
