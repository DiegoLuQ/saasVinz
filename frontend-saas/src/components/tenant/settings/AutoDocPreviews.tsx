'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Loader2, X, Eye } from 'lucide-react';
import { useDocuments, fetchDocumentContent, type DocumentItem } from '@/hooks/useDocuments';
import { listTemplateExports, type TemplateExport } from '@/lib/tenant/imageTemplates';
import { getImageUrl } from '@/lib/tenant/api';
import { useCurrentTenant } from '@/hooks/useSessionBootstrap';
import { buildFarewellConfig, farewellCardDims } from '@/lib/tenant/farewellCard';
import FarewellPreview from '@/app/(tenant)/tenant/dashboard/documentos/disenos/components/FarewellPreview';
import TemplatePreviewThumb from '@/components/admin/imageTemplates/TemplatePreviewThumb';
import { RecipeDesignView, isRecipeDesign } from '@/components/tenant/redes/RecipeDesign';
import type { AutoDocKind, AutoDocuments } from '@/lib/tenant/autoDocuments';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
const labelCls = 'text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground';

/** Últimos documentos creados de un tipo; si no hay, la plantilla con datos de ejemplo. */
export function AutoDocPreviews({ kind, auto, selectedTemplateId }: {
    kind: AutoDocKind;
    auto: AutoDocuments;
    selectedTemplateId: number | null;
}) {
    if (kind === 'certificate') return <RecentCertificates />;
    return <RecentImages kind={kind} auto={auto} selectedTemplateId={selectedTemplateId} />;
}

