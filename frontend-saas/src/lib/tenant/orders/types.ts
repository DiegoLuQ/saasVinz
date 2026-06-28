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
}

export interface SelectedProduct {
    product_id: number;
    id: number;
    quantity: number;
    unit_price: number;
    unit_cost: number;
    name: string;
    image_url?: string;
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
}

export interface Plan {
    id: number;
    name: string;
    price: number;
    cost: number;
    description?: string;
    unit_price?: number;
    unit_cost?: number;
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
    min_weight: number;
    max_weight: number;
    price: number;
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

export const statusColors: Record<string, string> = {
    'pendiente': 'bg-yellow-500/10 text-yellow-500',
    'en_proceso': 'bg-blue-500/10 text-blue-500',
    'entregado': 'bg-[#FFD700]/10 text-[#FFD700]',
    'completado': 'bg-green-500/10 text-green-500',
    'cancelado': 'bg-red-500/10 text-red-500',
    'coordinado': 'bg-indigo-500/10 text-indigo-500',
};
