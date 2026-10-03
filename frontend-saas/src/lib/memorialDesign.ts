/**
 * Reglas compartidas del diseño de memoriales (página pública, admin y tenant).
 */

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
