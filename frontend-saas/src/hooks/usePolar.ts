import { useState } from 'react';
import { apiRequest } from '@/lib/admin/api';

export const usePolar = () => {
    const [loading, setLoading] = useState(false);

    const createCheckout = async (data: {
        product_id: string;
        success_url: string;
        target_resource: string;
        target_id: string;
        action: string;
        customer_email?: string;
    }) => {
        setLoading(true);
        try {
            const result = await apiRequest('/api/internal/payments/create-checkout', {
                method: 'POST',
                body: data,
            });

            if (result.url) {
                window.location.href = result.url;
            } else {
                throw new Error('No se recibió la URL de checkout');
            }
        } catch (error: any) {
            console.error('Polar Checkout error:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const openPortal = async (customer_id: string, return_url?: string) => {
        setLoading(true);
        try {
            const result = await apiRequest('/api/internal/payments/portal', {
                method: 'POST',
                body: { customer_id, return_url },
            });

            if (result.url) {
                window.location.href = result.url;
            } else {
                throw new Error('No se recibió la URL del portal');
            }
        } catch (error: any) {
            console.error('Polar Portal error:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    return { createCheckout, openPortal, loading };
};
