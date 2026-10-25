// Términos del Servicio, Política de Privacidad y Política de Cookies de Vinzer
// (vinzer.cl/terminos, /privacidad, /cookies). Las páginas se arman con
// components/vinzer/LegalPage.tsx.
//
// ⚠️ Borrador para un SaaS B2B en Chile: revisarlo con un abogado antes de
// depender de él. Completar LEGAL_ENTITY con los datos reales de la empresa.
// Al cambiar el texto, actualizar LEGAL_VERSION y TERMS_VERSION en
// backend/app/api/public/signup/router.py (queda guardado con cada registro).

export const LEGAL_VERSION = '2026-10-23';
export const LEGAL_UPDATED = '23 de octubre de 2026';

/** Titular del servicio. Vacíos = no se muestran (completar antes de publicar). */
export const LEGAL_ENTITY = {
    /** Razón social, ej. «Vinzer SpA». */
    company: '',
    rut: '',
    address: '',
    /** Ciudad cuyos tribunales son competentes. */
    city: 'Santiago',
    /** Correo para consultas legales y de privacidad (vacío = el de «Datos del SaaS»). */
    email: '',
};

export interface LegalSection {
    title: string;
    /** Párrafos; un párrafo que empieza con «• » se muestra como viñeta. */
    body: string[];
}

export interface LegalDoc {
    slug: 'terminos' | 'privacidad' | 'cookies';
    title: string;
    description: string;
    intro: string;
    sections: LegalSection[];
}

const holder = () => (LEGAL_ENTITY.company
    ? `${LEGAL_ENTITY.company}${LEGAL_ENTITY.rut ? `, RUT ${LEGAL_ENTITY.rut}` : ''}${LEGAL_ENTITY.address ? `, con domicilio en ${LEGAL_ENTITY.address}` : ''}`
    : 'el titular de Vinzer');

