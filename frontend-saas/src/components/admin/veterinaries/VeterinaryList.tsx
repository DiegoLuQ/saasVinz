import { useState, useEffect, useCallback } from 'react';
import { getVeterinaries, deleteVeterinary, Veterinary, VeterinaryListItem, VeterinaryCrematorio } from '@/lib/admin/api';
import CreateVeterinaryModal from './CreateVeterinaryModal';
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

const PAGE_SIZE = 20;
const MAX_CHIPS = 2;

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
    active: { label: 'Activo', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    pending: { label: 'Pendiente', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    rejected: { label: 'Rechazado', cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

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
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                            Clínica
                                        </th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                            RUT
                                        </th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                            Email / Usuario
                                        </th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                            Crematorios
                                        </th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                            Estado
                                        </th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                            Fecha Alta
                                        </th>
                                        <th scope="col" className="relative px-6 py-4">
                                            <span className="sr-only">Acciones</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 bg-transparent">
                                    {vets.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                                                {debouncedSearch
                                                    ? `No hay veterinarias que coincidan con "${debouncedSearch}".`
                                                    : 'No se encontraron veterinarias registradas.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        vets.map((vet) => (
                                            <tr key={vet.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-white">{vet.name}</div>
                                                    <div className="text-sm text-gray-500">{vet.slug}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                    {vet.rut}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                    {vet.email}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <CrematoriosCell crematorios={vet.crematorios} />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-medium rounded-full border ${vet.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                                        {vet.is_active ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                    {new Date(vet.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end gap-3">
                                                        <button
                                                            onClick={() => handleEdit(vet)}
                                                            className="text-sky-400 hover:text-sky-300 transition-colors p-1 rounded-lg hover:bg-sky-500/10"
                                                            title="Editar"
                                                        >
                                                            <Pencil size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(vet)}
                                                            className="text-gray-500 hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-rose-500/10"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
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
