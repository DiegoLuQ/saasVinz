// Contenido de la landing del memorial (memorial.vinzer.cl), ES / EN.
// Los planes (precio y límites) vienen de la base: lib/memorialPlans.ts
// (Admin → Memoriales → «Planes y precios»).

import type { Locale } from './translations';
import type { MemorialScenarioId } from './memorialDesign';

export const MEMORIAL_WHATSAPP = '56930245084';

export const whatsappLink = (text: string) =>
    `https://wa.me/${MEMORIAL_WHATSAPP}?text=${encodeURIComponent(text)}`;

export const LANDING_SECTIONS = ['experiencia', 'galeria', 'crematorios', 'planes', 'faq'] as const;
export type LandingSection = typeof LANDING_SECTIONS[number];

export interface ScenarioLocalized {
    levelLabel: string;
    name: string;
    subtitle: string;
    description: string;
}

interface LandingContent {
    nav: Record<LandingSection, string>;
    nav_cta: string;
    nav_login: string;
    hero: {
        badge: string;
        title: string;
        highlight: string;
        subtitle: string;
        primary: string;
        secondary: string;
        cta_scenarios: string;
        cta_gallery: string;
    };
    hero_card: {
        preview_badge: string;
        scenario_tag: string;
        years_line: string;
        quote: string;
        candle_lit: string;
        candle_off: string;
        candles_count: (n: number) => string;
    };
    scenarios: {
        label: string;
        title: string;
        subtitle: string;
        included: string;
        included_all: string;
        from_plan: (name: string) => string;
        perks: {
            candle: string;
            download: string;
            pin: string;
            dedications: string;
        };
        items: Record<MemorialScenarioId, ScenarioLocalized>;
    };
    rituals: {
        label: string;
        title: string;
        subtitle: string;
        items: { title: string; desc: string; badge: string }[];
    };
    experience: {
        label: string; title: string;
        candles_title: string; candles_desc: string;
        ritual_title: string; ritual_desc: string;
        caption: string;
    };
    gallery: {
        label: string; title: string; subtitle: string;
        badge: string;
        years_short: (n: number) => string;
        years: (n: number) => string; served_by: string; view_all: string; empty: string;
    };
    network: {
        label: string; title: string; subtitle: string; badge: string;
        points: { title: string; desc: string }[];
        memorials: (n: number) => string; empty: string;
    };
    steps: { label: string; title: string; subtitle: string; items: { title: string; desc: string }[] };
    plans: {
        label: string; title: string; subtitle: string;
        usd: string; compare_title: string; feature: string;
        footnote: string;
        help: string;
    };
    faq: { label: string; title: string; subtitle: string; items: { q: string; a: string }[]; contact: string };
    footer: { tagline: string; rights: string; contact: string; site: string };
    whatsapp_general: string;
}

