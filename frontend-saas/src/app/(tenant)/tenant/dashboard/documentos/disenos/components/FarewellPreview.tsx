"use client";

import React, { forwardRef, useEffect, useRef } from 'react';
import { getImageUrl } from '@/lib/tenant/api';
import { getClipPath, getImageFilter } from '../utils/imageUtils';

function toLocalProxy(url: string | null | undefined): string {
    if (!url) return '';
    try {
        if (url.startsWith('http')) {
            const parsed = new URL(url);
            // If it is already proxied, do not proxy again
            if (parsed.pathname === '/api/image-proxy') {
                return url;
            }
            
            // Check if same origin
            let isSameOrigin = false;
            if (typeof window !== 'undefined') {
                isSameOrigin = parsed.host === window.location.host;
            } else {
                // On server (SSR), check if it points to localhost/lvh.me on port 3000
                isSameOrigin = parsed.host.includes('localhost:3000') || parsed.host.includes('lvh.me:3000');
            }
            
            if (!isSameOrigin) {
                const proxied = `/api/image-proxy?url=${encodeURIComponent(url)}`;
                console.log("[toLocalProxy] Proxying external URL:", url, "->", proxied);
                return proxied;
            }
        }
    } catch (e) {
        console.error("[toLocalProxy] Error parsing URL:", url, e);
    }
    return url;
}

/* ------------------------------------------------------------------ */
/*  FarewellPetImage                                                   */
/*  Renders the pet photo with an optional feathered vignette using a  */
/*  real <canvas> element so html2canvas can capture the effect when   */
/*  exporting to PNG (CSS mask-image is NOT supported by html2canvas). */
/* ------------------------------------------------------------------ */
interface PetImageProps {
    src: string;
    width: number;
    height: number;
    shape: 'circle' | 'square' | 'rounded';
    borderColor: string;
    borderWidth: number;
    glow: { enabled: boolean; color: string; size: number } | undefined;
    objectFit?: string;
    glowScale: number; // uniform scale factor for glow size
}

function FarewellPetImage({
    src,
    width,
    height,
    shape,
    borderColor,
    borderWidth,
    glow,
    objectFit = 'cover',
    glowScale,
}: PetImageProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);

    const useFeather = !!(glow?.enabled);
    console.log("[FarewellPetImage] Render:", { src, width, height, shape, useFeather });

    // Draw the feathered image onto <canvas> when glow is active
    useEffect(() => {
        if (!useFeather) return;
        const canvas = canvasRef.current;
        if (!canvas) {
            console.warn("[FarewellPetImage] useEffect: Canvas ref is null");
            return;
        }

        console.log("[FarewellPetImage] Starting image load:", src);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            console.log("[FarewellPetImage] Image loaded successfully:", src, "Dimensions:", img.naturalWidth, "x", img.naturalHeight);
            imgRef.current = img;
            drawFeathered(canvas, img, width, height, shape, glow!);
        };
        img.onerror = (err) => {
            console.warn("[FarewellPetImage] CORS loading failed for pet image with crossOrigin='anonymous', retrying without it:", src, err);
            const fallbackImg = new Image();
            fallbackImg.onload = () => {
                console.log("[FarewellPetImage] Fallback image loaded successfully:", fallbackImg.src);
                imgRef.current = fallbackImg;
                drawFeathered(canvas, fallbackImg, width, height, shape, glow!);
            };
            fallbackImg.onerror = (err2) => {
                console.error("[FarewellPetImage] Fallback image also failed to load:", fallbackImg.src, err2);
            };
            // Append a cache-buster query parameter to bypass poisoned browser cache for this URL
            const fallbackSrc = src + (src.includes('?') ? '&' : '?') + 'cors-fallback=1';
            console.log("[FarewellPetImage] Retrying with fallback URL:", fallbackSrc);
            fallbackImg.src = fallbackSrc;
        };
        img.src = src;

        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [src, width, height, shape, glow?.color, glow?.size, glow?.enabled, useFeather]);

    if (!useFeather) {
        // Standard rendering — no feather / vignette
        return (
            <div
                style={{
                    width: `${width}px`,
                    height: `${height}px`,
                    overflow: 'hidden',
                    borderRadius: shape === 'circle' ? '50%' : shape === 'rounded' ? '12px' : '0px',
                    border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : 'none',
                    boxShadow: glow?.enabled
                        ? `0 0 ${Math.max(0, glow.size * glowScale)}px ${Math.round(glow.size * glowScale / 2)}px ${glow.color}`
                        : '0 10px 30px rgba(0,0,0,0.3)',
                }}
            >
                <img
                    src={src}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: objectFit as any }}
                />
            </div>
        );
    }

    // Feathered / vignette rendering using canvas
    const glowPx = Math.max(0, (glow?.size || 24) * glowScale);
    return (
        <div
            style={{
                width: `${width}px`,
                height: `${height}px`,
                borderRadius: shape === 'circle' ? '50%' : shape === 'rounded' ? '12px' : '0px',
                boxShadow: `0 0 ${glowPx}px ${Math.round(glowPx / 2)}px ${glow?.color || 'rgba(212,175,55,0.65)'}`,
            }}
        >
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                style={{
                    width: `${width}px`,
                    height: `${height}px`,
                    borderRadius: shape === 'circle' ? '50%' : shape === 'rounded' ? '12px' : '0px',
                }}
            />
        </div>
    );
}

