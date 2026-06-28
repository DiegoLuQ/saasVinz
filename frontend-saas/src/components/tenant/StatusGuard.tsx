"use client";

import React, { useState, useEffect } from 'react';
import { useSessionBootstrap } from '@/hooks/useSessionBootstrap';
import BlockedStatusPage from './BlockedStatusPage';
import AlertDisplay from './AlertDisplay';
import SubscriptionExpiredBlockModal, { SubscriptionExpiredDetail } from './SubscriptionExpiredBlockModal';

interface StatusGuardProps {
    children: React.ReactNode;
}

export default function StatusGuard({ children }: StatusGuardProps) {
    const { data: bootstrapData, error: bootstrapError } = useSessionBootstrap();
    const tenant = bootstrapData?.tenant;

    const [eventBlocked, setEventBlocked] = useState(false);
    const [eventStatus, setEventStatus] = useState<any>(null);
    const [eventReason, setEventReason] = useState('');

    const [subscriptionExpired, setSubscriptionExpired] = useState<SubscriptionExpiredDetail | null>(null);

    useEffect(() => {
        const handleStatusError = (e: any) => {
            const detail = e.detail || {};
            const message = detail.message || '';
            const newStatus = message.includes('inactive') ? 'inactive' :
                message.includes('suspended') ? 'suspended' : null;

            if (newStatus) {
                setEventStatus(newStatus);
                setEventBlocked(true);

                const reasonMatch = message.match(/Motivo: (.*)/);
                if (reasonMatch) {
                    setEventReason(reasonMatch[1]);
                }
            }
        };

        const handleSubscriptionExpired = (e: any) => {
            const detail = (e?.detail || {}) as SubscriptionExpiredDetail;
            if (detail && detail.code === 'subscription_expired') {
                setSubscriptionExpired(detail);
            }
        };

        if (typeof window !== 'undefined') {
            if ((window as any).__tenantStatusError) {
                handleStatusError({ detail: (window as any).__tenantStatusError });
            }
            if ((window as any).__subscriptionExpiredError) {
                handleSubscriptionExpired({ detail: (window as any).__subscriptionExpiredError });
            }
        }

        window.addEventListener('tenant-status-error', handleStatusError as EventListener);
        window.addEventListener('subscription-expired-error', handleSubscriptionExpired as EventListener);
        return () => {
            window.removeEventListener('tenant-status-error', handleStatusError as EventListener);
            window.removeEventListener('subscription-expired-error', handleSubscriptionExpired as EventListener);
        };
    }, []);

    // Capturamos también el caso en que la consulta inicial bootstrap falle por subscription_expired
    useEffect(() => {
        if (!bootstrapError) return;
        const err: any = bootstrapError;
        const detail = err?.data?.detail;
        if (detail && typeof detail === 'object' && detail.code === 'subscription_expired') {
            setSubscriptionExpired(detail as SubscriptionExpiredDetail);
        }
    }, [bootstrapError]);

    // Priority 1: subscription expired modal (blocks everything)
    if (subscriptionExpired) {
        return <SubscriptionExpiredBlockModal detail={subscriptionExpired} />;
    }

    // Priorities: 1. Event (Immediate error) 2. Bootstrap data (Server state)
    const currentStatus = eventStatus || tenant?.status || 'active';
    const currentReason = eventReason || tenant?.pending_reason || '';
    const isActuallyBlocked = eventBlocked || (currentStatus === 'inactive' || currentStatus === 'suspended');

    if (isActuallyBlocked) {
        return <BlockedStatusPage status={currentStatus as 'inactive' | 'suspended'} reason={currentReason} tenant={tenant} />;
    }

    return (
        <>
            {children}
            <AlertDisplay />
        </>
    );
}
