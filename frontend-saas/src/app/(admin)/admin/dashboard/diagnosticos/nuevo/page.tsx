"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ClipboardCheck } from 'lucide-react';
import DiagnosticWizard from '@/components/admin/diagnostics/DiagnosticWizard';

export default function NewDiagnosticPage() {
    return (
        <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-6">
            <div>
                <Link href="/dashboard/diagnosticos" className="text-xs font-bold text-white/50 hover:text-white inline-flex items-center gap-1.5">
                    <ArrowLeft size={14} /> Diagnósticos
                </Link>
                <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <ClipboardCheck className="text-primary" size={26} /> Nuevo diagnóstico
                </h1>
            </div>
            <DiagnosticWizard />
        </div>
    );
}
