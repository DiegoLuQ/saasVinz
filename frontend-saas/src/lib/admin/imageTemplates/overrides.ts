import { PHOTO_SLOTS, TEXT_BINDINGS } from './constants';
import type { Layer, TemplateDefinition } from './types';

/**
 * Ajustes de un crematorio sobre UNA capa de la plantilla, solo para su diseño
 * (la plantilla no cambia): ocultarla, moverla o cambiar su tamaño. Mismas
 * unidades que la capa (% del lienzo, x/y = centro). Se guardan en la receta
 * del diseño (`DesignRecipe.overrides`) para volver a dibujarlo igual.
 */
export interface LayerOverride {
    hidden?: boolean;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
}

export type LayerOverrides = Record<string, LayerOverride>;

const GEOMETRY_KEYS = ['x', 'y', 'width', 'height', 'rotation'] as const;

/** Solo la geometría de un cambio hecho en el lienzo (nunca textos, colores, etc.). */
export function geometryPatch(patch: Partial<Layer>): LayerOverride {
    const out: LayerOverride = {};
    for (const k of GEOMETRY_KEYS) {
        const v = (patch as Record<string, unknown>)[k];
        if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    }
    return out;
}

/** La plantilla con los ajustes aplicados: sin las capas ocultas y con la nueva geometría. */
export function applyOverrides(def: TemplateDefinition, overrides?: LayerOverrides | null): TemplateDefinition {
    if (!overrides || Object.keys(overrides).length === 0) return def;
    return {
        ...def,
        layers: def.layers
            .filter(l => !overrides[l.id]?.hidden)
            .map(l => {
                const o = overrides[l.id];
                if (!o) return l;
                const { hidden: _hidden, ...geo } = o;
                // La rotación solo existe en los adornos.
                if (l.type !== 'sticker') delete geo.rotation;
                return { ...l, ...geo } as Layer;
            }),
    };
}

export function hasOverrides(overrides?: LayerOverrides | null): boolean {
    return !!overrides && Object.values(overrides).some(o => Object.keys(o).length > 0);
}

/** Nombre de la capa para el crematorio. */
export function layerName(layer: Layer): string {
    if (layer.type === 'photo') {
        return layer.source === 'ai'
            ? 'Ilustración IA'
            : (PHOTO_SLOTS.find(s => s.value === (layer.slot || 'photo_1'))?.label || 'Foto');
    }
    if (layer.type === 'sticker') return layer.binding === 'tenant_logo' ? 'Logo' : 'Adorno';
    if (layer.binding === 'static') return `Texto «${(layer.static_text || '').slice(0, 20)}»`;
    return TEXT_BINDINGS.find(t => t.value === layer.binding)?.label || 'Texto';
}
