"use client";

import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Eye, Trash2, Loader2, Search, ImageIcon, X, ChevronLeft, ChevronRight, Sparkles, LayoutTemplate, Heart, PawPrint } from 'lucide-react';
import { deleteTemplateExport, listTemplateExports, type TemplateExport } from '@/lib/tenant/imageTemplates';
import AssignPetModal from './AssignPetModal';
import { getImageUrl } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { RecipeDesignView, isRecipeDesign, useDesignDownload } from './RecipeDesign';

const PAGE_SIZE = 8;

const KINDS = [
    { value: '', label: 'Todos' },
    { value: 'design', label: 'Diseños' },
    { value: 'illustration', label: 'Ilustraciones IA' },
    { value: 'digital', label: 'Tarjetas digitales' },
] as const;

const baseName = (d: TemplateExport) =>
    d.title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'diseno';

/**
 * Lo creado por el crematorio en "Diseños para Redes": ilustraciones IA y tarjetas
 * (imágenes en la carpeta IA) y diseños finales (receta: se dibujan al verlos o descargarlos).
 */
export default function MyDesigns({ canDelete }: { canDelete: boolean }) {
    const { showToast } = useToast();
    const qc = useQueryClient();
    const [query, setQuery] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [kind, setKind] = useState<'' | 'design' | 'illustration' | 'digital'>('');
    const [preview, setPreview] = useState<TemplateExport | null>(null);
    const [toDelete, setToDelete] = useState<TemplateExport | null>(null);
    const [assigning, setAssigning] = useState<TemplateExport | null>(null);

    useEffect(() => {
        const t = setTimeout(() => { setSearch(query.trim()); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [query]);

    const { data, isLoading } = useQuery({
        queryKey: ['tenant', 'template-exports', search, kind, page],
        queryFn: () => listTemplateExports({ q: search || undefined, kind: kind || undefined, page, page_size: PAGE_SIZE }),
    });
    const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

    const remove = useMutation({
        mutationFn: (id: number) => deleteTemplateExport(id),
        onSuccess: () => {
            showToast('Diseño eliminado', 'success');
            setToDelete(null);
            setPreview(null);
            qc.invalidateQueries({ queryKey: ['tenant', 'template-exports'] });
        },
        onError: (e: Error) => showToast(e.message || 'No se pudo eliminar', 'error'),
    });

    // Diseños: se dibujan desde su receta al descargar. Ilustraciones/tarjetas: su imagen guardada.
    const { download: downloadItem, busyId: downloading, node: downloadNode } = useDesignDownload(msg => showToast(msg, 'error'));
    const download = (d: TemplateExport) => downloadItem(d, baseName(d));

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                        {KINDS.map(k => (
                            <button key={k.value} onClick={() => { setKind(k.value); setPage(1); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${kind === k.value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}>
                                {k.label}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {data ? `${data.total} ${data.total === 1 ? 'elemento' : 'elementos'}` : 'Cargando…'} · solo las ilustraciones IA y tarjetas son imágenes guardadas; los diseños se dibujan al verlos o descargarlos.
                    </p>
                </div>
                <div className="relative w-full sm:max-w-xs">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por plantilla o mascota…"
                        className="w-full bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary dark:bg-white/5 dark:border-white/10 dark:text-white" />
                </div>
            </div>

            {isLoading ? (
                <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-primary" size={28} /></div>
            ) : !data?.items.length ? (
                <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                    <ImageIcon className="mx-auto mb-3 opacity-40" size={44} />
                    {search || kind ? 'No hay imágenes con ese filtro.' : 'Aún no tienes imágenes guardadas. Al descargar un diseño o guardar una ilustración IA, aparece aquí.'}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {data.items.map(d => (
                        <div key={d.id} className="group bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <button type="button" onClick={() => setPreview(d)} className="relative block w-full aspect-[4/5] bg-slate-100 dark:bg-slate-950/40" title="Ver en grande">
                                <span className={`absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${d.kind === 'illustration' ? 'bg-violet-600 text-white' : d.kind === 'digital' ? 'bg-amber-500 text-white' : 'bg-white/90 text-slate-800'}`}>
                                    {d.kind === 'illustration' ? <><Sparkles size={10} /> Ilustración IA</>
                                        : d.kind === 'digital' ? <><Heart size={10} /> Tarjeta digital</>
                                            : <><LayoutTemplate size={10} /> Diseño</>}
                                </span>
                                {isRecipeDesign(d) ? <RecipeDesignView item={d} className="absolute inset-0 p-2" /> : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={getImageUrl(d.url || '')} alt={d.title} loading="lazy" className="w-full h-full object-contain" />
                                )}
                            </button>
                            <div className="p-3">
                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate" title={d.title}>{d.title}</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">{new Date(d.created_at).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                {/* Sin mascota no aparece en ninguna orden: se puede asignar aquí */}
                                {d.pet_id == null && (
                                    <button onClick={() => setAssigning(d)}
                                        className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-amber-400/70 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-bold dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/40 dark:hover:bg-amber-500/20">
                                        <PawPrint size={13} /> Asignar a mascota
                                    </button>
                                )}
                                <div className="flex gap-1.5 mt-2.5">
                                    <button onClick={() => download(d)} disabled={downloading === d.id}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold disabled:opacity-50">
                                        {downloading === d.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Descargar
                                    </button>
                                    <button onClick={() => setPreview(d)} title="Ver" aria-label="Ver"
                                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">
                                        <Eye size={14} />
                                    </button>
                                    {d.pet_id != null && (
                                        <button onClick={() => setAssigning(d)} title="Cambiar mascota" aria-label="Cambiar mascota"
                                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">
                                            <PawPrint size={14} />
                                        </button>
                                    )}
                                    {canDelete && (
                                        <button onClick={() => setToDelete(d)} title="Eliminar" aria-label="Eliminar"
                                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-red-500/15 dark:hover:text-red-400">
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {pages > 1 && (
                <div className="flex items-center justify-center gap-3 text-sm text-slate-500">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30"><ChevronLeft size={16} /></button>
                    Página {page} de {pages}
                    <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30"><ChevronRight size={16} /></button>
                </div>
            )}

            {preview && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setPreview(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-white/10">
                            <p className="font-bold text-slate-900 dark:text-white truncate">{preview.title}</p>
                            <button onClick={() => setPreview(null)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X size={18} /></button>
                        </div>
                        <div className="flex-1 min-h-0 bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
                            {isRecipeDesign(preview) ? <RecipeDesignView item={preview} className="w-full h-[70vh]" /> : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={getImageUrl(preview.url || '')} alt={preview.title} className="max-w-full max-h-[70vh] object-contain rounded-lg" />
                            )}
                        </div>
                        <div className="flex justify-end gap-2 p-4">
                            {canDelete && (
                                <button onClick={() => setToDelete(preview)} className="px-4 py-2 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">Eliminar</button>
                            )}
                            <button onClick={() => download(preview)} disabled={downloading === preview.id}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50">
                                {downloading === preview.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Descargar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {assigning && <AssignPetModal item={assigning} onClose={() => setAssigning(null)} />}
            {downloadNode}

            {toDelete && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-sm p-6 space-y-4">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">¿Eliminar este diseño?</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            «{toDelete.title}» se borrará de tus diseños{toDelete.url ? ' y de tu biblioteca' : ''}. No se puede deshacer.
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setToDelete(null)} disabled={remove.isPending}
                                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-sm font-bold">Cancelar</button>
                            <button onClick={() => remove.mutate(toDelete.id)} disabled={remove.isPending}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold disabled:opacity-50">
                                {remove.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
