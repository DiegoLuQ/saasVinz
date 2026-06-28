"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    Dog,
    TrendingUp,
    TrendingDown,
    Clock,
    CheckCircle2,
    Loader2,
    Check,
    ArrowRight,
    ShieldCheck,
    Package,
    Layers,
    UserCircle,
    Sparkles,
    Briefcase,
    CalendarDays,
    ChevronDown,
    ChevronUp,
    Inbox,
} from 'lucide-react';
import { getImageUrl } from '@/lib/tenant/api';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/app/(tenant)/tenant/context/TenantContext';
import { StatsSkeleton, Skeleton } from '@/components/tenant/ui/Skeleton';
import { PlanLimitModal } from '@/components/tenant/PlanLimitModal';
import SubmissionsTable from '@/components/tenant/SubmissionsTable';
import DashboardTrendChart from '@/components/tenant/DashboardTrendChart';
import { useDashboardSummary, useCompleteCremation } from '@/hooks/useDashboard';
import { useCurrentUser } from '@/hooks/useSessionBootstrap';

interface RecentCremation {
    id: number;
    pet: string;
    pet_image: string | null;
    client: string;
    service_name: string;
    amount: number;
    status: string;
    step_name?: string;
    time: string;
}

const OWNER_ROLES = ['admin', 'contabilidad', 'creator'];
const OPERATOR_ROLES = ['operador_cremacion', 'operator', 'driver'];

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function CremationRow({ item, onComplete }: { item: RecentCremation; onComplete: (id: number) => void }) {
    const statusLower = item.status.toLowerCase();
    const isProcessing = ['processing', 'en_proceso'].includes(statusLower);
    const isPending = ['pending', 'pendiente', 'received', 'recibido'].includes(statusLower);

    return (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-foreground/5 border border-foreground/5 hover:border-foreground/10 transition-all group overflow-hidden">
            <div className="flex items-center flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center font-bold text-xs ring-1 ring-foreground/10 uppercase overflow-hidden flex-shrink-0">
                    {item.pet_image ? (
                        <img src={getImageUrl(item.pet_image)} className="w-full h-full object-cover" alt={item.pet} />
                    ) : (
                        <Dog size={20} className="text-muted-foreground" />
                    )}
                </div>
                <div className="ml-3 truncate">
                    <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">{item.pet}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.client}</p>
                </div>
            </div>

            <div className="flex-1 hidden sm:block px-3 border-l border-foreground/5 truncate">
                <p className="text-xs font-bold truncate text-foreground">{item.service_name}</p>
                <p className="text-[9px] text-emerald-400 font-bold mt-0.5">
                    {item.amount > 0 ? `$${item.amount.toLocaleString('es-CL')}` : '—'}
                </p>
            </div>

            <div className="flex-1 px-3 border-l border-foreground/5 text-center min-w-[90px]">
                {isProcessing ? (
                    <>
                        <p className="text-[10px] font-black uppercase tracking-tighter text-blue-400">En Proceso</p>
                        {item.step_name && (
                            <p className="text-[9px] text-muted-foreground font-bold mt-0.5 animate-pulse">{item.step_name}</p>
                        )}
                    </>
                ) : isPending ? (
                    <p className="text-[10px] font-black uppercase tracking-tighter text-orange-400">Pendiente</p>
                ) : (
                    <p className="text-[10px] font-black uppercase tracking-tighter text-emerald-400">
                        {item.status.replace('_', ' ')}
                    </p>
                )}
                {!isProcessing && (
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-medium">Estado</p>
                )}
                {item.time && item.time !== 'N/A' && (
                    <p className="text-[9px] text-muted-foreground/50 mt-0.5">{item.time}</p>
                )}
            </div>

            <div className="flex items-center gap-2 ml-3">
                {!['entregado', 'delivered', 'completado', 'completed', 'cancelado', 'canceled'].includes((item.status || '').toLowerCase()) && (
                    <button
                        onClick={() => onComplete(item.id)}
                        className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95"
                        title="Marcar como entregada"
                    >
                        <Check size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const { data } = useDashboardSummary();
    const completeCremationMutation = useCompleteCremation();
    const router = useRouter();
    const { tenantData } = useTenant();
    const currentUser = useCurrentUser();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [exceededResource, setExceededResource] = useState<{ name: string; icon: React.ComponentType } | null>(null);
    const [catalogExpanded, setCatalogExpanded] = useState(false);

    const isRegistrarBloqueado = false;

    const role = currentUser?.role ?? '';
    const isOwner = OWNER_ROLES.includes(role);
    const isOperator = OPERATOR_ROLES.includes(role);
    const showFinancials = isOwner && !isRegistrarBloqueado;
    const showTrend = isOwner && !isRegistrarBloqueado;
    const showCatalogCards = isOwner && !isRegistrarBloqueado;
    const showSubmissions = !isOperator;

    const now = new Date();
    const todayLabel = `${DAYS_ES[now.getDay()]} ${now.getDate()} ${MONTHS_ES[now.getMonth()]}`;

    const monthlyRevenue = data?.stats.monthly_revenue || 0;
    const previousRevenue = data?.stats.previous_month_revenue || 0;
    const revenuePct = previousRevenue > 0
        ? ((monthlyRevenue - previousRevenue) / previousRevenue) * 100
        : null;

    const todayItems: RecentCremation[] = data?.today_cremations ?? [];

    useEffect(() => {
        if (!data?.limits) return;
        const limits = [
            { name: 'Clientes', usage: data.limits.customers.usage, max: data.limits.customers.max, icon: Users },
            { name: 'Mascotas', usage: data.limits.pets.usage, max: data.limits.pets.max, icon: Dog },
            { name: 'Cremaciones', usage: data.limits.orders.usage, max: data.limits.orders.max, icon: CheckCircle2 },
        ];
        const exceeded = limits.find(l => l.max > 0 && l.usage >= l.max);
        if (exceeded) {
            const t = setTimeout(() => {
                setExceededResource({ name: exceeded.name, icon: exceeded.icon });
                setShowUpgradeModal(true);
            }, 0);
            return () => clearTimeout(t);
        }
    }, [data]);

    const handleComplete = async (id: number) => {
        await completeCremationMutation.mutateAsync(id);
    };

    const formatLimit = (usage: number, max: number) => {
        const maxDisplay = max >= 999999 ? '∞' : max;
        return `${usage} / ${maxDisplay}`;
    };

    const primaryCards = [
        {
            name: 'Clientes',
            value: data?.stats.total_customers || 0,
            usage: data?.limits?.customers?.usage || 0,
            max: data?.limits?.customers?.max || 0,
            quota: data?.limits?.customers ? formatLimit(data.limits.customers.usage, data.limits.customers.max) : '0 / 0',
            icon: Users,
            limitInfo: 'Cuota Mensual',
            href: '/dashboard/clientes',
        },
        {
            name: 'Mascotas',
            value: data?.stats.total_pets || 0,
            usage: data?.limits?.pets?.usage || 0,
            max: data?.limits?.pets?.max || 0,
            quota: data?.limits?.pets ? formatLimit(data.limits.pets.usage, data.limits.pets.max) : '0 / 0',
            icon: Dog,
            limitInfo: 'Cuota Mensual',
            href: '/dashboard/mascotas',
        },
        {
            name: 'Cremaciones',
            value: data?.stats.cremations_this_month || 0,
            usage: data?.limits?.orders?.usage || 0,
            max: data?.limits?.orders?.max || 0,
            quota: data?.limits?.orders ? formatLimit(data.limits.orders.usage, data.limits.orders.max) : '0 / 0',
            icon: CheckCircle2,
            limitInfo: 'Cuota Mensual',
            href: '/dashboard/operaciones',
        },
        {
            name: 'Usuarios',
            value: data?.stats.total_users || 0,
            usage: data?.stats.total_users || 0,
            max: tenantData?.subscription_plan?.max_users || 0,
            quota: tenantData?.subscription_plan
                ? `${data?.stats.total_users || 0} / ${tenantData.subscription_plan.max_users}`
                : null,
            icon: UserCircle,
            limitInfo: 'Staff',
            href: '/dashboard/configuracion',
        },
    ];

    const catalogCards = [
        {
            name: 'Socios',
            value: data?.limits?.partners ? data.limits.partners.usage : 0,
            usage: data?.limits?.partners?.usage || 0,
            max: data?.limits?.partners?.max || 0,
            quota: data?.limits?.partners ? formatLimit(data.limits.partners.usage, data.limits.partners.max) : '0 / 0',
            icon: Briefcase,
            limitInfo: 'Cuota Plan',
            href: '/dashboard/partners',
        },
        {
            name: 'Servicios',
            value: data?.limits?.services ? data.limits.services.usage : (data?.stats.total_services || 0),
            usage: data?.limits?.services?.usage || 0,
            max: data?.limits?.services?.max || 0,
            quota: data?.limits?.services ? formatLimit(data.limits.services.usage, data.limits.services.max) : 'Catálogo',
            icon: ShieldCheck,
            limitInfo: 'Catálogo',
            href: '/dashboard/gestion-servicios',
        },
        {
            name: 'Productos',
            value: data?.limits?.products ? data.limits.products.usage : 0,
            usage: data?.limits?.products?.usage || 0,
            max: data?.limits?.products?.max || 0,
            quota: data?.limits?.products ? formatLimit(data.limits.products.usage, data.limits.products.max) : '0 / 0',
            icon: Package,
            limitInfo: 'Inventario',
            href: '/dashboard/inventario',
        },
        {
            name: 'Planes',
            value: data?.limits?.plans ? data.limits.plans.usage : 0,
            usage: data?.limits?.plans?.usage || 0,
            max: data?.limits?.plans?.max || 0,
            quota: data?.limits?.plans ? formatLimit(data.limits.plans.usage, data.limits.plans.max) : '0 / 0',
            icon: Layers,
            limitInfo: 'Planes',
            href: '/dashboard/gestion-servicios',
        },
    ];

    if (!data) {
        return (
            <div className="space-y-8">
                {/* Stats Skeleton */}
                <StatsSkeleton />
                
                {/* Chart Skeleton */}
                <div className="glass-card rounded-3xl p-6 border border-white/5 space-y-4">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-64 w-full rounded-2xl" />
                </div>

                {/* Recent Activity Skeleton */}
                <div className="glass-card rounded-3xl p-6 border border-white/5 space-y-4">
                    <Skeleton className="h-6 w-36" />
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/2 border border-white/5">
                                <div className="flex items-center space-x-3">
                                    <Skeleton className="h-10 w-10 rounded-xl" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                </div>
                                <Skeleton className="h-4 w-20 animate-pulse rounded-lg bg-white/5" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const renderStatCard = (stat: typeof primaryCards[0]) => {
        const percentage = stat.max > 0 ? (stat.usage / stat.max) * 100 : 0;
        const isHigh = percentage >= 75 && stat.max < 999999;
        const isMid = percentage >= 50 && percentage < 75 && stat.max < 999999;
        const isLimitReached = percentage >= 100 && stat.max < 999999;

        const colorClass = (isLimitReached || isHigh)
            ? 'bg-red-500/10 text-red-500'
            : isMid
                ? 'bg-yellow-500/10 text-yellow-500'
                : 'bg-primary/10 text-primary';

        const borderClass = (isLimitReached || isHigh)
            ? 'border-red-500/30 ring-1 ring-red-500/10 shadow-[0_0_20px_-5px_rgba(239,68,68,0.2)]'
            : isMid
                ? 'border-yellow-500/30 shadow-[0_0_20px_-5px_rgba(234,179,8,0.1)]'
                : 'border-foreground/5';

        return (
            <motion.div
                key={stat.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => stat.href && router.push(stat.href)}
                className={`glass-card px-3 sm:px-4 py-3 rounded-2xl relative overflow-hidden group transition-all duration-300 border ${borderClass} flex flex-col justify-between h-24 ${stat.href ? 'cursor-pointer' : ''}`}
            >
                <div className="flex items-center justify-between relative z-10 gap-2 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className={`p-1.5 rounded-lg transition-colors duration-500 shrink-0 ${colorClass}`}>
                            <stat.icon size={16} />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">{stat.name}</span>
                    </div>
                    <div className="text-lg sm:text-xl font-black tracking-tight leading-none text-foreground tabular-nums shrink-0">{stat.value}</div>
                </div>

                <div className="relative z-10 flex items-center justify-between mt-2 pt-2 border-t border-foreground/5">
                    <div className="text-[8px] text-muted-foreground/60 font-black uppercase tracking-tighter">{stat.limitInfo}</div>
                    {stat.quota ? (
                        <div className={`text-[10px] font-bold uppercase transition-colors ${(isLimitReached || isHigh) ? 'text-red-400' : isMid ? 'text-yellow-400' : 'text-primary'}`}>
                            {stat.quota}
                        </div>
                    ) : (
                        <div className="text-[10px] font-bold text-emerald-400 uppercase">Activo</div>
                    )}
                </div>

                <div className={`absolute -right-2 -bottom-2 opacity-[0.03] group-hover:scale-105 transition-all duration-500 ${(isLimitReached || isHigh) ? 'text-red-500' : isMid ? 'text-yellow-500' : 'text-primary'}`}>
                    <stat.icon size={50} />
                </div>

                {stat.max > 0 && stat.max < 999999 && (
                    <div className="absolute bottom-0 left-0 h-1 bg-foreground/5 w-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(percentage, 100)}%` }}
                            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                            className={`h-full ${isLimitReached || isHigh ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : isMid ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]'}`}
                        />
                    </div>
                )}
            </motion.div>
        );
    };

    return (
        <div className="space-y-8">

            {/* Panel HOY */}
            <div className={`rounded-3xl border p-5 sm:p-6 ${todayItems.length > 0 ? 'bg-orange-500/5 border-orange-500/20' : 'glass-card border-foreground/5'}`}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold flex items-center gap-2 text-foreground">
                        <div className={`p-1.5 rounded-lg ${todayItems.length > 0 ? 'bg-orange-500/15 text-orange-400' : 'bg-primary/10 text-primary'}`}>
                            <CalendarDays size={16} />
                        </div>
                        <span>Hoy — {todayLabel}</span>
                        {todayItems.length > 0 && (
                            <span className="ml-1 text-[9px] font-black uppercase tracking-widest bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                                {todayItems.length} programada{todayItems.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </h2>
                    <button
                        onClick={() => router.push('/dashboard/operaciones')}
                        className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline flex items-center gap-1 underline-offset-4"
                    >
                        Ver todas <ArrowRight size={12} />
                    </button>
                </div>

                {todayItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {todayItems.map((item) => {
                            const statusLower = item.status.toLowerCase();
                            const isProcessing = ['processing', 'en_proceso'].includes(statusLower);
                            const isPending = ['pending', 'pendiente', 'received', 'recibido'].includes(statusLower);
                            return (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-3 p-3 rounded-2xl bg-background/50 border border-foreground/8 hover:border-foreground/15 transition-all group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-foreground/5 flex items-center justify-center ring-1 ring-foreground/10 overflow-hidden flex-shrink-0">
                                        {item.pet_image ? (
                                            <img src={getImageUrl(item.pet_image)} className="w-full h-full object-cover" alt={item.pet} />
                                        ) : (
                                            <Dog size={18} className="text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <p className="font-bold text-sm text-foreground truncate">{item.pet}</p>
                                            <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md flex-shrink-0 ${isProcessing ? 'bg-blue-500/15 text-blue-400' : isPending ? 'bg-orange-500/15 text-orange-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                                                {isProcessing ? 'En proceso' : isPending ? 'Pendiente' : item.status}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground truncate">{item.client}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {item.time && item.time !== 'N/A' && (
                                                <span className="text-[9px] font-bold text-orange-400/80">{item.time}</span>
                                            )}
                                            <span className="text-[9px] text-muted-foreground/60 truncate">{item.service_name}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground/50 italic">Sin cremaciones programadas para hoy.</p>
                )}
            </div>

            {/* Header with Welcome Message & Financial Cards */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-4">
                <div className="text-center md:text-left">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground leading-tight">Bienvenido de nuevo, 👋</h1>
                    <p className="text-muted-foreground mt-2 text-sm sm:text-base md:text-lg font-medium">Aquí tienes lo que está pasando hoy en tu negocio.</p>
                </div>

                {showFinancials && (
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        {/* Ingresos */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02 }}
                            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 shadow-primary/10 p-0.5 shadow-lg w-full sm:min-w-[220px] group"
                        >
                            <div className="relative h-full bg-card/50 backdrop-blur-sm rounded-xl px-4 py-2.5 flex items-center justify-between gap-4 min-w-0">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <div className="p-1 rounded-md bg-primary/20 text-primary">
                                            <Sparkles size={10} />
                                        </div>
                                        <span className="text-[9px] font-bold text-primary/80 uppercase tracking-widest">Ingresos</span>
                                    </div>
                                    <div className="text-xl sm:text-2xl font-black tracking-tighter text-foreground drop-shadow-sm tabular-nums break-all">
                                        ${monthlyRevenue.toLocaleString('es-CL')}
                                    </div>
                                    {revenuePct !== null ? (
                                        <div className={`flex items-center gap-1 text-[9px] font-bold mt-0.5 ${revenuePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {revenuePct >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                            {revenuePct >= 0 ? '+' : ''}{revenuePct.toFixed(1)}% vs. mes anterior
                                        </div>
                                    ) : (
                                        <div className="text-[8px] font-semibold text-primary/60 uppercase tracking-tight">Este Mes</div>
                                    )}
                                </div>
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-500 shrink-0">
                                    <TrendingUp size={16} className="text-primary" />
                                </div>
                            </div>
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse" />
                        </motion.div>

                        {/* Pendientes */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => router.push('/dashboard/operaciones')}
                            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500/20 via-yellow-500/5 to-transparent border border-yellow-500/20 shadow-yellow-500/10 p-0.5 shadow-lg w-full sm:min-w-[200px] group cursor-pointer"
                        >
                            <div className="relative h-full bg-card/50 backdrop-blur-sm rounded-xl px-4 py-2.5 flex items-center justify-between gap-4 min-w-0">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <div className="p-1 rounded-md bg-yellow-500/20 text-yellow-500">
                                            <Sparkles size={10} />
                                        </div>
                                        <span className="text-[9px] font-bold text-yellow-500/80 uppercase tracking-widest">$ Pendientes</span>
                                    </div>
                                    <div className="text-xl sm:text-2xl font-black tracking-tighter text-foreground drop-shadow-sm tabular-nums break-all">
                                        ${(data?.stats.pending_revenue || 0).toLocaleString('es-CL')}
                                    </div>
                                    <div className="text-[8px] font-semibold text-yellow-500/60 uppercase tracking-tight">Por Cobrar</div>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 group-hover:bg-yellow-500/20 group-hover:scale-110 transition-all duration-500 shrink-0">
                                    <Clock size={16} className="text-yellow-500" />
                                </div>
                            </div>
                            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/0 via-yellow-500/10 to-yellow-500/0 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse" />
                        </motion.div>
                    </div>
                )}
            </div>

            {/* Primary Stats Grid — se oculta solo para operadores puros */}
            {!isOperator && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {primaryCards.map(renderStatCard)}
                </div>
            )}

            {/* Catalog Cards — colapsable, solo owners */}
            {showCatalogCards && (
                <div>
                    <button
                        onClick={() => setCatalogExpanded(v => !v)}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 hover:text-muted-foreground transition-colors mb-3 group"
                    >
                        {catalogExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        Límites del plan
                        <span className="text-[9px] bg-foreground/5 px-2 py-0.5 rounded-full">
                            {catalogCards.map(c => c.name).join(' · ')}
                        </span>
                    </button>
                    {catalogExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
                        >
                            {catalogCards.map(renderStatCard)}
                        </motion.div>
                    )}
                </div>
            )}

            {/* Trend Chart — solo owners */}
            {showTrend && (
                <div className="glass-card rounded-3xl px-5 py-4 sm:px-8 sm:py-6">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="text-base sm:text-lg font-bold flex items-center text-foreground">
                            <TrendingUp className="mr-2 text-primary" size={18} />
                            Tendencia últimos 6 meses
                        </h2>
                    </div>
                    <DashboardTrendChart />
                </div>
            )}

            {/* Actividad Reciente — full width, alta jerarquía */}
            <div className="glass-card rounded-3xl p-5 sm:p-8 border border-primary/10">
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <h2 className="text-lg sm:text-xl font-bold flex items-center text-foreground">
                        <Clock className="mr-2 sm:mr-3 text-primary" size={20} />
                        Actividad Reciente
                    </h2>
                    <button
                        onClick={() => router.push('/dashboard/operaciones')}
                        className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline transition-all underline-offset-4 flex items-center"
                    >
                        Ver todos <ArrowRight size={12} className="ml-1" />
                    </button>
                </div>
                <div className="space-y-3">
                    {data?.recent_cremations && data.recent_cremations.length > 0
                        ? data.recent_cremations.map((item: RecentCremation) => (
                            <CremationRow key={item.id} item={item} onComplete={handleComplete} />
                        ))
                        : <p className="text-center py-10 text-muted-foreground italic text-xs">No hay actividad reciente.</p>
                    }
                </div>
            </div>

            {/* Submissions — jerarquía secundaria, solo si corresponde por rol */}
            {showSubmissions && (
                <div className="glass-card rounded-3xl p-5 sm:p-8 overflow-hidden border border-foreground/5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 rounded-lg bg-foreground/5 text-muted-foreground">
                            <Inbox size={16} />
                        </div>
                        <h2 className="text-base font-bold text-muted-foreground">Bandeja de Entrada</h2>
                    </div>
                    <SubmissionsTable />
                </div>
            )}

            <PlanLimitModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                resourceName={exceededResource?.name}
            />
        </div>
    );
}
