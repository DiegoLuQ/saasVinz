/**
 * Contenido de vinzer.cl/tour: video demo + módulos con su captura.
 * Lo edita el SuperAdmin en Admin → Configuración → «Tour del software»
 * (sys_saas_config.tour_content, `GET /api/public/tour`). Sin datos guardados
 * se usa DEFAULT_TOUR (este archivo). Al guardar se purga la etiqueta `tour-content`.
 */

export interface TourModule {
    /** Ancla de la sección (#id). */
    id: string;
    /** Texto del botón de navegación y del capítulo del video. */
    short_label: string;
    badge: string;
    title: string;
    subtitle: string;
    description: string;
    /** Captura del módulo; vacío = recuadro «Captura próximamente». */
    image_url: string;
    image_alt: string;
    image_caption: string;
    tags: string[];
    highlights: string[];
    /** Minuto del video donde aparece («01:15»); vacío = no sale en los capítulos. */
    video_time: string;
}

export interface TourContent {
    /** URL embebible de YouTube/Vimeo; vacío = sin sección de video. */
    video_url: string;
    modules: TourModule[];
}

export const DEFAULT_TOUR_MODULES: TourModule[] = [
    {
        id: 'recepcion',
        short_label: 'Recepción',
        video_time: '00:00',
        title: 'Recepción y Código de Verificación Único',
        subtitle: 'Registro guiado de la mascota, el tutor y el servicio en una sola orden',
        badge: 'Módulo 01 · Recepción',
        description: 'Al registrar un servicio, Vinzer genera automáticamente un código de verificación único de 10 caracteres y un enlace privado de seguimiento. El formulario de recepción, organizado en 4 pestañas, reúne los datos de la mascota y del tutor, la logística, las fotografías y el detalle comercial, y guarda borradores automáticamente.',
        image_alt: 'Formulario de recepción de una orden de cremación con código de verificación único en Vinzer',
        image_caption: 'Formulario de recepción: datos de la mascota y del tutor, retiro programado, fotografías y detalle comercial en una sola orden.',
        image_url: 'https://i.postimg.cc/mD9jZNX2/portada-1.webp',
        tags: ['Código Único', 'Formulario en 4 Pestañas', 'Autoguardado'],
        highlights: [
            'Código de verificación único por servicio',
            'Retiro programado, peso estimado y dirección de entrega',
            'Hasta 3 fotografías y notas internas por orden',
            'Enlace de seguimiento listo para compartir con la familia'
        ]
    },
    {
        id: 'bitacora-planta',
        short_label: 'Etapas y fotos',
        video_time: '01:15',
        title: 'Operación por Etapas con Evidencia Fotográfica',
        subtitle: 'Cada crematorio define sus etapas y registra cada avance',
        badge: 'Módulo 02 · Operación de Planta',
        description: 'Cada crematorio configura la secuencia real de su servicio (retiro, recepción, cremación, entrega o las que use). Desde el panel de Operaciones, el equipo ve las órdenes pendientes y avanza cada una dejando una fotografía y comentarios, con fecha y hora registradas.',
        image_alt: 'Panel de operaciones de Vinzer con avance por etapas y evidencia fotográfica',
        image_caption: 'Panel de operaciones: órdenes pendientes, avance por etapas configurables y registro de fotografías y comentarios.',
        image_url: 'https://i.postimg.cc/mD9jZNX2/portada-1.webp',
        tags: ['Etapas Configurables', 'Foto por Etapa', 'Fecha y Hora'],
        highlights: [
            'Etapas del servicio definidas por cada crematorio',
            'Fotografía y comentarios en cada avance',
            'Fecha y hora registradas automáticamente',
            'Vista de órdenes pendientes para todo el equipo'
        ]
    },
    {
        id: 'portal-familias',
        short_label: 'Portal familias',
        video_time: '02:40',
        title: 'Portal de Seguimiento en Tiempo Real para Familias',
        subtitle: 'Tranquilidad para los tutores desde su celular, sin llamadas ni contraseñas',
        badge: 'Módulo 03 · Portal Público',
        description: 'Cada familia recibe un enlace privado a un portal sobrio y responsive. Sin crear cuentas, ve las etapas del servicio de su mascota, cuál está en curso y las fotografías y comentarios de cada avance. También puede buscar su servicio con el código de verificación.',
        image_alt: 'Portal móvil de seguimiento de cremación de mascotas en tiempo real para familias',
        image_caption: 'Portal público para familias: línea de tiempo del servicio, etapa en curso y evidencias de cada avance con un diseño sereno.',
        image_url: 'https://i.postimg.cc/mD9jZNX2/portada-1.webp',
        tags: ['Sin Contraseñas', 'Línea de Tiempo en Vivo', 'Menos Llamadas'],
        highlights: [
            'Acceso con enlace privado, sin usuario ni contraseña',
            'Búsqueda del servicio por código de verificación',
            'Etapas, fotografías y comentarios de cada avance',
            'Diseño responsive pensado para el celular'
        ]
    },
    {
        id: 'certificados-qr',
        short_label: 'Certificados',
        video_time: '03:50',
        title: 'Certificados de Cremación en PDF Personalizables',
        subtitle: 'Plantillas con el diseño de tu crematorio, listas para imprimir o enviar',
        badge: 'Módulo 04 · Certificados',
        description: 'Desde el plan NORMAL, Vinzer genera el certificado de cremación en PDF con los datos de la mascota y del servicio, usando plantillas con el logo, los colores, los textos, la marca de agua y el espacio de firma y sello de tu crematorio.',
        image_alt: 'Certificado de cremación de mascotas en PDF con plantilla personalizable',
        image_caption: 'Plantilla de certificado de cremación: personalizable con el logo, los colores, los textos y la firma de tu crematorio.',
        image_url: 'https://i.postimg.cc/mD9jZNX2/portada-1.webp',
        tags: ['Plantillas Editables', 'Marca de Agua', 'PDF Listo para Imprimir'],
        highlights: [
            'Plantillas con logo, colores y textos del crematorio',
            'Marca de agua con el logo de fondo',
            'Espacio de firma y sello personalizable',
            'Formatos Carta y Oficio'
        ]
    },
    {
        id: 'inventario-anforas',
        short_label: 'Inventario',
        video_time: '',
        title: 'Inventario de Ánforas, Productos y Catálogo',
        subtitle: 'Stock, precios y catálogo descargable en un solo lugar',
        badge: 'Módulo 05 · Inventario',
        description: 'Controla el stock de ánforas, relicarios y productos con su precio de costo y de venta. Las existencias se descuentan automáticamente cuando un producto se agrega a una orden, y el catálogo completo se puede descargar en PDF para compartirlo con familias y veterinarias.',
        image_alt: 'Inventario de ánforas y productos con control de stock en Vinzer',
        image_caption: 'Módulo de inventario y catálogo: stock disponible, precios de costo y venta, y catálogo descargable en PDF.',
        image_url: 'https://i.postimg.cc/mD9jZNX2/portada-1.webp',
        tags: ['Control de Stock', 'Descuento Automático', 'Catálogo PDF'],
        highlights: [
            'Stock, precio de costo y precio de venta por producto',
            'Descuento automático al agregar productos a una orden',
            'Catálogo de productos y servicios descargable en PDF',
            'Planes, servicios y productos en un mismo catálogo'
        ]
    }
];

export const DEFAULT_TOUR: TourContent = {
    video_url: '',
    modules: DEFAULT_TOUR_MODULES,
};

export const TOUR_LIMITS = {
    modules: 12, tags: 6, highlights: 8,
    short_label: 30, badge: 60, title: 120, subtitle: 200, description: 1200,
    image_alt: 200, image_caption: 300, tag: 40, highlight: 160,
};

/** Server Component: contenido guardado o el original. */
export async function fetchTourContent(): Promise<TourContent> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${baseUrl}/api/public/tour`, { next: { revalidate: 300, tags: ['tour-content'] } });
        if (!res.ok) return DEFAULT_TOUR;
        const data = (await res.json()) as { content: TourContent | null };
        return data?.content?.modules?.length ? data.content : DEFAULT_TOUR;
    } catch {
        return DEFAULT_TOUR;
    }
}

/** Miniatura de un video de YouTube (para JSON-LD). */
export function videoThumbnail(embedUrl: string): string | null {
    const m = embedUrl.match(/\/embed\/([A-Za-z0-9_-]{11})/);
    return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : null;
}
