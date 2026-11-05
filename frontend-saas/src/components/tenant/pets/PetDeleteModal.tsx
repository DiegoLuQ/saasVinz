"use client";

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Trash2, X, Flame, Image as ImageIcon, Heart, Inbox, User } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';

type Preview = {
    pet: { id: number; name: string };
    orders: { id: number; oc_number: number | null; status: string; type?: string | null }[];
    memorials: number;
    submissions: number;
    evidence: number;
    certificates: number;
    images: number;
    /** Fotos de la mascota (ficha + formulario): se puede elegir conservarlas */
    photos: number;
    paid_commissions: number;
    /** Cliente de la mascota; `deleted` = se borra con ella (no tiene otras mascotas) */
    customer: { id: number; name: string; deleted: boolean } | null;
};

interface Props {
    pet: { id: number; name: string } | null;
    onClose: () => void;
    /** keepPhotos = conservar las fotos de la mascota en la nube */
    onConfirm: (keepPhotos: boolean) => Promise<void> | void;
    isDeleting?: boolean;
}

/**
 * Eliminar una mascota: con órdenes asociadas NO se puede (se avisa y se listan; se borran desde
 * Recepción de pedidos). Sin órdenes se borran la mascota, sus fotos, memoriales, solicitudes web
 * e imágenes en Cloudflare, y su cliente si no tiene otras mascotas.
 */
export default function PetDeleteModal({ pet, onClose, onConfirm, isDeleting }: Props) {
    const [preview, setPreview] = useState<Preview | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deletePhotos, setDeletePhotos] = useState(true);
    useEffect(() => {
        if (!pet) return;
        setPreview(null); setError(null); setDeletePhotos(true); setLoading(true);
        apiRequest(`/api/internal/pets/${pet.id}/delete-preview`)
            .then((d: Preview) => setPreview(d))
            .catch((e: unknown) => setError(e instanceof Error ? e.message : 'No se pudo calcular qué se eliminará'))
            .finally(() => setLoading(false));
    }, [pet]);

    if (!pet) return null;

    const hasOrders = (preview?.orders.length || 0) > 0;
    const canDelete = !!preview && !loading && !isDeleting && !hasOrders;

    const rows: { icon: React.ElementType; label: string; count: number }[] = preview ? [
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
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {hasOrders
                                ? 'Esta mascota tiene órdenes asociadas, por eso no se puede eliminar.'
                                : <>Se eliminará la mascota con sus fotos y <strong>todo lo asociado</strong>. Esta acción no se puede deshacer.</>}
                        </p>
                    </div>
                    <button onClick={onClose} disabled={isDeleting} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1" aria-label="Cerrar"><X size={18} /></button>
                </div>

                <div className="px-6 space-y-3">
                    {loading ? (
                        <div className="flex items-center gap-2 text-sm text-slate-500 py-6 justify-center"><Loader2 size={16} className="animate-spin" /> Revisando qué se eliminará…</div>
                    ) : error ? (
                        <p className="text-sm text-red-700 dark:text-red-400 py-4">{error}</p>
                    ) : preview && hasOrders ? (
                        <div className="flex gap-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/25 dark:text-amber-200 p-4 text-sm">
                            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                            <div className="space-y-1.5">
                                <p className="font-bold">Tiene {preview.orders.length === 1 ? '1 orden asociada' : `${preview.orders.length} órdenes asociadas`}:</p>
                                <ul className="space-y-0.5">
                                    {preview.orders.map((o) => (
                                        <li key={o.id} className="flex items-center gap-1.5"><Flame size={12} /> OC {o.oc_number ?? o.id} · {o.status}</li>
                                    ))}
                                </ul>
                                <p className="text-xs">Si quieres eliminarla, primero elimina sus órdenes desde Recepción de pedidos.</p>
                            </div>
                        </div>
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
                                {preview.customer && (
                                    <li className="flex items-center gap-3 px-4 py-2.5 text-sm">
                                        <User size={15} className="text-slate-500 dark:text-slate-400 shrink-0" />
                                        <span className="flex-1">Cliente: <strong>{preview.customer.name}</strong></span>
                                        <span className={`text-xs font-bold ${preview.customer.deleted ? 'text-red-700 dark:text-red-400' : 'text-slate-500'}`}>
                                            {preview.customer.deleted ? 'Se elimina' : 'Se conserva'}
                                        </span>
                                    </li>
                                )}
                            </ul>
                            {preview.customer && !preview.customer.deleted && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    El cliente se conserva porque tiene otras mascotas o no tienes permiso para eliminar clientes.
                                </p>
                            )}
                            {preview.photos > 0 && (
                                <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 dark:border-white/10 px-3.5 py-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={deletePhotos}
                                        onChange={(e) => setDeletePhotos(e.target.checked)}
                                        className="mt-0.5 h-4 w-4 accent-red-600 cursor-pointer"
                                    />
                                    <span className="text-sm">
                                        Eliminar también las fotos de la mascota ({preview.photos})
                                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                                            {deletePhotos
                                                ? 'Se borran de la nube y no se pueden recuperar.'
                                                : 'Las fotos se conservan guardadas en la nube.'}
                                        </span>
                                    </span>
                                </label>
                            )}
                            {preview.images > 0 && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Las imágenes se borran de Cloudflare después de confirmar la eliminación, salvo las que use otro registro.
                                </p>
                            )}
                        </>
                    )}
                </div>

                <div className="flex gap-3 p-6 pt-5">
                    <button onClick={onClose} disabled={isDeleting} className="flex-1 py-3 rounded-2xl border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 font-bold transition">
                        {hasOrders ? 'Entendido' : 'Cancelar'}
                    </button>
                    {!hasOrders && <button
                        onClick={() => onConfirm(!deletePhotos)}
                        disabled={!canDelete}
                        className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        {isDeleting ? 'Eliminando…' : 'Eliminar'}
                    </button>}
                </div>
            </div>
        </div>
    );
}
