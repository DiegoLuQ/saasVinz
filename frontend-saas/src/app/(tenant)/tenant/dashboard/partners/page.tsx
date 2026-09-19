'use client';
import Link from 'next/link';
import PartnerList from '@/components/tenant/partners/PartnerList';
import { Store, DollarSign } from 'lucide-react';

export default function PartnersPage() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
                        <Store className="text-primary" />
                        Gestión de Partners (Veterinarias)
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Vincula tu crematorio con el Catálogo Global de Veterinarias para recibir solicitudes y coordinar comisiones.
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10 shrink-0">
                    <button
                        type="button"
                        className="px-4 py-2 rounded-xl text-xs font-black bg-primary text-black shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                        <Store size={14} />
                        Listado de Partners
                    </button>
                    <Link
                        href="/dashboard/partners/comisiones"
                        className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-white hover:bg-white/5 transition-all flex items-center gap-2"
                    >
                        <DollarSign size={14} />
                        Liquidación de Comisiones
                    </Link>
                </div>
            </div>

            <div className="mt-4">
                <PartnerList />
            </div>
        </div>
    );
}
