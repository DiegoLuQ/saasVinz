'use client';

import React from 'react';
import { Eye, EyeOff, Move, RotateCcw, Crosshair } from 'lucide-react';
import type { Layer } from '@/lib/admin/imageTemplates/types';
import { hasOverrides, layerName, type LayerOverride, type LayerOverrides } from '@/lib/admin/imageTemplates/overrides';

/**
 * «Ajustar elementos» de Diseños para Redes: el crematorio oculta, mueve o
 * achica capas de la plantilla solo en su diseño. La plantilla no cambia; los
 * ajustes viajan en la receta del diseño.
 */
export default function LayerAdjustPanel({ layers, overrides, onChange, active, onToggle, selectedId, onSelect }: {
    /** Capas de la plantilla original (incluye las ocultas). */
    layers: Layer[];
    overrides: LayerOverrides;
    onChange: (next: LayerOverrides) => void;
    active: boolean;
    onToggle: (on: boolean) => void;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
}) {
    /** Reemplaza el ajuste de una capa (null = como viene en la plantilla). */
    const replace = (id: string, o: LayerOverride | null) => {
        const next = { ...overrides };
        if (o === null) delete next[id];
        else next[id] = o;
        onChange(next);
    };
    const patch = (id: string, p: LayerOverride) => replace(id, { ...overrides[id], ...p });
    const changed = hasOverrides(overrides);
    // Arriba lo que se ve encima (la última capa se dibuja al frente).
    const ordered = [...layers].reverse();

    return (
        <div className="w-full max-w-[540px] rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <button type="button" role="switch" aria-checked={active} onClick={() => onToggle(!active)}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${active ? 'bg-primary' : 'bg-slate-300 dark:bg-white/15'}`}>
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${active ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                    <span className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                        <Move size={14} className="text-primary" /> Ajustar elementos
                    </span>
                </label>
                {changed && (
                    <button type="button" onClick={() => { onChange({}); onSelect(null); }}
                        className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-primary">
                        <RotateCcw size={11} /> Restablecer todo
                    </button>
                )}
            </div>

            {active && (
                <>
                    <p className="text-[11px] text-slate-500">
                        Toca un elemento en la imagen para moverlo o cambiar su tamaño, u ocúltalo con el ojo.
                        Solo cambia este diseño: la plantilla queda igual.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-1.5">
                        {ordered.map(l => {
                            const o = overrides[l.id];
                            const hidden = !!o?.hidden;
                            const moved = !!o && Object.keys(o).some(k => k !== 'hidden');
                            const isSel = selectedId === l.id;
                            return (
                                <div key={l.id}
                                    className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs border transition-colors ${isSel ? 'border-primary bg-primary/10' : 'border-slate-200 dark:border-white/10'} ${hidden ? 'opacity-60' : ''}`}>
                                    <button type="button" disabled={hidden} onClick={() => onSelect(isSel ? null : l.id)}
                                        className={`flex-1 min-w-0 text-left truncate font-semibold ${hidden ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                        {layerName(l)}
                                    </button>
                                    {!hidden && (
                                        <button type="button" title="Centrar en la imagen" onClick={() => patch(l.id, { x: 50, y: 50 })}
                                            className="p-1 rounded text-slate-400 hover:text-primary"><Crosshair size={13} /></button>
                                    )}
                                    {moved && (
                                        <button type="button" title="Volver a como viene en la plantilla"
                                            onClick={() => replace(l.id, hidden ? { hidden: true } : null)}
                                            className="p-1 rounded text-slate-400 hover:text-primary"><RotateCcw size={12} /></button>
                                    )}
                                    <button type="button" title={hidden ? 'Mostrar' : 'Ocultar en este diseño'}
                                        onClick={() => {
                                            if (!hidden && isSel) onSelect(null);
                                            if (hidden && !moved) replace(l.id, null);
                                            else patch(l.id, { hidden: !hidden });
                                        }}
                                        className={`p-1 rounded ${hidden ? 'text-slate-400 hover:text-primary' : 'text-slate-500 hover:text-red-500'}`}>
                                        {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
