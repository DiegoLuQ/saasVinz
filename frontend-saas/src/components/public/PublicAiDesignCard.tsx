"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Heart, Loader2 } from 'lucide-react';
import TemplateCanvas from '@/components/admin/imageTemplates/TemplateCanvas';
import { OffscreenSocial } from '@/components/tenant/registros/OffscreenRenderers';
import { ASPECT_RATIOS, TEMPLATE_FONTS_URL } from '@/lib/admin/imageTemplates/constants';
import { applyOverrides } from '@/lib/admin/imageTemplates/overrides';
import { recipeRender } from '@/lib/admin/imageTemplates/recipe';
import type { TemplateDefinition } from '@/lib/admin/imageTemplates/types';
import type { DesignRecipe } from '@/lib/tenant/imageTemplates';
import { API_BASE_URL } from '@/lib/api';

const resolveImageUrl = (path: string | null): string => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${cleanPath}`;
};

export interface PublicAiDesignData {
    id: number;
    kind: 'design' | 'illustration';
    title: string;
    url?: string | null;
    meta?: DesignRecipe | null;
    template_definition?: TemplateDefinition | null;
    render_data?: Record<string, string> | null;
}

const STAGE_MAX = 540;

function stageSize(ratio?: string) {
    const r = ASPECT_RATIOS.find(a => a.value === ratio) || ASPECT_RATIOS[0];
    return r.w >= r.h
        ? { width: STAGE_MAX, height: Math.round((STAGE_MAX * r.h) / r.w), rw: r.w, rh: r.h }
        : { width: Math.round((STAGE_MAX * r.w) / r.h), height: STAGE_MAX, rw: r.w, rh: r.h };
}

function saveBlob(blob: Blob, filename: string) {
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 2000);
}

export default function PublicAiDesignCard({
    design,
    petName,
    isDarkMode,
    variant = 'compact',
    embedded = false,
}: {
    design: PublicAiDesignData;
    petName: string;
    isDarkMode: boolean;
    variant?: 'central' | 'compact';
    embedded?: boolean;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [box, setBox] = useState({ w: 0, h: 0 });
    const [downloading, setDownloading] = useState(false);
    const [renderExportJob, setRenderExportJob] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const isRecipe = !design.url && !!design.meta && !!design.template_definition && !!design.render_data;

    useEffect(() => {
        if (!isRecipe) return;
        const id = 'image-templates-google-fonts-v2';
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = TEMPLATE_FONTS_URL;
        document.head.appendChild(link);
    }, [isRecipe]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el || !isRecipe) return;
        const ro = new ResizeObserver(([entry]) => {
            setBox({ w: entry.contentRect.width, h: entry.contentRect.height });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [isRecipe]);

    const size = useMemo(() => stageSize(design.meta?.ratio), [design.meta?.ratio]);

    const recipeRendered = useMemo(() => {
        if (!isRecipe || !design.meta || !design.render_data) return null;
        return recipeRender(design.meta, design.render_data, resolveImageUrl);
    }, [isRecipe, design.meta, design.render_data]);

    const effectiveDefinition = useMemo(() => {
        if (!isRecipe || !design.template_definition || !design.meta) return null;
        return applyOverrides(design.template_definition, design.meta.overrides);
    }, [isRecipe, design.template_definition, design.meta]);

    let canvasW = 0;
    let canvasH = 0;
    if (box.w > 0 && box.h > 0) {
        const s = Math.min(box.w / size.rw, box.h / size.rh);
        canvasW = Math.floor(size.rw * s);
        canvasH = Math.floor(size.rh * s);
    }

    const baseFilename = `recuerdo-${(petName || 'angelito').replace(/\s+/g, '-').toLowerCase()}`;

    const handleDownload = async () => {
        if (downloading) return;
        setDownloadError(null);
        setDownloading(true);

        if (isRecipe && effectiveDefinition && recipeRendered) {
            setRenderExportJob(true);
            return;
        }

        if (design.url) {
            try {
                const resolved = resolveImageUrl(design.url);
                const proxied = resolved.startsWith('http') && typeof window !== 'undefined' && !resolved.startsWith(window.location.origin)
                    ? `/api/image-proxy?url=${encodeURIComponent(resolved)}`
                    : resolved;
                const resp = await fetch(proxied);
                if (!resp.ok) throw new Error('Error al descargar');
                const blob = await resp.blob();
                const ext = blob.type.includes('png') ? 'png' : 'webp';
                saveBlob(blob, `${baseFilename}.${ext}`);
            } catch {
                setDownloadError('No se pudo descargar la imagen.');
            } finally {
                setDownloading(false);
            }
        } else {
            setDownloading(false);
        }
    };

    const isCentral = variant === 'central';
    const previewMaxW = isCentral ? 340 : 260;
    const aspectRatioStyle = `${size.rw} / ${size.rh}`;

    return (
        <div
            className={
                embedded
                    ? 'flex flex-col items-center text-center w-full overflow-hidden'
                    : `${
                        isCentral ? 'p-6 sm:p-8 rounded-[2.5rem] shadow-xl' : 'p-5 rounded-[2rem] shadow-md shadow-violet-500/5'
                    } border backdrop-blur-md transition-all duration-300 flex flex-col items-center text-center overflow-hidden ${
                        isDarkMode
                            ? 'bg-[#0f1a35]/65 border-violet-400/25'
                            : 'bg-gradient-to-br from-violet-50/70 via-white to-amber-50/30 border-violet-200/80'
                    }`
            }
        >
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-300 mb-3.5">
                <Heart size={14} className="text-violet-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                    {design.kind === 'illustration' ? 'Ilustración Conmemorativa' : 'Recuerdo Especial'}
                </span>
            </div>

            {isRecipe && effectiveDefinition && recipeRendered ? (
                <div
                    ref={containerRef}
                    style={{ width: '100%', maxWidth: `${previewMaxW}px`, aspectRatio: aspectRatioStyle }}
                    className="rounded-2xl overflow-hidden shadow-2xl border border-violet-400/30 bg-black/20 flex items-center justify-center relative my-1"
                >
                    {canvasW > 0 && canvasH > 0 ? (
                        <TemplateCanvas
                            width={canvasW}
                            height={canvasH}
                            definition={effectiveDefinition}
                            bindings={recipeRendered.bindings}
                            photos={recipeRendered.photos}
                        />
                    ) : (
                        <Loader2 size={20} className="animate-spin text-violet-400" />
                    )}
                </div>
            ) : design.url ? (
                <div
                    style={{ width: '100%', maxWidth: `${previewMaxW}px` }}
                    className="rounded-2xl overflow-hidden shadow-2xl border border-violet-400/30 bg-black/10 relative my-1"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={resolveImageUrl(design.url)}
                        alt={design.title || `Recuerdo especial de ${petName}`}
                        className="w-full h-auto block object-contain"
                    />
                </div>
            ) : null}

            <p className={`italic mt-3 ${isCentral ? 'text-xs max-w-md' : 'text-[11px]'} ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Arte conmemorativo creado especialmente para {petName}.
            </p>

            {downloadError && (
                <p className="mt-2 text-[11px] font-semibold text-red-500">{downloadError}</p>
            )}

            <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className={`${
                    isCentral ? 'mt-5 py-3.5 px-5' : 'mt-4 py-3.5 px-4'
                } w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-violet-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 cursor-pointer`}
            >
                {downloading ? (
                    <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Preparando imagen...</span>
                    </>
                ) : (
                    <>
                        <Download size={15} />
                        <span>Descargar Recuerdo (HD)</span>
                    </>
                )}
            </button>

            {renderExportJob && effectiveDefinition && recipeRendered && (
                <OffscreenSocial
                    key={design.id}
                    definition={effectiveDefinition}
                    width={size.width}
                    height={size.height}
                    bindings={recipeRendered.bindings}
                    photos={recipeRendered.photos}
                    mimeType="image/png"
                    onDone={(blob) => {
                        saveBlob(blob, `${baseFilename}.png`);
                        setRenderExportJob(false);
                        setDownloading(false);
                    }}
                    onError={() => {
                        setDownloadError('No se pudo generar la descarga.');
                        setRenderExportJob(false);
                        setDownloading(false);
                    }}
                />
            )}
        </div>
    );
}
