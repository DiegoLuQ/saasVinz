"use client";

import React, { useMemo, useState } from 'react';
import { Building2, Plus, Search, Edit2, Trash2, Loader2, Percent } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import Modal from '@/components/tenant/Modal';
import DeleteConfirmationModal from '@/components/tenant/DeleteConfirmationModal';
import { usePermissions } from '@/app/(tenant)/tenant/context/PermissionContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { describeTerms, termsFromOption, type Agreement } from '@/lib/tenant/orders/agreements';

/**
 * Convenios con empresas: descuentos para sus clientes en planes, ánforas y un
 * servicio especial. Se aplican en la orden (Editar Orden → Comercial). Distinto
 * de las veterinarias, que derivan clientes y cobran comisión.
 */

interface ServiceOption { id: number; name: string; is_special?: boolean; is_active?: boolean }

type Draft = {
    id?: number;
    name: string;
    rut: string;
    plans_discount_pct: number;
    products_discount_pct: number;
    special_service_id: number | null;
    special_service_discount_pct: number;
    notes: string;
    is_active: boolean;
};

const EMPTY: Draft = {
    name: '', rut: '', plans_discount_pct: 0, products_discount_pct: 0,
    special_service_id: null, special_service_discount_pct: 0, notes: '', is_active: true,
};

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });
const QK = ['agreements'];

