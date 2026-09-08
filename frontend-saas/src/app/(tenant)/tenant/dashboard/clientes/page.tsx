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
    ChevronDown,
    ChevronRight,
    Dog
} from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomers, useSaveCustomer, useDeleteCustomer } from '@/hooks/useCustomers';
import { usePets } from '@/hooks/usePets';
import SearchableSelect from '@/components/tenant/SearchableSelect';
import { TableSkeleton } from '@/components/tenant/ui/Skeleton';
import { usePermissions } from '@/app/(tenant)/tenant/context/PermissionContext';
import { regions } from '@/lib/tenant/chile-data';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import Modal from '@/components/tenant/Modal';
import DeleteConfirmationModal from '@/components/tenant/DeleteConfirmationModal';
import { useTenant } from '@/app/(tenant)/tenant/context/TenantContext';
import { PlanLimitModal } from '@/components/tenant/PlanLimitModal';
import QuickPetModal from '@/components/tenant/crm/QuickPetModal';

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
    const { data: pets = [] } = usePets();
    const saveCustomerMutation = useSaveCustomer();
    const deleteCustomerMutation = useDeleteCustomer();

    const [searchTerm, setSearchTerm] = useState('');

    // Modal & Form States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [currentCustomer, setCurrentCustomer] = useState<Partial<Customer> | null>(null);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

    // Quick Pet Modal State
    const [isQuickPetModalOpen, setIsQuickPetModalOpen] = useState(false);
    const [quickPetCustomerId, setQuickPetCustomerId] = useState<number | undefined>(undefined);

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

    const router = useRouter();
    const [nextStepCustomer, setNextStepCustomer] = useState<Customer | null>(null);

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

            const saved = await saveCustomerMutation.mutateAsync({
                isEdit,
                customer: currentCustomer
            });

            setIsModalOpen(false);

            if (!isEdit && saved?.id) {
                setNextStepCustomer(saved);
            }
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

    const ITEMS_PER_PAGE = 10;
    const [currentPage, setCurrentPage] = useState(1);

    const filteredCustomers = [...customers]
        .sort((a, b) => b.id - a.id)
        .filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.rut && c.rut.toLowerCase().includes(searchTerm.toLowerCase()))
        );

    const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
    const paginatedCustomers = filteredCustomers.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gestión de Clientes (Tutores)</h1>
                    <p className="text-muted-foreground mt-1 text-sm sm:text-base">Inscribe al cliente para iniciar la atención o consulta el historial más abajo.</p>
                </div>
            </div>

            {/* TOP SECTION: Formulario de Inscripción Directa */}
            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 text-primary">
                            <Users size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">
                                {currentCustomer?.id ? 'Editar Datos del Cliente' : 'Inscribir Nuevo Cliente (Tutor)'}
                            </h2>
                            <p className="text-xs text-muted-foreground">Completa los campos obligatorios para registrar al cliente en el sistema.</p>
                        </div>
                    </div>
                    {currentCustomer?.id && (
                        <button
                            type="button"
                            onClick={() => {
                                setCurrentCustomer({ name: '', rut: '', email: '', phone: '', address: '', region: '', city: '', country: 'Chile' });
                                setLocalPhone('');
                            }}
                            className="text-xs text-primary font-bold hover:underline"
                        >
                            + Limpiar / Crear Nuevo
                        </button>
                    )}
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Nombre Completo <span className="text-red-400">*</span></label>
                            <input
                                required
                                value={currentCustomer?.name || ''}
                                onChange={(e) => setCurrentCustomer({ ...currentCustomer, name: e.target.value })}
                                placeholder="Ej: Juan Pérez"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50 text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">RUT <span className="text-red-400">*</span></label>
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
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50 text-sm font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Correo Electrónico</label>
                            <input
                                type="email"
                                value={currentCustomer?.email || ''}
                                onChange={(e) => setCurrentCustomer({ ...currentCustomer, email: e.target.value })}
                                placeholder="ejemplo@correo.com"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50 text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Teléfono Móvil</label>
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
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Dirección de Retiro / Domicilio</label>
                            <input
                                value={currentCustomer?.address || ''}
                                onChange={(e) => setCurrentCustomer({ ...currentCustomer, address: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50 text-sm"
                                placeholder="Calle, número, departamento..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Región</label>
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
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Ciudad / Comuna</label>
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

                    <div className="flex justify-end pt-4 border-t border-white/5">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="bg-primary text-primary-foreground min-h-[46px] px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                            {currentCustomer?.id ? 'Guardar Cambios' : 'Registrar Cliente & Continuar 🐾'}
                        </button>
                    </div>
                </form>
            </div>

            {/* BOTTOM SECTION: Buscador & Tabla de Historial */}
            <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-white">Historial de Clientes Registrados</h3>
                        <p className="text-xs text-muted-foreground">Consulta o edita la información de tutores registrados en tu crematorio.</p>
                    </div>
                    <div className="text-xs font-semibold text-muted-foreground px-4 py-2 bg-white/5 rounded-full border border-white/5">
                        Total Registrados: {filteredCustomers.length}
                    </div>
                </div>

                <div className="glass-card rounded-3xl p-4 flex items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar cliente por nombre o RUT..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-primary/50 transition-all text-sm"
                        />
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
                        <table className="w-full text-left table-fixed">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/5">
                                    <th className="w-[22%] px-4 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre / RUT</th>
                                    <th className="w-[25%] px-4 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Contacto</th>
                                    <th className="w-[23%] px-4 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Dirección</th>
                                    <th className="w-[18%] px-4 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Mascotas</th>
                                    <th className="w-[12%] px-4 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {paginatedCustomers.map((customer) => {
                                    const customerPets = pets.filter(p => p.customer_id === customer.id);
                                    return (
                                        <tr key={customer.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-4 py-4">
                                                <div className="flex items-center min-w-0">
                                                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                                                        {customer.name.charAt(0)}
                                                    </div>
                                                    <div className="ml-3 min-w-0 flex-1">
                                                        <p className="font-bold text-sm text-white truncate group-hover:text-primary transition-colors">{customer.name}</p>
                                                        <p className="text-xs font-mono text-muted-foreground mt-0.5">{customer.rut || 'Sin RUT'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="space-y-1 text-xs min-w-0">
                                                    <div className="flex items-center text-muted-foreground truncate" title={customer.email}>
                                                        <Mail size={13} className="mr-2 text-primary/70 shrink-0" />
                                                        <span className="truncate">{customer.email || '—'}</span>
                                                    </div>
                                                    <div className="flex items-center text-muted-foreground truncate" title={customer.phone}>
                                                        <Phone size={13} className="mr-2 text-primary/70 shrink-0" />
                                                        <span className="truncate font-mono">{customer.phone || '—'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-xs">
                                                <div className="space-y-1 min-w-0">
                                                    <div className="flex items-start text-muted-foreground">
                                                        <MapPin size={13} className="mr-1.5 mt-0.5 shrink-0 text-primary/70" />
                                                        <span className="truncate" title={customer.address}>{customer.address || 'Sin dirección'}</span>
                                                    </div>
                                                    <div className="text-[10px] font-bold text-primary/80 uppercase bg-primary/10 px-2 py-0.5 rounded-md w-fit truncate">
                                                        {customer.city || 'S/C'}{customer.region ? `, ${customer.region}` : ''}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-xs">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-muted-foreground flex items-center gap-1">
                                                        <Dog size={11} className="text-primary" />
                                                        {customerPets.length}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setQuickPetCustomerId(customer.id);
                                                            setIsQuickPetModalOpen(true);
                                                        }}
                                                        className="text-[10px] font-bold text-primary hover:bg-primary/20 bg-primary/10 px-2 py-1 rounded-lg transition border border-primary/20 flex items-center gap-1 shrink-0"
                                                        title="Agregar Mascota a este cliente"
                                                    >
                                                        <Plus size={11} />
                                                        Mascota
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => handleOpenModal(customer)}
                                                        className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/30 text-white transition-all shadow-sm"
                                                        title="Editar cliente"
                                                    >
                                                        <Edit2 size={15} />
                                                    </button>
                                                    {canDelete('clientes') && (
                                                        <button
                                                            onClick={() => handleDelete(customer)}
                                                            className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 transition-all shadow-sm"
                                                            title="Eliminar cliente"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="lg:hidden space-y-4">
                        {paginatedCustomers.map((customer) => (
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

                    {/* Pagination Controls */}
                    {!loadingCustomers && totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-6 pb-4">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                            >
                                <ChevronRight className="rotate-180" size={18} />
                            </button>
                            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                                Página {currentPage} de {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    )}

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
                title="¿Eliminar Cliente y sus Registros?"
                description={`Estás a punto de eliminar al cliente "${customerToDelete?.name}". Si el cliente tiene mascotas registradas u órdenes de cremación asociadas, TODO SE ELIMINARÁ PERMANENTEMENTE. Esta acción no se puede deshacer.`}
            />
            {/* Modal de Límite */}
            <PlanLimitModal
                isOpen={showLimitModal}
                onClose={() => setShowLimitModal(false)}
                resourceName="Clientes"
            />
            {/* Quick Pet Modal */}
            <QuickPetModal
                isOpen={isQuickPetModalOpen}
                onClose={() => {
                    setIsQuickPetModalOpen(false);
                    setQuickPetCustomerId(undefined);
                }}
                defaultCustomerId={quickPetCustomerId}
            />

            {/* Modal de Continuación Directa: Registrar Mascota */}
            {nextStepCustomer && (
                <Modal
                    isOpen={!!nextStepCustomer}
                    onClose={() => setNextStepCustomer(null)}
                    title="¡Cliente Registrado!"
                >
                    <div className="space-y-6 text-center py-2">
                        <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
                            <Dog size={32} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white">Tutor "{nextStepCustomer.name}" guardado</h3>
                            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                                ¿Deseas inscribir la mascota de este cliente ahora mismo para iniciar la atención?
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setNextStepCustomer(null)}
                                className="flex-1 py-3.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition"
                            >
                                Quedarme en Clientes
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const cid = nextStepCustomer.id;
                                    setNextStepCustomer(null);
                                    router.push(`/dashboard/mascotas?customer_id=${cid}&autoOpen=true`);
                                }}
                                className="flex-1 py-3.5 px-4 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/20 hover:brightness-110 transition flex items-center justify-center gap-2"
                            >
                                <Dog size={16} />
                                Registrar Mascota
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

