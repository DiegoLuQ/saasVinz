"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
    Dog,
    Users,
    Flame,
    Clock,
    TrendingUp,
    TrendingDown,
    CheckCircle2,
    ArrowRight,
    CalendarDays,
    Inbox,
    Compass,
    Plus,
    Wallet,
    Gauge,
    AlertTriangle,
    RefreshCw,
    Sparkles,
    Heart,
    FileText,
    BarChart3,
    Stamp,
} from 'lucide-react';
import { getImageUrl } from '@/lib/tenant/api';
import { useRouter } from 'next/navigation';
import { StatsSkeleton, Skeleton } from '@/components/tenant/ui/Skeleton';
import { PlanLimitModal } from '@/components/tenant/PlanLimitModal';
import DashboardTrendChart from '@/components/tenant/DashboardTrendChart';
import { useDashboardSummary, type DashboardOrder, type DashboardSummary } from '@/hooks/useDashboard';
import { useCurrentUser, useInitialSubmissions, type BootstrapSubmissionData } from '@/hooks/useSessionBootstrap';
import QuickRegistrationModal from '@/components/tenant/dashboard/QuickRegistrationModal';
import QuickTrackingModal from '@/components/tenant/dashboard/QuickTrackingModal';

const OWNER_ROLES = ['admin', 'contabilidad', 'creator'];
const OPERATOR_ROLES = ['operador_cremacion', 'operator', 'driver'];

const UNLIMITED = 999999;
const formatCLP = (value: number) => `$${Math.round(value).toLocaleString('es-CL')}`;

type StatusTone = { label: string; className: string };

