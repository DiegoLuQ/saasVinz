"use client";

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Activity,
    ShieldCheck,
    Database,
    Server,
    RefreshCw,
    HelpCircle,
    Cpu,
    HardDrive,
    Zap,
} from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

export interface HealthMetricsResponse {
    api: string;
    database: string;
    db_latency_ms: number | null;
    db_size_mb: number | null;
    redis: 'active' | 'error' | 'not_configured';
    storage: 'r2' | 'local';
    metrics: {
        errors_24h: number;
        media_files: number;
        active_announcements: number;
        total_announcements: number;
    };
}

interface OptimizeResult {
    deleted_expired_notifications: number;
    deleted_expired_invites: number;
    db_size_mb: number | null;
}

export default function SystemHealth() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [optimizing, setOptimizing] = useState(false);
    const [optimizeReport, setOptimizeReport] = useState<OptimizeResult | null>(null);
    const [lastChecked, setLastChecked] = useState<Date>(new Date());

    const { data, isFetching, refetch } = useQuery<HealthMetricsResponse>({
        queryKey: ['admin-health-metrics'],
        queryFn: async () => {
            const res = await apiRequest('/api/internal/health/metrics');
            setLastChecked(new Date());
            return res;
        },
        refetchInterval: 30000,
        staleTime: 15000,
    });

    const handleOptimize = async () => {
        setOptimizing(true);
        setOptimizeReport(null);
        try {
            const res = await apiRequest('/api/internal/health/optimize', {
                method: 'POST',
            });
            setOptimizeReport({
                deleted_expired_notifications: res?.deleted_expired_notifications ?? 0,
                deleted_expired_invites: res?.deleted_expired_invites ?? 0,
                db_size_mb: res?.db_size_mb ?? null,
            });
            showToast('Base de datos optimizada correctamente', 'success');
            await queryClient.invalidateQueries({ queryKey: ['admin-health-metrics'] });
            setTimeout(() => setOptimizeReport(null), 8000);
        } catch (err: any) {
            showToast(err?.message || 'Error al optimizar la base de datos', 'error');
        } finally {
            setOptimizing(false);
        }
    };

    const StatusIndicator = ({ type, label }: { type: string; label?: string }) => {
        switch (type) {
            case 'active':
            case 'r2':
                return (
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                            {label || 'Operativo'}
                        </span>
                    </div>
                );
            case 'not_configured':
            case 'local':
            case 'warn':
                return (
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                        <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest">
                            {label || (type === 'not_configured' ? 'Memoria' : type === 'local' ? 'Disco Local' : 'Degradado')}
                        </span>
                    </div>
                );
            case 'error':
                return (
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                        <span className="text-red-400 text-[10px] font-black uppercase tracking-widest">Error</span>
                    </div>
                );
            default:
                return (
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="w-1.5 h-1.5 bg-white/20 rounded-full animate-pulse" />
                        <span className="text-white/30 text-[10px] font-black uppercase tracking-widest">Verificando...</span>
                    </div>
                );
        }
    };

    const apiStatus = data?.api || (isFetching ? 'checking' : 'checking');
    const dbStatus = data?.database || (isFetching ? 'checking' : 'checking');
    const redisStatus = data?.redis || (isFetching ? 'checking' : 'checking');
    const storageStatus = data?.storage || (isFetching ? 'checking' : 'checking');

    return (
        <div className="bg-[#0a192f] border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[40px] rounded-full -mr-16 -mt-16 pointer-events-none" />

            <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Activity size={16} className="text-primary" />
                    Estado de Salud Real
                </h2>
                <div className="flex items-center gap-2">
                    <div
                        className="text-white/20 hover:text-primary transition-colors cursor-help"
                        title="Monitor en tiempo real: verifica API, PostgreSQL, Redis y Almacenamiento cada 30 segundos."
                    >
                        <HelpCircle size={14} />
                    </div>
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white"
                        title="Verificar ahora"
                    >
                        <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                {/* API Health */}
                <div className="p-3.5 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group">
                    <div className="flex items-center gap-3.5">
                        <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-blue-400 group-hover:bg-blue-400/10 transition-colors">
                            <Server size={18} />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-white mb-0.5">Servidor API</div>
                            <div className="text-[10px] text-white/40 font-medium">
                                {data?.db_latency_ms != null ? `Latencia BD: ${data.db_latency_ms} ms` : 'FastAPI Core'}
                            </div>
                        </div>
                    </div>
                    <StatusIndicator type={apiStatus} />
                </div>

                {/* Database Health */}
                <div className="p-3.5 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group">
                    <div className="flex items-center gap-3.5">
                        <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-purple-400 group-hover:bg-purple-400/10 transition-colors">
                            <Database size={18} />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-white mb-0.5">PostgreSQL</div>
                            <div className="text-[10px] text-white/40 font-medium">
                                {data?.db_size_mb != null ? `Tamaño: ${data.db_size_mb} MB` : 'Cluster principal'}
                            </div>
                        </div>
                    </div>
                    <StatusIndicator type={dbStatus} />
                </div>

                {/* Redis / Rate Limit */}
                <div className="p-3.5 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group">
                    <div className="flex items-center gap-3.5">
                        <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-amber-400 group-hover:bg-amber-400/10 transition-colors">
                            <Zap size={18} />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-white mb-0.5">Caché / Rate Limit</div>
                            <div className="text-[10px] text-white/40 font-medium">
                                {redisStatus === 'active'
                                    ? 'Redis conectado'
                                    : redisStatus === 'not_configured'
                                      ? 'Modo en memoria local'
                                      : 'Error de conexión'}
                            </div>
                        </div>
                    </div>
                    <StatusIndicator type={redisStatus} />
                </div>

                {/* Storage */}
                <div className="p-3.5 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group">
                    <div className="flex items-center gap-3.5">
                        <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-emerald-400 group-hover:bg-emerald-400/10 transition-colors">
                            <HardDrive size={18} />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-white mb-0.5">Almacenamiento</div>
                            <div className="text-[10px] text-white/40 font-medium">
                                {storageStatus === 'r2' ? 'Cloudflare R2 Bucket' : 'Almacenamiento Local'}
                            </div>
                        </div>
                    </div>
                    <StatusIndicator
                        type={storageStatus}
                        label={storageStatus === 'r2' ? 'R2 Activo' : storageStatus === 'local' ? 'Local' : undefined}
                    />
                </div>
            </div>

            <div className="pt-1 flex flex-col gap-3">
                <button
                    onClick={handleOptimize}
                    disabled={optimizing}
                    className={`w-full py-3 px-4 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 border ${
                        optimizing
                            ? 'bg-white/5 border-white/10 text-white/40 cursor-not-allowed'
                            : optimizeReport
                              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                              : 'bg-primary/20 hover:bg-primary border-primary/25 text-white hover:shadow-lg hover:shadow-primary/10'
                    }`}
                >
                    {optimizing ? (
                        <>
                            <RefreshCw size={14} className="animate-spin" />
                            OPTIMIZANDO SISTEMA...
                        </>
                    ) : optimizeReport ? (
                        <>
                            <ShieldCheck size={14} />
                            ¡OPTIMIZACIÓN COMPLETADA!
                        </>
                    ) : (
                        <>
                            <Cpu size={14} />
                            OPTIMIZAR Y DEPURAR BD
                        </>
                    )}
                </button>

                {optimizeReport && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 space-y-1">
                        <div className="font-bold">Resultado de limpieza (ANALYZE):</div>
                        <div className="flex justify-between text-emerald-200/80">
                            <span>Notificaciones expiradas:</span>
                            <span className="font-mono font-bold">{optimizeReport.deleted_expired_notifications}</span>
                        </div>
                        <div className="flex justify-between text-emerald-200/80">
                            <span>Invitaciones caducadas:</span>
                            <span className="font-mono font-bold">{optimizeReport.deleted_expired_invites}</span>
                        </div>
                        {optimizeReport.db_size_mb != null && (
                            <div className="flex justify-between text-emerald-200/80">
                                <span>Tamaño actual BD:</span>
                                <span className="font-mono font-bold">{optimizeReport.db_size_mb} MB</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="text-[9px] text-white/25 font-black uppercase tracking-widest">
                    Último check: {lastChecked.toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
}
