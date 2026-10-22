"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Globe, Plus, Save, Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { FEATURES_REGISTRY } from './ManageFeaturesModal';
import type { PlanData } from './PlanCard';

interface Item { key: string; label: string; group: string; description: string }

interface Props {
    plans: PlanData[];
    onSaved: () => Promise<unknown> | void;
    onToast: (msg: string, type: 'success' | 'error') => void;
}

/** Funciones que no son una característica del registro (mismas claves que el backend). */
const VIRTUAL: { key: string; label: string }[] = [
    { key: 'core:seguimiento', label: 'Seguimiento en línea para las familias (todos los planes)' },
    { key: 'core:datos_aislados', label: 'Datos aislados y privados (todos los planes)' },
    { key: 'plan:can_export', label: 'Exportación de datos (opción «Exportar» del plan)' },
    { key: 'plan:web_institucional', label: 'Sitio web institucional (plan ULTRA)' },
];

/** ¿El plan incluye la función? Misma regla que app/services/landing_features.py. */
function planOffers(plan: PlanData, key: string): boolean {
    if (key.startsWith('core:')) return true;
    if (key === 'plan:can_export') return !!(plan as PlanData & { can_export?: boolean }).can_export;
    if (key === 'plan:web_institucional') return plan.name.trim().toUpperCase() === 'ULTRA';
    const modules = plan.allowed_modules || [];
    if (key.startsWith('mod:')) return modules.includes(key.slice(4));
    const features = (plan.features || {}) as Record<string, unknown>;
    if (key.startsWith('integraciones:')) {
        const v = features[key];
        if (typeof v === 'boolean') return v;
        const name = plan.name.trim().toUpperCase();
        return key === 'integraciones:formulario_incrustable' ? name === 'ULTRA' : ['PRO', 'ULTRA'].includes(name);
    }
    return modules.includes(key.split(':')[0]) && features[key] !== false;
}

/**
 * «Funciones en la web»: qué se muestra en la landing y en /comparar-planes al
 * comparar planes, con su nombre público, grupo y orden. Qué plan tiene cada
 * función NO se marca aquí: sale de sus módulos y características.
 */
