import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock, Plus, Save, Scale, Trash2, User, PawPrint, Tag, Sparkles, X } from 'lucide-react';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { apiRequest } from '@/lib/tenant/api';
import { formatCLP } from '@/lib/publicFormConfig';

// Configuración del formulario público (el enlace que se envía a la familia)
// y de los tramos de peso "hasta X kg" del crematorio. Los tramos también
// calculan el recargo por peso de las órdenes internas.

const MAX_TIERS = 20;

// Columnas: nombre del campo (se ajusta) | Mostrar | Obligatorio (ancho fijo)
const FIELD_GRID = 'grid grid-cols-[minmax(0,1fr)_4.5rem_5.5rem] items-center gap-x-2';

// Rangos de peso en escritorio: nombre | desde | hasta | recargo | eliminar.
// Literal completo para que Tailwind genere también la variante md:.
const TIER_GRID = 'grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_2.5rem]';
const TIER_GRID_MD = 'md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_2.5rem]';

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

interface SpecialService {
    id: number;
    name: string;
    description: string | null;
    price: number;
    is_active: boolean;
    is_special?: boolean;
    show_in_form?: boolean;
}

const EMPTY_SPECIAL = { name: '', description: '', price: '' };

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
    const [showServicePrices, setShowServicePrices] = useState(false);
    const [tiers, setTiers] = useState<TierRow[]>([]);
    // Servicios especiales del catálogo: visibilidad editable aquí, guardada con el resto.
    const [specials, setSpecials] = useState<SpecialService[]>([]);
    const [savedSpecialVisibility, setSavedSpecialVisibility] = useState<Record<number, boolean>>({});
    const [newSpecial, setNewSpecial] = useState<typeof EMPTY_SPECIAL | null>(null);
    const [creatingSpecial, setCreatingSpecial] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const [cfg, rules] = await Promise.all([
                    apiRequest('/api/internal/maintenance/form-config'),
                    apiRequest('/api/internal/maintenance/weight-pricing'),
                ]);
                setFields(cfg.fields);
                setShowPrices(!!cfg.show_weight_prices);
                setShowServicePrices(!!cfg.show_service_prices);
                setTiers(toTierRows(rules as SavedTier[]));
                // Sin permiso sobre Servicios la tarjeta queda vacía, sin bloquear el resto.
                const services = await apiRequest('/api/internal/services/').catch(() => []) as SpecialService[];
                const sp = services.filter(sv => sv.is_special);
                setSpecials(sp);
                setSavedSpecialVisibility(Object.fromEntries(sp.map(sv => [sv.id, sv.show_in_form !== false])));
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

    const createSpecial = async () => {
        if (!newSpecial) return;
        const name = newSpecial.name.trim();
        if (!name) {
            showToast('Indica el nombre del servicio especial', 'error');
            return;
        }
        setCreatingSpecial(true);
        try {
            const created = await apiRequest('/api/internal/services/', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    description: newSpecial.description.trim() || null,
                    price: parseFloat(newSpecial.price || '0') || 0,
                    cost: 0,
                    is_active: true,
                    is_special: true,
                    show_in_form: true,
                }),
            }) as SpecialService;
            setSpecials(prev => [...prev, created]);
            setSavedSpecialVisibility(prev => ({ ...prev, [created.id]: true }));
            setNewSpecial(null);
            showToast('Servicio especial creado', 'success');
        } catch (err: unknown) {
            showToast((err as Error)?.message || 'Error al crear el servicio', 'error');
        } finally {
            setCreatingSpecial(false);
        }
    };

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
                    show_service_prices: showServicePrices,
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
            const changed = specials.filter(sv => (sv.show_in_form !== false) !== savedSpecialVisibility[sv.id]);
            await Promise.all(changed.map(sv => apiRequest(`/api/internal/services/${sv.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ show_in_form: sv.show_in_form !== false }),
            })));
            setSavedSpecialVisibility(Object.fromEntries(specials.map(sv => [sv.id, sv.show_in_form !== false])));
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

                {tiers.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                        Sin rangos definidos: el formulario usa los rangos genéricos (Pequeño, Mediano, Grande, Gigante) y no se aplica recargo por peso.
                    </p>
                ) : (
                    <div className="space-y-3">
                        <div className={`hidden md:grid ${TIER_GRID} gap-3 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground`}>
                            <span>Nombre (opcional)</span>
                            <span>Desde</span>
                            <span>Hasta</span>
                            <span>Recargo</span>
                            <span className="w-10" />
                        </div>
                        {tiers.map((t, idx) => {
                            const isLast = idx === tiers.length - 1;
                            return (
                                // Móvil: una tarjeta por rango (nombre arriba, desde/hasta lado a
                                // lado, recargo abajo). Escritorio: fila alineada con la cabecera.
                                <div key={idx} className={`grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-2xl border border-foreground/10 p-3 ${TIER_GRID_MD} md:items-start md:gap-3 md:rounded-none md:border-0 md:p-0`}>
                                    <div className="col-span-2 md:col-span-1 flex items-end gap-2 min-w-0">
                                        <div className="flex-1 min-w-0">
                                            <TierLabel>Rango {idx + 1} · Nombre (opcional)</TierLabel>
                                            <FormInputLite placeholder={`Ej: ${TIER_PLACEHOLDERS[idx] ?? `Rango ${idx + 1}`}`} value={t.label} maxLength={40} ariaLabel={`Rango ${idx + 1}: nombre`} onChange={v => updateTier(idx, { label: v })} />
                                        </div>
                                        <RemoveTierButton idx={idx} onClick={() => removeTier(idx)} className="flex md:hidden" />
                                    </div>
                                    <div className="min-w-0">
                                        <TierLabel>Desde</TierLabel>
                                        <FormInputLite
                                            placeholder={idx === 0 ? '0' : tiers[idx - 1].max_weight || '…'}
                                            value={t.min_weight}
                                            inputMode="decimal"
                                            suffix="kg"
                                            ariaLabel={`Rango ${idx + 1}: desde (kg)`}
                                            onChange={v => updateTier(idx, { min_weight: v.replace(/[^\d.,]/g, '') })}
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <TierLabel>Hasta</TierLabel>
                                        <FormInputLite
                                            placeholder={isLast ? 'o más' : 'ej. 4'}
                                            ariaLabel={`Rango ${idx + 1}: hasta (kg)`}
                                            value={t.max_weight}
                                            inputMode="decimal"
                                            suffix="kg"
                                            onChange={v => updateTier(idx, { max_weight: v.replace(/[^\d.,]/g, '') })}
                                        />
                                    </div>
                                    <div className="col-span-2 md:col-span-1 min-w-0">
                                        <TierLabel>Recargo</TierLabel>
                                        <FormInputLite
                                            placeholder="0"
                                            value={t.price}
                                            inputMode="numeric"
                                            prefix="$"
                                            ariaLabel={`Rango ${idx + 1}: recargo ($)`}
                                            onChange={v => updateTier(idx, { price: v.replace(/\D/g, '') })}
                                            hint={parseFloat(t.price) > 0 ? formatCLP(parseFloat(t.price)) : undefined}
                                        />
                                    </div>
                                    <RemoveTierButton idx={idx} onClick={() => removeTier(idx)} className="hidden md:flex" />
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

            {/* Servicios especiales (eutanasia, exhumación…) */}
            <div className="glass-card p-5 sm:p-6 rounded-3xl space-y-4">
                <div>
                    <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-primary" />
                        <h4 className="font-bold">Servicios especiales</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                        Servicios como eutanasia o exhumación. La familia los ve como adicionales después de elegir el plan y se suman al total;
                        si el plan elegido ya incluye uno, aparece como “Incluido en tu plan”. Se guardan en el{' '}
                        <Link href="/dashboard/gestion-servicios" className="text-primary font-semibold hover:underline">catálogo de servicios</Link>,
                        donde también puedes editarlos o agregarlos a un plan.
                    </p>
                </div>

                {specials.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">Aún no tienes servicios especiales.</p>
                ) : (
                    <div className="divide-y divide-foreground/5">
                        {specials.map(sv => (
                            <div key={sv.id} className="flex items-center justify-between gap-4 py-3">
                                <div className="min-w-0">
                                    <p className={`text-sm font-medium break-words ${sv.show_in_form !== false ? '' : 'text-muted-foreground'}`}>
                                        {sv.name}
                                        <span className="ml-2 text-xs font-semibold text-muted-foreground">{formatCLP(sv.price || 0)}</span>
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5 break-words">
                                        {!sv.is_active ? 'Inactivo en el catálogo · ' : ''}{sv.description || 'Sin descripción'}
                                    </p>
                                </div>
                                <Toggle
                                    label={`Mostrar ${sv.name} en el formulario`}
                                    checked={sv.show_in_form !== false}
                                    onChange={v => setSpecials(prev => prev.map(x => (x.id === sv.id ? { ...x, show_in_form: v } : x)))}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {newSpecial ? (
                    <div className="rounded-2xl border border-foreground/10 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-bold">Nuevo servicio especial</p>
                            <button type="button" onClick={() => setNewSpecial(null)} aria-label="Cancelar" className="p-1.5 rounded-lg text-muted-foreground hover:bg-foreground/5">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
                            <FormInputLite placeholder="Nombre (ej: Eutanasia)" value={newSpecial.name} maxLength={80} ariaLabel="Nombre del servicio especial" onChange={v => setNewSpecial({ ...newSpecial, name: v })} />
                            <FormInputLite placeholder="Precio" value={newSpecial.price} inputMode="numeric" prefix="$" ariaLabel="Precio del servicio especial" onChange={v => setNewSpecial({ ...newSpecial, price: v.replace(/\D/g, '') })} />
                            <div className="sm:col-span-2">
                                <FormInputLite placeholder="Descripción (opcional)" value={newSpecial.description} maxLength={200} ariaLabel="Descripción del servicio especial" onChange={v => setNewSpecial({ ...newSpecial, description: v })} />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={createSpecial}
                                disabled={creatingSpecial}
                                className="bg-primary text-primary-foreground font-bold py-2 px-4 rounded-xl text-sm hover:opacity-90 transition-all disabled:opacity-60"
                            >
                                {creatingSpecial ? 'Creando…' : 'Crear servicio'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setNewSpecial(EMPTY_SPECIAL)}
                        className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:opacity-80"
                    >
                        <Plus size={16} />
                        Agregar servicio especial
                    </button>
                )}
            </div>

            {/* Precios visibles para la familia */}
            <div className="glass-card p-5 sm:p-6 rounded-3xl space-y-4">
                <div>
                    <div className="flex items-center gap-2">
                        <Tag size={18} className="text-primary" />
                        <h4 className="font-bold">Precios en el formulario</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                        Elige qué precios ve la familia. Con alguno activo, el resumen final muestra el total estimado (plan elegido + servicios especiales + recargo por peso).
                    </p>
                </div>
                <div className="divide-y divide-foreground/5">
                    <PriceToggleRow
                        title="Precio según el peso"
                        description="Muestra el recargo de cada rango de peso (también en el catálogo de planes)."
                        checked={showPrices}
                        onChange={setShowPrices}
                    />
                    <PriceToggleRow
                        title="Precio según el plan elegido"
                        description="Muestra el precio de cada plan y de los servicios especiales al elegirlos."
                        checked={showServicePrices}
                        onChange={setShowServicePrices}
                    />
                </div>
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

function TierLabel({ children }: { children: React.ReactNode }) {
    // Solo en móvil: en escritorio la cabecera de columnas ya nombra cada campo.
    return <span className="md:hidden block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 ml-1">{children}</span>;
}

function RemoveTierButton({ idx, onClick, className = '' }: { idx: number; onClick: () => void; className?: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`Eliminar rango ${idx + 1}`}
            className={`${className} h-[42px] w-10 shrink-0 items-center justify-center text-red-400 hover:bg-red-500/10 rounded-xl transition-all`}
        >
            <Trash2 size={16} />
        </button>
    );
}

function PriceToggleRow({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
            </div>
            <Toggle label={title} checked={checked} onChange={onChange} />
        </div>
    );
}

function FormInputLite({ value, onChange, placeholder, maxLength, inputMode, hint, ariaLabel, prefix, suffix }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    maxLength?: number;
    inputMode?: 'decimal' | 'numeric';
    hint?: string;
    ariaLabel?: string;
    prefix?: string;
    suffix?: string;
}) {
    return (
        <div>
            <div className="relative">
                {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-white/40">{prefix}</span>}
                <input
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    inputMode={inputMode}
                    aria-label={ariaLabel}
                    className={`w-full min-w-0 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all text-sm dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-white/30 dark:focus:border-primary/50 dark:focus:ring-0 ${prefix ? 'pl-7' : 'pl-3'} ${suffix ? 'pr-9' : 'pr-3'}`}
                />
                {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 dark:text-white/40">{suffix}</span>}
            </div>
            {hint && <p className="text-[10px] text-muted-foreground mt-1 ml-1">{hint}</p>}
        </div>
    );
}
