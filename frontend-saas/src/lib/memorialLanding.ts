// Contenido de la landing del memorial (memorial.vinzer.cl), ES / EN.
// Los planes (precio y límites) vienen de la base: lib/memorialPlans.ts
// (Admin → Memoriales → «Planes y precios»).

import type { Locale } from './translations';

export const MEMORIAL_WHATSAPP = '56930245084';

export const whatsappLink = (text: string) =>
    `https://wa.me/${MEMORIAL_WHATSAPP}?text=${encodeURIComponent(text)}`;

export const LANDING_SECTIONS = ['experiencia', 'galeria', 'crematorios', 'planes', 'faq'] as const;
export type LandingSection = typeof LANDING_SECTIONS[number];

interface LandingContent {
    nav: Record<LandingSection, string>;
    nav_cta: string;
    nav_login: string;
    hero: { badge: string; title: string; highlight: string; subtitle: string; primary: string; secondary: string };
    experience: {
        label: string; title: string;
        candles_title: string; candles_desc: string;
        ritual_title: string; ritual_desc: string;
        caption: string;
    };
    gallery: {
        label: string; title: string; subtitle: string;
        years: (n: number) => string; served_by: string; view_all: string; empty: string;
    };
    network: {
        label: string; title: string; subtitle: string; badge: string;
        points: { title: string; desc: string }[];
        memorials: (n: number) => string; empty: string;
    };
    steps: { label: string; title: string; items: { title: string; desc: string }[] };
    plans: {
        label: string; title: string; subtitle: string;
        usd: string; compare_title: string; feature: string;
        footnote: string;
        help: string;
    };
    faq: { label: string; title: string; items: { q: string; a: string }[]; contact: string };
    footer: { tagline: string; rights: string; contact: string; site: string };
    whatsapp_general: string;
}

