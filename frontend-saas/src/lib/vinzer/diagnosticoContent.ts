/** Contenido SEO de vinzer.cl/diagnostico (texto visible + JSON-LD FAQPage). */

export const DIAG_AREAS: { name: string; text: string }[] = [
    { name: 'Identidad y certificados', text: 'Marca propia y certificado de cremación que entregas a la familia.' },
    { name: 'Instalaciones y traslado', text: 'Espacio de despedida, retiro a domicilio y traslado de la mascota.' },
    { name: 'Gestión y software', text: 'Dónde registras órdenes, clientes, mascotas y pagos.' },
    { name: 'Operación y trazabilidad', text: 'Cadena de custodia y seguimiento del servicio para la familia.' },
    { name: 'Normativa y seguridad', text: 'Autorizaciones sanitarias, municipales y del horno crematorio.' },
    { name: 'Google y sitio web', text: 'Perfil de Empresa en Google, reseñas y presencia web.' },
    { name: 'WhatsApp y atención', text: 'Cómo y qué tan rápido atiendes a las familias.' },
    { name: 'Redes sociales y contenido', text: 'Constancia y calidad de tus publicaciones.' },
    { name: 'Planes, precios y servicios', text: 'Planes definidos por escrito y fáciles de compartir.' },
    { name: 'Alianzas y fidelización', text: 'Veterinarias aliadas, derivaciones y seguimiento posterior.' },
];

export const DIAG_STEPS = [
    { title: 'Elige tu diagnóstico', text: 'Rápido (10 preguntas), Estándar (15) o Completo (20).' },
    { title: 'Responde', text: 'Una pregunta por pantalla, con ayuda en cada una. Puedes marcar «No aplica».' },
    { title: 'Recibe tu informe', text: 'Puntaje general y por área, recomendaciones y PDF, también en tu correo.' },
];

export const DIAG_FAQS: { q: string; a: string }[] = [
    { q: '¿El diagnóstico tiene costo?', a: 'No. Es gratuito y no necesitas crear una cuenta: solo el nombre de tu crematorio y tu correo para enviarte el informe.' },
    { q: '¿Cuánto tiempo toma?', a: 'Entre 3 y 8 minutos, según elijas el diagnóstico Rápido (10 preguntas), Estándar (15) o Completo (20).' },
    { q: '¿Qué evalúa?', a: 'Diez áreas de un crematorio de mascotas: identidad y certificados, instalaciones, gestión, trazabilidad, normativa, Google, WhatsApp, redes sociales, planes y alianzas con veterinarias.' },
    { q: '¿Cómo se calcula el puntaje?', a: 'Cada respuesta vale entre 0 y 100 %. Se promedia por área y el total pondera las áreas según su importancia. Las preguntas que marcas «No aplica» no afectan tu resultado.' },
    { q: '¿Qué recibo al terminar?', a: 'Tu puntaje general y por área, tus fortalezas y oportunidades de mejora, recomendaciones concretas y un informe en PDF. El enlace a tu informe también llega a tu correo.' },
    { q: '¿Para qué crematorios sirve?', a: 'Para crematorios de mascotas de cualquier tamaño, desde los que están partiendo hasta los que hacen decenas de servicios al mes.' },
];
