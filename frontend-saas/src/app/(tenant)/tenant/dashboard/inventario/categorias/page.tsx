"use client";

import React, { useState } from 'react';
import {
    Tags,
    Plus,
    Search,
    Edit2,
    Trash2,
    Loader2
} from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import Modal from '@/components/tenant/Modal';
import DeleteConfirmationModal from '@/components/tenant/DeleteConfirmationModal';
import { usePermissions } from '@/app/(tenant)/tenant/context/PermissionContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessionBootstrap } from '@/hooks/useSessionBootstrap';

interface Category {
    id: number;
    name: string;
    description: string;
}

export default function CategoriesPage() {
    const { showToast } = useToast();
    const { canDelete, canCreate, canEdit } = usePermissions();
    const queryClient = useQueryClient();
    const { data: bootstrap } = useSessionBootstrap();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCategory, setCurrentCategory] = useState<Partial<Category> | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

    // 1. Fetch Categories with TanStack Query
    const { data: categories = [], isLoading } = useQuery<Category[]>({
        queryKey: ['product-categories'],
        queryFn: () => apiRequest('/api/internal/products/categories/'),
        initialData: bootstrap?.product_categories,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // 2. Mutations
    const saveMutation = useMutation({
        mutationFn: async (category: Partial<Category>) => {
            const isEdit = !!category.id;
            const endpoint = isEdit ? `/api/internal/products/categories/${category.id}` : '/api/internal/products/categories/';
            return apiRequest(endpoint, {
                method: isEdit ? 'PATCH' : 'POST',
                body: JSON.stringify(category),
            });
        },
        onSuccess: () => {
            const isEdit = !!currentCategory?.id;
            showToast(`Categoría ${isEdit ? 'actualizada' : 'creada'} con éxito`, 'success');
            setIsModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['product-categories'] });
            // Also invalidate bootstrap as it contains the categories list
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
        },
        onError: (err: any) => {
            showToast(err.message, 'error');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiRequest(`/api/internal/products/categories/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            showToast('Categoría eliminada', 'success');
            setCategoryToDelete(null);
            queryClient.invalidateQueries({ queryKey: ['product-categories'] });
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
        },
        onError: (err: any) => {
            showToast(err.message, 'error');
            setCategoryToDelete(null);
        }
    });

    const handleOpenModal = (category?: Category) => {
        setCurrentCategory(category || { name: '', description: '' });
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (currentCategory) {
            saveMutation.mutate(currentCategory);
        }
    };

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Categorías</h1>
                    <p className="text-muted-foreground mt-1">Clasificación de productos del inventario.</p>
                </div>
                {canCreate('inventario') && (
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-primary text-primary-foreground font-bold py-3 px-6 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all text-sm"
                    >
                        <Plus className="mr-2" size={18} />
                        Nueva Categoría
                    </button>
                )}
            </div>

            {/* Toolbar */}
            <div className="glass-card rounded-3xl p-4 flex gap-4 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar categorías..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-primary/50 transition-all text-sm"
                    />
                </div>
            </div>

            {/* Table */}
            {isLoading && categories.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="animate-spin text-primary" size={40} />
                </div>
            ) : (
                <div className="glass-card rounded-3xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre</th>
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción</th>
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredCategories.map((category) => (
                                <tr key={category.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-6 font-bold flex items-center">
                                        <div className="p-2 rounded-lg bg-primary/10 mr-3 text-primary">
                                            <Tags size={18} />
                                        </div>
                                        {category.name}
                                    </td>
                                    <td className="px-6 py-6 text-muted-foreground text-sm">{category.description || '-'}</td>
                                    <td className="px-6 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {canEdit('inventario') && (
                                                <button
                                                    onClick={() => handleOpenModal(category)}
                                                    className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                            {canDelete('inventario') && (
                                                <button
                                                    onClick={() => setCategoryToDelete(category)}
                                                    className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredCategories.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-10 text-center text-muted-foreground italic">
                                        No se encontraron categorías.
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
                title={currentCategory?.id ? 'Editar Categoría' : 'Nueva Categoría'}
            >
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground ml-1">Nombre</label>
                        <input
                            required
                            value={currentCategory?.name || ''}
                            onChange={(e) => setCurrentCategory({ ...currentCategory, name: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground ml-1">Descripción</label>
                        <textarea
                            value={currentCategory?.description || ''}
                            onChange={(e) => setCurrentCategory({ ...currentCategory, description: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50 min-h-[100px]"
                        />
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
                isOpen={!!categoryToDelete}
                onClose={() => setCategoryToDelete(null)}
                onConfirm={() => categoryToDelete && deleteMutation.mutate(categoryToDelete.id)}
                title="¿Eliminar Categoría?"
                description={`Estás a punto de eliminar "${categoryToDelete?.name}".`}
                isDeleting={deleteMutation.isPending}
            />
        </div>
    );
}

