'use client';

import React, { useEffect, useState } from 'react';
import { Activity, BarChart2, Calendar, MousePointerClick, RefreshCw, Zap } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';

interface ModuleStat {
    module_key: string;
    label: string;
    total_clicks: number;
    percentage: number;
}

interface TelemetryResponse {
    is_enabled: boolean;
    days: number;
    total_clicks: number;
    tenant_id: number | null;
    modules: ModuleStat[];
    timeline: { date: string; total: number }[];
}

export default function ModuleUsageStatsWidget() {
    const [days, setDays] = useState<number>(30);
    const [data, setData] = useState<TelemetryResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const loadStats = () => {
        setLoading(true);
        apiRequest(`/api/internal/creator/telemetry/module-stats?days=${days}`)
            .then((res: TelemetryResponse) => {
                setData(res);
            })
            .catch(() => {
                setData(null);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        loadStats();
    }, [days]);

    const isEnabled = data?.is_enabled ?? false;
    const modules = data?.modules ?? [];
    const totalClicks = data?.total_clicks ?? 0;

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <Activity className="text-primary" size={18} />
                        <h3 className="text-base font-bold text-white">Uso de Módulos (Sidebar)</h3>
                        <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                isEnabled
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-white/10 text-white/50 border border-white/10'
                            }`}
                        >
                            {isEnabled ? 'Activa' : 'Pausada'}
                        </span>
                    </div>
                    <p className="text-xs text-white/50 mt-0.5">
                        Frecuencia con que los crematorios interactúan con cada sección del software.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
                        {[7, 30, 90].map((d) => (
                            <button
                                key={d}
                                onClick={() => setDays(d)}
                                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                                    days === d ? 'bg-primary text-white shadow-xs' : 'text-white/60 hover:text-white'
                                }`}
                            >
                                {d}d
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={loadStats}
                        disabled={loading}
                        title="Actualizar datos"
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-white/50 text-xs gap-2">
                    <RefreshCw size={18} className="animate-spin text-primary" />
                    <span>Cargando analítica de módulos...</span>
                </div>
            ) : modules.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
                    <MousePointerClick size={28} className="mx-auto text-white/30 mb-2" />
                    <p className="text-xs font-semibold text-white/70">
                        {isEnabled
                            ? 'Aún no se han acumulado clics en el período seleccionado.'
                            : 'La telemetría está pausada. Puedes activarla desde Configuración > Telemetría de Módulos.'}
                    </p>
                    <p className="text-[11px] text-white/40 mt-1">
                        Total acumulado: {totalClicks} clics.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-white/60 pb-2 border-b border-white/5">
                        <span className="font-semibold">Módulo</span>
                        <span className="font-semibold">Clics ({totalClicks.toLocaleString('es-CL')} totales)</span>
                    </div>

                    <div className="space-y-3">
                        {modules.map((m, idx) => {
                            // Colores degradados sutiles para el top
                            const barColor =
                                idx === 0
                                    ? 'bg-emerald-500'
                                    : idx === 1
                                    ? 'bg-teal-500'
                                    : idx === 2
                                    ? 'bg-sky-500'
                                    : 'bg-slate-500';

                            return (
                                <div key={m.module_key} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-medium text-white/90 truncate flex items-center gap-1.5">
                                            <span className="text-[10px] text-white/40 font-mono w-4">#{idx + 1}</span>
                                            {m.label}
                                        </span>
                                        <span className="font-bold text-white/80 shrink-0 ml-2">
                                            {m.total_clicks.toLocaleString('es-CL')}{' '}
                                            <span className="text-[10px] text-white/50 font-normal">({m.percentage}%)</span>
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                            style={{ width: `${Math.max(2, m.percentage)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
