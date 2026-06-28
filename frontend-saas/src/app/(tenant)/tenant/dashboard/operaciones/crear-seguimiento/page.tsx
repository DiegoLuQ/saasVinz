"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Compass, Users, Dog, Search, Plus, Loader2, CheckCircle2,
    ArrowRight, Sparkles, StickyNote, MapPin, RefreshCw, Link as LinkIcon, Copy, Check,
    Scale, Info, Package
} from 'lucide-react';
import { apiRequest, getImageUrl } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import SearchableSelect from '@/components/tenant/SearchableSelect';
import Modal from '@/components/tenant/Modal';
import { useCurrentTenant } from '@/hooks/useSessionBootstrap';
import { copyToClipboard } from '@/lib/clipboard';
import { regions } from '@/lib/tenant/chile-data';
import { useOrderForm } from '@/hooks/tenant/useOrderForm';

// Item unificado seleccionable (servicio o plan) en "Servicio de Seguimiento"
type CatalogItem = {
    kind: 'service' | 'plan';
    id: number;
    name: string;
    price: number;
    cost: number;
    description?: string;
    includedServices?: { name: string; description?: string }[];
};

export default function CrearSeguimientoPage() {
    const { showToast } = useToast();
    const currentTenant = useCurrentTenant();

    // Local UI state
    const [showSuccess, setShowSuccess] = useState(false);
    const [createdCode, setCreatedCode] = useState('');
    const [copied, setCopied] = useState(false);
    const [showDetail, setShowDetail] = useState(false);

    // Quick-add modals
    const [showNewCustomer, setShowNewCustomer] = useState(false);
    const [showNewPet, setShowNewPet] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '' });
    const [newPet, setNewPet] = useState({ name: '', species: 'perro' });
    const [newPetCustomerId, setNewPetCustomerId] = useState<number | null>(null);
    const [savingCustomer, setSavingCustomer] = useState(false);
    const [savingPet, setSavingPet] = useState(false);

    // Success callback fired by the shared order core after a successful save
    const handleSaved = useCallback((result: any) => {
        setCreatedCode(result?.verification_code || '');
        setShowSuccess(true);
        showToast('Seguimiento creado exitosamente', 'success');
    }, [showToast]);

    // ==========================================
    // Shared order core (express preset)
    // ==========================================
    const {
        loading,
        isSaving,
        pets,
        setPets,
        customers,
        setCustomers,
        services,
        plans,
        petOptions,
        selectedPet,
        relatedCustomer,
        currentCremation,
        setCurrentCremation,
        selectedServices,
        setSelectedServices,
        selectedPlans,
        setSelectedPlans,
        grandTotal,
        handlePetChange,
        handleWeightChange,
        syncAddressFromCustomer,
        handleSave,
    } = useOrderForm({
        mode: 'express',
        cremationTypeOverride: 'seguimiento',
        onSaveSuccess: handleSaved,
    });

    // ==========================================
    // Derived: combined service/plan selector
    // ==========================================
    const customerOptions = useMemo(() =>
        customers.map(c => ({ value: c.id, label: c.name })), [customers]);

    const itemOptions = useMemo(() => [
        ...plans.map(p => ({ value: `plan:${p.id}`, label: `Plan · ${p.name} — $${(p.price ?? 0).toLocaleString()}` })),
        ...services.map(s => ({ value: `service:${s.id}`, label: `Servicio · ${s.name} — $${(s.price ?? 0).toLocaleString()}` })),
    ], [plans, services]);

    const selectedItemKey = selectedPlans[0]
        ? `plan:${selectedPlans[0].plan_id}`
        : selectedServices[0]
            ? `service:${selectedServices[0].service_id}`
            : '';

    const selectedItem = useMemo<CatalogItem | null>(() => {
        if (!selectedItemKey) return null;
        const [kind, idStr] = selectedItemKey.split(':');
        const id = Number(idStr);
        if (kind === 'service') {
            const s = services.find(x => x.id === id);
            return s ? { kind: 'service', id, name: s.name, price: s.price, cost: s.cost, description: s.description } : null;
        }
        const p = plans.find(x => x.id === id);
        return p ? {
            kind: 'plan', id, name: p.name, price: p.price, cost: p.cost, description: p.description,
            includedServices: (p.services || []).map(s => ({ name: s.name, description: s.description })),
        } : null;
    }, [selectedItemKey, services, plans]);

    // Single-select: choosing an item replaces any previous service/plan
    const handleSelectItem = useCallback((val: string | number) => {
        const key = String(val);
        const [kind, idStr] = key.split(':');
        const id = Number(idStr);
        if (kind === 'service') {
            const s = services.find(x => x.id === id);
            if (!s) return;
            setSelectedPlans([]);
            setSelectedServices([{
                service_id: id,
                name: s.name,
                unit_price: s.unit_price ?? s.price ?? 0,
                unit_cost: s.unit_cost ?? s.cost ?? 0,
                es_principal: true,
            }]);
        } else {
            const p = plans.find(x => x.id === id);
            if (!p) return;
            setSelectedServices([]);
            setSelectedPlans([{
                plan_id: id,
                name: p.name,
                unit_price: p.unit_price ?? p.price ?? 0,
                unit_cost: p.unit_cost ?? p.cost ?? 0,
                es_principal: true,
            }]);
        }
    }, [services, plans, setSelectedServices, setSelectedPlans]);

    // Step progress
    const step = !selectedPet ? 1 : !selectedItem ? 2 : 3;

    // ==========================================
    // Handlers
    // ==========================================
    const handleNewAnother = () => {
        setCurrentCremation({
            pet_id: 0,
            status: 'received',
            scheduled_at: new Date().toISOString().slice(0, 16),
            notes: '',
            discount: 0,
            weight_price: 0,
        });
        setSelectedServices([]);
        setSelectedPlans([]);
        setShowSuccess(false);
        setCreatedCode('');
    };

    const handleSaveCustomer = async () => {
        if (!newCustomer.name.trim()) { showToast('Nombre requerido', 'error'); return; }
        setSavingCustomer(true);
        try {
            const res = await apiRequest('/api/internal/customers/', {
                method: 'POST',
                body: JSON.stringify(newCustomer),
            });
            setCustomers(prev => [...prev, res]);
            setNewPetCustomerId(res.id);
            setShowNewCustomer(false);
            setNewCustomer({ name: '', email: '', phone: '' });
            showToast('Cliente creado', 'success');
        } catch (err: any) {
            showToast(err.message || 'Error', 'error');
        } finally {
            setSavingCustomer(false);
        }
    };

    const handleSavePet = async () => {
        if (!newPet.name.trim()) { showToast('Nombre requerido', 'error'); return; }
        if (!newPetCustomerId) { showToast('Debe seleccionar o crear un cliente para la mascota', 'error'); return; }
        setSavingPet(true);
        try {
            const res = await apiRequest('/api/internal/pets/', {
                method: 'POST',
                body: JSON.stringify({ ...newPet, customer_id: newPetCustomerId, status: 'received' }),
            });
            setPets(prev => [...prev, res]);
            handlePetChange(res.id);
            setShowNewPet(false);
            setNewPet({ name: '', species: 'perro' });
            setNewPetCustomerId(null);
            showToast('Mascota registrada', 'success');
        } catch (err: any) {
            showToast(err.message || 'Error', 'error');
        } finally {
            setSavingPet(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-primary" size={36} />
            </div>
        );
    }

    // ===================== SUCCESS STATE =====================
    if (showSuccess) {
        const tenantSlug = currentTenant?.slug || '';
        const petName = (selectedPet as any)?.name || 'mascota';

        let trackingUrl = '';
        if (typeof window !== 'undefined') {
            const host = window.location.host; // e.g. "app.lvh.me:3000"
            const rootDomain = host.replace(/^app\./, ''); // e.g. "lvh.me:3000"
            const protocol = window.location.protocol; // "http:" or "https:"
            trackingUrl = `${protocol}//pm.${rootDomain}/${tenantSlug}/track/${encodeURIComponent(petName)}/${createdCode}`;
        }

        const handleCopyLink = async () => {
            const success = await copyToClipboard(trackingUrl);
            if (success) {
                setCopied(true);
                showToast('Enlace de seguimiento copiado', 'success');
                setTimeout(() => setCopied(false), 2000);
            } else {
                showToast('Error al copiar el enlace', 'error');
            }
        };

        return (
            <div className="max-w-2xl mx-auto py-12 px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card rounded-3xl p-8 sm:p-12 text-center border border-white/10"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6"
                    >
                        <CheckCircle2 className="text-emerald-400" size={40} />
                    </motion.div>

                    <h2 className="text-2xl font-bold mb-2">¡Seguimiento Creado!</h2>
                    <p className="text-muted-foreground mb-6">
                        Se ha registrado exitosamente el seguimiento para <span className="text-foreground font-semibold">{petName}</span>
                    </p>

                    {createdCode && (
                        <div className="flex flex-col gap-4 max-w-md mx-auto mb-8">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Código de Verificación</p>
                                <p className="text-3xl font-mono font-bold tracking-[0.3em] text-primary">{createdCode}</p>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-left flex flex-col gap-3">
                                <div>
                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                                        <LinkIcon size={14} className="text-primary" />
                                        Enlace de Seguimiento Público
                                    </h4>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Comparte este enlace con el cliente para que siga el estado en tiempo real.</p>
                                </div>
                                <div className="flex items-center gap-2 bg-black/30 border border-white/5 rounded-xl p-2.5">
                                    <span className="text-xs font-mono truncate text-muted-foreground flex-1 select-all">{trackingUrl}</span>
                                    <button
                                        onClick={handleCopyLink}
                                        className="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors flex items-center justify-center shrink-0"
                                        title="Copiar Enlace"
                                    >
                                        {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={handleNewAnother}
                            className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-medium"
                        >
                            <Plus size={18} className="inline mr-2" />
                            Nuevo Seguimiento
                        </button>
                        <button
                            onClick={() => window.location.assign('/dashboard/asignacion-servicios')}
                            className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground hover:brightness-110 transition-all font-medium shadow-lg shadow-primary/20"
                        >
                            Ver Servicios
                            <ArrowRight size={18} className="inline ml-2" />
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ===================== MAIN FORM =====================
    return (
        <div className="max-w-3xl mx-auto py-6 sm:py-10 px-4">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                        <Compass className="text-primary" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Crear Seguimiento</h1>
                        <p className="text-sm text-muted-foreground">Registra un seguimiento rápido para un cliente y su mascota</p>
                    </div>
                </div>
            </motion.div>

            {/* Progress Bar */}
            <div className="flex items-center gap-2 mb-8">
                {['Mascota', 'Servicio', 'Confirmar'].map((label, i) => (
                    <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
                        <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${i + 1 <= step ? 'bg-primary shadow-sm shadow-primary/30' : 'bg-white/10'}`} />
                        <span className={`text-[10px] font-medium transition-colors ${i + 1 <= step ? 'text-primary' : 'text-muted-foreground/50'}`}>{label}</span>
                    </div>
                ))}
            </div>

            <form onSubmit={handleSave} className="space-y-4">

                {/* 1. Mascota */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="glass-card rounded-3xl p-6 border border-white/10 overflow-hidden"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <Dog size={18} className="text-primary" />
                            <h3 className="font-bold text-sm">Seleccionar Mascota</h3>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowNewPet(true)}
                            className="text-xs px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium flex items-center gap-1"
                        >
                            <Plus size={14} /> Nueva
                        </button>
                    </div>

                    {pets.length > 0 ? (
                        <SearchableSelect
                            options={petOptions}
                            value={currentCremation.pet_id || ''}
                            onChange={handlePetChange}
                            placeholder="Buscar mascota por nombre o cliente..."
                            icon={<Search size={16} />}
                        />
                    ) : (
                        <div className="text-center py-6 text-muted-foreground">
                            <Dog size={32} className="mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No hay mascotas registradas</p>
                            <button
                                type="button"
                                onClick={() => setShowNewPet(true)}
                                className="mt-3 text-xs px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                            >
                                <Plus size={14} className="inline mr-1" /> Registrar Mascota
                            </button>
                        </div>
                    )}

                    {selectedPet && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                            {(selectedPet as any).image_url ? (
                                <img src={getImageUrl((selectedPet as any).image_url)} alt={(selectedPet as any).name} className="w-10 h-10 rounded-xl object-cover" />
                            ) : (
                                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                    <Dog size={18} className="text-primary" />
                                </div>
                            )}
                            <div>
                                <p className="text-sm font-semibold">{(selectedPet as any).name}</p>
                                <p className="text-xs text-muted-foreground">{(selectedPet as any).species || 'Sin especie'}{(selectedPet as any).breed ? ` · ${(selectedPet as any).breed}` : ''}</p>
                            </div>
                        </motion.div>
                    )}

                    {/* Peso de la mascota */}
                    {selectedPet && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                <Scale size={12} className="text-primary" />
                                Peso de la mascota (kg)
                            </label>
                            <input
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.1"
                                value={currentCremation.weight ?? ''}
                                onChange={(e) => handleWeightChange(e.target.value)}
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-5 outline-none focus:border-primary/50 text-sm font-medium text-white transition-all"
                                placeholder="Ej: 12.5"
                            />
                        </motion.div>
                    )}
                </motion.div>

                {/* 2. Servicio o Plan */}
                <AnimatePresence>
                    {selectedPet && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            transition={{ delay: 0.1 }}
                            className="glass-card rounded-3xl p-6 border border-white/10 overflow-hidden"
                        >
                            <div className="flex items-center gap-2.5 mb-4">
                                <Sparkles size={18} className="text-primary" />
                                <h3 className="font-bold text-sm">Servicio de Seguimiento</h3>
                            </div>
                            {itemOptions.length > 0 ? (
                                <SearchableSelect
                                    options={itemOptions}
                                    value={selectedItemKey}
                                    onChange={handleSelectItem}
                                    placeholder="Seleccionar servicio o plan..."
                                    icon={<Sparkles size={16} />}
                                />
                            ) : (
                                <p className="text-sm text-muted-foreground italic">
                                    No hay servicios ni planes disponibles. Créalos en "Gestionar Servicios".
                                </p>
                            )}
                            {selectedItem && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 shrink-0">
                                            {selectedItem.kind === 'plan' ? 'Plan' : 'Servicio'}
                                        </span>
                                        <span className="text-sm font-medium text-emerald-400 truncate">{selectedItem.name}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowDetail(true)}
                                        className="text-xs px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium flex items-center gap-1.5 shrink-0"
                                    >
                                        <Info size={14} /> Ver detalle
                                    </button>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 2.5. Dirección de Entrega */}
                <AnimatePresence>
                    {selectedPet && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            transition={{ delay: 0.12 }}
                            className="glass-card rounded-3xl p-6 border border-white/10 overflow-hidden"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2.5">
                                    <MapPin size={18} className="text-primary" />
                                    <div>
                                        <h3 className="font-bold text-sm">Dirección de Entrega</h3>
                                        <p className="text-[10px] text-muted-foreground">Dónde se devuelven las cenizas</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={syncAddressFromCustomer}
                                    className="text-xs px-2.5 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium flex items-center gap-1.5"
                                >
                                    <RefreshCw size={12} />
                                    Desde Cliente
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider ml-1">
                                        Región
                                    </label>
                                    <SearchableSelect
                                        options={regions.map(r => ({ value: r.label, label: r.label }))}
                                        value={currentCremation.region || ''}
                                        onChange={(val) => setCurrentCremation(prev => ({ ...prev, region: String(val), city: '' }))}
                                        placeholder="Seleccionar región..."
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider ml-1">
                                        Comuna / Ciudad
                                    </label>
                                    <SearchableSelect
                                        options={
                                            regions.find(r => r.label === currentCremation.region)?.communes.map(c => ({ value: c, label: c })) || []
                                        }
                                        value={currentCremation.city || ''}
                                        onChange={(val) => setCurrentCremation(prev => ({ ...prev, city: String(val) }))}
                                        placeholder={currentCremation.region ? 'Seleccionar comuna...' : 'Sin selección'}
                                    />
                                </div>

                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider ml-1">
                                        Dirección Exacta (Calle, número, departamento)
                                    </label>
                                    <input
                                        type="text"
                                        value={currentCremation.address || ''}
                                        onChange={(e) => setCurrentCremation(prev => ({ ...prev, address: e.target.value }))}
                                        className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-5 outline-none focus:border-primary/50 text-sm font-medium text-white transition-all"
                                        placeholder="Ej: Av. Providencia 1234, Depto 502"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 2.6. Dirección de Retiro */}
                <AnimatePresence>
                    {selectedPet && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            transition={{ delay: 0.13 }}
                            className="glass-card rounded-3xl p-6 border border-white/10 overflow-hidden"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2.5">
                                    <MapPin size={18} className="text-primary" />
                                    <div>
                                        <h3 className="font-bold text-sm">Dirección de Retiro</h3>
                                        <p className="text-[10px] text-muted-foreground">Dónde se recoge la mascota</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setCurrentCremation(prev => ({ ...prev, pickup_region: prev.region, pickup_city: prev.city, pickup_address: prev.address }))}
                                    className="text-xs px-2.5 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium flex items-center gap-1.5"
                                >
                                    <RefreshCw size={12} />
                                    Igual a Entrega
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider ml-1">
                                        Región
                                    </label>
                                    <SearchableSelect
                                        options={regions.map(r => ({ value: r.label, label: r.label }))}
                                        value={currentCremation.pickup_region || ''}
                                        onChange={(val) => setCurrentCremation(prev => ({ ...prev, pickup_region: String(val), pickup_city: '' }))}
                                        placeholder="Seleccionar región..."
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider ml-1">
                                        Comuna / Ciudad
                                    </label>
                                    <SearchableSelect
                                        options={
                                            regions.find(r => r.label === currentCremation.pickup_region)?.communes.map(c => ({ value: c, label: c })) || []
                                        }
                                        value={currentCremation.pickup_city || ''}
                                        onChange={(val) => setCurrentCremation(prev => ({ ...prev, pickup_city: String(val) }))}
                                        placeholder={currentCremation.pickup_region ? 'Seleccionar comuna...' : 'Sin selección'}
                                    />
                                </div>

                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider ml-1">
                                        Dirección Exacta (Calle, número, departamento)
                                    </label>
                                    <input
                                        type="text"
                                        value={currentCremation.pickup_address || ''}
                                        onChange={(e) => setCurrentCremation(prev => ({ ...prev, pickup_address: e.target.value }))}
                                        className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-5 outline-none focus:border-primary/50 text-sm font-medium text-white transition-all"
                                        placeholder="Ej: Clínica Veterinaria Andes, Av. Las Condes 567"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 3. Notas + Confirmar */}
                <AnimatePresence>
                    {selectedItem && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            transition={{ delay: 0.1 }}
                            className="glass-card rounded-3xl p-6 border border-white/10 overflow-hidden"
                        >
                            <div className="flex items-center gap-2.5 mb-4">
                                <StickyNote size={18} className="text-primary" />
                                <h3 className="font-bold text-sm">Notas (Opcional)</h3>
                            </div>
                            <textarea
                                value={currentCremation.notes || ''}
                                onChange={(e) => setCurrentCremation(prev => ({ ...prev, notes: e.target.value }))}
                                rows={3}
                                placeholder="Instrucciones especiales, observaciones del cliente..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50 resize-none text-sm"
                            />

                            {/* Summary */}
                            <div className="mt-5 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Resumen</p>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Cliente</span>
                                    <span className="font-medium">{relatedCustomer?.name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Mascota</span>
                                    <span className="font-medium">{(selectedPet as any)?.name}</span>
                                </div>
                                {currentCremation.weight != null && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Peso</span>
                                        <span className="font-medium">{currentCremation.weight} kg</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{selectedItem?.kind === 'plan' ? 'Plan' : 'Servicio'}</span>
                                    <span className="font-medium">{selectedItem?.name}</span>
                                </div>
                                <div className="border-t border-white/10 pt-2 mt-2 flex justify-between text-sm">
                                    <span className="font-bold">Total</span>
                                    <span className="font-bold text-primary text-lg">${(grandTotal || 0).toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isSaving || !selectedPet || !selectedItem}
                                className="w-full mt-5 py-4 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <><Loader2 size={18} className="animate-spin" /> Creando...</>
                                ) : (
                                    <><Compass size={18} /> Iniciar Seguimiento</>
                                )}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </form>

            {/* ========== MODAL: Nuevo Cliente ========== */}
            <Modal isOpen={showNewCustomer} onClose={() => setShowNewCustomer(false)} title="Registrar Cliente Rápido">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground ml-1">Nombre *</label>
                        <input
                            value={newCustomer.name}
                            onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50"
                            placeholder="Nombre completo"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground ml-1">Email (Opcional)</label>
                        <input
                            type="email"
                            value={newCustomer.email}
                            onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50"
                            placeholder="correo@ejemplo.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground ml-1">Teléfono (Opcional)</label>
                        <input
                            value={newCustomer.phone}
                            onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50"
                            placeholder="+56 9 1234 5678"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleSaveCustomer}
                        disabled={savingCustomer}
                        className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {savingCustomer ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        {savingCustomer ? 'Guardando...' : 'Registrar Cliente'}
                    </button>
                </div>
            </Modal>

            {/* ========== MODAL: Nueva Mascota ========== */}
            <Modal isOpen={showNewPet} onClose={() => setShowNewPet(false)} title="Registrar Mascota Rápida">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1 mb-1">
                            <label className="text-sm font-bold text-muted-foreground">Dueño de la Mascota *</label>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowNewPet(false);
                                    setShowNewCustomer(true);
                                }}
                                className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium flex items-center gap-1"
                            >
                                <Plus size={12} /> Nuevo Cliente
                            </button>
                        </div>
                        <SearchableSelect
                            options={customerOptions}
                            value={newPetCustomerId || ''}
                            onChange={(val: string | number) => setNewPetCustomerId(Number(val))}
                            placeholder="Buscar cliente por nombre..."
                            icon={<Users size={16} />}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground ml-1">Nombre de la Mascota *</label>
                        <input
                            value={newPet.name}
                            onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50"
                            placeholder="Nombre de la mascota"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground ml-1">Especie</label>
                        <SearchableSelect
                            options={[
                                { value: 'perro', label: 'Perro' },
                                { value: 'gato', label: 'Gato' },
                                { value: 'ave', label: 'Ave' },
                                { value: 'conejo', label: 'Conejo' },
                                { value: 'otro', label: 'Otro' },
                            ]}
                            value={newPet.species}
                            onChange={(val: string | number) => setNewPet({ ...newPet, species: String(val) })}
                            placeholder="Seleccionar especie"
                            icon={<Dog size={16} />}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleSavePet}
                        disabled={savingPet}
                        className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {savingPet ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        {savingPet ? 'Guardando...' : 'Registrar Mascota'}
                    </button>
                </div>
            </Modal>

            {/* ========== MODAL: Detalle de Servicio / Plan (sin precios) ========== */}
            <Modal
                isOpen={showDetail && !!selectedItem}
                onClose={() => setShowDetail(false)}
                title={selectedItem ? `Detalle ${selectedItem.kind === 'plan' ? 'del Plan' : 'del Servicio'}` : 'Detalle'}
            >
                {selectedItem && (
                    <div className="space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                                {selectedItem.kind === 'plan' ? <Package size={20} className="text-primary" /> : <Sparkles size={20} className="text-primary" />}
                            </div>
                            <div className="min-w-0">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                                    {selectedItem.kind === 'plan' ? 'Plan' : 'Servicio'}
                                </span>
                                <h4 className="text-base font-bold leading-tight truncate">{selectedItem.name}</h4>
                            </div>
                        </div>

                        {selectedItem.description ? (
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">Descripción</p>
                                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{selectedItem.description}</p>
                            </div>
                        ) : (
                            selectedItem.kind === 'service' && (
                                <p className="text-sm text-muted-foreground italic">Este servicio no tiene una descripción registrada.</p>
                            )
                        )}

                        {selectedItem.kind === 'plan' && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">Servicios incluidos</p>
                                {selectedItem.includedServices && selectedItem.includedServices.length > 0 ? (
                                    <ul className="space-y-2">
                                        {selectedItem.includedServices.map((s, i) => (
                                            <li key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5">
                                                <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium">{s.name}</p>
                                                    {s.description && (
                                                        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{s.description}</p>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">Este plan no tiene servicios vinculados.</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
