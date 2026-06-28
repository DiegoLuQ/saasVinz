'use client';

import { useState, useEffect, useCallback } from 'react';

interface UsePaymentStatusProps {
    statusEndpoint: string;
    checkInterval?: number;
    maxAttempts?: number;
    targetStatus?: string;
}

export const usePaymentStatus = ({
    statusEndpoint,
    checkInterval = 2000,
    maxAttempts = 15,
    targetStatus = 'active'
}: UsePaymentStatusProps) => {
    const [status, setStatus] = useState<'pending' | 'success' | 'error' | 'timeout'>('pending');
    const [attempts, setAttempts] = useState(0);

    const checkStatus = useCallback(async () => {
        try {
            const response = await fetch(statusEndpoint);
            if (!response.ok) throw new Error('Error al consultar el estado');

            const data = await response.json();

            // La lógica de "qué campo mirar" puede variar. 
            // Para memoriales podría ser data.plan === 'ULTRA'
            // Para tenants data.subscription_status === 'active'

            const currentStatus = data.subscription_status || data.status;
            const currentPlan = data.plan;

            if (currentStatus === targetStatus || currentPlan === 'ULTRA') {
                setStatus('success');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Status check error:', error);
            return false;
        }
    }, [statusEndpoint, targetStatus]);

    useEffect(() => {
        if (status !== 'pending') return;

        const intervalId = setInterval(async () => {
            setAttempts(prev => {
                const next = prev + 1;
                if (next >= maxAttempts) {
                    setStatus('timeout');
                    clearInterval(intervalId);
                }
                return next;
            });

            const isSuccess = await checkStatus();
            if (isSuccess) {
                clearInterval(intervalId);
            }
        }, checkInterval);

        return () => clearInterval(intervalId);
    }, [status, checkInterval, maxAttempts, checkStatus]);

    return { status, attempts };
};
