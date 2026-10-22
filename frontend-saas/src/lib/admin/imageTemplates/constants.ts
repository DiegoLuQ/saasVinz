import type { AspectRatio, FontFamily, TextBinding, TextLayer, PhotoLayer, StickerLayer, PhotoSlot } from './types';

export interface DataField {
    value: TextBinding;
    label: string;
    /** Valor de ejemplo para la vista previa del editor. */
    sample: string;
}

export interface DataFieldGroup {
    key: string;
    label: string;
    fields: DataField[];
}

/**
 * Elementos de datos que el admin agrega desde Capas → Datos. Los valores reales
 * los arma el backend (GET /api/internal/image-templates/render-data → app/services/image_template_ai.py
 * `template_bindings`): mismas claves.
 */
export const DATA_FIELD_GROUPS: DataFieldGroup[] = [
    {
        key: 'pet', label: 'Mascota', fields: [
            { value: 'pet_name', label: 'Nombre de la mascota', sample: 'Tulioca' },
            { value: 'species', label: 'Especie', sample: 'Perro' },
            { value: 'breed', label: 'Raza', sample: 'Mestizo' },
            { value: 'age', label: 'Edad', sample: '12 años' },
            { value: 'size', label: 'Tamaño / peso', sample: 'Mediano' },
            { value: 'birth_date', label: 'Fecha de nacimiento', sample: '2 de marzo de 2014' },
            { value: 'death_date', label: 'Fecha de partida', sample: '14 de septiembre de 2026' },
            { value: 'life_range', label: 'Años de vida', sample: '2014 — 2026' },
        ],
    },
    {
        key: 'owner', label: 'Dueño', fields: [
            { value: 'owner_name', label: 'Nombre del dueño', sample: 'Juan Pérez' },
            { value: 'owner_phone', label: 'Teléfono del dueño', sample: '+56 9 1234 5678' },
            { value: 'owner_email', label: 'Email del dueño', sample: 'juan@correo.cl' },
        ],
    },
    {
        key: 'tenant', label: 'Crematorio', fields: [
            { value: 'tenant_name', label: 'Nombre del crematorio', sample: 'Crematorio Demo' },
            { value: 'tenant_rut', label: 'RUT', sample: '76.123.456-7' },
            { value: 'tenant_phone', label: 'Teléfono', sample: '+56 2 2345 6789' },
            { value: 'tenant_email', label: 'Email', sample: 'contacto@crematorio.cl' },
            { value: 'tenant_address', label: 'Dirección', sample: 'Av. Siempre Viva 742' },
            { value: 'tenant_city', label: 'Ciudad / región', sample: 'Santiago, RM' },
            { value: 'tenant_legal_rep', label: 'Representante legal', sample: 'Ana Rojas' },
        ],
    },
    {
        key: 'social', label: 'Redes sociales', fields: [
            { value: 'tenant_instagram', label: 'Instagram', sample: '@crematoriodemo' },
            { value: 'tenant_facebook', label: 'Facebook', sample: 'CrematorioDemo' },
            { value: 'tenant_tiktok', label: 'TikTok', sample: '@crematoriodemo' },
            { value: 'tenant_youtube', label: 'YouTube', sample: '@crematoriodemo' },
            { value: 'tenant_website', label: 'Sitio web', sample: 'crematoriodemo.cl' },
            { value: 'tenant_whatsapp', label: 'WhatsApp', sample: '+56912345678' },
        ],
    },
    {
        key: 'content', label: 'Contenido', fields: [
            { value: 'phrase', label: 'Frase / dedicatoria (manual)', sample: 'Siempre en nuestro corazón' },
            { value: 'ai_text', label: 'Texto generado con IA', sample: '' },
            { value: 'date', label: 'Fecha de hoy', sample: '' },
        ],
    },
];


export const ASPECT_RATIOS: { value: AspectRatio; label: string; w: number; h: number }[] = [
    { value: '9:16', label: '9:16 · Vertical (Stories)', w: 9, h: 16 },
    { value: '4:5', label: '4:5 · Feed Instagram', w: 4, h: 5 },
    { value: '3:4', label: '3:4 · Retrato', w: 3, h: 4 },
    { value: '4:3', label: '4:3 · Apaisado', w: 4, h: 3 },
    { value: '1:1', label: '1:1 · Cuadrado', w: 1, h: 1 },
];

/** Ancho de exportación: 1080 px es el estándar de Instagram para feed y stories. */
export const EXPORT_WIDTH = 1080;

export const SAMPLE_PHOTO_URL =
    'https://images.unsplash.com/photo-1546238232-20216dec9f72?auto=format&fit=crop&w=400&q=80';

