/**
 * Fondo de los campos de texto del certificado por imagen.
 *
 * Lo usan tres renderizadores que deben coincidir pixel a pixel:
 *   - el editor del admin (vista de diseño),
 *   - la vista previa del tenant (DOM) y su exportación a PDF (canvas),
 *   - el backend (`app/utils/certificates.py`), que replica esta misma lógica.
 *
 * Si cambias los valores por defecto, cámbialos también en el backend.
 */

/** Props de fondo que puede llevar cualquier campo de texto. */
export interface TextBg {
    bgColor?: string;    // hex, ej. '#ffffff'
    bgOpacity?: number;  // 0–100. 0 (o ausente) = sin fondo
    bgPadX?: number;     // px de relleno horizontal
    bgPadY?: number;     // px de relleno vertical
    bgRadius?: number;   // px de redondeo
}

export const TEXT_BG_DEFAULTS = {
    color: '#ffffff',
    opacity: 0,
    padX: 14,
    padY: 6,
    radius: 8,
} as const;

/** ¿El campo tiene un fondo visible? */
export function textBgActive(f: TextBg | undefined | null): boolean {
    return !!f && typeof f.bgOpacity === 'number' && f.bgOpacity > 0;
}

/** Convierte un hex (#rgb o #rrggbb) + opacidad 0–100 a rgba(). */
export function hexToRgba(hex: string, opacity: number): string {
    let h = (hex || TEXT_BG_DEFAULTS.color).trim().replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) h = 'ffffff';
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = Math.max(0, Math.min(100, opacity)) / 100;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Medidas resueltas del fondo, con los valores por defecto aplicados. */
export function resolveTextBg(f: TextBg) {
    return {
        color: f.bgColor || TEXT_BG_DEFAULTS.color,
        opacity: f.bgOpacity ?? TEXT_BG_DEFAULTS.opacity,
        padX: f.bgPadX ?? TEXT_BG_DEFAULTS.padX,
        padY: f.bgPadY ?? TEXT_BG_DEFAULTS.padY,
        radius: f.bgRadius ?? TEXT_BG_DEFAULTS.radius,
    };
}

/**
 * Estilo CSS del fondo para un campo de texto.
 *
 * `fallbackPadding` es el relleno que se usa cuando el campo no tiene fondo,
 * para no mover nada en los diseños ya guardados.
 */
export function textBgStyle(f: TextBg, fallbackPadding = '0'): React.CSSProperties {
    if (!textBgActive(f)) return { padding: fallbackPadding };
    const { color, opacity, padX, padY, radius } = resolveTextBg(f);
    return {
        backgroundColor: hexToRgba(color, opacity),
        padding: `${padY}px ${padX}px`,
        borderRadius: `${radius}px`,
    };
}

/**
 * Pinta el fondo de un texto en un canvas, replicando la caja del DOM.
 *
 * `cx`/`cy` son el ancla del campo y `fontPx` el tamaño de fuente ya escalado.
 * El relleno se escala con `scale` para que el PDF coincida con la vista previa.
 * La caja sigue la alineación: con 'left' el texto arranca en `cx`, con 'right'
 * termina ahí, y con 'center' queda centrado.
 *
 * Debe llamarse con `ctx.font` ya configurado (usa measureText).
 */
export function drawTextBackground(
    ctx: CanvasRenderingContext2D,
    f: TextBg,
    opts: { value: string; cx: number; cy: number; fontPx: number; align?: 'left' | 'center' | 'right'; scale?: number },
): void {
    if (!textBgActive(f)) return;

    const bg = resolveTextBg(f);
    const scale = opts.scale ?? 1;
    const padX = bg.padX * scale;
    const padY = bg.padY * scale;

    const textW = ctx.measureText(opts.value).width;
    const boxW = textW + padX * 2;
    const boxH = opts.fontPx * 1.1 + padY * 2;

    const align = opts.align || 'center';
    const left = align === 'left'
        ? opts.cx - padX
        : align === 'right'
            ? opts.cx - textW - padX
            : opts.cx - boxW / 2;
    const top = opts.cy - boxH / 2;

    const r = Math.max(0, Math.min(bg.radius * scale, boxW / 2, boxH / 2));

    ctx.beginPath();
    ctx.moveTo(left + r, top);
    ctx.arcTo(left + boxW, top, left + boxW, top + boxH, r);
    ctx.arcTo(left + boxW, top + boxH, left, top + boxH, r);
    ctx.arcTo(left, top + boxH, left, top, r);
    ctx.arcTo(left, top, left + boxW, top, r);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(bg.color, bg.opacity);
    ctx.fill();
}
