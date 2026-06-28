/**
 * Receipt Statistics Component
 * Displays key metrics for receipts management
 */
'use client';

import { useEffect, useState } from 'react';
import { FileText, CheckCircle, XCircle, DollarSign } from 'lucide-react';

interface ReceiptStats {
    total_receipts: number;
    active_receipts: number;
    voided_receipts: number;
    total_amount: number;
}

export default function ReceiptStats() {
    const [stats, setStats] = useState<ReceiptStats>({
        total_receipts: 0,
        active_receipts: 0,
        voided_receipts: 0,
        total_amount: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/internal/creator/stats/receipts');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: 'Total Recibos',
            value: stats.total_receipts,
            icon: FileText,
            color: 'blue',
            bgColor: 'bg-blue-500/10',
            iconColor: 'text-blue-400',
        },
        {
            title: 'Activos',
            value: stats.active_receipts,
            icon: CheckCircle,
            color: 'green',
            bgColor: 'bg-green-500/10',
            iconColor: 'text-green-400',
        },
        {
            title: 'Anulados',
            value: stats.voided_receipts,
            icon: XCircle,
            color: 'red',
            bgColor: 'bg-red-500/10',
            iconColor: 'text-red-400',
        },
        {
            title: 'Monto Total',
            value: `$${stats.total_amount.toLocaleString('es-CL')}`,
            icon: DollarSign,
            color: 'purple',
            bgColor: 'bg-purple-500/10',
            iconColor: 'text-purple-400',
        },
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 animate-pulse">
                        <div className="h-12 bg-white/10 rounded mb-4"></div>
                        <div className="h-8 bg-white/10 rounded w-1/2"></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((card, index) => {
                const Icon = card.icon;
                return (
                    <div
                        key={index}
                        className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/10 hover:border-white/20 transition-all"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`${card.bgColor} p-3 rounded-lg`}>
                                <Icon className={`w-6 h-6 ${card.iconColor}`} />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-white/60 mb-1">{card.title}</p>
                        <p className="text-2xl font-bold text-white">{card.value}</p>
                    </div>
                );
            })}
        </div>
    );
}
