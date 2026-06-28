/**
 * Receipt Filters Component
 * Provides filtering options for receipts table
 */
'use client';

import { useState } from 'react';
import { Search, Filter } from 'lucide-react';

interface ReceiptFiltersProps {
    onFilterChange: (filters: FilterValues) => void;
}

export interface FilterValues {
    search: string;
    status: string;
    tenant_id: string;
    date_from: string;
    date_to: string;
}

export default function ReceiptFilters({ onFilterChange }: ReceiptFiltersProps) {
    const [filters, setFilters] = useState<FilterValues>({
        search: '',
        status: '',
        tenant_id: '',
        date_from: '',
        date_to: '',
    });

    const handleChange = (field: keyof FilterValues, value: string) => {
        const newFilters = { ...filters, [field]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const handleReset = () => {
        const resetFilters: FilterValues = {
            search: '',
            status: '',
            tenant_id: '',
            date_from: '',
            date_to: '',
        };
        setFilters(resetFilters);
        onFilterChange(resetFilters);
    };

    return (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-white/60" />
                <h3 className="text-lg font-bold text-white">Filtros</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search */}
                <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-white/60 mb-2">
                        Buscar por número
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input
                            type="text"
                            placeholder="R-000001"
                            value={filters.search}
                            onChange={(e) => handleChange('search', e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Status */}
                <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">
                        Estado
                    </label>
                    <select
                        value={filters.status}
                        onChange={(e) => handleChange('status', e.target.value)}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">Todos</option>
                        <option value="active">Activo</option>
                        <option value="voided">Anulado</option>
                        <option value="replaced">Reemplazado</option>
                    </select>
                </div>

                {/* Date From */}
                <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">
                        Desde
                    </label>
                    <input
                        type="date"
                        value={filters.date_from}
                        onChange={(e) => handleChange('date_from', e.target.value)}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Date To */}
                <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">
                        Hasta
                    </label>
                    <input
                        type="date"
                        value={filters.date_to}
                        onChange={(e) => handleChange('date_to', e.target.value)}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Reset Button */}
            <div className="mt-4 flex justify-end">
                <button
                    onClick={handleReset}
                    className="px-4 py-2 text-sm font-medium text-white/70 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                    Limpiar Filtros
                </button>
            </div>
        </div>
    );
}
