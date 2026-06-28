"use client";

import React from 'react';
import { Zap } from 'lucide-react';
import { useTenant } from '@/app/(tenant)/tenant/context/TenantContext';

/**
 * Banner que avisa al tenant que está usando un plan superior en modo
 * demostración (temporal). El plan contratado y la facturación no cambian.
 */
export function DemoBanner() {
    const { tenantData } = useTenant();

    if (!tenantData?.demo_active || !tenantData.demo_plan_name) return null;

    const until = tenantData.demo_expires_at
        ? new Date(tenantData.demo_expires_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
        : null;

    return (
        <div className="px-4 sm:px-6 lg:px-10 pt-4">
            <div className="flex items-start gap-3 rounded-2xl border border-purple-500/30 bg-purple-500/10 px-4 py-3">
                <Zap size={16} className="text-purple-400 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-purple-100 font-medium leading-relaxed">
                    Estás probando el plan <strong className="font-bold">{tenantData.demo_plan_name}</strong> en modo demostración
                    {until ? <> hasta el <strong className="font-bold">{until}</strong></> : null}.
                    {tenantData.contracted_plan_name ? (
                        <span className="text-purple-200/70"> Tu plan contratado sigue siendo {tenantData.contracted_plan_name}.</span>
                    ) : null}
                </p>
            </div>
        </div>
    );
}
