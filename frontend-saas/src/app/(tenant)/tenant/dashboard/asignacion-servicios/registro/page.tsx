"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AsignacionRegistroRedirectPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const query = searchParams.toString();
        router.replace(`/dashboard/recepcion-pedidos/registro${query ? `?${query}` : ''}`);
    }, [router, searchParams]);

    return null;
}
