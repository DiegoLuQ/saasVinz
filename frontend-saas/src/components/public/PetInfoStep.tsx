import React, { useState } from 'react';
import { DEFAULT_FORM_CONFIG, fieldSuffix, formatCLP, type PublicFormConfig, type WeightTier } from '@/lib/publicFormConfig';

export interface PetData {
    name: string;
    nickname?: string;
    type: string;
    breed: string;
    size: string;
    age: string;
    birthDate?: string;
    deathDate?: string;
    weightRange?: 'small' | 'medium' | 'large' | 'giant' | '';
    weightTierId?: string;
    weightKg?: string;
}

interface Props {
    data: PetData;
    updateData: (data: Partial<PetData>) => void;
    errors: Record<string, string>;
    /** Campos visibles/obligatorios configurados por el crematorio */
    formConfig?: PublicFormConfig;
    /** Tramos de peso del crematorio; vacío = rangos fijos de respaldo */
    weightTiers?: WeightTier[];
}

// Respaldo para crematorios que aún no definieron sus tramos de peso.
const LEGACY_WEIGHT_RANGES: { value: NonNullable<PetData['weightRange']>; label: string; range: string }[] = [
    { value: 'small', label: 'Pequeño', range: '0 – 10 kg' },
    { value: 'medium', label: 'Mediano', range: '10 – 25 kg' },
    { value: 'large', label: 'Grande', range: '25 – 45 kg' },
    { value: 'giant', label: 'Gigante', range: '45+ kg' },
];

const LABEL = 'block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1 mb-2';
const ERROR = 'text-[11px] text-red-500 mt-2 font-semibold uppercase tracking-tight ml-2';
const errClass = (has?: string) => (has ? 'border-red-500/50 focus:ring-red-500/10' : '');

