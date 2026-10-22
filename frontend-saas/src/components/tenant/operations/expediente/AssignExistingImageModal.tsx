"use client";

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Heart, ImageIcon, LayoutTemplate, Loader2, Sparkles, X } from 'lucide-react';
import { assignTemplateExportPet, listTemplateExports, type TemplateExport } from '@/lib/tenant/imageTemplates';
import { getImageUrl } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { RecipeDesignView, isRecipeDesign } from '@/components/tenant/redes/RecipeDesign';

const KIND: Record<TemplateExport['kind'], { label: string; icon: typeof Sparkles; cls: string }> = {
    design: { label: 'Diseño', icon: LayoutTemplate, cls: 'bg-white/90 text-slate-800' },
    illustration: { label: 'Ilustración IA', icon: Sparkles, cls: 'bg-violet-600 text-white' },
    digital: { label: 'Tarjeta', icon: Heart, cls: 'bg-amber-500 text-white' },
};

/**
 * Imágenes creadas en Diseños para Redes sin mascota: elegir una la asigna a la
 * mascota de la orden (aparece en «Imágenes generadas» sin volver a generarla).
 */
export default function AssignExistingImageModal({ petId, petName, onClose }: { petId: number; petName: string; onClose: () => void }) {
    const { showToast } = useToast();
    const qc = useQueryClient();
    const [selected, setSelected] = useState<TemplateExport | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['tenant', 'template-exports', 'unassigned'],
        queryFn: () => listTemplateExports({ unassigned: true, page_size: 60 }),
    });
    const items = data?.items || [];

    const assign = useMutation({
        mutationFn: (item: TemplateExport) => assignTemplateExportPet(item.id, petId),
        onSuccess: () => {
            showToast(`Imagen asignada a ${petName || 'la mascota'}`, 'success');
            qc.invalidateQueries({ queryKey: ['tenant', 'template-exports'] });
            onClose();
        },
        onError: (e: Error) => showToast(e.message || 'No se pudo asignar la imagen', 'error'),
    });

    return createPortal(
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={assign.isPending ? undefined : onClose}>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-white/10">
                    <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white">Asignar una imagen ya creada</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Imágenes de Diseños para Redes sin mascota. La elegida queda en las imágenes de {petName || 'esta mascota'}.
                        </p>
                    </div>
                    <button onClick={onClose} aria-label="Cerrar" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="py-14 flex justify-center"><Loader2 className="animate-spin text-primary" size={24} /></div>
                    ) : !items.length ? (
                        <div className="py-14 text-center text-sm text-slate-500 dark:text-slate-400">
                            <ImageIcon className="mx-auto mb-3 opacity-40" size={36} />
                            No hay imágenes sin mascota. Todo lo creado en Diseños para Redes ya está asignado.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {items.map(d => {
                                const k = KIND[d.kind];
                                const Icon = k.icon;
                                const isSel = selected?.id === d.id;
                                return (
                                    <button key={d.id} type="button" onClick={() => setSelected(d)}
                                        className={`text-left rounded-2xl overflow-hidden border-2 transition-colors ${isSel ? 'border-primary' : 'border-slate-200 hover:border-primary/40 dark:border-white/10'}`}>
                                        <div className="relative aspect-[4/5] bg-slate-100 dark:bg-slate-950/40">
                                            <span className={`absolute top-1.5 left-1.5 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold shadow-sm ${k.cls}`}>
                                                <Icon size={9} /> {k.label}
                                            </span>
                                            {isSel && (
                                                <span className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow"><Check size={14} /></span>
                                            )}
                                            {isRecipeDesign(d) ? <RecipeDesignView item={d} className="absolute inset-0 p-1.5" /> : (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={getImageUrl(d.url || '')} alt={d.title} loading="lazy" className="absolute inset-0 w-full h-full object-contain" />
                                            )}
                                        </div>
                                        <div className="px-2.5 py-2">
                                            <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate" title={d.title}>{d.title}</p>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400">{new Date(d.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="px-5 py-3 border-t border-slate-200 dark:border-white/10 flex justify-end gap-2">
                    <button onClick={onClose} disabled={assign.isPending} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 disabled:opacity-50">
                        Cancelar
                    </button>
                    <button onClick={() => selected && assign.mutate(selected)} disabled={!selected || assign.isPending}
                        className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 flex items-center gap-2">
                        {assign.isPending && <Loader2 size={15} className="animate-spin" />} Asignar a {petName || 'la mascota'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
