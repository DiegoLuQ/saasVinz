"use client";

import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/tenant/api';
import { Plus, Search, Copy, ExternalLink, RefreshCw, Loader2, DollarSign, Store, Landmark } from 'lucide-react';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { useTenant } from '@/app/(tenant)/tenant/context/TenantContext';
import PartnerModal from './PartnerModal';
import BankDetailsModal from './BankDetailsModal';
import { copyToClipboard } from '@/lib/clipboard';


export default function PartnersPage() {
    const { showToast } = useToast();
    const { tenantData } = useTenant();
    const [partners, setPartners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [selectedPartner, setSelectedPartner] = useState<any>(null);

    const fetchPartners = async () => {
        setLoading(true);
        try {
            const data = await apiRequest('/api/internal/partners');
            setPartners(data);
        } catch (err) {
            console.error(err);
            showToast('Error al cargar veterinarias', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPartners();
    }, []);

    const handleCopyLink = async (slug: string) => {
        // Construct public URL - assuming localhost:3001 for public frontend based on common setup or env?
        const publicUrl = `http://localhost:3001/registro/${slug}`;
        const success = await copyToClipboard(publicUrl);
        if (success) {
            showToast('Enlace público copiado', 'success');
        } else {
            showToast('Error al copiar. Por favor selecciona el texto manualmente.', 'error');
        }
    };

    const handleCopyCode = (code: string) => {
        // Wait, the backend hashes the code! We cannot retrieve it to copy it after creation.
        // We can only copy it DURING creation or reset it.
        // The list endpoint probably won't return the raw code if it's hashed.
        // Checking backend: `codigo_acceso=hashed_code`.
        // So I cannot copy it from the list. I should remove this button or make it "Reset Code".
        // For now I will disable it or remove it.
        showToast('El código solo es visible al crearlo. Debes restablecerlo si se perdió.', 'info');
    };

    const filteredPartners = partners.filter(p =>
        p.nombre_clinica.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.slug_publico.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Store className="text-primary" />
                        Veterinarias & Partners
                    </h1>
                    <p className="text-muted-foreground mt-1 text-lg">Gestiona afiliados y genera enlaces de referidos.</p>
                </div>
                <button
                    onClick={() => { setSelectedPartner(null); setIsModalOpen(true); }}
                    className="bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center gap-2"
                >
                    <Plus size={20} />
                    Nueva Veterinaria
                </button>
            </div>

            {/* Stats Cards (Mock for now) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 rounded-3xl">
                    <p className="text-sm font-bold text-muted-foreground uppercase">Total Partners</p>
                    <h3 className="text-3xl font-bold mt-2">{partners.length}</h3>
                </div>
                <div className="glass-card p-6 rounded-3xl">
                    <p className="text-sm font-bold text-muted-foreground uppercase">Comisión Promedio</p>
                    <div className="text-3xl font-bold mt-2 flex items-baseline gap-2">
                        {(() => {
                            if (partners.length === 0) return <>
                                <span className="text-emerald-400">0.0%</span>
                                <span className="text-white/10 font-light">|</span>
                                <span className="text-blue-400">$0</span>
                            </>;

                            const totalPercent = partners.reduce((acc, curr) => acc + (Number(curr.porcentaje_comision) || 0), 0);
                            const totalFixed = partners.reduce((acc, curr) => acc + (Number(curr.monto_comision) || 0), 0);

                            const avgPercent = (totalPercent / partners.length).toFixed(1);
                            const avgFixed = Math.round(totalFixed / partners.length);

                            return (
                                <>
                                    <span className="text-emerald-400">{avgPercent}%</span>
                                    <span className="text-white/10 font-light">|</span>
                                    <span className="text-blue-400">
                                        {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(avgFixed)}
                                    </span>
                                </>
                            );
                        })()}
                    </div>
                </div>
                <div className="glass-card p-6 rounded-3xl">
                    <p className="text-sm font-bold text-muted-foreground uppercase">Referidos este mes</p>
                    <h3 className="text-3xl font-bold mt-2 text-blue-400">0</h3>
                </div>
            </div>

            {/* List */}
            <div className="glass-card rounded-[2.5rem] overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-white/5 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o slug..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-background/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:border-primary/50 transition-all"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <Loader2 className="animate-spin text-primary" size={40} />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white/2 border-b border-white/5">
                                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Veterinaria</th>
                                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Contacto</th>
                                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Slug / Link</th>
                                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Comisión</th>
                                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredPartners.length > 0 ? filteredPartners.map((partner) => (
                                    <tr key={partner.id_partner} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-8 py-6">
                                            <div>
                                                <p className="font-bold text-base">{partner.nombre_clinica}</p>
                                                <p className="text-xs text-muted-foreground mt-1">{partner.rut_clinica || 'Sin RUT'}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-sm">
                                            <p>{partner.email || '-'}</p>
                                            <p className="text-muted-foreground text-xs">{partner.telefono || '-'}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-white/5 px-2 py-1 rounded text-xs font-mono text-muted-foreground">
                                                    /{partner.slug_publico}
                                                </span>
                                                <button
                                                    onClick={() => handleCopyLink(partner.slug_publico)}
                                                    className="p-1 hover:text-primary transition-colors"
                                                    title="Copiar Link Público"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl w-fit border border-white/5">
                                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${partner.tipo_comision !== 'fijo' ? 'bg-emerald-500 text-[#020617] shadow-lg shadow-emerald-500/20' : 'text-muted-foreground'}`}>
                                                    {partner.porcentaje_comision || 0}%
                                                </span>
                                                <span className="text-white/10 text-[10px]">|</span>
                                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${partner.tipo_comision === 'fijo' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-muted-foreground'}`}>
                                                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(partner.monto_comision || 0)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => { setSelectedPartner(partner); setIsBankModalOpen(true); }}
                                                    className="p-2 hover:bg-white/5 rounded-lg text-emerald-400 hover:text-emerald-300 transition-colors"
                                                    title="Datos Bancarios"
                                                >
                                                    <Landmark size={18} />
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedPartner(partner); setIsModalOpen(true); }}
                                                    className="p-2 hover:bg-white/5 rounded-lg text-blue-400 hover:text-blue-300 transition-colors"
                                                    title="Editar"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                                        <path d="m15 5 4 4" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => showToast('Función de eliminar próximamente', 'info')}
                                                    className="p-2 hover:bg-white/5 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M3 6h18" />
                                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                        <line x1="10" x2="10" y1="11" y2="17" />
                                                        <line x1="14" x2="14" y1="11" y2="17" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-20 text-muted-foreground">
                                            No se encontraron veterinarias.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <PartnerModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchPartners}
                partner={selectedPartner}
            />
            <BankDetailsModal
                isOpen={isBankModalOpen}
                onClose={() => setIsBankModalOpen(false)}
                onSuccess={fetchPartners}
                partner={selectedPartner}
            />
        </div>
    );
}
