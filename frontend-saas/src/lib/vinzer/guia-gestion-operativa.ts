/**
 * Contenido compartido de la guía "Gestión operativa de crematorios de mascotas".
 * Lo usan la página (metadata + JSON-LD) y el componente visible: el FAQ
 * estructurado debe coincidir exactamente con el FAQ que ve el usuario.
 *
 * Regla editorial: solo se describen funciones disponibles hoy en Vinzer.
 * Funciones con backend pero sin interfaz (registro técnico de horno,
 * asignación de choferes, checklist de pertenencias) NO se mencionan hasta
 * que estén disponibles para el usuario.
 */
export const GUIA_GESTION_SLUG = 'sistema-gestion-operativa-automatizacion-crematorio-mascotas';

export const GUIA_GESTION_SEO = {
    // <= 60 caracteres para que Google no lo corte.
    title: 'Gestión Operativa de Crematorios de Mascotas | Vinzer',
    // ~155 caracteres.
    description: 'Cómo ordenar la operación de un crematorio de mascotas: recepción sin papel, formulario online para familias, etapas con evidencia fotográfica y stock de urnas.',
    headline: 'Gestión operativa de un crematorio de mascotas: cómo pasar del Excel y WhatsApp a un sistema',
    datePublished: '2026-09-16',
    dateModified: '2026-09-26',
    keywords: [
        'software para crematorios de mascotas',
        'gestión operativa crematorio de mascotas',
        'sistema para crematorio de mascotas',
        'formulario de cremación de mascotas online',
        'control de stock de urnas para mascotas',
        'seguimiento de cremación de mascotas',
        'software crematorio mascotas Chile',
    ],
};

export interface GuiaFaq {
    question: string;
    answer: string;
}

export const GUIA_GESTION_FAQ: GuiaFaq[] = [
    {
        question: '¿Qué es un software de gestión operativa para crematorios de mascotas?',
        answer: 'Es un sistema que reúne en un solo lugar el registro de cada servicio de cremación, las solicitudes de las familias, el avance del servicio por etapas, el inventario de urnas y productos, y la comunicación del estado a la familia. Reemplaza las planillas de Excel, las fichas en papel y la coordinación por WhatsApp.',
    },
    {
        question: '¿Cómo funciona el formulario de recepción de pedidos en Vinzer?',
        answer: 'Está organizado en 4 pestañas: Angelito (datos de la mascota y del tutor), Logística (retiro programado, peso estimado y dirección de entrega), Evidencia (notas internas y hasta 3 fotografías) y Comercial (planes, servicios, urnas y productos con el total de la orden). Guarda borradores automáticamente para no perder información si se interrumpe el registro.',
    },
    {
        question: '¿Las familias pueden registrar la solicitud de cremación por su cuenta?',
        answer: 'Sí. El crematorio comparte un enlace a un formulario online donde la familia ingresa sus datos, los de su mascota, elige los servicios, sube fotografías y escribe una dedicatoria. El enlace puede ser temporal o permanente, y existen enlaces propios para veterinarias aliadas. En el plan ULTRA el formulario también se puede incrustar en el sitio web del crematorio.',
    },
    {
        question: '¿Cómo apoya Vinzer al equipo de planta durante la jornada?',
        answer: 'Cada crematorio define sus propias etapas de servicio (por ejemplo: retiro, recepción, cremación y entrega). Desde el panel de Operaciones, el equipo ve qué órdenes están pendientes y avanza cada una de etapa dejando evidencia con fotografía y comentarios, con fecha y hora registradas. La familia sigue ese mismo avance en tiempo real desde su enlace de seguimiento.',
    },
    {
        question: '¿Vinzer controla el stock de urnas y productos?',
        answer: 'Sí. Cada producto tiene stock, precio de costo y precio de venta, y las existencias se descuentan automáticamente cuando el producto se agrega a una orden. Además, el catálogo de productos y servicios se puede descargar en PDF para compartirlo con familias o veterinarias.',
    },
    {
        question: '¿Es difícil capacitar al personal de planta y a los conductores?',
        answer: 'Cada usuario ve solo los módulos de su rol (recepción, operación, conductor, contabilidad, entre otros), lo que simplifica el aprendizaje: un operador trabaja principalmente con el listado de órdenes y el avance de etapas. Vinzer funciona desde el navegador del computador o del celular, sin instalar aplicaciones.',
    },
    {
        question: '¿Qué plan de Vinzer necesito para la gestión operativa?',
        answer: 'Desde el plan Track se incluyen los módulos de operaciones y pagos, pensado para crematorios que ya usan otro sistema de facturación. La emisión de certificados de cremación y la configuración avanzada están disponibles desde el plan NORMAL. Puedes comparar los límites de cada plan en la página de planes.',
    },
];