/** Draw an image onto a canvas with radial feathered edges (vignette). */
function drawFeathered(
    canvas: HTMLCanvasElement,
    img: HTMLImageElement,
    w: number,
    h: number,
    shape: string,
    glow: { color: string; size: number },
) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    // --- Draw image with object-fit: cover ---
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const imgAspect = iw / ih;
    const boxAspect = w / h;
    let sw: number, sh: number, sx: number, sy: number;
    if (imgAspect > boxAspect) {
        sh = ih;
        sw = ih * boxAspect;
        sx = (iw - sw) / 2;
        sy = 0;
    } else {
        sw = iw;
        sh = iw / boxAspect;
        sx = 0;
        sy = (ih - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);

    // --- Apply radial feather mask via composite ---
    ctx.globalCompositeOperation = 'destination-in';

    const cx = w / 2;
    const cy = h / 2;
    // Feather edge: how many pixels from the edge to start fading
    const featherPx = Math.min(w, h) * 0.18;
    const outerR = Math.max(w, h) / 2;
    const innerR = Math.max(0, outerR - featherPx);

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerR);
    const stopRatio = outerR > 0 ? innerR / outerR : 0;
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(stopRatio, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'source-over';
}

interface FarewellPreviewProps {
    config: any;
}

/**
 * Static, read-only renderer for a farewell template config.
 *
 * Renders exactly the same visual output as the editor canvas but without
 * any drag handlers, selection borders, or guide lines. Used by the tenant
 * gallery picker to preview a chosen template and to export a final PNG via
 * html2canvas (the wrapping div is the export ref target).
 */
