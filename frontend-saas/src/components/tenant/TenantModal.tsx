"use client";

import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle, Building2 } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';

interface TenantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function TenantModal({ isOpen, onClose, onSuccess }: TenantModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        rut: '',
        email: '',
        phone: '',
        plan: 'FREE',
        subscription_plan_id: '',
        monthly_price: 0,
        pending_reason: '',
        status: 'active'
    });
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setFormData({
                name: '',
                slug: '',
                rut: '',
                email: '',
                phone: '',
                plan: 'FREE',
                subscription_plan_id: '',
                monthly_price: 0,
                pending_reason: '',
                status: 'active'
            });
            setError('');
            setSuccess(false);
        }
    }, [isOpen]);

    React.useEffect(() => {
        const fetchPlans = async () => {
            try {
                const data = await apiRequest('/api/internal/creator/plans');
                setPlans(data);
                if (data.length > 0) {
                    const freePlan = data.find((p: any) => p.name === 'FREE');
                    if (freePlan) {
                        setFormData(prev => ({ ...prev, subscription_plan_id: freePlan.id }));
                    }
                }
            } catch (err) {
                console.error('Error fetching plans:', err);
            }
        };
        if (isOpen) {
            fetchPlans();
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            const payload = {
                ...formData,
                subscription_plan_id: (formData.subscription_plan_id && formData.subscription_plan_id !== '')
                    ? parseInt(formData.subscription_plan_id.toString())
                    : null
            };

            await apiRequest('/api/internal/creator/tenants', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            setSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1000);
        } catch (err: any) {
            setError(err.message || 'Error al crear el tenant');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
            <div className="glass-card bg-background border border-foreground/10 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-foreground/10 bg-foreground/5">
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <span className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">🏢</span>
                        Nueva Empresa
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-foreground/10 rounded-lg transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="text-xs uppercase font-bold text-muted-foreground mb-2 block">
                            Nombre de la Empresa
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-input border border-input rounded-xl p-3 text-foreground outline-none focus:border-primary transition-colors"
                            placeholder="Crematorio de Mascotas S.A."
                            required
                        />
                    </div>

                    <div>
                        <label className="text-xs uppercase font-bold text-muted-foreground mb-2 block">
                            Slug (URL personalizada)
                        </label>
                        <input
                            type="text"
                            value={formData.slug}
                            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                            className="w-full bg-input border border-input rounded-xl p-3 text-foreground outline-none focus:border-primary transition-colors font-mono text-sm"
                            placeholder="mi-crematorio"
                            required
                        />
                        <p className="text-[10px] text-muted-foreground/70 mt-1 italic">
                            https://tu-dominio.cl/{formData.slug || 'slug'}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs uppercase font-bold text-muted-foreground mb-2 block">
                                RUT Empresa
                            </label>
                            <input
                                type="text"
                                value={formData.rut}
                                onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                                className="w-full bg-input border border-input rounded-xl p-3 text-foreground outline-none focus:border-primary transition-colors"
                                placeholder="12.345.678-9"
                            />
                        </div>
                        <div>
                            <label className="text-xs uppercase font-bold text-muted-foreground mb-2 block">
                                Plan de Suscripción
                            </label>
                            <select
                                value={formData.subscription_plan_id}
                                onChange={(e) => setFormData({ ...formData, subscription_plan_id: e.target.value })}
                                className="w-full bg-input border border-input rounded-xl p-3 text-foreground outline-none focus:border-primary transition-colors font-bold text-primary"
                                required
                            >
                                <option value="">Seleccionar plan...</option>
                                {plans.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} - ${p.price.toLocaleString()}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs uppercase font-bold text-muted-foreground mb-2 block">
                            Estado Inicial
                        </label>
                        <select
                            value={formData.status || 'active'}
                            onChange={(e) => {
                                const newStatus = e.target.value;
                                const defaultReasons: Record<string, string> = {
                                    pending: 'Falta de información, pago inicial pendiente o proceso de validación en curso.',
                                    suspended: 'Falta de pago de cuotas mensuales o sospecha de actividad inusual/fraude.',
                                    inactive: 'Cuenta inactivada por falta de pago prolongada o solicitud del cliente.'
                                };

                                setFormData(prev => ({
                                    ...prev,
                                    status: newStatus,
                                    pending_reason: (newStatus !== 'active' && !prev.pending_reason)
                                        ? defaultReasons[newStatus] || ''
                                        : prev.pending_reason
                                }));
                            }}
                            className="w-full bg-input border border-input rounded-xl p-3 text-foreground outline-none focus:border-primary transition-colors font-bold"
                        >
                            <option value="active">Activo ✅</option>
                            <option value="pending">Pendiente ⏳</option>
                            <option value="inactive">Inactivo ❌</option>
                            <option value="suspended">Suspendido ⚠️</option>
                        </select>
                    </div>

                    {formData.status !== 'active' && (
                        <div className="animate-fade-in">
                            <label className="text-xs uppercase font-bold text-muted-foreground mb-2 block tracking-wider">
                                Motivo de Estado ({formData.status.toUpperCase()})
                            </label>
                            <textarea
                                value={formData.pending_reason || ''}
                                onChange={(e) => setFormData({ ...formData, pending_reason: e.target.value })}
                                className="w-full bg-input border border-input rounded-xl p-3 text-foreground outline-none focus:border-primary transition-colors min-h-[80px]"
                                placeholder={`Escribe el motivo por el cual la cuenta está ${formData.status}...`}
                            />
                        </div>
                    )}

                    <div>
                        <label className="text-xs uppercase font-bold text-muted-foreground mb-2 block tracking-wider">
                            Precio Mensual Personalizado
                        </label>
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black">$</span>
                            <input
                                type="number"
                                value={formData.monthly_price}
                                onChange={(e) => setFormData({ ...formData, monthly_price: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-input border border-input rounded-xl p-3 pl-8 text-foreground outline-none focus:border-primary transition-all font-bold"
                                placeholder="0.00"
                                step="0.01"
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground/60 mt-1.5 italic">
                            Si se deja en 0, el sistema usará el precio base del plan seleccionado.
                        </p>
                    </div>

                    {/* Feedback Messages */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-500 text-sm">
                            <AlertCircle size={20} />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3 text-green-500 text-sm">
                            <CheckCircle size={20} />
                            ¡Empresa registrada exitosamente!
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 rounded-xl font-bold text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all text-sm uppercase tracking-wider"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] px-6 py-4 rounded-xl font-bold bg-gradient-to-r from-primary to-blue-600 text-white hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                        >
                            {loading ? 'Creando...' : 'Crear Empresa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

