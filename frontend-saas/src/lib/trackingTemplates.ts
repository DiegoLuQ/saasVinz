export type TrackingTemplateId = 'classic' | 'warm' | 'modern' | 'celestial';

export interface TrackingTemplateOption {
    id: TrackingTemplateId;
    name: string;
    subtitle: string;
    description: string;
    badge: string;
    accentColor: string;
    bgPreview: string;
    cardPreview: string;
    textPreview: string;
}

export const TRACKING_TEMPLATES: TrackingTemplateOption[] = [
    {
        id: 'classic',
        name: 'Clásico / Operativo',
        subtitle: 'Cielo sereno & Nubes',
        description: 'Diseño tradicional con cielo azul claro, nubes suaves, alas conmemorativas, línea de tiempo vertical y modo día/noche.',
        badge: 'Estándar',
        accentColor: '#0284C7',
        bgPreview: 'bg-[#eaf5fd]',
        cardPreview: 'bg-white border-sky-200',
        textPreview: 'text-slate-800',
    },
    {
        id: 'warm',
        name: 'Emocional / Santuario',
        subtitle: 'Editorial cálido & Nubes doradas',
        description: 'Tonos crema y arena (#FAF8F3), cielo con nubes doradas al atardecer, marco tipo relicario y lectura serena conmemorativa.',
        badge: 'PRO / ULTRA',
        accentColor: '#C6A56A',
        bgPreview: 'bg-[#FAF8F3]',
        cardPreview: 'bg-white border-[#C6A56A]/45',
        textPreview: 'text-[#292522]',
    },
    {
        id: 'modern',
        name: 'Moderno / Contemporáneo',
        subtitle: 'Minimalista & Nubes etéreas',
        description: 'Estética limpia de alto contraste, cielo con nubes etéreas en esmeralda y cian, barra de progreso superior y galería visual contemporánea.',
        badge: 'PRO / ULTRA',
        accentColor: '#10B981',
        bgPreview: 'bg-[#0B1120]',
        cardPreview: 'bg-[#111827] border-emerald-500/30',
        textPreview: 'text-white',
    },
    {
        id: 'celestial',
        name: 'Santuario Angelical / Celestial',
        subtitle: 'Alas de ángel & Cielo dorado',
        description: 'Fondo celestial con rayos de sol y flores, alas reales de ángel, caligrafía conmemorativa emotiva y tarjetas translúcidas en cristal.',
        badge: 'PRO / ULTRA',
        accentColor: '#D97706',
        bgPreview: 'bg-gradient-to-b from-[#FFF7ED] to-[#FEF3C7]',
        cardPreview: 'bg-white/90 border-amber-300/70',
        textPreview: 'text-amber-950',
    },
];

export function normalizeTrackingTemplate(value?: string | null, fallback: TrackingTemplateId = 'classic'): TrackingTemplateId {
    const v = (value || '').trim().toLowerCase();
    if (v === 'classic' || v === 'warm' || v === 'modern' || v === 'celestial') return v;
    return fallback;
}
