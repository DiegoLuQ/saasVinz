"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/tenant/api';

export default function OperacionesPage() {
    const router = useRouter();

    useEffect(() => {
        const checkRoleAndRedirect = async () => {
            try {
                const user = await apiRequest('/api/internal/auth/me');

                if (user.role === 'driver' || user.role === 'operator' || user.role === 'operador_cremacion' || user.role === 'admin' || user.role === 'creator') {
                    router.replace('/dashboard/operaciones/lista');
                } else {
                    router.replace('/dashboard');
                }
            } catch (err) {
                console.error("Error redirecting in Operaciones:", err);
                router.replace('/dashboard');
            }
        };

        checkRoleAndRedirect();
    }, [router]);

    return (
        <div className="flex items-center justify-center min-vh-screen p-8 text-center pt-20">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground animate-pulse font-medium">Redirigiendo a tu área de trabajo...</p>
        </div>
    );
}

