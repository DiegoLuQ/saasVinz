"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Images, Eye, Download, Loader2, X, Sparkles, AlertCircle, RefreshCw, Link2, LayoutTemplate, Trash2, Wand2 } from 'lucide-react';
import { listTemplateExports, deleteTemplateExport, type TemplateExport } from '@/lib/tenant/imageTemplates';
import { apiRequest, getImageUrl } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { RecipeDesignView, isRecipeDesign, useDesignDownload } from '@/components/tenant/redes/RecipeDesign';
import AssignExistingImageModal from './AssignExistingImageModal';
import GenerateMissingModal from './GenerateMissingModal';
import RedoFarewellCardModal from './RedoFarewellCardModal';

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

interface SocialTemplateOption {
    id: number;
    name: string;
    global: boolean;
    has_ai_text: boolean;
    has_ai_image: boolean;
}

interface AutoDocsData {
    settings: {
        social: { enabled: boolean; template_id: number | null };
    };
    options: {
        social: SocialTemplateOption[];
    };
}

interface Props {
    orderId?: number | null;
    petId: number | null | undefined;
    petName: string;
    /** Para «Generar lo que falta» (certificado + tarjeta + imagen para redes). */
    dedication?: string | null;
    photoUrl?: string | null;
    /** Fotos de la mascota (para elegir al rehacer la tarjeta). */
    photos?: string[];
    farewellTemplateConfig?: Record<string, unknown> | null;
    certificate?: { enabled: boolean; issued: number };
    certMissing?: string[];
}

/**
 * Imágenes entregables de la mascota de la orden (tarjeta digital y diseño para
 * redes en segundo plano), con vista previa, descarga y generación con IA.
 */
