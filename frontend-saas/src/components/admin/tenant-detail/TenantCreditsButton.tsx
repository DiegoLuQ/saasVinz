"use client";

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Gift } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import GrantCreditsModal, { type GrantTarget } from '@/components/admin/aiCredits/GrantCreditsModal';

/** "Regalar / Asignar créditos" IA desde la ficha del crematorio (mismo saldo que Créditos IA → Saldos). */
export default function TenantCreditsButton({ tenantId }: { tenantId?: number }) {
    const { showToast } = useToast();
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const { data } = useQuery<{ items: GrantTarget[] }>({
        queryKey: ['admin', 'ai-credits', 'balances'],
        queryFn: () => apiRequest('/api/internal/creator/ai-credits/balances'),
        enabled: !!tenantId,
    });
    const row = data?.items.find(r => r.tenant_id === tenantId);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                disabled={!row}
                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/10 disabled:opacity-40"
            >
                <Gift size={18} className="text-amber-400" />
                Regalar / Asignar Créditos
                {row && <span className="text-xs font-black bg-white/10 px-2 py-0.5 rounded-full">{row.available}</span>}
            </button>
            {open && row && (
                <GrantCreditsModal row={row} onClose={() => setOpen(false)}
                    onDone={(msg) => {
                        setOpen(false);
                        showToast(msg, 'success');
                        qc.invalidateQueries({ queryKey: ['admin', 'ai-credits'] });
                    }}
                    onError={(msg) => showToast(msg, 'error')} />
            )}
        </>
    );
}
