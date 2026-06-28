"use client";

import React, { forwardRef } from 'react';
import dynamic from 'next/dynamic';
import type Konva from 'konva';
import type { TemplateDefinition } from '@/lib/admin/imageTemplates/types';

export type Bindings = {
    pet_name: string;
    date: string;
    phrase: string;
    static: string;
};

interface Props {
    width: number;
    height: number;
    definition: TemplateDefinition;
    bindings: Bindings;
    photoUrl: string | null;
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
