"use client";

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import MemorialClientPage from './MemorialClientPage';
import MemorialIntro from '@/components/memorial/MemorialIntro';

export default function MemorialPage(props: any) {
    const params = useParams();
    const searchParams = useSearchParams();
    // La vista previa del admin recarga con cada cambio de diseño: sin intro.
    const isPreview = searchParams.has('preview_layout');

    return (
        <>
            {!isPreview && <MemorialIntro petSlug={params.mascota as string} />}
            <MemorialClientPage {...props} />
        </>
    );
}
