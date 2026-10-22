"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Konva from 'konva';
import { Stage, Layer as KLayer, Rect, Text, Image as KImage, Group, Ellipse, Transformer, Line } from 'react-konva';
import type {
    TemplateDefinition, Layer, TextLayer, PhotoLayer, StickerLayer, PhotoFills, PhotoFill, TextBinding, ImageBinding,
} from '@/lib/admin/imageTemplates/types';

/** Valores de los datos: textos por TextBinding y URLs de imagen por ImageBinding. */
export type Bindings = Partial<Record<TextBinding | ImageBinding, string>>;

interface Props {
    width: number;
    height: number;
    definition: TemplateDefinition;
    bindings: Bindings;
    /** Foto única (compatibilidad): se usa en cualquier hueco sin foto propia en `photos`. */
    photoUrl?: string | null;
    photos?: PhotoFills;
    stageRef?: React.Ref<Konva.Stage>;
    /** Modo editor del SuperAdmin: capas seleccionables, arrastrables y redimensionables. */
    editable?: boolean;
    selectedId?: string | null;
    onSelect?: (id: string | null) => void;
    onLayerChange?: (id: string, patch: Partial<Layer>) => void;
}

// Tamaño de referencia con el que se diseñaron los grosores en px (bordes,
// resplandor): se escalan con el ancho para verse igual en miniatura y en export.
const REF_WIDTH = 520;

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

function useImage(src: string | null | undefined): HTMLImageElement | null {
    // Se guarda junto a su src: si cambia la fuente, la imagen anterior deja de devolverse.
    const [loaded, setLoaded] = useState<{ src: string; img: HTMLImageElement } | null>(null);
    useEffect(() => {
        if (!src) return;
        const i = new window.Image();
        i.crossOrigin = 'anonymous';
        i.src = toLocalProxy(src);
        i.onload = () => setLoaded({ src, img: i });
        return () => { i.onload = null; };
    }, [src]);
    return src && loaded?.src === src ? loaded.img : null;
}

/** Rectángulo de dibujo "cover" de una imagen dentro de w×h, con zoom y desplazamiento. */
function coverRect(img: HTMLImageElement, w: number, h: number, zoom = 1, offX = 0, offY = 0) {
    const scale = Math.max(w / img.width, h / img.height) * zoom;
    const dw = img.width * scale;
    const dh = img.height * scale;
    return {
        x: (w - dw) / 2 + (offX / 100) * w,
        y: (h - dh) / 2 + (offY / 100) * h,
        width: dw,
        height: dh,
    };
}

