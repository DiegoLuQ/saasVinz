import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';

/** Datos públicos de la plataforma (Configuración global del admin). */
export type PlatformInfo = {
    name: string;
    eslogan?: string | null;
    logo?: string | null;
    whatsapp?: string | null;
    correo?: string | null;
    redes_sociales: { name?: string | null; link: string }[];
};

const FALLBACK: PlatformInfo = { name: 'Vinzer', redes_sociales: [] };

/** Carga /api/public/platform-info; mientras tanto (o si falla) usa valores por defecto. */
export function usePlatformInfo(): PlatformInfo {
    const [info, setInfo] = useState<PlatformInfo>(FALLBACK);
    useEffect(() => {
        let alive = true;
        fetch(`${API_BASE_URL}/api/public/platform-info`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (alive && d) setInfo({ ...FALLBACK, ...d }); })
            .catch(() => {});
        return () => { alive = false; };
    }, []);
    return info;
}

/** Enlace wa.me a partir de un teléfono con formato libre (+56 9 8239 5940). */
export function whatsappLink(phone?: string | null, text?: string): string | null {
    const digits = (phone || '').replace(/\D/g, '');
    if (!digits) return null;
    return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

const SOCIAL_BASE: Record<string, (h: string) => string> = {
    instagram: (h) => `https://instagram.com/${h}`,
    facebook: (h) => `https://facebook.com/${h}`,
    tiktok: (h) => `https://tiktok.com/@${h}`,
    linkedin: (h) => `https://linkedin.com/company/${h}`,
    youtube: (h) => `https://youtube.com/@${h}`,
    x: (h) => `https://x.com/${h}`,
    twitter: (h) => `https://x.com/${h}`,
};

/** Convierte "@usuario" / "usuario" / "https://..." en una URL de la red social. */
export function socialUrl(name?: string | null, link?: string | null): string | null {
    const raw = (link || '').trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    const key = (name || '').trim().toLowerCase();
    const handle = raw.replace(/^@/, '');
    const build = SOCIAL_BASE[key];
    if (build) return build(handle);
    // Dominio suelto (ej. "vinzer.cl" sin red reconocida): se trata como sitio web
    return /\./.test(handle) ? `https://${handle}` : null;
}
