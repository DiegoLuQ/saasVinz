"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Save, Activity } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { useTenantDetail } from '@/hooks/useTenantDetail';
import TenantGeneralTab from '@/components/admin/tenant-detail/TenantGeneralTab';
import type { TenantFormData } from '@/components/admin/tenant-detail/types';

const EMPTY_FORM: TenantFormData = {
    name: '',
    slug: '',
    rut: '',
    email: '',
    phone: '',
    address: '',
    region: '',
    city: '',
    country: 'Chile',
    logo_url: '',
    plan: 'FREE',
    subscription_plan_id: '',
    status: 'active',
    monthly_price: 0,
    pending_reason: '',
    billing_end_date: ''
};

export default function TenantGeneralPage() {
    const params = useParams();
    const router = useRouter();
    const tenantSlug = params.slug as string;
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const { data } = useTenantDetail(tenantSlug);
    const [formData, setFormData] = useState<TenantFormData>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const populateForm = useCallback((tenantData: any, plansData: any[]) => {
        const next: TenantFormData = {
            name: tenantData.name || '',
            slug: tenantData.slug || '',
            rut: tenantData.rut || '',
            email: tenantData.email || '',
            phone: tenantData.phone || '',
            address: tenantData.address || '',
            region: tenantData.region || '',
            city: tenantData.city || '',
            country: tenantData.country || 'Chile',
            logo_url: tenantData.logo_url || '',
            plan: tenantData.plan || 'FREE',
            subscription_plan_id: tenantData.subscription_plan_id || '',
            status: tenantData.status || 'active',
            monthly_price: tenantData.monthly_price || 0,
            pending_reason: tenantData.pending_reason || '',
            billing_end_date: tenantData.billing_end_date ? tenantData.billing_end_date.split('T')[0] : ''
        };

        if (!tenantData.monthly_price) {
            const plan = tenantData.subscription_plan_id
                ? plansData.find((p: any) => p.id === tenantData.subscription_plan_id)
                : plansData.find((p: any) => p.name === tenantData.plan);
            if (plan) next.monthly_price = plan.price;
        }

        setFormData(next);
    }, []);

    useEffect(() => {
        if (data?.tenant && data?.plans) {
            populateForm(data.tenant, data.plans);
        }
    }, [data, populateForm]);

    const handleSubmit = async () => {
        setSaving(true);
        try {
            const { subscription_plan_id, plan, ...cleanFormData } = formData;
            await apiRequest(`/api/internal/creator/tenants/${tenantSlug}`, {
                method: 'PUT',
                body: cleanFormData
            });
            await queryClient.invalidateQueries({ queryKey: ['tenant-detail', tenantSlug] });
            showToast('Cambios guardados', 'success');
        } catch (err: any) {
            showToast(err.message || 'Error al guardar los cambios', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <TenantGeneralTab
                formData={formData}
                onChange={setFormData}
                tenantBillingEndDate={data?.tenant?.billing_end_date}
                polarSubscriptionId={data?.tenant?.polar_subscription_id}
                onOpenBilling={() => router.push(`/dashboard/tenants/${tenantSlug}/facturacion`)}
            />

            <div className="flex justify-end pt-4 border-t border-white/5">
                <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary to-orange-600 text-white rounded-2xl font-black shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all active:scale-95 disabled:opacity-50"
                >
                    {saving ? <Activity className="animate-spin" size={20} /> : <Save size={20} />}
                    GUARDAR CAMBIOS
                </button>
            </div>
        </div>
    );
}
