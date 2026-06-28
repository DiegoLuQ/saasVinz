"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { useTenantDetail } from '@/hooks/useTenantDetail';
import TenantUsersTab from '@/components/admin/tenant-detail/TenantUsersTab';

export default function TenantUsersPage() {
    const params = useParams();
    const tenantSlug = params.slug as string;
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const { data } = useTenantDetail(tenantSlug);

    const handleUsersChanged = () => {
        queryClient.invalidateQueries({ queryKey: ['tenant-detail', tenantSlug] });
    };

    return (
        <TenantUsersTab
            users={data?.users || []}
            tenantSlug={tenantSlug}
            tenantName={data?.tenant?.name}
            tenantPlan={data?.tenant?.plan}
            onShowToast={(text, type) => showToast(text, type || 'success')}
            onUsersChanged={handleUsersChanged}
        />
    );
}
