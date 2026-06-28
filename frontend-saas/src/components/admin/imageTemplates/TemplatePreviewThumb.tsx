"use client";

import React, { useEffect, useRef, useState } from 'react';
import TemplateCanvas from './TemplateCanvas';
import { ASPECT_RATIOS, SAMPLE_PHOTO_URL } from '@/lib/admin/imageTemplates/constants';
import type { ImageTemplate } from '@/lib/admin/imageTemplates/types';
import type { Bindings } from './TemplateCanvas';

/**
 * Vista previa en vivo de una plantilla de imagen, renderizada desde su
 * `definition` con datos de ejemplo (nombre, fecha de hoy y la frase por
 * defecto). Es la misma ruta de render que usa el tenant (TemplateCanvas),
 * así que lo que se ve aquí es exactamente lo que generará la plantilla.
 */

export function sampleBindings(template: ImageTemplate): Bindings {
    return {
        pet_name: 'Tulioca',
        date: new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }),
        phrase: template.default_phrase || 'Siempre en nuestro corazón',
        static: '',
    };
}

export function templateRatio(template: ImageTemplate) {
    return ASPECT_RATIOS.find(r => r.value === template.supported_ratios?.[0]) || ASPECT_RATIOS[1];
}

interface ThumbProps {
    template: ImageTemplate;
    /** Clase del contenedor exterior (define el área disponible). */
    className?: string;
}

export default function TemplatePreviewThumb({ template, className }: ThumbProps) {
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

    const ratio = templateRatio(template);
    // El canvas se ajusta DENTRO del área disponible respetando el ratio de la
    // plantilla (contain), para que las cards del grid mantengan tamaño uniforme.
    let cw = 0, ch = 0;
    if (box.w > 0 && box.h > 0) {
        const scale = Math.min(box.w / ratio.w, box.h / ratio.h);
        cw = Math.floor(ratio.w * scale);
        ch = Math.floor(ratio.h * scale);
    }

    return (
        <div ref={ref} className={`flex items-center justify-center ${className || ''}`}>
            {cw > 0 && template.definition?.layers && (
                <div className="shadow-lg ring-1 ring-white/10 overflow-hidden rounded-sm">
                    <TemplateCanvas
                        width={cw}
                        height={ch}
                        definition={template.definition}
                        bindings={sampleBindings(template)}
                        photoUrl={SAMPLE_PHOTO_URL}
                    />
                </div>
            )}
        </div>
    );
}