export const FONT_FAMILIES: { value: FontFamily; label: string }[] = [
    { value: 'Playfair Display', label: 'Playfair (Clásica)' },
    { value: 'Cormorant Garamond', label: 'Cormorant (Editorial)' },
    { value: 'Lora', label: 'Lora (Serif suave)' },
    { value: 'Cinzel', label: 'Cinzel (Placa)' },
    { value: 'Great Vibes', label: 'Great Vibes (Elegante)' },
    { value: 'Alex Brush', label: 'Alex Brush (Caligráfica)' },
    { value: 'Dancing Script', label: 'Dancing Script (Manuscrita)' },
    { value: 'Montserrat', label: 'Montserrat (Moderna)' },
    { value: 'Quicksand', label: 'Quicksand (Redondeada)' },
];

/** Todas las fuentes de las plantillas. Konva necesita que estén cargadas en el documento. */
export const TEMPLATE_FONTS_URL =
    'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..700;1,400..700' +
    '&family=Cormorant+Garamond:ital,wght@0,400..700;1,400..700&family=Lora:ital,wght@0,400..700;1,400..700' +
    '&family=Cinzel:wght@400..700&family=Great+Vibes&family=Alex+Brush&family=Dancing+Script:wght@400..700' +
    '&family=Montserrat:ital,wght@0,400..700;1,400..700&family=Quicksand:wght@400..700&display=swap';

export const TEXT_BINDINGS: { value: TextBinding; label: string }[] = [
    ...DATA_FIELD_GROUPS.flatMap(g => g.fields.map(f => ({ value: f.value, label: f.label }))),
    { value: 'static', label: 'Texto fijo' },
];

export const PHOTO_SLOTS: { value: PhotoSlot; label: string }[] = [
    { value: 'photo_1', label: 'Foto 1' },
    { value: 'photo_2', label: 'Foto 2' },
    { value: 'photo_3', label: 'Foto 3' },
];

/** Espejo de PLACEHOLDERS en backend/app/services/image_template_ai.py. */
export const PROMPT_PLACEHOLDERS: Record<string, string> = {
    nombre: 'Nombre de la mascota',
    especie: 'Especie',
    raza: 'Raza',
    edad: 'Edad (ej. 5 años)',
    tamano: 'Tamaño / tramo de peso',
    fecha_nacimiento: 'Fecha de nacimiento',
    fecha_partida: 'Fecha de partida',
    crematorio: 'Nombre del crematorio',
    detalles: 'Detalles que escribe el tenant al generar',
    max_caracteres: 'Límite de caracteres del texto',
};

export const MAX_AI_TEXT_CHARS = 500;

/** Proporciones que aceptan los modelos de imagen. */
const AI_RATIOS: [string, number][] = [['1:1', 1], ['4:5', 0.8], ['3:4', 0.75], ['9:16', 0.5625], ['4:3', 4 / 3], ['16:9', 16 / 9]];

/** Proporción soportada más cercana a un hueco de w×h px (para que la ilustración calce sin recortes grandes). */
export function nearestAiRatio(w: number, h: number): string {
    const r = h > 0 ? w / h : 1;
    return AI_RATIOS.reduce((best, cur) => (Math.abs(cur[1] - r) < Math.abs(best[1] - r) ? cur : best))[0];
}

export const newId = () => `l_${Math.random().toString(36).slice(2, 9)}`;

export function newTextLayer(): TextLayer {
    return {
        type: 'text', id: newId(), binding: 'static', static_text: 'Nuevo texto',
        x: 50, y: 50, width: 70, font_family: 'Playfair Display', font_size: 5,
        font_weight: '600', italic: false, color: '#ffffff', align: 'center',
        letter_spacing: 0, line_height: 1.3, shadow: false,
    };
}

export function newPhotoLayer(slot: PhotoSlot = 'photo_1', source: PhotoLayer['source'] = 'pet'): PhotoLayer {
    return {
        type: 'photo', id: newId(), source, slot, x: 50, y: 40, width: 45, height: 45,
        shape: 'circle', border_color: '#ffffff', border_width: 4,
        glow_color: '#ffffff', glow_blur: 18,
    };
}

const LOREM =
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ' +
    'dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea ' +
    'commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla ' +
    'pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est ' +
    'laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.';

/** Lorem ipsum de hasta `maxChars` caracteres (corte en palabra): diseñar con el peor caso del texto IA. */
export function loremOf(maxChars: number): string {
    let text = LOREM;
    while (text.length < maxChars) text += ' ' + LOREM;
    if (text.length <= maxChars) return text;
    const cut = text.slice(0, maxChars - 1);
    return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '') + '.';
}

export function newStickerLayer(url: string): StickerLayer {
    return { type: 'sticker', id: newId(), url, x: 50, y: 50, width: 25, rotation: 0, opacity: 1 };
}
