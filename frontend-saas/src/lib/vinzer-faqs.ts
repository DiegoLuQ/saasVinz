/**
 * Preguntas frecuentes de la landing Vinzer.
 *
 * Fuente única: alimenta simultáneamente el componente interactivo (VinzerFaqs)
 * y el esquema JSON-LD FAQPage para indexación en Google (app/(public)/vinzer/page.tsx).
 *
 * Estrategia: resolución de objeciones comerciales reales y SEO semántico con
 * distribución natural de términos sin incurrir en sobreoptimización.
 */
export interface VinzerFaq {
    q: string;
    a: string;
}

export const VINZER_FAQS: VinzerFaq[] = [
    {
        q: '¿Qué es Vinzer y para qué sirve?',
        a: 'Vinzer es un software diseñado para la gestión de crematorios de mascotas. Permite centralizar clientes, mascotas, servicios y operaciones, manteniendo la información organizada y facilitando el seguimiento de cada cremación desde la recepción hasta la entrega.',
    },
    {
        q: '¿Vinzer está diseñado específicamente para crematorios de mascotas?',
        a: 'Sí. Vinzer está pensado específicamente para las necesidades de los crematorios de mascotas, incluyendo la gestión de servicios, operaciones, seguimiento de cremaciones, certificados y comunicación con las familias.',
    },
    {
        q: '¿Cómo funciona la trazabilidad de una cremación?',
        a: 'Vinzer permite registrar las distintas etapas del proceso de cremación, dejando un historial asociado al servicio. De esta forma, el crematorio puede mantener organizada la información del proceso y consultar su evolución cuando sea necesario.',
    },
    {
        q: '¿La familia puede seguir el proceso de cremación de su mascota?',
        a: 'Sí. Vinzer permite entregar un enlace de seguimiento público asociado al servicio. La familia puede consultar el estado del proceso sin necesidad de crear una cuenta o iniciar sesión, facilitando una comunicación más transparente con el crematorio.',
    },
    {
        q: '¿Puedo registrar fotografías y evidencias durante el proceso?',
        a: 'Sí. Vinzer permite incorporar evidencias asociadas a las etapas del servicio, como fotografías y notas. Esto ayuda al equipo del crematorio a mantener un registro organizado del proceso y disponer de información verificable.',
    },
    {
        q: '¿Puedo generar certificados de cremación con Vinzer?',
        a: 'Sí. Vinzer permite generar certificados de cremación en formato PDF y configurar diferentes elementos del documento, como información de la mascota, tutor, servicio y elementos visuales de la marca, según las funcionalidades disponibles en el plan contratado.',
    },
    {
        q: '¿Necesito instalar un programa o comprar equipos especiales?',
        a: 'No. Vinzer funciona desde un navegador web, por lo que puede utilizarse desde computadores, tablets o smartphones con conexión a Internet. No requiere instalar un programa específico ni adquirir equipamiento especializado.',
    },
];
