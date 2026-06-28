export interface TenantFormData {
    name: string;
    slug: string;
    rut: string;
    email: string;
    phone: string;
    address: string;
    region: string;
    city: string;
    country: string;
    logo_url: string;
    plan: string;
    subscription_plan_id: string | number;
    status: string;
    monthly_price: number;
    pending_reason: string;
    billing_end_date: string;
}

export interface TenantUser {
    id: number;
    name?: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
}

export interface UserFormData {
    name: string;
    email: string;
    password: string;
    role: string;
    is_active: boolean;
}

export interface ModuleData {
    all_modules: any[];
    plan_modules: string[];
    overrides: any[];
}

export interface ToastMessage {
    text: string;
    type: 'success' | 'error';
}