function formatRut(raw: string): string {
    let val = raw.replace(/[^0-9kK]/g, '');
    if (val.length > 9) val = val.slice(0, 9);
    if (val.length > 1) {
        const body = val.slice(0, -1);
        const dv = val.slice(-1).toUpperCase();
        val = `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
    }
    return val;
}

const inputCls = 'w-full bg-background border border-border rounded-2xl py-3 px-4 outline-none focus:border-primary/50 text-sm';

function PctInput({ id, label, value, onChange, disabled }: { id: string; label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
    return (
        <div className="space-y-2">
            <label htmlFor={id} className="text-sm font-bold text-muted-foreground ml-1">{label}</label>
            <div className="relative">
                <input
                    id={id}
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    disabled={disabled}
                    value={value}
                    onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                    className={`${inputCls} pr-10 disabled:opacity-50`}
                />
                <Percent size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
        </div>
    );
}

export default function AgreementsPage() {
    const { showToast } = useToast();
    const { canCreate, canEdit, canDelete } = usePermissions();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState('');
    const [draft, setDraft] = useState<Draft | null>(null);
    const [toDelete, setToDelete] = useState<Agreement | null>(null);

    const { data: agreements = [], isLoading } = useQuery<Agreement[]>({
        queryKey: QK,
        queryFn: () => apiRequest('/api/internal/agreements'),
    });

    const { data: services = [] } = useQuery<ServiceOption[]>({
        queryKey: ['services-for-agreements'],
        queryFn: () => apiRequest('/api/internal/services/'),
        staleTime: 1000 * 60 * 5,
    });
    // Servicios especiales (Catálogo de Servicios → «Servicio especial»); se conserva el ya asignado aunque cambie.
    const specialServices = useMemo(
        () => services.filter(s => s.is_special || s.id === draft?.special_service_id),
        [services, draft?.special_service_id]
    );

    const saveMutation = useMutation({
        mutationFn: (d: Draft) => {
            const { id: _id, ...rest } = d;
            const payload = {
                ...rest,
                rut: d.rut || null,
                notes: d.notes || null,
                special_service_discount_pct: d.special_service_id ? d.special_service_discount_pct : 0,
            };
            return apiRequest(d.id ? `/api/internal/agreements/${d.id}` : '/api/internal/agreements', {
                method: d.id ? 'PUT' : 'POST',
                body: JSON.stringify(payload),
            });
        },
        onSuccess: (_r, d) => {
            showToast(d.id ? 'Convenio actualizado' : 'Convenio creado', 'success');
            setDraft(null);
            queryClient.invalidateQueries({ queryKey: QK });
        },
        onError: (err: Error) => showToast(err.message, 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiRequest(`/api/internal/agreements/${id}`, { method: 'DELETE' }),
        onSuccess: (r: { deactivated?: boolean }) => {
            showToast(r?.deactivated ? 'El convenio tiene órdenes: quedó inactivo' : 'Convenio eliminado', 'success');
            setToDelete(null);
            queryClient.invalidateQueries({ queryKey: QK });
        },
        onError: (err: Error) => { showToast(err.message, 'error'); setToDelete(null); },
    });

    const filtered = agreements.filter(a => {
        const q = search.toLowerCase();
        return a.name.toLowerCase().includes(q) || (a.rut || '').toLowerCase().includes(q);
    });

    const openEdit = (a: Agreement) => setDraft({
        id: a.id, name: a.name, rut: a.rut || '',
        plans_discount_pct: a.plans_discount_pct, products_discount_pct: a.products_discount_pct,
        special_service_id: a.special_service_id ?? null, special_service_discount_pct: a.special_service_discount_pct,
        notes: a.notes || '', is_active: a.is_active,
    });

    const set = (patch: Partial<Draft>) => setDraft(d => (d ? { ...d, ...patch } : d));

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Convenios con empresas</h1>
                    <p className="text-muted-foreground mt-1">
                        Descuentos para clientes de empresas con convenio. Se aplican en la orden, sección Comercial.
                    </p>
                </div>
                {canCreate('clientes') && (
                    <button
                        onClick={() => setDraft({ ...EMPTY })}
                        className="bg-primary text-primary-foreground font-bold py-3 px-6 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all text-sm"
                    >
                        <Plus className="mr-2" size={18} />
                        Nuevo convenio
                    </button>
                )}
            </div>

            <div className="glass-card rounded-3xl p-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o RUT..."
                        aria-label="Buscar convenio"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-primary/50 transition-all text-sm"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="h-64 flex items-center justify-center">
                    <Loader2 className="animate-spin text-primary" size={40} />
                </div>
            ) : (
                <div className="glass-card rounded-3xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left min-w-[640px]">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Empresa / RUT</th>
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Descuentos</th>
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Uso</th>
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filtered.map(a => (
                                <tr key={a.id} className={`hover:bg-white/[0.02] transition-colors ${a.is_active ? '' : 'opacity-60'}`}>
                                    <td className="px-6 py-5 font-bold">
                                        <div className="flex items-center">
                                            <div className="p-2 rounded-lg bg-sky-500/10 mr-3 text-sky-500"><Building2 size={18} /></div>
                                            <div>
                                                <p className="flex items-center gap-2">
                                                    {a.name}
                                                    {!a.is_active && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Inactivo</span>}
                                                </p>
                                                <p className="text-xs text-muted-foreground font-normal mt-0.5">{a.rut || 'Sin RUT'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-sm">{describeTerms(termsFromOption(a))}</td>
                                    <td className="px-6 py-5 text-right text-sm">
                                        <p className="font-bold">{a.orders_count} {a.orders_count === 1 ? 'orden' : 'órdenes'}</p>
                                        <p className="text-xs text-muted-foreground">−{CLP.format(a.total_discount)} descontado</p>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {canEdit('clientes') && (
                                                <button onClick={() => openEdit(a)} aria-label={`Editar ${a.name}`} className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground">
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                            {canDelete('clientes') && (
                                                <button onClick={() => setToDelete(a)} aria-label={`Eliminar ${a.name}`} className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground italic">
                                        {agreements.length === 0 ? 'Aún no hay convenios. Crea el primero con «Nuevo convenio».' : 'No se encontraron convenios.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal isOpen={!!draft} onClose={() => setDraft(null)} title={draft?.id ? 'Editar convenio' : 'Nuevo convenio'}>
                {draft && (
                    <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(draft); }} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="ag-name" className="text-sm font-bold text-muted-foreground ml-1">Nombre de la empresa</label>
                                <input id="ag-name" required minLength={2} maxLength={120} value={draft.name} onChange={(e) => set({ name: e.target.value })} className={inputCls} />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="ag-rut" className="text-sm font-bold text-muted-foreground ml-1">RUT</label>
                                <input id="ag-rut" value={draft.rut} onChange={(e) => set({ rut: formatRut(e.target.value) })} placeholder="76.123.456-7" className={inputCls} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <PctInput id="ag-plans" label="Descuento en planes" value={draft.plans_discount_pct} onChange={(v) => set({ plans_discount_pct: v })} />
                            <PctInput id="ag-products" label="Descuento en ánforas y productos" value={draft.products_discount_pct} onChange={(v) => set({ products_discount_pct: v })} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="ag-special" className="text-sm font-bold text-muted-foreground ml-1">Servicio especial</label>
                                <select
                                    id="ag-special"
                                    value={draft.special_service_id ?? ''}
                                    onChange={(e) => set({ special_service_id: e.target.value ? Number(e.target.value) : null })}
                                    className={inputCls}
                                >
                                    <option value="">Ninguno</option>
                                    {specialServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                {specialServices.length === 0 && (
                                    <p className="text-xs text-muted-foreground ml-1">
                                        No hay servicios especiales. Márcalos en Catálogo de Servicios → «Servicio especial».
                                    </p>
                                )}
                            </div>
                            <PctInput
                                id="ag-special-pct"
                                label="Descuento en el servicio especial"
                                value={draft.special_service_discount_pct}
                                onChange={(v) => set({ special_service_discount_pct: v })}
                                disabled={!draft.special_service_id}
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="ag-notes" className="text-sm font-bold text-muted-foreground ml-1">Notas (opcional)</label>
                            <textarea id="ag-notes" rows={2} maxLength={300} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Ej. presentar credencial de la empresa" className={inputCls} />
                        </div>

                        <label className="flex items-center gap-3 text-sm font-bold cursor-pointer">
                            <input type="checkbox" checked={draft.is_active} onChange={(e) => set({ is_active: e.target.checked })} className="w-4 h-4 accent-primary" />
                            Convenio activo (aparece en las órdenes)
                        </label>

                        <p className="text-xs text-muted-foreground">
                            Cambiar los porcentajes no modifica las órdenes ya registradas: cada orden guarda las condiciones con que se creó.
                        </p>

                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <button type="button" onClick={() => setDraft(null)} className="px-6 py-3 rounded-2xl hover:bg-muted font-bold transition-all">Cancelar</button>
                            <button type="submit" disabled={saveMutation.isPending} className="bg-primary text-primary-foreground px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center">
                                {saveMutation.isPending && <Loader2 className="animate-spin mr-2" size={18} />}
                                Guardar
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            <DeleteConfirmationModal
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={() => toDelete && deleteMutation.mutate(toDelete.id)}
                title="¿Eliminar convenio?"
                description={toDelete?.orders_count
                    ? `"${toDelete.name}" tiene órdenes: quedará inactivo y las órdenes conservan su descuento.`
                    : `Estás a punto de eliminar "${toDelete?.name}".`}
                isDeleting={deleteMutation.isPending}
            />
        </div>
    );
}
