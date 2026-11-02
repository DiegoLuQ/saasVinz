"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import DiagnosticDetail from '@/components/admin/diagnostics/DiagnosticDetail';

export default function DiagnosticDetailPage() {
    const { id } = useParams<{ id: string }>();
    return (
        <div className="p-4 sm:p-8 max-w-6xl mx-auto">
            <DiagnosticDetail id={id} />
        </div>
    );
}
