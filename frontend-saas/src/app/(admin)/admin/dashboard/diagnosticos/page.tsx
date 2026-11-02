"use client";

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ClipboardCheck, Plus } from 'lucide-react';
import DiagnosticsListTab from '@/components/admin/diagnostics/DiagnosticsListTab';
import QuestionsTab from '@/components/admin/diagnostics/QuestionsTab';
import ConfigTab from '@/components/admin/diagnostics/ConfigTab';
import SummaryTab from '@/components/admin/diagnostics/SummaryTab';

const TABS = [
    { key: 'diagnosticos', label: 'Diagnósticos' },
    { key: 'preguntas', label: 'Preguntas' },
    { key: 'configuracion', label: 'Configuración' },
    { key: 'resumen', label: 'Resumen' },
] as const;
type TabKey = typeof TABS[number]['key'];

function DiagnosticsPageInner() {
    const router = useRouter();
    const params = useSearchParams();
    const tab = (TABS.find(t => t.key === params.get('tab'))?.key ?? 'diagnosticos') as TabKey;

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <ClipboardCheck className="text-primary" size={28} /> Diagnóstico 360°
                    </h1>
                    <p className="text-white/50 mt-2 text-sm max-w-3xl">
                        Evalúa a un crematorio prospecto con 10, 15 o 20 preguntas, entrégale un informe PDF con su resultado y recomendaciones, y muéstrale cómo Vinzer lo ayuda.
                    </p>
                </div>
                <Link href="/dashboard/diagnosticos/nuevo"
                    className="px-4 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:brightness-110 flex items-center gap-2">
                    <Plus size={16} /> Nuevo diagnóstico
                </Link>
            </div>

            <div className="flex gap-1 border-b border-white/10 overflow-x-auto no-scrollbar" role="tablist">
                {TABS.map(t => (
                    <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
                        onClick={() => router.replace(t.key === 'diagnosticos' ? '/dashboard/diagnosticos' : `/dashboard/diagnosticos?tab=${t.key}`)}
                        className={`px-4 py-2.5 text-sm font-bold border-b-2 -mb-px whitespace-nowrap transition-colors ${tab === t.key ? 'border-primary text-white' : 'border-transparent text-white/50 hover:text-white'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'diagnosticos' && <DiagnosticsListTab />}
            {tab === 'preguntas' && <QuestionsTab />}
            {tab === 'configuracion' && <ConfigTab />}
            {tab === 'resumen' && <SummaryTab />}
        </div>
    );
}

export default function DiagnosticsPage() {
    return (
        <Suspense>
            <DiagnosticsPageInner />
        </Suspense>
    );
}
