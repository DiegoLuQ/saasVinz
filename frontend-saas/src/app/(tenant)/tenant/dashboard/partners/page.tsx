'use client';
import PartnerList from '@/components/tenant/partners/PartnerList';

export default function PartnersPage() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
            <div className="pb-5 border-b border-border">
                <h1 className="text-2xl leading-6 font-semibold text-foreground">Gestión de Partners (Veterinarias)</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Vincula tu crematorio con Catálogo Global de Veterinarias para recibir solicitudes y gestionar comisiones.
                </p>
            </div>

            <div className="mt-8">
                <PartnerList />
            </div>
        </div>
    );
}
