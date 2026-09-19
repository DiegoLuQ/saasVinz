"use client";

import React, { useState } from 'react';
import {
    Dog,
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
import SubmissionDetailModal from '@/components/tenant/modals/SubmissionDetailModal';
import { useQueryClient } from '@tanstack/react-query';

const OWNER_ROLES = ['admin', 'contabilidad', 'creator'];
const OPERATOR_ROLES = ['operador_cremacion', 'operator', 'driver'];

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const UNLIMITED = 999999;

const formatCLP = (value: number) => `$${Math.round(value).toLocaleString('es-CL')}`;

type StatusTone = { label: string; className: string };

function statusTone(status: string): StatusTone {
    const s = (status || '').toLowerCase();
    if (['entregado', 'delivered', 'completado', 'completed'].includes(s)) {
        return { label: 'Entregado', className: 'bg-emerald-500/15 text-emerald-500' };
    }
    if (['en_proceso', 'processing', 'ready'].includes(s)) {
        return { label: 'En proceso', className: 'bg-blue-500/15 text-blue-500' };
    }
    if (s === 'coordinado') {
        return { label: 'Coordinado', className: 'bg-violet-500/15 text-violet-500' };
    }
    return { label: 'Pendiente', className: 'bg-orange-500/15 text-orange-500' };
}

function OrderRow({ item, onOpen }: { item: DashboardOrder; onOpen: (id: number) => void }) {
    const tone = statusTone(item.status);
    const isProcessing = tone.label === 'En proceso';

    return (
        <button
            type="button"
            onClick={() => onOpen(item.id)}
            className="w-full text-left flex items-center gap-3 p-3 rounded-2xl bg-foreground/[0.03] border border-foreground/5 hover:border-foreground/15 hover:bg-foreground/[0.06] transition-colors group"
        >
            <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center ring-1 ring-foreground/10 overflow-hidden shrink-0">
                {item.pet_image ? (
                    <img src={getImageUrl(item.pet_image)} className="w-full h-full object-cover" alt={item.pet} />
                ) : (
                    <Dog size={18} className="text-muted-foreground" />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">{item.pet}</p>
                <p className="text-xs text-muted-foreground truncate">
                    {item.client}
                    <span className="hidden sm:inline"> · {item.service_name}</span>
                </p>
            </div>

            <div className="hidden md:block text-right shrink-0 w-24">
                <p className="text-xs font-bold tabular-nums text-foreground">
                    {item.amount > 0 ? formatCLP(item.amount) : '—'}
                </p>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0 w-28">
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${tone.className}`}>
                    {tone.label}
                </span>
                {isProcessing && item.step_name ? (
                    <span className="text-[10px] text-muted-foreground truncate max-w-full">{item.step_name}</span>
                ) : item.time && item.time !== 'N/A' ? (
                    <span className="text-[10px] text-muted-foreground tabular-nums">{item.time}</span>
                ) : null}
            </div>
        </button>
    );
}

function KpiCard({
    label,
    value,
    hint,
    icon: Icon,
    hintClassName = 'text-muted-foreground',
    progress,
    onClick,
}: {
    label: string;
    value: string;
    hint?: React.ReactNode;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    hintClassName?: string;
    progress?: number;
    onClick?: () => void;
}) {
    const progressColor = progress === undefined ? '' : progress >= 90 ? 'bg-red-500' : progress >= 70 ? 'bg-yellow-500' : 'bg-primary';
    return (
        <div
            onClick={onClick}
            className={`glass-card relative overflow-hidden rounded-2xl border border-foreground/5 px-4 py-3.5 ${onClick ? 'cursor-pointer hover:border-foreground/15 transition-colors' : ''}`}
        >
            <div className="flex items-center gap-2 text-muted-foreground">
                <Icon size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
            </div>
            <div className="mt-1.5 text-xl sm:text-2xl font-black tracking-tight text-foreground tabular-nums truncate">{value}</div>
            {hint && <div className={`mt-0.5 text-[11px] font-semibold ${hintClassName}`}>{hint}</div>}
            {progress !== undefined && (
                <div className="absolute bottom-0 left-0 h-1 w-full bg-foreground/5">
                    <div className={`h-full ${progressColor}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
            )}
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-72" />
            <div className="glass-card rounded-3xl p-6 border border-foreground/5 space-y-3">
                <Skeleton className="h-5 w-40" />
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
            </div>
            <StatsSkeleton />
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
    const queryClient = useQueryClient();
    const currentUser = useCurrentUser();
    const [limitModalResource, setLimitModalResource] = useState<string | null>(null);
    const [showQuickRegistrationModal, setShowQuickRegistrationModal] = useState(false);
    const [showQuickTrackingModal, setShowQuickTrackingModal] = useState(false);
    const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);

    const role = currentUser?.role ?? '';
    const isOwner = OWNER_ROLES.includes(role);
    const isOperator = OPERATOR_ROLES.includes(role);
    const firstName = (currentUser?.name || '').trim().split(/\s+/)[0];

    const now = new Date();
    const todayLabel = `${DAYS_ES[now.getDay()]} ${now.getDate()} de ${MONTHS_ES[now.getMonth()]}`;

    const rawSubmissions = useInitialSubmissions();
    const pendingSubmissions = rawSubmissions.filter((s: BootstrapSubmissionData) => s.status === 'pending' || s.status === 'pendiente');

    const openOrder = (id: number) => router.push(`/dashboard/recepcion-pedidos?orden=${id}`);
    const refreshAfterSubmission = () => {
        queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
        setSelectedSubmissionId(null);
    };

    if (isError && !data) {
        return (
            <div className="glass-card rounded-3xl border border-red-500/20 p-8 text-center space-y-3">
                <AlertTriangle className="mx-auto text-red-500" size={28} />
                <p className="font-bold text-foreground">No se pudo cargar el resumen.</p>
                <button
                    onClick={() => refetch()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 text-sm font-bold"
                >
                    <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} /> Reintentar
                </button>
            </div>
        );
    }

    if (!data) return <DashboardSkeleton />;

    const { stats, limits } = data;
    const todayItems = data.today_cremations ?? [];
    const otherActive = data.recent_cremations ?? [];
    const hiddenActive = Math.max(data.active_count - otherActive.length - todayItems.filter(i => statusTone(i.status).label !== 'Entregado').length, 0);

    const revenuePct = stats.previous_month_revenue > 0
        ? ((stats.monthly_revenue - stats.previous_month_revenue) / stats.previous_month_revenue) * 100
        : null;

    const ordersQuota = limits.orders;
    const hasOrdersCap = ordersQuota.max > 0 && ordersQuota.max < UNLIMITED;
    const ordersPct = hasOrdersCap ? (ordersQuota.usage / ordersQuota.max) * 100 : undefined;

    const limitsHit = isOwner ? reachedLimits(data) : [];

    return (
        <div className="space-y-6">
            {/* Encabezado + acciones rápidas */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{todayLabel}</p>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground leading-tight mt-1">
                        {firstName ? `Hola, ${firstName}` : 'Hola'}
                    </h1>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setShowQuickTrackingModal(true)}
                        className="px-4 py-2.5 rounded-xl bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 font-bold text-sm text-foreground transition-colors flex items-center gap-2"
                        title="Buscar orden en vivo y compartir tracking"
                    >
                        <Compass size={16} className="text-primary" />
                        Buscar tracking
                    </button>
                    <button
                        onClick={() => setShowQuickRegistrationModal(true)}
                        className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Registro rápido
                    </button>
                </div>
            </div>

            {/* Solicitudes web pendientes */}
            {pendingSubmissions.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500 shrink-0">
                            <Inbox size={20} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground">
                                {pendingSubmissions.length} solicitud{pendingSubmissions.length !== 1 ? 'es' : ''} web pendiente{pendingSubmissions.length !== 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-muted-foreground">Revísalas y conviértelas en orden de cremación.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {pendingSubmissions.slice(0, 3).map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setSelectedSubmissionId(s.id)}
                                className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 hover:bg-amber-500/25 px-3 py-1.5 rounded-lg border border-amber-500/20 transition-colors"
                            >
                                {s.pet_name && s.pet_name !== 'N/A' ? s.pet_name : s.owner_name || `#${s.id}`}
                                <ArrowRight size={12} />
                            </button>
                        ))}
                        {pendingSubmissions.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{pendingSubmissions.length - 3} en la campana</span>
                        )}
                    </div>
                </div>
            )}

            {/* Límite del plan alcanzado (antes era un modal que saltaba en cada visita) */}
            {limitsHit.length > 0 && (
                <button
                    onClick={() => setLimitModalResource(limitsHit[0].name)}
                    className="w-full text-left p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center gap-3 hover:bg-red-500/15 transition-colors"
                >
                    <AlertTriangle size={18} className="text-red-500 shrink-0" />
                    <span className="text-sm text-foreground flex-1">
                        Alcanzaste el límite mensual de <strong>{limitsHit.map(l => l.name).join(', ')}</strong> de tu plan.
                    </span>
                    <span className="text-xs font-bold text-red-500 flex items-center gap-1 shrink-0">
                        Mejorar plan <ArrowRight size={12} />
                    </span>
                </button>
            )}

            {/* Órdenes: hoy + en curso */}
            <section className="glass-card rounded-3xl border border-foreground/5 p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                        <CalendarDays size={18} className="text-primary" />
                        Órdenes
                        {data.active_count > 0 && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {data.active_count} abierta{data.active_count !== 1 ? 's' : ''}
                            </span>
                        )}
                    </h2>
                    <button
                        onClick={() => router.push('/dashboard/recepcion-pedidos')}
                        className="text-xs font-bold text-primary hover:underline underline-offset-4 flex items-center gap-1"
                    >
                        Ver todas <ArrowRight size={12} />
                    </button>
                </div>

                <div className="space-y-5">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                            Programadas para hoy{todayItems.length > 0 ? ` · ${todayItems.length}` : ''}
                        </p>
                        {todayItems.length > 0 ? (
                            <div className="space-y-2">
                                {todayItems.map(item => <OrderRow key={item.id} item={item} onOpen={openOrder} />)}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground/70 italic">Sin cremaciones programadas para hoy.</p>
                        )}
                    </div>

                    {otherActive.length > 0 && (
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">En curso</p>
                            <div className="space-y-2">
                                {otherActive.map(item => <OrderRow key={item.id} item={item} onOpen={openOrder} />)}
                            </div>
                            {hiddenActive > 0 && (
                                <button
                                    onClick={() => router.push('/dashboard/recepcion-pedidos')}
                                    className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    + {hiddenActive} más
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* Indicadores del mes */}
            {!isOperator && (
                <section className={`grid grid-cols-2 gap-3 sm:gap-4 ${isOwner ? 'lg:grid-cols-4' : ''}`}>
                    {isOwner && (
                        <KpiCard
                            label="Ingresos del mes"
                            value={formatCLP(stats.monthly_revenue)}
                            icon={TrendingUp}
                            hint={revenuePct !== null ? (
                                <span className="inline-flex items-center gap-1">
                                    {revenuePct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    {revenuePct >= 0 ? '+' : ''}{revenuePct.toFixed(1)}% vs. mismo período mes anterior
                                </span>
                            ) : 'Órdenes entregadas este mes'}
                            hintClassName={revenuePct === null ? 'text-muted-foreground' : revenuePct >= 0 ? 'text-emerald-500' : 'text-red-500'}
                        />
                    )}
                    {isOwner && (
                        <KpiCard
                            label="Por cobrar"
                            value={formatCLP(stats.pending_revenue)}
                            icon={Wallet}
                            hint="Órdenes abiertas"
                            onClick={() => router.push('/dashboard/recepcion-pedidos')}
                        />
                    )}
                    <KpiCard
                        label="Entregadas"
                        value={String(stats.cremations_this_month)}
                        icon={CheckCircle2}
                        hint="Este mes"
                    />
                    <KpiCard
                        label="Órdenes del plan"
                        value={hasOrdersCap ? `${ordersQuota.usage} / ${ordersQuota.max}` : String(ordersQuota.usage)}
                        icon={Gauge}
                        hint={hasOrdersCap ? `Quedan ${Math.max(ordersQuota.max - ordersQuota.usage, 0)} este mes` : 'Sin límite mensual'}
                        progress={ordersPct}
                    />
                </section>
            )}

            {/* Tendencia — solo owners */}
            {isOwner && (
                <section className="glass-card rounded-3xl px-5 py-4 sm:px-8 sm:py-6">
                    <h2 className="text-base sm:text-lg font-bold flex items-center text-foreground mb-1">
                        <TrendingUp className="mr-2 text-primary" size={18} />
                        Tendencia últimos 6 meses
                    </h2>
                    <DashboardTrendChart />
                </section>
            )}

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

            <SubmissionDetailModal
                isOpen={selectedSubmissionId !== null}
                submissionId={selectedSubmissionId}
                onClose={() => setSelectedSubmissionId(null)}
                onProcessed={refreshAfterSubmission}
                onDeleted={refreshAfterSubmission}
            />
        </div>
    );
}
