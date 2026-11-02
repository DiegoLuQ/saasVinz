/**
 * Reglas compartidas del diseño de memoriales (página pública, admin y tenant).
 */

export const MAX_MEMORIAL_COMMENTS = 20;

export type MemorialScenarioId = 'normal' | 'altar' | 'cielo' | 'constelacion';
export type MemorialScenarioTier = 'BASIC' | 'NORMAL' | 'PRO' | 'ULTRA';

export interface MemorialScenarioConfig {
    id: MemorialScenarioId;
    tier: MemorialScenarioTier;
    levelLabel: string;
    name: string;
    subtitle: string;
    description: string;
    defaultTheme: string;
    defaultParticles: string;
    requiresUltraPlan: boolean;
    badgeText: string;
    accentColor: string;
}

/**
 * Los 4 Escenarios Conmemorativos del Memorial Digital:
 * 1. Básico  (normal)       -> Santuario Sereno
 * 2. Normal  (altar)        -> Altar de Luz
 * 3. Pro     (cielo)        -> Jardín Celestial
 * 4. Ultra   (constelacion) -> Constelación Eterna
 */
export const MEMORIAL_SCENARIOS: MemorialScenarioConfig[] = [
    {
        id: 'normal',
        tier: 'BASIC',
        levelLabel: 'Escenario Básico',
        name: 'Santuario Sereno',
        subtitle: 'Clásico, cálido y solemne',
        description: 'Portada conmemorativa con retrato enmarcado, encendido de vela de homenaje, dedicatoria principal, descarga de tarjeta y muro de hasta 20 comentarios.',
        defaultTheme: 'claro',
        defaultParticles: 'ninguna',
        requiresUltraPlan: false,
        badgeText: 'Incluido en PRO / ULTRA',
        accentColor: '#D4AF37',
    },
    {
        id: 'altar',
        tier: 'NORMAL',
        levelLabel: 'Escenario Normal',
        name: 'Altar de Luz',
        subtitle: ' Ceremonial con candelabros y tributos',
        description: 'Altar solemne iluminado por velas perpetuas a ambos lados del retrato de portada, ofrendas interactivas, dedicatoria destacada y descarga de recuerdo.',
        defaultTheme: 'oscuro',
        defaultParticles: 'estrellas',
        requiresUltraPlan: false,
        badgeText: 'Incluido en PRO / ULTRA',
        accentColor: '#F59E0B',
    },
    {
        id: 'cielo',
        tier: 'PRO',
        levelLabel: 'Escenario Pro',
        name: 'Jardín Celestial',
        subtitle: 'Atmósfera luminosa entre nubes y paz',
        description: 'Entorno celestial con halo de luz sobre la portada, encendido de vela sagrada, envío de besos al cielo, dedicatoria conmemorativa y descarga de imagen.',
        defaultTheme: 'cielo',
        defaultParticles: 'plumas',
        requiresUltraPlan: false,
        badgeText: 'Plan PRO / ULTRA',
        accentColor: '#38BDF8',
    },
    {
        id: 'constelacion',
        tier: 'ULTRA',
        levelLabel: 'Escenario Ultra',
        name: 'Constelación Eterna',
        subtitle: 'Bóveda estelar interactiva de máximo homenaje',
        description: 'Planetario nocturno con líneas de constelación doradas, encendido de vela eterna y estrella personal, portada estelar, dedicatoria y descarga de recuerdo.',
        defaultTheme: 'nocturno',
        defaultParticles: 'estrellas',
        requiresUltraPlan: true,
        badgeText: 'Exclusivo ULTRA',
        accentColor: '#A855F7',
    },
];

/**
 * Normaliza cualquier valor de `tipo_diseno` hacia uno de los 4 escenarios principales.
 */
export function normalizeScenarioId(tipoDiseno?: string | null): MemorialScenarioId {
    const raw = (tipoDiseno || 'normal').trim().toLowerCase();
    if (raw === 'altar' || raw === 'minimalista') return 'altar';
    if (raw === 'cielo' || raw === 'arcoiris' || raw === 'jardin') return 'cielo';
    if (raw === 'constelacion' || raw === 'galeria') return 'constelacion';
    return 'normal';
}

export function getScenarioConfig(tipoDiseno?: string | null): MemorialScenarioConfig {
    const normalized = normalizeScenarioId(tipoDiseno);
    return MEMORIAL_SCENARIOS.find((s) => s.id === normalized) || MEMORIAL_SCENARIOS[0];
}

/**
 * Verifica si el plan del crematorio es PRO o ULTRA (únicos planes habilitados para Memoriales).
 */
export function isProOrUltraCrematoryPlan(planName?: string | null): boolean {
    if (!planName) return false;
    const norm = planName
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    return ['PRO', 'ULTRA', 'VINCULO', 'PARAISO', 'ENTERPRISE', 'PREMIUM'].some((token) =>
        norm.includes(token)
    );
}

