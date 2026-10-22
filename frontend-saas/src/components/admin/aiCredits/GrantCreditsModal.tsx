"use client";

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Gift, Loader2, X } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';

const BASE = '/api/internal/creator/ai-credits';
const inputCls = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary/60';

export interface GrantTarget {
    tenant_id: number;
    tenant_name: string;
    available: number;
    extra_remaining: number;
}

/** Regalo / venta manual (+) o ajuste (±) del saldo extra de créditos IA de un crematorio. */
export default function GrantCreditsModal({ row, onClose, onDone, onError }: {
    row: GrantTarget; onClose: () => void; onDone: (msg: string) => void; onError: (msg: string) => void;
}) {
    const [amount, setAmount] = useState('3');
    const [reason, setReason] = useState<'gift' | 'purchase' | 'adjust'>('gift');
    const [note, setNote] = useState('');
    const mutation = useMutation({
        mutationFn: () => apiRequest(`${BASE}/tenants/${row.tenant_id}/grant`, {
            method: 'POST', body: { amount: Number(amount), reason, note: note.trim() },
        }),
        onSuccess: (r: { available: number }) => onDone(`${row.tenant_name}: ahora tiene ${r.available} créditos disponibles`),
        onError: (e: Error) => onError(e.message || 'No se pudo aplicar'),
    });
    const n = Number(amount);
    const valid = Number.isInteger(n) && n !== 0 && (reason === 'adjust' || n > 0) && note.trim().length > 0;

    return (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#0a192f] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-white font-bold text-lg">Créditos para {row.tenant_name}</h3>
                        <p className="text-white/40 text-xs mt-0.5">Disponibles: {row.available} · extra: {row.extra_remaining}. Se suman al saldo extra (no vence).</p>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-white/50 mb-1.5">Tipo</label>
                        <select value={reason} onChange={(e) => setReason(e.target.value as typeof reason)} className={`${inputCls} w-full`}>
                            <option value="gift" className="bg-slate-900">Regalo / cortesía</option>
                            <option value="purchase" className="bg-slate-900">Compra / venta manual</option>
                            <option value="adjust" className="bg-slate-900">Ajuste (±)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-white/50 mb-1.5">Cantidad</label>
                        <input value={amount} inputMode="numeric" onChange={(e) => setAmount(e.target.value)} className={`${inputCls} w-full`} />
                    </div>
                </div>
                {reason === 'adjust' && <p className="text-[11px] text-white/40">Usa un número negativo para quitar créditos del saldo extra.</p>}
                <div>
                    <label className="block text-xs font-bold text-white/50 mb-1.5">Motivo</label>
                    <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Ej: Compensación de soporte, Bienvenida"
                        className={`${inputCls} w-full`} />
                    <p className="text-[11px] text-white/40 mt-1">Queda en el historial de créditos.</p>
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-white/60 hover:text-white text-sm font-bold">Cancelar</button>
                    <button onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-40">
                        {mutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Gift size={15} />} Aplicar
                    </button>
                </div>
            </div>
        </div>
    );
}
