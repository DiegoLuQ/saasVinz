// ==========================================
// Types & Interfaces — Order Registration
// ==========================================

export interface Product {
    id: number;
    name: string;
    code: string;
    unit_price: number;
    cost_price: number;
    image_url?: string;
    stock: number;
    /** «A pedido»: se encarga al proveedor, no se bloquea por stock */
    made_to_order?: boolean;
}

export interface SelectedProduct {
    product_id: number;
    id: number;
    quantity: number;
    unit_price: number;
    unit_cost: number;
    name: string;
    image_url?: string;
    /** Ánfora/insumo incluido en ese plan de la orden (precio 0 salvo diferencia cobrada). */
    plan_id?: number | null;
    /** Precio de lista del producto que trae el plan (para sugerir la diferencia al cambiarlo). */
    included_price?: number;
}

export interface SelectedService {
    service_id: number;
    unit_price: number;
    unit_cost: number;
    name: string;
    es_principal?: boolean;
}

export interface SelectedPlan {
    plan_id: number;
    unit_price: number;
    unit_cost: number;
    name: string;
    es_principal?: boolean;
}

export interface Cremation {
    id: number;
    pet_id: number;
    service_id?: number;
    plan_id?: number;
    scheduled_at: string;
    completed_at?: string;
    status: string;
    notes: string;
    region?: string;
    city?: string;
    address?: string;
    pickup_region?: string;
    pickup_city?: string;
    pickup_address?: string;
    images?: string[];
    additional_services?: number[];
    products?: any[];
    total_price?: number;
    discount?: number;
    weight?: number;
    weight_price?: number;
    partner_id?: number;
    partner_link_id?: number;
    partner_name?: string;
    partner_link?: any;
    // Convenio con empresa (crm_agreements): copia de condiciones + monto (lib/tenant/orders/agreements.ts)
    agreement_id?: number | null;
    agreement_name?: string | null;
    agreement_discount?: number;
    agreement_terms?: import('./agreements').AgreementTerms | null;
    partner?: {
        id: number;
        nombre_clinica: string;
        porcentaje_comision: number;
        tipo_comision: string;
        monto_comision: number;
    };
    oc_number?: number;
    verification_code?: string;
}

export interface Pet {
    id: number;
    name: string;
    customer_id: number;
    birth_date?: string;
    death_date?: string;
    birth_date_precision?: 'day' | 'month' | 'year';
    death_date_precision?: 'day' | 'month' | 'year';
    image_url?: string | null;
    images?: string[];
}

export interface Service {
    id: number;
    name: string;
    price: number;
    cost: number;
    description?: string;
    unit_price?: number;
    unit_cost?: number;
    services?: Service[];
    /** «Precio a cotizar»: el valor se pone en la orden */
    price_on_request?: boolean;
}

export interface Plan {
    id: number;
    name: string;
    price: number;
    cost: number;
    description?: string;
    unit_price?: number;
    unit_cost?: number;
    /** Grupo del plan (el mismo nombre puede existir en otro grupo) */
    group_name?: string | null;
    services: Service[];
    products: any[];
}

export interface Customer {
    id: number;
    name: string;
    rut?: string;
    email?: string;
    phone?: string;
    address?: string;
    region?: string;
    city?: string;
    country?: string;
}

export interface WeightPricingRule {
    id?: number;
    label?: string | null;
    min_weight: number | null;
    /** null = tramo abierto ("más de X kg"), solo el último */
    max_weight: number | null;
    price: number | null;
}

export interface Partner {
    id_partner: number;
    nombre_clinica?: string;
    nombre?: string;
    direccion?: string;
    celular?: string;
    telefono?: string;
    porcentaje_comision?: number;
    tipo_comision?: string;
    monto_comision?: number;
}

// ==========================================
// Status Labels & Colors
// ==========================================

export const statusLabels: Record<string, string> = {
    'pendiente': 'Pendiente',
    'en_proceso': 'En Proceso',
    'entregado': 'Entregado',
    'completado': 'Completado',
    'cancelado': 'Cancelado',
    'coordinado': 'Coordinado',
};

/** Estados que se pueden elegir en el formulario de la orden (el resto es legado). */
export const EDITABLE_STATUSES = ['pendiente', 'en_proceso', 'entregado', 'cancelado'] as const;

/** Pliega estados legados/en inglés al estado editable equivalente (solo para mostrar). */
export function normalizeOrderStatus(raw?: string | null): string {
    const v = (raw || '').trim().toLowerCase();
    if (['entregado', 'completado', 'completed', 'delivered'].includes(v)) return 'entregado';
    if (['cancelado', 'canceled', 'cancelled'].includes(v)) return 'cancelado';
    if (['en_proceso', 'processing', 'in_progress', 'ready'].includes(v)) return 'en_proceso';
    return 'pendiente'; // pendiente, received, coordinado, vacío
}

export const statusOptions = EDITABLE_STATUSES.map((key) => ({ value: key, label: statusLabels[key] }));

/** Posición en el flujo (pendiente 0, en proceso 1, entregado 2); cancelado = null. Espejo de board.status_rank. */
export function statusRank(raw?: string | null): number | null {
    const v = normalizeOrderStatus(raw);
    if (v === 'cancelado') return null;
    return v === 'entregado' ? 2 : v === 'en_proceso' ? 1 : 0;
}

/** Opciones del selector sin retroceder respecto del estado guardado (retroceder = botón «Retroceder», solo dueño). */
export function forwardStatusOptions(savedStatus?: string | null) {
    const min = statusRank(savedStatus);
    if (min === null) return statusOptions;
    return statusOptions.filter((o) => {
        const r = statusRank(o.value);
        return r === null || r >= min;
    });
}

export const statusColors: Record<string, string> = {
    'pendiente': 'bg-yellow-500/10 text-yellow-500',
    'en_proceso': 'bg-blue-500/10 text-blue-500',
    // Dorado en oscuro; en claro el #FFD700 quedaba ilegible (1.3:1)
    'entregado': 'bg-amber-100 text-amber-800 dark:bg-[#FFD700]/10 dark:text-[#FFD700]',
    'completado': 'bg-green-500/10 text-green-500',
    'cancelado': 'bg-red-500/10 text-red-500',
    'coordinado': 'bg-indigo-500/10 text-indigo-500',
};
