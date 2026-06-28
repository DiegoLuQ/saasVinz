"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { Clock, CheckCircle, XCircle, Trash2, ArrowUpRight, Search } from 'lucide-react';
import { translateCycle, translateStatus } from './translations';
import EmptyState from './EmptyState';

type FilterValue = 'pending' | 'completed' | 'all';

interface TransactionsTableProps {
    transactions: any[];
    onApprove: (txn: any) => void;
    onReject: (txn: any) => void;
    onPreviewReceipt: (txn: any) => void;
    onDeleteSingle: (txn: any) => void;
    onBatchDelete: (ids: number[]) => void;
}

function TransactionsTable({
    transactions,
    onApprove,
    onReject,
    onPreviewReceipt,
    onDeleteSingle,
    onBatchDelete,
}: TransactionsTableProps) {
    // State LOCAL (no contamina al padre)
    const [filter, setFilter] = useState<FilterValue>('pending');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const filtered = useMemo(() => {
        if (filter === 'all') return transactions;
        return transactions.filter(txn => txn.payment_status === filter);
    }, [transactions, filter]);

    // Limpiar selección cuando cambia el filtro
    const setFilterAndClear = useCallback((next: FilterValue) => {
        setFilter(next);
        setSelectedIds([]);
    }, []);

    const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;

    const toggleSelectAll = useCallback(() => {
        if (allSelected) setSelectedIds([]);
        else setSelectedIds(filtered.map(t => t.id));
    }, [allSelected, filtered]);

    const toggleSelectOne = useCallback((id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    }, []);

    const handleBatchClick = useCallback(() => {
        if (!selectedIds.length) return;
        onBatchDelete(selectedIds);
        setSelectedIds([]);
    }, [selectedIds, onBatchDelete]);

    return (
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden">
            <div className="p-8 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-3">
                    <Clock className="text-yellow-500" size={24} />
                    Cola de Aprobación
                </h3>

                <div className="flex items-center gap-4">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBatchClick}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                            <Trash2 size={12} /> Eliminar ({selectedIds.length})
                        </button>
                    )}

                    <div className="flex gap-2">
                        {(['pending', 'completed', 'all'] as FilterValue[]).map(t => (
                            <button
                                key={t}
                                onClick={() => setFilterAndClear(t)}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                                    filter === t ? 'bg-primary text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
                                }`}
                            >
                                {t === 'pending' ? 'Pendientes' : t === 'completed' ? 'Completadas' : 'Todas'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-[10px] uppercase font-black text-white/30 tracking-widest">
                        <tr>
                            <th className="px-8 py-5 w-4">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={toggleSelectAll}
                                    className="rounded border-white/20 bg-white/5 text-primary focus:ring-primary/50"
                                />
                            </th>
                            <th className="px-8 py-5">Tenant / Empresa</th>
                            <th className="px-8 py-5">Solicitud</th>
                            <th className="px-8 py-5">Monto</th>
                            <th className="px-8 py-5">Fecha</th>
                            <th className="px-8 py-5 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6}>
                                    <EmptyState
                                        title={
                                            filter === 'pending' ? 'Sin solicitudes pendientes' :
                                            filter === 'completed' ? 'Sin transacciones completadas' :
                                            'Sin transacciones registradas'
                                        }
                                    />
                                </td>
                            </tr>
                        ) : (
                            filtered.map(txn => {
                                const isSelected = selectedIds.includes(txn.id);
                                const cycle = txn.effective_billing_cycle || txn.target_billing_cycle || 'monthly';
                                let months = 1;
                                if (cycle === 'bimonthly') months = 2;
                                else if (cycle === 'semiannual') months = 6;
                                else if (cycle === 'annual') months = 12;
                                const monthlyPrice = txn.amount / months;

                                return (
                                    <tr
                                        key={txn.id}
                                        className={`hover:bg-white/5 transition-colors group ${isSelected ? 'bg-primary/5' : ''}`}
                                    >
                                        <td className="px-8 py-6">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelectOne(txn.id)}
                                                className="rounded border-white/20 bg-white/5 text-primary focus:ring-primary/50"
                                            />
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="font-bold text-white flex items-center gap-2">
                                                {txn.tenant_name || `ID #${txn.tenant_id}`}
                                                <button className="p-1 text-primary/40 hover:text-primary transition-colors">
                                                    <ArrowUpRight size={14} />
                                                </button>
                                            </div>
                                            <div className="text-[10px] text-white/30 font-mono mt-1 uppercase tracking-wider">
                                                {txn.tenant_slug || 'SaaS Database ID'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="text-sm font-medium text-white/70 max-w-md">
                                                {txn.notes || 'Cambio de suscripción manual'}
                                            </div>
                                            <div className="flex gap-2 mt-2">
                                                <span className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-bold uppercase">
                                                    Plan: {txn.target_plan_name || 'NORMAL'}
                                                 </span>
                                                 <span className="text-[9px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded font-bold uppercase border border-purple-500/20">
                                                     {translateCycle(cycle)}
                                                 </span>
                                             </div>
                                         </td>
                                         <td className="px-8 py-6">
                                             <div className="text-xl font-black text-green-400">
                                                 ${txn.amount.toLocaleString()}
                                             </div>
                                             <div className="text-[11px] text-white/70 mt-1 font-medium">
                                                 ${Math.round(monthlyPrice).toLocaleString()}/mes ({months} {months === 1 ? 'mes' : 'meses'})
                                             </div>
                                             <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
                                                 {txn.payment_method}
                                             </div>
                                         </td>
                                        <td className="px-8 py-6">
                                            <div className="text-xs font-bold text-white/60">
                                                {new Date(txn.created_at).toLocaleDateString()}
                                            </div>
                                            <div className="text-[10px] text-white/30 mt-1">
                                                {new Date(txn.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end gap-2 items-center">
                                                {txn.payment_status === 'completed' && (
                                                    <button
                                                        onClick={() => onPreviewReceipt(txn)}
                                                        className="p-2 rounded-lg bg-white/5 hover:bg-primary/20 hover:text-primary border border-white/5 transition-all group/dl"
                                                        title="Ver recibo"
                                                    >
                                                        <Search size={16} className="opacity-40 group-hover/dl:opacity-100 transition-opacity" />
                                                    </button>
                                                )}

                                                {txn.payment_status === 'pending' ? (
                                                    <>
                                                        <button
                                                            onClick={() => onApprove(txn)}
                                                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-green-500/20"
                                                        >
                                                            <CheckCircle size={14} /> Aprobar
                                                        </button>
                                                        <button
                                                            onClick={() => onReject(txn)}
                                                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
                                                        >
                                                            <XCircle size={14} /> Rechazar
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                                                            txn.payment_status === 'completed'
                                                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                        }`}>
                                                            {translateStatus(txn.payment_status)}
                                                        </span>
                                                        <button
                                                            onClick={() => onDeleteSingle(txn)}
                                                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                                            title="Eliminar registro"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default React.memo(TransactionsTable);
