"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, ChevronLeft, ChevronRight, Loader2, Search, X as XIcon } from 'lucide-react';
import { useOperationSteps, useCurrentTenant } from '@/hooks/useSessionBootstrap';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { OPS_PAGE_SIZE, searchOpsOrders, useOpsBoard, type OpsOrder, type OpsTab } from '@/hooks/useOperations';
import OpsOrderCard, { type OpsStep } from '@/components/tenant/operations/board/OpsOrderCard';
import OpsOrderPanel from '@/components/tenant/operations/board/OpsOrderPanel';

const TABS: { key: OpsTab; label: string; empty: string }[] = [
    { key: 'today', label: 'Hoy', empty: 'No hay órdenes programadas para hoy ni atrasadas.' },
    { key: 'in_progress', label: 'En proceso', empty: 'No hay órdenes en proceso.' },
    { key: 'not_started', label: 'Por iniciar', empty: 'No hay órdenes por iniciar.' },
    { key: 'finished', label: 'Finalizadas', empty: 'Aún no hay órdenes finalizadas.' },
];

export default function OperationsPanelPage() {
    const searchParams = useSearchParams();
    const openTrackingCode = searchParams.get('openTracking');
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const steps = useOperationSteps() as OpsStep[];
    const currentTenant = useCurrentTenant();
    const timezone = currentTenant?.timezone || 'America/Santiago';

    const [tab, setTab] = useState<OpsTab>('today');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<OpsOrder | null>(null);
    const [now, setNow] = useState(() => Date.now());

    // Búsqueda en servidor con debounce; cualquier cambio de filtro vuelve a la página 1
    useEffect(() => {
        const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    // Refresca los "hace X min" cada minuto
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 60 * 1000);
        return () => clearInterval(t);
    }, []);

    const { data, isLoading, isFetching, isError, refetch } = useOpsBoard(tab, search, page);
    const items = data?.items ?? [];
    const totalPages = data ? Math.max(1, Math.ceil(data.total / OPS_PAGE_SIZE)) : 1;

    // Enlace directo ?openTracking=<código|id|n° OC> (desde el registro de órdenes)
    const openedFromUrl = useRef(false);
    useEffect(() => {
        if (!openTrackingCode || openedFromUrl.current) return;
        openedFromUrl.current = true;
        const code = openTrackingCode.toLowerCase();
        searchOpsOrders(openTrackingCode, 10)
            .then(res => {
                const match = res.items.find(o =>
                    o.verification_code?.toLowerCase() === code || String(o.id) === code || String(o.oc_number) === code,
                );
                if (match) setSelected(match);
            })
            .catch(() => { /* sin coincidencia: se queda en el tablero */ });
    }, [openTrackingCode]);

    const changeTab = (next: OpsTab) => {
        setTab(next);
        setPage(1);
    };

    const closePanel = () => {
        setSelected(null);
        queryClient.invalidateQueries({ queryKey: ['ops-board'] });
    };

    return (
        <div className="space-y-5 pb-20">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Activity className="text-primary" size={22} />
                </div>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Panel de trabajo</h1>
                    <p className="text-sm text-muted-foreground">Toca una orden para registrar evidencia y avanzar de fase.</p>
                </div>
            </div>

            {/* Pestañas + búsqueda */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex gap-1 p-1 rounded-2xl bg-foreground/5 overflow-x-auto no-scrollbar">
                    {TABS.map(t => {
                        const count = data?.counts?.[t.key];
                        const active = tab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => changeTab(t.key)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                                    active ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {t.label}
                                {count !== undefined && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded-md ${active ? 'bg-black/15' : 'bg-foreground/10'}`}>{count}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="relative flex-1 lg:max-w-sm lg:ml-auto">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                        type="search"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        placeholder="Mascota, cliente, código o N° de orden"
                        className="w-full bg-foreground/5 border border-foreground/10 rounded-2xl py-3 pl-11 pr-10 text-base text-foreground outline-none focus:border-primary/50"
                    />
                    {searchInput && (
                        <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground" aria-label="Limpiar búsqueda">
                            <XIcon size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Tablero */}
            {isLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
            ) : isError ? (
                <div className="text-center p-10 rounded-3xl border border-red-500/20 space-y-3">
                    <p className="text-foreground font-bold">No se pudieron cargar las órdenes.</p>
                    <button onClick={() => refetch()} className="px-4 py-2 rounded-xl bg-foreground/5 border border-foreground/10 text-sm font-bold">Reintentar</button>
                </div>
            ) : items.length === 0 ? (
                <div className="text-center p-12 rounded-3xl border border-foreground/10 text-muted-foreground">
                    {search ? `Sin resultados para «${search}».` : TABS.find(t => t.key === tab)?.empty}
                </div>
            ) : (
                <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4 transition-opacity ${isFetching ? 'opacity-70' : ''}`}>
                    {items.map(order => (
                        <OpsOrderCard key={order.id} order={order} steps={steps} now={now} onOpen={setSelected} />
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4">
                    <button
                        onClick={() => setPage(p => Math.max(p - 1, 1))}
                        disabled={page === 1}
                        className="p-3 rounded-xl bg-foreground/5 border border-foreground/10 text-foreground disabled:opacity-40"
                        aria-label="Página anterior"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm text-muted-foreground font-medium">Página {page} de {totalPages}</span>
                    <button
                        onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                        disabled={page === totalPages}
                        className="p-3 rounded-xl bg-foreground/5 border border-foreground/10 text-foreground disabled:opacity-40"
                        aria-label="Página siguiente"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}

            {selected && (
                <OpsOrderPanel
                    key={selected.id}
                    order={selected}
                    steps={steps}
                    now={now}
                    timezone={timezone}
                    showToast={showToast}
                    onClose={closePanel}
                />
            )}
        </div>
    );
}
