/**
 * Contenido compartido de la guía "Crematorio de mascotas en Chile".
 * Lo usan la página (metadata + JSON-LD), el componente visible y el sitemap.
 *
 * Guía para FAMILIAS (no B2B): informativa, sin precios inventados ni
 * afirmaciones legales absolutas. Vinzer no presta el servicio de cremación;
 * la guía cierra con un bloque explícito para crematorios (software).
 * Fuente: crematorio-de-mascotas-chile-vinzer.md (raíz del repo).
 * Antes de cada actualización, revisar el estado del Boletín 18.130-11.
 */
export const GUIA_CREMATORIO_CHILE_SLUG = 'crematorio-de-mascotas-chile';

export const GUIA_CREMATORIO_CHILE_SEO = {
    // <= 60 caracteres.
    title: 'Crematorio de mascotas en Chile: guía completa 2026',
    // ~155 caracteres.
    description: '¿Buscas un crematorio de mascotas en Chile? Conoce los tipos de cremación, precios, retiro, entrega de cenizas y cómo elegir un servicio confiable.',
    headline: 'Crematorio de mascotas en Chile: guía completa para despedir a tu compañero',
    datePublished: '2026-10-13',
    dateModified: '2026-10-13',
    keywords: [
        'crematorio de mascotas Chile',
        'cremación de mascotas',
        'cremación individual de mascotas',
        'cremación colectiva de mascotas',
        'precio cremación mascota',
        'qué hacer cuando fallece una mascota',
        'software para crematorios de mascotas',
    ],
};

export interface GuiaFaq {
    question: string;
    answer: string;
}

export const GUIA_CREMATORIO_CHILE_FAQ: GuiaFaq[] = [
    {
        question: '¿Cuánto cuesta cremar un perro o un gato en Chile?',
        answer: 'El precio depende de la ciudad, el peso, la modalidad de cremación y los servicios adicionales. Solicita una cotización detallada que especifique el retiro, la entrega de cenizas y la documentación incluida.',
    },
    {
        question: '¿Cuál es la diferencia entre cremación individual y colectiva?',
        answer: 'La cremación individual se contrata para una mascota de manera individual y suele permitir la devolución de sus cenizas. La colectiva contempla el tratamiento conjunto de varias mascotas y normalmente no incluye la devolución individualizada de las cenizas. Confirma siempre las condiciones con el proveedor.',
    },
    {
        question: '¿Puedo recibir las cenizas de mi mascota?',
        answer: 'Sí, cuando contratas una modalidad que contempla su devolución. Antes de confirmar, pregunta cómo se identifica a la mascota y qué procedimiento utiliza el proveedor para mantener la correspondencia entre el servicio y las cenizas entregadas.',
    },
    {
        question: '¿El crematorio puede retirar a mi mascota desde mi domicilio?',
        answer: 'Algunos proveedores ofrecen retiro domiciliario o desde clínicas veterinarias. La disponibilidad, los horarios y el precio dependen de la zona de cobertura.',
    },
    {
        question: '¿Cuánto demora la cremación de una mascota?',
        answer: 'El plazo varía según el proveedor, la modalidad contratada, el tamaño del animal y la logística de entrega. Consulta el tiempo estimado antes de contratar y pide que te expliquen cómo te informarán cuando el servicio esté terminado.',
    },
    {
        question: '¿Qué debo preguntar antes de contratar?',
        answer: 'Consulta el tipo de cremación, el precio total, el retiro, la identificación de la mascota, la entrega de cenizas, la documentación y los plazos. Solicita que las condiciones queden por escrito.',
    },
    {
        question: '¿Puedo contratar un servicio a través de una clínica veterinaria?',
        answer: 'Algunas clínicas coordinan estos servicios con proveedores externos. Pregunta quién realizará la cremación, qué empresa recibirá a tu mascota y qué documentación podrás solicitar.',
    },
];