export function termsDoc(contactEmail: string): LegalDoc {
    return {
        slug: 'terminos',
        title: 'Términos del Servicio',
        description: 'Condiciones de uso de Vinzer, el software para crematorios de mascotas.',
        intro: `Estos Términos regulan el uso de Vinzer, la plataforma de software como servicio (SaaS) para la gestión de crematorios de mascotas ofrecida por ${holder()} («Vinzer», «nosotros»). Al crear una cuenta o usar la plataforma, aceptas estos Términos y la Política de Privacidad. Si actúas en nombre de una empresa, declaras tener facultades para obligarla.`,
        sections: [
            {
                title: '1. Definiciones',
                body: [
                    '• «Cliente»: el crematorio, funeraria o empresa que contrata Vinzer y su cuenta.',
                    '• «Usuarios»: las personas a quienes el Cliente da acceso a su panel.',
                    '• «Familias»: los tutores de las mascotas que el Cliente atiende y que usan el formulario, el seguimiento o los memoriales.',
                    '• «Datos del Cliente»: la información que el Cliente y sus Usuarios ingresan o que las Familias envían a través de la plataforma (clientes, mascotas, órdenes, fotos, documentos).',
                ],
            },
            {
                title: '2. Cuenta',
                body: [
                    'Para usar Vinzer debes registrarte con datos verdaderos y un correo que controles, que confirmaremos. Eres responsable de mantener tu contraseña en reserva y de toda la actividad realizada con las cuentas de tus Usuarios. Avísanos de inmediato si detectas un acceso no autorizado.',
                    'Debes ser mayor de 18 años y usar Vinzer en el marco de una actividad comercial o profesional.',
                ],
            },
            {
                title: '3. Planes, límites y pagos',
                body: [
                    'Vinzer se ofrece en planes con distintas funciones y límites (por ejemplo, órdenes por mes o usuarios), publicados en vinzer.cl. El plan FREE es gratuito, no requiere medio de pago y puede tener funciones y límites menores.',
                    'Los planes pagados se cobran por período (mensual o anual) por adelantado, al precio vigente al contratarlos, más los impuestos que correspondan. El precio contratado se mantiene mientras sigas en ese plan y ciclo; un cambio de plan aplica el precio vigente del nuevo plan.',
                    'Los créditos de inteligencia artificial incluidos en un plan se renuevan cada mes y no son acumulables; los créditos adicionales comprados no vencen mientras la cuenta esté activa. Los créditos no son canjeables por dinero.',
                    'Si un pago no se realiza, podemos limitar el acceso a las funciones del plan tras un período de gracia, manteniendo el acceso a la configuración y facturación para regularizar. Salvo que la ley disponga otra cosa, los montos pagados no son reembolsables por períodos parciales.',
                ],
            },
            {
                title: '4. Uso aceptable',
                body: [
                    'Te comprometes a no:',
                    '• usar Vinzer para fines ilícitos, engañosos o que vulneren derechos de terceros;',
                    '• cargar contenido ilegal, ofensivo o que no tengas derecho a usar;',
                    '• intentar acceder a cuentas o datos de otros clientes, probar vulnerabilidades sin autorización, o sobrecargar o interferir con la plataforma;',
                    '• revender, sublicenciar o copiar el software, ni usarlo para construir un producto competidor;',
                    '• enviar comunicaciones masivas no solicitadas a través de la plataforma.',
                    'Podemos suspender una cuenta que infrinja esta sección, avisando cuando sea posible.',
                ],
            },
            {
                title: '5. Datos del Cliente y de las Familias',
                body: [
                    'Los Datos del Cliente son del Cliente. Para los datos personales de las Familias y de sus propios clientes, el Cliente es el responsable del tratamiento y Vinzer actúa como encargado: los tratamos solo para prestar el servicio, según las instrucciones del Cliente y esta plataforma, y con medidas de seguridad razonables.',
                    'El Cliente se obliga a contar con una base legal para tratar esos datos (por ejemplo, el consentimiento o la ejecución del servicio contratado con la Familia), a informar a las Familias de ese tratamiento y a atender sus solicitudes de acceso, rectificación o eliminación. Vinzer colaborará con lo razonable para ello.',
                    'No vendemos los Datos del Cliente ni los usamos para publicidad. Podemos usar información agregada y anónima sobre el uso de la plataforma para mejorarla.',
                ],
            },
            {
                title: '6. Contenido y propiedad intelectual',
                body: [
                    'Vinzer, su software, diseños, plantillas, marcas y documentación son de su titular o de sus licenciantes. Te otorgamos una licencia limitada, no exclusiva e intransferible para usar la plataforma durante la vigencia de tu cuenta.',
                    'Conservas los derechos sobre tu contenido (logo, fotos, textos). Nos autorizas a alojarlo, procesarlo y mostrarlo en la medida necesaria para prestar el servicio (por ejemplo, en certificados, seguimiento, catálogo o memoriales que tú publiques).',
                ],
            },
            {
                title: '7. Funciones con inteligencia artificial',
                body: [
                    'Algunas funciones generan textos o imágenes con proveedores de inteligencia artificial a partir de los datos y fotos que indiques. Los resultados pueden contener errores o no ajustarse a lo esperado: revísalos antes de entregarlos o publicarlos. Eres responsable del uso que hagas de ellos y de contar con autorización para usar las fotos que envías.',
                ],
            },
            {
                title: '8. Disponibilidad, soporte y respaldos',
                body: [
                    'Hacemos esfuerzos razonables para que Vinzer esté disponible de forma continua, pero no garantizamos un funcionamiento ininterrumpido o libre de errores. Podemos realizar mantenciones, avisando con anticipación cuando afecten el uso.',
                    'Realizamos respaldos periódicos de la base de datos. Te recomendamos descargar o conservar copia de los documentos que entregues a las Familias.',
                    'El soporte se presta por los canales publicados (WhatsApp y correo), en horario hábil.',
                ],
            },
            {
                title: '9. Servicios de terceros',
                body: [
                    'Vinzer usa proveedores para alojamiento, almacenamiento de archivos, correo, protección contra spam, monitoreo de errores e inteligencia artificial. Su uso está sujeto a nuestra Política de Privacidad. No respondemos por servicios de terceros que el Cliente integre por su cuenta (por ejemplo, su sitio web o sus redes sociales).',
                ],
            },
            {
                title: '10. Limitación de responsabilidad',
                body: [
                    'En la máxima medida que permita la ley, Vinzer no responde por daños indirectos, lucro cesante, pérdida de oportunidades ni daños derivados del uso que el Cliente haga de la información o documentos generados. La responsabilidad total de Vinzer por cualquier reclamo relacionado con el servicio se limita al monto pagado por el Cliente en los 12 meses anteriores al hecho que lo origina (o a CLP 100.000 si se trata de un plan gratuito).',
                    'Nada en estos Términos excluye la responsabilidad que no pueda limitarse según la ley chilena.',
                ],
            },
            {
                title: '11. Término de la cuenta',
                body: [
                    'Puedes dejar de usar Vinzer en cualquier momento; los planes pagados se mantienen hasta el fin del período pagado. Podemos terminar o suspender una cuenta por incumplimiento grave de estos Términos o por falta de pago.',
                    'Tras el término, podrás solicitar una exportación de tus datos dentro de 30 días. Después de ese plazo podremos eliminarlos, salvo lo que debamos conservar por obligación legal. Los respaldos se sobrescriben en sus ciclos normales.',
                ],
            },
            {
                title: '12. Cambios a estos Términos',
                body: [
                    'Podemos actualizar estos Términos. Si el cambio es relevante, te avisaremos por correo o en la plataforma con al menos 15 días de anticipación. Si sigues usando Vinzer después de esa fecha, se entiende que aceptas la nueva versión.',
                ],
            },
            {
                title: '13. Ley aplicable y contacto',
                body: [
                    `Estos Términos se rigen por las leyes de la República de Chile. Cualquier controversia se someterá a los tribunales ordinarios de justicia de ${LEGAL_ENTITY.city}, sin perjuicio de los derechos que la ley reconozca a los consumidores.`,
                    `Consultas: ${contactEmail}.`,
                ],
            },
        ],
    };
}

