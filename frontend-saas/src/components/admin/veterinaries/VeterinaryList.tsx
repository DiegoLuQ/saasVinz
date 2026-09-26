import React, { useState, useEffect, useCallback } from 'react';
import { getVeterinaries, deleteVeterinary, Veterinary, VeterinaryListItem, VeterinaryCrematorio } from '@/lib/admin/api';
import CreateVeterinaryModal from './CreateVeterinaryModal';
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

const PAGE_SIZE = 20;
const MAX_CHIPS = 2;

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
    active: { label: 'Activo', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    pending: { label: 'Pendiente', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    rejected: { label: 'Rechazado', cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function formatComision(c: VeterinaryCrematorio): string {
    return c.tipo_comision === 'fijo' ? `${clp.format(c.monto_comision || 0)} fijo` : `${c.porcentaje_comision || 0}%`;
}

/** Detalle por crematorio: estado, comisión del vínculo, derivaciones y clientes. */
function CrematoriosDetail({ crematorios }: { crematorios: VeterinaryCrematorio[] }) {
    if (crematorios.length === 0) {
        return <p className="text-sm text-gray-500 py-2">Esta veterinaria aún no está asociada a ningún crematorio.</p>;
    }
    return (
        <table className="min-w-full text-sm">
            <thead>
                <tr className="text-xs uppercase tracking-wider text-gray-500">
                    <th scope="col" className="text-left font-medium py-2 pr-4">Crematorio</th>
                    <th scope="col" className="text-left font-medium py-2 pr-4">Estado</th>
                    <th scope="col" className="text-left font-medium py-2 pr-4">Comisión</th>
                    <th scope="col" className="text-right font-medium py-2 pr-4">Derivaciones</th>
                    <th scope="col" className="text-right font-medium py-2">Clientes</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {crematorios.map((c) => {
                    const st = STATUS_STYLES[c.status] ?? { label: c.status, cls: 'bg-white/5 text-gray-400 border-white/10' };
                    return (
                        <tr key={c.link_id}>
                            <td className="py-2 pr-4 text-white font-medium">{c.tenant_name}</td>
                            <td className="py-2 pr-4">
                                <span className={`px-2 py-0.5 text-xs rounded-full border ${st.cls}`}>{st.label}</span>
                            </td>
                            <td className="py-2 pr-4 text-gray-300">{formatComision(c)}</td>
                            <td className="py-2 pr-4 text-right text-gray-300 tabular-nums">{c.derivaciones}</td>
                            <td className="py-2 text-right text-gray-300 tabular-nums">{c.clientes}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

/** Crematorios asociados (relación N:M): primeros MAX_CHIPS como chips y el resto como "+N". */
function CrematoriosCell({ crematorios }: { crematorios: VeterinaryCrematorio[] }) {
    if (crematorios.length === 0) {
        return <span className="text-sm text-gray-600">Sin crematorios</span>;
    }
    const visible = crematorios.slice(0, MAX_CHIPS);
    const rest = crematorios.slice(MAX_CHIPS);
    const fullList = crematorios
        .map((c) => `${c.tenant_name} (${STATUS_STYLES[c.status]?.label ?? c.status})`)
        .join('\n');

    return (
        <div className="flex flex-wrap items-center gap-1.5 max-w-xs" title={fullList}>
            {visible.map((c) => {
                const st = STATUS_STYLES[c.status] ?? { label: c.status, cls: 'bg-white/5 text-gray-400 border-white/10' };
                return (
                    <span
                        key={c.tenant_id}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border ${st.cls}`}
                    >
                        <span className="font-medium truncate max-w-[9rem]">{c.tenant_name}</span>
                        {c.status !== 'active' && <span className="opacity-70">· {st.label}</span>}
                    </span>
                );
            })}
            {rest.length > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full border bg-white/5 text-gray-300 border-white/10">
                    +{rest.length}
                </span>
            )}
        </div>
    );
}

export default function VeterinaryList() {
    const { showToast } = useToast();
    const [vets, setVets] = useState<VeterinaryListItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingVet, setEditingVet] = useState<Veterinary | null>(null);
    const [expanded, setExpanded] = useState<Set<number>>(new Set());

    const toggleExpanded = (id: number) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    // Búsqueda con debounce: al cambiar el término se vuelve a la página 1.
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    const loadVets = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getVeterinaries(debouncedSearch, page, PAGE_SIZE);
            setVets(data.items);
            setTotal(data.total);
        } catch (error) {
            console.error('Error loading vets:', error);
            showToast('No se pudieron cargar las veterinarias', 'error');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, page, showToast]);

    useEffect(() => {
        loadVets();
    }, [loadVets]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, total);

    const handleCreate = () => {
        setEditingVet(null);
        setIsCreateModalOpen(true);
    };

    const handleEdit = (vet: Veterinary) => {
        setEditingVet(vet);
        setIsCreateModalOpen(true);
    };

    const handleDelete = async (vet: VeterinaryListItem) => {
        const vinculos = vet.crematorios.length
            ? `\n\nEstá asociada a ${vet.crematorios.length} crematorio(s): ${vet.crematorios.map((c) => c.tenant_name).join(', ')}.`
            : '';
        if (confirm(`¿Estás seguro de eliminar la veterinaria "${vet.name}"? Esta acción no se puede deshacer.${vinculos}`)) {
            try {
                await deleteVeterinary(vet.id);
                // Si era el último de la página, retroceder una página.
                if (vets.length === 1 && page > 1) setPage(page - 1);
                else loadVets();
            } catch (error) {
                console.error('Error deleting vet:', error);
                showToast('Hubo un error al eliminar la veterinaria', 'error');
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#0a192f]/60 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl">
                <div className="relative w-full sm:w-72">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-500" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all outline-none"
                        placeholder="Buscar por nombre o RUT..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button
                    onClick={handleCreate}
                    className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-xl shadow-lg shadow-sky-500/25 text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all"
                >
                    <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                    Nueva Veterinaria
                </button>
            </div>

            <div className="bg-[#0a192f]/60 backdrop-blur-xl shadow-2xl rounded-2xl border border-white/10 overflow-hidden">
                {loading && vets.length === 0 ? (
                    <div className="p-10 text-center text-gray-400">Cargando veterinarias...</div>
                ) : (
                    <>
                        <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-60' : ''}`}>
                            <table className="min-w-full divide-y divide-white/5">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th scope="col" className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Clínica</th>
                                        <th scope="col" className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Contacto</th>
                                        <th scope="col" className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Crematorios</th>
                                        <th scope="col" className="px-4 py-3.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Derivaciones</th>
                                        <th scope="col" className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</th>
                                        <th scope="col" className="relative px-4 py-3.5">
                                            <span className="sr-only">Acciones</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 bg-transparent">
                                    {vets.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                                                {debouncedSearch
                                                    ? `No hay veterinarias que coincidan con "${debouncedSearch}".`
                                                    : 'No se encontraron veterinarias registradas.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        vets.map((vet) => {
                                            const isOpen = expanded.has(vet.id);
                                            const totalDerivaciones = vet.crematorios.reduce((sum, c) => sum + c.derivaciones, 0);
                                            const totalClientes = vet.crematorios.reduce((sum, c) => sum + c.clientes, 0);
                                            return (
                                            <React.Fragment key={vet.id}>
                                            <tr className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleExpanded(vet.id)}
                                                        aria-expanded={isOpen}
                                                        aria-controls={`vet-detail-${vet.id}`}
                                                        className="flex items-center gap-2 text-left group"
                                                        title={isOpen ? 'Ocultar detalle por crematorio' : 'Ver comisión y derivaciones por crematorio'}
                                                    >
                                                        <ChevronDown size={16} className={`shrink-0 text-gray-500 group-hover:text-sky-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                                        <span className="min-w-0">
                                                            <span className="block text-sm font-medium text-white">{vet.name}</span>
                                                            <span className="block text-xs text-gray-500 truncate max-w-[14rem]">{vet.slug}</span>
                                                        </span>
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3.5 text-sm">
                                                    <div className="text-gray-300 break-all max-w-[16rem]">{vet.email}</div>
                                                    <div className="text-xs text-gray-500 whitespace-nowrap">RUT {vet.rut}</div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <CrematoriosCell crematorios={vet.crematorios} />
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap text-right">
                                                    <div className="text-sm font-medium text-white tabular-nums">{totalDerivaciones}</div>
                                                    <div className="text-xs text-gray-500">{totalClientes} {totalClientes === 1 ? 'cliente' : 'clientes'}</div>
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-medium rounded-full border ${vet.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                                        {vet.is_active ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                    <div className="mt-1 text-xs text-gray-500" title="Fecha de alta">
                                                        Alta {new Date(vet.created_at).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            onClick={() => handleEdit(vet)}
                                                            className="text-sky-400 hover:text-sky-300 transition-colors p-1.5 rounded-lg hover:bg-sky-500/10"
                                                            title="Editar"
                                                        >
                                                            <Pencil size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(vet)}
                                                            className="text-gray-500 hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-rose-500/10"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isOpen && (
                                                <tr id={`vet-detail-${vet.id}`} className="bg-white/[0.02]">
                                                    <td colSpan={6} className="px-4 pb-4 pt-1 pl-11">
                                                        <CrematoriosDetail crematorios={vet.crematorios} />
                                                    </td>
                                                </tr>
                                            )}
                                            </React.Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación */}
                        {total > 0 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-white/5 text-sm text-gray-400">
                                <span>
                                    Mostrando <span className="text-white font-medium">{from}–{to}</span> de{' '}
                                    <span className="text-white font-medium">{total}</span> veterinarias
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page <= 1 || loading}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft size={16} /> Anterior
                                    </button>
                                    <span className="px-2">
                                        {page} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={page >= totalPages || loading}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Siguiente <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <CreateVeterinaryModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                initialData={editingVet}
                onSuccess={() => loadVets()}
            />
        </div>
    );
}
