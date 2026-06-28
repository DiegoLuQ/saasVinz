"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Ticket,
    Plus,
    Trash2,
    Calendar,
    Users,
    Loader2,
    Search,
} from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import CreateCouponModal, { CouponFormData } from '@/components/admin/subscriptions/CreateCouponModal';
import type { Coupon, CouponListResponse } from '@/types/billing';
import Pagination from '@/components/admin/Pagination';
import StatusBadge from '@/components/admin/StatusBadge';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export default function CouponsManagementPage() {
    const { showToast } = useToast();
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);

    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        couponId: null as number | null,
        loading: false
    });

    // Re-fetch token: bumps to force re-fetch after mutations (create/delete)
    const [refetchToken, setRefetchToken] = useState(0);

    useEffect(() => {
        const handle = setTimeout(() => {
            setDebouncedSearch(searchInput.trim());
            setPage(1);
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(handle);
    }, [searchInput]);

    // Request-id pattern: only the latest request commits state. See note
    // in transacciones/page.tsx for why this is safer than cancelled+ref.
    const requestIdRef = useRef(0);

    useEffect(() => {
        const params = new URLSearchParams({
            page: String(page),
            page_size: String(PAGE_SIZE)
        });
        if (debouncedSearch) params.append('search', debouncedSearch);

        const myId = ++requestIdRef.current;
        setLoading(true);

        apiRequest(`/api/internal/creator/coupons?${params.toString()}`)
            .then((data: CouponListResponse) => {
                if (myId !== requestIdRef.current) return;
                setCoupons(data?.coupons || []);
                setTotal(data?.total || 0);
                setTotalPages(data?.total_pages || 0);
                setLoading(false);
            })
            .catch((error) => {
                if (myId !== requestIdRef.current) return;
                console.error('Error fetching coupons:', error);
                setCoupons([]);
                setTotal(0);
                setTotalPages(0);
                setLoading(false);
            });
    }, [page, debouncedSearch, refetchToken]);

    const handleCreateCoupon = async (formData: CouponFormData) => {
        setIsCreating(true);
        try {
            await apiRequest('/api/internal/creator/coupons', {
                method: 'POST',
                body: JSON.stringify({
                    ...formData,
                    code: formData.code.toUpperCase(),
                    max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
                    valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null
                })
            });
            setShowCreateModal(false);
            setRefetchToken(t => t + 1);
            showToast('Cupón creado', 'success');
        } catch (error: any) {
            showToast('Error al crear cupón: ' + error.message, 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteCoupon = async () => {
        if (!confirmModal.couponId) return;
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
            await apiRequest(`/api/internal/creator/coupons/${confirmModal.couponId}`, {
                method: 'DELETE'
            });
            setConfirmModal({ isOpen: false, couponId: null, loading: false });
            setRefetchToken(t => t + 1);
            showToast('Cupón eliminado', 'success');
        } catch (error: any) {
            showToast('Error al eliminar cupón: ' + error.message, 'error');
            setConfirmModal(prev => ({ ...prev, loading: false }));
        }
    };

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                            <Ticket size={24} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400/60">Gestión de Promociones</span>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight">Cupones de Descuento</h1>
                    <p className="text-white/40 font-medium">Crea y administra códigos promocionales para captar y fidelizar clientes.</p>
                </div>

                <div className="flex gap-3">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-emerald-400 transition-colors">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar código..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 w-64 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-sm"
                    >
                        <Plus size={20} /> NUEVO CUPÓN
                    </button>
                </div>
            </header>

            <div className="glass-card rounded-[2.5rem] border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-8 py-5 text-[10px] font-black text-white/40 uppercase tracking-widest">Código</th>
                                <th className="px-8 py-5 text-[10px] font-black text-white/40 uppercase tracking-widest text-center">Descuento</th>
                                <th className="px-8 py-5 text-[10px] font-black text-white/40 uppercase tracking-widest">Validez / Uso</th>
                                <th className="px-8 py-5 text-[10px] font-black text-white/40 uppercase tracking-widest text-center">Estado</th>
                                <th className="px-8 py-5 text-[10px] font-black text-white/40 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <Loader2 className="animate-spin mx-auto text-emerald-400 mb-4" size={32} />
                                        <p className="text-white/20 font-bold uppercase tracking-widest text-xs">Cargando cupones...</p>
                                    </td>
                                </tr>
                            ) : coupons.length > 0 ? (
                                coupons.map((coupon) => {
                                    const isExpired = coupon.valid_until && new Date(coupon.valid_until) < new Date();
                                    const isLimitReached = coupon.max_uses && coupon.current_uses >= coupon.max_uses;
                                    const active = coupon.is_active && !isExpired && !isLimitReached;

                                    return (
                                        <motion.tr
                                            key={coupon.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="group hover:bg-white/[0.02] transition-colors"
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border ${active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                        <Ticket size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-white tracking-widest">{coupon.code}</div>
                                                        <div className="text-[10px] text-white/30 uppercase font-bold mt-0.5">Creado el {new Date(coupon.created_at).toLocaleDateString()}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className="text-2xl font-black text-white tracking-tighter">{coupon.discount_percent}%</span>
                                                <span className="text-[10px] font-black text-white/30 ml-1 uppercase">OFF</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 text-xs text-white/60 font-medium">
                                                        <Calendar size={14} className="text-white/20" />
                                                        {coupon.valid_until ? `Vence: ${new Date(coupon.valid_until).toLocaleDateString()}` : 'Sin vencimiento'}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-white/60 font-medium">
                                                        <Users size={14} className="text-white/20" />
                                                        {coupon.current_uses} / {coupon.max_uses || '∞'} usos
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <StatusBadge
                                                    kind="coupon"
                                                    status={active
                                                        ? 'active'
                                                        : isExpired
                                                            ? 'expired'
                                                            : isLimitReached
                                                                ? 'exhausted'
                                                                : 'inactive'}
                                                />
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button
                                                    onClick={() => setConfirmModal({ isOpen: true, couponId: coupon.id, loading: false })}
                                                    className="p-2.5 bg-white/5 hover:bg-red-500/10 text-white/20 hover:text-red-400 rounded-xl transition-all active:scale-95"
                                                    title="Eliminar cupón"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center text-white/20 italic">
                                        No se encontraron cupones registrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    page={page}
                    totalPages={totalPages}
                    total={total}
                    pageSize={PAGE_SIZE}
                    loading={loading}
                    onPageChange={setPage}
                    activeClass="bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                />
            </div>

            <CreateCouponModal
                isOpen={showCreateModal}
                submitting={isCreating}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreateCoupon}
            />

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, couponId: null, loading: false })}
                onConfirm={handleDeleteCoupon}
                title="Eliminar Cupón"
                message="¿Estás seguro de que quieres eliminar este código promocional? Esta acción no se puede deshacer y el código dejará de funcionar inmediatamente."
                type="danger"
                confirmText="ELIMINAR AHORA"
                loading={confirmModal.loading}
            />
        </div>
    );
}
