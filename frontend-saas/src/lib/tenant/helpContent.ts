/**
 * Contenido del Centro de Ayuda del tenant (/dashboard/ayuda).
 *
 * Cada paso o pregunta con `href` se oculta si el usuario no puede abrir esa
 * ruta (módulo del rol + característica del plan, ver lib/tenant/moduleRoutes)
 * o si le falta la característica extra `feature`. Al cambiar una función del
 * sistema, actualizar aquí su explicación: la ayuda debe decir lo que la app hace.
 * El contacto de soporte sale de Configuración Global → Datos del SaaS (usePlatformInfo).
 */

export interface HelpLink {
    href?: string;
    linkText?: string;
    /** Característica del plan adicional a la de la ruta (p. ej. una pestaña de Configuración). */
    feature?: string;
    /** Sin enlace: ruta cuyo acceso decide si el contenido aplica al usuario. */
    checkPath?: string;
}

export interface GuideStep extends HelpLink {
    title: string;
    desc: string;
}

export interface Guide {
    id: string;
    title: string;
    badge?: string;
    intro: string;
    steps: GuideStep[];
}

export interface Faq extends HelpLink {
    category: FaqCategory;
    q: string;
    a: string;
}

export const FAQ_CATEGORIES = [
    'Formulario público',
    'Registros y órdenes',
    'Seguimiento y operación',
    'Documentos',
    'IA y créditos',
    'Memoriales',
    'Usuarios y permisos',
    'Catálogo y plan',
] as const;
export type FaqCategory = typeof FAQ_CATEGORIES[number];

export const GUIDES: Guide[] = [
    {
        id: 'formulario',
        title: 'Desde el formulario público',
        badge: 'Recomendado',
        intro: 'La familia completa sus datos desde su celular y tú procesas todo con un par de clics.',
        steps: [
            {
                title: 'Comparte el formulario',
                desc: 'Con el botón de compartir de la barra superior eliges el enlace: Permanente (no vence; ideal para tu web, Instagram o WhatsApp Business), Temporal (vence en 3 días) o Específicos (formularios propios, por ejemplo «Eutanasia»).',
                href: '/dashboard/configuracion?tab=formulario', linkText: 'Configurar formulario', feature: 'configuracion:formulario',
            },
            {
                title: 'Recibe la solicitud',
                desc: 'Cuando la familia envía el formulario te llega un aviso en la campana y aparece en el Dashboard como «solicitud web pendiente».',
                href: '/dashboard', linkText: 'Ir al Dashboard',
            },
            {
                title: 'Procesa el registro',
                desc: 'Abre la solicitud y usa «Procesar registro»: crea lo que falte del cliente, la mascota y la orden (si ya existen, los reutiliza) e incluye el recargo por peso elegido. Luego aparece «Ver orden».',
                checkPath: '/dashboard/registros',
            },
            {
                title: 'Genera los documentos (opcional)',
                desc: '«Generar todo» procesa el registro y además crea los documentos que configuraste en Documentos automáticos: certificado, tarjeta de homenaje e imagen para redes.',
                href: '/dashboard/configuracion?tab=documentos-auto', linkText: 'Documentos automáticos', feature: 'certificados:generar_todo',
            },
            {
                title: 'Avanza las etapas y comparte el seguimiento',
                desc: 'En el Panel de Trabajo inicias la orden y la avanzas por las etapas de tu flujo (puedes adjuntar foto y notas). Comparte el enlace de seguimiento con la familia por WhatsApp.',
                href: '/dashboard/operaciones/lista', linkText: 'Panel de Trabajo',
            },
            {
                title: 'Entrega',
                desc: 'Al finalizar la última etapa la orden queda «Entregado», el estado final del servicio.',
                checkPath: '/dashboard/operaciones',
            },
        ],
    },
    {
        id: 'manual',
        title: 'Registro manual (en mostrador)',
        intro: 'Cuando atiendes a la familia en persona o por teléfono.',
        steps: [
            {
                title: 'Registra al cliente',
                desc: 'Ingresa nombre, teléfono y correo del tutor. Si ya existe, búscalo para no duplicarlo.',
                href: '/dashboard/clientes', linkText: 'Ir a Clientes',
            },
            {
                title: 'Registra la mascota',
                desc: 'Nombre, especie, raza, edad, peso y fotos. Si el cliente aún no existe, puedes crearlo ahí mismo con «Nuevo Cliente Rápido».',
                href: '/dashboard/mascotas', linkText: 'Ir a Mascotas',
            },
            {
                title: 'Crea la orden',
                desc: 'En Recepción y Pedidos eliges el servicio o plan, agregas productos (urnas, huellas, traslados) y el recargo por peso se calcula según tus tramos.',
                href: '/dashboard/recepcion-pedidos', linkText: 'Recepción y Pedidos',
            },
            {
                title: 'Avanza las etapas y comparte el seguimiento',
                desc: 'Desde el Panel de Trabajo, igual que en el flujo con formulario. La familia ve el avance en tiempo real con su enlace.',
                href: '/dashboard/operaciones/lista', linkText: 'Panel de Trabajo',
            },
            {
                title: 'Emite los documentos',
                desc: 'Certificado en PDF, tarjeta de homenaje e imagen para redes con IA. El certificado se puede emitir en cualquier momento y queda en el Repositorio.',
                href: '/dashboard/documentos', linkText: 'Emitir Certificado',
            },
        ],
    },
];

