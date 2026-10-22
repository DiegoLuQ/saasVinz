"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Images, Eye, Download, Loader2, X, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { listTemplateExports, type TemplateExport } from '@/lib/tenant/imageTemplates';
import { apiRequest, getImageUrl } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { RecipeDesignView, isRecipeDesign, useDesignDownload } from '@/components/tenant/redes/RecipeDesign';

const KIND_LABEL: Record<TemplateExport['kind'], string> = {
    digital: 'Tarjeta digital',
    design: 'Imagen redes',
    illustration: 'Ilustración IA',
};

const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });

interface DocumentJobInfo {
    id: number;
    cremation_id: number;
    pet_id: number | null;
    kind: string;
    template_id: number | null;
    status: 'queued' | 'running' | 'done' | 'error';
    detail: string | null;
    error: string | null;
    export_id: number | null;
    created_at: string;
    finished_at: string | null;
}

interface Props {
    orderId?: number | null;
    petId: number | null | undefined;
    petName: string;
}

/**
 * Imágenes entregables de la mascota de la orden (tarjeta digital y diseño para
 * redes en segundo plano), con vista previa, descarga y generación con IA.
 */
export default function GeneratedImagesSection({ orderId, petId, petName }: Props) {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [zoom, setZoom] = useState<TemplateExport | null>(null);
    const [isTriggering, setIsTriggering] = useState(false);

    // Consulta de imágenes ya generadas
    const { data, isLoading } = useQuery({
        queryKey: ['tenant', 'template-exports', 'order', petId],
        queryFn: () => listTemplateExports({ kind: 'design,digital', pet_id: petId!, page_size: 12 }),
        enabled: !!petId,
    });
    const items = data?.items || [];

    // Consulta de tareas en segundo plano de esta orden
    const { data: jobs, refetch: refetchJobs } = useQuery<DocumentJobInfo[]>({
        queryKey: ['tenant', 'social-jobs', orderId],
        queryFn: () => apiRequest(`/api/internal/auto-documents/jobs?cremation_id=${orderId}`),
        enabled: !!orderId,
        refetchInterval: (query) => {
            const latest = query.state.data?.[0];
            const isRunning = latest && (latest.status === 'queued' || latest.status === 'running');
            return isRunning ? 3000 : false;
        },
    });

    const latestJob = jobs?.[0];
    const isJobActive = latestJob && (latestJob.status === 'queued' || latestJob.status === 'running');
    const prevStatusRef = useRef<string | null>(null);

    // Monitoreo de transición de estados del job
    useEffect(() => {
        if (prevStatusRef.current && (prevStatusRef.current === 'queued' || prevStatusRef.current === 'running')) {
            if (latestJob?.status === 'done') {
                showToast('¡Imagen para redes generada con éxito!', 'success');
                queryClient.invalidateQueries({ queryKey: ['tenant', 'template-exports', 'order', petId] });
            } else if (latestJob?.status === 'error') {
                showToast(latestJob.error || 'No se pudo generar la imagen para redes', 'error');
            }
        }
        prevStatusRef.current = latestJob?.status || null;
    }, [latestJob?.status, latestJob?.error, petId, queryClient, showToast]);

    // Disparar generación en segundo plano
    const handleGenerateSocial = async () => {
        if (!orderId) return;
        setIsTriggering(true);
        try {
            await apiRequest('/api/internal/auto-documents/jobs', {
                method: 'POST',
                body: JSON.stringify({ cremation_id: orderId }),
            });
            showToast('Generando imagen para redes en segundo plano…', 'info');
            refetchJobs();
        } catch (err: unknown) {
            showToast((err as Error)?.message || 'No se pudo iniciar la generación', 'error');
        } finally {
            setIsTriggering(false);
        }
    };

    // Descarga de diseño
    const { download: downloadItem, busyId: downloading, node: downloadNode } = useDesignDownload(msg => showToast(msg, 'error'));
    const download = (d: TemplateExport) =>
        downloadItem(d, `${(petName || 'mascota').replace(/\s+/g, '-').toLowerCase()}-${d.kind === 'design' ? 'redes' : 'tarjeta'}-${d.id}`);

    return (
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            {/* Cabecera */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Images size={16} className="text-fuchsia-400 shrink-0" />
                    <p className="text-xs font-bold text-white">Imágenes generadas</p>
                    {data && data.total > 0 && <span className="text-[10px] text-muted-foreground font-semibold">({data.total})</span>}
                </div>

                <div className="flex items-center gap-2">
                    {orderId && (
                        <button
                            type="button"
                            onClick={handleGenerateSocial}
                            disabled={!petId || isJobActive || isTriggering}
                            className="px-3 py-1.5 rounded-xl bg-fuchsia-500/15 hover:bg-fuchsia-500/25 text-fuchsia-300 border border-fuchsia-500/30 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            title="Generar imagen para redes con IA en segundo plano"
                        >
                            {isJobActive || isTriggering ? (
                                <Loader2 size={13} className="animate-spin text-fuchsia-300" />
                            ) : (
                                <Sparkles size={13} className="text-fuchsia-300" />
                            )}
                            <span>{isJobActive ? 'Generando…' : 'Generar imagen redes'}</span>
                        </button>
                    )}
                    <Link
                        href="/dashboard/documentos/redes"
                        className="text-[11px] font-semibold text-muted-foreground hover:text-white transition"
                    >
                        Diseños para Redes
                    </Link>
                </div>
            </div>

            {/* Estado: Generando en segundo plano */}
            {isJobActive && (
                <div className="p-3.5 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/25 text-xs flex items-center gap-3 animate-pulse">
                    <Loader2 size={18} className="animate-spin text-fuchsia-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                        <p className="font-bold text-white">Generando en segundo plano…</p>
                        <p className="text-[11px] text-fuchsia-300/80 mt-0.5">
                            {latestJob.detail || 'Procesando con IA'} · Puedes cerrar este panel o seguir trabajando. La campana te avisará al terminar.
                        </p>
                    </div>
                </div>
            )}

            {/* Estado: Error en la última tarea (permite reintentar) */}
            {!isJobActive && latestJob?.status === 'error' && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <AlertCircle size={15} className="text-rose-400 shrink-0" />
                        <span className="truncate">{latestJob.error || 'No se pudo generar la imagen para redes'}</span>
                    </div>
                    {orderId && (
                        <button
                            type="button"
                            onClick={handleGenerateSocial}
                            disabled={isTriggering}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold text-[11px] shrink-0 transition flex items-center gap-1 cursor-pointer"
                        >
                            <RefreshCw size={11} /> Reintentar
                        </button>
                    )}
                </div>
            )}

            {/* Contenido principal: listado o estado vacío */}
            {!petId ? (
                <p className="text-xs text-muted-foreground">La orden no tiene mascota asociada.</p>
            ) : isLoading ? (
                <div className="py-4 flex justify-center">
                    <Loader2 size={18} className="animate-spin text-muted-foreground" />
                </div>
            ) : items.length === 0 ? (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-2.5">
                    <p className="text-xs text-muted-foreground">
                        Aún no hay imágenes de {petName || 'esta mascota'}.
                    </p>
                    {orderId && !isJobActive && (
                        <button
                            type="button"
                            onClick={handleGenerateSocial}
                            disabled={isTriggering}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-fuchsia-500/15 hover:bg-fuchsia-500/25 text-fuchsia-300 border border-fuchsia-500/30 text-xs font-bold transition cursor-pointer"
                        >
                            <Sparkles size={13} />
                            Generar imagen para redes (IA)
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {items.map(it => (
                        <div key={it.id} className="group relative aspect-[4/5] rounded-xl overflow-hidden bg-black/30 ring-1 ring-white/10">
                            {isRecipeDesign(it) ? (
                                <RecipeDesignView item={it} className="absolute inset-0 p-1" />
                            ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={getImageUrl(it.url || '')} alt={it.title} loading="lazy" className="w-full h-full object-contain" />
                            )}
                            <span className="absolute inset-x-0 bottom-0 bg-black/65 text-white text-[9px] px-1.5 py-0.5 truncate font-medium">
                                {KIND_LABEL[it.kind]}
                            </span>
                            <button
                                type="button"
                                onClick={() => setZoom(it)}
                                title="Ver en grande"
                                aria-label={`Ver ${it.title}`}
                                className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-white/90 text-slate-800 shadow flex items-center justify-center hover:bg-white transition cursor-pointer"
                            >
                                <Eye size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {downloadNode}

            {/* Modal de Zoom y descarga */}
            {zoom && (
                <div className="fixed inset-0 z-[130] bg-black/85 flex items-center justify-center p-4 backdrop-blur-xs" onClick={() => setZoom(null)}>
                    <div className="max-w-xl w-full" onClick={(e) => e.stopPropagation()}>
                        {isRecipeDesign(zoom) ? (
                            <RecipeDesignView item={zoom} className="w-full h-[75vh]" />
                        ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={getImageUrl(zoom.url || '')} alt={zoom.title} className="w-full max-h-[75vh] object-contain rounded-xl" />
                        )}
                        <div className="flex items-center justify-between gap-3 mt-3 text-sm text-white">
                            <span className="min-w-0 truncate">
                                <b>{KIND_LABEL[zoom.kind]}</b> <span className="text-white/60">· {zoom.title} · {fmt(zoom.created_at)}</span>
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => download(zoom)}
                                    disabled={downloading === zoom.id}
                                    className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition cursor-pointer"
                                >
                                    {downloading === zoom.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                                    Descargar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setZoom(null)}
                                    aria-label="Cerrar"
                                    className="p-1.5 rounded-lg hover:bg-white/15 transition cursor-pointer"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
