'use client';
import VeterinaryList from '@/components/admin/veterinaries/VeterinaryList';

export default function VeterinariesPage() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
            <div className="pb-5 border-b border-white/10 sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl leading-6 font-semibold text-white">Gestión de Veterinarias Globales</h1>
                    <p className="mt-2 max-w-4xl text-sm text-gray-400">
                        Administra el directorio maestro de clínicas veterinarias. Los tenants pueden vincularse a estas entidades.
                    </p>
                </div>
            </div>

            <div className="mt-8">
                <VeterinaryList />
            </div>
        </div>
    );
}
