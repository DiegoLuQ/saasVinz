"use client";

import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, PawPrint, Search, X } from 'lucide-react';
import { apiRequest, getImageUrl } from '@/lib/tenant/api';
import { assignTemplateExportPet, type TemplateExport } from '@/lib/tenant/imageTemplates';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

interface PetRow {
    id: number;
    name: string;
    species?: string | null;
    breed?: string | null;
    image_url?: string | null;
    images?: string[] | null;
}

interface OrderRow { id: number; pet_id: number | null; oc_number?: string | number | null }

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Elige la mascota de un diseño creado en Diseños para Redes. Con mascota, el
 * diseño aparece en sus órdenes (lateral de Recepción y Pedidos).
 */
export default function AssignPetModal({ item, onClose }: { item: TemplateExport; onClose: () => void }) {
    const { showToast } = useToast();
    const qc = useQueryClient();
    const [q, setQ] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['tenant', 'redes', 'assign-pet-options'],
        queryFn: async () => {
            const [pets, orders] = await Promise.all([
                apiRequest('/api/internal/pets/') as Promise<PetRow[]>,
                (apiRequest('/api/internal/cremations?sort_order=desc') as Promise<OrderRow[]>).catch(() => []),
            ]);
            // Última orden de cada mascota (las órdenes vienen de la más reciente a la más antigua).
            const lastOrder = new Map<number, OrderRow>();
            for (const o of Array.isArray(orders) ? orders : []) {
                if (o.pet_id && !lastOrder.has(o.pet_id)) lastOrder.set(o.pet_id, o);
            }
            return (Array.isArray(pets) ? pets : [])
                .map(p => ({ ...p, order: lastOrder.get(p.id) }))
                .sort((a, b) => (b.order?.id ?? 0) - (a.order?.id ?? 0) || b.id - a.id);
        },
        staleTime: 60_000,
    });

    const list = useMemo(() => {
        const term = norm(q.trim());
        if (!term) return data || [];
        return (data || []).filter(p =>
            norm(`${p.name} ${p.species || ''} ${p.breed || ''} ${p.order?.oc_number ?? ''}`).includes(term));
    }, [data, q]);

    const assign = useMutation({
        mutationFn: (petId: number | null) => assignTemplateExportPet(item.id, petId),
        onSuccess: (r) => {
            showToast(r.pet_id ? 'Diseño asignado a la mascota' : 'Diseño sin mascota', 'success');
            qc.invalidateQueries({ queryKey: ['tenant', 'template-exports'] });
            onClose();
        },
        onError: (e: Error) => showToast(e.message || 'No se pudo asignar', 'error'),
    });

    return createPortal(
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={assign.isPending ? undefined : onClose}>
            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-white/10">
                    <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white">Asignar a una mascota</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            «{item.title}» aparecerá en las órdenes de la mascota elegida.
                        </p>
                    </div>
                    <button onClick={onClose} aria-label="Cerrar" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X size={18} /></button>
                </div>

                <div className="px-5 py-3 border-b border-slate-100 dark:border-white/5">
                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus placeholder="Buscar por nombre, especie o N° de orden…"
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary dark:bg-white/5 dark:border-white/10 dark:text-white" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                    {isLoading ? (
                        <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-primary" size={24} /></div>
                    ) : !list.length ? (
                        <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">No se encontraron mascotas.</p>
                    ) : (
                        <div className="space-y-1.5">
                            {list.map(p => {
                                const photo = p.image_url || p.images?.[0];
                                const current = p.id === item.pet_id;
                                return (
                                    <button key={p.id} type="button" disabled={assign.isPending || current} onClick={() => assign.mutate(p.id)}
                                        className={`w-full flex items-center gap-3 p-2.5 rounded-2xl border text-left transition-colors disabled:cursor-default ${current ? 'border-primary/40 bg-primary/5' : 'border-slate-200 hover:border-primary/40 hover:bg-primary/5 dark:border-white/10'}`}>
                                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            {photo ? <img src={getImageUrl(photo)} alt={p.name} className="w-full h-full object-cover" /> : <PawPrint size={18} className="text-slate-400" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{p.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{[p.species, p.breed].filter(Boolean).join(' · ') || '—'}</p>
                                        </div>
                                        {current ? (
                                            <span className="shrink-0 text-[10px] font-bold text-primary">Asignada</span>
                                        ) : p.order ? (
                                            <span className="shrink-0 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                                Orden #{p.order.oc_number || p.order.id}
                                            </span>
                                        ) : (
                                            <span className="shrink-0 text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">Sin orden</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {item.pet_id != null && (
                    <div className="px-5 py-3 border-t border-slate-200 dark:border-white/10 flex justify-between items-center gap-3">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Quitar la mascota lo saca de sus órdenes.</p>
                        <button onClick={() => assign.mutate(null)} disabled={assign.isPending}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 disabled:opacity-50">
                            Quitar mascota
                        </button>
                    </div>
                )}
                {assign.isPending && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Loader2 className="animate-spin text-primary" /></div>
                )}
            </div>
        </div>,
        document.body
    );
}
