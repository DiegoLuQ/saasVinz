"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Server,
    Cpu,
    Database,
    Activity,
    HardDrive,
    ArrowDownRight,
    ArrowUpRight,
    RefreshCw,
    TrendingUp,
    Building2,
    Search,
    Layers,
    Clock,
    Zap,
    ShieldAlert,
    CheckCircle,
} from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';

export interface ServerTelemetryResponse {
    system: {
        os_name: string;
        cpu: {
            percent: number;
            cores: number;
            load_avg: [number, number, number] | null;
        };
        ram: {
            total_mb: number;
            used_mb: number;
            free_mb: number;
            percent: number;
            swap_used_mb: number;
            swap_percent: number;
        };
        disk: {
            total_gb: number;
            used_gb: number;
            free_gb: number;
            percent: number;
        };
        network: {
            sent_mb: number;
            recv_mb: number;
            rate_sent_kbps: number;
            rate_recv_kbps: number;
        };
    };
    database: {
        status: string;
        latency_ms: number | null;
        size_mb: number;
        active_connections: number;
        idle_connections: number;
        total_connections: number;
        max_connections: number;
        conn_percent: number;
        cache_hit_ratio: number;
        commits: number;
        rollbacks: number;
        deadlocks: number;
    };
    tenants_breakdown: Array<{
        tenant_id: number;
        name: string;
        slug: string;
        status: string;
        media_storage_mb: number;
        media_files_count: number;
        orders_count: number;
        orders_last_30d: number;
        pets_count: number;
        events_last_30d: number;
        pct_of_total_storage: number;
        pct_of_total_orders: number;
    }>;
    history: Array<{
        time: string;
        ram_percent: number;
        cpu_percent: number;
        db_connections: number;
        db_latency_ms: number;
        network_kbps: number;
    }>;
}

