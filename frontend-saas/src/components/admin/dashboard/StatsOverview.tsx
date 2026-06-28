import React from 'react';
import { Users, Activity, CalendarClock, DollarSign } from 'lucide-react';

interface StatsOverviewProps {
    totalTenants: number;
    activeTenants: number;
    totalRevenue: number;
    dueIn7Days?: number;
}

export default function StatsOverview({
    totalTenants,
    activeTenants,
    totalRevenue,
    dueIn7Days = 0,
}: StatsOverviewProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-primary/20 transition-all" />
                <div className="flex items-center gap-3 mb-4 text-white/40">
                    <Users size={18} /> <span className="font-bold text-xs uppercase tracking-wider">Total Empresas</span>
                </div>
                <div className="text-4xl font-black">{totalTenants}</div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-green-500/20 transition-all" />
                <div className="flex items-center gap-3 mb-4 text-white/40">
                    <Activity size={18} /> <span className="font-bold text-xs uppercase tracking-wider">Tenants Activos</span>
                </div>
                <div className="text-4xl font-black">{activeTenants}</div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-purple-500/20 transition-all" />
                <div className="flex items-center gap-3 mb-4 text-white/40">
                    <DollarSign size={18} /> <span className="font-bold text-xs uppercase tracking-wider">Ingresos MRR</span>
                </div>
                <div className="text-4xl font-black">${totalRevenue.toLocaleString()}</div>
            </div>

            <div className={`border rounded-3xl p-6 relative overflow-hidden group transition-all ${
                dueIn7Days > 0
                    ? 'bg-orange-500/10 border-orange-500/20'
                    : 'bg-white/5 border-white/10'
            }`}>
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 transition-all ${
                    dueIn7Days > 0 ? 'bg-orange-500/20 group-hover:bg-orange-500/30' : 'bg-orange-500/5 group-hover:bg-orange-500/10'
                }`} />
                <div className={`flex items-center gap-3 mb-4 ${dueIn7Days > 0 ? 'text-orange-400' : 'text-white/40'}`}>
                    <CalendarClock size={18} /> <span className="font-bold text-xs uppercase tracking-wider">Vencen en 7 días</span>
                </div>
                <div className={`text-4xl font-black ${dueIn7Days > 0 ? 'text-orange-300' : ''}`}>{dueIn7Days}</div>
                {dueIn7Days > 0 && (
                    <div className="text-[10px] text-orange-400/70 font-bold uppercase tracking-wider mt-1">Requieren atención</div>
                )}
            </div>
        </div>
    );
}
