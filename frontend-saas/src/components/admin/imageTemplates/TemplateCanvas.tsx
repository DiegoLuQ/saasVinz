"use client";

import React, { forwardRef } from 'react';
import dynamic from 'next/dynamic';
import type Konva from 'konva';
import type { ImageBinding, Layer, PhotoFills, TemplateDefinition, TextBinding } from '@/lib/admin/imageTemplates/types';

/** Valores de los datos: textos por TextBinding y URLs de imagen por ImageBinding. */
export type Bindings = Partial<Record<TextBinding | ImageBinding, string>>;

interface Props {
    width: number;
    height: number;
    definition: TemplateDefinition;
    bindings: Bindings;
    photoUrl?: string | null;
    photos?: PhotoFills;
    editable?: boolean;
    selectedId?: string | null;
    onSelect?: (id: string | null) => void;
    onLayerChange?: (id: string, patch: Partial<Layer>) => void;
}

// react-konva accesses `window` at import time, so the entire Konva subtree
// must be loaded client-only. We dynamic-import the implementation as a unit
// so Konva's custom reconciler sees real component classes (not wrappers).
const Impl = dynamic(() => import('./TemplateCanvasImpl'), {
    ssr: false,
}) as React.ComponentType<Props & { stageRef?: React.Ref<Konva.Stage> }>;

const TemplateCanvas = forwardRef<Konva.Stage, Props>(function TemplateCanvas(props, ref) {
    return <Impl {...props} stageRef={ref ?? undefined} />;
});

export default TemplateCanvas;
