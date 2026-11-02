// ==========================================
// Convenios con empresas — descuento en la orden
// Mismo cálculo que el backend (app/services/agreements.py): % en planes,
// % en ánforas/productos y % en un servicio especial. El recargo por peso no
// se descuenta; el descuento % manual se aplica después (calculateGrandTotal).
// ==========================================
import type { SelectedService, SelectedPlan, SelectedProduct } from './types';

/** Convenio activo, para el selector de la orden (`/api/internal/agreements/active-options`). */
export interface AgreementOption {
    id: number;
    name: string;
    rut?: string | null;
    plans_discount_pct: number;
    products_discount_pct: number;
    special_service_id?: number | null;
    special_service_name?: string | null;
    special_service_discount_pct: number;
}

/** Copia de las condiciones guardada en la orden (`oc_financial.agreement_terms`). */
export interface AgreementTerms {
    rut?: string | null;
    plans_pct: number;
    products_pct: number;
    special_service_id?: number | null;
    special_service_name?: string | null;
    special_service_pct: number;
}

/** Convenio completo (gestión en Clientes → Convenios). */
export interface Agreement extends AgreementOption {
    notes?: string | null;
    is_active: boolean;
    created_at?: string;
    orders_count: number;
    total_discount: number;
}

export function termsFromOption(a: AgreementOption): AgreementTerms {
    return {
        rut: a.rut,
        plans_pct: a.plans_discount_pct || 0,
        products_pct: a.products_discount_pct || 0,
        special_service_id: a.special_service_id ?? null,
        special_service_name: a.special_service_name ?? null,
        special_service_pct: a.special_service_id ? a.special_service_discount_pct || 0 : 0,
    };
}

export interface AgreementBreakdown {
    plans: number;
    products: number;
    special: number;
    total: number;
}

const pct = (v: number | undefined | null) => Math.max(0, Math.min(100, Number(v) || 0));

export function computeAgreementDiscount(
    terms: AgreementTerms | null | undefined,
    services: SelectedService[],
    plans: SelectedPlan[],
    products: SelectedProduct[]
): AgreementBreakdown {
    if (!terms) return { plans: 0, products: 0, special: 0, total: 0 };
    const plansSum = plans.reduce((s, p) => s + (p.unit_price || 0), 0);
    const prodSum = products.reduce((s, p) => s + (p.unit_price || 0) * (p.quantity || 1), 0);
    const specialSum = terms.special_service_id
        ? services.filter(s => s.service_id === terms.special_service_id).reduce((s, x) => s + (x.unit_price || 0), 0)
        : 0;
    const round = (n: number) => Math.round(n * 100) / 100;
    const r = {
        plans: round((plansSum * pct(terms.plans_pct)) / 100),
        products: round((prodSum * pct(terms.products_pct)) / 100),
        special: round((specialSum * pct(terms.special_service_pct)) / 100),
    };
    return { ...r, total: round(r.plans + r.products + r.special) };
}

/** Resumen corto de las condiciones: "Planes 10 % · Ánforas 5 % · Eutanasia 20 %". */
export function describeTerms(t: AgreementTerms): string {
    const parts: string[] = [];
    if (t.plans_pct) parts.push(`Planes ${t.plans_pct} %`);
    if (t.products_pct) parts.push(`Ánforas ${t.products_pct} %`);
    if (t.special_service_id && t.special_service_pct) parts.push(`${t.special_service_name || 'Servicio especial'} ${t.special_service_pct} %`);
    return parts.join(' · ') || 'Sin descuentos';
}
