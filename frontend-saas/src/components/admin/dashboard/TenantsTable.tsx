import React, { useMemo, useState } from 'react';
import {
    Users,
    Dog,
    ShoppingCart,
    Eye,
    Search,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    MessageCircle,
    Settings2,
    Calendar
} from 'lucide-react';
import type { AdminBootstrapTenant } from '@/hooks/useAdminBootstrap';

interface TenantsTableProps {
    tenants: AdminBootstrapTenant[];
    searchQuery: string;
    limit?: number;
    onViewStats: (tenant: AdminBootstrapTenant) => void;
    onEditTenant: (tenant: AdminBootstrapTenant) => void;
    onSeeAll: () => void;
}

type SortKey = 'name' | 'plan' | 'orders' | 'created_at';
type SortDir = 'asc' | 'desc';

const STATUS_STYLES: Record<string, { label: string; badge: string; dot: string }> = {
    active: {
        label: 'Activo',
        badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        dot: 'bg-emerald-400'
    },
    trial: {
        label: 'Trial',
        badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        dot: 'bg-cyan-400'
    },
    suspended: {
        label: 'Suspendido',
        badge: 'bg-red-500/10 text-red-400 border-red-500/20',
        dot: 'bg-red-400'
    },
    cancelled: {
        label: 'Cancelado',
        badge: 'bg-white/5 text-white/50 border-white/10',
        dot: 'bg-white/40'
    }
};

const PLAN_STYLES: Record<string, string> = {
    FREE: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
    Track: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
    NORMAL: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    PRO: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
    ULTRA: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
};

