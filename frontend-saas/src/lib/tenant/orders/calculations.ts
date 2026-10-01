// ==========================================
// Pure Calculation Functions — Order Registration
// ==========================================
import type { SelectedService, SelectedPlan, SelectedProduct, WeightPricingRule } from './types';

/**
 * Calculate the weight-based surcharge from the pricing rules table.
 * Tramos "hasta X kg": aplica el primero (por máximo ascendente) cuyo máximo
 * cubre el peso; max_weight null = tramo abierto. Así 4,05 kg no cae en un
 * hueco entre "0–4" y "4,1–7" de reglas antiguas.
 */
export function calculateWeightPrice(
    weight: number | undefined,
    rules: WeightPricingRule[]
): number {
    if (!weight || weight <= 0) return 0;
    const sorted = [...rules].sort(
        (a, b) => (a.max_weight ?? Infinity) - (b.max_weight ?? Infinity)
    );
    // Reglas antiguas cuyo primer tramo no parte en 0: bajo ese mínimo no hay recargo.
    if (sorted.length === 0 || weight < (sorted[0].min_weight ?? 0)) return 0;
    const matchingRule = sorted.find(rule => weight <= (rule.max_weight ?? Infinity));
    return matchingRule?.price ?? 0;
}

/**
 * Calculate the grand total (sale price) for the order.
 */
export function calculateGrandTotal(
    services: SelectedService[],
    plans: SelectedPlan[],
    products: SelectedProduct[],
    weightPrice: number,
    discount: number
): number {
    let serviceTotal = 0;

    services.forEach(s => {
        serviceTotal += s.unit_price;
    });

    plans.forEach(p => {
        serviceTotal += p.unit_price;
    });

    serviceTotal += weightPrice;

    const prodTotal = products.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0
    );

    const subtotal = serviceTotal + prodTotal;
    const discountAmount = subtotal * (discount / 100);
    return subtotal - discountAmount;
}

/**
 * Calculate the grand total cost for the order.
 */
export function calculateGrandTotalCost(
    services: SelectedService[],
    plans: SelectedPlan[],
    products: SelectedProduct[]
): number {
    let serviceCost = 0;
    services.forEach(s => {
        serviceCost += s.unit_cost;
    });
    plans.forEach(p => {
        serviceCost += p.unit_cost;
    });
    const prodCost = products.reduce(
        (sum, item) => sum + item.unit_cost * item.quantity,
        0
    );
    return serviceCost + prodCost;
}

/**
 * Calculate the products subtotal for display.
 */
export function calculateProductsSubtotal(products: SelectedProduct[]): number {
    return products.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0
    );
}
