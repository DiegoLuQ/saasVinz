/**
 * Contenido compartido de la guía "Formulario de cremación de mascotas online".
 * Lo usan la página (metadata + JSON-LD), el componente visible y el sitemap.
 *
 * Datos verificados en el código (2026-09-26):
 * - 5 pasos: Familia, Ángel, Camino, Recuerdos, Resumen.
 * - Hasta 3 fotos en la interfaz; dedicatoria de hasta 500 caracteres.
 * - Progreso guardado en el navegador (localStorage) del mismo dispositivo.
 * - Al enviar: código de solicitud + enlace de seguimiento inmediato,
 *   compartir por WhatsApp y tarjeta de homenaje descargable (si hay foto).
 * - Crematorio: notificación en el panel; desde la solicitud crea cliente,
 *   mascota y servicios.
 * - Enlace temporal: vence a los 3 días (sin PIN). Enlace permanente del
 *   tenant. Enlace por veterinaria aliada. Incrustado en la web: solo ULTRA.
 * - Anti-spam: reCAPTCHA v3 + credencial obligatoria + límite de envíos.
 */
export const GUIA_FORMULARIO_SLUG = 'formulario-cremacion-mascotas-online';

export const GUIA_FORMULARIO_SEO = {
    // <= 60 caracteres.
    title: 'Formulario de Cremación de Mascotas Online | Vinzer',
    // ~155 caracteres.
    description: 'Cómo recibir solicitudes de cremación de mascotas online: un formulario para familias por enlace o en tu sitio web, con fotos, servicios y seguimiento inmediato.',
    headline: 'Formulario de cremación de mascotas online: cómo recibir solicitudes desde WhatsApp y tu sitio web',
    datePublished: '2026-09-26',
    dateModified: '2026-09-26',
    keywords: [
        'formulario de cremación de mascotas',
        'solicitud de cremación de mascota online',
        'formulario para crematorio de mascotas',
        'cremación de mascotas en línea',
        'formulario web para crematorio',
        'software para crematorios de mascotas',
    ],
};

export interface GuiaFaq {
    question: string;
    answer: string;
}

export const GUIA_FORMULARIO_FAQ: GuiaFaq[] = [
    {
        question: '¿La familia puede completar el formulario desde el celular?',
        answer: 'Sí. El formulario está pensado para el celular, no requiere crear una cuenta y guía a la familia en 5 pasos con frases de acompañamiento. Si cierra la página a mitad, puede retomar donde quedó en el mismo dispositivo, porque el avance se guarda en su navegador.',
    },
    {
        question: '¿Qué datos pide el formulario de cremación?',
        answer: 'Los datos de contacto de la familia y su preferencia de contacto, el lugar de retiro y la dirección de entrega de las cenizas, los datos de la mascota (nombre, especie, tamaño y edad), el servicio o plan elegido, hasta 3 fotografías y una dedicatoria opcional. Antes de enviar, la familia revisa todo en un resumen.',
    },
    {
        question: '¿Cuánto dura el enlace del formulario?',
        answer: 'Hay dos tipos. El enlace temporal vence a los 3 días y sirve para enviarlo caso a caso por WhatsApp. El enlace permanente no vence y sirve para publicarlo en tu sitio web, redes sociales o un código QR impreso. Además, cada veterinaria aliada puede tener su propio enlace.',
    },
    {
        question: '¿Puedo poner el formulario dentro de mi página web?',
        answer: 'Sí, en el plan ULTRA. Vinzer entrega un fragmento de código para pegar en una página existente o una página HTML completa lista para publicar, por ejemplo en form.tu-crematorio.cl. El formulario solo se muestra en los dominios que autorices y ajusta su alto automáticamente.',
    },
    {
        question: '¿Cómo sabe el crematorio que llegó una solicitud?',
        answer: 'Cada envío genera una notificación en el panel de Vinzer. Desde la solicitud, el equipo revisa los datos y las fotografías y crea el cliente, la mascota y los servicios sin volver a digitar la información.',
    },
    {
        question: '¿El formulario está protegido contra spam?',
        answer: 'Sí. Solo acepta envíos desde un enlace válido del crematorio, usa reCAPTCHA para filtrar bots y limita la cantidad de envíos por minuto. Las fotografías se validan en tipo y tamaño antes de guardarse.',
    },
];
