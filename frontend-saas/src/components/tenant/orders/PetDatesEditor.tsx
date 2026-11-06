"use client";

import React, { useEffect, useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import type { Pet } from '@/lib/tenant/orders/types';
import PetDateInput from '@/components/tenant/crm/PetDateInput';
import { toApiDate, toDateInput } from '@/lib/petDates';

type Field = 'birth' | 'death';

/** Nacimiento y fallecimiento editables desde la orden (exacta o «solo año»); se guardan en la mascota al cambiar. */
export default function PetDatesEditor({ pet, onSaved }: { pet: Pet; onSaved: (pet: Pet) => void }) {
    const { showToast } = useToast();
    const [birth, setBirth] = useState(toDateInput(pet.birth_date));
    const [death, setDeath] = useState(toDateInput(pet.death_date));
    const [birthYear, setBirthYear] = useState(!!pet.birth_date_year_only);
    const [deathYear, setDeathYear] = useState(!!pet.death_date_year_only);
    const [saving, setSaving] = useState<Field | null>(null);
    const [saved, setSaved] = useState<Field | null>(null);
    const today = new Date().toISOString().split('T')[0];

    const reset = () => {
        setBirth(toDateInput(pet.birth_date));
        setDeath(toDateInput(pet.death_date));
        setBirthYear(!!pet.birth_date_year_only);
        setDeathYear(!!pet.death_date_year_only);
    };
    useEffect(reset, [pet.id, pet.birth_date, pet.death_date, pet.birth_date_year_only, pet.death_date_year_only]);

    const save = async (field: Field, value: string, yearOnly: boolean) => {
        const nextBirth = field === 'birth' ? value : birth;
        const nextDeath = field === 'death' ? value : death;
        if (value && value > today) {
            showToast('La fecha no puede ser futura', 'error');
            return reset();
        }
        if (nextBirth && nextDeath && nextDeath < nextBirth) {
            showToast('El fallecimiento no puede ser anterior al nacimiento', 'error');
            return reset();
        }
        const key = field === 'birth' ? 'birth_date' : 'death_date';
        const flag = !!value && yearOnly;
        if (value === toDateInput(pet[key]) && flag === !!pet[`${key}_year_only`]) return;

        setSaving(field);
        try {
            const body = { [key]: toApiDate(value), [`${key}_year_only`]: flag };
            const updated = await apiRequest(`/api/internal/pets/${pet.id}`, { method: 'PATCH', body: JSON.stringify(body) });
            onSaved({ ...pet, ...updated });
            setSaved(field);
            setTimeout(() => setSaved(null), 1500);
        } catch (err: unknown) {
            showToast('No se pudo guardar la fecha: ' + (err instanceof Error ? err.message : ''), 'error');
            reset();
        } finally {
            setSaving(null);
        }
    };

    const input = 'w-full mt-0.5 rounded-lg px-2 py-1.5 text-[11px] font-mono outline-none bg-white border border-slate-300 text-slate-900 focus:border-primary/60 focus:ring-2 focus:ring-primary/15 dark:bg-black/20 dark:border-white/10 dark:text-white [color-scheme:light] dark:[color-scheme:dark]';
    const status = (f: Field) =>
        saving === f ? <Loader2 size={10} className="animate-spin" /> : saved === f ? <Check size={10} className="text-emerald-600 dark:text-emerald-400" /> : null;

    return (
        <>
            <div>
                <dt className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">Nacimiento {status('birth')}</dt>
                <dd>
                    <PetDateInput value={birth} yearOnly={birthYear} max={death || today} className={input} ariaLabel="Fecha de nacimiento"
                        onChange={(v, y) => { setBirth(v); setBirthYear(y); }}
                        onCommit={(v, y) => save('birth', v, y)} />
                </dd>
            </div>
            <div>
                <dt className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">Fallecimiento {status('death')}</dt>
                <dd>
                    <PetDateInput value={death} yearOnly={deathYear} min={birth || undefined} max={today} className={input} ariaLabel="Fecha de fallecimiento"
                        onChange={(v, y) => { setDeath(v); setDeathYear(y); }}
                        onCommit={(v, y) => save('death', v, y)} />
                </dd>
            </div>
        </>
    );
}