/**
 * Verifica si el plan del crematorio es ULTRA (desbloquea el 4to escenario Constelación Eterna).
 */
export function isUltraCrematoryPlan(planName?: string | null): boolean {
    if (!planName) return false;
    const norm = planName
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    return ['ULTRA', 'PARAISO', 'ENTERPRISE', 'PREMIUM'].some((token) => norm.includes(token));
}

/**
 * '#ffffff' se guardaba siempre como valor por defecto del color de fondo y
 * anulaba el tema elegido (y los fondos propios de cada altar). Se trata como
 * "sin color personalizado"; un blanco real se logra con el tema "claro".
 */
export function normalizeMemorialBg(bg?: string | null): string {
    const v = (bg || '').trim().toLowerCase();
    return v === '' || v === '#ffffff' || v === '#fff' ? '' : v;
}

/**
 * ¿El texto del altar va sobre una superficie oscura? Tema oscuro/de color, o
 * una portada (los altares le ponen un velo oscuro para que el texto se lea).
 */
export function isDarkSurface(themeConfig?: { dark?: boolean } | null, portadaUrl?: string | null): boolean {
    return !!portadaUrl || !!themeConfig?.dark;
}

/**
 * Retorna estilos y clases de contraste para textos, títulos, badges y botones
 * garantizando legibilidad total (WCAG AA/AAA) según la atmósfera y luminosidad.
 */
export function getMemorialThemeStyles(tema?: string | null, isDark?: boolean) {
    const isDarkSurface = Boolean(isDark);
    const t = (tema || 'claro').toLowerCase();

    if (isDarkSurface) {
        return {
            isDark: true,
            titleGradient: 'from-amber-200 via-amber-100 to-amber-300 drop-shadow-[0_2px_18px_rgba(251,191,36,0.25)]',
            titleText: 'text-white',
            badgeClass: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
            dateText: 'text-amber-100/90',
            dateHighlight: 'text-amber-300/90',
            bioText: 'text-amber-50/95 font-light',
            candleButtonUnlit: 'bg-white/10 hover:bg-white/15 text-amber-100 border-amber-400/30 hover:border-amber-400',
            candleCounter: 'text-amber-200/90',
            actionButtonsClass: '[&_button]:!bg-white/10 [&_button]:!text-white [&_button]:!border-amber-400/25 hover:[&_button]:!bg-white/20',
            quoteMarkColor: 'text-amber-400/50',
            cardBg: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
            cardBorder: 'rgba(251,191,36,0.22)',
            cardShadow: '0 20px 50px rgba(0,0,0,0.25), inset 0 1px 2px rgba(255,255,255,0.15)',
            subtitleText: 'text-slate-300/80',
        };
    }

    // Superficie Clara: colores de alta legibilidad según la atmósfera
    const themeAccents: Record<string, {
        titleGradient: string;
        badge: string;
        dates: string;
        datesHl: string;
        quoteMark: string;
        border: string;
    }> = {
        otono: {
            titleGradient: 'from-amber-950 via-amber-900 to-stone-900 drop-shadow-[0_1px_3px_rgba(0,0,0,0.15)]',
            badge: 'border-amber-800/30 bg-amber-800/10 text-amber-950 font-black',
            dates: 'text-amber-950/90 font-medium',
            datesHl: 'text-amber-900 font-bold',
            quoteMark: 'text-amber-800/60',
            border: 'rgba(180,83,9,0.35)',
        },
        jardin: {
            titleGradient: 'from-emerald-950 via-emerald-900 to-stone-900 drop-shadow-[0_1px_3px_rgba(0,0,0,0.15)]',
            badge: 'border-emerald-800/30 bg-emerald-800/10 text-emerald-950 font-black',
            dates: 'text-emerald-950/90 font-medium',
            datesHl: 'text-emerald-900 font-bold',
            quoteMark: 'text-emerald-800/60',
            border: 'rgba(5,150,105,0.35)',
        },
        cielo: {
            titleGradient: 'from-sky-950 via-blue-900 to-slate-900 drop-shadow-[0_1px_3px_rgba(0,0,0,0.15)]',
            badge: 'border-sky-800/30 bg-sky-800/10 text-sky-950 font-black',
            dates: 'text-sky-950/90 font-medium',
            datesHl: 'text-sky-900 font-bold',
            quoteMark: 'text-sky-800/60',
            border: 'rgba(2,132,199,0.35)',
        },
        claro: {
            titleGradient: 'from-stone-950 via-amber-950 to-stone-900 drop-shadow-[0_1px_3px_rgba(0,0,0,0.15)]',
            badge: 'border-amber-800/30 bg-amber-800/10 text-amber-950 font-black',
            dates: 'text-amber-950/90 font-medium',
            datesHl: 'text-amber-900 font-bold',
            quoteMark: 'text-amber-800/60',
            border: 'rgba(180,83,9,0.35)',
        },
    };

    const acc = themeAccents[t] || themeAccents.claro;

    return {
        isDark: false,
        titleGradient: acc.titleGradient,
        titleText: 'text-slate-900',
        badgeClass: acc.badge,
        dateText: acc.dates,
        dateHighlight: acc.datesHl,
        bioText: 'text-[#261e14] font-normal',
        candleButtonUnlit: 'bg-white/90 hover:bg-white text-slate-900 border-slate-300/80 hover:border-slate-400 shadow-md',
        candleCounter: 'text-slate-900 font-semibold',
        actionButtonsClass: '[&_button]:!bg-white/95 [&_button]:!text-slate-900 [&_button]:!border-slate-300/80 hover:[&_button]:!bg-white shadow-md',
        quoteMarkColor: acc.quoteMark,
        cardBg: 'linear-gradient(145deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.6) 100%)',
        cardBorder: acc.border,
        cardShadow: '0 20px 50px rgba(0,0,0,0.08), inset 0 1px 2px rgba(255,255,255,0.8)',
        subtitleText: 'text-slate-700 font-medium',
    };
}

