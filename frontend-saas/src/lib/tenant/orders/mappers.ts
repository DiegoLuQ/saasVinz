// ==========================================
// API Data Normalizers — Order Registration
// ==========================================
import type { Service, Plan, Product, Cremation, SelectedProduct, SelectedService, SelectedPlan } from './types';
import { regions } from '@/lib/tenant/chile-data';

/**
 * Normalize raw services from API to ensure unit_price/unit_cost always exist.
 */
export function normalizeServices(raw: any[]): Service[] {
    return raw.map(s => ({
        ...s,
        unit_price: s.unit_price ?? s.price ?? 0,
        unit_cost: s.unit_cost ?? s.cost ?? 0,
    }));
}

/**
 * Normalize raw plans from API, including nested services and products.
 */
export function normalizePlans(raw: any[]): Plan[] {
    return raw.map(pl => ({
        ...pl,
        unit_price: pl.unit_price ?? pl.price ?? 0,
        unit_cost: pl.unit_cost ?? pl.cost ?? 0,
        services: (pl.services || []).map((s: any) => ({
            ...s,
            unit_price: 0, // Included in plan
            unit_cost: 0,  // Included in plan
        })),
        products: (pl.products || []).map((p: any) => ({
            ...p,
            unit_price: 0, // Included in plan
            unit_cost: 0,  // Included in plan
        })),
    }));
}

/**
 * Normalize raw products from API.
 */
export function normalizeProducts(raw: any[]): Product[] {
    return raw.map(p => ({
        ...p,
        unit_price: p.unit_price ?? p.sale_price ?? 0,
        unit_cost: p.unit_cost ?? p.cost_price ?? 0,
    }));
}

/**
 * Map a cremation API response to the form state used by the editor.
 */
export function mapCremationToFormState(
    cremationData: any,
    petsData: any[]
): Partial<Cremation> {
    return {
        ...cremationData,
        scheduled_at: cremationData.scheduled_at
            ? cremationData.scheduled_at.slice(0, 16)
            : '',
        pet_id: cremationData.pet_id,
        plan_id:
            cremationData.planes && cremationData.planes.length > 0
                ? cremationData.planes[0].plan_id
                : undefined,
        service_id:
            cremationData.servicios && cremationData.servicios.length > 0
                ? cremationData.servicios[0].service_id
                : undefined,
        additional_services:
            cremationData.servicios && cremationData.servicios.length > 0
                ? cremationData.servicios.map((s: any) => s.service_id)
                : [],
        discount: cremationData.discount || 0,
        weight_price: cremationData.weight_price || 0,
        region: (() => {
            if (!cremationData.region) return '';
            const normalizeText = (text: string) => {
                return text.toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/\bregion\b/gi, "")
                    .trim();
            };
            const searchNorm = normalizeText(cremationData.region);
            const found = regions.find(r => {
                const labelNorm = normalizeText(r.label);
                const valueNorm = normalizeText(r.value);
                return labelNorm === searchNorm || 
                       valueNorm === searchNorm ||
                       labelNorm.includes(searchNorm) ||
                       searchNorm.includes(labelNorm);
            });
            return found ? found.label : cremationData.region;
        })(),
        city: cremationData.city || '',
        partner_id: cremationData.partner_id || undefined,
        images:
            cremationData.images && cremationData.images.length > 0
                ? cremationData.images
                : petsData.find((p: any) => p.id === cremationData.pet_id)?.images || [],
    };
}

/**
 * Map incoming products from a cremation API response to SelectedProduct[].
 */
export function mapCremationProducts(
    productos: any[],
    allProducts: Product[]
): SelectedProduct[] {
    return productos.map((p: any) => {
        const original = allProducts.find((prod) => prod.id === p.product_id);
        return {
            id: p.product_id,
            product_id: p.product_id,
            quantity: p.quantity ?? p.cantidad ?? 1,
            unit_price: p.unit_price ?? p.precio_venta ?? 0,
            unit_cost: p.precio_costo ?? original?.cost_price ?? 0,
            name: original?.name || 'Producto Eliminado',
            image_url: original?.image_url,
        };
    });
}

/**
 * Map incoming services from a cremation API response to SelectedService[].
 */
export function mapCremationServices(
    servicios: any[],
    allServices: Service[]
): SelectedService[] {
    return servicios.map((s: any) => {
        const original = allServices.find((srv) => srv.id === s.service_id);
        return {
            service_id: s.service_id,
            unit_price: s.unit_price ?? s.precio_venta ?? 0,
            unit_cost: s.precio_costo ?? original?.cost ?? 0,
            name: original?.name || 'Servicio Eliminado',
            es_principal: s.es_principal ?? true,
        };
    });
}

/**
 * Map incoming plans from a cremation API response to SelectedPlan[].
 */
export function mapCremationPlans(
    planes: any[],
    allPlans: Plan[]
): SelectedPlan[] {
    return planes.map((p: any) => {
        const original = allPlans.find((pln) => pln.id === p.plan_id);
        return {
            plan_id: p.plan_id,
            unit_price: p.unit_price ?? p.precio_venta ?? 0,
            unit_cost: p.unit_cost ?? 0,
            name: original?.name || 'Plan Eliminado',
            es_principal: p.es_principal ?? true,
        };
    });
}
