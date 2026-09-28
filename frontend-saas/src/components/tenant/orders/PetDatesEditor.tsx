"use client";

import React, { useEffect, useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import type { Pet } from '@/lib/tenant/orders/types';

const toInput = (v?: string | null) => (v ? v.split('T')[0] : '');
// Mediodía: evita que la zona horaria corra la fecha un día
const toApi = (v: string) => (v ? `${v}T12:00:00` : null);

/** Nacimiento y fallecimiento editables desde la orden; se guardan en la mascota al cambiar. */
export default function PetDatesEditor({ pet, onSaved }: { pet: Pet; onSaved: (pet: Pet) => void }) {
    const { showToast } = useToast();
    const [birth, setBirth] = useState(toInput(pet.birth_date));
    const [death, setDeath] = useState(toInput(pet.death_date));
    const [saving, setSaving] = useState<'birth' | 'death' | null>(null);
    const [saved, setSaved] = useState<'birth' | 'death' | null>(null);
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        setBirth(toInput(pet.birth_date));
        setDeath(toInput(pet.death_date));
    }, [pet.id, pet.birth_date, pet.death_date]);

    const save = async (field: 'birth' | 'death', value: string) => {
        const nextBirth = field === 'birth' ? value : birth;
        const nextDeath = field === 'death' ? value : death;
        if (value && value > today) {
            showToast('La fecha no puede ser futura', 'error');
            return field === 'birth' ? setBirth(toInput(pet.birth_date)) : setDeath(toInput(pet.death_date));
        }
        if (nextBirth && nextDeath && nextDeath < nextBirth) {
            showToast('El fallecimiento no puede ser anterior al nacimiento', 'error');
            return field === 'birth' ? setBirth(toInput(pet.birth_date)) : setDeath(toInput(pet.death_date));
        }
        if (value === toInput(field === 'birth' ? pet.birth_date : pet.death_date)) return;

        setSaving(field);
        try {
            const body = field === 'birth' ? { birth_date: toApi(value) } : { death_date: toApi(value) };
            const updated = await apiRequest(`/api/internal/pets/${pet.id}`, { method: 'PATCH', body: JSON.stringify(body) });
            onSaved({ ...pet, ...updated });
            setSaved(field);
            setTimeout(() => setSaved(null), 1500);
        } catch (err: unknown) {
            showToast('No se pudo guardar la fecha: ' + (err instanceof Error ? err.message : ''), 'error');
            if (field === 'birth') setBirth(toInput(pet.birth_date)); else setDeath(toInput(pet.death_date));
        } finally {
            setSaving(null);
        }
    };

    const input = 'w-full mt-0.5 rounded-lg px-2 py-1.5 text-[11px] font-mono outline-none bg-white border border-slate-300 text-slate-900 focus:border-primary/60 focus:ring-2 focus:ring-primary/15 dark:bg-black/20 dark:border-white/10 dark:text-white [color-scheme:light] dark:[color-scheme:dark]';
    const status = (f: 'birth' | 'death') =>
        saving === f ? <Loader2 size={10} className="animate-spin" /> : saved === f ? <Check size={10} className="text-emerald-600 dark:text-emerald-400" /> : null;

    return (
        <>
            <div>
                <dt className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">Nacimiento {status('birth')}</dt>
                <dd>
                    <input type="date" value={birth} max={death || today} onChange={(e) => setBirth(e.target.value)} onBlur={(e) => save('birth', e.target.value)} className={input} aria-label="Fecha de nacimiento" />
                </dd>
            </div>
            <div>
                <dt className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">Fallecimiento {status('death')}</dt>
                <dd>
                    <input type="date" value={death} min={birth || undefined} max={today} onChange={(e) => setDeath(e.target.value)} onBlur={(e) => save('death', e.target.value)} className={input} aria-label="Fecha de fallecimiento" />
                </dd>
            </div>
        </>
    );
}