const es: LandingContent = {
    nav: { experiencia: 'Experiencia', galeria: 'Homenajes', crematorios: 'Crematorios', planes: 'Planes', faq: 'Preguntas' },
    nav_cta: 'Crear memorial',
    nav_login: 'Acceder',
    hero: {
        badge: 'Vinzer Memorial · Santuario digital',
        title: 'Un lugar sagrado para recordar a quien ',
        highlight: 'nunca te olvidará',
        subtitle: 'Preserva el legado y el amor de tu mascota en un santuario digital con velas, historias y dedicatorias de quienes la quisieron.',
        primary: 'Ver planes de homenaje',
        secondary: 'Conocer el altar',
    },
    experience: {
        label: 'La experiencia del altar',
        title: 'Un espacio para acompañar el duelo',
        candles_title: 'Velas virtuales',
        candles_desc: 'Familiares y amigos encienden una vela desde cualquier lugar del mundo: un gesto simple de intención y cariño.',
        ritual_title: 'Ritual de luz',
        ritual_desc: 'Dedicatorias y mensajes que la familia aprueba antes de publicarse, para que el altar sea siempre un lugar de paz.',
        caption: 'Cada altar se personaliza con su fondo, partículas y tipografía.',
    },
    gallery: {
        label: 'Últimos homenajes',
        title: 'Recuerdos que siguen brillando',
        subtitle: 'Memoriales públicos creados junto a los crematorios de nuestra red.',
        years: (n) => `${n} ${n === 1 ? 'año' : 'años'} de amor compartido`,
        served_by: 'Despedida en',
        view_all: 'Ver todos los recuerdos',
        empty: 'Pronto verás aquí los primeros homenajes.',
    },
    network: {
        label: 'Red de crematorios',
        title: 'Parte de un ecosistema de crematorios reales',
        subtitle: 'El memorial no es una web aislada: nace del mismo sistema con el que los crematorios gestionan y registran cada servicio.',
        badge: 'Trazabilidad verificable',
        points: [
            { title: 'Servicio registrado', desc: 'Cada memorial está vinculado a la orden de cremación del crematorio que acompañó a la familia.' },
            { title: 'Acceso seguro', desc: 'La familia recibe un enlace de gestión y un PIN de 6 dígitos para editar su memorial.' },
            { title: 'Seguimiento en línea', desc: 'Los crematorios de la red ofrecen seguimiento público de cada etapa del servicio.' },
        ],
        memorials: (n) => `${n} ${n === 1 ? 'memorial' : 'memoriales'}`,
        empty: 'Los crematorios que usan Vinzer aparecerán aquí a medida que publiquen sus memoriales.',
    },
    steps: {
        label: 'Cómo funciona',
        title: 'Su memorial en tres pasos',
        items: [
            { title: 'Elige tu plan', desc: 'Recuerdo, Eterno o Infinito. Te acompañamos por WhatsApp en todo el proceso.' },
            { title: 'Sube fotos y recuerdos', desc: 'Sus fotos favoritas, las fechas importantes y unas palabras desde el corazón.' },
            { title: 'Enciende su luz', desc: 'Comparte el enlace con familia y amigos para recibir velas y dedicatorias.' },
        ],
    },
    plans: {
        label: 'Planes de homenaje',
        title: 'Elige cómo preservar su recuerdo',
        subtitle: 'Precios en dólares estadounidenses (USD). Sin costos ocultos.',
        usd: 'USD',
        compare_title: 'Compara los planes',
        feature: 'Característica',
        footnote: 'Al elegir un plan te escribimos por WhatsApp para coordinar el pago y activar el memorial.',
        help: '¿Tienes dudas? Conversemos por WhatsApp',
    },
    faq: {
        label: 'Preguntas frecuentes',
        title: 'Estamos para acompañarte',
        items: [
            { q: '¿Cómo edito las fotos de mi mascota?', a: 'Con el enlace de gestión de tu memorial y tu PIN de 6 dígitos. Desde ahí cambias fotos, textos y el diseño del altar cuando quieras.' },
            { q: '¿Algún plan nunca vence?', a: 'Sí, el plan Infinito: es un pago único y el memorial queda activo sin fecha de vencimiento ni renovaciones. Recuerdo y Eterno son anuales y se renuevan al mismo precio que contrataste.' },
            { q: '¿Mis familiares pueden encender velas desde el teléfono?', a: 'Sí. Basta con compartirles el enlace del memorial; funciona en cualquier celular. Las dedicatorias se publican cuando la familia las aprueba.' },
            { q: '¿Mi crematorio me da el acceso o lo contrato yo?', a: 'Muchos crematorios de la red lo incluyen en su servicio y te entregan el acceso. Si el tuyo no lo hace, puedes contratarlo directamente por WhatsApp.' },
            { q: 'Mi crematorio me regaló el memorial, ¿puedo mejorarlo?', a: 'Sí. Desde la gestión de tu memorial eliges Recuerdo, Eterno o Infinito y sumas más fotos, mensajes, línea de tiempo, video y su voz. Conservas todo lo que ya tenía y el mismo enlace.' },
            { q: '¿Qué pasa si no renuevo?', a: 'Te avisamos por correo un mes antes. Si vence, el memorial no desaparece: sigue en línea mostrando algunas fotos y mensajes, y al renovarlo vuelve todo.' },
            { q: '¿Cómo se paga?', a: 'Los precios están en dólares (USD). Al elegir un plan coordinamos contigo el medio de pago por WhatsApp y activamos el memorial.' },
        ],
        contact: 'Escríbenos por WhatsApp',
    },
    footer: {
        tagline: 'El valor de una despedida digna',
        rights: 'Todos los derechos reservados.',
        contact: 'WhatsApp',
        site: 'Vinzer para crematorios',
    },
    whatsapp_general: 'Hola, quisiera información sobre los memoriales de Vinzer.',
};

