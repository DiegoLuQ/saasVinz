/**
 * Fuente única de las guías B2B del sitio Vinzer. La usan el índice /guias,
 * el Navbar, el Footer y el sitemap: para publicar una guía nueva basta con
 * crear su página y agregarla aquí.
 */
export type GuiaAccent = 'sky' | 'gold';

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
    },
];

export const guiaPath = (slug: string) => `/guias/${slug}`;