export const FAQS: Faq[] = [
    // --- Formulario público ---
    {
        category: 'Formulario público',
        q: '¿Qué enlaces del formulario puedo compartir?',
        a: 'Desde el botón de compartir de la barra superior: Permanente (no vence, para tu web o redes), Temporal (vence en 3 días, para enviar a una familia puntual) y Específicos (formularios propios con nombre y mensaje distintos, por ejemplo «Eutanasia»).',
        href: '/dashboard/configuracion?tab=formulario', linkText: 'Configurar formulario', feature: 'configuracion:formulario',
    },
    {
        category: 'Formulario público',
        q: '¿Cómo creo un formulario específico (ej. Eutanasia)?',
        a: 'En Configuración → Formulario y Pesos → Enlaces creas el formulario con su nombre, descripción y, si quieres, su propio mensaje de bienvenida. Aparece de inmediato en Compartir → Específicos.',
        href: '/dashboard/configuracion?tab=formulario', linkText: 'Ir a Enlaces', feature: 'configuracion:formulario',
    },
    {
        category: 'Formulario público',
        q: '¿Puedo elegir qué datos pide el formulario?',
        a: 'Sí. En «Pasos y datos» activas las fases (Familia, Ángel, Camino, Recuerdos) y decides qué campos se muestran y cuáles son obligatorios. Siempre se piden el nombre y teléfono del tutor y el nombre y especie de la mascota.',
        href: '/dashboard/configuracion?tab=formulario', linkText: 'Pasos y datos', feature: 'configuracion:formulario',
    },
    {
        category: 'Formulario público',
        q: '¿Cómo funcionan los tramos de peso y el recargo?',
        a: 'Defines hasta 20 tramos «desde – hasta» en kilos con su precio; el último puede quedar abierto. El recargo es el del tramo que cubre el peso de la mascota. Los precios se muestran a la familia solo si activas «mostrar precios». Si una orden no tiene kilos, se mantiene el recargo guardado y puedes editarlo o quitarlo.',
        href: '/dashboard/configuracion?tab=formulario', linkText: 'Pesos y precios', feature: 'configuracion:formulario',
    },
    {
        category: 'Formulario público',
        q: '¿Puedo mostrar un mensaje o un video de bienvenida?',
        a: 'Sí, en «Bienvenida y avisos». El mensaje puede ser general o distinto en cada formulario específico. El botón «Ver video» (hasta 30 segundos, subido o desde Vimeo / Cloudflare Stream) está disponible en los planes PRO y ULTRA.',
        href: '/dashboard/configuracion?tab=formulario', linkText: 'Bienvenida y avisos', feature: 'configuracion:formulario',
    },

    // --- Registros y órdenes ---
    {
        category: 'Registros y órdenes',
        q: 'Llegó una solicitud web, ¿qué hago?',
        a: 'Ábrela desde el aviso de la campana o desde el Dashboard. Revisa los datos y usa «Procesar registro»: crea lo que falte del cliente, la mascota y la orden, reutilizando los que ya existan. Después aparece el botón «Ver orden».',
        href: '/dashboard', linkText: 'Ir al Dashboard',
    },
    {
        category: 'Registros y órdenes',
        q: '¿Qué hace «Generar todo»?',
        a: 'Procesa el registro y luego crea los documentos que elegiste en Configuración → Documentos automáticos: certificado (queda en el Repositorio), tarjeta de homenaje e imagen para redes. Si la plantilla de redes usa IA, gasta 1 crédito y se te avisa antes. Verás el avance paso a paso; no cierres la pestaña mientras termina.',
        href: '/dashboard/configuracion?tab=documentos-auto', linkText: 'Documentos automáticos', feature: 'certificados:generar_todo',
    },
    {
        category: 'Registros y órdenes',
        q: '¿Puedo registrar una mascota si el cliente aún no existe?',
        a: 'Sí. En Mascotas, al crear la ficha puedes registrar al tutor en el momento con «Nuevo Cliente Rápido», sin perder lo que ya escribiste de la mascota.',
        href: '/dashboard/mascotas', linkText: 'Ir a Mascotas',
    },
    {
        category: 'Registros y órdenes',
        q: '¿Cuál es la diferencia entre Recepción y Pedidos y «Crear seguimiento»?',
        a: 'Recepción y Pedidos es el formulario completo de la orden: servicios, productos, cobro y documentos. «Crear seguimiento» es la versión rápida para generar el enlace de seguimiento en terreno. Ambos crean el mismo tipo de orden.',
        href: '/dashboard/recepcion-pedidos', linkText: 'Recepción y Pedidos',
    },
    {
        category: 'Registros y órdenes',
        q: '¿Cómo elimino una orden?',
        a: 'Al eliminar eliges el alcance: solo la orden (devuelve el stock y no toca las fotos de la mascota), la orden y la mascota (si la mascota no tiene otras órdenes) o todo, incluido el cliente (si no tiene otras mascotas). Cada opción requiere el permiso de eliminar correspondiente.',
        href: '/dashboard/recepcion-pedidos', linkText: 'Recepción y Pedidos',
    },

    // --- Seguimiento y operación ---
    {
        category: 'Seguimiento y operación',
        q: '¿Cómo sigue la familia el servicio?',
        a: 'Cada orden tiene un código de 10 caracteres (por ejemplo GJ4U520AHB) y un enlace público. Con él, la familia ve en tiempo real cada etapa del servicio y las fotos o notas que adjuntes, sin crear cuenta. Puedes enviarle el enlace por WhatsApp desde el Panel de Trabajo.',
        href: '/dashboard/operaciones/lista', linkText: 'Panel de Trabajo',
    },
    {
        category: 'Seguimiento y operación',
        q: '¿Cómo avanzo una orden por sus etapas?',
        a: 'En el Panel de Trabajo inicias la orden (pasa a la primera etapa y queda «En proceso»), la avanzas etapa por etapa y la finalizas en la última, con lo que queda «Entregado». Adjuntar foto, notas o firma en cada etapa es opcional.',
        href: '/dashboard/operaciones/lista', linkText: 'Panel de Trabajo',
    },
    {
        category: 'Seguimiento y operación',
        q: '¿Puedo cambiar las etapas del servicio?',
        a: 'Sí. Cada crematorio define sus propias etapas, su orden y nombres en Configuración → Flujo Operativo. Son las que ven tus operadores y la familia en el seguimiento.',
        href: '/dashboard/configuracion?tab=flujo', linkText: 'Flujo Operativo', feature: 'configuracion:flujo',
    },
    {
        category: 'Seguimiento y operación',
        q: '¿Qué significan los estados de una orden?',
        a: 'Pendiente (recibida, sin iniciar) → En proceso (avanzando por las etapas) → Entregado (estado final; cuenta en tus ingresos). También puede quedar Cancelada.',
    },

    // --- Documentos ---
    {
        category: 'Documentos',
        q: '¿Cuándo puedo emitir el certificado de cremación?',
        a: 'En cualquier momento, desde Documentos → Emitir Certificado, o automáticamente con «Generar todo». Se genera en PDF con tu diseño y queda guardado en el Repositorio. La plantilla y sus textos se ajustan en Configuración → Certificados.',
        href: '/dashboard/documentos', linkText: 'Emitir Certificado',
    },
    {
        category: 'Documentos',
        q: '¿Qué es la tarjeta de homenaje?',
        a: 'Una imagen digital con el nombre, la dedicatoria y la foto de la mascota para entregar a la familia. Se diseña en Documentos → Tarjetas de Homenaje y también puede crearse sola con «Generar todo».',
        href: '/dashboard/documentos/disenos', linkText: 'Tarjetas de Homenaje',
    },
    {
        category: 'Documentos',
        q: '¿Dónde encuentro lo que ya generé?',
        a: 'Los certificados quedan en Documentos → Repositorio. Las tarjetas, diseños para redes e ilustraciones con IA están en Diseños para Redes → «Mis diseños generados», y también en la ficha de la orden.',
        href: '/dashboard/documentos/repositorio', linkText: 'Repositorio',
    },

    // --- IA y créditos ---
    {
        category: 'IA y créditos',
        q: '¿Qué es un crédito de IA?',
        a: '1 crédito = 1 diseño para redes (una plantilla para una mascota) con 3 intentos de generación, vigente 7 días. Generar texto e ilustración juntos cuenta como 1 intento. Si la IA falla, el intento se devuelve.',
        href: '/dashboard/documentos/redes', linkText: 'Diseños para Redes',
    },
    {
        category: 'IA y créditos',
        q: '¿Qué pasa cuando uso los 3 intentos?',
        a: 'Puedes seguir generando variaciones: el sistema te pedirá confirmar el uso de 1 crédito adicional, que te da 3 intentos más para ese mismo diseño. Ver o descargar el diseño no gasta créditos.',
        href: '/dashboard/documentos/redes', linkText: 'Diseños para Redes',
    },
    {
        category: 'IA y créditos',
        q: '¿Cuántos créditos tengo y cómo compro más?',
        a: 'Tu plan incluye créditos cada mes, que no se acumulan; los comprados o regalados no vencen, y siempre se usan primero los del mes. El administrador del crematorio compra más en Configuración → Compra de créditos: packs de 1, 5 o 10 con el precio de tu plan en CLP y USD. Se suman al saldo cuando Vinzer confirma el pago.',
        href: '/dashboard/configuracion?tab=creditos', linkText: 'Compra de créditos', feature: 'configuracion:creditos_ia',
    },
    {
        category: 'IA y créditos',
        q: '¿Puedo mover, achicar u ocultar elementos de una plantilla?',
        a: 'Sí, solo para tu diseño: activa «Ajustar elementos» bajo la imagen, toca un elemento para moverlo o cambiar su tamaño, u ocúltalo con el ojo. La plantilla original no cambia y el diseño guardado conserva tus ajustes.',
        href: '/dashboard/documentos/redes', linkText: 'Diseños para Redes',
    },

    // --- Memoriales ---
    {
        category: 'Memoriales',
        q: '¿Cómo creo un memorial para una mascota?',
        a: 'Desde la ficha de la mascota en Mascotas. Obtienes el enlace público del memorial y un PIN de Gestión Familiar: entrégale ambos a la familia para que agregue fotos y administre el memorial.',
        href: '/dashboard/mascotas', linkText: 'Ir a Mascotas',
    },
    {
        category: 'Memoriales',
        q: '¿Quién aprueba las dedicatorias del memorial?',
        a: 'La familia, desde la página de gestión del memorial con su PIN. Las dedicatorias que dejan otras personas quedan pendientes y solo se publican cuando la familia las aprueba.',
        checkPath: '/dashboard/mascotas',
    },

    // --- Usuarios y permisos ---
    {
        category: 'Usuarios y permisos',
        q: '¿Quién decide a qué módulos accede cada rol?',
        a: 'El acceso de cada rol (Administrador, Operador, Recepción…) lo define Vinzer y en Roles y Módulos lo ves en modo lectura. Lo que sí ajustas tú es cada usuario de tu equipo.',
        href: '/dashboard/roles-modulos', linkText: 'Roles y Módulos',
    },
    {
        category: 'Usuarios y permisos',
        q: '¿Cómo limito lo que puede hacer un usuario?',
        a: 'En Roles y Módulos → tu equipo → «Editar Permisos»: por cada módulo activas o desactivas Ver, Crear, Editar y Eliminar, o apagas el módulo completo para esa persona. Nunca puede superar lo que incluye tu plan.',
        href: '/dashboard/roles-modulos', linkText: 'Roles y Módulos',
    },

    // --- Catálogo y plan ---
    {
        category: 'Catálogo y plan',
        q: '¿Cómo comparto mi catálogo de servicios?',
        a: 'En Catálogo de Servicios usa el botón de compartir para generar el enlace del catálogo online o de planes y enviarlo a la familia.',
        href: '/dashboard/gestion-servicios', linkText: 'Catálogo de Servicios',
    },
    {
        category: 'Catálogo y plan',
        q: '¿Por qué veo «no incluida en tu plan»?',
        a: 'Esa función no forma parte de tu plan actual. En Configuración → Facturación ves tu plan, lo que incluye cada uno y cómo cambiarte.',
        href: '/dashboard/configuracion?tab=facturacion', linkText: 'Facturación',
    },
];
