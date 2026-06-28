export interface BillingCycle {
    value: string;
    label: string;
    months: number;
}

export const BILLING_CYCLES: BillingCycle[] = [
    { value: 'monthly', label: 'Mensual (1 mes)', months: 1 },
    { value: 'bimonthly', label: 'Bimestral (2 meses)', months: 2 },
    { value: 'semiannual', label: 'Semestral (6 meses)', months: 6 },
    { value: 'annual', label: 'Anual (12 meses)', months: 12 },
];

export const PLAN_CONFIGS: Record<string, { color: string; bg: string; border: string }> = {
    FREE: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
    NORMAL: { color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
    PRO: { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    ULTRA: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
};

export const PLAN_FALLBACK = PLAN_CONFIGS.FREE;

export interface BillingChannels {
    email: boolean;
    whatsapp: boolean;
    dashboard: boolean;
}

export interface BillingData {
    billing_cycle: string;
    billing_status: string;
    billing_end_date: string;
    last_payment_method: string;
    billing_notify_days: number;
    billing_notify_channels: BillingChannels;
    billing_discount: number;
    subscription_plan_id: string | number;
    plan_name: string;
}

export interface BillingTotals {
    months: number;
    baseTotal: number;
    finalTotal: number;
}

export interface PlanInfo {
    id: number | string;
    name: string;
    price: number;
    max_pets?: number;
}

export const getPlanStyle = (planName?: string) =>
    PLAN_CONFIGS[planName as keyof typeof PLAN_CONFIGS] || PLAN_FALLBACK;