function shapePath(ctx: Konva.Context, shape: PhotoLayer['shape'], w: number, h: number) {
    ctx.beginPath();
    if (shape === 'circle') {
        ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    } else if (shape === 'rounded') {
        const r = Math.min(w, h) * 0.18;
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
}

type NodeCommon = {
    width: number;
    height: number;
    editable: boolean;
    onSelect?: (id: string) => void;
    onLayerChange?: (id: string, patch: Partial<Layer>) => void;
    /** Guías de centro visibles mientras se arrastra (null = ninguna). */
    onGuides?: (g: Guides | null) => void;
};

type Guides = { v: boolean; h: boolean };
/** Distancia (px de pantalla) a la que una capa arrastrada se pega al centro del lienzo. */
const SNAP_PX = 8;

/** Grupo centrado en (x,y) %, arrastrable en modo editor. Al arrastrar cerca del
 * centro del lienzo (horizontal o vertical) se pega a él y muestra la guía;
 * con Alt presionado no se pega. */
function LayerGroup({
    layer, w, h, rotation = 0, width, height, editable, onSelect, onLayerChange, onGuides, children,
}: NodeCommon & { layer: Layer; w: number; h: number; rotation?: number; children: React.ReactNode }) {
    return (
        <Group
            id={layer.id}
            x={(layer.x / 100) * width}
            y={(layer.y / 100) * height}
            offsetX={w / 2}
            offsetY={h / 2}
            rotation={rotation}
            draggable={editable}
            onMouseDown={editable ? () => onSelect?.(layer.id) : undefined}
            onTap={editable ? () => onSelect?.(layer.id) : undefined}
            onDragMove={editable ? (e) => {
                const n = e.target;
                if ((e.evt as MouseEvent).altKey) { onGuides?.(null); return; }
                const v = Math.abs(n.x() - width / 2) <= SNAP_PX;
                const hz = Math.abs(n.y() - height / 2) <= SNAP_PX;
                if (v) n.x(width / 2);
                if (hz) n.y(height / 2);
                onGuides?.(v || hz ? { v, h: hz } : null);
            } : undefined}
            onDragEnd={(e) => {
                const n = e.target;
                onGuides?.(null);
                onLayerChange?.(layer.id, {
                    x: Math.round((n.x() / width) * 1000) / 10,
                    y: Math.round((n.y() / height) * 1000) / 10,
                });
            }}
        >
            {children}
        </Group>
    );
}

function PhotoNode({ layer, fill, ...common }: NodeCommon & { layer: PhotoLayer; fill: PhotoFill | undefined }) {
    const isAi = layer.source === 'ai';
    const { width, height } = common;
    const image = useImage(fill?.url);
    const k = width / REF_WIDTH;
    const w = (layer.width / 100) * width;
    const h = (layer.height / 100) * height;
    const glow = (layer.glow_blur || 0) * k;
    const border = (layer.border_width || 0) * k;
    const isCircle = layer.shape === 'circle';
    const radius = layer.shape === 'rounded' ? Math.min(w, h) * 0.18 : 0;

    return (
        <LayerGroup layer={layer} w={w} h={h} {...common}>
            {glow > 0 && (
                isCircle ? (
                    <Ellipse x={w / 2} y={h / 2} radiusX={w / 2} radiusY={h / 2}
                        stroke={layer.glow_color || '#ffffff'} strokeWidth={Math.max(border, 2 * k)}
                        shadowColor={layer.glow_color || '#ffffff'} shadowBlur={glow} shadowOpacity={1} />
                ) : (
                    <Rect width={w} height={h} cornerRadius={radius}
                        stroke={layer.glow_color || '#ffffff'} strokeWidth={Math.max(border, 2 * k)}
                        shadowColor={layer.glow_color || '#ffffff'} shadowBlur={glow} shadowOpacity={1} />
                )
            )}
            <Group clipFunc={(ctx: Konva.Context) => shapePath(ctx, layer.shape, w, h)}>
                {image ? (
                    <KImage image={image} {...coverRect(image, w, h, fill?.zoom, fill?.offset_x, fill?.offset_y)} />
                ) : (
                    <>
                        <Rect width={w} height={h} fill={isAi ? '#3b1d5c' : '#1f2937'} />
                        {isAi && (
                            <Text width={w} height={h} align="center" verticalAlign="middle" text={'✨ Ilustración IA'}
                                fill="#e9d5ff" fontStyle="bold" fontSize={Math.max(10, Math.min(w, h) * 0.09)} listening={false} />
                        )}
                    </>
                )}
                {border > 0 && (
                    isCircle ? (
                        <Ellipse x={w / 2} y={h / 2} radiusX={w / 2} radiusY={h / 2}
                            stroke={layer.border_color} strokeWidth={border * 2} />
                    ) : (
                        <Rect width={w} height={h} cornerRadius={radius} stroke={layer.border_color} strokeWidth={border * 2} />
                    )
                )}
            </Group>
        </LayerGroup>
    );
}

function StickerNode({ layer, bindings, ...common }: NodeCommon & { layer: StickerLayer; bindings: Bindings }) {
    const src = layer.binding ? bindings[layer.binding] : layer.url;
    const image = useImage(src);
    const w = (layer.width / 100) * common.width;
    const h = image ? (w * image.height) / image.width : w;
    return (
        <LayerGroup layer={layer} w={w} h={h} rotation={layer.rotation || 0} {...common}>
            {image ? (
                <KImage image={image} width={w} height={h} opacity={layer.opacity ?? 1} />
            ) : common.editable ? (
                <>
                    <Rect width={w} height={h} stroke="#ffffff55" dash={[6, 4]} />
                    {layer.binding === 'tenant_logo' && (
                        <Text width={w} height={h} align="center" verticalAlign="middle" text="Logo"
                            fill="#ffffff99" fontSize={Math.max(10, w * 0.14)} listening={false} />
                    )}
                </>
            ) : null}
        </LayerGroup>
    );
}

function TextNode({ layer, value, ...common }: NodeCommon & { layer: TextLayer; value: string }) {
    const { width, height } = common;
    const baseSize = (layer.font_size / 100) * width;
    const maxWidth = (layer.width / 100) * width;
    const boxH = layer.height ? (layer.height / 100) * height : null;
    const fontStyle = `${layer.italic ? 'italic ' : ''}${layer.font_weight || '400'}`.trim();
    const lineHeight = layer.line_height || 1.25;
    const shown = value || (common.editable ? `[${layer.binding}]` : '');

    // Auto-ajuste: con alto máximo definido, se achica la letra hasta que el texto quepa.
    const fontSize = useMemo(() => {
        if (!boxH || !shown) return baseSize;
        let fs = baseSize;
        const probe = new Konva.Text({
            text: shown, width: maxWidth, fontFamily: layer.font_family, fontStyle,
            letterSpacing: layer.letter_spacing || 0, lineHeight, wrap: 'word',
        });
        for (let i = 0; i < 40 && fs > 6; i++) {
            probe.fontSize(fs);
            if (probe.height() <= boxH) break;
            fs *= 0.94;
        }
        probe.destroy();
        return fs;
    }, [boxH, shown, baseSize, maxWidth, layer.font_family, fontStyle, layer.letter_spacing, lineHeight]);

    // Sin alto fijo se mantiene el anclaje histórico: la primera línea centrada en y.
    const groupH = boxH ?? fontSize;
    return (
        <LayerGroup layer={layer} w={maxWidth} h={groupH} {...common}>
            <Text
                width={maxWidth}
                height={boxH ?? undefined}
                verticalAlign={boxH ? 'middle' : 'top'}
                text={shown}
                align={layer.align}
                fontFamily={layer.font_family}
                fontSize={fontSize}
                fontStyle={fontStyle}
                fill={layer.color}
                letterSpacing={layer.letter_spacing || 0}
                lineHeight={lineHeight}
                shadowColor={layer.shadow ? 'rgba(0,0,0,0.6)' : undefined}
                shadowBlur={layer.shadow ? 8 : 0}
                shadowOffset={layer.shadow ? { x: 0, y: 2 } : undefined}
                shadowOpacity={layer.shadow ? 1 : 0}
                wrap="word"
            />
            {common.editable && boxH && <Rect width={maxWidth} height={boxH} stroke="#ffffff40" dash={[4, 4]} listening={false} />}
        </LayerGroup>
    );
}

function Background({ definition, width, height }: { definition: TemplateDefinition; width: number; height: number }) {
    const bg = definition.background;
    const image = useImage(bg?.type === 'image' ? bg.value : null);
    if (bg?.type === 'image') {
        return (
            <>
                <Rect name="bg" width={width} height={height} fill="#0f172a" />
                {image && <KImage name="bg" image={image} opacity={bg.opacity ?? 1} {...coverRect(image, width, height)} />}
            </>
        );
    }
    return <Rect name="bg" width={width} height={height} fill={bg?.value || '#0f172a'} opacity={bg?.opacity ?? 1} />;
}

export default function TemplateCanvasImpl({
    width, height, definition, bindings, photoUrl, photos, stageRef, editable = false, selectedId, onSelect, onLayerChange,
}: Props) {
    const trRef = useRef<Konva.Transformer>(null);
    const layerRef = useRef<Konva.Layer>(null);
    const [guides, setGuides] = useState<Guides | null>(null);

    const selected = editable ? definition.layers.find(l => l.id === selectedId) : undefined;

    useEffect(() => {
        const tr = trRef.current;
        if (!tr) return;
        const node = selected ? layerRef.current?.findOne(`#${selected.id}`) : null;
        tr.nodes(node ? [node] : []);
        tr.getLayer()?.batchDraw();
    }, [selected, definition]);

    if (!width || !height) return null;

    const common: NodeCommon = {
        width, height, editable,
        onSelect: editable ? (id) => onSelect?.(id) : undefined,
        onLayerChange,
        onGuides: editable ? setGuides : undefined,
    };

    const fillFor = (layer: PhotoLayer): PhotoFill | undefined => {
        const key = layer.source === 'ai' ? 'ai' : (layer.slot || 'photo_1');
        if (photos?.[key]?.url) return photos[key];
        if (layer.source === 'ai') return undefined;
        return photoUrl ? { url: photoUrl, zoom: 1, offset_x: 0, offset_y: 0 } : undefined;
    };

    const handleTransformEnd = () => {
        const node = trRef.current?.nodes()[0];
        if (!node || !selected) return;
        const sx = node.scaleX();
        const sy = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        const pct = (v: number, total: number) => Math.round((v / total) * 1000) / 10;
        const x = pct(node.x(), width);
        const y = pct(node.y(), height);
        if (selected.type === 'photo') {
            onLayerChange?.(selected.id, {
                x, y,
                width: Math.max(5, pct((selected.width / 100) * width * sx, width)),
                height: Math.max(5, pct((selected.height / 100) * height * sy, height)),
            });
        } else if (selected.type === 'sticker') {
            onLayerChange?.(selected.id, {
                x, y, rotation: Math.round(node.rotation()),
                width: Math.max(2, pct((selected.width / 100) * width * sx, width)),
            });
        } else {
            onLayerChange?.(selected.id, {
                x, y,
                width: Math.min(100, Math.max(5, pct((selected.width / 100) * width * sx, width))),
                ...(selected.height ? { height: Math.max(3, pct((selected.height / 100) * height * sy, height)) } : {}),
            });
        }
    };

    return (
        <Stage
            width={width}
            height={height}
            ref={stageRef as React.Ref<Konva.Stage>}
            onMouseDown={editable ? (e) => {
                const t = e.target;
                if (t === t.getStage() || t.name() === 'bg') onSelect?.(null);
            } : undefined}
        >
            <KLayer ref={layerRef}>
                <Background definition={definition} width={width} height={height} />
                {definition.layers.map((layer: Layer) => {
                    if (layer.type === 'photo') {
                        return <PhotoNode key={layer.id} layer={layer} fill={fillFor(layer)} {...common} />;
                    }
                    if (layer.type === 'sticker') {
                        return <StickerNode key={layer.id} layer={layer} bindings={bindings} {...common} />;
                    }
                    return <TextNode key={layer.id} layer={layer} value={resolveText(layer, bindings)} {...common} />;
                })}
                {editable && guides?.v && (
                    <Line points={[width / 2, 0, width / 2, height]} stroke="#f43f5e" strokeWidth={1} dash={[6, 4]} listening={false} />
                )}
                {editable && guides?.h && (
                    <Line points={[0, height / 2, width, height / 2]} stroke="#f43f5e" strokeWidth={1} dash={[6, 4]} listening={false} />
                )}
                {editable && (
                    <Transformer
                        ref={trRef}
                        rotateEnabled={selected?.type === 'sticker'}
                        keepRatio={selected?.type === 'sticker'}
                        enabledAnchors={
                            selected?.type === 'text' && !selected.height
                                ? ['middle-left', 'middle-right']
                                : undefined
                        }
                        onTransformEnd={handleTransformEnd}
                        borderStroke="#10b981"
                        anchorStroke="#10b981"
                        anchorSize={9}
                    />
                )}
            </KLayer>
        </Stage>
    );
}