/**
 * Retorna el fondo ambiental correspondiente al escenario y atmósfera seleccionada.
 */
export function getMemorialAtmosphereBg(tipoDiseno: MemorialScenarioId, tema: string, isDark: boolean): string {
    const t = (tema || 'claro').toLowerCase();

    if (tipoDiseno === 'altar') {
        if (isDark) {
            if (t === 'nocturno') return 'radial-gradient(circle at 50% 35%, #151a38 0%, #080c1e 60%, #03050e 100%)';
            if (t === 'esmeralda') return 'radial-gradient(circle at 50% 35%, #064e3b 0%, #022c22 60%, #011913 100%)';
            if (t === 'dorado') return 'radial-gradient(circle at 50% 35%, #451a03 0%, #291003 60%, #150801 100%)';
            return 'radial-gradient(circle at 50% 35%, #1e1b24 0%, #0d0c11 60%, #050508 100%)';
        }
        if (t === 'cielo') return 'radial-gradient(circle at 50% 35%, #f0f9ff 0%, #e0f2fe 55%, #bae6fd 100%)';
        if (t === 'jardin') return 'radial-gradient(circle at 50% 35%, #f4faf6 0%, #e6f7ec 55%, #c7eed3 100%)';
        if (t === 'otono') return 'radial-gradient(circle at 50% 35%, #fffbeb 0%, #fef3c7 55%, #fed7aa 100%)';
        return 'radial-gradient(circle at 50% 35%, #fdfbf7 0%, #f7f1e6 55%, #ebe0cd 100%)';
    }

    if (tipoDiseno === 'constelacion') {
        if (isDark) {
            if (t === 'oscuro') return 'radial-gradient(ellipse at 50% 25%, #0f172a 0%, #0a0f1d 52%, #030712 100%)';
            if (t === 'esmeralda') return 'radial-gradient(ellipse at 50% 25%, #064e3b 0%, #022c22 52%, #01140e 100%)';
            if (t === 'dorado') return 'radial-gradient(ellipse at 50% 25%, #451a03 0%, #291003 52%, #140701 100%)';
            return 'radial-gradient(ellipse at 50% 25%, #1b2448 0%, #0b1026 52%, #050712 100%)';
        }
        if (t === 'cielo') return 'radial-gradient(ellipse at 50% 25%, #e0f2fe 0%, #bae6fd 52%, #7dd3fc 100%)';
        if (t === 'jardin') return 'radial-gradient(ellipse at 50% 25%, #ecfdf5 0%, #d1fae5 52%, #a7f3d0 100%)';
        if (t === 'otono') return 'radial-gradient(ellipse at 50% 25%, #fffbeb 0%, #fed7aa 52%, #fdba74 100%)';
        return 'radial-gradient(ellipse at 50% 25%, #f8fafc 0%, #e2e8f0 52%, #cbd5e1 100%)';
    }

    return '';
}

