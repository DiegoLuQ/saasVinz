/**
 * Contenido compartido de la guía "Trazabilidad y cadena de custodia".
 * Lo usan la página (metadata + JSON-LD) y el componente visible: el FAQ
 * estructurado debe coincidir exactamente con el FAQ que ve el usuario.
 *
 * Regla editorial: separar "buenas prácticas en planta" (lo que hace el
 * equipo) de "lo que hace Vinzer", y describir solo funciones disponibles
 * hoy. NO mencionar: precintos/escaneo QR, bloqueo de horno por tiempo,
 * hash en certificados, registros inmutables (la evidencia se puede
 * eliminar), portal de convenios para veterinarias ni informes descargables.
 */
export const GUIA_TRAZABILIDAD_SLUG = 'software-trazabilidad-cadena-custodia-crematorios-mascotas';

export const GUIA_TRAZABILIDAD_SEO = {
    // <= 60 caracteres.
    title: 'Trazabilidad en Crematorios de Mascotas: Guía | Vinzer',
    // ~155 caracteres.
    description: 'Cómo asegurar la cadena de custodia en un crematorio de mascotas: código único por servicio, evidencia fotográfica por etapa y seguimiento en vivo para la familia.',
    headline: '¿Cómo garantizar la trazabilidad y la cadena de custodia en un crematorio de mascotas?',
    datePublished: '2026-09-16',
    dateModified: '2026-09-26',
    keywords: [
        'trazabilidad crematorio de mascotas',
        'cadena de custodia crematorio de mascotas',
        'cremación individual de mascotas',
        'seguimiento de cremación de mascotas',
        'cómo saber si las cenizas son de mi mascota',
        'certificado de cremación de mascotas',
        'software para crematorios de mascotas',
    ],
};

export interface GuiaFaq {
    question: string;
    answer: string;
}

export const GUIA_TRAZABILIDAD_FAQ: GuiaFaq[] = [
    {
        question: '¿Qué es la cadena de custodia en un crematorio de mascotas?',
        answer: 'Es el registro continuo de dónde está y quién es responsable de la mascota desde que el crematorio la recibe hasta que entrega sus cenizas a la familia. Una buena cadena de custodia identifica cada servicio con un código único y documenta cada traspaso con evidencia, como fotografías con fecha y hora.',
    },
    {
        question: '¿Cómo puede una familia saber que recibe las cenizas de su mascota?',
        answer: 'Lo más importante es contratar una cremación individual y elegir un crematorio que documente el proceso. Pregunta si identifican a tu mascota con un código durante todo el servicio, si registran fotografías en cada etapa y si puedes seguir el avance en línea. Con Vinzer, el crematorio entrega a la familia un enlace de seguimiento con las etapas y las fotografías del servicio.',
    },
    {
        question: '¿Qué diferencia hay entre cremación individual y colectiva?',
        answer: 'En la cremación individual se crema solo a una mascota y sus cenizas se entregan a la familia. En la cremación colectiva se crema a varias mascotas juntas y, por lo general, las cenizas no se devuelven. Si quieres recibir las cenizas de tu mascota, confirma con el crematorio que el servicio contratado es individual.',
    },
    {
        question: '¿Cómo sigue la familia el proceso de cremación en Vinzer?',
        answer: 'Cada servicio tiene un enlace de seguimiento que no requiere cuenta ni contraseña. La familia ve las etapas definidas por el crematorio, cuál está en curso y las fotografías y comentarios registrados en cada avance. También puede buscar su servicio con el código de 10 caracteres que le entrega el crematorio.',
    },
    {
        question: '¿Cómo respondo ante un reclamo o una duda de una veterinaria aliada?',
        answer: 'Abre la orden del servicio en Vinzer: ahí están los datos de recepción, las fotografías y el avance por etapas con fecha y hora. Puedes compartir el enlace de seguimiento para que la familia o la veterinaria vean el mismo historial. Para proteger ese historial, usa los roles y permisos y limita quién puede editar o eliminar registros.',
    },
    {
        question: '¿Vinzer emite certificados de cremación?',
        answer: 'Sí. Desde el plan NORMAL, Vinzer genera el certificado de cremación en PDF a partir de una plantilla con el diseño del crematorio. El crematorio también puede crear un memorial online para que la familia recuerde a su mascota.',
    },
];
