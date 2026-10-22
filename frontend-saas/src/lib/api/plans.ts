/**
 * Planes de suscripción para la landing comercial.
 *
 * La BD es la fuente de verdad: los topes que se muestran aquí son los mismos
 * que aplica `LimitChecker` en el backend. Antes estaban escritos a mano en el
 * JSX y se desviaron (PRO anunciaba 80 órdenes / 10 usuarios cuando el sistema
 * aplica 60 / 4).
 */

export interface PublicPlan {
    name: string;
    description: string | null;
    display_order: number;

    price: number;
    annual_price: number | null;
    annual_savings: number | null;

    /** Topes mensuales: se cuentan por mes calendario. */
    max_pets: number;
    max_orders: number;
    max_customers: number;

    /** Topes totales acumulados, NO mensuales. */
    max_users: number;
    max_partners: number;
    max_services: number;
    max_products: number;

    can_export: boolean;
    has_certificates: boolean;
    has_config: boolean;
    has_operations: boolean;
    has_veterinaries: boolean;
    has_memorials: boolean;
    has_payments: boolean;
    has_widget: boolean;
    /** Módulos del plan (Admin → Planes). */
    modules?: string[];
    /** Características con valor explícito; una que falta se considera incluida. */
    features?: Record<string, boolean>;
    /** Claves de «Funciones en la web» que el plan incluye (ver fetchPlanHighlights). */
    offers?: string[];
    /** Créditos IA incluidos al mes (1 crédito = 1 diseño con IA). */
    ai_monthly_credits?: number;
    /** Precio del crédito adicional del plan, en USD y en CLP (tipo de cambio fijo). */
    ai_extra_credit_usd?: number | null;
    ai_extra_credit_clp?: number | null;
    /** Intentos que incluye cada crédito. */
    ai_attempts_per_credit?: number;
}

/** Función que la web muestra al comparar planes (Admin → Planes → «Funciones en la web»). */
export interface PlanHighlight {
    key: string;
    label: string;
    group: string;
    description?: string;
}

/** Funciones a mostrar, en orden. Misma etiqueta de caché que los planes. */
export async function fetchPlanHighlights(): Promise<PlanHighlight[] | null> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${baseUrl}/api/public/plans/highlights`, {
            next: { revalidate: 300, tags: ['public-plans'] },
        });
        if (!response.ok) return null;
        return (await response.json()) as PlanHighlight[];
    } catch (error) {
        console.error('Error obteniendo las funciones de los planes:', error);
        return null;
    }
}

/**
 * Se llama desde el Server Component de la landing para que los precios queden
 * en el HTML (SEO) y no dependan de un fetch en el cliente.
 */
export async function fetchPublicPlans(): Promise<PublicPlan[] | null> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${baseUrl}/api/public/plans`, {
            next: { revalidate: 300, tags: ['public-plans'] },
        });
        if (!response.ok) return null;
        return (await response.json()) as PublicPlan[];
    } catch (error) {
        console.error('Error obteniendo los planes públicos:', error);
        return null;
    }
}
