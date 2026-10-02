import React, { useEffect, useState } from 'react';
import { Lock, Plus, Save, Scale, Trash2, User, PawPrint } from 'lucide-react';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { apiRequest } from '@/lib/tenant/api';
import { formatCLP } from '@/lib/publicFormConfig';

// Configuración del formulario público (el enlace que se envía a la familia)
// y de los tramos de peso "hasta X kg" del crematorio. Los tramos también
// calculan el recargo por peso de las órdenes internas.

const MAX_TIERS = 12;

// Columnas: nombre del campo (se ajusta) | Mostrar | Obligatorio (ancho fijo)
const FIELD_GRID = 'grid grid-cols-[minmax(0,1fr)_4.5rem_5.5rem] items-center gap-x-2';

const TIER_PLACEHOLDERS = ['Mini', 'Pequeño', 'Mediano', 'Grande', 'Extra grande', 'Gigante'];

interface FieldRow {
    key: string;
    section: 'owner' | 'pet';
    label: string;
    visible: boolean;
    required: boolean;
}

interface TierRow {
    label: string;
    min_weight: string; // "desde", escrito por el crematorio
    max_weight: string; // "hasta"; vacío en el último = abierto ("desde X kg")
    price: string;
}

const FIXED_FIELDS: Record<FieldRow['section'], string[]> = {
    owner: ['Nombre completo', 'Teléfono'],
    pet: ['Nombre', 'Especie'],
};

const SECTIONS: { key: FieldRow['section']; title: string; icon: typeof User }[] = [
    { key: 'owner', title: 'Datos del cliente', icon: User },
    { key: 'pet', title: 'Datos de la mascota', icon: PawPrint },
];

interface SavedTier {
    label: string | null;
    min_weight: number | null;
    max_weight: number | null;
    price: number | null;
}

const fmtKg = (n: number) => String(n).replace('.', ',');
const parseKg = (v: string) => parseFloat(v.replace(',', '.'));

const toTierRows = (rules: SavedTier[]): TierRow[] => rules.map(r => ({
    label: r.label || '',
    min_weight: fmtKg(r.min_weight ?? 0),
    max_weight: r.max_weight != null ? fmtKg(r.max_weight) : '',
    price: r.price != null ? String(r.price) : '0',
}));

