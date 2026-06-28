"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { useTenantDetail } from '@/hooks/useTenantDetail';
import TenantBrandingTab from '@/components/admin/tenant-detail/TenantBrandingTab';

export default function TenantBrandingPage() {
    const params = useParams();
    const tenantSlug = params.slug as string;
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const { data } = useTenantDetail(tenantSlug);

    const handleLogoUpdated = () => {
        queryClient.invalidateQueries({ queryKey: ['tenant-detail', tenantSlug] });
    };

    return (
        <TenantBrandingTab
            tenantSlug={tenantSlug}
            tenantId={data?.tenant?.id}
            logoUrl={data?.tenant?.logo_url || ''}
            onLogoUpdated={handleLogoUpdated}
            onShowToast={(text, type) => showToast(text, type || 'success')}
        />
    );
}
