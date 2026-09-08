"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Dog } from 'lucide-react';
import Modal from '@/components/tenant/Modal';
import { useSavePet, Pet } from '@/hooks/usePets';
import { useCustomers } from '@/hooks/useCustomers';
import SearchableSelect from '@/components/tenant/SearchableSelect';

interface QuickPetModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultCustomerId?: number;
    onPetCreated?: (pet: Pet) => void;
}

export default function QuickPetModal({
    isOpen,
    onClose,
    defaultCustomerId,
    onPetCreated,
}: QuickPetModalProps) {
    const savePetMutation = useSavePet();
    const { data: customers = [] } = useCustomers();
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState<Partial<Pet>>({
        name: '',
        species: 'Perro',
        breed: '',
        size: 'mediano',
        birth_date: '',
        age: 0,
        status: 'received',
        customer_id: defaultCustomerId || 0,
    });

    useEffect(() => {
        if (defaultCustomerId) {
            setFormData(prev => ({ ...prev, customer_id: defaultCustomerId }));
        }
    }, [defaultCustomerId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name?.trim() || !formData.customer_id) return;

        setIsSaving(true);
        try {
            const res = await savePetMutation.mutateAsync({
                pet: formData,
                isEdit: false,
            });
            setIsSaving(false);
            if (onPetCreated && res) {
                onPetCreated(res);
            }
            // Reset form
            setFormData({
                name: '',
                species: 'Perro',
                breed: '',
                size: 'mediano',
                birth_date: '',
                age: 0,
                status: 'received',
                customer_id: defaultCustomerId || 0,
            });
            onClose();
        } catch (error) {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Nueva Mascota Rápida"
            maxWidth="max-w-xl"
            zIndex="z-[350]"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-2xl border border-primary/20 mb-2">
                    <Dog className="w-5 h-5 text-primary shrink-0" />
                    <p className="text-xs text-muted-foreground">
                        Inscribe una nueva mascota asociada al cliente correspondiente.
                    </p>
                </div>

                {!defaultCustomerId && (
                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Tutor / Cliente <span className="text-primary">*</span>
                        </label>
                        <SearchableSelect
                            options={customers.map(c => ({
                                value: String(c.id),
                                label: `${c.name} (${c.rut || 'Sin RUT'})`,
                            }))}
                            value={formData.customer_id ? String(formData.customer_id) : ''}
                            onChange={val => setFormData({ ...formData, customer_id: Number(val) })}
                            placeholder="Buscar cliente por nombre o RUT..."
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Nombre de la Mascota <span className="text-primary">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Ej: Firulais"
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Especie
                        </label>
                        <select
                            value={formData.species || 'Perro'}
                            onChange={e => setFormData({ ...formData, species: e.target.value })}
                            className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl focus:border-primary outline-none text-sm"
                        >
                            <option value="Perro">Perro 🐶</option>
                            <option value="Gato">Gato 🐱</option>
                            <option value="Conejo">Conejo 🐰</option>
                            <option value="Ave">Ave 🦜</option>
                            <option value="Otro">Otro 🐾</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Raza
                        </label>
                        <input
                            type="text"
                            placeholder="Ej: Mestizo, Poodle, Siames"
                            value={formData.breed || ''}
                            onChange={e => setFormData({ ...formData, breed: e.target.value })}
                            className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Tamaño / Peso Aprox.
                        </label>
                        <select
                            value={formData.size || 'mediano'}
                            onChange={e => setFormData({ ...formData, size: e.target.value })}
                            className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl focus:border-primary outline-none text-sm"
                        >
                            <option value="pequeño">Pequeño (&lt; 10kg)</option>
                            <option value="mediano">Mediano (10 - 25kg)</option>
                            <option value="grande">Grande (25 - 40kg)</option>
                            <option value="muy grande">Muy Grande (&gt; 40kg)</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Edad Estimada (Años)
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="30"
                            placeholder="Ej: 5"
                            value={formData.age || 0}
                            onChange={e => setFormData({ ...formData, age: Number(e.target.value) })}
                            className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Fecha de Nacimiento
                        </label>
                        <input
                            type="date"
                            value={formData.birth_date ? formData.birth_date.slice(0, 10) : ''}
                            onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                            className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition text-sm"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-sm font-medium transition"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving || !formData.name?.trim() || !formData.customer_id}
                        className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm transition flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4" />
                                Registrar Mascota
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
