/**
 * Rituales del memorial público: gestos simbólicos de los visitantes que se
 * registran en el backend (rec_rituals) y alimentan la prueba social.
 */

export type RitualKind = 'vela' | 'flor' | 'estrella' | 'beso';

export interface LitStar {
    id: number;
    name: string | null;
}

export interface RitualState {
    counts: Partial<Record<RitualKind, number>>;
    stars: LitStar[];
}

export type SendRitual = (kind: RitualKind, name?: string) => void;

/** Lo que reciben los layouts para mostrar contadores y registrar gestos. */
export interface RitualProps {
    counts: Partial<Record<RitualKind, number>>;
    stars: LitStar[];
    send: SendRitual;
}

const LABELS: Record<'es' | 'en', Record<RitualKind, [string, string]>> = {
    es: {
        vela: ['vela encendida', 'velas encendidas'],
        flor: ['flor', 'flores'],
        estrella: ['estrella', 'estrellas'],
        beso: ['beso al cielo', 'besos al cielo'],
    },
    en: {
        vela: ['candle lit', 'candles lit'],
        flor: ['flower', 'flowers'],
        estrella: ['star', 'stars'],
        beso: ['kiss to heaven', 'kisses to heaven'],
    },
};

export const RITUAL_ICONS: Record<RitualKind, string> = {
    vela: '🕯️',
    flor: '🌹',
    estrella: '⭐',
    beso: '💙',
};

/** "47 velas encendidas" / "1 flor" */
export function ritualLabel(kind: RitualKind, count: number, locale: 'es' | 'en' = 'es'): string {
    const [one, many] = (LABELS[locale] || LABELS.es)[kind];
    return `${count} ${count === 1 ? one : many}`;
}

export function totalRituals(counts: Partial<Record<RitualKind, number>>): number {
    return Object.values(counts).reduce((acc: number, n) => acc + (n || 0), 0);
}
