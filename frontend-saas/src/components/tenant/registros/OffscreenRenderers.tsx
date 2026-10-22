"use client";

import React, { useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import type Konva from 'konva';
import FarewellPreview from '@/app/(tenant)/tenant/dashboard/documentos/disenos/components/FarewellPreview';
import TemplateCanvas, { type Bindings } from '@/components/admin/imageTemplates/TemplateCanvas';
import { EXPORT_WIDTH } from '@/lib/admin/imageTemplates/constants';
import type { PhotoFills, TemplateDefinition } from '@/lib/admin/imageTemplates/types';
import { farewellCardDims, type FarewellConfig } from '@/lib/tenant/farewellCard';

/** Contenedor fuera de pantalla: se dibuja a tamaño real pero el usuario no lo ve. */
const HIDDEN: React.CSSProperties = { position: 'fixed', left: -10000, top: 0, pointerEvents: 'none', opacity: 1 };

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function waitImages(root: HTMLElement, timeoutMs = 15000) {
    const imgs = Array.from(root.querySelectorAll('img'));
    await Promise.race([
        Promise.all(imgs.map(img => (img.complete ? Promise.resolve() : new Promise<void>(res => {
            img.addEventListener('load', () => res(), { once: true });
            img.addEventListener('error', () => res(), { once: true });
        })))),
        sleep(timeoutMs),
    ]);
}

/** Espera a que las fotos con difuminado (dibujadas en <canvas> tras descargarse) estén listas. */
async function waitCanvasPhotos(root: HTMLElement, timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const pending = root.querySelectorAll('canvas[data-photo-state="loading"]');
        if (pending.length === 0) return;
        await sleep(150);
    }
}

/**
 * Tarjeta digital de homenaje dibujada fuera de pantalla y capturada con
 * html2canvas (mismo render que el expediente). Llama onDone con el PNG.
 */
export function OffscreenFarewell({ config, onDone, onError }: {
    config: FarewellConfig;
    onDone: (blob: Blob) => void;
    onError: (e: Error) => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const dims = farewellCardDims(config.format || '1:1');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                await sleep(100);
                if (!ref.current) throw new Error('No se pudo preparar la tarjeta');
                await waitImages(ref.current);
                await waitCanvasPhotos(ref.current);
                await document.fonts?.ready;
                const canvas = await html2canvas(ref.current, { useCORS: true, scale: 2, backgroundColor: null, logging: false });
                const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
                if (cancelled) return;
                if (!blob) throw new Error('No se pudo exportar la tarjeta');
                onDone(blob);
            } catch (e) {
                if (!cancelled) onError(e as Error);
            }
        })();
        return () => { cancelled = true; };
        // Se ejecuta una vez por montaje (cada trabajo monta un componente nuevo).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div aria-hidden style={{ ...HIDDEN, width: dims.width, height: dims.height }}>
            <FarewellPreview ref={ref} config={config} />
        </div>
    );
}

/** Cuántas imágenes debe tener el lienzo una vez cargado (para saber cuándo capturarlo). */
function expectedImages(def: TemplateDefinition, photos: PhotoFills, bindings: Bindings): number {
    let n = def.background?.type === 'image' && def.background.value ? 1 : 0;
    for (const l of def.layers) {
        if (l.type === 'photo') {
            const key = l.source === 'ai' ? 'ai' : (l.slot || 'photo_1');
            if (photos[key]?.url) n += 1;
        } else if (l.type === 'sticker') {
            if (l.binding ? bindings[l.binding] : l.url) n += 1;
        }
    }
    return n;
}

/**
 * Diseño para redes dibujado fuera de pantalla con Konva (mismo render que
 * «Diseños para Redes») y exportado a 1080 px de ancho (WebP o PNG).
 */
export function OffscreenSocial({ definition, width, height, bindings, photos, onDone, onError, mimeType = 'image/webp' }: {
    definition: TemplateDefinition;
    /** PNG para descargar; WebP (por defecto) para guardar. */
    mimeType?: 'image/webp' | 'image/png';
    width: number;
    height: number;
    bindings: Bindings;
    photos: PhotoFills;
    onDone: (blob: Blob) => void;
    onError: (e: Error) => void;
}) {
    const stageRef = useRef<Konva.Stage>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const expected = expectedImages(definition, photos, bindings);
                const started = Date.now();
                // Espera a que Konva tenga todas las imágenes (las capas sin imagen se dibujan como placeholder).
                while (!cancelled && Date.now() - started < 20000) {
                    const stage = stageRef.current;
                    if (stage && stage.find('Image').length >= expected) break;
                    await sleep(250);
                }
                await document.fonts?.ready;
                await sleep(300);
                const stage = stageRef.current;
                if (!stage) throw new Error('No se pudo preparar el diseño');
                const blob = await stage.toBlob({ pixelRatio: EXPORT_WIDTH / width, mimeType, quality: 0.92 }) as Blob;
                if (cancelled) return;
                if (!blob) throw new Error('No se pudo exportar el diseño');
                onDone(blob);
            } catch (e) {
                if (!cancelled) onError(e as Error);
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div aria-hidden style={{ ...HIDDEN, width, height }}>
            <TemplateCanvas ref={stageRef} width={width} height={height} definition={definition} bindings={bindings} photos={photos} />
        </div>
    );
}
