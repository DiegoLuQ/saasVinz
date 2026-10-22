// Estilo de las diapositivas del banner del inicio del crematorio. Lo usan el
// carrusel (components/tenant/dashboard/DashboardHeroCarousel.tsx) y la vista
// previa del admin (configuracion/DashboardBannerSettings.tsx), para que se vean igual.

export const DEFAULT_OVERLAY = '#D8EDFA';
export const DEFAULT_OVERLAY_OPACITY = 85;

/** Colores sugeridos para el degradado. */
export const OVERLAY_PRESETS = ['#D8EDFA', '#FFFFFF', '#F5EFE6', '#E8F5EE', '#0B1628', '#0A192F', '#1F2937', '#3B2A1A'];

const rgb = (hex: string) => {
    const h = /^#[0-9a-f]{6}$/i.test(hex) ? hex : DEFAULT_OVERLAY;
    return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ');
};

/** Degradado desde la izquierda (bajo el texto) hacia transparente. */
export function overlayBackground(color = DEFAULT_OVERLAY, opacity = DEFAULT_OVERLAY_OPACITY): string {
    const c = rgb(color);
    const o = Math.max(0, Math.min(100, opacity)) / 100;
    return `linear-gradient(to right, rgba(${c}, ${Math.min(1, o + 0.15)}) 0%, rgba(${c}, ${o}) 45%, rgba(${c}, 0) 100%)`;
}

/** Clases del texto según el fondo: oscuro sobre degradado claro, blanco sobre oscuro. */
export function slideTextClasses(theme: 'dark' | 'light' = 'dark') {
    // Blanco explícito (#FFF): el CSS global del panel en modo claro oscurece las clases text-white.
    return theme === 'light'
        ? { title: 'text-[#FFFFFF]', message: 'text-[#FFFFFFD9]' }
        : { title: 'text-[#0A192F]', message: 'text-slate-600' };
}
