import React, { useMemo, useState } from 'react';

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
    weightKg?: string;
}

interface Props {
    data: PetData;
    updateData: (data: Partial<PetData>) => void;
    errors: Record<string, string>;
}

const WEIGHT_RANGES: { value: NonNullable<PetData['weightRange']>; label: string; range: string }[] = [
    { value: 'small', label: 'Pequeño', range: '0 – 10 kg' },
    { value: 'medium', label: 'Mediano', range: '10 – 25 kg' },
    { value: 'large', label: 'Grande', range: '25 – 45 kg' },
    { value: 'giant', label: 'Gigante', range: '45+ kg' },
];

export default function PetInfoStep({ data, updateData, errors }: Props) {
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);

    // Modo del peso: rangos vs número exacto. Inicializa según el dato existente
    // (si vuelves al paso y ya tenías weightKg, abre en modo exacto).
    const [useExactWeight, setUseExactWeight] = useState<boolean>(!!data.weightKg);

    const dateError = useMemo(() => {
        if (data.birthDate && data.deathDate && data.birthDate > data.deathDate) {
            return 'La fecha de fallecimiento no puede ser anterior a la de nacimiento';
        }
        if (data.deathDate && data.deathDate > today) {
            return 'La fecha de fallecimiento no puede ser futura';
        }
        return null;
    }, [data.birthDate, data.deathDate, today]);

    const toggleExactWeight = () => {
        if (useExactWeight) {
            // Volviendo a rangos: limpiamos el peso numérico
            setUseExactWeight(false);
            updateData({ weightKg: '' });
        } else {
            // Pasando a exacto: limpiamos el rango previo
            setUseExactWeight(true);
            updateData({ weightRange: '' });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-black uppercase italic tracking-tight text-slate-800 dark:text-slate-100 mb-2">Datos de la Mascota</h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] font-bold">Información sobre tu querido compañero</p>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1 mb-2">Nombre *</label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => updateData({ name: e.target.value.slice(0, 50) })}
                            className={`input-emotional ${errors.name ? 'border-red-500/50 focus:ring-red-500/10' : ''}`}
                            placeholder="Ej: Max"
                            maxLength={50}
                        />
                        {errors.name && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-tight ml-2">! {errors.name}</p>}
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1 mb-2">Cómo le decían (Opcional)</label>
                        <input
                            type="text"
                            value={data.nickname || ''}
                            onChange={(e) => updateData({ nickname: e.target.value.slice(0, 30) })}
                            className="input-emotional"
                            placeholder="Apodo de cariño"
                            maxLength={30}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1 mb-2">Tipo de Mascota *</label>
                        <select
                            value={data.type}
                            onChange={(e) => updateData({ type: e.target.value })}
                            className={`input-emotional text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950 ${errors.type ? 'border-red-500/50 focus:ring-red-500/10' : ''}`}
                        >
                            <option value="" className="text-slate-400 dark:text-slate-600">Selecciona...</option>
                            <option value="Canino" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950">Canino</option>
                            <option value="Felino" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950">Felino</option>
                            <option value="Ave" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950">Ave</option>
                            <option value="Mamífero Pequeño" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950">Mamífero Pequeño</option>
                            <option value="Reptil / Anfibio" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950">Reptil / Anfibio</option>
                            <option value="Exótico" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950">Exótico</option>
                            <option value="Otro" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950">Otro</option>
                        </select>
                        {errors.type && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-tight ml-2">! {errors.type}</p>}
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1 mb-2">Raza (Opcional)</label>
                        <input
                            type="text"
                            value={data.breed}
                            onChange={(e) => updateData({ breed: e.target.value.slice(0, 20) })}
                            className={`input-emotional ${errors.breed ? 'border-red-500/50 focus:ring-red-500/10' : ''}`}
                            placeholder="Ej: Golden Retriever"
                            maxLength={20}
                        />
                        {errors.breed && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-tight ml-2">! {errors.breed}</p>}
                    </div>
                </div>

                {/* Peso: rangos + opción exacto */}
                <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Tamaño / Peso *</label>
                        <button
                            type="button"
                            onClick={toggleExactWeight}
                            className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline tracking-wider"
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
                                onChange={(e) => updateData({ weightKg: e.target.value, weightRange: '' })}
                                className={`input-emotional pr-12 ${errors.weightRange || errors.weightKg ? 'border-red-500/50 focus:ring-red-500/10' : ''}`}
                                placeholder="Ej: 4.2"
                                autoFocus
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm font-bold">kg</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {WEIGHT_RANGES.map(opt => {
                                const isSelected = data.weightRange === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => updateData({ weightRange: opt.value, weightKg: '' })}
                                        className={`p-3 rounded-2xl border-2 transition-all text-center ${
                                            isSelected
                                                ? 'border-sky-500 bg-sky-50 shadow-md shadow-sky-500/10 dark:bg-sky-950/20 dark:border-sky-500/30'
                                                : 'border-slate-200 hover:border-slate-300 bg-white dark:bg-slate-950 dark:border-slate-800 dark:hover:border-slate-700'
                                        }`}
                                    >
                                        <div className={`text-xs font-black uppercase tracking-wider ${isSelected ? 'text-sky-700 dark:text-sky-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {opt.label}
                                        </div>
                                        <div className={`text-[10px] font-bold mt-0.5 ${isSelected ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                            {opt.range}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {(errors.weightRange || errors.weightKg) && (
                        <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-tight ml-2">
                            ! {errors.weightRange || errors.weightKg}
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1 mb-2">Edad (años) *</label>
                    <input
                        type="text"
                        value={data.age}
                        onChange={(e) => updateData({ age: e.target.value.replace(/\D/g, '') })}
                        className={`input-emotional max-w-[150px] ${errors.age ? 'border-red-500/50 focus:ring-red-500/10' : ''}`}
                        placeholder="Ej: 5"
                        maxLength={3}
                    />
                    {errors.age && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-tight ml-2">! {errors.age}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1 mb-2">Nacimiento (Opcional)</label>
                        <input
                            type="date"
                            max={today}
                            value={data.birthDate || ''}
                            onChange={(e) => updateData({ birthDate: e.target.value })}
                            className="input-emotional text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1 mb-2">Fallecimiento (Opcional)</label>
                        <input
                            type="date"
                            max={today}
                            min={data.birthDate || undefined}
                            value={data.deathDate || ''}
                            onChange={(e) => updateData({ deathDate: e.target.value })}
                            className="input-emotional text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950"
                        />
                    </div>
                </div>
                {dateError && (
                    <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-tight ml-2">! {dateError}</p>
                )}
            </div>
        </div>
    );
}