function RecentCertificates() {
    const { data, isLoading } = useDocuments();
    const [open, setOpen] = useState<{ doc: DocumentItem; html: string | null } | null>(null);
    const [loadingId, setLoadingId] = useState<number | null>(null);

    const certs = (data?.documents || [])
        .filter(d => d.is_generated || d.type.toLowerCase().includes('certificad'))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4);

    const view = async (doc: DocumentItem) => {
        setLoadingId(doc.id);
        try {
            const html = doc.html_content || (doc.is_generated ? await fetchDocumentContent(doc.id) : null);
            setOpen({ doc, html: html || null });
        } catch {
            setOpen({ doc, html: null });
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="space-y-2">
            <p className={labelCls}>Últimos emitidos</p>
            {isLoading ? (
                <Loader2 size={16} className="animate-spin text-primary" />
            ) : certs.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aún no hay certificados emitidos.</p>
            ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                    {certs.map(c => (
                        <button key={c.id} onClick={() => view(c)} title="Ver certificado"
                            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:border-primary/40 text-left transition-colors dark:bg-white/5 dark:border-white/10">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                                {loadingId === c.id ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
                            </span>
                            <span className="min-w-0">
                                <span className="block text-xs font-bold truncate">{c.pet_name}</span>
                                <span className="block text-[10px] text-muted-foreground truncate">{c.number} · {fmt(c.issue_date || c.created_at)}</span>
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {open && createPortal(
                <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpen(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-200 dark:border-white/10">
                            <p className="font-bold text-slate-900 dark:text-white truncate">Certificado · {open.doc.pet_name} <span className="text-slate-400 font-normal">{open.doc.number}</span></p>
                            <button onClick={() => setOpen(null)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X size={18} /></button>
                        </div>
                        {open.html ? (
                            <iframe title="Certificado" srcDoc={open.html} sandbox="allow-same-origin" className="flex-1 w-full bg-white" />
                        ) : (
                            <p className="p-6 text-sm text-slate-500">El contenido de este documento no está disponible.</p>
                        )}
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
}

function RecentImages({ kind, auto, selectedTemplateId }: { kind: 'digital' | 'social'; auto: AutoDocuments; selectedTemplateId: number | null }) {
    const tenant = useCurrentTenant();
    const [zoom, setZoom] = useState<TemplateExport | null>(null);
    const exportKind = kind === 'digital' ? 'digital' : 'design';
    // Diseños de redes: los creados con la plantilla elegida. Tarjetas: las últimas creadas.
    const templateFilter = kind === 'social' ? selectedTemplateId ?? undefined : undefined;
    const enabled = kind === 'digital' || selectedTemplateId != null;
    const { data, isLoading } = useQuery({
        queryKey: ['tenant', 'template-exports', 'preview', exportKind, templateFilter],
        queryFn: () => listTemplateExports({ kind: exportKind, template_id: templateFilter, page: 1, page_size: 4 }),
        enabled,
    });

    // Vista previa de la plantilla (cuando aún no hay creados): la guardada en la configuración.
    const savedId = kind === 'digital' ? (auto.settings.digital.template_id ?? auto.defaults.digital?.id ?? null) : auto.settings.social.template_id;
    const selectedId = kind === 'digital' ? (selectedTemplateId ?? auto.defaults.digital?.id ?? null) : selectedTemplateId;
    const previewIsSaved = selectedId != null && selectedId === savedId;

    if (!enabled) return null;
    const items = data?.items || [];

    return (
        <div className="space-y-2">
            <p className={labelCls}>{items.length ? 'Últimos creados' : 'Vista previa de la plantilla'}</p>
            {isLoading ? (
                <Loader2 size={16} className="animate-spin text-primary" />
            ) : items.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {items.map(it => (
                        <button key={it.id} onClick={() => setZoom(it)} title={`${it.title} · ${fmt(it.created_at)}`}
                            className="group relative aspect-[4/5] rounded-xl overflow-hidden bg-slate-100 ring-1 ring-slate-200 hover:ring-primary dark:bg-black/30 dark:ring-white/10">
                            {isRecipeDesign(it) ? <RecipeDesignView item={it} className="absolute inset-0 p-1" /> : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={getImageUrl(it.url || '')} alt={it.title} loading="lazy" className="w-full h-full object-contain" />
                            )}
                            <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] px-1.5 py-0.5 truncate">{fmt(it.created_at)}</span>
                            <span className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/30 text-white"><Eye size={16} /></span>
                        </button>
                    ))}
                </div>
            ) : previewIsSaved ? (
                kind === 'digital' ? <DigitalSample config={auto.resolved.digital?.config} tenant={tenant} /> : (
                    auto.resolved.social && (
                        <div className="relative w-40 aspect-[4/5] rounded-xl bg-slate-100 dark:bg-black/30 ring-1 ring-slate-200 dark:ring-white/10 overflow-hidden">
                            {auto.resolved.social.thumbnail_url ? (
                                <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={getImageUrl(auto.resolved.social.thumbnail_url)} alt="Ejemplo" className="w-full h-full object-contain" />
                                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-white/90 text-slate-800 text-[9px] font-bold">Ejemplo</span>
                                </>
                            ) : (
                                <TemplatePreviewThumb template={auto.resolved.social} className="w-full h-full p-2" />
                            )}
                        </div>
                    )
                )
            ) : (
                <p className="text-xs text-muted-foreground">Aún no hay creados con esta plantilla. Guarda para ver su vista previa.</p>
            )}

            {zoom && createPortal(
                <div className="fixed inset-0 z-[120] bg-black/85 flex items-center justify-center p-4" onClick={() => setZoom(null)}>
                    <div className="max-w-xl w-full" onClick={(e) => e.stopPropagation()}>
                        {isRecipeDesign(zoom) ? <RecipeDesignView item={zoom} className="w-full h-[78vh]" /> : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={getImageUrl(zoom.url || '')} alt={zoom.title} className="w-full max-h-[78vh] object-contain rounded-xl" />
                        )}
                        <div className="flex items-center justify-between mt-3 text-sm text-white">
                            <span className="font-semibold truncate">{zoom.title} <span className="text-white/60 font-normal">· {fmt(zoom.created_at)}</span></span>
                            <button onClick={() => setZoom(null)} className="text-white/70 hover:text-white">Cerrar</button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
}

/** Tarjeta de homenaje con datos de ejemplo, escalada. */
function DigitalSample({ config, tenant }: { config: Record<string, unknown> | undefined; tenant: ReturnType<typeof useCurrentTenant> }) {
    const full = buildFarewellConfig(config, { petName: 'Luna', dedication: null, photoUrl: null }, tenant);
    const dims = farewellCardDims(full.format || '1:1');
    const scale = 160 / dims.width;
    return (
        <div style={{ width: dims.width * scale, height: dims.height * scale }} className="relative rounded-xl overflow-hidden ring-1 ring-slate-200 dark:ring-white/10">
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: dims.width, height: dims.height }} className="absolute inset-0">
                <FarewellPreview config={full} />
            </div>
        </div>
    );
}
