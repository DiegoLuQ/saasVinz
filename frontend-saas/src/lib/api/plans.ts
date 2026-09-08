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
