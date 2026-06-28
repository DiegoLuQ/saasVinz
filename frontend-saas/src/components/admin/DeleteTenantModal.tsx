"use client";

import React, { useState } from 'react';
import {
    AlertTriangle,
    Trash2,
    X,
    Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest } from '@/lib/admin/api';

interface DeleteTenantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    tenant: {
        id: number;
        name: string;
        slug: string;
    } | null;
}

export default function DeleteTenantModal({ isOpen, onClose, onSuccess, tenant }: DeleteTenantModalProps) {
    const [confirmSlug, setConfirmSlug] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Checklist states
    const [deleteClients, setDeleteClients] = useState(true);
    const [deletePets, setDeletePets] = useState(true);
    const [deleteServices, setDeleteServices] = useState(true);
    const [deletePlans, setDeletePlans] = useState(true);
    const [deleteProducts, setDeleteProducts] = useState(true);
    const [deleteOrders, setDeleteOrders] = useState(true);
    const [deleteDesigns, setDeleteDesigns] = useState(true);
    const [deleteFinancials, setDeleteFinancials] = useState(true);

    const isAllSelected = deleteClients && deletePets && deleteServices && deletePlans && deleteProducts && deleteOrders && deleteDesigns && deleteFinancials;
    const isNoneSelected = !deleteClients && !deletePets && !deleteServices && !deletePlans && !deleteProducts && !deleteOrders && !deleteDesigns && !deleteFinancials;

    const handleToggleAll = (val: boolean) => {
        setDeleteClients(val);
        setDeletePets(val);
        setDeleteServices(val);
        setDeletePlans(val);
        setDeleteProducts(val);
        setDeleteOrders(val);
        setDeleteDesigns(val);
        setDeleteFinancials(val);
    };

    const handleDelete = async () => {
        if (!tenant || confirmSlug !== tenant.slug || isNoneSelected) return;

        setIsDeleting(true);
        setError(null);

        try {
            const queryParams = new URLSearchParams({
                delete_clients: deleteClients.toString(),
                delete_pets: deletePets.toString(),
                delete_services: deleteServices.toString(),
                delete_plans: deletePlans.toString(),
                delete_products: deleteProducts.toString(),
                delete_orders: deleteOrders.toString(),
                delete_designs: deleteDesigns.toString(),
                delete_financials: deleteFinancials.toString(),
            });

            await apiRequest(`/api/internal/creator/tenants/${tenant.id}?${queryParams.toString()}`, {
                method: 'DELETE'
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsDeleting(false);
        }
    };

    if (!tenant) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-xl bg-[#0a192f] border border-red-500/20 rounded-[2.5rem] p-8 overflow-hidden shadow-2xl"
                    >
                        {/* Background Decoration */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 blur-[80px] rounded-full" />

                        <div className="relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
                                    <AlertTriangle size={32} />
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/5 rounded-xl text-white/20 hover:text-white transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <h3 className="text-2xl font-black text-white mb-1 italic uppercase tracking-wide">
                                {isAllSelected ? '¿ELIMINAR EMPRESA?' : '¿LIMPIAR RECURSOS DE LA EMPRESA?'}
                            </h3>

                            <p className="text-white/40 text-xs mb-4 leading-relaxed">
                                {isAllSelected ? (
                                    <>
                                        Esta acción es <span className="text-red-400 font-bold uppercase">irreversible</span>.
                                        Se borrará la empresa <span className="text-white font-bold italic">"{tenant.name}"</span> y TODOS los recursos seleccionados a continuación.
                                    </>
                                ) : (
                                    <>
                                        Se eliminarán únicamente los recursos seleccionados a continuación de la empresa <span className="text-white font-bold italic">"{tenant.name}"</span>. La empresa seguirá activa.
                                    </>
                                )}
                            </p>

                            {/* Checklist section */}
                            <div className="bg-black/30 border border-white/5 p-5 rounded-2xl mb-4">
                                <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
                                    <span className="text-[10px] text-white/50 font-black uppercase tracking-wider">
                                        Selecciona qué deseas eliminar:
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleToggleAll(!isAllSelected)}
                                        className="text-[10px] text-red-400 font-bold hover:underline"
                                    >
                                        {isAllSelected ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors text-white/80">
                                        <input
                                            type="checkbox"
                                            checked={deleteClients}
                                            onChange={(e) => setDeleteClients(e.target.checked)}
                                            className="w-4 h-4 rounded border-white/10 bg-black/40 text-red-500 accent-red-500 focus:ring-0 focus:ring-offset-0"
                                        />
                                        <span>Clientes y Formularios</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors text-white/80">
                                        <input
                                            type="checkbox"
                                            checked={deletePets}
                                            onChange={(e) => setDeletePets(e.target.checked)}
                                            className="w-4 h-4 rounded border-white/10 bg-black/40 text-red-500 accent-red-500 focus:ring-0 focus:ring-offset-0"
                                        />
                                        <span>Mascotas y Expedientes</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors text-white/80">
                                        <input
                                            type="checkbox"
                                            checked={deleteServices}
                                            onChange={(e) => setDeleteServices(e.target.checked)}
                                            className="w-4 h-4 rounded border-white/10 bg-black/40 text-red-500 accent-red-500 focus:ring-0 focus:ring-offset-0"
                                        />
                                        <span>Servicios y Categorías</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors text-white/80">
                                        <input
                                            type="checkbox"
                                            checked={deletePlans}
                                            onChange={(e) => setDeletePlans(e.target.checked)}
                                            className="w-4 h-4 rounded border-white/10 bg-black/40 text-red-500 accent-red-500 focus:ring-0 focus:ring-offset-0"
                                        />
                                        <span>Planes de Cremación (Servicios)</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors text-white/80">
                                        <input
                                            type="checkbox"
                                            checked={deleteProducts}
                                            onChange={(e) => setDeleteProducts(e.target.checked)}
                                            className="w-4 h-4 rounded border-white/10 bg-black/40 text-red-500 accent-red-500 focus:ring-0 focus:ring-offset-0"
                                        />
                                        <span>Catálogo de Productos</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors text-white/80">
                                        <input
                                            type="checkbox"
                                            checked={deleteOrders}
                                            onChange={(e) => setDeleteOrders(e.target.checked)}
                                            className="w-4 h-4 rounded border-white/10 bg-black/40 text-red-500 accent-red-500 focus:ring-0 focus:ring-offset-0"
                                        />
                                        <span>Pedidos y Cremaciones</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors text-white/80">
                                        <input
                                            type="checkbox"
                                            checked={deleteDesigns}
                                            onChange={(e) => setDeleteDesigns(e.target.checked)}
                                            className="w-4 h-4 rounded border-white/10 bg-black/40 text-red-500 accent-red-500 focus:ring-0 focus:ring-offset-0"
                                        />
                                        <span>Diseños y Certificados</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors text-white/80">
                                        <input
                                            type="checkbox"
                                            checked={deleteFinancials}
                                            onChange={(e) => setDeleteFinancials(e.target.checked)}
                                            className="w-4 h-4 rounded border-white/10 bg-black/40 text-red-500 accent-red-500 focus:ring-0 focus:ring-offset-0"
                                        />
                                        <span>Ingresos y Facturas</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-2xl">
                                    <p className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-2">
                                        Para confirmar, escribe el slug: <span className="text-white ml-2 select-all px-2 py-0.5 bg-red-500/20 rounded font-mono">{tenant.slug}</span>
                                    </p>
                                    <input
                                        type="text"
                                        value={confirmSlug}
                                        onChange={(e) => setConfirmSlug(e.target.value)}
                                        placeholder="Escribe el slug aquí..."
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-red-500/50 transition-all text-sm font-mono"
                                    />
                                </div>

                                {error && (
                                    <div className="text-red-400 text-xs font-bold bg-red-400/10 p-3 rounded-xl border border-red-400/20">
                                        {error}
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 px-6 py-3.5 rounded-2xl text-xs font-bold text-white/40 hover:text-white hover:bg-white/5 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={confirmSlug !== tenant.slug || isDeleting || isNoneSelected}
                                        className="flex-[2] bg-red-500 hover:bg-red-600 disabled:opacity-30 disabled:hover:bg-red-500 text-white font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition-all active:scale-95 text-xs uppercase tracking-wider"
                                    >
                                        {isDeleting ? (
                                            <Loader2 className="animate-spin" size={18} />
                                        ) : (
                                            <Trash2 size={18} />
                                        )}
                                        {isDeleting ? 'Procesando...' : isAllSelected ? 'Eliminar Definitivamente' : 'Limpiar Recursos'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