export function privacyDoc(contactEmail: string): LegalDoc {
    return {
        slug: 'privacidad',
        title: 'Política de Privacidad',
        description: 'Cómo Vinzer trata los datos personales de sus clientes y de las familias que ellos atienden.',
        intro: `Esta Política explica qué datos personales trata ${holder()} («Vinzer») al ofrecer su plataforma para crematorios de mascotas, para qué los usa y qué derechos tienes. Se aplica conforme a la Ley N° 19.628 sobre Protección de la Vida Privada y, desde su entrada en vigencia, la Ley N° 21.719.`,
        sections: [
            {
                title: '1. Dos tipos de datos, dos roles',
                body: [
                    '• Datos de nuestros clientes (crematorios y sus usuarios): Vinzer es el responsable de su tratamiento.',
                    '• Datos de las familias y de los clientes de cada crematorio (por ejemplo, tutor, teléfono, mascota, fotos): el crematorio es el responsable y Vinzer actúa como encargado, tratándolos solo por cuenta del crematorio para prestar el servicio. Si eres una familia, dirige tus solicitudes al crematorio que te atendió; te ayudaremos a gestionarlas si nos escribes.',
                ],
            },
            {
                title: '2. Qué datos tratamos',
                body: [
                    '• Cuenta: nombre, correo, teléfono, nombre y datos del crematorio, contraseña (guardada cifrada de forma irreversible).',
                    '• Uso del servicio: lo que se ingresa en la plataforma (órdenes, clientes, mascotas, documentos, imágenes).',
                    '• Facturación: plan contratado, pagos y comprobantes.',
                    '• Datos técnicos: dirección IP, navegador, registros de acceso y de actividad (auditoría) y errores, para seguridad y soporte.',
                ],
            },
            {
                title: '3. Para qué los usamos',
                body: [
                    '• Prestar el servicio, crear y administrar la cuenta y permitir el acceso seguro.',
                    '• Enviar correos necesarios: confirmación de registro, recuperación de contraseña, avisos de la cuenta y de facturación.',
                    '• Dar soporte, prevenir fraudes y abusos, y mantener la seguridad (por ejemplo, límites de intentos y verificación anti-spam).',
                    '• Mejorar la plataforma con información agregada y anónima.',
                    '• Contactarte sobre Vinzer como cliente; puedes pedir no recibir comunicaciones comerciales en cualquier momento.',
                    'La base del tratamiento es la ejecución del contrato de servicio, el cumplimiento de obligaciones legales, nuestro interés legítimo en la seguridad del servicio y, cuando corresponda, tu consentimiento.',
                ],
            },
            {
                title: '4. Con quién los compartimos',
                body: [
                    'No vendemos datos personales. Los compartimos solo con proveedores que nos ayudan a operar el servicio, bajo obligaciones de confidencialidad y seguridad:',
                    '• alojamiento de servidores y base de datos;',
                    '• almacenamiento de archivos e imágenes (Cloudflare R2);',
                    '• envío de correos (Google);',
                    '• protección contra spam en formularios (Google reCAPTCHA);',
                    '• monitoreo de errores técnicos (Sentry), sin contraseñas ni contenido de formularios;',
                    '• inteligencia artificial para generar textos e imágenes, solo cuando el crematorio usa esas funciones y con los datos que indica;',
                    '• procesamiento de pagos, cuando corresponda.',
                    'También podemos entregar datos cuando lo exija la ley o una autoridad competente.',
                ],
            },
            {
                title: '5. Transferencias internacionales',
                body: [
                    'Algunos proveedores procesan datos fuera de Chile (por ejemplo, en Estados Unidos o la Unión Europea). En esos casos procuramos que ofrezcan un nivel de protección adecuado y medidas contractuales de seguridad.',
                ],
            },
            {
                title: '6. Cuánto tiempo los guardamos',
                body: [
                    'Mientras la cuenta esté activa y, después, hasta 30 días para permitir la exportación, salvo lo que debamos conservar por obligaciones legales o tributarias. Los respaldos se eliminan en sus ciclos normales de rotación.',
                ],
            },
            {
                title: '7. Seguridad',
                body: [
                    'Usamos conexiones cifradas (HTTPS), contraseñas cifradas, separación de los datos de cada crematorio a nivel de base de datos, control de permisos por rol, registros de auditoría y respaldos periódicos. Ningún sistema es infalible: si detectamos una vulneración que afecte tus datos, te avisaremos según lo exija la ley.',
                ],
            },
            {
                title: '8. Tus derechos',
                body: [
                    `Puedes solicitar acceso, rectificación, eliminación, oposición y, cuando corresponda, portabilidad de tus datos, escribiendo a ${contactEmail}. Responderemos dentro de los plazos legales. Si no quedas conforme, puedes recurrir a la autoridad de protección de datos competente.`,
                ],
            },
            {
                title: '9. Cookies',
                body: [
                    'Usamos cookies necesarias para mantener la sesión iniciada y para la protección anti-spam. Más detalle en la Política de Cookies.',
                ],
            },
            {
                title: '10. Cambios y contacto',
                body: [
                    'Podemos actualizar esta Política; publicaremos la nueva versión con su fecha y te avisaremos si el cambio es relevante.',
                    `Consultas de privacidad: ${contactEmail}.`,
                ],
            },
        ],
    };
}

