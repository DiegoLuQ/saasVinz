/**
 * Shared billing types for the admin Subscriptions & Billing module.
 * Mirror of the FastAPI response models in
 *   backend/app/api/internal/admin/schemas.py
 *   backend/app/api/internal/creator/subscriptions/router.py
 */

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type SubscriptionStatus = 'active' | 'pending' | 'expired' | 'canceled' | 'trial';
export type BillingCycle = 'monthly' | 'bimonthly' | 'semiannual' | 'annual';
export type PaymentMethod = 'transfer' | 'stripe' | 'paypal' | 'cash' | 'polar' | 'mercadopago';

export interface Transaction {
    id: number;
    amount: number;
    payment_method: PaymentMethod | string;
    payment_status: TransactionStatus | string;
    payment_date: string | null;
    payment_reference: string | null;
    notes: string | null;
    tenant_name: string;
    tenant_slug: string;
    target_plan_name: string | null;
    effective_billing_cycle: BillingCycle | string | null;
    /** Hasta cuándo deja vigente al tenant este pago (no la fecha de cobro). */
    current_billing_end_date: string | null;
    created_at: string;
}

export interface Subscription {
    id: number;
    tenant_id: number;
    tenant_slug: string;
    subscription_plan_id: number;
    status: SubscriptionStatus | string;
    billing_cycle: BillingCycle | string;
    start_date: string;
    end_date: string;
    final_price: number;
    tenant_name: string;
    plan_name: string;
}

export interface Coupon {
    id: number;
    code: string;
    discount_percent: number;
    is_active: boolean;
    valid_until: string | null;
    max_uses: number | null;
    current_uses: number;
    created_at: string;
}

export interface PaginatedResponse<T, K extends string> {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    /** The list payload — the key varies per endpoint (transactions/subscriptions/coupons). */
    items?: T[];
    /* Concrete keyed shapes are exposed via the type aliases below. */
    [extra: string]: any;
}

export interface TransactionListResponse {
    transactions: Transaction[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface SubscriptionListResponse {
    subscriptions: Subscription[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface CouponListResponse {
    coupons: Coupon[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}
