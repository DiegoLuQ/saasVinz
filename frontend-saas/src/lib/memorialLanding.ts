// Contenido de la landing del memorial (memorial.vinzer.cl), ES / EN.
// Los planes en USD se venden de forma asistida por WhatsApp; el SuperAdmin
// los asigna al memorial (rec_plans: mensual, anual, eterno — migración
// e3b5d7f9a124), que es donde se aplican los límites de fotos y dedicatorias.
// La gestión familiar del memorial (MemorialPlanUpgrade) usa estos mismos planes.

import type { Locale } from './translations';

export const MEMORIAL_WHATSAPP = '56930245084';

export const whatsappLink = (text: string) =>
    `https://wa.me/${MEMORIAL_WHATSAPP}?text=${encodeURIComponent(text)}`;

export const LANDING_SECTIONS = ['experiencia', 'galeria', 'crematorios', 'planes', 'faq'] as const;
export type LandingSection = typeof LANDING_SECTIONS[number];

export type PlanId = 'mensual' | 'anual' | 'eterno';

export interface LandingPlan {
    id: PlanId;
    name: string;
    price: number;
    period: string;
    note: string;
    tag?: string;
    highlight?: boolean;
    cta: string;
    whatsapp: string;
}

/** Valor de una fila de la comparación: texto o incluido (true). */
export type CompareValue = string | true;

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
        list: LandingPlan[];
        rows: { label: string; values: [CompareValue, CompareValue, CompareValue] }[];
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
            { title: 'Elige tu plan', desc: 'Mensual, Anual o Eterno. Te acompañamos por WhatsApp en todo el proceso.' },
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
        list: [
            { id: 'mensual', name: 'Mensual', price: 10, period: '/ mes', note: 'Renovación mensual', cta: 'Elegir Mensual',
              whatsapp: 'Hola, quiero crear un memorial con el Plan Mensual (10 USD/mes).' },
            { id: 'anual', name: 'Anual', price: 70, period: '/ año', note: 'Ahorras 42% frente al mensual', tag: 'Ahorro', cta: 'Elegir Anual',
              whatsapp: 'Hola, quiero crear un memorial con el Plan Anual (70 USD/año).' },
            { id: 'eterno', name: 'Eterno', price: 110, period: 'pago único', note: 'Sin suscripción, para siempre', tag: 'Recomendado', highlight: true, cta: 'Elegir Eterno',
              whatsapp: 'Hola, quiero crear un memorial con el Plan Eterno (110 USD, pago único).' },
        ],
        rows: [
            { label: 'Facturación', values: ['Mensual', 'Anual', 'Pago único'] },
            { label: 'Fotos del recuerdo', values: ['Hasta 3', 'Hasta 10', 'Hasta 25'] },
            { label: 'Velas y dedicatorias', values: ['Hasta 10', 'Hasta 35', 'Ilimitadas'] },
            { label: 'Altar personalizable (fondo, partículas, tipografía)', values: [true, true, true] },
            { label: 'Memorial privado con PIN', values: [true, true, true] },
            { label: 'Aprobación de dedicatorias por la familia', values: [true, true, true] },
            { label: 'Permanencia del altar', values: ['Mientras el plan esté activo', '12 meses, renovable', 'Para siempre'] },
        ],
        footnote: 'Al elegir un plan te escribimos por WhatsApp para coordinar el pago y activar el memorial.',
        help: '¿Tienes dudas? Conversemos por WhatsApp',
    },
    faq: {
        label: 'Preguntas frecuentes',
        title: 'Estamos para acompañarte',
        items: [
            { q: '¿Cómo edito las fotos de mi mascota?', a: 'Con el enlace de gestión de tu memorial y tu PIN de 6 dígitos. Desde ahí cambias fotos, textos y el diseño del altar cuando quieras.' },
            { q: '¿El plan Eterno realmente nunca vence?', a: 'Sí. Es un pago único: el memorial queda activo sin fecha de vencimiento ni renovaciones.' },
            { q: '¿Mis familiares pueden encender velas desde el teléfono?', a: 'Sí. Basta con compartirles el enlace del memorial; funciona en cualquier celular. Las dedicatorias se publican cuando la familia las aprueba.' },
            { q: '¿Mi crematorio me da el acceso o lo contrato yo?', a: 'Muchos crematorios de la red lo incluyen en su servicio y te entregan el acceso. Si el tuyo no lo hace, puedes contratarlo directamente por WhatsApp.' },
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
            { title: 'Choose your plan', desc: 'Monthly, Yearly or Eternal. We guide you through WhatsApp every step of the way.' },
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
        list: [
            { id: 'mensual', name: 'Monthly', price: 10, period: '/ month', note: 'Renews monthly', cta: 'Choose Monthly',
              whatsapp: 'Hi, I would like to create a memorial with the Monthly Plan (10 USD/month).' },
            { id: 'anual', name: 'Yearly', price: 70, period: '/ year', note: 'Save 42% vs. monthly', tag: 'Best value', cta: 'Choose Yearly',
              whatsapp: 'Hi, I would like to create a memorial with the Yearly Plan (70 USD/year).' },
            { id: 'eterno', name: 'Eternal', price: 110, period: 'one-time', note: 'No subscription, forever', tag: 'Recommended', highlight: true, cta: 'Choose Eternal',
              whatsapp: 'Hi, I would like to create a memorial with the Eternal Plan (110 USD, one-time payment).' },
        ],
        rows: [
            { label: 'Billing', values: ['Monthly', 'Yearly', 'One-time'] },
            { label: 'Memory photos', values: ['Up to 3', 'Up to 10', 'Up to 25'] },
            { label: 'Candles & dedications', values: ['Up to 10', 'Up to 35', 'Unlimited'] },
            { label: 'Customizable altar (background, particles, typography)', values: [true, true, true] },
            { label: 'Private memorial with PIN', values: [true, true, true] },
            { label: 'Family approval of dedications', values: [true, true, true] },
            { label: 'Altar availability', values: ['While the plan is active', '12 months, renewable', 'Forever'] },
        ],
        footnote: 'When you choose a plan we contact you on WhatsApp to arrange payment and activate the memorial.',
        help: 'Questions? Let\'s talk on WhatsApp',
    },
    faq: {
        label: 'Frequently asked questions',
        title: 'We are here to help',
        items: [
            { q: 'How do I edit my pet\'s photos?', a: 'With your memorial\'s management link and your 6-digit PIN. From there you can change photos, texts and the altar design anytime.' },
            { q: 'Does the Eternal plan really never expire?', a: 'Yes. It is a one-time payment: the memorial stays active with no expiration date or renewals.' },
            { q: 'Can my family light candles from their phones?', a: 'Yes. Just share the memorial link with them; it works on any phone. Dedications are published once the family approves them.' },
            { q: 'Does my crematory give me access, or do I buy it myself?', a: 'Many crematories in the network include it in their service and give you access. If yours doesn\'t, you can get it directly through WhatsApp.' },
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