/** Hex del color de fondo efectivo de la página (color propio o el del tema). */
export function pageBackgroundHex(
    themeConfig?: { bg?: string } | null,
    colorFondo?: string | null,
    fallback = '#FDFBF7'
): string {
    if (colorFondo) return colorFondo;
    const match = themeConfig?.bg?.match(/#[0-9a-fA-F]{6}/);
    return match ? match[0] : fallback;
}

export interface LifeDates {
    /** "2014 — 2026", "… — 2026" o null si no hay ninguna fecha */
    years: string | null;
    /** "12 mar 2014 — 3 jun 2026" (o null) */
    full: string | null;
    /** "12 años de amor" (o null si no se puede calcular) */
    yearsOfLove: string | null;
}

function parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

/**
 * Fechas de vida para los altares. Se formatean en UTC para que servidor y
 * cliente produzcan el mismo texto (sin desajustes de hidratación ni días
 * corridos por zona horaria).
 */
export function getLifeDates(birth?: string | null, death?: string | null, locale: 'es' | 'en' = 'es'): LifeDates {
    const b = parseDate(birth);
    const d = parseDate(death);
    if (!b && !d) return { years: null, full: null, yearsOfLove: null };

    const fmt = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-CL', {
        day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    });
    const y = (x: Date | null) => (x ? String(x.getUTCFullYear()) : '…');
    const f = (x: Date | null) => (x ? fmt.format(x) : '…');

    let yearsOfLove: string | null = null;
    if (b && d && d > b) {
        let n = d.getUTCFullYear() - b.getUTCFullYear();
        if (d.getUTCMonth() < b.getUTCMonth()
            || (d.getUTCMonth() === b.getUTCMonth() && d.getUTCDate() < b.getUTCDate())) n--;
        if (n >= 1) {
            yearsOfLove = locale === 'en'
                ? `${n} ${n === 1 ? 'year' : 'years'} of love`
                : `${n} ${n === 1 ? 'año' : 'años'} de amor`;
        }
    }

    return { years: `${y(b)} — ${y(d)}`, full: `${f(b)} — ${f(d)}`, yearsOfLove };
}

/**
 * Generador pseudoaleatorio determinista (mulberry32). Para decoraciones
 * (estrellas, destellos): mismas posiciones en servidor y cliente, y estables
 * entre renders, a diferencia de Math.random() en el render.
 */
export function seededRandom(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Clases de tamaño del nombre según su largo (evita desbordes en móvil). */
export function nameSizeClass(name: string, sizes: { short: string; long: string; xlong: string }): string {
    const len = (name || '').trim().length;
    if (len > 16) return sizes.xlong;
    if (len > 9) return sizes.long;
    return sizes.short;
}

// Texto de relleno que se guardaba al crear el memorial desde el tenant.
const PLACEHOLDER_PREFIXES = ['estamos preparando un lugar especial para recordar a'];

const EPITAPHS: Record<'es' | 'en', ((name: string) => string)[]> = {
    es: [
        (n) => `${n} llenó nuestra casa de alegría. Su huella seguirá con nosotros para siempre.`,
        (n) => `Gracias, ${n}, por cada día de amor sin condiciones. Te llevamos en el corazón.`,
        (n) => `Hay amores que no se van: solo cambian de lugar. Descansa en paz, ${n}.`,
        (n) => `${n}, tu lugar favorito sigue tibio y tu recuerdo, intacto. Te queremos siempre.`,
        (n) => `Corriste libre y nos enseñaste a querer mejor. Hasta pronto, ${n}.`,
    ],
    en: [
        (n) => `${n} filled our home with joy. Their pawprints will stay with us forever.`,
        (n) => `Thank you, ${n}, for every day of unconditional love. You live in our hearts.`,
        (n) => `Some loves never leave: they only change places. Rest in peace, ${n}.`,
        (n) => `${n}, your favorite spot is still warm and your memory, untouched. Always loved.`,
        (n) => `You ran free and taught us to love better. See you soon, ${n}.`,
    ],
};

export function getSuggestedEpitaphs(petName?: string | null, locale: 'es' | 'en' = 'es'): string[] {
    const bank = EPITAPHS[locale] || EPITAPHS.es;
    const name = (petName || '').trim() || (locale === 'en' ? 'little friend' : 'nuestro angelito');
    return bank.map((fn) => fn(name));
}

function hashString(value: string): number {
    let h = 0;
    for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
    return Math.abs(h);
}

/** ¿El mensaje es vacío o el texto de relleno del sistema? */
export function isPlaceholderFarewell(msg?: string | null): boolean {
    const v = (msg || '').trim().toLowerCase();
    return v === '' || PLACEHOLDER_PREFIXES.some(p => v.startsWith(p));
}

/**
 * Epitafio a mostrar: el mensaje de la familia/crematorio o, si no hay uno
 * real, una frase de consuelo estable por memorial (misma frase en cada visita,
 * sin desajustes entre servidor y cliente).
 */
export function getMemorialEpitaph(
    msg: string | null | undefined,
    petName: string | null | undefined,
    seed: string,
    locale: 'es' | 'en' = 'es'
): string {
    if (!isPlaceholderFarewell(msg)) return (msg as string).trim();
    const bank = EPITAPHS[locale] || EPITAPHS.es;
    const name = (petName || '').trim() || (locale === 'en' ? 'little friend' : 'pequeño amigo');
    return bank[hashString(seed || name) % bank.length](name);
}