const en: LandingContent = {
    nav: { experiencia: 'Experience', galeria: 'Tributes', crematorios: 'Crematories', planes: 'Plans', faq: 'FAQ' },
    nav_cta: 'Create memorial',
    nav_login: 'Log in',
    hero: {
        badge: 'Vinzer Memorial · Digital sanctuary',
        title: 'A sacred place to remember the one who ',
        highlight: 'will never forget you',
        subtitle: 'Preserve your pet\'s legacy and love in a digital sanctuary with candles, stories and messages from everyone who loved them.',
        primary: 'See tribute plans',
        secondary: 'Discover the altar',
    },
    experience: {
        label: 'The altar experience',
        title: 'A space to walk through grief',
        candles_title: 'Virtual candles',
        candles_desc: 'Family and friends light a candle from anywhere in the world: a simple gesture of love and intention.',
        ritual_title: 'Ritual of light',
        ritual_desc: 'Messages and dedications the family approves before they are published, so the altar is always a place of peace.',
        caption: 'Every altar can be customized with its own background, particles and typography.',
    },
    gallery: {
        label: 'Latest tributes',
        title: 'Memories that keep shining',
        subtitle: 'Public memorials created together with the crematories in our network.',
        years: (n) => `${n} ${n === 1 ? 'year' : 'years'} of shared love`,
        served_by: 'Farewell at',
        view_all: 'View all memories',
        empty: 'The first tributes will appear here soon.',
    },
    network: {
        label: 'Crematory network',
        title: 'Part of an ecosystem of real crematories',
        subtitle: 'The memorial is not an isolated website: it comes from the same system crematories use to manage and record every service.',
        badge: 'Verifiable traceability',
        points: [
            { title: 'Registered service', desc: 'Each memorial is linked to the cremation order of the crematory that cared for the family.' },
            { title: 'Secure access', desc: 'The family receives a management link and a 6-digit PIN to edit their memorial.' },
            { title: 'Online tracking', desc: 'Crematories in the network offer public tracking of every stage of the service.' },
        ],
        memorials: (n) => `${n} ${n === 1 ? 'memorial' : 'memorials'}`,
        empty: 'Crematories using Vinzer will appear here as they publish their memorials.',
    },
    steps: {
        label: 'How it works',
        title: 'Their memorial in three steps',
        items: [
            { title: 'Choose your plan', desc: 'Recuerdo, Eterno or Infinito. We guide you through WhatsApp every step of the way.' },
            { title: 'Upload photos and memories', desc: 'Their favorite photos, important dates and a few words from the heart.' },
            { title: 'Light their candle', desc: 'Share the link with family and friends to receive candles and dedications.' },
        ],
    },
    plans: {
        label: 'Tribute plans',
        title: 'Choose how to preserve their memory',
        subtitle: 'Prices in US dollars (USD). No hidden costs.',
        usd: 'USD',
        compare_title: 'Compare plans',
        feature: 'Feature',
        footnote: 'When you choose a plan we contact you on WhatsApp to arrange payment and activate the memorial.',
        help: 'Questions? Let\'s talk on WhatsApp',
    },
    faq: {
        label: 'Frequently asked questions',
        title: 'We are here to help',
        items: [
            { q: 'How do I edit my pet\'s photos?', a: 'With your memorial\'s management link and your 6-digit PIN. From there you can change photos, texts and the altar design anytime.' },
            { q: 'Does any plan never expire?', a: 'Yes, the Infinito plan: it is a one-time payment and the memorial stays active with no expiration date or renewals. Recuerdo and Eterno are yearly and renew at the price you signed up for.' },
            { q: 'Can my family light candles from their phones?', a: 'Yes. Just share the memorial link with them; it works on any phone. Dedications are published once the family approves them.' },
            { q: 'Does my crematory give me access, or do I buy it myself?', a: 'Many crematories in the network include it in their service and give you access. If yours doesn\'t, you can get it directly through WhatsApp.' },
            { q: 'My crematory gave me the memorial. Can I upgrade it?', a: 'Yes. From your memorial management page choose Recuerdo, Eterno or Infinito to add more photos, messages, a timeline, video and their voice. You keep everything and the same link.' },
            { q: 'What happens if I do not renew?', a: 'We email you a month before. If it expires, the memorial does not disappear: it stays online showing some photos and messages, and renewing brings everything back.' },
            { q: 'How do I pay?', a: 'Prices are in US dollars (USD). When you choose a plan we arrange the payment method with you on WhatsApp and activate the memorial.' },
        ],
        contact: 'Message us on WhatsApp',
    },
    footer: {
        tagline: 'The value of a dignified farewell',
        rights: 'All rights reserved.',
        contact: 'WhatsApp',
        site: 'Vinzer for crematories',
    },
    whatsapp_general: 'Hi, I would like information about Vinzer memorials.',
};

export function getLandingContent(locale: Locale): LandingContent {
    return locale === 'en' ? en : es;
}