export default function ServerTelemetryMonitor() {
    const [activeTab, setActiveTab] = useState<'ram_cpu' | 'db_fluct' | 'network'>('ram_cpu');
    const [tenantSearch, setTenantSearch] = useState('');
    const [sortBy, setSortBy] = useState<'storage' | 'orders' | 'activity'>('storage');

    const { data, isFetching, refetch } = useQuery<ServerTelemetryResponse>({
        queryKey: ['admin-server-telemetry'],
        queryFn: async () => {
            return await apiRequest('/api/internal/health/server-metrics');
        },
        refetchInterval: 15000, // Refresca cada 15 segundos
        staleTime: 10000,
    });

    const sys = data?.system;
    const db = data?.database;
    const tenants = data?.tenants_breakdown || [];
    const history = data?.history || [];

    // Filtrar y ordenar crematorios
    const filteredTenants = tenants
        .filter((t) =>
            t.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
            t.slug.toLowerCase().includes(tenantSearch.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === 'storage') return b.media_storage_mb - a.media_storage_mb;
            if (sortBy === 'orders') return b.orders_count - a.orders_count;
            return b.events_last_30d - a.events_last_30d;
        });

    // Helper para generar el path del SVG del gráfico
    const renderSparkline = (
        dataPoints: number[],
        width: number = 500,
        height: number = 160,
        minY: number = 0,
        maxY: number = 100
    ) => {
        if (!dataPoints || dataPoints.length === 0) return { path: '', area: '', points: [] };
        const safeMax = Math.max(...dataPoints, maxY, 1);
        const safeMin = Math.min(...dataPoints, minY);
        const range = safeMax - safeMin || 1;

        const pts = dataPoints.map((val, idx) => {
            const x = (idx / Math.max(dataPoints.length - 1, 1)) * width;
            const y = height - ((val - safeMin) / range) * (height - 20) - 10;
            return { x, y, val };
        });

        const linePath = pts.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`, '');
        const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

        return { path: linePath, area: areaPath, points: pts };
    };

    // Puntos de datos según la pestaña activa
    const chartData = history.map((h) => {
        if (activeTab === 'ram_cpu') return h.ram_percent;
        if (activeTab === 'db_fluct') return h.db_connections;
        return h.network_kbps;
    });

    const secondaryChartData = activeTab === 'ram_cpu'
        ? history.map((h) => h.cpu_percent)
        : activeTab === 'db_fluct'
        ? history.map((h) => h.db_latency_ms)
        : [];

    const spark1 = renderSparkline(chartData, 600, 150, 0, activeTab === 'ram_cpu' ? 100 : undefined);
    const spark2 = secondaryChartData.length > 0 ? renderSparkline(secondaryChartData, 600, 150, 0) : null;

    return (
        <div className="bg-[#0a192f]/90 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            {/* Resplandor decorativo */}
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                            <Server size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                                Servidor VPS & Fluctuaciones de Base de Datos
                            </h2>
                            <p className="text-xs text-white/50 font-medium">
                                Monitoreo de recursos en tiempo real (Ubuntu Linux) y desglose individual por crematorio
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-white/70">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        {sys?.os_name || 'Ubuntu Linux VPS'}
                    </span>
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="px-3.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/25 text-primary text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        title="Actualizar telemetría ahora"
                    >
                        <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
                        {isFetching ? 'Midiendo...' : 'Refrescar'}
                    </button>
                </div>
            </div>

            {/* Tarjetas KPI de Estado Global */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {/* 1. Memoria RAM */}
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-3 relative overflow-hidden group hover:border-cyan-500/30 transition-all">
                    <div className="flex items-center justify-between text-xs font-bold text-white/60">
                        <span className="flex items-center gap-1.5">
                            <Layers size={15} className="text-cyan-400" /> Memoria RAM
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                            (sys?.ram.percent ?? 0) > 85 ? 'bg-rose-500/20 text-rose-300' : 'bg-cyan-500/20 text-cyan-300'
                        }`}>
                            {sys?.ram.percent ? `${sys.ram.percent}%` : '—'}
                        </span>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-white">
                            {sys?.ram.used_mb ? (sys.ram.used_mb / 1024).toFixed(1) : '0'}{' '}
                            <span className="text-xs text-white/40 font-normal">
                                / {sys?.ram.total_mb ? (sys.ram.total_mb / 1024).toFixed(1) : '0'} GB
                            </span>
                        </div>
                        <div className="text-[11px] text-white/40 mt-1">
                            Libre: {sys?.ram.free_mb ? (sys.ram.free_mb / 1024).toFixed(1) : '0'} GB • Swap: {sys?.ram.swap_used_mb ?? 0} MB
                        </div>
                    </div>
                    {/* Barra de progreso */}
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${
                                (sys?.ram.percent ?? 0) > 85 ? 'bg-rose-400' : 'bg-cyan-400'
                            }`}
                            style={{ width: `${Math.min(sys?.ram.percent ?? 0, 100)}%` }}
                        />
                    </div>
                </div>

                {/* 2. Base de Datos & Conexiones */}
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-3 relative overflow-hidden group hover:border-purple-500/30 transition-all">
                    <div className="flex items-center justify-between text-xs font-bold text-white/60">
                        <span className="flex items-center gap-1.5">
                            <Database size={15} className="text-purple-400" /> PostgreSQL
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-purple-500/20 text-purple-300">
                            {db?.status === 'active' ? 'Óptimo' : 'Error'}
                        </span>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-white">
                            {db?.total_connections ?? 0}{' '}
                            <span className="text-xs text-white/40 font-normal">
                                / {db?.max_connections ?? 100} conex.
                            </span>
                        </div>
                        <div className="text-[11px] text-white/40 mt-1">
                            Activas: {db?.active_connections ?? 0} • Caché Hit: {db?.cache_hit_ratio ?? 99}%
                        </div>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-purple-400 transition-all duration-500"
                            style={{ width: `${Math.min(db?.conn_percent ?? 5, 100)}%` }}
                        />
                    </div>
                </div>

                {/* 3. CPU & Carga */}
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-3 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center justify-between text-xs font-bold text-white/60">
                        <span className="flex items-center gap-1.5">
                            <Cpu size={15} className="text-emerald-400" /> Carga CPU
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300">
                            {sys?.cpu.cores ?? 1} Cores
                        </span>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-white">
                            {sys?.cpu.percent ? `${sys.cpu.percent}%` : '0%'}{' '}
                            <span className="text-xs text-white/40 font-normal">uso actual</span>
                        </div>
                        <div className="text-[11px] text-white/40 mt-1">
                            {sys?.cpu.load_avg
                                ? `Load: ${sys.cpu.load_avg.join(' · ')}`
                                : 'Latencia DB: ' + (db?.latency_ms ?? 0) + ' ms'}
                        </div>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-400 transition-all duration-500"
                            style={{ width: `${Math.min(sys?.cpu.percent ?? 5, 100)}%` }}
                        />
                    </div>
                </div>

                {/* 4. Tráfico de Red */}
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-3 relative overflow-hidden group hover:border-amber-500/30 transition-all">
                    <div className="flex items-center justify-between text-xs font-bold text-white/60">
                        <span className="flex items-center gap-1.5">
                            <TrendingUp size={15} className="text-amber-400" /> Tráfico Red
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-500/20 text-amber-300">
                            I/O Vivo
                        </span>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-white flex items-baseline gap-2">
                            <span>↓ {sys?.network.rate_recv_kbps ?? 0}</span>
                            <span className="text-sm font-medium text-white/40">KB/s</span>
                        </div>
                        <div className="text-[11px] text-white/40 mt-1 flex items-center gap-2">
                            <span>↑ {sys?.network.rate_sent_kbps ?? 0} KB/s</span>
                            <span>•</span>
                            <span>Total: {sys?.network.recv_mb ?? 0} MB</span>
                        </div>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-amber-400 transition-all duration-500"
                            style={{
                                width: `${Math.min(
                                    ((sys?.network.rate_recv_kbps ?? 0) + (sys?.network.rate_sent_kbps ?? 0)) / 10,
                                    100
                                )}%`,
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Gráficos de Fluctuación y Picos en el Tiempo */}
            <div className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <Activity size={16} className="text-cyan-400" />
                            Picos y Fluctuaciones Históricas
                        </h3>
                        <p className="text-xs text-white/40 mt-0.5">
                            Muestreo continuo para detectar momentos de alta demanda y comportamiento del servidor
                        </p>
                    </div>

                    <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
                        <button
                            onClick={() => setActiveTab('ram_cpu')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === 'ram_cpu'
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                    : 'text-white/50 hover:text-white'
                            }`}
                        >
                            RAM & CPU
                        </button>
                        <button
                            onClick={() => setActiveTab('db_fluct')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === 'db_fluct'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'text-white/50 hover:text-white'
                            }`}
                        >
                            Conexiones BD
                        </button>
                        <button
                            onClick={() => setActiveTab('network')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === 'network'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'text-white/50 hover:text-white'
                            }`}
                        >
                            Tráfico Red
                        </button>
                    </div>
                </div>

                {/* Lienzo del Gráfico */}
                <div className="relative h-44 w-full bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col justify-between overflow-hidden">
                    {/* Leyendas en el gráfico */}
                    <div className="flex items-center justify-between text-[11px] font-semibold text-white/40 z-10">
                        <div className="flex items-center gap-4">
                            {activeTab === 'ram_cpu' && (
                                <>
                                    <span className="flex items-center gap-1.5 text-cyan-400">
                                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> % RAM
                                    </span>
                                    <span className="flex items-center gap-1.5 text-emerald-400">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> % CPU
                                    </span>
                                </>
                            )}
                            {activeTab === 'db_fluct' && (
                                <>
                                    <span className="flex items-center gap-1.5 text-purple-400">
                                        <span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> Conexiones concurrentes
                                    </span>
                                    <span className="flex items-center gap-1.5 text-rose-400">
                                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Latencia (ms)
                                    </span>
                                </>
                            )}
                            {activeTab === 'network' && (
                                <span className="flex items-center gap-1.5 text-amber-400">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Velocidad combinada (KB/s)
                                </span>
                            )}
                        </div>
                        <span className="text-[10px] text-white/30">Muestras: {history.length}</span>
                    </div>

                    {/* SVG Curve */}
                    <div className="absolute inset-0 pt-8 pb-4 px-4 flex items-center justify-center">
                        {spark1.path ? (
                            <svg className="w-full h-full overflow-visible" viewBox="0 0 600 150" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="gradient-primary" x1="0" y1="0" x2="0" y2="1">
                                        <stop
                                            offset="0%"
                                            stopColor={
                                                activeTab === 'ram_cpu'
                                                    ? '#06b6d4'
                                                    : activeTab === 'db_fluct'
                                                    ? '#a855f7'
                                                    : '#f59e0b'
                                            }
                                            stopOpacity="0.35"
                                        />
                                        <stop
                                            offset="100%"
                                            stopColor={
                                                activeTab === 'ram_cpu'
                                                    ? '#06b6d4'
                                                    : activeTab === 'db_fluct'
                                                    ? '#a855f7'
                                                    : '#f59e0b'
                                            }
                                            stopOpacity="0.0"
                                        />
                                    </linearGradient>
                                </defs>

                                {/* Área de fondo */}
                                <path d={spark1.area} fill="url(#gradient-primary)" />

                                {/* Línea 1 principal */}
                                <path
                                    d={spark1.path}
                                    fill="none"
                                    stroke={
                                        activeTab === 'ram_cpu'
                                            ? '#06b6d4'
                                            : activeTab === 'db_fluct'
                                            ? '#a855f7'
                                            : '#f59e0b'
                                    }
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                />

                                {/* Línea 2 secundaria (si aplica) */}
                                {spark2 && spark2.path && (
                                    <path
                                        d={spark2.path}
                                        fill="none"
                                        stroke={activeTab === 'ram_cpu' ? '#10b981' : '#f43f5e'}
                                        strokeWidth="1.8"
                                        strokeDasharray="4 4"
                                        strokeLinecap="round"
                                    />
                                )}
                            </svg>
                        ) : (
                            <div className="text-xs text-white/30">Recolectando muestras...</div>
                        )}
                    </div>

                    {/* Eje temporal inferior */}
                    <div className="flex items-center justify-between text-[10px] text-white/30 pt-2 border-t border-white/5 z-10">
                        <span>{history[0]?.time || 'Inicio'}</span>
                        <span>{history[Math.floor(history.length / 2)]?.time || 'Medio'}</span>
                        <span>{history[history.length - 1]?.time || 'Ahora'}</span>
                    </div>
                </div>
            </div>

            {/* SECCIÓN INDIVIDUAL POR CREMATORIO */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                        <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                            <Building2 size={18} className="text-primary" />
                            Consumo Individual por Crematorio
                        </h3>
                        <p className="text-xs text-white/40">
                            Desglose de uso de almacenamiento, actividad en base de datos e interacciones por tenant
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Buscador */}
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                            <input
                                type="text"
                                placeholder="Buscar crematorio..."
                                value={tenantSearch}
                                onChange={(e) => setTenantSearch(e.target.value)}
                                className="pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50 w-44"
                            />
                        </div>

                        {/* Selector de Orden */}
                        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
                            <button
                                onClick={() => setSortBy('storage')}
                                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                                    sortBy === 'storage' ? 'bg-primary/20 text-primary' : 'text-white/40 hover:text-white'
                                }`}
                            >
                                Almacenamiento
                            </button>
                            <button
                                onClick={() => setSortBy('orders')}
                                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                                    sortBy === 'orders' ? 'bg-primary/20 text-primary' : 'text-white/40 hover:text-white'
                                }`}
                            >
                                Órdenes
                            </button>
                            <button
                                onClick={() => setSortBy('activity')}
                                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                                    sortBy === 'activity' ? 'bg-primary/20 text-primary' : 'text-white/40 hover:text-white'
                                }`}
                            >
                                Actividad Web
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabla o Lista de Crematorios */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredTenants.map((t) => (
                        <div
                            key={t.tenant_id}
                            className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4 hover:border-white/20 transition-all relative overflow-hidden"
                        >
                            {/* Header del Crematorio */}
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="text-sm font-black text-white tracking-tight">{t.name}</div>
                                    <div className="text-[11px] text-white/40">/{t.slug}</div>
                                </div>
                                <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                        t.status === 'active'
                                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                            : 'bg-white/10 text-white/50'
                                    }`}
                                >
                                    {t.status}
                                </span>
                            </div>

                            {/* Métricas clave del crematorio */}
                            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/5">
                                {/* Almacenamiento */}
                                <div className="p-2.5 bg-black/20 rounded-xl space-y-1">
                                    <div className="text-[10px] font-bold text-white/40 uppercase">Archivos Cloud</div>
                                    <div className="text-sm font-black text-cyan-300">
                                        {t.media_storage_mb.toFixed(1)} MB
                                    </div>
                                    <div className="text-[10px] text-white/30">{t.media_files_count} archivos</div>
                                </div>

                                {/* Órdenes */}
                                <div className="p-2.5 bg-black/20 rounded-xl space-y-1">
                                    <div className="text-[10px] font-bold text-white/40 uppercase">Órdenes Totales</div>
                                    <div className="text-sm font-black text-purple-300">
                                        {t.orders_count}
                                    </div>
                                    <div className="text-[10px] text-white/30">{t.orders_last_30d} este mes</div>
                                </div>

                                {/* Mascotas */}
                                <div className="p-2.5 bg-black/20 rounded-xl space-y-1">
                                    <div className="text-[10px] font-bold text-white/40 uppercase">Mascotas en CRM</div>
                                    <div className="text-sm font-black text-emerald-300">
                                        {t.pets_count}
                                    </div>
                                    <div className="text-[10px] text-white/30">fichas activas</div>
                                </div>

                                {/* Actividad Web / Tráfico */}
                                <div className="p-2.5 bg-black/20 rounded-xl space-y-1">
                                    <div className="text-[10px] font-bold text-white/40 uppercase">Tráfico Form (30d)</div>
                                    <div className="text-sm font-black text-amber-300">
                                        {t.events_last_30d}
                                    </div>
                                    <div className="text-[10px] text-white/30">interacciones</div>
                                </div>
                            </div>

                            {/* Barra de impacto relativo en el SaaS */}
                            <div className="space-y-1.5 pt-1">
                                <div className="flex items-center justify-between text-[10px] font-semibold text-white/40">
                                    <span>Impacto de almacenamiento en el SaaS</span>
                                    <span className="text-white/60 font-black">{t.pct_of_total_storage}%</span>
                                </div>
                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary rounded-full"
                                        style={{ width: `${Math.min(t.pct_of_total_storage, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredTenants.length === 0 && (
                        <div className="col-span-full py-8 text-center text-sm text-white/40">
                            No se encontraron crematorios con ese criterio.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
