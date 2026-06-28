import React from 'react';
import { Plus, Search } from 'lucide-react';

interface DashboardHeaderProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    onNewTenant: () => void;
}

export default function DashboardHeader({
    searchQuery,
    onSearchChange,
    onNewTenant
}: DashboardHeaderProps) {
    return (
        <header className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-black mb-1">Vista General</h1>
                <p className="text-white/40">Bienvenido de vuelta, Creador.</p>
            </div>
            <div className="flex gap-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                    <input
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Buscar empresa..."
                        className="bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 w-64 text-xs outline-none focus:border-primary/50"
                    />
                </div>
                <button
                    onClick={onNewTenant}
                    className="bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                    <Plus size={18} /> Nuevo Tenant
                </button>
            </div>
        </header>
    );
}
