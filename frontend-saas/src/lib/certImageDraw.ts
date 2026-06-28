// Dibujo de un certificado basado en imagen (certificadoImg) en un <canvas>,
// con todos los efectos (borde sólido/degradado, halo, feather) que html2canvas
// no soporta. Consume un "spec" con los items ya resueltos (mismo que embebe el
// backend en el HTML guardado). Pensado para generar PDFs fieles a la impresión.

import { CertFrame, getFrameColor, frameActive, FRAME_BORDER_PCT, FEATHER_INNER_STOP } from './certFrame';

export interface CertDrawItem {
    kind: 'image' | 'text';
    x: number; // % centro
    y: number; // %
    z: number;
    // imagen
    url?: string;
    w?: number;          // % ancho
    shape?: 'circle' | 'rect'; // campos de foto/logo (caja cuadrada)
    aspect?: boolean;    // elementos decorativos: conservar proporción (no cuadrar)
    objectFit?: 'cover' | 'contain';
    rotation?: number;
    frame?: CertFrame;
    // texto
    value?: string;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    align?: 'left' | 'center' | 'right';
    bold?: boolean;
}

export interface CertDrawSpec {
    v: number;
    aspectRatio: string;
    backgroundUrl?: string;
    items: CertDrawItem[];
}

const ASPECT_RATIO: Record<string, number> = { '16:9': 9 / 16, '4:3': 3 / 4, '3:4': 4 / 3 };

const imgFromSrc = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