export default function LandingFeaturesCard({ plans, onSaved, onToast }: Props) {
    const [items, setItems] = useState<Item[]>([]);
    const [groups, setGroups] = useState<string[]>([]);
    const [savedJson, setSavedJson] = useState('');
    const [saving, setSaving] = useState(false);
    const [adding, setAdding] = useState('');

    useEffect(() => {
        apiRequest('/api/internal/creator/pricing/landing-features')
            .then((d: { items: Item[]; groups: string[] }) => {
                setItems(d.items);
                setGroups(d.groups);
                setSavedJson(JSON.stringify(d.items));
            })
            .catch(() => onToast('No se pudieron cargar las funciones de la web', 'error'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Opciones para agregar: funciones que aún no están en la lista.
    const candidates = useMemo(() => {
        const used = new Set(items.map(i => i.key));
        const out: { group: string; options: { key: string; label: string }[] }[] = [
            { group: 'Generales', options: VIRTUAL.filter(v => !used.has(v.key)) },
        ];
        for (const [modKey, mod] of Object.entries(FEATURES_REGISTRY)) {
            const options = [{ key: `mod:${modKey}`, label: `Módulo ${mod.label} (completo)` }];
            for (const section of mod.sections) {
                for (const f of section.features) options.push({ key: f.key, label: f.label });
            }
            out.push({ group: mod.label, options: options.filter(o => !used.has(o.key)) });
        }
        return out.filter(g => g.options.length > 0);
    }, [items]);

    const labelFor = (key: string) =>
        candidates.flatMap(g => g.options).find(o => o.key === key)?.label.replace(/ \((completo|todos los planes|opción.*|plan ULTRA)\)$/, '') || key;

    const update = (i: number, patch: Partial<Item>) => setItems(prev => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)));
    const move = (i: number, dir: -1 | 1) => setItems(prev => {
        const next = [...prev];
        const j = i + dir;
        if (j < 0 || j >= next.length) return prev;
        [next[i], next[j]] = [next[j], next[i]];
        return next;
    });

    const add = () => {
        if (!adding) return;
        setItems(prev => [...prev, { key: adding, label: labelFor(adding), group: groups[1] || 'Operación', description: '' }]);
        setAdding('');
    };

    const dirty = JSON.stringify(items) !== savedJson;
    const invalid = items.some(i => !i.label.trim());

    const save = async () => {
        setSaving(true);
        try {
            const d = await apiRequest('/api/internal/creator/pricing/landing-features', { method: 'PUT', body: items }) as { items: Item[] };
            setItems(d.items);
            setSavedJson(JSON.stringify(d.items));
            onToast('Funciones de la web guardadas', 'success');
            await onSaved();
        } catch (err: unknown) {
            onToast((err as Error)?.message || 'Error al guardar', 'error');
        } finally {
            setSaving(false);
        }
    };

    const sortedPlans = [...plans].sort((a, b) => (a.price || 0) - (b.price || 0));

    return (
        <section className="bg-[#0a192f] border border-sky-500/20 rounded-3xl p-6 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                <div className="flex items-start gap-3">
                    <span className="p-2.5 rounded-2xl bg-sky-500/15 text-sky-400 shrink-0">
                        <Globe size={22} />
                    </span>
                    <div>
                        <h3 className="text-lg font-black text-white">Funciones en la web</h3>
                        <p className="text-sm text-white/50 max-w-2xl">
                            Lo que la página pública muestra al comparar planes (tarjetas de la landing y «Comparar planes»), con el nombre
                            que verá el cliente. Qué plan tiene cada función sale solo de sus módulos y características.
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <a href="/comparar-planes" target="_blank" rel="noopener" className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 text-sm font-bold border border-white/10">
                        <ExternalLink size={15} /> Ver comparación
                    </a>
                    <button
                        type="button"
                        onClick={save}
                        disabled={!dirty || invalid || saving}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Save size={16} /> {saving ? 'Guardando…' : 'Guardar'}
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full min-w-[900px] text-sm">
                    <thead>
                        <tr className="text-[11px] uppercase tracking-wider text-white/40 border-b border-white/10">
                            <th className="p-3 w-16 text-left">Orden</th>
                            <th className="p-3 text-left">Nombre en la web</th>
                            <th className="p-3 text-left w-40">Grupo</th>
                            {sortedPlans.map(p => <th key={p.id} className="p-3 text-center w-16">{p.name}</th>)}
                            <th className="p-3 w-10" />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((it, i) => (
                            <tr key={it.key} className="border-b border-white/5 last:border-0 align-top">
                                <td className="p-2">
                                    <div className="flex gap-1">
                                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir" className="p-1.5 rounded-lg text-white/50 hover:bg-white/10 disabled:opacity-20"><ArrowUp size={14} /></button>
                                        <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Bajar" className="p-1.5 rounded-lg text-white/50 hover:bg-white/10 disabled:opacity-20"><ArrowDown size={14} /></button>
                                    </div>
                                </td>
                                <td className="p-2 space-y-1.5">
                                    <input
                                        value={it.label}
                                        onChange={e => update(i, { label: e.target.value.slice(0, 70) })}
                                        aria-label="Nombre en la web"
                                        className={`w-full bg-white/5 border rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-sky-500/60 ${it.label.trim() ? 'border-white/10' : 'border-rose-500/60'}`}
                                    />
                                    <input
                                        value={it.description}
                                        onChange={e => update(i, { description: e.target.value.slice(0, 160) })}
                                        placeholder="Descripción para «Comparar planes» (opcional)"
                                        aria-label="Descripción"
                                        className="w-full bg-transparent border border-white/5 rounded-xl px-3 py-1.5 text-white/70 text-xs outline-none focus:border-sky-500/40 placeholder:text-white/25"
                                    />
                                    <p className="text-[10px] font-mono text-white/30">{it.key}</p>
                                </td>
                                <td className="p-2">
                                    <select value={it.group} onChange={e => update(i, { group: e.target.value })} aria-label="Grupo"
                                        className="w-full bg-[#0a192f] border border-white/10 rounded-xl px-2 py-2 text-white text-xs outline-none">
                                        {groups.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </td>
                                {sortedPlans.map(p => (
                                    <td key={p.id} className="p-2 text-center">
                                        {planOffers(p, it.key)
                                            ? <span className="inline-block w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs leading-5">✓</span>
                                            : <span className="text-white/20">—</span>}
                                    </td>
                                ))}
                                <td className="p-2">
                                    <button type="button" onClick={() => setItems(prev => prev.filter((_, j) => j !== i))} aria-label="Quitar de la web" title="Quitar de la web"
                                        className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 size={14} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
                <select value={adding} onChange={e => setAdding(e.target.value)} aria-label="Función para agregar"
                    className="flex-1 bg-[#0a192f] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none">
                    <option value="">Agregar una función a la web…</option>
                    {candidates.map(g => (
                        <optgroup key={g.group} label={g.group}>
                            {g.options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                        </optgroup>
                    ))}
                </select>
                <button type="button" onClick={add} disabled={!adding}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm disabled:opacity-40">
                    <Plus size={16} /> Agregar
                </button>
            </div>

            <p className="text-xs text-white/50">
                Las tarjetas de la landing muestran solo lo que cada plan suma frente al anterior; lo que tienen todos los planes va arriba
                («Todos los planes incluyen…»). La tabla de «Comparar planes» muestra todo, agrupado. ✓ = el plan lo incluye según sus módulos y
                características (una característica sin valor guardado cuenta como incluida).
            </p>
        </section>
    );
}
