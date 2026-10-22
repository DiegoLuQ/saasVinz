/**
 * Fuente única de las guías del sitio Vinzer. La usan el índice /guias,
 * el Navbar, el Footer y el sitemap: para publicar una guía nueva basta con
 * crear su página y agregarla aquí.
 */
export type GuiaAccent = 'sky' | 'gold' | 'emerald' | 'violet' | 'rose';

/**
 * 'crematorios' = guías B2B (menú "Soluciones" del Navbar).
 * 'familias' = guías informativas para tutores; solo índice, footer y sitemap.
 */
export type GuiaAudience = 'crematorios' | 'familias';

export interface Guia {
    slug: string;
    /** Título completo (H1 de la guía). */
    title: string;
    /** Título corto para menús y tarjetas. */
    shortTitle: string;
    /** Texto del enlace en el footer. */
    footerLabel: string;
    badge: string;
    /** Pregunta o promesa breve (menú). */
    description: string;
    /** Resumen para la tarjeta del índice. */
    summary: string;
    topics: string[];
    accent: GuiaAccent;
    audience: GuiaAudience;
}

export const GUIAS: Guia[] = [
    {
        slug: 'software-trazabilidad-cadena-custodia-crematorios-mascotas',
        title: '¿Cómo garantizar la trazabilidad y cadena de custodia en un crematorio de mascotas?',
        shortTitle: 'Trazabilidad y Cadena de Custodia',
        footerLabel: 'Guía: Trazabilidad y Custodia',
        badge: 'Transparencia',
        description: 'Código único, evidencia por etapa y seguimiento en vivo para las familias.',
        summary: 'Protocolo de cadena de custodia en 5 etapas: código único por servicio, fotografías en cada traspaso, avance por etapas, certificado y seguimiento en vivo para la familia.',
        topics: ['Código único', 'Evidencia fotográfica', 'Checklist', 'Seguimiento familiar'],
        accent: 'sky',
        audience: 'crematorios',
    },
    {
        slug: 'sistema-gestion-operativa-automatizacion-crematorio-mascotas',
        title: 'Gestión operativa de un crematorio de mascotas: del Excel y WhatsApp a un sistema',
        shortTitle: 'Gestión Operativa',
        footerLabel: 'Guía: Gestión Operativa',
        badge: 'Eficiencia',
        description: 'Recepción sin papel, formulario online, etapas con evidencia y stock de urnas.',
        summary: 'Cómo ordenar la operación: recepción en 4 pestañas, solicitudes online de familias y veterinarias, etapas con evidencia fotográfica, seguimiento en vivo e inventario de urnas.',
        topics: ['Recepción', 'Formulario online', 'Etapas y evidencia', 'Inventario'],
        accent: 'gold',
        audience: 'crematorios',
    },
    {
        slug: 'formulario-cremacion-mascotas-online',
        title: 'Formulario de cremación de mascotas online: cómo recibir solicitudes desde WhatsApp y tu sitio web',
        shortTitle: 'Formulario de Cremación Online',
        footerLabel: 'Guía: Formulario Online',
        badge: 'Familias',
        description: 'Recibe solicitudes completas por enlace, veterinaria o en tu sitio web.',
        summary: 'Cómo funciona un formulario online para familias: los 5 pasos, qué recibe la familia al enviar, cómo llega al crematorio y 4 formas de compartirlo, incluido tu sitio web.',
        topics: ['WhatsApp', 'Enlace permanente', 'Sitio web', 'Veterinarias'],
        accent: 'emerald',
        audience: 'crematorios',
    },
    {
        slug: 'seguimiento-cremacion-mascotas-en-linea',
        title: 'Seguimiento de la cremación de mascotas en línea: cómo informar a las familias y reducir las llamadas',
        shortTitle: 'Seguimiento en Línea',
        footerLabel: 'Guía: Seguimiento en Línea',
        badge: 'Familias',
        description: 'Un enlace privado con etapas, fotos y fechas para cada familia.',
        summary: 'Qué ve la familia en su enlace de seguimiento, cómo le llega (formulario, WhatsApp o código), qué registrar en cada etapa y cómo reduce las llamadas al crematorio.',
        topics: ['Enlace privado', 'Etapas con fotos', 'WhatsApp', 'Código de seguimiento'],
        accent: 'violet',
        audience: 'crematorios',
    },
    {
        slug: 'crematorio-de-mascotas-chile',
        title: 'Crematorio de mascotas en Chile: guía completa para despedir a tu compañero',
        shortTitle: 'Crematorio de Mascotas en Chile',
        footerLabel: 'Guía: Crematorio de Mascotas en Chile',
        badge: 'Para familias',
        description: 'Tipos de cremación, precios, retiro y cómo elegir un servicio confiable.',
        summary: 'Guía para tutores: cremación individual vs. colectiva, cómo funciona el proceso, qué influye en el precio, qué preguntar antes de contratar y qué dice la normativa chilena.',
        topics: ['Individual vs. colectiva', 'Precios', 'Cómo elegir', 'Normativa'],
        accent: 'rose',
        audience: 'familias',
    },
];

export const guiaPath = (slug: string) => `/guias/${slug}`;
