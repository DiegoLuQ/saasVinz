"use client";

import React, { useState } from 'react';
import {
    Truck,
    Plus,
    Search,
    Edit2,
    Trash2,
    Loader2,
    Mail,
    Phone,
} from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import Modal from '@/components/tenant/Modal';
import DeleteConfirmationModal from '@/components/tenant/DeleteConfirmationModal';
import { usePermissions } from '@/app/(tenant)/tenant/context/PermissionContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessionBootstrap } from '@/hooks/useSessionBootstrap';

interface Provider {
    id: number;
    name: string;
    rut: string;
    phone: string;
    email: string;
}

export default function ProvidersPage() {
    const { showToast } = useToast();
    const { canDelete, canCreate, canEdit } = usePermissions();
    const queryClient = useQueryClient();
    const { data: bootstrap } = useSessionBootstrap();

    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProvider, setCurrentProvider] = useState<Partial<Provider> | null>(null);
    const [providerToDelete, setProviderToDelete] = useState<Provider | null>(null);

    // 1. Fetch Providers with TanStack Query
    const { data: providers = [], isLoading } = useQuery<Provider[]>({
        queryKey: ['product-providers'],
        queryFn: () => apiRequest('/api/internal/products/providers/'),
        initialData: bootstrap?.product_providers,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // 2. Mutations
    const saveMutation = useMutation({
        mutationFn: async (provider: Partial<Provider>) => {
            const isEdit = !!provider.id;
            const endpoint = isEdit ? `/api/internal/products/providers/${provider.id}` : '/api/internal/products/providers/';

            // Sanitizar payload: enviar null en lugar de string vacío
            const payload = {
                ...provider,
                email: provider.email || null,
                phone: provider.phone || null,
                rut: provider.rut || null,
            };

            return apiRequest(endpoint, {
                method: isEdit ? 'PATCH' : 'POST',
                body: JSON.stringify(payload),
            });
        },
        onSuccess: () => {
            const isEdit = !!currentProvider?.id;
            showToast(`Proveedor ${isEdit ? 'actualizado' : 'creado'} con éxito`, 'success');
            setIsModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['product-providers'] });
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
        },
        onError: (err: any) => {
            showToast(err.message, 'error');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiRequest(`/api/internal/products/providers/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            showToast('Proveedor eliminado', 'success');
            setProviderToDelete(null);
            queryClient.invalidateQueries({ queryKey: ['product-providers'] });
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
        },
        onError: (err: any) => {
            showToast(err.message, 'error');
            setProviderToDelete(null);
        }
    });

    const handleOpenModal = (provider?: Provider) => {
        setCurrentProvider(provider || { name: '', rut: '', phone: '', email: '' });
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (currentProvider) {
            saveMutation.mutate(currentProvider);
        }
    };

    const filteredProviders = providers.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.rut.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Proveedores</h1>
                    <p className="text-muted-foreground mt-1">Gestión de proveedores de urnas y accesorios.</p>
                </div>
                {canCreate('inventario') && (
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-primary text-primary-foreground font-bold py-3 px-6 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all text-sm"
                    >
                        <Plus className="mr-2" size={18} />
                        Nuevo Proveedor
                    </button>
                )}
            </div>

            {/* Toolbar */}
            <div className="glass-card rounded-3xl p-4 flex gap-4 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o RUT..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-primary/50 transition-all text-sm"
                    />
                </div>
            </div>

            {/* Table */}
            {isLoading && providers.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="animate-spin text-primary" size={40} />
                </div>
            ) : (
                <div className="glass-card rounded-3xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre / RUT</th>
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Contacto</th>
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredProviders.map((provider) => (
                                <tr key={provider.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-6 font-bold">
                                        <div className="flex items-center">
                                            <div className="p-2 rounded-lg bg-primary/10 mr-3 text-primary">
                                                <Truck size={18} />
                                            </div>
                                            <div>
                                                <p>{provider.name}</p>
                                                <p className="text-xs text-muted-foreground font-normal mt-0.5">{provider.rut}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="space-y-1">
                                            <div className="flex items-center text-sm text-muted-foreground">
                                                <Mail size={14} className="mr-2" />
                                                {provider.email || '-'}
                                            </div>
                                            <div className="flex items-center text-sm text-muted-foreground">
                                                <Phone size={14} className="mr-2" />
                                                {provider.phone || '-'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {canEdit('inventario') && (
                                                <button
                                                    onClick={() => handleOpenModal(provider)}
                                                    className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                            {canDelete('inventario') && (
                                                <button
                                                    onClick={() => setProviderToDelete(provider)}
                                                    className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredProviders.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-10 text-center text-muted-foreground italic">
                                        No se encontraron proveedores.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={currentProvider?.id ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            >
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground ml-1">Nombre</label>
                        <input
                            required
                            value={currentProvider?.name || ''}
                            onChange={(e) => setCurrentProvider({ ...currentProvider, name: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground ml-1">RUT</label>
                        <input
                            value={currentProvider?.rut || ''}
                            onChange={(e) => {
                                let val = e.target.value.replace(/[^0-9kK]/g, '');
                                if (val.length > 9) val = val.slice(0, 9);
                                if (val.length > 1) {
                                    const body = val.slice(0, -1);
                                    const dv = val.slice(-1).toUpperCase();
                                    val = `${body.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
                                }
                                setCurrentProvider({ ...currentProvider, rut: val });
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Email</label>
                            <input
                                type="email"
                                value={currentProvider?.email || ''}
                                onChange={(e) => setCurrentProvider({ ...currentProvider, email: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Teléfono</label>
                            <input
                                value={currentProvider?.phone || ''}
                                onChange={(e) => setCurrentProvider({ ...currentProvider, phone: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-2xl hover:bg-white/5 font-bold transition-all">Cancelar</button>
                        <button type="submit" disabled={saveMutation.isPending} className="bg-primary text-primary-foreground px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center">
                            {saveMutation.isPending && <Loader2 className="animate-spin mr-2" size={18} />}
                            Guardar
                        </button>
                    </div>
                </form>
            </Modal>

            <DeleteConfirmationModal
                isOpen={!!providerToDelete}
                onClose={() => setProviderToDelete(null)}
                onConfirm={() => providerToDelete && deleteMutation.mutate(providerToDelete.id)}
                title="¿Eliminar Proveedor?"
                description={`Estás a punto de eliminar a "${providerToDelete?.name}".`}
                isDeleting={deleteMutation.isPending}
            />
        </div>
    );
}

