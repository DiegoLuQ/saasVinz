"use client";

import React, { useState, useEffect } from 'react';
import Modal from '@/components/tenant/Modal';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { apiRequest } from '@/lib/tenant/api';
import { Loader2, Scale } from 'lucide-react';

interface EditWeightModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentWeight: number;
    orderId: number | null;
    petName: string;
    onSave: (newWeight: number) => void;
}

export default function EditWeightModal({
    isOpen,
    onClose,
    currentWeight,
    orderId,
    petName,
    onSave
}: EditWeightModalProps) {
    const { showToast } = useToast();
    const [weight, setWeight] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setWeight(currentWeight ? currentWeight.toString() : '');
        }
    }, [isOpen, currentWeight]);

    const handleSave = async () => {
        if (!orderId) return;

        const weightValue = parseFloat(weight);
        if (isNaN(weightValue) || weightValue < 0) {
            showToast('Por favor ingrese un peso válido', 'error');
            return;
        }

        setLoading(true);
        try {
            await apiRequest(`/api/internal/operations/ops/orders/${orderId}/weight?weight=${weightValue}`, {
                method: 'PATCH'
            });
            showToast('Peso actualizado correctamente', 'success');
            onSave(weightValue);
            onClose();
        } catch (err: any) {
            showToast(err.message || 'Error al actualizar peso', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Editar Peso" zIndex="z-[300]">
            <div className="space-y-8">
                {/* Hide Spinners Style */}
                <style jsx>{`
                    input[type=number]::-webkit-inner-spin-button, 
                    input[type=number]::-webkit-outer-spin-button { 
                        -webkit-appearance: none; 
                        margin: 0; 
                    }
                    input[type=number] {
                        -moz-appearance: textfield;
                    }
                `}</style>

                <div className="flex flex-col items-center justify-center pt-2">
                    <div className="bg-primary/10 text-primary p-3 rounded-2xl mb-3 ring-1 ring-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]">
                        <Scale size={32} />
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Editando Peso para</p>
                    <h3 className="text-2xl font-black text-white mt-1">{petName}</h3>
                </div>

                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-3xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />

                    <div className="relative bg-black/40 border border-white/10 rounded-3xl p-8 flex items-center justify-center gap-2 shadow-inner transition-all group-focus-within:border-primary/50 group-focus-within:ring-1 group-focus-within:ring-primary/50">
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            className="bg-transparent outline-none font-mono text-7xl font-bold text-white text-center w-full placeholder:text-white/10"
                            placeholder="0.0"
                            autoFocus
                        />
                        <span className="text-xl font-black text-muted-foreground self-end mb-4">KG</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center mt-3 font-medium">
                        Ingrese el nuevo peso registrado en la báscula
                    </p>
                </div>

                <div className="flex gap-2 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="animate-spin" size={16} />}
                        Guardar Cambio
                    </button>
                </div>
            </div>
        </Modal>
    );
}
