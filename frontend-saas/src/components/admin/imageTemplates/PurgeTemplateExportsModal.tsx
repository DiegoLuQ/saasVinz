"use client";

import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import { getTemplateExportsPreview, purgeTemplateExports } from '@/lib/admin/imageTemplates/api';
import type { ImageTemplate } from '@/lib/admin/imageTemplates/types';

const CONFIRM_WORD = 'ELIMINAR';

const formatBytes = (b: number) => {
    if (!b) return '0 KB';
    const mb = b / (1024 * 1024);
    return mb >= 1 ? `${mb.toLocaleString('es-CL', { maximumFractionDigits: 2 })} MB` : `${Math.ceil(b / 1024).toLocaleString('es-CL')} KB`;
};

/**
 * Confirma el borrado de todo lo creado con una plantilla en todos los
 * crematorios: diseños, ilustraciones IA y sus archivos en R2. No se puede deshacer.
 */
export default function PurgeTemplateExportsModal({ template, onClose, onDone }: {
    template: ImageTemplate;
    onClose: () => void;
    onDone: (msg: string) => void;
}) {
    const [typed, setTyped] = useState('');
    const [unlock, setUnlock] = useState(true);
    const { data, isLoading, error } = useQuery({
        queryKey: ['admin', 'image-templates', template.id, 'exports-preview'],
        queryFn: () => getTemplateExportsPreview(template.id),
    });
    const purge = useMutation({
        // Solo se desbloquea si estaba bloqueada (en uso) y se pidió.
        mutationFn: () => purgeTemplateExports(template.id, unlock && (data?.usage_count ?? 0) > 0),
        onSuccess: (r) => {
            const parts = [`${r.exports_deleted} registro${r.exports_deleted === 1 ? '' : 's'} y ${r.files_deleted} archivo${r.files_deleted === 1 ? '' : 's'} eliminados`];
            if (r.files_kept_shared) parts.push(`${r.files_kept_shared} se conservaron porque se usan en otra parte`);
            if (r.files_failed) parts.push(`${r.files_failed} no se pudieron borrar`);
            if (r.unlocked) parts.push('la plantilla ya se puede editar');
            onDone(`«${template.name}»: ${parts.join(' · ')}.`);
        },
    });

    const empty = !!data && data.designs + data.illustrations + data.others + data.files + data.generations_with_image === 0;
    const canConfirm = !!data && !empty && typed.trim().toUpperCase() === CONFIRM_WORD && !purge.isPending;

    return (
        <div className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onClick={purge.isPending ? undefined : onClose}>
            <div className="bg-[#0a192f] border border-red-500/30 rounded-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-4 p-6 border-b border-white/10">
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-red-500/15 text-red-400 shrink-0"><Trash2 size={20} /></div>
                        <div>
                            <h3 className="text-white font-bold text-lg">Eliminar todo lo creado</h3>
                            <p className="text-white/50 text-sm">con la plantilla «{template.name}»</p>
                        </div>
                    </div>
                    <button onClick={onClose} disabled={purge.isPending} className="text-white/40 hover:text-white disabled:opacity-30" aria-label="Cerrar"><X size={18} /></button>
                </div>

                <div className="p-6 space-y-4">
                    {isLoading ? (
                        <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
                    ) : error || !data ? (
                        <p className="text-sm text-red-300">{(error as Error)?.message || 'No se pudo calcular lo que se eliminaría.'}</p>
                    ) : empty ? (
                        <p className="text-sm text-white/60">Esta plantilla no tiene diseños ni imágenes creadas. No hay nada que eliminar.</p>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-2">
                                {([
                                    ['Diseños para redes', data.designs],
                                    ['Ilustraciones IA', data.illustrations],
                                    ['Archivos en R2', data.files],
                                    ['Espacio liberado', formatBytes(data.bytes)],
                                ] as const).map(([label, value]) => (
                                    <div key={label} className="rounded-xl bg-white/5 border border-white/10 p-3">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">{label}</p>
                                        <p className="text-xl font-black text-white">{value}</p>
                                    </div>
                                ))}
                            </div>
                            {data.tenants.length > 0 && (
                                <p className="text-xs text-white/60">
                                    Crematorios afectados: <span className="text-white font-semibold">{data.tenants.join(', ')}</span>
                                </p>
                            )}
                            <div className="flex gap-2.5 rounded-xl bg-red-500/10 border border-red-500/25 p-3 text-xs text-red-200 leading-relaxed">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-400" />
                                <span>
                                    Se borran de «Mis diseños generados» y de las órdenes de cada crematorio, y los archivos se eliminan de R2.
                                    El historial de consumo de IA y los créditos usados se conservan (sin la imagen).
                                    Los archivos que se usen en otra parte no se tocan. <b>No se puede deshacer.</b>
                                </span>
                            </div>
                            {data.usage_count > 0 && <label className="flex items-start gap-2.5 text-sm text-white/80 cursor-pointer">
                                <input type="checkbox" checked={unlock} onChange={(e) => setUnlock(e.target.checked)} className="mt-0.5 w-4 h-4 accent-emerald-500" />
                                <span>
                                    Desbloquear la plantilla para poder editarla
                                    <span className="block text-[11px] text-white/40">Sin diseños guardados, editarla ya no cambia nada de lo creado.</span>
                                </span>
                            </label>}
                            <div>
                                <label className="block text-xs font-bold text-white/50 mb-1.5">Escribe <b className="text-white">{CONFIRM_WORD}</b> para confirmar</label>
                                <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-red-500/60" />
                            </div>
                            {purge.error && <p className="text-xs text-red-300">{(purge.error as Error).message || 'No se pudo eliminar.'}</p>}
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-2 px-6 pb-6">
                    <button onClick={onClose} disabled={purge.isPending} className="px-4 py-2 text-white/60 hover:text-white text-sm font-bold disabled:opacity-30">
                        {empty ? 'Cerrar' : 'Cancelar'}
                    </button>
                    {!empty && (
                        <button onClick={() => purge.mutate()} disabled={!canConfirm}
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed">
                            {purge.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Eliminar todo
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
