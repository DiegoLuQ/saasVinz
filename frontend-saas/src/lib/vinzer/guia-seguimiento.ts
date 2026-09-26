/**
 * Contenido compartido de la guía "Seguimiento de cremación de mascotas en línea".
 * Lo usan la página (metadata + JSON-LD), el componente visible y el sitemap.
 *
 * Datos verificados en el código (2026-09-26):
 * - Enlace privado por servicio (token) sin cuenta ni contraseña.
 * - Muestra: mascota (nombre, especie/raza, peso), tutor, logo y nombre del
 *   crematorio, estado actual, % de avance, última actualización y línea de
 *   tiempo (Completado / En curso / Pendiente) con fecha, foto y comentarios.
 * - Botón compartir (share nativo o copiar enlace); tarjeta de recuerdo
 *   descargable con la dedicatoria (diseño en Documentos › Diseños).
 * - ULTRA: al entregarse el servicio, la página pasa a modo "Homenaje".
 * - Búsqueda por código de 10 caracteres o código de solicitud del formulario.
 * - NO se actualiza sola: la familia ve el cambio al abrir o recargar.
 * - Panel: copiar enlace o abrir WhatsApp con mensaje prellenado al teléfono
 *   del cliente (acción manual, no envío automático).
 */
export const GUIA_SEGUIMIENTO_SLUG = 'seguimiento-cremacion-mascotas-en-linea';

export const GUIA_SEGUIMIENTO_SEO = {
    // <= 60 caracteres.
    title: 'Seguimiento de Cremación de Mascotas en Línea | Vinzer',
    // ~155 caracteres.
    description: 'Cómo dar a las familias un seguimiento en línea de la cremación de su mascota: enlace privado, etapas con fotos, búsqueda por código y menos llamadas.',
    headline: 'Seguimiento de la cremación de mascotas en línea: cómo informar a las familias y reducir las llamadas',
    datePublished: '2026-09-26',
    dateModified: '2026-09-26',
    keywords: [
        'seguimiento de cremación de mascotas',
        'seguimiento cremación mascota en línea',
        'estado de la cremación de mi mascota',
        'código de seguimiento cremación',
        'crematorio de mascotas con seguimiento',
        'software para crematorios de mascotas',
    ],
};

export interface GuiaFaq {
    question: string;
    answer: string;
}

export const GUIA_SEGUIMIENTO_FAQ: GuiaFaq[] = [
    {
        question: '¿La familia necesita crear una cuenta para ver el seguimiento?',
        answer: 'No. Cada servicio tiene un enlace privado que se abre directamente desde el celular o el computador, sin usuario ni contraseña.',
    },
    {
        question: '¿Qué pasa si la familia pierde el enlace?',
        answer: 'Puede buscar su servicio en la página de seguimiento con el código de 10 caracteres que le entrega el crematorio. Si envió la solicitud por el formulario online, también sirve el código de solicitud que recibió al enviarla.',
    },
    {
        question: '¿El seguimiento se actualiza en tiempo real?',
        answer: 'Se actualiza cada vez que el equipo del crematorio registra un avance. La familia ve el nuevo estado al abrir o recargar la página, junto con la fecha de la última actualización.',
    },
    {
        question: '¿La familia puede ver las fotografías de cada etapa?',
        answer: 'Sí. Las fotografías y los comentarios que el equipo registra en cada etapa se muestran en el seguimiento. Por eso conviene elegir imágenes respetuosas y adecuadas para la familia.',
    },
    {
        question: '¿Cómo envía el crematorio el enlace de seguimiento?',
        answer: 'Si la familia usó el formulario online, recibe el enlace apenas envía su solicitud. Además, desde el panel de Vinzer el equipo puede copiar el enlace o abrir WhatsApp con un mensaje ya redactado para el teléfono del cliente.',
    },
    {
        question: '¿Qué ve la familia cuando el servicio termina?',
        answer: 'El seguimiento muestra el servicio como finalizado y la familia puede descargar una tarjeta de recuerdo con su dedicatoria. En el plan ULTRA, la página se transforma en un espacio de homenaje a la mascota una vez entregado el servicio.',
    },
];
