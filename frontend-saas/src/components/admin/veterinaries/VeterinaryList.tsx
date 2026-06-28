import { useState, useEffect } from 'react';
import { getVeterinaries, deleteVeterinary, Veterinary } from '@/lib/admin/api';
import CreateVeterinaryModal from './CreateVeterinaryModal';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { useAdminVets, useAdminBootstrap } from '@/hooks/useAdminBootstrap';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

export default function VeterinaryList() {
    const { showToast } = useToast();
    const bootstrapVets = useAdminVets();
    const { refetch: refetchBootstrap } = useAdminBootstrap();
    const [vets, setVets] = useState<Veterinary[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingVet, setEditingVet] = useState<Veterinary | null>(null);

    const loadVets = async () => {
        if (!search && bootstrapVets.length > 0) {
            setVets(bootstrapVets);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const data = await getVeterinaries(search);
            setVets(data);
        } catch (error) {
            console.error('Error loading vets:', error);
        } finally {
            setLoading(false);
        }
    };

    // Initialize from bootstrap
    useEffect(() => {
        if (bootstrapVets && bootstrapVets.length > 0 && !search) {
            setVets(bootstrapVets);
            setLoading(false);
        }
    }, [bootstrapVets]);

    useEffect(() => {
        if (search) {
            const timer = setTimeout(() => {
                loadVets();
            }, 500);
            return () => clearTimeout(timer);
        } else if (bootstrapVets.length > 0) {
            setVets(bootstrapVets);
            setLoading(false);
        } else {
            loadVets();
        }
    }, [search]);

    const handleCreate = () => {
        setEditingVet(null);
        setIsCreateModalOpen(true);
    };

    const handleEdit = (vet: Veterinary) => {
        setEditingVet(vet);
        setIsCreateModalOpen(true);
    };

    const handleDelete = async (vet: Veterinary) => {
        if (confirm(`¿Estás seguro de eliminar la veterinaria "${vet.name}"? Esta acción no se puede deshacer.`)) {
            try {
                await deleteVeterinary(vet.id);
                // Optimistic update or reload
                setVets(prev => prev.filter(v => v.id !== vet.id));
                refetchBootstrap(); // Refresh global cache
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
                {loading ? (
                    <div className="p-10 text-center text-gray-400">Cargando veterinarias...</div>
                ) : (
                    <div className="overflow-x-auto">
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
                                        <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                            No se encontraron veterinarias registradas.
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
                )}
            </div>

            <CreateVeterinaryModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                initialData={editingVet}
                onSuccess={() => {
                    loadVets();
                    refetchBootstrap(); // Refresh global cache
                }}
            />
        </div>
    );
}
