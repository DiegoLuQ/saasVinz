import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Wrench } from 'lucide-react';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { apiRequest } from '@/lib/tenant/api';
import { FormInput } from './FormField';

export function MaintenanceTab() {
    const { showToast } = useToast();
    const [weightRules, setWeightRules] = useState<any[]>([]);
    const [newRule, setNewRule] = useState({ min_weight: '', max_weight: '', price: '' });

    const fetchWeightRules = async () => {
        try {
            const data = await apiRequest('/api/internal/maintenance/weight-pricing');
            setWeightRules(data);
        } catch (err: any) {
            showToast(err.message || 'Error al cargar reglas de peso', 'error');
        }
    };

    const handleAddWeightRule = async () => {
        if (!newRule.min_weight || !newRule.max_weight || !newRule.price) {
            showToast('Completa todos los campos', 'error');
            return;
        }
        try {
            await apiRequest('/api/internal/maintenance/weight-pricing', {
                method: 'POST',
                body: JSON.stringify({
                    min_weight: parseFloat(newRule.min_weight),
                    max_weight: parseFloat(newRule.max_weight),
                    price: parseFloat(newRule.price)
                })
            });
            showToast('Regla agregada exitosamente', 'success');
            setNewRule({ min_weight: '', max_weight: '', price: '' });
            fetchWeightRules();
        } catch (err: any) {
            showToast(err.message || 'Error al agregar regla', 'error');
        }
    };

    const handleDeleteWeightRule = async (id: number) => {
        try {
            await apiRequest(`/api/internal/maintenance/weight-pricing/${id}`, {
                method: 'DELETE'
            });
            showToast('Regla eliminada', 'success');
            fetchWeightRules();
        } catch (err: any) {
            showToast(err.message || 'Error al eliminar regla', 'error');
        }
    };

    useEffect(() => {
        fetchWeightRules();
    }, []);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="border-b border-white/5 pb-6">
                <h3 className="text-xl font-bold">Precio por Peso de Mascota</h3>
                <p className="text-sm text-muted-foreground mt-1">Define rangos de peso y sus precios asociados.</p>
            </div>

            {/* Add New Rule Form */}
            <div className="glass-card p-6 rounded-3xl border border-primary/20">
                <h4 className="font-bold mb-4">Agregar Nueva Regla</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormInput
                        variant="compact"
                        label="Peso Mínimo (kg)"
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        value={newRule.min_weight}
                        onChange={(min_weight) => setNewRule({ ...newRule, min_weight })}
                    />
                    <FormInput
                        variant="compact"
                        label="Peso Máximo (kg)"
                        type="number"
                        step="0.1"
                        placeholder="10.0"
                        value={newRule.max_weight}
                        onChange={(max_weight) => setNewRule({ ...newRule, max_weight })}
                    />
                    <FormInput
                        variant="compact"
                        label="Precio ($)"
                        type="number"
                        step="1000"
                        placeholder="50000"
                        value={newRule.price}
                        onChange={(price) => setNewRule({ ...newRule, price })}
                    />
                    <div className="flex items-end">
                        <button
                            onClick={handleAddWeightRule}
                            className="w-full bg-primary text-primary-foreground font-bold py-3 px-6 rounded-xl flex items-center justify-center hover:opacity-90 transition-all"
                        >
                            <Plus size={18} className="mr-2" />
                            Agregar
                        </button>
                    </div>
                </div>
            </div>

            {/* Weight Rules List */}
            <div className="space-y-3">
                <h4 className="font-bold">Reglas Configuradas</h4>
                {weightRules.length === 0 ? (
                    <div className="glass-card p-8 rounded-3xl text-center">
                        <Wrench className="mx-auto text-muted-foreground/20 mb-4" size={48} />
                        <p className="text-muted-foreground">No hay reglas configuradas aún.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {weightRules.map((rule) => (
                            <div key={rule.id} className="glass-card p-4 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-all">
                                <div className="flex items-center gap-6">
                                    <div className="text-sm">
                                        <span className="font-bold">{rule.min_weight} kg</span>
                                        <span className="text-muted-foreground mx-2">→</span>
                                        <span className="font-bold">{rule.max_weight} kg</span>
                                    </div>
                                    <div className="h-8 w-px bg-white/10" />
                                    <div className="text-sm font-bold text-primary">
                                        {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(rule.price)}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteWeightRule(rule.id)}
                                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
