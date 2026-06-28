import React, { useState } from 'react';
import { CreditCard, CheckCircle, X, MessageCircle } from 'lucide-react';
import type { AdminBootstrapTenant } from '@/hooks/useAdminBootstrap';

interface PendingTransactionsProps {
    pendingTransactions: any[];
    tenants: AdminBootstrapTenant[];
    availablePlans: any[];
    onApprove: (txn: any) => void;
    onReject: (txn: any) => void;
}

export default function PendingTransactions({
    pendingTransactions,
    tenants,
    availablePlans,
    onApprove,
    onReject
}: PendingTransactionsProps) {
    const [editingTxnId, setEditingTxnId] = useState<number | null>(null);
    const [selectedNewPlanId, setSelectedNewPlanId] = useState<number | null>(null);

    if (pendingTransactions.length === 0) return null;

    return (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-6 mb-8 animate-in slide-in-from-top-4">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500">
                    <CreditCard size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-white">Solicitudes de Facturación Pendientes</h3>
                    <p className="text-yellow-500/80 text-sm">
                        Hay {pendingTransactions.length} solicitudes esperando Aprobación.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingTransactions.map((txn) => {
                    const tenant = tenants.find(t => t.id === txn.tenant_id);
                    const isEditing = editingTxnId === txn.id;
                    const currentTargetPlan = availablePlans.find(
                        p => p.id === (isEditing && selectedNewPlanId ? selectedNewPlanId : txn.target_plan_id)
                    );

                    return (
                        <div key={txn.id} className="bg-black/20 rounded-2xl p-5 border border-white/10 flex flex-col justify-between shadow-xl backdrop-blur-md">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[10px] font-black bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full border border-yellow-500/20 uppercase tracking-widest">
                                        Pendiente #{txn.id}
                                    </span>
                                    <span className="text-[10px] font-bold text-white/30 uppercase">
                                        {new Date(txn.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                    </span>
                                </div>
                                <div className="font-black text-white text-lg mb-1">{tenant?.name || `Tenant #${txn.tenant_id}`}</div>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-[10px] font-bold text-white/40 uppercase">Plan Actual:</span>
                                    <span className="text-[10px] font-black text-white/60 bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase">
                                        {tenant?.plan || 'N/A'}
                                    </span>
                                </div>

                                {tenant?.phone && (
                                    <a
                                        href={`https://wa.me/${tenant.phone.replace(/[^0-9]/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mb-4 flex items-center gap-2 text-[10px] font-bold text-green-400 hover:text-green-300 hover:underline transition-colors"
                                    >
                                        <MessageCircle size={12} />
                                        Contactar por WhatsApp
                                    </a>
                                )}

                                {isEditing ? (
                                    <div className="space-y-3 mb-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                        <label className="text-[10px] uppercase font-bold text-primary">Cambiar Plan a:</label>
                                        <select
                                            value={selectedNewPlanId || txn.target_plan_id || ''}
                                            onChange={(e) => setSelectedNewPlanId(Number(e.target.value))}
                                            className="w-full bg-[#0a192f] border border-primary/30 rounded-lg py-2 px-3 text-xs text-white outline-none focus:border-primary"
                                        >
                                            {availablePlans.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} - ${p.price.toLocaleString()}/mes
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => {
                                                setEditingTxnId(null);
                                                setSelectedNewPlanId(null);
                                            }}
                                            className="text-[10px] text-white/40 hover:text-white font-bold"
                                        >
                                            Cancelar edición
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mb-4">
                                        <button
                                            onClick={() => {
                                                setEditingTxnId(txn.id);
                                                setSelectedNewPlanId(txn.target_plan_id);
                                            }}
                                            className="text-[10px] font-black text-primary hover:underline uppercase tracking-wide flex items-center gap-1"
                                        >
                                            Plan Solicitado: {currentTargetPlan?.name || 'Desconocido'} ✏️
                                        </button>
                                        <p className="text-xs text-white/50 italic mt-1 leading-relaxed">
                                            "{txn.notes || 'Sin notas adicionales'}"
                                        </p>
                                    </div>
                                )}

                                <div className="text-2xl font-black text-green-400 mb-6 flex items-baseline gap-1">
                                    <span className="text-sm font-bold opacity-70">$</span>
                                    {txn.amount.toLocaleString()}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onApprove(txn)}
                                    className="flex-1 bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-white py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 border border-green-500/20 hover:border-green-500/50 shadow-lg shadow-green-500/5"
                                >
                                    <CheckCircle size={16} /> APROBAR
                                </button>
                                <button
                                    onClick={() => onReject(txn)}
                                    className="w-12 bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-xl transition-all flex items-center justify-center border border-white/5 hover:border-red-500/30"
                                    title="Rechazar solicitud"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