const es: LandingContent = {
    nav: { experiencia: 'Experiencia', galeria: 'Homenajes', crematorios: 'Crematorios', planes: 'Planes', faq: 'Preguntas' },
    nav_cta: 'Crear memorial',
    nav_login: 'Acceder',
    hero: {
        badge: 'Santuario Digital Conmemorativo · Red Vinzer',
        title: 'Un espacio sagrado donde su amor ',
        highlight: 'vive por siempre',
        subtitle: 'Preserva el recuerdo eterno de tu angelito con velas perpetuas, retratos ceremoniales, estrellas en el firmamento y palabras de consuelo que trascienden el tiempo.',
        primary: 'Ver planes de homenaje',
        secondary: 'Conocer el altar',
        cta_scenarios: 'Explorar los 4 Escenarios',
        cta_gallery: 'Homenajes en Vivo',
    },
    hero_card: {
        preview_badge: 'Vista Previa Oficial',
        scenario_tag: 'Escenario: Altar de Luz',
        years_line: '2018 — 2026 · 8 años de amor incondicional',
        quote: '“Gracias por cada momento, cada alegría y por ser nuestro fiel guardián. Tu recuerdo brillará por siempre.”',
        candle_lit: 'Luz Perpetua Encendida',
        candle_off: 'Clic para Encender Vela',
        candles_count: (n) => `🕯️ ${n} velas encendidas por visitantes`,
    },
    scenarios: {
        label: 'Escenarios oficiales',
        title: 'Cuatro Maneras Únicas de Honrar su Memoria',
        subtitle: 'Cada memorial es un santuario personalizado según el plan del crematorio o la elección de la familia.',
        included: 'Incluido',
        included_all: 'Incluido en todos los planes',
        from_plan: (name) => `Desde el plan ${name}`,
        perks: {
            candle: 'Vela perpetua interactiva',
            download: 'Descarga de retrato oficial',
            pin: 'Moderación familiar con PIN',
            dedications: 'Entre 20 y 250 dedicatorias de amor',
        },
        items: {
            normal: {
                levelLabel: 'Escenario Básico',
                name: 'Santuario Sereno',
                subtitle: 'Clásico, cálido y solemne',
                description: 'Portada conmemorativa con retrato enmarcado, encendido de vela de homenaje, dedicatoria principal, descarga de tarjeta y muro de entre 20 y 250 dedicatorias según el plan.',
            },
            altar: {
                levelLabel: 'Escenario Normal',
                name: 'Altar de Luz',
                subtitle: 'Ceremonial con candelabros y tributos',
                description: 'Altar solemne iluminado por velas perpetuas a ambos lados del retrato de portada, ofrendas interactivas, dedicatoria destacada y descarga de recuerdo.',
            },
            cielo: {
                levelLabel: 'Escenario Pro',
                name: 'Jardín Celestial',
                subtitle: 'Atmósfera luminosa entre nubes y paz',
                description: 'Entorno celestial con halo de luz sobre la portada, encendido de vela sagrada, envío de besos al cielo, dedicatoria conmemorativa y descarga de imagen.',
            },
            constelacion: {
                levelLabel: 'Escenario Ultra',
                name: 'Constelación Eterna',
                subtitle: 'Bóveda estelar interactiva de máximo homenaje',
                description: 'Planetario nocturno con líneas de constelación doradas, encendido de vela eterna y estrella personal, portada estelar, dedicatoria y descarga de recuerdo.',
            },
        },
    },
    rituals: {
        label: 'Gestos de consuelo',
        title: 'Cuatro Maneras de Acompañar a la Familia',
        subtitle: 'Amigos y familiares pueden rendir homenaje en cualquier momento desde cualquier lugar del mundo.',
        items: [
            { title: 'Luz Perpetua', desc: 'Enciende una vela en el altar. Su llama permanece viva como símbolo de amor eterno.', badge: 'Vela de consuelo' },
            { title: 'Flores & Pétalos', desc: 'Ofrenda flores virtuales al retrato ceremonial para honrar su paso por nuestras vidas.', badge: 'Tributo floral' },
            { title: 'Estrellas Celestiales', desc: 'Enciende un astro en el firmamento con tu nombre y deseos de paz para la familia.', badge: 'Cosmos eterno' },
            { title: 'Destellos de Amor', desc: 'Envía abrazos y besos virtuales que se suman al contador visible de cariño familiar.', badge: 'Gesto de cariño' },
        ],
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
        label: 'Memoriales en vivo',
        title: 'Recuerdos que Siguen Brillando',
        subtitle: 'Homenajes públicos creados junto a los crematorios autorizados de nuestra red.',
        badge: '🕯️ Homenaje',
        years_short: (n) => `${n} ${n === 1 ? 'año' : 'años'} de amor`,
        years: (n) => `${n} ${n === 1 ? 'año' : 'años'} de amor compartido`,
        served_by: 'Despedida en',
        view_all: 'Ver todos los recuerdos',
        empty: 'Pronto verás aquí los primeros homenajes públicos.',
    },
    network: {
        label: 'Red oficial de crematorios',
        title: 'Garantía de Respeto, Solemne Custodia y Veracidad',
        subtitle: 'Cada homenaje proviene de crematorios verificados que entregan el código de acceso oficial a las familias.',
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
        label: 'Proceso sencillo',
        title: 'Cómo Crear o Activar tu Santuario',
        subtitle: 'Tres simples pasos para inmortalizar el amor de tu compañero eterno.',
        items: [
            { title: 'Elige tu plan', desc: 'Recuerdo, Homenaje o Infinito. Te acompañamos por WhatsApp en todo el proceso.' },
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
        label: 'Resolvemos tus dudas',
        title: 'Preguntas Frecuentes',
        subtitle: 'Todo lo que necesitas saber sobre el funcionamiento de los memoriales digitales.',
        items: [
            { q: '¿Cómo edito las fotos de mi mascota?', a: 'Con el enlace de gestión de tu memorial y tu PIN de 6 dígitos. Desde ahí cambias fotos, textos y el diseño del altar cuando quieras.' },
            { q: '¿Algún plan nunca vence?', a: 'Sí, el plan Infinito: es un pago único y el memorial queda activo sin fecha de vencimiento ni renovaciones. Recuerdo y Homenaje son anuales y se renuevan al mismo precio que contrataste.' },
            { q: '¿Mis familiares pueden encender velas desde el teléfono?', a: 'Sí. Basta con compartirles el enlace del memorial; funciona en cualquier celular. Las dedicatorias se publican cuando la familia las aprueba.' },
            { q: '¿Mi crematorio me da el acceso o lo contrato yo?', a: 'Muchos crematorios de la red lo incluyen en su servicio y te entregan el acceso. Si el tuyo no lo hace, puedes contratarlo directamente por WhatsApp.' },
            { q: 'Mi crematorio me regaló el memorial, ¿puedo mejorarlo?', a: 'Sí. Desde la gestión de tu memorial eliges Recuerdo, Homenaje o Infinito y sumas más fotos, mensajes, línea de tiempo, video y su voz. Conservas todo lo que ya tenía y el mismo enlace.' },
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
        badge: 'Digital Memorial Sanctuary · Vinzer Network',
        title: 'A sacred place where their love ',
        highlight: 'lives forever',
        subtitle: 'Preserve the eternal memory of your little angel with perpetual candles, ceremonial portraits, stars in the sky and comforting words that transcend time.',
        primary: 'See tribute plans',
        secondary: 'Discover the altar',
        cta_scenarios: 'Explore the 4 Scenarios',
        cta_gallery: 'Live Tributes',
    },
    hero_card: {
        preview_badge: 'Official Preview',
        scenario_tag: 'Scenario: Altar of Light',
        years_line: '2018 — 2026 · 8 years of unconditional love',
        quote: '“Thank you for every moment, every joy, and for being our faithful guardian. Your memory will shine forever.”',
        candle_lit: 'Perpetual Light Lit',
        candle_off: 'Click to Light Candle',
        candles_count: (n) => `🕯️ ${n} candles lit by visitors`,
    },
    scenarios: {
        label: 'Official scenarios',
        title: 'Four Unique Ways to Honor Their Memory',
        subtitle: 'Every memorial is a personalized sanctuary tailored to the crematory plan or the family\'s choice.',
        included: 'Included',
        included_all: 'Included in all plans',
        from_plan: (name) => `From ${name} plan`,
        perks: {
            candle: 'Interactive perpetual candle',
            download: 'Official portrait download',
            pin: 'Family PIN moderation',
            dedications: 'Between 20 and 250 love dedications',
        },
        items: {
            normal: {
                levelLabel: 'Basic Scenario',
                name: 'Serene Sanctuary',
                subtitle: 'Classic, warm and solemn',
                description: 'Commemorative cover with framed portrait, tribute candle lighting, main dedication, keepsake card download and a tribute wall for 20 to 250 dedications depending on the plan.',
            },
            altar: {
                levelLabel: 'Standard Scenario',
                name: 'Altar of Light',
                subtitle: 'Ceremonial with candelabras and offerings',
                description: 'Solemn altar illuminated by perpetual candles flanking the cover portrait, interactive offerings, featured dedication and keepsake download.',
            },
            cielo: {
                levelLabel: 'Pro Scenario',
                name: 'Celestial Garden',
                subtitle: 'Luminous atmosphere among clouds and peace',
                description: 'Heavenly setting with a halo of light over the portrait, sacred candle lighting, kisses to the sky, commemorative dedication and keepsake download.',
            },
            constelacion: {
                levelLabel: 'Ultra Scenario',
                name: 'Eternal Constellation',
                subtitle: 'Interactive star vault for the highest tribute',
                description: 'Night sky planetarium with golden constellation lines, eternal candle lighting and a personal star, cosmic cover, dedication and keepsake download.',
            },
        },
    },
    rituals: {
        label: 'Gestures of comfort',
        title: 'Four Ways to Support the Family',
        subtitle: 'Friends and family can pay tribute at any time from anywhere in the world.',
        items: [
            { title: 'Perpetual Light', desc: 'Light a candle at the altar. Its flame remains alive as a symbol of eternal love.', badge: 'Comfort candle' },
            { title: 'Flowers & Petals', desc: 'Offer virtual flowers to the ceremonial portrait to honor their journey in your life.', badge: 'Floral tribute' },
            { title: 'Celestial Stars', desc: 'Light a star in the night sky with your name and wishes of peace for the family.', badge: 'Eternal cosmos' },
            { title: 'Sparks of Love', desc: 'Send virtual hugs and kisses that add to the family\'s visible love counter.', badge: 'Gesture of love' },
        ],
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
        label: 'Live tributes',
        title: 'Memories That Keep Shining',
        subtitle: 'Public memorials created together with the authorized crematories in our network.',
        badge: '🕯️ Tribute',
        years_short: (n) => `${n} ${n === 1 ? 'year' : 'years'} of love`,
        years: (n) => `${n} ${n === 1 ? 'year' : 'years'} of shared love`,
        served_by: 'Farewell at',
        view_all: 'View all memories',
        empty: 'The first public tributes will appear here soon.',
    },
    network: {
        label: 'Official crematory network',
        title: 'Guaranteed Respect, Solemn Care and Authenticity',
        subtitle: 'Every tribute comes from verified crematories that provide the official access code to families.',
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
        label: 'Simple process',
        title: 'How to Create or Activate Your Sanctuary',
        subtitle: 'Three simple steps to immortalize the love of your eternal companion.',
        items: [
            { title: 'Choose your plan', desc: 'Recuerdo, Homenaje or Infinito. We guide you through WhatsApp every step of the way.' },
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
        label: 'Answering your questions',
        title: 'Frequently Asked Questions',
        subtitle: 'Everything you need to know about how digital memorials work.',
        items: [
            { q: 'How do I edit my pet\'s photos?', a: 'With your memorial\'s management link and your 6-digit PIN. From there you can change photos, texts and the altar design anytime.' },
            { q: 'Does any plan never expire?', a: 'Yes, the Infinito plan: it is a one-time payment and the memorial stays active with no expiration date or renewals. Recuerdo and Homenaje are yearly and renew at the price you signed up for.' },
            { q: 'Can my family light candles from their phones?', a: 'Yes. Just share the memorial link with them; it works on any phone. Dedications are published once the family approves them.' },
            { q: 'Does my crematory give me access, or do I buy it myself?', a: 'Many crematories in the network include it in their service and give you access. If yours doesn\'t, you can get it directly through WhatsApp.' },
            { q: 'My crematory gave me the memorial. Can I upgrade it?', a: 'Yes. From your memorial management page choose Recuerdo, Homenaje or Infinito to add more photos, messages, a timeline, video and their voice. You keep everything and the same link.' },
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
