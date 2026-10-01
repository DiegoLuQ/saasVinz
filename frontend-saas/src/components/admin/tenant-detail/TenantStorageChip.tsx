"use client";

import React from 'react';
import Link from 'next/link';
import { HardDrive } from 'lucide-react';
import { useMediaStats, formatBytes } from '@/hooks/useMediaStats';

/** Resumen corto de imágenes y peso del crematorio; el detalle está en la pestaña Uso. */
export default function TenantStorageChip({ tenantId, tenantSlug }: { tenantId?: number; tenantSlug?: string }) {
    const { data } = useMediaStats({ tenant: tenantId, enabled: !!tenantId });
    if (!data || !tenantSlug) return null;

    return (
        <Link
            href={`/dashboard/tenants/${tenantSlug}/uso`}
            title="Ver detalle de almacenamiento"
            className="flex items-center gap-1.5 hover:text-white transition-colors"
        >
            <HardDrive size={14} className="text-emerald-400" />
            {data.images.count.toLocaleString('es-CL')} imágenes · {formatBytes(data.total_bytes)}
        </Link>
    );
}