export default function GeneratedImagesSection({ orderId, petId, petName, dedication, photoUrl, photos, farewellTemplateConfig, certificate, certMissing }: Props) {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [zoom, setZoom] = useState<TemplateExport | null>(null);
    const [isTriggering, setIsTriggering] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [missingOpen, setMissingOpen] = useState(false);
    // Rehacer / reemplazar la tarjeta de homenaje
    const [redo, setRedo] = useState<{ replace: TemplateExport | null } | null>(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

    // Consulta de imágenes ya generadas
    const { data, isLoading } = useQuery({
        queryKey: ['tenant', 'template-exports', 'order', petId],
        queryFn: () => listTemplateExports({ pet_id: petId!, page_size: 12 }),
        enabled: !!petId,
    });
    const items = data?.items || [];

    // Opciones de plantillas de redes (se consultan al abrir el modal de confirmación)
    const { data: autoDocs, isLoading: loadingAutoDocs } = useQuery<AutoDocsData>({
        queryKey: ['tenant', 'auto-documents'],
        queryFn: () => apiRequest('/api/internal/auto-documents'),
        enabled: confirmOpen,
        staleTime: 60_000,
    });

    const socialOptions = autoDocs?.options?.social || [];
    const defaultSocialId = autoDocs?.settings?.social?.template_id || null;

    useEffect(() => {
        if (confirmOpen && autoDocs) {
            setSelectedTemplateId((prev) => prev ?? defaultSocialId ?? socialOptions[0]?.id ?? null);
        }
    }, [confirmOpen, autoDocs, defaultSocialId, socialOptions]);

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

    // Disparar generación en segundo plano (tras confirmar en el modal)
    const handleGenerateSocial = async (templateIdOverride?: number | null) => {
        if (!orderId) return;
        setIsTriggering(true);
        try {
            const tplId = templateIdOverride !== undefined ? templateIdOverride : selectedTemplateId;
            await apiRequest('/api/internal/auto-documents/jobs', {
                method: 'POST',
                body: JSON.stringify({
                    cremation_id: orderId,
                    ...(tplId ? { template_id: tplId } : {}),
                }),
            });
            showToast('Generando imagen para redes en segundo plano…', 'info');
            setConfirmOpen(false);
            refetchJobs();
        } catch (err: unknown) {
            showToast((err as Error)?.message || 'No se pudo iniciar la generación', 'error');
        } finally {
            setIsTriggering(false);
        }
    };

    const chosenTemplate = socialOptions.find((t) => t.id === selectedTemplateId);
    const usesAi = !!(chosenTemplate?.has_ai_image || chosenTemplate?.has_ai_text);

    // Estado para confirmación y eliminación de imagen
    const [deleteTarget, setDeleteTarget] = useState<TemplateExport | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async (target: TemplateExport) => {
        if (!target) return;
        setIsDeleting(true);
        try {
            await deleteTemplateExport(target.id);
            showToast('Imagen eliminada de Cloud R2 y de la orden.', 'success');
            if (zoom?.id === target.id) {
                setZoom(null);
            }
            setDeleteTarget(null);
            queryClient.invalidateQueries({ queryKey: ['tenant', 'template-exports', 'order', petId] });
            if (orderId) {
                queryClient.invalidateQueries({ queryKey: ['tenant', 'social-jobs', orderId] });
                queryClient.invalidateQueries({ queryKey: ['expediente', orderId] });
                queryClient.invalidateQueries({ queryKey: ['recepcion-pedidos'] });
            }
        } catch (err: any) {
            showToast(err?.message || 'Error al eliminar la imagen', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    // Descarga de diseño
    const { download: downloadItem, busyId: downloading, node: downloadNode } = useDesignDownload(msg => showToast(msg, 'error'));
    const download = (d: TemplateExport) =>
        downloadItem(d, `${(petName || 'mascota').replace(/\s+/g, '-').toLowerCase()}-${d.kind === 'design' ? 'redes' : d.kind === 'illustration' ? 'ilustracion' : 'tarjeta'}-${d.id}`);

    return (
        <div className="p-4 rounded-2xl bg-white border border-slate-200 dark:bg-white/5 dark:border-white/10 space-y-3">
            {/* Cabecera */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Images size={16} className="text-fuchsia-600 dark:text-fuchsia-400 shrink-0" />
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Imágenes generadas</p>
                    {data && data.total > 0 && <span className="text-[10px] text-muted-foreground font-semibold">({data.total})</span>}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {petId && (
                        <button
                            type="button"
                            onClick={() => setAssigning(true)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white dark:border-white/10 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                            title="Asignar una imagen ya creada en Diseños para Redes sin mascota"
                        >
                            <Link2 size={13} /> Asignar existente
                        </button>
                    )}
                    {orderId && (
                        <button
                            type="button"
                            onClick={() => setMissingOpen(true)}
                            disabled={!petId || isTriggering}
                            className="px-3 py-1.5 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 text-violet-700 dark:text-violet-300 border border-violet-500/30 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            title="Ver qué documentos faltan (certificado, tarjeta, imagen para redes) y generarlos"
                        >
                            {isJobActive ? (
                                <Loader2 size={13} className="animate-spin" />
                            ) : (
                                <Wand2 size={13} />
                            )}
                            <span>{isJobActive ? 'Generando imagen…' : 'Generar lo que falta'}</span>
                        </button>
                    )}
                    <Link
                        href="/dashboard/documentos/redes"
                        className="text-[11px] font-semibold text-muted-foreground hover:text-slate-900 dark:hover:text-white transition"
                    >
                        Diseños para Redes
                    </Link>
                </div>
            </div>

            {/* Estado: Generando en segundo plano */}
            {isJobActive && (
                <div className="p-3.5 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/25 text-xs flex items-center gap-3 animate-pulse">
                    <Loader2 size={18} className="animate-spin text-fuchsia-600 dark:text-fuchsia-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 dark:text-white">Generando en segundo plano…</p>
                        <p className="text-[11px] text-fuchsia-700 dark:text-fuchsia-300/80 mt-0.5">
                            {latestJob.detail || 'Procesando con IA'} · Puedes cerrar este panel o seguir trabajando. La campana te avisará al terminar.
                        </p>
                    </div>
                </div>
            )}

            {/* Estado: Error en la última tarea (permite reintentar abriendo confirmación) */}
            {!isJobActive && latestJob?.status === 'error' && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <AlertCircle size={15} className="text-rose-600 dark:text-rose-400 shrink-0" />
                        <span className="truncate">{latestJob.error || 'No se pudo generar la imagen para redes'}</span>
                    </div>
                    {orderId && (
                        <button
                            type="button"
                            onClick={() => setConfirmOpen(true)}
                            disabled={isTriggering}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-800 dark:text-rose-200 font-bold text-[11px] shrink-0 transition flex items-center gap-1 cursor-pointer"
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
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10 text-center space-y-2.5">
                    <p className="text-xs text-muted-foreground">
                        Aún no hay imágenes de {petName || 'esta mascota'}.
                    </p>
                    {orderId && !isJobActive && (
                        <button
                            type="button"
                            onClick={() => setMissingOpen(true)}
                            disabled={isTriggering}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 text-violet-700 dark:text-violet-300 border border-violet-500/30 text-xs font-bold transition cursor-pointer"
                        >
                            <Wand2 size={13} />
                            Generar tarjeta, imagen para redes y certificado
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {items.map(it => (
                        <div key={it.id} className="group relative aspect-[4/5] rounded-xl overflow-hidden bg-slate-900 ring-1 ring-slate-200 dark:ring-white/10">
                            {isRecipeDesign(it) ? (
                                <RecipeDesignView item={it} className="absolute inset-0 p-1" />
                            ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={getImageUrl(it.url || '')} alt={it.title} loading="lazy" className="w-full h-full object-contain" />
                            )}
                            <span className="absolute inset-x-0 bottom-0 bg-black/65 text-white text-[9px] px-1.5 py-0.5 truncate font-medium">
                                {KIND_LABEL[it.kind]}
                            </span>
                            <div className="absolute top-1.5 left-1.5 flex items-center gap-1 z-10">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteTarget(it);
                                    }}
                                    title="Eliminar de la orden y de Cloud R2"
                                    aria-label={`Eliminar ${it.title}`}
                                    className="h-7 w-7 rounded-full bg-black/60 hover:bg-rose-600 text-white/90 hover:text-white shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                >
                                    <Trash2 size={12} />
                                </button>
                                {it.kind === 'digital' && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setRedo({ replace: it });
                                        }}
                                        title="Rehacer o reemplazar la tarjeta"
                                        aria-label={`Rehacer ${it.title}`}
                                        className="h-7 w-7 rounded-full bg-black/60 hover:bg-violet-600 text-white/90 hover:text-white shadow flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
                                    >
                                        <RefreshCw size={12} />
                                    </button>
                                )}
                            </div>
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

            {redo && petId && (
                <RedoFarewellCardModal
                    petId={petId}
                    petName={petName}
                    dedication={dedication}
                    photos={photos?.length ? photos : photoUrl ? [photoUrl] : []}
                    defaultConfig={farewellTemplateConfig}
                    replace={redo.replace}
                    onClose={() => setRedo(null)}
                    onDone={() => {
                        queryClient.invalidateQueries({ queryKey: ['tenant', 'template-exports', 'order', petId] });
                        if (orderId) queryClient.invalidateQueries({ queryKey: ['expediente', orderId] });
                    }}
                />
            )}

            {assigning && petId && (
                <AssignExistingImageModal petId={petId} petName={petName} onClose={() => setAssigning(false)} />
            )}
            {downloadNode}

            {missingOpen && orderId && petId && (
                <GenerateMissingModal
                    orderId={orderId}
                    petId={petId}
                    petName={petName}
                    dedication={dedication}
                    photoUrl={photoUrl}
                    farewellTemplateConfig={farewellTemplateConfig}
                    certificate={certificate || { enabled: false, issued: 0 }}
                    certMissing={certMissing}
                    existing={items}
                    socialJobActive={!!isJobActive}
                    onClose={() => setMissingOpen(false)}
                    onFinished={() => {
                        queryClient.invalidateQueries({ queryKey: ['tenant', 'template-exports', 'order', petId] });
                        queryClient.invalidateQueries({ queryKey: ['tenant', 'image-templates', 'ai-usage'] });
                        queryClient.invalidateQueries({ queryKey: ['expediente', orderId] });
                        refetchJobs();
                    }}
                />
            )}

            {/* Modal de Confirmación antes de Generar Imagen para Redes */}
            {confirmOpen && createPortal(
                <div
                    className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={isTriggering ? undefined : () => setConfirmOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-white/10">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-fuchsia-500/15 border border-fuchsia-500/25 flex items-center justify-center text-fuchsia-600 dark:text-fuchsia-400 shrink-0">
                                    <Sparkles size={18} />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                                        ¿Generar imagen para redes?
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                        Para <span className="font-semibold text-slate-700 dark:text-slate-200">{petName || 'la mascota'}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setConfirmOpen(false)}
                                disabled={isTriggering}
                                aria-label="Cerrar"
                                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-50"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-4 text-xs">
                            {loadingAutoDocs ? (
                                <div className="py-6 flex items-center justify-center gap-2 text-muted-foreground">
                                    <Loader2 size={16} className="animate-spin" /> Cargando plantillas disponibles…
                                </div>
                            ) : socialOptions.length === 0 ? (
                                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 space-y-1">
                                    <p className="font-bold">No hay plantillas de redes activas</p>
                                    <p className="text-[11px]">
                                        Crea o activa una plantilla en <b>Diseños para Redes</b> antes de generar.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Plantilla a utilizar
                                        </label>
                                        <div className="relative">
                                            <LayoutTemplate size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            <select
                                                value={selectedTemplateId ?? ''}
                                                onChange={(e) => setSelectedTemplateId(e.target.value ? Number(e.target.value) : null)}
                                                className="w-full rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-fuchsia-500/50"
                                            >
                                                {socialOptions.map((tpl) => (
                                                    <option key={tpl.id} value={tpl.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                                                        {tpl.name}{tpl.id === defaultSocialId ? ' (Predeterminada)' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {chosenTemplate && (
                                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                {chosenTemplate.has_ai_image && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-500/25 text-[10px] font-bold">
                                                        <Sparkles size={10} /> Ilustración con IA
                                                    </span>
                                                )}
                                                {chosenTemplate.has_ai_text && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/25 text-[10px] font-bold">
                                                        <Sparkles size={10} /> Dedicatoria con IA
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {items.length > 0 && (
                                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-[11px]">
                                            <b>{petName}</b> ya tiene <b>{items.length}</b> {items.length === 1 ? 'imagen generada' : 'imágenes generadas'}. Al confirmar se creará un diseño nuevo adicional.
                                        </div>
                                    )}

                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                                        {usesAi ? (
                                            <>Esta plantilla utiliza <b>Inteligencia Artificial</b> y descontará <b>1 crédito / intento</b> al iniciar. El diseño se procesará en segundo plano y recibirás un aviso en la campana al terminar.</>
                                        ) : (
                                            <>El diseño se generará en segundo plano con los datos y foto de <b>{petName}</b>. Recibirás un aviso en la campana al terminar.</>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setConfirmOpen(false)}
                                disabled={isTriggering}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-white/10 transition disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => handleGenerateSocial(selectedTemplateId)}
                                disabled={isTriggering || loadingAutoDocs || !selectedTemplateId}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-sm transition flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                            >
                                {isTriggering ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                Confirmar y generar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

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
                                {zoom.kind === 'digital' && (
                                    <button
                                        type="button"
                                        onClick={() => { setRedo({ replace: zoom }); setZoom(null); }}
                                        className="px-3 py-1.5 rounded-lg bg-violet-600/80 hover:bg-violet-600 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                                    >
                                        <RefreshCw size={13} />
                                        Rehacer
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setDeleteTarget(zoom)}
                                    className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                                >
                                    <Trash2 size={13} />
                                    Eliminar
                                </button>
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

            {/* Modal de Confirmación de Eliminación */}
            {deleteTarget && createPortal(
                <div
                    className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
                    onClick={isDeleting ? undefined : () => setDeleteTarget(null)}
                >
                    <div
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                            <Trash2 size={24} />
                        </div>

                        <div className="space-y-1.5">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                ¿Eliminar imagen generada?
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Esta acción eliminará el archivo definitivamente del almacenamiento en la nube (Cloudflare R2) y de la orden OC. No se puede deshacer.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                disabled={isDeleting}
                                className="py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition disabled:opacity-50 cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDelete(deleteTarget)}
                                disabled={isDeleting}
                                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                            >
                                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
