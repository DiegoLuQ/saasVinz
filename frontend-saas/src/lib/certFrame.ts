// Marco decorativo para la foto de la mascota en certificados con imagen.
// Paleta FIJA (solo estos colores). Debe mantenerse en sincronía con el backend
// (app/utils/certificates.py -> _FRAME_COLORS).

export type FrameColorKey = 'gold' | 'black' | 'white' | 'blue' | 'celeste';

export interface CertFrame {
    color: FrameColorKey;
    border?: boolean;   // borde/anillo sólido o degradado
    glow?: boolean;     // halo difuminado
    gradient?: boolean; // el borde usa degradado entre dos tonos
    feather?: boolean;  // desvanece el borde exterior de la foto (solo círculo)
}

// El centro de la foto se mantiene nítido hasta este % del radio; del FEATHER_INNER
// al 100% transiciona a transparente (feather del borde exterior).
export const FEATHER_INNER_STOP = 72;

export interface FrameColorDef {
    key: FrameColorKey;
    label: string;
    solid: string;
    from: string; // degradado (claro)
    to: string;   // degradado (oscuro)
    glow: string; // color del halo (con algo de transparencia)
}

export const FRAME_COLORS: Record<FrameColorKey, FrameColorDef> = {
    gold: { key: 'gold', label: 'Dorado', solid: '#c9a227', from: '#f3d27a', to: '#a8791f', glow: 'rgba(201,162,39,0.65)' },
    black: { key: 'black', label: 'Negro', solid: '#1a1a1a', from: '#4a4a4a', to: '#000000', glow: 'rgba(0,0,0,0.6)' },
    white: { key: 'white', label: 'Blanco', solid: '#ffffff', from: '#ffffff', to: '#cfcfcf', glow: 'rgba(255,255,255,0.75)' },
    blue: { key: 'blue', label: 'Azul', solid: '#2563eb', from: '#60a5fa', to: '#1e3a8a', glow: 'rgba(37,99,235,0.6)' },
    celeste: { key: 'celeste', label: 'Celeste', solid: '#38bdf8', from: '#7dd3fc', to: '#0284c7', glow: 'rgba(56,189,248,0.6)' },
};

export const FRAME_COLOR_LIST = Object.values(FRAME_COLORS);

export function getFrameColor(key?: string): FrameColorDef {
    return FRAME_COLORS[(key as FrameColorKey)] || FRAME_COLORS.gold;
}

/** ¿El marco tiene algo que dibujar? */
export function frameActive(frame?: CertFrame | null): boolean {
    return !!frame && (!!frame.border || !!frame.glow || !!frame.feather);
}

// Proporciones relativas al tamaño de la foto (para que escale igual en
// preview, PDF y HTML). El borde se expresa como % de inset.
export const FRAME_BORDER_PCT = 5;   // grosor del borde = 5% del lado de la foto
export const FRAME_GLOW_RATIO = 0.18; // blur del halo = 18% del lado de la foto

/** Paint CSS para el borde (sólido o degradado). */
export function frameBorderPaint(frame: CertFrame): string {
    const c = getFrameColor(frame.color);
    return frame.gradient ? `linear-gradient(135deg, ${c.from}, ${c.to})` : c.solid;
}

/** Estilo del contenedor del marco (borde como background + halo como box-shadow). */
export function frameWrapperStyle(frame: CertFrame, radius: string): Record<string, any> {
    const c = getFrameColor(frame.color);
    const style: Record<string, any> = { borderRadius: radius };
    if (frame.border) style.background = frameBorderPaint(frame);
    if (frame.glow) style.boxShadow = `0 0 22px 4px ${c.glow}`;
    return style;
}

/** Inset (%) de la imagen interior según el grosor del borde. */
export function frameInnerInsetPct(frame: CertFrame): number {
    return frame.border ? FRAME_BORDER_PCT : 0;
}

/** Máscara radial (feather) para la imagen, solo si es círculo y está activo. */
export function frameImageMaskStyle(frame: CertFrame | undefined, circle: boolean): Record<string, any> {
    if (!frame?.feather || !circle) return {};
    // closest-side: el 100% del degradado = borde del círculo (no la esquina),
    // así el desvanecimiento ocurre dentro del círculo visible.
    const grad = `radial-gradient(circle closest-side at center, #000 ${FEATHER_INNER_STOP}%, transparent 100%)`;
    return { WebkitMaskImage: grad, maskImage: grad, WebkitMaskSize: '100% 100%', maskSize: '100% 100%' };
}