export default function PetInfoStep({ data, updateData, errors, formConfig = DEFAULT_FORM_CONFIG, weightTiers = [] }: Props) {
    const f = formConfig.fields;
    // Modo del peso: rangos vs número exacto. Inicializa según el dato existente
    // (si vuelves al paso y ya tenías weightKg, abre en modo exacto).
    const [useExactWeight, setUseExactWeight] = useState<boolean>(!!data.weightKg);

    const toggleExactWeight = () => {
        if (useExactWeight) {
            // Volviendo a rangos: limpiamos el peso numérico
            setUseExactWeight(false);
            updateData({ weightKg: '' });
        } else {
            // Pasando a exacto: limpiamos el rango previo
            setUseExactWeight(true);
            updateData({ weightRange: '', weightTierId: '' });
        }
    };

    const rangeOptions = weightTiers.length > 0
        ? weightTiers.map(t => ({
            key: String(t.id),
            label: t.label || t.range_text,
            range: t.label ? t.range_text : '',
            price: formConfig.show_weight_prices && t.price != null ? t.price : null,
            selected: data.weightTierId === String(t.id),
            select: () => updateData({ weightTierId: String(t.id), weightRange: '', weightKg: '' }),
        }))
        : LEGACY_WEIGHT_RANGES.map(r => ({
            key: r.value,
            label: r.label,
            range: r.range,
            price: null as number | null,
            selected: data.weightRange === r.value,
            select: () => updateData({ weightRange: r.value, weightTierId: '', weightKg: '' }),
        }));
    const gridCols = rangeOptions.length <= 2 ? 'sm:grid-cols-2' : rangeOptions.length === 3 || rangeOptions.length >= 5 ? 'sm:grid-cols-3' : 'sm:grid-cols-4';

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-extrabold uppercase italic tracking-tight text-slate-800 dark:text-slate-100 mb-1.5">
                    Información del Angelito
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal tracking-wide">
                    Información sobre tu querido compañero
                </p>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL}>Nombre *</label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => updateData({ name: e.target.value.slice(0, 50) })}
                            className={`input-emotional ${errClass(errors.name)}`}
                            placeholder="Ej: Max"
                            maxLength={50}
                        />
                        {errors.name && <p className={ERROR}>! {errors.name}</p>}
                    </div>
                    {f.nickname.visible && (
                        <div>
                            <label className={LABEL}>Cómo le decían{fieldSuffix(f.nickname)}</label>
                            <input
                                type="text"
                                value={data.nickname || ''}
                                onChange={(e) => updateData({ nickname: e.target.value.slice(0, 30) })}
                                className={`input-emotional ${errClass(errors.nickname)}`}
                                placeholder="Ej: Maxi"
                                maxLength={30}
                            />
                            {errors.nickname && <p className={ERROR}>! {errors.nickname}</p>}
                        </div>
                    )}
                    <div>
                        <label className={LABEL}>Especie *</label>
                        <select
                            value={data.type}
                            onChange={(e) => updateData({ type: e.target.value })}
                            className={`input-emotional text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950 ${errClass(errors.type)}`}
                        >
                            <option value="" className="text-slate-400 dark:text-slate-600">Selecciona...</option>
                            <option value="Canino" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950">Canino</option>
                            <option value="Felino" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950">Felino</option>
                            <option value="Ave" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950">Ave</option>
                            <option value="Mamífero Pequeño" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950">Mamífero Pequeño</option>
                            <option value="Reptil / Anfibio" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950">Reptil / Anfibio</option>
                            <option value="Exótico" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950">Exótico</option>
                            <option value="Roedor" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950">Roedor</option>
                            <option value="Otro" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950">Otro</option>
                        </select>
                        {errors.type && <p className={ERROR}>! {errors.type}</p>}
                    </div>
                    {f.breed.visible && (
                        <div>
                            <label className={LABEL}>Raza{fieldSuffix(f.breed)}</label>
                            <input
                                type="text"
                                value={data.breed || ''}
                                onChange={(e) => updateData({ breed: e.target.value.slice(0, 20) })}
                                className={`input-emotional ${errClass(errors.breed)}`}
                                placeholder="Ej: Mestizo"
                                maxLength={20}
                            />
                            {errors.breed && <p className={ERROR}>! {errors.breed}</p>}
                        </div>
                    )}
                </div>

                {/* Peso: tramos del crematorio + opción exacto */}
                {f.weight.visible && (
                <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tamaño / Peso{fieldSuffix(f.weight)}</label>
                        <button
                            type="button"
                            onClick={toggleExactWeight}
                            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline tracking-wide cursor-pointer"
                        >
                            {useExactWeight ? '← Volver a rangos' : 'Sé el peso exacto →'}
                        </button>
                    </div>

                    {useExactWeight ? (
                        <div className="relative">
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="200"
                                value={data.weightKg || ''}
                                onChange={(e) => updateData({ weightKg: e.target.value, weightRange: '', weightTierId: '' })}
                                className={`input-emotional pr-12 ${errClass(errors.weightRange || errors.weightKg)}`}
                                placeholder="Ej: 4.2"
                                autoFocus
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm font-semibold">kg</span>
                        </div>
                    ) : (
                        <div className={`grid grid-cols-2 ${gridCols} gap-2`}>
                            {rangeOptions.map(opt => (
                                <button
                                    key={opt.key}
                                    type="button"
                                    onClick={opt.select}
                                    className={`p-3 rounded-2xl border-2 transition-all text-center cursor-pointer ${opt.selected
                                        ? 'border-sky-500 bg-sky-50 shadow-md shadow-sky-500/10 dark:bg-sky-950/20 dark:border-sky-500/30'
                                        : 'border-slate-200 hover:border-slate-300 bg-white dark:bg-slate-950 dark:border-slate-800 dark:hover:border-slate-700'
                                        }`}
                                >
                                    <div className={`text-xs font-bold uppercase tracking-wider ${opt.selected ? 'text-sky-700 dark:text-sky-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {opt.label}
                                    </div>
                                    {opt.range && (
                                        <div className={`text-[10px] font-medium mt-0.5 ${opt.selected ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                            {opt.range}
                                        </div>
                                    )}
                                    {opt.price != null && (
                                        <div className={`text-[11px] font-bold mt-1 ${opt.selected ? 'text-sky-700 dark:text-sky-300' : 'text-slate-600 dark:text-slate-300'}`}>
                                            {formatCLP(opt.price)}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                    {(errors.weightRange || errors.weightKg) && (
                        <p className={ERROR}>! {errors.weightRange || errors.weightKg}</p>
                    )}
                </div>
                )}

                {f.age.visible && (
                <div>
                    <label className={LABEL}>Edad (años){fieldSuffix(f.age)}</label>
                    <input
                        type="text"
                        value={data.age}
                        onChange={(e) => updateData({ age: e.target.value.replace(/\D/g, '') })}
                        className={`input-emotional max-w-[150px] ${errClass(errors.age)}`}
                        placeholder="Ej: 5"
                        maxLength={3}
                    />
                    {errors.age && <p className={ERROR}>! {errors.age}</p>}
                </div>
                )}

                {(f.birthDate.visible || f.deathDate.visible) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {f.birthDate.visible && (
                            <div>
                                <label className={LABEL}>Nacimiento{fieldSuffix(f.birthDate)}</label>
                                <input
                                    type="date"
                                    value={data.birthDate || ''}
                                    onChange={(e) => updateData({ birthDate: e.target.value })}
                                    className={`input-emotional ${errClass(errors.birthDate)}`}
                                />
                                {errors.birthDate && <p className={ERROR}>! {errors.birthDate}</p>}
                            </div>
                        )}
                        {f.deathDate.visible && (
                            <div>
                                <label className={LABEL}>Fallecimiento{fieldSuffix(f.deathDate)}</label>
                                <input
                                    type="date"
                                    value={data.deathDate || ''}
                                    onChange={(e) => updateData({ deathDate: e.target.value })}
                                    className={`input-emotional ${errClass(errors.deathDate)}`}
                                />
                                {errors.deathDate && <p className={ERROR}>! {errors.deathDate}</p>}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
