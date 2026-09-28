"use client";

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Trash2, X, Flame, Image as ImageIcon, FileText, Heart, Inbox, Camera } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';

type Preview = {
    pet: { id: number; name: string };
    orders: { id: number; oc_number: number | null; status: string; type?: string | null }[];
    memorials: number;
    submissions: number;
    evidence: number;
    certificates: number;
    images: number;
    paid_commissions: number;
};

interface Props {
    pet: { id: number; name: string } | null;
    onClose: () => void;
    onConfirm: () => Promise<void> | void;
    isDeleting?: boolean;
}

/**
 * Confirmación de eliminación total de una mascota: muestra todo lo que se
 * borrará (órdenes, evidencias, certificados, memoriales, solicitudes e imágenes
 * en Cloudflare). Con órdenes asociadas exige escribir el nombre.
 */
export default function PetDeleteModal({ pet, onClose, onConfirm, isDeleting }: Props) {
    const [preview, setPreview] = useState<Preview | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [typed, setTyped] = useState('');

    useEffect(() => {
        if (!pet) return;
        setPreview(null); setError(null); setTyped(''); setLoading(true);
        apiRequest(`/api/internal/pets/${pet.id}/delete-preview`)
            .then((d: Preview) => setPreview(d))
            .catch((e: unknown) => setError(e instanceof Error ? e.message : 'No se pudo calcular qué se eliminará'))
            .finally(() => setLoading(false));
    }, [pet]);

    if (!pet) return null;

    const hasOrders = (preview?.orders.length || 0) > 0;
    const needsTyping = hasOrders;
    const nameOk = typed.trim().toLowerCase() === pet.name.trim().toLowerCase();
    const canDelete = !!preview && !loading && !isDeleting && (!needsTyping || nameOk);

    const rows: { icon: React.ElementType; label: string; count: number }[] = preview ? [
        { icon: Flame, label: 'Órdenes de cremación (con logística, cobros y seguimiento)', count: preview.orders.length },
        { icon: Camera, label: 'Evidencias de las etapas', count: preview.evidence },
        { icon: FileText, label: 'Certificados emitidos', count: preview.certificates },
        { icon: Heart, label: 'Memoriales (con dedicatorias)', count: preview.memorials },
        { icon: Inbox, label: 'Solicitudes web vinculadas', count: preview.submissions },
        { icon: ImageIcon, label: 'Imágenes en Cloudflare (fotos y evidencias)', count: preview.images },
    ] : [];

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isDeleting && onClose()} />
            <div role="alertdialog" aria-modal="true" aria-labelledby="pet-delete-title" className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200 text-slate-800 dark:bg-[#0f172a] dark:border-white/10 dark:text-slate-100 shadow-2xl overflow-hidden">
                <div className="flex items-start gap-3 p-6 pb-4">
                    <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 flex items-center justify-center shrink-0">
                        <Trash2 size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 id="pet-delete-title" className="text-lg font-black text-slate-900 dark:text-white">Eliminar a {pet.name}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Se eliminará la mascota y <strong>todo lo asociado</strong>. Esta acción no se puede deshacer.</p>
                    </div>
                    <button onClick={onClose} disabled={isDeleting} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1" aria-label="Cerrar"><X size={18} /></button>
                </div>

                <div className="px-6 space-y-3">
                    {loading ? (
                        <div className="flex items-center gap-2 text-sm text-slate-500 py-6 justify-center"><Loader2 size={16} className="animate-spin" /> Revisando qué se eliminará…</div>
                    ) : error ? (
                        <p className="text-sm text-red-700 dark:text-red-400 py-4">{error}</p>
                    ) : preview && (
                        <>
                            <ul className="rounded-2xl border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5">
                                {rows.map(({ icon: Icon, label, count }) => (
                                    <li key={label} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${count === 0 ? 'opacity-50' : ''}`}>
                                        <Icon size={15} className="text-slate-500 dark:text-slate-400 shrink-0" />
                                        <span className="flex-1">{label}</span>
                                        <span className={`font-black tabular-nums ${count > 0 ? 'text-red-700 dark:text-red-400' : 'text-slate-400'}`}>{count}</span>
                                    </li>
                                ))}
                            </ul>

                            {hasOrders && (
                                <div className="text-xs text-slate-600 dark:text-slate-400">
                                    Órdenes: {preview.orders.map((o) => `OC ${o.oc_number ?? o.id} (${o.status})`).join(' · ')}
                                </div>
                            )}

                            {preview.paid_commissions > 0 && (
                                <div className="flex gap-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/25 dark:text-amber-200 p-3 text-xs">
                                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                    Hay {preview.paid_commissions} comisión(es) ya pagada(s) a veterinarias: también se borrará su registro.
                                </div>
                            )}

                            {preview.images > 0 && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Las imágenes se borran de Cloudflare después de confirmar la eliminación, salvo las que use otro registro.
                                </p>
                            )}

                            {needsTyping && (
                                <label className="block space-y-1.5 pt-1">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Para confirmar, escribe <span className="font-black">{pet.name}</span>
                                    </span>
                                    <input
                                        value={typed}
                                        onChange={(e) => setTyped(e.target.value)}
                                        autoFocus
                                        className="w-full rounded-xl px-3 py-2.5 text-sm bg-white border border-slate-300 text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:bg-black/20 dark:border-white/10 dark:text-white dark:focus:ring-red-500/20"
                                        placeholder={pet.name}
                                    />
                                </label>
                            )}
                        </>
                    )}
                </div>

                <div className="flex gap-3 p-6 pt-5">
                    <button onClick={onClose} disabled={isDeleting} className="flex-1 py-3 rounded-2xl border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 font-bold transition">
                        Cancelar
                    </button>
                    <button
                        onClick={() => onConfirm()}
                        disabled={!canDelete}
                        className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        {isDeleting ? 'Eliminando…' : 'Eliminar todo'}
                    </button>
                </div>
            </div>
        </div>
    );
}
