"use client";

import React, { useEffect, useState } from 'react';
import type Konva from 'konva';
import { Stage, Layer as KLayer, Rect, Text, Image as KImage, Group } from 'react-konva';
import type { TemplateDefinition, Layer, TextLayer, PhotoLayer } from '@/lib/admin/imageTemplates/types';

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
    stageRef?: React.Ref<Konva.Stage>;
}

function resolveText(layer: TextLayer, bindings: Bindings): string {
    if (layer.binding === 'static') return layer.static_text || '';
    return bindings[layer.binding] || '';
}

function toLocalProxy(url: string | null | undefined): string {
    if (!url) return '';
    try {
        if (typeof window !== 'undefined' && url.startsWith('http')) {
            const parsed = new URL(url);
            if (parsed.hostname !== window.location.hostname) {
                return `/api/image-proxy?url=${encodeURIComponent(url)}`;
            }
        }
    } catch { }
    return url;
}

function useImage(src: string | null): HTMLImageElement | null {
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    useEffect(() => {
        if (!src) { setImg(null); return; }
        const i = new window.Image();
        i.crossOrigin = 'anonymous';
        i.src = toLocalProxy(src);
        i.onload = () => setImg(i);
        i.onerror = () => setImg(null);
        return () => { i.onload = null; i.onerror = null; };
    }, [src]);
    return img;
}

function PhotoNode({ layer, photoUrl, width, height }: { layer: PhotoLayer; photoUrl: string | null; width: number; height: number }) {
    const image = useImage(photoUrl);
    const w = (layer.width / 100) * width;
    const h = (layer.height / 100) * height;
    const cx = (layer.x / 100) * width;
    const cy = (layer.y / 100) * height;
    const x = cx - w / 2;
    const y = cy - h / 2;

    const cornerRadius =
        layer.shape === 'circle' ? Math.min(w, h) / 2 :
            layer.shape === 'rounded' ? Math.min(w, h) * 0.18 : 0;

    return (
        <Group x={x} y={y} clipFunc={(ctx: any) => {
            ctx.beginPath();
            if (layer.shape === 'circle') {
                ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
            } else if (layer.shape === 'rounded') {
                const r = cornerRadius;
                ctx.moveTo(r, 0);
                ctx.lineTo(w - r, 0);
                ctx.quadraticCurveTo(w, 0, w, r);
                ctx.lineTo(w, h - r);
                ctx.quadraticCurveTo(w, h, w - r, h);
                ctx.lineTo(r, h);
                ctx.quadraticCurveTo(0, h, 0, h - r);
                ctx.lineTo(0, r);
                ctx.quadraticCurveTo(0, 0, r, 0);
            } else {
                ctx.rect(0, 0, w, h);
            }
            ctx.closePath();
        }}>
            {image ? (
                <KImage image={image} width={w} height={h} />
            ) : (
                <Rect width={w} height={h} fill="#1f2937" />
            )}
            {layer.border_width > 0 && (
                <Rect
                    x={layer.border_width / 2}
                    y={layer.border_width / 2}
                    width={w - layer.border_width}
                    height={h - layer.border_width}
                    cornerRadius={layer.shape === 'circle' ? Math.min(w, h) / 2 : cornerRadius}
                    stroke={layer.border_color}
                    strokeWidth={layer.border_width}
                />
            )}
        </Group>
    );
}

function TextNode({ layer, value, width, height }: { layer: TextLayer; value: string; width: number; height: number }) {
    const fontSizePx = (layer.font_size / 100) * width;
    const maxWidth = (layer.width / 100) * width;
    const cx = (layer.x / 100) * width;
    const cy = (layer.y / 100) * height;
    const x = cx - maxWidth / 2;
    const y = cy - fontSizePx / 2;

    const fontStyle = `${layer.italic ? 'italic ' : ''}${layer.font_weight || '400'}`.trim();

    return (
        <Text
            x={x}
            y={y}
            width={maxWidth}
            text={value}
            align={layer.align}
            fontFamily={layer.font_family}
            fontSize={fontSizePx}
            fontStyle={fontStyle}
            fill={layer.color}
            letterSpacing={layer.letter_spacing || 0}
            shadowColor={layer.shadow ? 'rgba(0,0,0,0.45)' : undefined}
            shadowBlur={layer.shadow ? 8 : 0}
            shadowOffset={layer.shadow ? { x: 0, y: 2 } : undefined}
            shadowOpacity={layer.shadow ? 1 : 0}
            wrap="word"
        />
    );
}

export default function TemplateCanvasImpl({ width, height, definition, bindings, photoUrl, stageRef }: Props) {
    if (!width || !height) return null;
    const bg = definition.background;
    const bgFill = bg?.type === 'color' ? bg.value : '#0f172a';

    return (
        <Stage width={width} height={height} ref={stageRef as React.Ref<Konva.Stage>}>
            <KLayer>
                <Rect x={0} y={0} width={width} height={height} fill={bgFill} opacity={bg?.opacity ?? 1} />
                {definition.layers.map((layer: Layer) => {
                    if (layer.type === 'photo') {
                        return <PhotoNode key={layer.id} layer={layer} photoUrl={photoUrl} width={width} height={height} />;
                    }
                    return <TextNode key={layer.id} layer={layer} value={resolveText(layer, bindings)} width={width} height={height} />;
                })}
            </KLayer>
        </Stage>
    );
}
