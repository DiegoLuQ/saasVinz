"use client";

import React, { useEffect, useRef, useState } from 'react';
import TemplateCanvas from './TemplateCanvas';
import { ASPECT_RATIOS, DATA_FIELD_GROUPS, SAMPLE_PHOTO_URL } from '@/lib/admin/imageTemplates/constants';
import type { ImageTemplate, PhotoFills, TemplateLatestDesign } from '@/lib/admin/imageTemplates/types';
import { applyOverrides } from '@/lib/admin/imageTemplates/overrides';
import { recipeRender } from '@/lib/admin/imageTemplates/recipe';
import { getImageUrl } from '@/lib/admin/api';
import type { Bindings } from './TemplateCanvas';

/**
 * Vista previa en vivo de una plantilla de imagen, renderizada desde su
 * `definition` con datos de ejemplo (nombre, fecha de hoy y la frase por
 * defecto). Es la misma ruta de render que usa el tenant (TemplateCanvas),
 * así que lo que se ve aquí es exactamente lo que generará la plantilla.
 */

export function sampleBindings(template: Pick<ImageTemplate, 'default_phrase'>): Bindings {
    const samples: Bindings = {};
    DATA_FIELD_GROUPS.forEach(g => g.fields.forEach(f => { samples[f.value] = f.sample; }));
    return {
        ...samples,
        date: new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }),
        phrase: template.default_phrase || 'Siempre en nuestro corazón',
        ai_text: 'Tulioca, en tus 12 años llenaste nuestra vida de alegría y amor. Gracias por tu compañía fiel, por cada juego y cada mirada. Tu recuerdo vivirá por siempre en nuestros corazones.',
    };
}

export function templateRatio(template: ImageTemplate) {
    return ASPECT_RATIOS.find(r => r.value === template.supported_ratios?.[0]) || ASPECT_RATIOS[1];
}

interface ThumbProps {
    template: ImageTemplate;
    /** Clase del contenedor exterior (define el área disponible). */
    className?: string;
    /** Último diseño real creado con la plantilla: se muestra en vez de los datos de ejemplo. */
    design?: TemplateLatestDesign | null;
    /** Sin diseño: última ilustración IA real, puesta en la capa de IA sobre los datos de ejemplo. */
    illustrationUrl?: string | null;
}

export default function TemplatePreviewThumb({ template, className, design, illustrationUrl }: ThumbProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [box, setBox] = useState({ w: 0, h: 0 });

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            setBox({ w: width, h: height });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const recipe = design && !design.url && design.meta && design.bindings ? design.meta : null;
    const ratio = (recipe && ASPECT_RATIOS.find(r => r.value === recipe.ratio)) || templateRatio(template);
    // El canvas se ajusta DENTRO del área disponible respetando el ratio de la
    // plantilla (contain), para que las cards del grid mantengan tamaño uniforme.
    let cw = 0, ch = 0;
    if (box.w > 0 && box.h > 0) {
        const scale = Math.min(box.w / ratio.w, box.h / ratio.h);
        cw = Math.floor(ratio.w * scale);
        ch = Math.floor(ratio.h * scale);
    }

    // Diseño antiguo guardado como archivo: se muestra la imagen tal cual.
    if (design?.url) {
        return (
            <div className={`flex items-center justify-center ${className || ''}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getImageUrl(design.url)} alt={design.title} className="max-w-full max-h-full object-contain shadow-lg rounded-sm" />
            </div>
        );
    }

    let bindings: Bindings = sampleBindings(template);
    let photos: PhotoFills | undefined;
    if (recipe) {
        ({ bindings, photos } = recipeRender(recipe, design!.bindings!, getImageUrl));
    } else if (illustrationUrl) {
        photos = { ai: { url: getImageUrl(illustrationUrl), zoom: 1, offset_x: 0, offset_y: 0 } };
    }
    const definition = recipe ? applyOverrides(template.definition, recipe.overrides) : template.definition;

    return (
        <div ref={ref} className={`flex items-center justify-center ${className || ''}`}>
            {cw > 0 && template.definition?.layers && (
                <div className="shadow-lg ring-1 ring-white/10 overflow-hidden rounded-sm">
                    <TemplateCanvas
                        width={cw}
                        height={ch}
                        definition={definition}
                        bindings={bindings}
                        photos={photos}
                        photoUrl={SAMPLE_PHOTO_URL}
                    />
                </div>
            )}
        </div>
    );
}
