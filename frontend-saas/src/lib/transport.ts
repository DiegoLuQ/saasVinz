/**
 * Cobro de traslado por comuna (zonas). Espejo de backend/app/services/transport.py:
 * UN solo cobro por servicio (cubre retiro y entrega): la zona más cara de las comunas
 * que cuentan. Si alguna comuna no tiene zona, todo el traslado queda «a cotizar» (solo
 * aviso, no bloquea). El servidor recalcula y congela el cobro al enviar el formulario.
 */

export interface TransportZone {
    name: string;
    /** null cuando el crematorio oculta los precios a la familia */
    price: number | null;
    communes: string[];
}

export interface PublicTransport {
    charge_pickup: boolean;
    charge_delivery: boolean;
    show_prices: boolean;
    uncovered_message: string;
    zones: TransportZone[];
}

export interface TransportLeg {
    commune: string;
    zone: string | null;
    price: number | null;
    covered: boolean;
}

export interface TransportQuote {
    pickup: TransportLeg | null;
    delivery: TransportLeg | null;
    /** Zona cobrada (la más cara); null si falta cotizar */
    zone?: string | null;
    total: number;
    uncovered: string[];
    show_prices?: boolean;
}

/** «Ñuñoa » → «nunoa». */
export function normCommune(name: string | null | undefined): string {
    return (name || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function leg(cfg: PublicTransport, commune: string | null | undefined): TransportLeg | null {
    const name = (commune || '').trim();
    if (!name) return null;
    const key = normCommune(name);
    const zone = cfg.zones.find(z => z.communes.some(c => normCommune(c) === key));
    return zone
        ? { commune: name, zone: zone.name, price: zone.price, covered: true }
        : { commune: name, zone: null, price: null, covered: false };
}

export function quoteTransport(cfg: PublicTransport | null | undefined, pickupCommune?: string | null, deliveryCommune?: string | null): TransportQuote | null {
    if (!cfg || (!cfg.charge_pickup && !cfg.charge_delivery)) return null;
    const pickup = cfg.charge_pickup ? leg(cfg, pickupCommune) : null;
    const delivery = cfg.charge_delivery ? leg(cfg, deliveryCommune) : null;
    const legs = [pickup, delivery].filter(Boolean) as TransportLeg[];
    const uncovered = legs.filter(l => !l.covered).map(l => l.commune);
    const top = legs.filter(l => l.covered).sort((a, b) => (b.price || 0) - (a.price || 0))[0];
    return {
        pickup, delivery,
        zone: top && !uncovered.length ? top.zone : null,
        total: top && !uncovered.length ? top.price || 0 : 0,
        uncovered,
        show_prices: cfg.show_prices,
    };
}

/** Comunas de retiro y entrega según los datos del formulario. */
export function ownerCommunes(owner: { commune?: string; pickupCommune?: string; pickupSameAsOwner?: boolean }): [string, string] {
    const delivery = owner.commune || '';
    const pickup = owner.pickupCommune || (owner.pickupSameAsOwner ? delivery : '');
    return [pickup, delivery];
}

export const formatClp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

/** Precio del traslado (un solo cobro): «Sin cargo» / «$8.000» / «A cotizar» / null (precio oculto). */
export function quotePriceText(q: TransportQuote, showPrices = true): string | null {
    if (q.uncovered.length) return 'A cotizar';
    if (!showPrices) return null;
    return q.total ? formatClp(q.total) : 'Sin cargo';
}

type Places = { pickup?: TransportLeg | null; delivery?: TransportLeg | null } | null | undefined;

/** «retiro y entrega en Maipú» / «retiro en Puente Alto · entrega en Maipú». */
export function transportPlaces(detail: Places): string {
    const p = detail?.pickup?.commune;
    const d = detail?.delivery?.commune;
    if (p && d && normCommune(p) === normCommune(d)) return `retiro y entrega en ${d}`;
    return [p && `retiro en ${p}`, d && `entrega en ${d}`].filter(Boolean).join(' · ');
}

/** «Traslado (retiro y entrega en Maipú)» para la orden. */
export function transportLabel(detail: Places): string {
    const places = transportPlaces(detail);
    return places ? `Traslado (${places})` : 'Traslado';
}