function statusTone(status: string): StatusTone {
    const s = (status || '').toLowerCase();
    if (['entregado', 'delivered', 'completado', 'completed'].includes(s)) {
        return { label: 'Entregado', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 font-bold' };
    }
    if (['cremacion', 'cremando', 'en_horno'].includes(s)) {
        return { label: 'Cremación', className: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200/80 dark:border-sky-800/60 font-bold' };
    }
    if (['recuperacion', 'enfriamiento', 'cenizas'].includes(s)) {
        return { label: 'Recuperación', className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60 font-bold' };
    }
    if (['en_proceso', 'processing', 'ready'].includes(s)) {
        return { label: 'En proceso', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 font-bold' };
    }
    if (s === 'coordinado') {
        return { label: 'Coordinado', className: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/80 dark:border-purple-800/60 font-bold' };
    }
    return { label: 'Pendiente', className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60 font-bold' };
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-44 w-full rounded-3xl" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full rounded-3xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <Skeleton className="lg:col-span-7 h-80 rounded-3xl" />
                <Skeleton className="lg:col-span-5 h-80 rounded-3xl" />
            </div>
        </div>
    );
}

function reachedLimits(data: DashboardSummary) {
    const monthly = [
        { name: 'Órdenes', item: data.limits.orders },
        { name: 'Clientes', item: data.limits.customers },
        { name: 'Mascotas', item: data.limits.pets },
    ];
    return monthly.filter(l => l.item && l.item.max > 0 && l.item.max < UNLIMITED && l.item.usage >= l.item.max);
}

export default function DashboardPage() {
    const { data, isError, refetch, isFetching } = useDashboardSummary();
    const router = useRouter();
    const currentUser = useCurrentUser();
    const [limitModalResource, setLimitModalResource] = useState<string | null>(null);
    const [showQuickRegistrationModal, setShowQuickRegistrationModal] = useState(false);
    const [showQuickTrackingModal, setShowQuickTrackingModal] = useState(false);

    const role = currentUser?.role ?? '';
    const isOwner = OWNER_ROLES.includes(role);

    const rawSubmissions = useInitialSubmissions();
    const pendingSubmissions = rawSubmissions
        .filter((s: BootstrapSubmissionData) => s.status === 'pending' || s.status === 'pendiente')
        .sort((a: BootstrapSubmissionData, b: BootstrapSubmissionData) =>
            (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) || a.id - b.id
        );

    const openOrder = (id: number) => router.push(`/dashboard/recepcion-pedidos?orden=${id}`);

    if (isError && !data) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-red-500/20 p-8 text-center space-y-3 shadow-xs">
                <AlertTriangle className="mx-auto text-red-500" size={28} />
                <p className="font-bold text-slate-800 dark:text-slate-100">No se pudo cargar el resumen.</p>
                <button
                    onClick={() => refetch()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-sm font-bold text-slate-700 dark:text-slate-200"
                >
                    <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} /> Reintentar
                </button>
            </div>
        );
    }

    if (!data) return <DashboardSkeleton />;

    const { stats } = data;
    const todayItems = data.today_cremations ?? [];
    const otherActive = data.recent_cremations ?? [];
    const allRecentOrders = [...todayItems, ...otherActive].slice(0, 5);

    // KPIs con datos reales del tenant (antes: fallbacks inventados y % fijos)
    const totalPetsCount = stats.total_pets ?? 0;
    const totalClientsCount = stats.total_customers ?? 0;
    // Pendientes = órdenes abiertas (ni entregadas ni canceladas)
    const pendingCount = data.active_count ?? 0;
    const scheduledToday = todayItems.filter(i => statusTone(i.status).label !== 'Entregado').length;

    const limitsHit = isOwner ? reachedLimits(data) : [];

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            {/* ACCESOS RÁPIDOS (arriba del banner) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                    onClick={() => setShowQuickRegistrationModal(true)}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left group"
                >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ring-1 bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/25">
                        <Dog size={17} />
                    </div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Iniciar orden</span>
                </button>
                <button
                    onClick={() => router.push('/dashboard/recepcion-pedidos/registro')}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left group"
                >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ring-1 bg-indigo-100 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/25">
                        <Flame size={17} />
                    </div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Crear orden</span>
                </button>
                <button
                    onClick={() => router.push('/dashboard/documentos')}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left group"
                >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ring-1 bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25">
                        <Stamp size={17} />
                    </div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Generar certificado</span>
                </button>
                <button
                    onClick={() => setShowQuickTrackingModal(true)}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left group"
                >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ring-1 bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/25">
                        <BarChart3 size={17} />
                    </div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Buscar tracking</span>
                </button>
            </div>

            {/* 1. HERO BANNER PANORÁMICO (Exacto al diseño de la imagen) */}
            <div className="relative overflow-hidden rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 min-h-[190px] sm:min-h-[220px] flex items-center bg-[#D8EDFA] dark:bg-[#0B1628]">
                {/* Imagen de fondo nubes & mascotas celestiales */}
                <div
                    className="absolute inset-0 bg-cover bg-no-repeat bg-right dark:opacity-75"
                    style={{
                        backgroundImage: `url('/images/vinzer-hero-banner.jpg')`,
                        backgroundPosition: 'right 20% center',
                    }}
                />

                {/* Degrade suave a la izquierda para máxima legibilidad del texto */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#D8EDFA] via-[#D8EDFA]/85 to-transparent sm:w-2/3 dark:from-[#0B1628] dark:via-[#0B1628]/85" />

                <div className="relative z-10 px-6 sm:px-10 py-6 max-w-xl">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#0A192F] tracking-tight leading-tight dark:text-white">
                        Cada historia<br />merece un adiós digno
                    </h1>
                    <p className="mt-2.5 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-md dark:text-slate-300">
                        Gestiona de forma simple y segura todo el proceso de cremación de mascotas.
                    </p>
                </div>
            </div>

            {/* Solicitudes web pendientes (Alerta compacta si existen) */}
            {pendingSubmissions.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                            <Inbox size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                                {pendingSubmissions.length} solicitud{pendingSubmissions.length !== 1 ? 'es' : ''} web pendiente{pendingSubmissions.length !== 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Revísalas para generar la orden correspondiente.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {pendingSubmissions.slice(0, 3).map((s) => (
                            <button
                                key={s.id}
                                onClick={() => router.push(`/dashboard/registros/${s.id}`)}
                                className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                {s.pet_name && s.pet_name !== 'N/A' ? s.pet_name : s.owner_name || `#${s.id}`}
                                <ArrowRight size={12} />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Alerta de límite de plan */}
            {limitsHit.length > 0 && (
                <button
                    onClick={() => setLimitModalResource(limitsHit[0].name)}
                    className="w-full text-left p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center gap-3 hover:bg-red-500/15 transition-colors"
                >
                    <AlertTriangle size={18} className="text-red-500 shrink-0" />
                    <span className="text-sm text-slate-800 dark:text-slate-200 flex-1">
                        Alcanzaste el límite mensual de <strong>{limitsHit.map(l => l.name).join(', ')}</strong> de tu plan.
                    </span>
                    <span className="text-xs font-bold text-red-500 flex items-center gap-1 shrink-0">
                        Mejorar plan <ArrowRight size={12} />
                    </span>
                </button>
            )}

            {/* 2. KPIs del crematorio (datos reales; comparación mes a la fecha) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    icon={<Dog size={22} />}
                    badge="bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400"
                    label="Total Mascotas"
                    value={totalPetsCount}
                    trend={monthTrend(stats.new_pets_this_month ?? 0, stats.new_pets_previous_month ?? 0, 'nueva', 'nuevas')}
                />
                <KpiCard
                    icon={<Users size={22} />}
                    badge="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                    label="Clientes"
                    value={totalClientsCount}
                    trend={monthTrend(stats.new_customers_this_month ?? 0, stats.new_customers_previous_month ?? 0, 'nuevo', 'nuevos')}
                />
                <KpiCard
                    icon={<Flame size={22} />}
                    badge="bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400"
                    label="Cremaciones del mes"
                    value={stats.cremations_this_month}
                    trend={monthTrend(stats.cremations_this_month, stats.cremations_previous_month ?? 0, 'entregada', 'entregadas')}
                />
                <KpiCard
                    icon={<Clock size={22} />}
                    badge="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                    label="Pendientes"
                    value={pendingCount}
                    trend={{
                        tone: 'flat',
                        text: scheduledToday > 0
                            ? `${scheduledToday} programada${scheduledToday === 1 ? '' : 's'} para hoy`
                            : pendingCount > 0 ? 'Órdenes en curso' : 'Sin órdenes abiertas',
                    }}
                />
            </div>

            {/* 3. SECCIÓN CENTRAL: GRÁFICO (60%) + ÚLTIMOS PROCESOS (40%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Columna Izquierda: Cremaciones por mes */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-[#0A192F] dark:text-white tracking-tight">
                            Cremaciones por mes
                        </h2>
                        <div className="flex items-center gap-3 text-xs font-semibold">
                            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#0EA5E9]" /> 2024
                            </span>
                            <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /> 2025
                            </span>
                        </div>
                    </div>
                    <div className="pt-2 flex-1">
                        <DashboardTrendChart />
                    </div>
                </div>

                {/* Columna Derecha: Últimos procesos */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs flex flex-col">
                    <div className="flex items-center justify-between mb-4 pb-1">
                        <h2 className="text-base font-bold text-[#0A192F] dark:text-white tracking-tight">
                            Últimos procesos
                        </h2>
                        <button
                            onClick={() => router.push('/dashboard/recepcion-pedidos')}
                            className="text-xs font-bold text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-1"
                        >
                            Ver todos <ArrowRight size={12} />
                        </button>
                    </div>

                    {/* Tabla de procesos */}
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                                    <th className="font-semibold pb-2.5">Mascota</th>
                                    <th className="font-semibold pb-2.5">Cliente</th>
                                    <th className="font-semibold pb-2.5">Estado</th>
                                    <th className="font-semibold pb-2.5 text-right">Fecha</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {allRecentOrders.length > 0 ? (
                                    allRecentOrders.map((item) => {
                                        const tone = statusTone(item.status);
                                        return (
                                            <tr
                                                key={item.id}
                                                onClick={() => openOrder(item.id)}
                                                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                                            >
                                                <td className="py-3 flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200/60">
                                                        {item.pet_image ? (
                                                            <img src={getImageUrl(item.pet_image)} className="w-full h-full object-cover" alt={item.pet} />
                                                        ) : (
                                                            <Dog size={14} className="text-slate-400" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-900 dark:text-white truncate group-hover:text-[#0EA5E9] transition-colors">
                                                            {item.pet}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 capitalize">
                                                            {item.service_name?.toLowerCase().includes('gato') ? 'Gato' : 'Perro'}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="py-3 text-slate-600 dark:text-slate-300 truncate max-w-[90px]">
                                                    {item.client}
                                                </td>
                                                <td className="py-3">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block ${tone.className}`}>
                                                        {tone.label}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-right text-slate-400 tabular-nums text-[11px]">
                                                    {item.time && item.time !== 'N/A' ? item.time : 'Hoy'}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                                            Sin procesos recientes hoy
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modales funcionales */}
            <PlanLimitModal
                isOpen={limitModalResource !== null}
                onClose={() => setLimitModalResource(null)}
                resourceName={limitModalResource ?? undefined}
            />

            <QuickRegistrationModal
                isOpen={showQuickRegistrationModal}
                onClose={() => setShowQuickRegistrationModal(false)}
                onSuccess={() => refetch()}
            />

            <QuickTrackingModal
                isOpen={showQuickTrackingModal}
                onClose={() => setShowQuickTrackingModal(false)}
            />
        </div>
    );
}

type Trend = { tone: 'up' | 'down' | 'flat'; text: string; hint?: string };

/** Este mes vs. mes anterior a la misma fecha. Sin base de comparación, muestra el conteo. */
function monthTrend(current: number, previous: number, singular: string, plural: string): Trend {
    const count = `+${current} ${current === 1 ? singular : plural} este mes`;
    if (previous === 0) {
        return { tone: current > 0 ? 'up' : 'flat', text: current > 0 ? count : `Sin ${plural} este mes` };
    }
    const pct = Math.round(((current - previous) / previous) * 100);
    const base = `+${current} este mes`;
    if (pct === 0) return { tone: 'flat', text: `${base} · =`, hint: `Igual que el mes anterior a la misma fecha (${previous})` };
    return {
        tone: pct > 0 ? 'up' : 'down',
        text: `${base} · ${pct > 0 ? '↑' : '↓'}${Math.abs(pct)}%`,
        hint: `Mes anterior a la misma fecha: ${previous}`,
    };
}

function KpiCard({ icon, badge, label, value, trend }: { icon: React.ReactNode; badge: string; label: string; value: number; trend: Trend }) {
    const toneCls = trend.tone === 'up'
        ? 'text-emerald-700 dark:text-emerald-400'
        : trend.tone === 'down' ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400';
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-xs flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${badge}`}>{icon}</div>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">{label}</p>
                <p className="text-2xl font-black text-[#0A192F] dark:text-white tabular-nums tracking-tight mt-0.5">{value}</p>
                <p className={`text-[11px] font-bold mt-0.5 truncate ${toneCls}`} title={trend.hint}>
                    {trend.text}
                </p>
            </div>
        </div>
    );
}
