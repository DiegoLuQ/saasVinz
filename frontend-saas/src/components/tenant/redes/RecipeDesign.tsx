"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import TemplateCanvas from '@/components/admin/imageTemplates/TemplateCanvas';
import { OffscreenSocial } from '@/components/tenant/registros/OffscreenRenderers';
import { ASPECT_RATIOS, TEMPLATE_FONTS_URL } from '@/lib/admin/imageTemplates/constants';
import type { ImageTemplate } from '@/lib/admin/imageTemplates/types';
import { getRenderData, getTenantImageTemplate, type DesignRecipe, type TemplateExport } from '@/lib/tenant/imageTemplates';
import { getImageUrl } from '@/lib/tenant/api';
import { applyOverrides } from '@/lib/admin/imageTemplates/overrides';
import { recipeRender } from '@/lib/admin/imageTemplates/recipe';

/**
 * Diseños para redes guardados como receta (sin archivo): se dibujan con la
 * plantilla + la receta (textos, fotos guardadas, ilustración IA) + los datos
 * actuales de la mascota, dueño y crematorio. Solo la ilustración IA es una
 * imagen guardada; el diseño final se genera al verlo o descargarlo.
 */

const STAGE_MAX = 540;

export const isRecipeDesign = (item: TemplateExport) => item.kind === 'design' && !item.url && !!item.meta;

function useTemplateFonts() {
    useEffect(() => {
        const id = 'image-templates-google-fonts-v2';
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = TEMPLATE_FONTS_URL;
        document.head.appendChild(link);
    }, []);
}

function stageSize(ratio: string) {
    const r = ASPECT_RATIOS.find(a => a.value === ratio) || ASPECT_RATIOS[0];
    return r.w >= r.h
        ? { width: STAGE_MAX, height: Math.round((STAGE_MAX * r.h) / r.w), rw: r.w, rh: r.h }
        : { width: Math.round((STAGE_MAX * r.w) / r.h), height: STAGE_MAX, rw: r.w, rh: r.h };
}

function buildRender(recipe: DesignRecipe, data: Record<string, string>) {
    return recipeRender(recipe, data, getImageUrl);
}

/** Plantilla + datos actuales de la mascota para dibujar una receta. */
function useRecipeSources(item: TemplateExport | null, enabled = true) {
    const on = enabled && !!item && isRecipeDesign(item) && item.template_id != null;
    const tpl = useQuery({
        queryKey: ['tenant', 'image-template', item?.template_id],
        queryFn: () => getTenantImageTemplate(item!.template_id!),
        enabled: on,
        staleTime: 5 * 60_000,
    });
    const data = useQuery({
        queryKey: ['tenant', 'render-data', item?.pet_id ?? null],
        queryFn: () => getRenderData(item!.pet_id ?? null),
        enabled: on,
        staleTime: 60_000,
    });
    return { template: tpl.data, data: data.data, error: tpl.error || data.error, loading: tpl.isLoading || data.isLoading };
}

/** Diseño dibujado en vivo, ajustado (contain) al contenedor. */
export function RecipeDesignView({ item, className }: { item: TemplateExport; className?: string }) {
    useTemplateFonts();
    const ref = useRef<HTMLDivElement>(null);
    const [box, setBox] = useState({ w: 0, h: 0 });
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    const { template, data, error } = useRecipeSources(item);
    const recipe = item.meta!;
    const size = stageSize(recipe.ratio);
    let cw = 0, ch = 0;
    if (box.w > 0 && box.h > 0) {
        const s = Math.min(box.w / size.rw, box.h / size.rh);
        cw = Math.floor(size.rw * s);
        ch = Math.floor(size.rh * s);
    }
    const ready = template?.definition && data;
    const render = ready ? buildRender(recipe, data) : null;
    return (
        <div ref={ref} className={`flex items-center justify-center ${className || ''}`}>
            {error ? <span className="text-[10px] text-muted-foreground px-2 text-center">Plantilla no disponible</span>
                : !render || cw === 0 ? <Loader2 size={16} className="animate-spin text-muted-foreground" />
                    : <TemplateCanvas width={cw} height={ch} definition={applyOverrides(template!.definition, recipe.overrides)} bindings={render.bindings} photos={render.photos} />}
        </div>
    );
}

/**
 * Descarga (PNG 1080 px) de un diseño: si es receta se dibuja fuera de pantalla;
 * si es una imagen guardada se descarga tal cual. Devuelve `node` para montar.
 */
export function useDesignDownload(onError?: (msg: string) => void) {
    useTemplateFonts();
    const [job, setJob] = useState<{ item: TemplateExport; template: ImageTemplate; data: Record<string, string>; name: string } | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);

    const save = (blob: Blob, name: string) => {
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(href), 2000);
    };

    const download = async (item: TemplateExport, baseName: string) => {
        setBusyId(item.id);
        try {
            if (isRecipeDesign(item) && item.template_id != null) {
                const [template, data] = await Promise.all([getTenantImageTemplate(item.template_id), getRenderData(item.pet_id ?? null)]);
                setJob({ item, template, data, name: `${baseName}.png` }); // termina en onDone del render
                return;
            }
            if (!item.url) throw new Error('Sin imagen');
            const url = getImageUrl(item.url);
            const proxied = url.startsWith('http') && !url.startsWith(window.location.origin)
                ? `/api/image-proxy?url=${encodeURIComponent(url)}` : url;
            const blob = await (await fetch(proxied)).blob();
            save(blob, `${baseName}.${blob.type.includes('png') ? 'png' : 'webp'}`);
        } catch {
            onError?.('No se pudo descargar la imagen');
        }
        setBusyId(null);
    };

    let node: React.ReactNode = null;
    if (job) {
        const recipe = job.item.meta!;
        const size = stageSize(recipe.ratio);
        const { bindings, photos } = buildRender(recipe, job.data);
        node = (
            <OffscreenSocial key={job.item.id} definition={applyOverrides(job.template.definition, recipe.overrides)} width={size.width} height={size.height}
                bindings={bindings} photos={photos} mimeType="image/png"
                onDone={(blob) => { save(blob, job.name); setJob(null); setBusyId(null); }}
                onError={() => { onError?.('No se pudo dibujar el diseño'); setJob(null); setBusyId(null); }} />
        );
    }
    return { download, busyId, node };
}
