import React from 'react';

const Pulse = ({ className = '' }: { className?: string }) => (
    <div className={`bg-white/5 rounded-xl animate-pulse ${className}`} />
);

export default function DashboardSkeleton() {
    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10">
            <header className="flex justify-between items-center">
                <div className="space-y-2">
                    <Pulse className="h-8 w-48" />
                    <Pulse className="h-4 w-64" />
                </div>
                <div className="flex gap-4">
                    <Pulse className="h-10 w-64" />
                    <Pulse className="h-10 w-36" />
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[0, 1, 2].map(i => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                        <Pulse className="h-4 w-32" />
                        <Pulse className="h-10 w-24" />
                        <Pulse className="h-3 w-20" />
                    </div>
                ))}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <Pulse className="h-5 w-40" />
                    <Pulse className="h-4 w-16" />
                </div>
                <div className="p-6 space-y-4">
                    {[0, 1, 2, 3, 4].map(i => (
                        <div key={i} className="flex items-center justify-between">
                            <Pulse className="h-10 w-1/3" />
                            <Pulse className="h-6 w-20" />
                            <Pulse className="h-6 w-24" />
                            <Pulse className="h-8 w-28" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
