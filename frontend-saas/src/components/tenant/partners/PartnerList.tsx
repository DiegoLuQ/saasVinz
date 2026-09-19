import { useState, useEffect } from 'react';
import { getMyPartners, getAvailablePartners, PartnerLink, VeterinaryBase } from '@/lib/tenant/api';
import LinkVeterinaryModal from './LinkVeterinaryModal';
import QuickCreatePartnerModal from './QuickCreatePartnerModal';
import { Plus, RefreshCw, Mail, Phone, MapPin, Search, Building2, Percent } from 'lucide-react';
import { useCurrentTenant } from '@/hooks/useSessionBootstrap';

export default function PartnerList() {
    const [links, setLinks] = useState<PartnerLink[]>([]);
    const [filteredLinks, setFilteredLinks] = useState<PartnerLink[]>([]);
    const [availableVets, setAvailableVets] = useState<VeterinaryBase[]>([]);
    const [activeTab, setActiveTab] = useState<'my_partners' | 'explore'>('my_partners');

    const [loading, setLoading] = useState(true);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [isQuickCreateModalOpen, setIsQuickCreateModalOpen] = useState(false);
    const [selectedVetToInvite, setSelectedVetToInvite] = useState<VeterinaryBase | null>(null);

    // Auto-filter by Tenant Location
    const tenant = useCurrentTenant();

    const loadLinks = async () => {
        setLoading(true);
        try {
            const [myPartners, available] = await Promise.all([
                getMyPartners(),
                getAvailablePartners()
            ]);
            setLinks(myPartners);
            setFilteredLinks(myPartners);
            setAvailableVets(available);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLinks();
    }, []);

    // Sincronizar los partners vinculados al tenant
    useEffect(() => {
        setFilteredLinks(links);
    }, [links]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">Activo</span>;
            case 'pending':
                return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pendiente</span>;
            case 'rejected':
                return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Rechazado</span>;
            default:
                return status;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Gestión de Partners</h2>
                    <p className="text-gray-400 text-sm mt-1">Administra tus alianzas estratégicas y expande tu red.</p>
                </div>

                <div className="flex gap-2">
                    <button onClick={loadLinks} className="p-2 text-gray-400 hover:text-white transition-colors bg-white/5 rounded-lg border border-white/10">
                        <RefreshCw className="h-5 w-5" />
                    </button>
                    {activeTab === 'my_partners' && (
                        <>
                            <button
                                onClick={() => setIsQuickCreateModalOpen(true)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-xl shadow-lg text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none transition-all hover:scale-[1.02]"
                            >
                                <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                                Registrar Veterinaria
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedVetToInvite(null);
                                    setIsLinkModalOpen(true);
                                }}
                                className="inline-flex items-center px-3.5 py-2 border border-white/10 text-xs font-bold rounded-xl text-gray-300 bg-white/5 hover:bg-white/10 transition-all"
                            >
                                Vincular del Catálogo
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-white/10">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('my_partners')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeTab === 'my_partners'
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'}
                        `}
                    >
                        Mis Partners ({filteredLinks.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('explore')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeTab === 'explore'
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'}
                        `}
                    >
                        Explorar Catálogo Global ({availableVets.length})
                    </button>
                </nav>
            </div>

            {/* Content Area */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-x-auto shadow-2xl backdrop-blur-sm">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-r-transparent"></div>
                        <p className="mt-2 text-sm text-gray-400">Cargando veterinarias...</p>
                    </div>
                ) : (
                    <>
                        {/* MY PARTNERS TAB */}
                        {activeTab === 'my_partners' && (
                            <table className="min-w-full divide-y divide-white/5">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Veterinaria</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Contacto</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Comisión</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Ubicación</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredLinks.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                                                No tienes convenios con veterinarias registrados todavía.
                                                <br />
                                                <button
                                                    onClick={() => setIsQuickCreateModalOpen(true)}
                                                    className="text-emerald-400 hover:text-emerald-300 font-medium mt-2 underline"
                                                >
                                                    ¡Registra tu primera veterinaria aliada aquí!
                                                </button>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredLinks.map((link) => (
                                            <tr key={link.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <div className="text-sm font-bold text-white">{link.veterinary.name}</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">{link.veterinary.rut || 'Sin RUT'}</div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap text-sm">
                                                    <div className="flex flex-col space-y-1.5">
                                                        {link.veterinary.email && (
                                                            <div className="flex items-center text-gray-400">
                                                                <Mail className="w-3.5 h-3.5 mr-2 text-sky-500/70" />
                                                                {link.veterinary.email}
                                                            </div>
                                                        )}
                                                        {link.veterinary.phone && (
                                                            <div className="flex items-center text-gray-400">
                                                                <Phone className="w-3.5 h-3.5 mr-2 text-sky-500/70" />
                                                                {link.veterinary.phone}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap text-sm">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                                        <Percent size={12} className="mr-1" />
                                                        {link.porcentaje_comision || 0}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap text-sm">
                                                    <div className="font-medium text-gray-300">{link.veterinary.city || '-'}</div>
                                                    <div className="text-xs text-gray-500">{link.veterinary.region || ''}</div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    {getStatusBadge(link.status)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* EXPLORE TAB */}
                        {activeTab === 'explore' && (
                            <table className="min-w-full divide-y divide-white/5">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Veterinaria</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Ubicación</th>
                                        <th scope="col" className="relative px-6 py-4">
                                            <span className="sr-only">Acciones</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {availableVets.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-12 text-center text-gray-500 italic">
                                                No encontramos veterinarias nuevas disponibles en tu zona.
                                            </td>
                                        </tr>
                                    ) : (
                                        availableVets.map((vet) => (
                                            <tr key={vet.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <div className="text-base font-bold text-white">{vet.name}</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">RUT: {vet.rut || 'N/A'}</div>
                                                    {vet.address && <div className="text-xs text-gray-400 mt-1 italic">{vet.address}</div>}
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap text-sm">
                                                    <div className="font-medium text-gray-300">{vet.city || '-'}</div>
                                                    <div className="text-xs text-gray-500">{vet.region || ''}</div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedVetToInvite(vet);
                                                            setIsLinkModalOpen(true);
                                                        }}
                                                        className="inline-flex items-center px-3 py-1.5 border border-indigo-500/30 shadow-sm text-xs font-medium rounded-lg text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 focus:outline-none transition-all"
                                                    >
                                                        <Mail className="w-3.5 h-3.5 mr-1.5" />
                                                        Invitar / Conectar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </>
                )}
            </div>

            <QuickCreatePartnerModal
                isOpen={isQuickCreateModalOpen}
                onClose={() => setIsQuickCreateModalOpen(false)}
                onSuccess={() => {
                    loadLinks();
                }}
            />

            <LinkVeterinaryModal
                isOpen={isLinkModalOpen}
                onClose={() => {
                    setIsLinkModalOpen(false);
                    setSelectedVetToInvite(null);
                }}
                preSelectedVet={selectedVetToInvite}
                onSuccess={() => {
                    loadLinks();
                }}
            />
        </div>
    );
}
