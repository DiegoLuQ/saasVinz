import React from 'react';
import { Users, Dog, ShoppingCart, Eye, Search } from 'lucide-react';
import type { AdminBootstrapTenant } from '@/hooks/useAdminBootstrap';

interface TenantsTableProps {
    tenants: AdminBootstrapTenant[];
    searchQuery: string;
    limit?: number;
    onViewStats: (tenant: AdminBootstrapTenant) => void;
    onEditTenant: (tenant: AdminBootstrapTenant) => void;
    onSeeAll: () => void;
}

export default function TenantsTable({
    tenants,
    searchQuery,
    limit = 10,
    onViewStats,
    onEditTenant,
    onSeeAll
}: TenantsTableProps) {
    const visibleTenants = tenants.slice(0, limit);
    const hasResults = visibleTenants.length > 0;
    const isFiltering = searchQuery.trim().length > 0;

    return (
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg">Tenants Recientes</h3>
                    {isFiltering && (
                        <p className="text-xs text-white/40 mt-1">
                            {tenants.length} resultado{tenants.length === 1 ? '' : 's'} para "{searchQuery}"
                        </p>
                    )}
                </div>
                <button
                    onClick={onSeeAll}
                    className="text-xs text-primary font-bold hover:underline"
                >
                    Ver todos
                </button>
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
                            ? `No encontramos empresas que coincidan con "${searchQuery}".`
                            : 'Cuando crees tu primer tenant aparecerá aquí.'}
                    </p>
                </div>
            ) : (
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-[10px] uppercase font-bold text-white/40">
                        <tr>
                            <th className="px-6 py-4">Empresa</th>
                            <th className="px-6 py-4">Estado</th>
                            <th className="px-6 py-4">Plan</th>
                            <th className="px-6 py-4">Recursos</th>
                            <th className="px-6 py-4">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {visibleTenants.map((tenant) => (
                            <tr key={tenant.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-medium">{tenant.name}</span>
                                        <span className="text-[10px] text-white/40 font-mono">/{tenant.slug}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${tenant.status === 'active'
                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                        : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                        }`}>
                                        {tenant.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-bold text-xs">{tenant.plan}</td>
                                <td className="px-6 py-4">
                                    {(() => {
                                        const customers = tenant.resources?.customers ?? 0;
                                        const pets = tenant.resources?.pets ?? 0;
                                        const orders = tenant.resources?.orders?.total ?? 0;
                                        const dim = (n: number) => n === 0 ? 'text-white/25' : 'text-white/70';
                                        return (
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`flex items-center gap-1 ${dim(customers)}`} title={`Clientes: ${customers}`}>
                                                        <Users size={14} />
                                                        <span className="text-[10px] tabular-nums">{customers}</span>
                                                    </div>
                                                    <div className={`flex items-center gap-1 ${dim(pets)}`} title={`Mascotas: ${pets}`}>
                                                        <Dog size={14} />
                                                        <span className="text-[10px] tabular-nums">{pets}</span>
                                                    </div>
                                                    <div className={`flex items-center gap-1 ${dim(orders)}`} title={`Pedidos: ${orders}`}>
                                                        <ShoppingCart size={14} />
                                                        <span className="text-[10px] tabular-nums">{orders}</span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => onViewStats(tenant)}
                                                    className="p-1.5 hover:bg-white/10 rounded-lg text-primary transition-colors"
                                                    title="Ver estadísticas detalladas"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            </div>
                                        );
                                    })()}
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => onEditTenant(tenant)}
                                        className="px-5 py-2.5 bg-[#00a3ff] hover:bg-[#0088dd] rounded-xl text-xs font-bold transition-all duration-[600ms] ease-out border border-[#00a3ff]/30 hover:border-[#00a3ff] hover:scale-110 active:scale-95 hover:shadow-2xl hover:shadow-[#00a3ff]/50 text-white"
                                    >
                                        Administrar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {hasResults && tenants.length > limit && (
                <div className="p-4 border-t border-white/5 text-center">
                    <button
                        onClick={onSeeAll}
                        className="text-xs text-white/40 hover:text-primary font-bold"
                    >
                        +{tenants.length - limit} más — Ver todos
                    </button>
                </div>
            )}
        </div>
    );
}
