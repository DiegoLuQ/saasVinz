// ==========================================
// Resumen legible de una orden: lo que se muestra antes de guardar o eliminar
// (OrderSaveConfirmModal / DeleteOrderModal). Mismos cálculos que el ticket.
// ==========================================
import { calculateGrandTotal } from './calculations';
import { computeAgreementDiscount, type AgreementTerms } from './agreements';
import { statusLabels } from './types';
import type { Cremation, SelectedPlan, SelectedProduct, SelectedService } from './types';

/** Acepta la forma actual de /partners/active-options (id, name) y la antigua (id_partner, nombre_clinica). */
export interface SummaryPartner {
    id?: number;
    id_partner?: number;
    name?: string;
    nombre?: string;
    nombre_clinica?: string;
    tipo_comision?: string;
    porcentaje_comision?: number;
    monto_comision?: number;
}

export interface OrderSummary {
    petName: string | null;
    customerName: string | null;
    status: string;
    scheduled: string | null;
    pickup: string | null;
    delivery: string | null;
    notes: string | null;
    weight: number | null;
    items: { key: string; label: string; amount: number }[];
    weightPrice: number;
    agreement: { name: string; amount: number } | null;
    discountPct: number;
    discountAmount: number;
    partner: { name: string; commission: number; detail: string } | null;
    total: number;
}

export interface SummaryInput {
    cremation: Partial<Cremation>;
    services: SelectedService[];
    plans: SelectedPlan[];
    products: SelectedProduct[];
    agreementTerms: AgreementTerms | null;
    agreementName?: string | null;
    partners: SummaryPartner[];
    petName?: string | null;
    customerName?: string | null;
}

const join = (...parts: (string | null | undefined)[]) => parts.map(p => (p || '').trim()).filter(Boolean).join(', ') || null;

/** "2026-11-02T14:30" (hora local del crematorio) → "02-11-2026 14:30". */
function formatLocal(v?: string | null): string | null {
    if (!v) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(v);
    if (!m) return v;
    return `${m[3]}-${m[2]}-${m[1]}${m[4] ? ` ${m[4]}:${m[5]}` : ''}`;
}

export function buildOrderSummary(i: SummaryInput): OrderSummary {
    const c = i.cremation;
    const breakdown = computeAgreementDiscount(i.agreementTerms, i.services, i.plans, i.products);
    const weightPrice = c.weight_price || 0;
    const discountPct = c.discount || 0;
    const total = calculateGrandTotal(i.services, i.plans, i.products, weightPrice, discountPct, breakdown.total);
    const beforeManual = discountPct < 100 ? total / (1 - discountPct / 100) : 0;

    const partnerId = c.partner_link_id || c.partner_id;
    const p = partnerId ? i.partners.find(x => (x.id ?? x.id_partner) === partnerId) : undefined;
    let partner: OrderSummary['partner'] = null;
    if (partnerId) {
        const fixed = p?.tipo_comision === 'fijo';
        partner = {
            name: p?.name || p?.nombre_clinica || p?.nombre || c.partner_name || 'Veterinaria',
            commission: p ? (fixed ? p.monto_comision || 0 : (total * (p.porcentaje_comision || 0)) / 100) : 0,
            detail: p ? (fixed ? 'monto fijo' : `${p.porcentaje_comision || 0} % del total`) : '',
        };
    }

    return {
        petName: i.petName ?? null,
        customerName: i.customerName ?? null,
        status: statusLabels[c.status || ''] || c.status || '—',
        scheduled: formatLocal(c.scheduled_at),
        pickup: join(c.pickup_address, c.pickup_city, c.pickup_region),
        delivery: join(c.address, c.city, c.region),
        notes: (c.notes || '').trim() || null,
        weight: c.weight ?? null,
        items: [
            ...i.plans.map(x => ({ key: `plan-${x.plan_id}`, label: `Plan: ${x.name}`, amount: x.unit_price || 0 })),
            ...i.services.map(x => ({ key: `svc-${x.service_id}`, label: x.name, amount: x.unit_price || 0 })),
            ...i.products.map(x => ({
                key: `prod-${x.product_id}-${x.plan_id || 0}`,
                label: `${x.name}${x.plan_id ? ' (incluida en el plan)' : ''}${x.quantity > 1 ? ` ×${x.quantity}` : ''}`,
                amount: (x.unit_price || 0) * (x.quantity || 1),
            })),
        ],
        weightPrice,
        agreement: c.agreement_id
            ? { name: i.agreementName || c.agreement_name || 'Convenio', amount: breakdown.total }
            : null,
        discountPct,
        discountAmount: beforeManual - total,
        partner,
        total,
    };
}

export interface SummaryChange {
    label: string;
    before: string;
    after: string;
}

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });
export const fmtCLP = (n: number) => CLP.format(Math.round(n || 0));

/** Diferencias entre lo guardado y lo que se va a guardar, en palabras. */
export function diffSummaries(before: OrderSummary, after: OrderSummary): SummaryChange[] {
    const out: SummaryChange[] = [];
    const add = (label: string, b: string | null | undefined, a: string | null | undefined) => {
        const bb = b || '—';
        const aa = a || '—';
        if (bb !== aa) out.push({ label, before: bb, after: aa });
    };
    add('Mascota', before.petName, after.petName);
    add('Estado', before.status, after.status);
    add('Fecha agendada', before.scheduled, after.scheduled);
    add('Peso', before.weight ? `${before.weight} kg` : null, after.weight ? `${after.weight} kg` : null);
    add('Dirección de retiro', before.pickup, after.pickup);
    add('Dirección de entrega', before.delivery, after.delivery);
    add('Notas', before.notes, after.notes);

    const bItems = new Map(before.items.map(x => [x.key, x]));
    const aItems = new Map(after.items.map(x => [x.key, x]));
    for (const [k, x] of aItems) {
        const prev = bItems.get(k);
        if (!prev) out.push({ label: x.label, before: 'No estaba', after: `Agregado (${fmtCLP(x.amount)})` });
        else if (prev.amount !== x.amount || prev.label !== x.label) out.push({ label: x.label, before: fmtCLP(prev.amount), after: fmtCLP(x.amount) });
    }
    for (const [k, x] of bItems) {
        if (!aItems.has(k)) out.push({ label: x.label, before: fmtCLP(x.amount), after: 'Quitado' });
    }

    add('Recargo por peso', fmtCLP(before.weightPrice), fmtCLP(after.weightPrice));
    add('Convenio empresa',
        before.agreement ? `${before.agreement.name} (−${fmtCLP(before.agreement.amount)})` : 'Sin convenio',
        after.agreement ? `${after.agreement.name} (−${fmtCLP(after.agreement.amount)})` : 'Sin convenio');
    add('Descuento especial', `${before.discountPct} %`, `${after.discountPct} %`);
    add('Veterinaria',
        before.partner ? before.partner.name : 'Sin veterinaria',
        after.partner ? after.partner.name : 'Sin veterinaria');
    if (after.partner || before.partner) {
        add('Comisión veterinaria', fmtCLP(before.partner?.commission || 0), fmtCLP(after.partner?.commission || 0));
    }
    add('Total a pagar', fmtCLP(before.total), fmtCLP(after.total));
    return out;
}
