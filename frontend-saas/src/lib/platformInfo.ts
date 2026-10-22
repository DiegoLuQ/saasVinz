import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';

/** Diapositiva del banner del inicio de los crematorios (admin → Configuración → Banner del panel). */
export type DashboardSlide = {
    image_url: string;
    title: string;
    message: string;
    button_label: string;
    whatsapp_text: string;
    show_button: boolean;
    /** Encuadre de la imagen en % (background-position). */
    pos_x?: number;
    pos_y?: number;
    /** Degradado automático: celeste en modo claro, azul noche en oscuro (ignora color/intensidad). */
    overlay_auto?: boolean;
    /** Degradado sobre la imagen (hex + intensidad 0–100) y color del texto. */
    overlay_color?: string;
    overlay_opacity?: number;
    text_theme?: 'dark' | 'light';
};

/** Datos públicos de la plataforma (Configuración global del admin). */
export type PlatformInfo = {
    name: string;
    eslogan?: string | null;
    logo?: string | null;
    whatsapp?: string | null;
    correo?: string | null;
    redes_sociales: { name?: string | null; link: string }[];
    /** Diapositiva principal editada en el admin (null = la original). */
    dashboard_default_slide?: DashboardSlide | null;
    dashboard_slides?: DashboardSlide[];
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