// Carga sin "taint": intenta fetch->blob (sirve para R2 cross-origin); fallback a
// <img crossOrigin>.
export async function loadImageSmart(src: string): Promise<HTMLImageElement> {
    try {
        const resp = await fetch(src, { mode: 'cors', cache: 'no-cache' });
        if (resp.ok) {
            const blob = await resp.blob();
            const objUrl = URL.createObjectURL(blob);
            const img = await imgFromSrc(objUrl);
            setTimeout(() => URL.revokeObjectURL(objUrl), 15000);
            return img;
        }
    } catch { /* fallback */ }
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

/**
 * Dibuja el spec en un canvas. baseWidth = ancho de referencia (816 ~ A4 a 96dpi,
 * que es como se imprime el HTML); scale = factor de nitidez.
 */
export async function renderCertSpecToCanvas(spec: CertDrawSpec, baseWidth = 816, scale = 3): Promise<HTMLCanvasElement> {
    const W = Math.round(baseWidth * scale);
    const ratio = ASPECT_RATIO[spec.aspectRatio] ?? 9 / 16;
    const H = Math.round(W * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    const drawCover = (img: HTMLImageElement, dx: number, dy: number, dw: number, dh: number) => {
        const ir = img.width / img.height;
        const br = dw / dh;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (ir > br) { sw = img.height * br; sx = (img.width - sw) / 2; }
        else { sh = img.width / br; sy = (img.height - sh) / 2; }
        ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    };
    const drawContain = (img: HTMLImageElement, dx: number, dy: number, dw: number, dh: number) => {
        const ir = img.width / img.height;
        const br = dw / dh;
        let rw = dw, rh = dh;
        if (ir > br) { rh = dw / ir; } else { rw = dh * ir; }
        ctx.drawImage(img, dx + (dw - rw) / 2, dy + (dh - rh) / 2, rw, rh);
    };
    const traceShape = (dx: number, dy: number, s: number, circle: boolean) => {
        ctx.beginPath();
        if (circle) ctx.arc(dx + s / 2, dy + s / 2, s / 2, 0, Math.PI * 2);
        else {
            const r = s * 0.06;
            if ((ctx as any).roundRect) (ctx as any).roundRect(dx, dy, s, s, r);
            else ctx.rect(dx, dy, s, s);
        }
        ctx.closePath();
    };
    const makeFeatheredCircle = (img: HTMLImageElement, s: number): HTMLCanvasElement => {
        const px = Math.max(1, Math.round(s));
        const off = document.createElement('canvas');
        off.width = px; off.height = px;
        const octx = off.getContext('2d')!;
        const ir = img.width / img.height;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (ir > 1) { sw = img.height; sx = (img.width - sw) / 2; }
        else { sh = img.width; sy = (img.height - sh) / 2; }
        octx.drawImage(img, sx, sy, sw, sh, 0, 0, px, px);
        octx.globalCompositeOperation = 'destination-in';
        const g = octx.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2);
        g.addColorStop(FEATHER_INNER_STOP / 100, 'rgba(0,0,0,1)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        octx.fillStyle = g;
        octx.fillRect(0, 0, px, px);
        return off;
    };

    // Fondo
    if (spec.backgroundUrl) {
        try { const bg = await loadImageSmart(spec.backgroundUrl); drawCover(bg, 0, 0, W, H); } catch { /* sin fondo */ }
    }

    const items = [...(spec.items || [])].sort((a, b) => (a.z ?? 50) - (b.z ?? 50));
    for (const it of items) {
        const cx = (it.x / 100) * W;
        const cy = (it.y / 100) * H;

        if (it.kind === 'text') {
            if (!it.value) continue;
            const weight = it.bold ? '700' : '400';
            ctx.font = `${weight} ${(it.fontSize || 32) * scale}px ${it.fontFamily || 'Georgia, serif'}`;
            ctx.fillStyle = it.color || '#1a1a1a';
            ctx.textAlign = (it.align as CanvasTextAlign) || 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(it.value, cx, cy);
            continue;
        }

        // imagen
        if (!it.url) continue;
        let im: HTMLImageElement;
        try { im = await loadImageSmart(it.url); } catch { continue; }

        // Elementos decorativos: conservan proporción + rotación
        if (it.aspect) {
            const dw = (it.w || 20) / 100 * W;
            const ir = im.width / im.height;
            const dh = dw / (ir || 1);
            const rot = ((it.rotation || 0) * Math.PI) / 180;
            ctx.save();
            ctx.translate(cx, cy);
            if (rot) ctx.rotate(rot);
            ctx.drawImage(im, -dw / 2, -dh / 2, dw, dh);
            ctx.restore();
            continue;
        }

        // Campos de foto / logo (caja cuadrada)
        const size = (it.w || 18) / 100 * W;
        const dx = cx - size / 2;
        const dy = cy - size / 2;
        const circle = it.shape === 'circle';
        const fr = it.frame;
        const hasFrame = !!fr && frameActive(fr);

        if (hasFrame && fr) {
            const fc = getFrameColor(fr.color);
            const inset = fr.border ? size * (FRAME_BORDER_PCT / 100) : 0;
            if (fr.glow) {
                ctx.save();
                ctx.shadowColor = fc.glow;
                ctx.shadowBlur = size * 0.18;
                ctx.fillStyle = fr.border ? fc.solid : 'rgba(0,0,0,0.35)';
                traceShape(dx, dy, size, circle);
                ctx.fill();
                ctx.restore();
            }
            if (fr.border) {
                ctx.save();
                traceShape(dx, dy, size, circle);
                if (fr.gradient) {
                    const g = ctx.createLinearGradient(dx, dy, dx + size, dy + size);
                    g.addColorStop(0, fc.from); g.addColorStop(1, fc.to);
                    ctx.fillStyle = g;
                } else ctx.fillStyle = fc.solid;
                ctx.fill();
                ctx.restore();
            }
            const inS = size - 2 * inset;
            if (fr.feather && circle) {
                const off = makeFeatheredCircle(im, inS);
                ctx.drawImage(off, dx + inset, dy + inset, inS, inS);
            } else {
                ctx.save();
                traceShape(dx + inset, dy + inset, inS, circle);
                ctx.clip();
                drawCover(im, dx + inset, dy + inset, inS, inS);
                ctx.restore();
            }
        } else if (circle) {
            ctx.save();
            traceShape(dx, dy, size, true);
            ctx.clip();
            drawCover(im, dx, dy, size, size);
            ctx.restore();
        } else if (it.objectFit === 'contain') {
            drawContain(im, dx, dy, size, size);
        } else {
            drawCover(im, dx, dy, size, size);
        }
    }

    return canvas;
}

/** Extrae el spec embebido (#cert-render-spec) de un HTML, si existe. */
export function extractCertSpec(html: string): CertDrawSpec | null {
    const m = html.match(/<script[^>]*id="cert-render-spec"[^>]*>([\s\S]*?)<\/script>/i);
    if (!m) return null;
    try {
        const json = m[1].replace(/<\\\//g, '</');
        const spec = JSON.parse(json);
        if (spec && Array.isArray(spec.items)) return spec as CertDrawSpec;
    } catch { /* noop */ }
    return null;
}
