import React, { useState, useEffect } from 'react';
import { Plus, Activity } from 'lucide-react';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { apiRequest } from '@/lib/tenant/api';
import { FormInput } from './FormField';

export function WorkflowTab() {
    const { showToast } = useToast();
    const [workflowSteps, setWorkflowSteps] = useState<any[]>([]);
    const [newStep, setNewStep] = useState({ name: '', order_index: 0 });

    const fetchWorkflowSteps = async () => {
        try {
            const data = await apiRequest('/api/internal/operations/steps');
            setWorkflowSteps(data);
            const maxOrder = data.length > 0 ? Math.max(...data.map((s: any) => s.order_index)) : -1;
            setNewStep(prev => ({ ...prev, order_index: maxOrder + 1 }));
        } catch (err: any) {
            showToast('Error al cargar pasos del flujo', 'error');
        }
    };

    const handleAddStep = async () => {
        if (!newStep.name) {
            showToast('El nombre del paso es requerido', 'error');
            return;
        }
        try {
            await apiRequest('/api/internal/operations/steps', {
                method: 'POST',
                body: JSON.stringify(newStep)
            });
            showToast('Paso creado exitosamente', 'success');
            setNewStep({ name: '', order_index: 0 });
            fetchWorkflowSteps();
        } catch (err: any) {
            showToast(err.message || 'Error al crear paso', 'error');
        }
    };

    const handleUpdateStep = async (id: number, updates: any) => {
        try {
            await apiRequest(`/api/internal/operations/steps/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            showToast('Paso actualizado', 'success');
            fetchWorkflowSteps();
        } catch (err: any) {
            showToast('Error al actualizar paso', 'error');
        }
    };

    useEffect(() => {
        fetchWorkflowSteps();
    }, []);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="border-b border-white/5 pb-6">
                <h3 className="text-xl font-bold">Flujo Operativo</h3>
                <p className="text-sm text-muted-foreground mt-1">Define los pasos secuenciales del proceso de cremación.</p>
            </div>

            {/* Add Step Form */}
            <div className="glass-card p-6 rounded-3xl border border-primary/20">
                <h4 className="font-bold mb-4">Agregar Nuevo Paso</h4>
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <FormInput
                            variant="compact"
                            label="Nombre del Paso"
                            value={newStep.name}
                            onChange={(name) => setNewStep({ ...newStep, name })}
                            placeholder="Ej: Recolección, Horno, Entrega..."
                        />
                    </div>
                    <div className="w-32">
                        <FormInput
                            variant="compact"
                            label="Orden"
                            type="number"
                            value={newStep.order_index}
                            onChange={(v) => setNewStep({ ...newStep, order_index: parseInt(v) || 0 })}
                        />
                    </div>
                    <button
                        onClick={handleAddStep}
                        className="bg-primary text-primary-foreground font-bold py-3 px-6 rounded-xl flex items-center justify-center hover:opacity-90 transition-all h-[52px]"
                    >
                        <Plus size={18} className="mr-2" />
                        Agregar
                    </button>
                </div>
            </div>

            {/* Steps List */}
            <div className="space-y-3">
                <h4 className="font-bold">Pasos Configurados</h4>
                {workflowSteps.length === 0 ? (
                    <div className="glass-card p-8 rounded-3xl text-center">
                        <Activity className="mx-auto text-muted-foreground/20 mb-4" size={48} />
                        <p className="text-muted-foreground">No hay pasos configurados.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {workflowSteps.map((step) => (
                            <div key={step.id} className={`glass-card p-4 rounded-2xl flex items-center justify-between transition-all ${!step.is_active ? 'opacity-50' : ''}`}>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-lg text-white/50">
                                        {step.order_index}
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg">{step.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {step.is_active ? 'Activo' : 'Inactivo'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleUpdateStep(step.id, { is_active: !step.is_active })}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${step.is_active
                                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}
                                    >
                                        {step.is_active ? 'Desactivar' : 'Activar'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