export function cookiesDoc(contactEmail: string): LegalDoc {
    return {
        slug: 'cookies',
        title: 'Política de Cookies',
        description: 'Qué cookies usa Vinzer y para qué.',
        intro: 'Las cookies son pequeños archivos que el navegador guarda al visitar un sitio. Vinzer usa solo las necesarias para funcionar y para protegerse del spam; no usamos cookies de publicidad.',
        sections: [
            {
                title: '1. Cookies que usamos',
                body: [
                    '• Sesión (saasc_token, saasc_refresh, saasc_session): mantienen tu sesión iniciada en el panel de forma segura. Son necesarias y vencen al cerrar sesión o en hasta 7 días.',
                    '• Preferencias (almacenamiento local del navegador): recuerdan opciones como el modo claro u oscuro. No salen de tu dispositivo.',
                    '• Protección anti-spam (Google reCAPTCHA): en los formularios públicos, para distinguir personas de robots. Google puede usar sus propias cookies según su política de privacidad.',
                ],
            },
            {
                title: '2. Cómo controlarlas',
                body: [
                    'Puedes borrar o bloquear las cookies desde la configuración de tu navegador. Si bloqueas las cookies de sesión, no podrás iniciar sesión en el panel.',
                    `Consultas: ${contactEmail}.`,
                ],
            },
        ],
    };
}