function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40 disabled:cursor-not-allowed ${checked ? 'bg-primary' : 'bg-foreground/15'}`}
        >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    );
}

export function PublicFormTab() {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fields, setFields] = useState<FieldRow[]>([]);
    const [showPrices, setShowPrices] = useState(false);
    const [tiers, setTiers] = useState<TierRow[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const [cfg, rules] = await Promise.all([
                    apiRequest('/api/internal/maintenance/form-config'),
                    apiRequest('/api/internal/maintenance/weight-pricing'),
                ]);
                setFields(cfg.fields);
                setShowPrices(!!cfg.show_weight_prices);
                setTiers(toTierRows(rules as SavedTier[]));
            } catch (err: unknown) {
                showToast((err as Error)?.message || 'Error al cargar la configuración del formulario', 'error');
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const updateField = (key: string, patch: Partial<FieldRow>) => {
        setFields(prev => prev.map(f => {
            if (f.key !== key) return f;
            const next = { ...f, ...patch };
            if (!next.visible) next.required = false; // oculto nunca es obligatorio
            if (patch.required) next.visible = true;
            return next;
        }));
    };

    const updateTier = (idx: number, patch: Partial<TierRow>) =>
        setTiers(prev => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));

    const addTier = () => {
        if (tiers.length >= MAX_TIERS) return;
        setTiers(prev => [...prev, { label: '', min_weight: prev.length === 0 ? '0' : '', max_weight: '', price: '0' }]);
    };

    const removeTier = (idx: number) => setTiers(prev => prev.filter((_, i) => i !== idx));

    // Mismas reglas que el backend: desde ≥ hasta del rango anterior (sin solapes),
    // hasta > desde, y solo el último rango puede quedar sin "hasta".
    const validateTiers = (): string | null => {
        let prevMax: number | null = null;
        for (let i = 0; i < tiers.length; i++) {
            const t = tiers[i];
            const n = i + 1;
            const isLast = i === tiers.length - 1;
            const price = parseFloat(t.price || '0');
            if (isNaN(price) || price < 0) return `Rango ${n}: recargo inválido`;
            const min = parseKg(t.min_weight);
            if (!t.min_weight.trim() || isNaN(min) || min < 0) return `Rango ${n}: indica desde cuántos kg`;
            if (prevMax !== null && min < prevMax) return `Rango ${n}: debe empezar en ${fmtKg(prevMax)} kg o más (el anterior llega hasta ${fmtKg(prevMax)} kg)`;
            if (!t.max_weight.trim()) {
                if (!isLast) return `Rango ${n}: indica hasta cuántos kg (solo el último puede quedar abierto)`;
                continue;
            }
            const max = parseKg(t.max_weight);
            if (isNaN(max) || max <= min) return `Rango ${n}: el peso hasta debe ser mayor que ${fmtKg(min)} kg`;
            prevMax = max;
        }
        return null;
    };

    const handleSave = async () => {
        const tierError = validateTiers();
        if (tierError) {
            showToast(tierError, 'error');
            return;
        }
        setSaving(true);
        try {
            await apiRequest('/api/internal/maintenance/form-config', {
                method: 'PUT',
                body: JSON.stringify({
                    fields: Object.fromEntries(fields.map(f => [f.key, { visible: f.visible, required: f.required }])),
                    show_weight_prices: showPrices,
                }),
            });
            const saved = await apiRequest('/api/internal/maintenance/weight-pricing', {
                method: 'PUT',
                body: JSON.stringify({
                    tiers: tiers.map(t => ({
                        label: t.label.trim() || null,
                        min_weight: parseKg(t.min_weight),
                        max_weight: t.max_weight.trim() ? parseKg(t.max_weight) : null,
                        price: parseFloat(t.price || '0') || 0,
                    })),
                }),
            });
            setTiers(toTierRows(saved as SavedTier[]));
            showToast('Configuración del formulario guardada', 'success');
        } catch (err: unknown) {
            showToast((err as Error)?.message || 'Error al guardar la configuración', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="py-16 text-center text-sm text-muted-foreground">Cargando configuración…</div>;
    }

    return (
        <div className="space-y-10 animate-fade-in">
            <div className="border-b border-white/5 pb-6">
                <h3 className="text-xl font-bold">Formulario para la familia</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Elige qué datos pide el formulario que envías a la familia para registrar el servicio, y cuáles son obligatorios.
                </p>
            </div>

            {/* Campos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {SECTIONS.map(section => {
                    const Icon = section.icon;
                    return (
                        <div key={section.key} className="glass-card p-5 sm:p-6 rounded-3xl min-w-0">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 rounded-xl bg-primary/10">
                                    <Icon size={16} className="text-primary" />
                                </div>
                                <h4 className="font-bold">{section.title}</h4>
                            </div>

                            {/* Misma cuadrícula para cabecera y filas: las columnas de los
                                interruptores tienen ancho propio y nunca se desbordan. */}
                            <div className={`${FIELD_GRID} pb-2 border-b border-foreground/10 text-[11px] font-semibold text-muted-foreground`}>
                                <span>Campo</span>
                                <span className="text-center">Mostrar</span>
                                <span className="text-center">Obligatorio</span>
                            </div>

                            <div className="divide-y divide-foreground/5">
                                {FIXED_FIELDS[section.key].map(name => (
                                    <div key={name} className={`${FIELD_GRID} py-3`}>
                                        <span className="flex items-center gap-2 min-w-0 text-sm text-muted-foreground">
                                            <Lock size={13} className="shrink-0" />
                                            <span className="truncate">{name}</span>
                                        </span>
                                        <span className="col-span-2 justify-self-center rounded-full bg-foreground/5 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                                            Siempre obligatorio
                                        </span>
                                    </div>
                                ))}
                                {fields.filter(f => f.section === section.key).map(f => {
                                    const status = !f.visible ? 'Oculto' : f.required ? 'Obligatorio' : 'Opcional';
                                    const statusClass = !f.visible
                                        ? 'text-muted-foreground'
                                        : f.required ? 'text-primary' : 'text-emerald-600 dark:text-emerald-400';
                                    return (
                                        <div key={f.key} className={`${FIELD_GRID} py-3`}>
                                            <div className="min-w-0">
                                                <p className={`text-sm font-medium break-words ${f.visible ? '' : 'text-muted-foreground'}`}>{f.label}</p>
                                                <p className={`text-[11px] font-medium mt-0.5 ${statusClass}`}>{status}</p>
                                            </div>
                                            <div className="flex justify-center">
                                                <Toggle label={`Mostrar ${f.label}`} checked={f.visible} onChange={v => updateField(f.key, { visible: v })} />
                                            </div>
                                            <div className="flex justify-center">
                                                <Toggle label={`${f.label} obligatorio`} checked={f.required} disabled={!f.visible} onChange={v => updateField(f.key, { required: v })} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Tramos de peso */}
            <div className="glass-card p-5 sm:p-6 rounded-3xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Scale size={18} className="text-primary" />
                            <h4 className="font-bold">Rangos de peso</h4>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                            Hasta {MAX_TIERS} rangos. Escribe desde y hasta cuántos kg (ej. 0 – 4, 4,1 – 7); un rango no puede empezar antes de que termine el anterior. Deja vacío el “hasta” del último para “desde X kg”.
                            Se usan en el formulario, en el catálogo de planes y para el recargo por peso de las órdenes.
                        </p>
                    </div>
                    <label className="flex items-center gap-3 text-sm font-medium shrink-0 cursor-pointer">
                        <Toggle label="Mostrar precio de los rangos al público" checked={showPrices} onChange={setShowPrices} />
                        Mostrar precio al público
                    </label>
                </div>

                {tiers.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                        Sin rangos definidos: el formulario usa los rangos genéricos (Pequeño, Mediano, Grande, Gigante) y no se aplica recargo por peso.
                    </p>
                ) : (
                    <div className="space-y-3">
                        <div className="hidden sm:grid grid-cols-[1.4fr_0.8fr_1fr_1fr_auto] gap-3 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <span>Nombre (opcional)</span>
                            <span>Desde (kg)</span>
                            <span>Hasta (kg)</span>
                            <span>Recargo ($)</span>
                            <span className="w-9" />
                        </div>
                        {tiers.map((t, idx) => {
                            const isLast = idx === tiers.length - 1;
                            return (
                                <div key={idx} className="grid grid-cols-2 sm:grid-cols-[1.4fr_0.8fr_1fr_1fr_auto] gap-3 items-center">
                                    <div className="col-span-2 sm:col-span-1">
                                        <FormInputLite placeholder={`Ej: ${TIER_PLACEHOLDERS[idx] ?? `Rango ${idx + 1}`}`} value={t.label} maxLength={40} onChange={v => updateTier(idx, { label: v })} />
                                    </div>
                                    <FormInputLite
                                        placeholder={idx === 0 ? 'Desde: 0' : `Desde: ${tiers[idx - 1].max_weight || '…'}`}
                                        value={t.min_weight}
                                        inputMode="decimal"
                                        ariaLabel={`Rango ${idx + 1}: desde (kg)`}
                                        onChange={v => updateTier(idx, { min_weight: v.replace(/[^\d.,]/g, '') })}
                                    />
                                    <FormInputLite
                                        placeholder={isLast ? 'Hasta: o más' : 'Hasta: ej. 4'}
                                        ariaLabel={`Rango ${idx + 1}: hasta (kg)`}
                                        value={t.max_weight}
                                        inputMode="decimal"
                                        onChange={v => updateTier(idx, { max_weight: v.replace(/[^\d.,]/g, '') })}
                                    />
                                    <FormInputLite
                                        placeholder="0"
                                        value={t.price}
                                        inputMode="numeric"
                                        onChange={v => updateTier(idx, { price: v.replace(/\D/g, '') })}
                                        hint={t.price && showPrices ? formatCLP(parseFloat(t.price) || 0) : undefined}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeTier(idx)}
                                        aria-label={`Eliminar rango ${idx + 1}`}
                                        className="justify-self-end p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                <button
                    type="button"
                    onClick={addTier}
                    disabled={tiers.length >= MAX_TIERS}
                    className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Plus size={16} />
                    {tiers.length >= MAX_TIERS ? `Máximo ${MAX_TIERS} rangos` : 'Agregar rango'}
                </button>
            </div>

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-primary text-primary-foreground font-bold py-3 px-6 rounded-xl flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-60"
                >
                    <Save size={18} />
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
            </div>
        </div>
    );
}

function FormInputLite({ value, onChange, placeholder, maxLength, inputMode, hint, ariaLabel }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    maxLength?: number;
    inputMode?: 'decimal' | 'numeric';
    hint?: string;
    ariaLabel?: string;
}) {
    return (
        <div>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                maxLength={maxLength}
                inputMode={inputMode}
                aria-label={ariaLabel}
                className="w-full bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl py-2.5 px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all text-sm dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-white/30 dark:focus:border-primary/50 dark:focus:ring-0"
            />
            {hint && <p className="text-[10px] text-muted-foreground mt-1 ml-1">{hint}</p>}
        </div>
    );
}
