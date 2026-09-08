/**
 * Preguntas frecuentes de la landing.
 *
 * Fuente única: el acordeón (`VinzerFaqs`) y el JSON-LD `FAQPage` de
 * `app/(public)/vinzer/page.tsx` leen ambos de aquí. Antes estaban duplicadas
 * en los dos archivos y podían desincronizarse, lo que produce rich snippets
 * que no existen en la página.
 *
 * Regla: no publicar respuestas con cifras o promesas que no estén verificadas
 * contra el sistema o confirmadas por el equipo comercial.
 */
export interface VinzerFaq {
    q: string;
    a: string;
}

export const VINZER_FAQS: VinzerFaq[] = [
    {
        q: '¿Qué incluye el sitio web del Plan Ultra?',
        a: 'Diseñamos e implementamos una página web institucional con tu logotipo, tus colores y tu propio dominio, que se registra a tu nombre. Incluye el catálogo de servicios y productos que ya administras en Vinzer y el buscador de seguimiento conectado a tu panel. El hosting está incluido mientras mantengas tu suscripción al Plan Ultra.',
    },
    {
        q: '¿Cómo garantiza Vinzer la trazabilidad y evita errores en las cenizas?',
        a: 'Cada servicio genera un código de verificación único y un enlace de seguimiento privado para la familia. El flujo de trabajo es configurable por crematorio y cada fase requiere evidencia fotográfica, notas y firma del operador. El sistema registra usuario, hora y cambios en cada acción crítica, dejando un historial de auditoría completo.',
    },
    {
        q: '¿Qué es el seguimiento público para la familia?',
        a: 'Es un enlace único por servicio que la familia abre sin iniciar sesión. Muestra una línea de tiempo con cada fase completada, foto de evidencia, descripción y hora exacta. La familia acompaña el proceso en tiempo real, lo que reduce las llamadas de seguimiento al crematorio. Está disponible en todos los planes, incluido el gratuito.',
    },
    {
        q: '¿Cómo funcionan los certificados de cremación?',
        a: 'El sistema genera certificados PDF automáticos con los datos de la mascota, el tutor, el tipo de servicio, firma digital, marca de agua del crematorio y numeración correlativa. Las plantillas son editables en secciones, colores, orden y tipografías. Disponibles desde el plan Normal.',
    },
    {
        q: '¿Mi equipo necesita computadores o equipamiento costoso?',
        a: 'No. Vinzer funciona desde cualquier navegador web en computador, tablet o smartphone. El operador de planta puede registrar la evidencia de cada fase desde su propio teléfono.',
    },
    {
        q: '¿Qué roles y permisos puedo asignar al equipo?',
        a: 'El sistema cuenta con roles para administrador, recepción y operador de cremación, entre otros. Defines qué puede ver y hacer cada persona en cada área del sistema. La cantidad de cuentas disponibles depende del plan contratado.',
    },
    {
        q: '¿El software permite gestionar múltiples sedes de manera segura e independiente?',
        a: 'Sí. Cada crematorio opera en su propio espacio privado dentro de la plataforma: tu información es visible únicamente para las cuentas de tu equipo y ningún otro cliente puede acceder a ella. Cada sede se administra por separado, con sus propios usuarios y permisos.',
    },
];