function formatShortDate(dateStr?: string | null): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function TenantsTable({
    tenants,
    searchQuery,
    limit = 15,
    onViewStats,
    onEditTenant,
    onSeeAll
}: TenantsTableProps) {
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'other'>('all');
    const [planFilter, setPlanFilter] = useState<string>('all');
    const [sortKey, setSortKey] = useState<SortKey>('created_at');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const availablePlanNames = useMemo(() => {
        const set = new Set<string>();
        tenants.forEach((t) => {
            if (t.plan) set.add(t.plan);
        });
        return Array.from(set);
    }, [tenants]);

    const filteredAndSorted = useMemo(() => {
        const filtered = tenants.filter((t) => {
            if (statusFilter === 'active' && t.status !== 'active') return false;
            if (statusFilter === 'other' && t.status === 'active') return false;
            if (planFilter !== 'all' && t.plan !== planFilter) return false;
            return true;
        });

        return [...filtered].sort((a, b) => {
            let cmp = 0;
            if (sortKey === 'name') {
                cmp = (a.name || '').localeCompare(b.name || '');
            } else if (sortKey === 'plan') {
                cmp = (a.plan || '').localeCompare(b.plan || '');
            } else if (sortKey === 'orders') {
                cmp = (a.resources?.orders?.total ?? 0) - (b.resources?.orders?.total ?? 0);
            } else {
                cmp = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [tenants, statusFilter, planFilter, sortKey, sortDir]);

    const visibleTenants = filteredAndSorted.slice(0, limit);
    const hasResults = visibleTenants.length > 0;
    const isFiltering = searchQuery.trim().length > 0 || statusFilter !== 'all' || planFilter !== 'all';

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir(key === 'name' || key === 'plan' ? 'asc' : 'desc');
        }
    };

    const SortIcon = ({ col }: { col: SortKey }) => {
        if (sortKey !== col) return <ArrowUpDown size={11} className="opacity-35" />;
        return sortDir === 'asc'
            ? <ArrowUp size={11} className="text-primary" />
            : <ArrowDown size={11} className="text-primary" />;
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h3 className="font-bold text-lg">Tenants Recientes</h3>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50 tabular-nums">
                            {filteredAndSorted.length}
                        </span>
                    </div>
                    {isFiltering && (
                        <p className="text-xs text-white/40 mt-1">
                            Mostrando {filteredAndSorted.length} de {tenants.length} empresa{tenants.length === 1 ? '' : 's'}
                            {searchQuery.trim() ? ` para "${searchQuery.trim()}"` : ''}
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Filtro rápido por estado */}
                    <div className="inline-flex bg-black/25 border border-white/10 rounded-xl p-1 text-[11px] font-bold">
                        {([
                            { id: 'all', label: 'Todos' },
                            { id: 'active', label: 'Activos' },
                            { id: 'other', label: 'Otros' },
                        ] as const).map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setStatusFilter(tab.id)}
                                className={`px-3 py-1 rounded-lg transition-colors ${statusFilter === tab.id
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-white/50 hover:text-white'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Filtro por plan */}
                    {availablePlanNames.length > 1 && (
                        <select
                            value={planFilter}
                            onChange={(e) => setPlanFilter(e.target.value)}
                            className="bg-black/25 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white/80 outline-none focus:border-primary/50"
                        >
                            <option value="all">Todos los planes</option>
                            {availablePlanNames.map((plan) => (
                                <option key={plan} value={plan}>
                                    Plan {plan}
                                </option>
                            ))}
                        </select>
                    )}

                    <button
                        type="button"
                        onClick={onSeeAll}
                        className="text-xs text-primary font-bold hover:underline px-2 py-1"
                    >
                        Ver todos
                    </button>
                </div>
            </div>

            {!hasResults ? (
                <div className="p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-white/30 mb-4">
                        {isFiltering ? <Search size={24} /> : <Users size={24} />}
                    </div>
                    <p className="font-bold text-white/70 mb-1">
                        {isFiltering ? 'Sin coincidencias' : 'Aún no hay tenants'}
                    </p>
                    <p className="text-xs text-white/40 max-w-sm">
                        {isFiltering
                            ? 'Prueba limpiando los filtros o cambiando el término de búsqueda.'
                            : 'Cuando crees tu primer tenant aparecerá aquí.'}
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[760px]">
                        <thead className="bg-white/5 text-[10px] uppercase font-bold text-white/40">
                            <tr>
                                <th className="px-6 py-4">
                                    <button
                                        type="button"
                                        onClick={() => toggleSort('name')}
                                        className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
                                    >
                                        Empresa <SortIcon col="name" />
                                    </button>
                                </th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4">
                                    <button
                                        type="button"
                                        onClick={() => toggleSort('plan')}
                                        className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
                                    >
                                        Plan / Vigencia <SortIcon col="plan" />
                                    </button>
                                </th>
                                <th className="px-6 py-4">
                                    <button
                                        type="button"
                                        onClick={() => toggleSort('orders')}
                                        className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
                                    >
                                        Recursos <SortIcon col="orders" />
                                    </button>
                                </th>
                                <th className="px-6 py-4">
                                    <button
                                        type="button"
                                        onClick={() => toggleSort('created_at')}
                                        className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
                                    >
                                        Alta <SortIcon col="created_at" />
                                    </button>
                                </th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {visibleTenants.map((tenant) => {
                                const statusCfg = STATUS_STYLES[tenant.status] ?? {
                                    label: tenant.status,
                                    badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                                    dot: 'bg-yellow-400'
                                };
                                const planBadge = PLAN_STYLES[tenant.plan] ?? 'bg-white/10 text-white/80 border-white/15';
                                const customers = tenant.resources?.customers ?? 0;
                                const pets = tenant.resources?.pets ?? 0;
                                const ordersTotal = tenant.resources?.orders?.total ?? 0;
                                const ordersPending = (tenant.resources?.orders?.pending ?? 0) + (tenant.resources?.orders?.in_process ?? 0);
                                const dim = (n: number) => (n === 0 ? 'text-white/25' : 'text-white/80');

                                return (
                                    <tr key={tenant.id} className="hover:bg-white/[0.04] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-semibold text-white group-hover:text-primary transition-colors truncate">
                                                    {tenant.name}
                                                </span>
                                                <div className="flex items-center gap-2 text-[11px] text-white/40">
                                                    <span className="font-mono">/{tenant.slug}</span>
                                                    {tenant.email && (
                                                        <>
                                                            <span className="text-white/20">·</span>
                                                            <span className="truncate max-w-[180px]">{tenant.email}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${statusCfg.badge}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                                                {statusCfg.label}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex flex-col items-start gap-1">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${planBadge}`}>
                                                    {tenant.plan}
                                                </span>
                                                {tenant.billing_end_date ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] text-white/40 tabular-nums">
                                                        <Calendar size={10} />
                                                        Vence {formatShortDate(tenant.billing_end_date)}
                                                    </span>
                                                ) : tenant.revenue > 0 ? (
                                                    <span className="text-[10px] text-white/40 tabular-nums">
                                                        ${tenant.revenue.toLocaleString('es-CL')}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`flex items-center gap-1 ${dim(customers)}`} title={`Clientes: ${customers}`}>
                                                    <Users size={14} />
                                                    <span className="text-xs font-medium tabular-nums">{customers}</span>
                                                </div>
                                                <div className={`flex items-center gap-1 ${dim(pets)}`} title={`Mascotas: ${pets}`}>
                                                    <Dog size={14} />
                                                    <span className="text-xs font-medium tabular-nums">{pets}</span>
                                                </div>
                                                <div className={`flex items-center gap-1 ${dim(ordersTotal)}`} title={`Pedidos totales: ${ordersTotal}${ordersPending > 0 ? ` (${ordersPending} activos)` : ''}`}>
                                                    <ShoppingCart size={14} />
                                                    <span className="text-xs font-medium tabular-nums">{ordersTotal}</span>
                                                    {ordersPending > 0 && (
                                                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20">
                                                            {ordersPending}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-xs text-white/50 tabular-nums whitespace-nowrap">
                                            {formatShortDate(tenant.created_at)}
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => onViewStats(tenant)}
                                                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/70 hover:text-primary transition-colors"
                                                    title="Ver estadísticas detalladas"
                                                >
                                                    <Eye size={15} />
                                                </button>
                                                {tenant.phone && (
                                                    <a
                                                        href={`https://wa.me/${tenant.phone.replace(/[^0-9]/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-emerald-400 transition-colors"
                                                        title={`Contactar por WhatsApp (${tenant.phone})`}
                                                    >
                                                        <MessageCircle size={15} />
                                                    </a>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => onEditTenant(tenant)}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00a3ff] hover:bg-[#0088dd] rounded-xl text-xs font-bold transition-all border border-[#00a3ff]/30 hover:border-[#00a3ff] active:scale-95 text-white shadow-sm shadow-[#00a3ff]/20"
                                                >
                                                    <Settings2 size={13} />
                                                    Administrar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {hasResults && filteredAndSorted.length > limit && (
                <div className="p-4 border-t border-white/5 text-center">
                    <button
                        type="button"
                        onClick={onSeeAll}
                        className="text-xs text-white/40 hover:text-primary font-bold"
                    >
                        +{filteredAndSorted.length - limit} más — Ver todos
                    </button>
                </div>
            )}
        </div>
    );
}
