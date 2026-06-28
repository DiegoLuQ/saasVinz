"use client";

import React, { useEffect, useState } from 'react';
import {
    Users,
    Plus,
    Search,
    Mail,
    Phone,
    MapPin,
    Edit2,
    Trash2,
    ExternalLink,
    Loader2,
    ChevronDown
} from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomers, useSaveCustomer, useDeleteCustomer } from '@/hooks/useCustomers';
import SearchableSelect from '@/components/tenant/SearchableSelect';
import { TableSkeleton } from '@/components/tenant/ui/Skeleton';
import { usePermissions } from '@/app/(tenant)/tenant/context/PermissionContext';
import { regions } from '@/lib/tenant/chile-data';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import Modal from '@/components/tenant/Modal';
import DeleteConfirmationModal from '@/components/tenant/DeleteConfirmationModal';
import { useTenant } from '@/app/(tenant)/tenant/context/TenantContext';
import { PlanLimitModal } from '@/components/tenant/PlanLimitModal';

const COUNTRY_CODES = [
    { code: '+56', country: 'Chile', flag: '🇨🇱' },
    { code: '+54', country: 'Argentina', flag: '🇦🇷' },
    { code: '+591', country: 'Bolivia', flag: '🇧🇴' },
    { code: '+57', country: 'Colombia', flag: '🇨🇴' },
    { code: '+506', country: 'Costa Rica', flag: '🇨🇷' },
    { code: '+53', country: 'Cuba', flag: '🇨🇺' },
    { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
    { code: '+503', country: 'El Salvador', flag: '🇸🇻' },
    { code: '+34', country: 'España', flag: '🇪🇸' },
    { code: '+1', country: 'USA/Canadá', flag: '🇺🇸' },
    { code: '+502', country: 'Guatemala', flag: '🇬🇹' },
    { code: '+504', country: 'Honduras', flag: '🇭🇳' },
    { code: '+52', country: 'México', flag: '🇲🇽' },
    { code: '+505', country: 'Nicaragua', flag: '🇳🇮' },
    { code: '+507', country: 'Panamá', flag: '🇵🇦' },
    { code: '+595', country: 'Paraguay', flag: '🇵🇾' },
    { code: '+51', country: 'Perú', flag: '🇵🇪' },
    { code: '+1', country: 'Puerto Rico', flag: '🇵🇷' },
    { code: '+1', country: 'Rep. Dominicana', flag: '🇩🇴' },
    { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
    { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
    { code: '+55', country: 'Brasil', flag: '🇧🇷' },
];

interface Customer {
    id: number;
    rut: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    region?: string;
    city?: string;
    country?: string;
    created_at?: string;
}

export default function CustomersPage() {
    const { showToast } = useToast();
    const { canDelete, canCreate } = usePermissions();
    const { tenantData, formatLimit } = useTenant();

    // TanStack Query Hooks
    const { data: customers = [], isLoading: loadingCustomers } = useCustomers();
    const saveCustomerMutation = useSaveCustomer();
    const deleteCustomerMutation = useDeleteCustomer();

    const [searchTerm, setSearchTerm] = useState('');

    // Modal & Form States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [currentCustomer, setCurrentCustomer] = useState<Partial<Customer> | null>(null);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

    // Phone state
    const [countryCode, setCountryCode] = useState('+56');
    const [localPhone, setLocalPhone] = useState('');

    const [showLimitModal, setShowLimitModal] = useState(false);

    const maxCustomers = tenantData?.subscription_plan?.max_customers || 0;

    // La cuota se aplica POR MES (se reinicia el día 1); el backend cuenta solo
    // los registros del mes actual (ver limit_checker.py, type "monthly"). Por eso
    // el indicador y el bloqueo deben usar el uso mensual, no el total histórico.
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthlyUsage = (customers as any[]).filter(
        (c) => c.created_at && new Date(c.created_at) >= startOfMonth
    ).length;

    const isLimitReached = maxCustomers > 0 && maxCustomers < 999999 && monthlyUsage >= maxCustomers;


    const handleOpenModal = (customer?: Customer) => {
        if (!customer && isLimitReached) {
            setShowLimitModal(true);
            return;
        }

        const initialData = customer || { rut: '', name: '', email: '', phone: '', address: '', country: 'Chile' };

        // Parse phone
        if (initialData.phone) {
            const matchingCode = COUNTRY_CODES.find(c => initialData.phone?.startsWith(c.code));
            if (matchingCode) {
                setCountryCode(matchingCode.code);
                setLocalPhone(initialData.phone.replace(matchingCode.code, '').trim());
            } else {
                setLocalPhone(initialData.phone);
                setCountryCode('+56'); // Default to Chile if no match
            }
        } else {
            setLocalPhone('');
            setCountryCode('+56');
        }

        setCurrentCustomer(initialData);
        setIsModalOpen(true);
    };

    const handleCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCode = e.target.value;
        setCountryCode(newCode);
        const countryName = COUNTRY_CODES.find(c => c.code === newCode)?.country || '';
        if (currentCustomer) {
            setCurrentCustomer({
                ...currentCustomer,
                phone: `${newCode} ${localPhone}`,
                country: countryName
            });
        }
    };

    const handleLocalPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 9);
        setLocalPhone(value);
        if (currentCustomer) {
            setCurrentCustomer({
                ...currentCustomer,
                phone: `${countryCode} ${value}`
            });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentCustomer) return;
        setIsSaving(true);
        try {
            // Validar RUT único
            const isDuplicate = customers.some(c =>
                c.rut?.toLowerCase() === currentCustomer?.rut?.toLowerCase() && c.id !== currentCustomer?.id
            );

            if (isDuplicate) {
                showToast('Ya existe un cliente con este RUT', 'error');
                setIsSaving(false);
                return;
            }

            const isEdit = !!currentCustomer?.id;

            await saveCustomerMutation.mutateAsync({
                isEdit,
                customer: currentCustomer
            });

            setIsModalOpen(false);
        } catch (err: any) {
            // Error handling in mutation
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmDeleteCustomer = async () => {
        if (!customerToDelete) return;
        try {
            await deleteCustomerMutation.mutateAsync(customerToDelete.id);
            setCustomerToDelete(null);
        } catch (err) {
            setCustomerToDelete(null);
        }
    };

    const handleDelete = (customer: Customer) => {
        setCustomerToDelete(customer);
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.rut && c.rut.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gestión de Clientes</h1>
                    <p className="text-muted-foreground mt-1 text-sm sm:text-base">Administra la base de datos de propietarios de mascotas.</p>
                </div>
                {canCreate('clientes') && (
                    <button
                        onClick={() => handleOpenModal()}
                        disabled={isLimitReached}
                        className={`bg-primary text-primary-foreground font-bold min-h-[44px] py-3 px-6 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all text-sm ${isLimitReached ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                    >
                        <Plus className="mr-2" size={18} />
                        Nuevo Cliente
                    </button>
                )}
            </div>

            {/* Toolbar */}
            <div className="glass-card rounded-3xl p-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o RUT..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-primary/50 transition-all text-sm"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="text-xs font-semibold text-muted-foreground px-4 py-2 bg-white/5 rounded-full border border-white/5">
                        Cuota del mes: {monthlyUsage} / {formatLimit(tenantData?.subscription_plan?.max_customers)}
                        <span className="opacity-60"> · Total: {filteredCustomers.length}</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            {loadingCustomers ? (
                <TableSkeleton rows={5} cols={4} />
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {/* Desktop Table */}
                    <div className="hidden lg:block glass-card rounded-3xl overflow-hidden overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/5">
                                    <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre / RUT</th>
                                    <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Contacto</th>
                                    <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Ubicación</th>
                                    <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredCustomers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-6">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                                                    {customer.name.charAt(0)}
                                                </div>
                                                <div className="ml-4">
                                                    <p className="font-bold group-hover:text-primary transition-colors">{customer.name}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{customer.rut}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="space-y-1">
                                                <div className="flex items-center text-sm">
                                                    <Mail size={14} className="mr-2 text-muted-foreground" />
                                                    {customer.email}
                                                </div>
                                                <div className="flex items-center text-sm">
                                                    <Phone size={14} className="mr-2 text-muted-foreground" />
                                                    {customer.phone}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-sm">
                                            <div className="space-y-1">
                                                <div className="flex items-start text-muted-foreground">
                                                    <MapPin size={14} className="mr-2 mt-1 shrink-0 text-primary/70" />
                                                    <span className="max-w-[180px] break-words">{customer.address}</span>
                                                </div>
                                                <div className="flex items-center text-[10px] font-bold text-primary/80 ml-6 uppercase bg-primary/5 px-2 py-0.5 rounded-md w-fit">
                                                    {customer.city || 'S/C'}, {customer.region || 'S/R'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenModal(customer)}
                                                    className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                {canDelete('clientes') && (
                                                    <button
                                                        onClick={() => handleDelete(customer)}
                                                        className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                                <button className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary">
                                                    <ExternalLink size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="lg:hidden space-y-4">
                        {filteredCustomers.map((customer) => (
                            <div key={customer.id} className="glass-card rounded-3xl p-4 sm:p-6 space-y-4 sm:space-y-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center min-w-0 flex-1">
                                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                                            {customer.name.charAt(0)}
                                        </div>
                                        <div className="ml-3 sm:ml-4 min-w-0">
                                            <h3 className="font-bold text-base sm:text-lg truncate">{customer.name}</h3>
                                            <p className="text-xs text-muted-foreground font-medium">{customer.rut}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                                    <div className="flex items-center text-sm text-muted-foreground bg-white/5 p-3 rounded-2xl min-w-0">
                                        <Mail size={16} className="mr-3 text-primary/70 shrink-0" />
                                        <span className="truncate">{customer.email}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-muted-foreground bg-white/5 p-3 rounded-2xl">
                                        <Phone size={16} className="mr-3 text-primary/70 shrink-0" />
                                        <span className="truncate">{customer.phone}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => handleOpenModal(customer)}
                                        className="flex-1 bg-primary text-primary-foreground min-h-[44px] py-3 rounded-2xl text-xs font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
                                    >
                                        Editar
                                    </button>
                                    {canDelete('clientes') && (
                                        <button
                                            onClick={() => handleDelete(customer)}
                                            className="min-h-[44px] min-w-[44px] px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center"
                                            aria-label="Eliminar cliente"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Empty State */}
                    {!loadingCustomers && filteredCustomers.length === 0 && (
                        <div className="h-64 flex flex-col items-center justify-center glass-card rounded-[2.5rem] border-dashed border-white/10 bg-transparent">
                            <Users size={48} className="text-muted-foreground/30 mb-4" />
                            <p className="text-muted-foreground font-medium">No se encontraron clientes</p>
                            <button
                                onClick={() => setSearchTerm('')}
                                className="mt-4 text-primary font-bold text-sm transition-all"
                            >
                                Limpiar búsqueda
                            </button>
                        </div>
                    )}
                </div>
            )}
            {/* Modal de CRUD */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={currentCustomer?.id ? 'Editar Cliente' : 'Nuevo Cliente'}
            >
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Nombre Completo</label>
                            <input
                                required
                                value={currentCustomer?.name || ''}
                                onChange={(e) => setCurrentCustomer({ ...currentCustomer, name: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">RUT</label>
                            <input
                                required
                                placeholder="12.345.678-K"
                                value={currentCustomer?.rut || ''}
                                onChange={(e) => {
                                    let val = e.target.value.replace(/[^0-9kK]/g, '');
                                    if (val.length > 9) val = val.slice(0, 9);

                                    if (val.length > 1) {
                                        const body = val.slice(0, -1);
                                        const dv = val.slice(-1).toUpperCase();
                                        val = `${body.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
                                    }
                                    setCurrentCustomer({ ...currentCustomer, rut: val });
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Email</label>
                            <input
                                type="email"
                                value={currentCustomer?.email || ''}
                                onChange={(e) => setCurrentCustomer({ ...currentCustomer, email: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Teléfono</label>
                            <div className="flex items-center w-full bg-white/5 border border-white/10 rounded-2xl focus-within:border-primary/50 transition-colors">
                                <div className="relative h-full">
                                    <select
                                        value={countryCode}
                                        onChange={handleCountryCodeChange}
                                        className="h-full bg-transparent text-muted-foreground hover:text-foreground pl-3 pr-8 py-3 outline-none appearance-none cursor-pointer text-sm font-medium border-r border-white/10 hover:bg-white/5 rounded-l-2xl transition-colors"
                                    >
                                        {COUNTRY_CODES.map((c) => (
                                            <option key={`${c.country}-${c.code}`} value={c.code} className="bg-slate-900 text-white">
                                                {c.flag} {c.code}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={14} />
                                </div>
                                <input
                                    value={localPhone}
                                    onChange={handleLocalPhoneChange}
                                    placeholder="912345678"
                                    maxLength={9}
                                    className="flex-1 bg-transparent border-none outline-none py-3 px-4 text-sm h-full"
                                />
                            </div>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Dirección - Casa de la Mascota - Donde dejar ánfora</label>
                            <input
                                value={currentCustomer?.address || ''}
                                onChange={(e) => setCurrentCustomer({ ...currentCustomer, address: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50"
                                placeholder="Calle, número, depto..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Región</label>
                            <SearchableSelect
                                options={regions.map(r => ({ value: r.label, label: r.label }))}
                                value={currentCustomer?.region || ''}
                                onChange={(val) => {
                                    setCurrentCustomer({
                                        ...currentCustomer,
                                        region: String(val),
                                        city: ''
                                    });
                                }}
                                placeholder="Seleccionar región..."
                                icon={<MapPin size={16} />}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Ciudad / Comuna</label>
                            <SearchableSelect
                                options={
                                    regions.find(r => r.label === currentCustomer?.region)?.communes.map(c => ({ value: c, label: c })) || []
                                }
                                value={currentCustomer?.city || ''}
                                onChange={(val) => setCurrentCustomer({ ...currentCustomer, city: String(val) })}
                                placeholder={currentCustomer?.region ? "Seleccionar ciudad..." : "Primero seleccione región"}
                                icon={<MapPin size={16} />}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-white/5">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="min-h-[44px] px-6 py-3 rounded-2xl hover:bg-white/5 font-bold transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="bg-primary text-primary-foreground min-h-[44px] px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center"
                        >
                            {isSaving && <Loader2 className="animate-spin mr-2" size={18} />}
                            {currentCustomer?.id ? 'Guardar Cambios' : 'Crear Cliente'}
                        </button>
                    </div>
                </form>
            </Modal>
            {/* Modal de Confirmación para eliminar Cliente */}
            <DeleteConfirmationModal
                isOpen={!!customerToDelete}
                onClose={() => setCustomerToDelete(null)}
                onConfirm={handleConfirmDeleteCustomer}
                title="¿Eliminar Cliente?"
                description={`Estás a punto de eliminar al cliente "${customerToDelete?.name}". Esta acción no se puede deshacer.`}
            />
            {/* Modal de Límite */}
            <PlanLimitModal
                isOpen={showLimitModal}
                onClose={() => setShowLimitModal(false)}
                resourceName="Clientes"
            />
        </div>
    );
}