const FarewellPreview = forwardRef<HTMLDivElement, FarewellPreviewProps>(({ config }, ref) => {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const id = 'farewell-preview-google-fonts';
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..700;1,400..700&family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700&family=Lora:ital,wght@0,400..700;1,400..700&family=Cinzel:wght@400..900&family=Great+Vibes&family=Dancing+Script:wght@400..700&family=Montserrat:wght@100..900&display=swap';
        document.head.appendChild(link);
    }, []);

    const getDimensions = () => {
        const baseHeight = 550;
        switch (config.format) {
            case '1:1': return { width: baseHeight, height: baseHeight };
            case '9:16': return { width: baseHeight * (9 / 16), height: baseHeight };
            case '3:4': return { width: baseHeight * (3 / 4), height: baseHeight };
            case '4:3': return { width: baseHeight, height: baseHeight * (3 / 4) };
            case '3:2': return { width: baseHeight * (3 / 2), height: baseHeight };
            case '2:3': return { width: baseHeight * (2 / 3), height: baseHeight };
            default: return { width: baseHeight, height: baseHeight };
        }
    };

    const buildGlowShadow = (glow: any, fallback: string): string => {
        if (!glow?.enabled) return fallback;
        const color = glow.color || 'rgba(212, 175, 55, 0.65)';
        const size = Math.max(0, (Number(glow.size) || 24) * s);
        return `0 0 ${size}px ${Math.round(size / 2)}px ${color}, ${fallback}`;
    };

    const dims = getDimensions();
    // BASELINE = lienzo de diseño (1:1 a 550px). Todos los valores numéricos
    // de la config (coords, fontSize, anchos, paddings…) están expresados
    // sobre este lienzo y se proyectan al canvas real con dos factores:
    //   sx = ancho_real / 550   → escala horizontal (X, widths)
    //   sy = alto_real  / 550   → escala vertical   (Y, heights)
    //   s  = min(sx, sy)        → escala uniforme   (fontSize, bordes, glow)
    // En 1:1 los tres valen 1. En 9:16 sx<1 pero sy=1, así las distancias
    // verticales no se comprimen y la imagen banner llena el ancho.
    const BASELINE = 550;
    const sx = dims.width / BASELINE;
    const sy = dims.height / BASELINE;
    const s = Math.min(sx, sy);
    const pxX = (n: number | undefined, fallback = 0) => (Number(n ?? fallback) || 0) * sx;
    const pxY = (n: number | undefined, fallback = 0) => (Number(n ?? fallback) || 0) * sy;
    const px = (n: number | undefined, fallback = 0) => (Number(n ?? fallback) || 0) * s;
    // image2: para formas con aspecto 1:1 (circle, square, rounded) siempre
    // usamos la escala uniforme `s` para que no se deforme al cambiar de formato.
    // Solo si la plantilla define explícitamente width/height distintos Y la
    // forma no exige proporciones iguales, escalamos de forma independiente.
    const i2shape = config.imageSettings?.image2?.shape || 'circle';
    const forceUniform = ['circle', 'square', 'rounded'].includes(i2shape);
    const i2w = config.imageSettings?.image2?.width;
    const i2h = config.imageSettings?.image2?.height;
    const image2Width = forceUniform
        ? px(i2w ?? config.imageSettings?.image2?.size, 128)
        : (i2w != null ? pxX(i2w) : px(config.imageSettings?.image2?.size, 128));
    const image2Height = forceUniform
        ? px(i2h ?? config.imageSettings?.image2?.size, 128)
        : (i2h != null ? pxY(i2h) : px(config.imageSettings?.image2?.size, 128));
    const image1Size = px(config.imageSettings?.image1?.size, 64);
    const fontFamily = config.styles?.font === 'serif' ? 'serif' : 'sans-serif';

    const getBackgroundSize = () => {
        if (config.backgroundImage?.size === 'stretch') return '100% 100%';
        if (config.backgroundImage?.size === 'contain') return 'contain';
        return 'cover';
    };

    return (
        <div
            ref={ref}
            className="shadow-2xl relative overflow-hidden"
            style={{
                width: dims.width,
                height: dims.height,
                backgroundColor: config.styles?.background || '#fff',
                color: config.styles?.color || '#000',
            }}
        >
            {/* Background image */}
            {config.backgroundImage?.url && (
                <div
                     className="absolute inset-0 z-0"
                     style={{
                         backgroundImage: `url(${toLocalProxy(getImageUrl(config.backgroundImage.url))})`,
                         backgroundSize: getBackgroundSize(),
                         backgroundPosition: 'center',
                         backgroundRepeat: 'no-repeat',
                         opacity: config.backgroundImage.opacity ?? 0.3,
                         filter: getImageFilter(config.backgroundImage.filter || 'none'),
                     }}
                />
            )}

            {/* Decorative frame */}
            {config.frame?.enabled && (
                <div
                    className="absolute pointer-events-none z-50"
                    style={{
                        top: px(config.frame.margin, 0),
                        left: px(config.frame.margin, 0),
                        right: px(config.frame.margin, 0),
                        bottom: px(config.frame.margin, 0),
                        border: `${Math.max(1, px(config.frame.width, 1))}px solid ${config.frame.color}`,
                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.1)',
                    }}
                />
            )}

            {/* Image 1 */}
            {config.elements?.image1Url && (
                <div
                    className="absolute"
                    style={{
                        transform: `translate(${pxX(config.elements.image1X)}px, ${pxY(config.elements.image1Y)}px)`,
                        zIndex: config.imageSettings?.image1?.zIndex ?? 20,
                        padding: '4px',
                    }}
                >
                    <div
                        style={{
                            width: `${image1Size}px`,
                            height: `${image1Size}px`,
                            overflow: 'hidden',
                            borderRadius: config.imageSettings?.image1?.shape === 'circle' ? '50%' : '8px',
                            border: `${Math.max(1, px(config.imageSettings?.image1?.borderWidth, 3))}px solid ${config.imageSettings?.image1?.borderColor || 'rgba(255,255,255,0.3)'}`,
                            boxShadow: buildGlowShadow(config.imageSettings?.image1?.glow, '0 4px 12px rgba(0,0,0,0.15)'),
                            clipPath: getClipPath(config.imageSettings?.image1?.shape),
                        }}
                    >
                        <img
                            src={toLocalProxy(getImageUrl(config.elements.image1Url))}
                            alt=""
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: config.imageSettings?.image1?.objectFit || 'contain',
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Image 2 (typically the pet photo) — always horizontally centered;
                image2X/image2Y are deltas from the top-center anchor.
                Uses FarewellPetImage for optional feathered vignette via <canvas>. */}
            {config.elements?.image2Url && (
                <div
                    className="absolute"
                    style={{
                        left: '50%',
                        top: '50%',
                        transform: `translate(calc(-50% + ${pxX(config.elements.image2X)}px), calc(-50% + ${pxY(config.elements.image2Y)}px))`,
                        zIndex: config.imageSettings?.image2?.zIndex ?? 20,
                        padding: '4px',
                    }}
                >
                    <FarewellPetImage
                        src={toLocalProxy(getImageUrl(config.elements.image2Url))}
                        width={image2Width}
                        height={image2Height}
                        shape={i2shape as any}
                        borderColor={config.imageSettings?.image2?.borderColor || 'rgba(255,255,255,0.3)'}
                        borderWidth={Math.max(0, px(config.imageSettings?.image2?.borderWidth, 4))}
                        glow={config.imageSettings?.image2?.glow}
                        objectFit={config.imageSettings?.image2?.objectFit || 'cover'}
                        glowScale={s}
                    />
                </div>
            )}

            {/* Pet name — vertically anchored at canvas center; petNameY shifts up/down */}
            <div
                className="absolute w-full text-center"
                style={{
                    top: '50%',
                    paddingLeft: `${px(20, 20)}px`,
                    paddingRight: `${px(20, 20)}px`,
                    transform: `translateY(-50%) translate(${pxX(config.elements?.petNameX)}px, ${pxY(config.elements?.petNameY)}px)`,
                    zIndex: config.styles?.zIndex?.petName || 20,
                }}
            >
                <h1
                    className="font-bold tracking-tight"
                    style={{
                        fontFamily: config.petNameFormatting?.fontFamily || fontFamily,
                        fontSize: `${px(config.petNameFormatting?.fontSize, 36)}px`,
                        fontWeight: config.petNameFormatting?.bold ?? true ? 'bold' : 'normal',
                        fontStyle: config.petNameFormatting?.italic ? 'italic' : 'normal',
                        letterSpacing: `${px(config.petNameFormatting?.letterSpacing, 0)}px`,
                    }}
                >
                    {config.elements?.petName}
                </h1>
            </div>

            {/* Subtitle — slogan/fecha. Centrado horizontalmente desde el centro vertical. */}
            {config.elements?.subtitle && (
                <div
                    className="absolute w-full text-center"
                    style={{
                        top: '50%',
                        paddingLeft: `${px(20, 20)}px`,
                        paddingRight: `${px(20, 20)}px`,
                        transform: `translateY(-50%) translate(${pxX(config.elements?.subtitleX)}px, ${pxY(config.elements?.subtitleY, 40)}px)`,
                        zIndex: config.subtitleFormatting?.zIndex ?? 15,
                    }}
                >
                    <p
                        style={{
                            display: 'inline-block',
                            fontFamily,
                            fontSize: `${px(config.subtitleFormatting?.fontSize, 18)}px`,
                            fontWeight: config.subtitleFormatting?.bold ? 'bold' : 'normal',
                            fontStyle: config.subtitleFormatting?.italic ? 'italic' : 'normal',
                            padding: `${px(config.subtitleFormatting?.padding, 8)}px`,
                            backgroundColor: config.subtitleFormatting?.hasBackground
                                ? config.subtitleFormatting.backgroundColor
                                : 'transparent',
                            margin: 0,
                        }}
                    >
                        {config.elements.subtitle}
                    </p>
                </div>
            )}

            {/* Farewell text — TOP-anchored desde el centro vertical, crece hacia abajo.
                Sin overflow-hidden ni altura fija para que nunca se corte el texto.
                Padding vertical generoso = margen top/bot para no chocar con otros campos.
                Ancho limitado por el canvas: nunca excede 92% del ancho disponible. */}
            {(() => {
                const maxWidth = Math.min(pxX(config.textFormatting?.width, 480), dims.width * 0.92);
                return (
                    <div
                        className="absolute"
                        style={{
                            top: '50%',
                            left: '50%',
                            transform: `translateX(-50%) translate(${pxX(config.elements?.farewellTextX)}px, ${pxY(config.elements?.farewellTextY)}px)`,
                            zIndex: config.textFormatting?.zIndex ?? 10,
                            width: `${maxWidth}px`,
                            paddingTop: `${px(14, 14)}px`,
                            paddingBottom: `${px(14, 14)}px`,
                            paddingLeft: `${px(12, 12)}px`,
                            paddingRight: `${px(12, 12)}px`,
                        }}
                    >
                        <p
                            className="whitespace-pre-wrap opacity-90"
                            style={{
                                textAlign: config.textFormatting?.textAlign || 'center',
                                fontFamily,
                                fontSize: `${px(config.textFormatting?.fontSize, 14)}px`,
                                lineHeight: config.textFormatting?.lineHeight || 1.6,
                                fontWeight: config.textFormatting?.bold ? 'bold' : 'normal',
                                fontStyle: config.textFormatting?.italic ? 'italic' : 'normal',
                                backgroundColor: config.textFormatting?.hasBackground
                                    ? config.textFormatting.backgroundColor
                                    : 'transparent',
                                padding: config.textFormatting?.hasBackground
                                    ? `${px(config.textFormatting.padding, 12)}px`
                                    : '0',
                                borderRadius: config.textFormatting?.hasBackground ? '12px' : '0',
                                margin: 0,
                                wordWrap: 'break-word',
                            }}
                        >
                            {config.elements?.farewellText}
                        </p>
                    </div>
                );
            })()}

            {/* Footer — centered horizontally, anchored at vertical center with Y delta */}
            {config.elements?.footerText && (
                <div
                    className="absolute w-full text-center opacity-60 font-medium tracking-widest uppercase"
                    style={{
                        top: '50%',
                        transform: `translateY(-50%) translate(${pxX(config.elements?.footerX)}px, ${pxY(config.elements?.footerY)}px)`,
                        zIndex: config.styles?.zIndex?.footer || 10,
                        fontFamily,
                        fontSize: `${px(13, 13)}px`,
                    }}
                >
                    {config.elements.footerText}
                </div>
            )}

            {/* Decorative elements (admin-baked, not editable by tenant) */}
            {config.elements?.decorativeElements?.map((el: any) => (
                <div
                    key={el.id}
                    className="absolute"
                    style={{
                        transform: `translate(${el.x}px, ${el.y}px) rotate(${el.rotation || 0}deg)`,
                        width: `${el.size}px`,
                        height: `${el.size}px`,
                        zIndex: el.zIndex ?? 30,
                    }}
                >
                    <img
                        src={toLocalProxy(getImageUrl(el.url))}
                        alt=""
                        className="w-full h-full object-contain pointer-events-none"
                    />
                </div>
            ))}
        </div>
    );
});

FarewellPreview.displayName = 'FarewellPreview';

export default FarewellPreview;
