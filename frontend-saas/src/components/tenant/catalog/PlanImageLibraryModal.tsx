"use client";

import React, { useEffect, useState } from 'react';
import { Check, ImageOff, Loader2, Trash2 } from 'lucide-react';
import Modal from '@/components/tenant/Modal';
import { apiRequest, getImageUrl } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

interface PlanImage {
    id: number;
    url: string;
    thumbnail_url?: string | null;
    created_at: string;
    used_by_plans: string[];
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentUrl?: string | null;
    onPick: (url: string) => void;
}

/** Imágenes de plan ya subidas por el crematorio, para reutilizarlas en otro plan. */
export default function PlanImageLibraryModal({ isOpen, onClose, currentUrl, onPick }: Props) {
    const { showToast } = useToast();
    const [images, setImages] = useState<PlanImage[]>([]);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [confirmId, setConfirmId] = useState<number | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setConfirmId(null);
        setLoading(true);
        apiRequest('/api/internal/plans/images')
            .then((res: PlanImage[]) => setImages(Array.isArray(res) ? res : []))
            .catch(() => showToast('No se pudieron cargar las imágenes', 'error'))
            .finally(() => setLoading(false));
    }, [isOpen, showToast]);

    const remove = async (img: PlanImage) => {
        setDeletingId(img.id);
        try {
            await apiRequest(`/api/internal/plans/images/${img.id}`, { method: 'DELETE' });
            setImages(prev => prev.filter(i => i.id !== img.id));
            showToast('Imagen eliminada', 'success');
        } catch (err) {
            showToast((err as { message?: string })?.message || 'No se pudo eliminar la imagen', 'error');
        } finally {
            setDeletingId(null);
            setConfirmId(null);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Elegir una imagen ya subida" maxWidth="max-w-3xl" zIndex="z-[400]">
            {loading ? (
                <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-primary" size={28} /></div>
            ) : images.length === 0 ? (
                <div className="py-14 flex flex-col items-center gap-2 text-center text-muted-foreground">
                    <ImageOff size={28} />
                    <p className="text-sm font-semibold">Aún no has subido imágenes de planes.</p>
                    <p className="text-xs">Cuando subas una, quedará aquí para reutilizarla en otros planes.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                        Toca una imagen para usarla en este plan. Las que no usa ningún plan se pueden eliminar.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                        {images.map(img => {
                            const selected = !!currentUrl && img.url === currentUrl;
                            const free = img.used_by_plans.length === 0;
                            return (
                                <div key={img.id} className={`relative rounded-2xl overflow-hidden border-2 transition-all ${selected ? 'border-primary' : 'border-transparent hover:border-primary/40'}`}>
                                    <button
                                        type="button"
                                        onClick={() => { onPick(img.url); onClose(); }}
                                        className="block w-full aspect-square bg-slate-100 dark:bg-slate-800"
                                        title={free ? 'Sin usar' : `En uso: ${img.used_by_plans.join(', ')}`}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={getImageUrl(img.thumbnail_url || img.url)} alt="" loading="lazy" className="w-full h-full object-cover" />
                                    </button>
                                    {selected && (
                                        <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow">
                                            <Check size={14} />
                                        </span>
                                    )}
                                    <div className="px-2 py-1.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1">
                                        <span className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
                                            {free ? 'Sin usar' : img.used_by_plans.join(', ')}
                                        </span>
                                        {free && (
                                            confirmId === img.id ? (
                                                <button type="button" onClick={() => remove(img)} disabled={deletingId === img.id}
                                                    className="shrink-0 text-[10px] font-bold text-red-600 hover:underline">
                                                    {deletingId === img.id ? <Loader2 size={11} className="animate-spin" /> : '¿Eliminar?'}
                                                </button>
                                            ) : (
                                                <button type="button" onClick={() => setConfirmId(img.id)}
                                                    className="shrink-0 p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                    title="Eliminar imagen sin usar">
                                                    <Trash2 size={12} />
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </Modal>
    );
}
