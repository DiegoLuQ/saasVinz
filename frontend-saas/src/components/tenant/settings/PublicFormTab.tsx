import React, { useEffect, useState } from 'react';
import { Lock, Plus, Save, Scale, Trash2, User, PawPrint } from 'lucide-react';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { apiRequest } from '@/lib/tenant/api';
import { formatCLP } from '@/lib/publicFormConfig';

// Configuración del formulario público (el enlace que se envía a la familia)
// y de los tramos de peso "hasta X kg" del crematorio. Los tramos también
// calculan el recargo por peso de las órdenes internas.

const MAX_TIERS = 6;

interface FieldRow {
    key: string;
    section: 'owner' | 'pet';
    label: string;
    visible: boolean;
    required: boolean;
}

interface TierRow {
    label: string;
    max_weight: string; // vacío en el último = abierto ("más de X kg")
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
    max_weight: number | null;
    price: number | null;
}

const fmtKg = (n: number) => String(n).replace('.', ',');
const parseKg = (v: string) => parseFloat(v.replace(',', '.'));

const toTierRows = (rules: SavedTier[]): TierRow[] => rules.map(r => ({
    label: r.label || '',
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
        setTiers(prev => [...prev, { label: '', max_weight: '', price: '0' }]);
    };

    const removeTier = (idx: number) => setTiers(prev => prev.filter((_, i) => i !== idx));

    // "Desde" de cada tramo = máximo del anterior (solo informativo)
    const tierFrom = (idx: number) => {
        for (let i = idx - 1; i >= 0; i--) {
            const v = parseKg(tiers[i].max_weight);
            if (!isNaN(v)) return v;
        }
        return 0;
    };

    const validateTiers = (): string | null => {
        let prev = 0;
        for (let i = 0; i < tiers.length; i++) {
            const t = tiers[i];
            const isLast = i === tiers.length - 1;
            const price = parseFloat(t.price || '0');
            if (isNaN(price) || price < 0) return `Rango ${i + 1}: precio inválido`;
            if (!t.max_weight.trim()) {
                if (!isLast) return `Rango ${i + 1}: indica hasta cuántos kg (solo el último puede quedar abierto)`;
                continue;
            }
            const max = parseKg(t.max_weight);
            if (isNaN(max) || max <= prev) return `Rango ${i + 1}: el máximo debe ser mayor que ${fmtKg(prev)} kg`;
            prev = max;
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
                        <div key={section.key} className="glass-card p-5 sm:p-6 rounded-3xl">
                            <div className="flex items-center gap-2 mb-4">
                                <Icon size={18} className="text-primary" />
                                <h4 className="font-bold">{section.title}</h4>
                            </div>
                            <div className="flex items-center justify-end gap-6 pr-1 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                <span className="w-11 text-center">Mostrar</span>
                                <span className="w-11 text-center">Obligatorio</span>
                            </div>
                            <div className="divide-y divide-foreground/5">
                                {FIXED_FIELDS[section.key].map(name => (
                                    <div key={name} className="flex items-center justify-between py-3 text-sm">
                                        <span className="flex items-center gap-2 text-muted-foreground">
                                            <Lock size={13} /> {name}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground pr-1">Siempre</span>
                                    </div>
                                ))}
                                {fields.filter(f => f.section === section.key).map(f => (
                                    <div key={f.key} className="flex items-center justify-between gap-4 py-3">
                                        <span className="text-sm font-medium">{f.label}</span>
                                        <div className="flex items-center gap-6 pr-1">
                                            <Toggle label={`Mostrar ${f.label}`} checked={f.visible} onChange={v => updateField(f.key, { visible: v })} />
                                            <Toggle label={`${f.label} obligatorio`} checked={f.required} disabled={!f.visible} onChange={v => updateField(f.key, { required: v })} />
                                        </div>
                                    </div>
                                ))}
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
                            Hasta {MAX_TIERS} rangos. Cada uno empieza donde termina el anterior; deja vacío el máximo del último para “más de X kg”.
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
                            <span>Desde</span>
                            <span>Hasta (kg)</span>
                            <span>Recargo ($)</span>
                            <span className="w-9" />
                        </div>
                        {tiers.map((t, idx) => {
                            const isLast = idx === tiers.length - 1;
                            return (
                                <div key={idx} className="grid grid-cols-2 sm:grid-cols-[1.4fr_0.8fr_1fr_1fr_auto] gap-3 items-center">
                                    <div className="col-span-2 sm:col-span-1">
                                        <FormInputLite placeholder={`Ej: ${['Pequeño', 'Mediano', 'Grande', 'Extra grande', 'Gigante', 'Muy grande'][idx]}`} value={t.label} maxLength={40} onChange={v => updateTier(idx, { label: v })} />
                                    </div>
                                    <div className="text-sm text-muted-foreground px-1">
                                        <span className="sm:hidden text-[10px] font-bold uppercase mr-1">Desde</span>
                                        {idx === 0 ? '0 kg' : `más de ${fmtKg(tierFrom(idx))} kg`}
                                    </div>
                                    <FormInputLite
                                        placeholder={isLast ? 'o más' : 'Ej: 4'}
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

function FormInputLite({ value, onChange, placeholder, maxLength, inputMode, hint }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    maxLength?: number;
    inputMode?: 'decimal' | 'numeric';
    hint?: string;
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
                className="w-full bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl py-2.5 px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all text-sm dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-white/30 dark:focus:border-primary/50 dark:focus:ring-0"
            />
            {hint && <p className="text-[10px] text-muted-foreground mt-1 ml-1">{hint}</p>}
        </div>
    );
}
