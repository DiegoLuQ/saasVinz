"use client";

import React from 'react';
import { HardDrive, ImageIcon, Film, Scale, Building2, AlertCircle } from 'lucide-react';
import { useMediaStats, formatBytes, type MediaStatsFilter } from '@/hooks/useMediaStats';

interface Props extends MediaStatsFilter {
    title?: string;
    /** Nombre visible de una categoría (la biblioteca pasa sus etiquetas) */
    categoryLabel?: (key: string) => string;
    /** Al elegir un crematorio del ranking (la biblioteca filtra por él) */
    onSelectTenant?: (id: number) => void;
}

const BAR_COLORS = ['bg-primary', 'bg-sky-400', 'bg-emerald-400', 'bg-violet-400', 'bg-amber-400', 'bg-rose-400'];
const MAX_CATEGORIES = 6;

const prettyCategory = (key: string) => key.replace(/[_-]/g, ' ').replace(/^\w/, c => c.toUpperCase());

function StatTile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 min-w-0">
            <div className="flex items-center gap-2 text-white/40 mb-2">
                {icon}
                <span className="text-[10px] uppercase tracking-widest font-bold truncate">{label}</span>
            </div>
            <div className="text-2xl font-black text-white leading-tight">{value}</div>
            {sub && <div className="text-[11px] text-white/40 mt-1 truncate">{sub}</div>}
        </div>
    );
}

/** Cantidad de imágenes y peso total de la biblioteca de medios, con desglose. */
export default function MediaStorageSummary({ title = 'Almacenamiento', categoryLabel = prettyCategory, onSelectTenant, ...filter }: Props) {
    const { data, isLoading, isError } = useMediaStats(filter);

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-pulse">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white/5 rounded-2xl" />)}
            </div>
        );
    }
    if (isError || !data) {
        return <div className="text-sm text-white/40">No se pudo calcular el almacenamiento.</div>;
    }

    const avgImage = data.images.count > 0 ? data.images.bytes / data.images.count : 0;
    const categories = data.by_category.slice(0, MAX_CATEGORIES);
    const restBytes = data.by_category.slice(MAX_CATEGORIES).reduce((acc, c) => acc + c.bytes, 0);
    const restCount = data.by_category.slice(MAX_CATEGORIES).reduce((acc, c) => acc + c.count, 0);
    if (restCount > 0) categories.push({ category: '__otros', count: restCount, bytes: restBytes });

    return (
        <section className="space-y-3">
            <div className="flex items-center gap-2">
                <HardDrive size={16} className="text-primary" />
                <h3 className="text-xs font-black uppercase tracking-widest text-white/50">{title}</h3>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatTile icon={<Scale size={15} />} label="Peso total" value={formatBytes(data.total_bytes)}
                    sub={`${data.total_count.toLocaleString('es-CL')} archivo${data.total_count === 1 ? '' : 's'}`} />
                <StatTile icon={<ImageIcon size={15} />} label="Imágenes" value={data.images.count.toLocaleString('es-CL')}
                    sub={formatBytes(data.images.bytes)} />
                <StatTile icon={<Film size={15} />} label="Videos" value={data.videos.count.toLocaleString('es-CL')}
                    sub={formatBytes(data.videos.bytes)} />
                <StatTile icon={<ImageIcon size={15} />} label="Promedio por imagen" value={formatBytes(avgImage)}
                    sub={data.last_upload_at ? `Última subida: ${new Date(data.last_upload_at).toLocaleDateString('es-CL')}` : 'Sin subidas'} />
            </div>

            {(categories.length > 0 || data.top_tenants.length > 0) && (
                <div className={`grid grid-cols-1 gap-3 ${data.top_tenants.length > 0 ? 'lg:grid-cols-2' : ''}`}>
                    {categories.length > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2.5">
                            <div className="text-[10px] uppercase tracking-widest font-bold text-white/30">Por categoría</div>
                            {categories.map((c, i) => {
                                const pct = data.total_bytes > 0 ? (c.bytes / data.total_bytes) * 100 : 0;
                                return (
                                    <div key={c.category} className="space-y-1">
                                        <div className="flex items-center justify-between gap-3 text-xs">
                                            <span className="text-white/70 font-medium truncate">
                                                {c.category === '__otros' ? 'Otras categorías' : categoryLabel(c.category)}
                                            </span>
                                            <span className="text-white/40 font-mono whitespace-nowrap">
                                                {formatBytes(c.bytes)} <span className="text-white/20">· {c.count}</span>
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div className={`h-full ${BAR_COLORS[i % BAR_COLORS.length]}`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {data.top_tenants.length > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
                            <div className="text-[10px] uppercase tracking-widest font-bold text-white/30 mb-1.5">Crematorios que más ocupan</div>
                            {data.top_tenants.map((t, i) => {
                                const Row = onSelectTenant ? 'button' : 'div';
                                return (
                                    <Row
                                        key={t.id}
                                        {...(onSelectTenant ? { type: 'button' as const, onClick: () => onSelectTenant(t.id) } : {})}
                                        className={`w-full flex items-center gap-3 rounded-xl px-2 py-1.5 text-left ${onSelectTenant ? 'hover:bg-white/5 transition-colors' : ''}`}
                                    >
                                        <span className="w-5 text-[11px] font-bold text-white/30 text-right">{i + 1}</span>
                                        <Building2 size={14} className="text-white/30 shrink-0" />
                                        <span className="flex-1 min-w-0 text-sm text-white/80 truncate">{t.name}</span>
                                        <span className="text-xs text-white/40 font-mono whitespace-nowrap">{t.count} · {formatBytes(t.bytes)}</span>
                                    </Row>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {data.unknown_size_count > 0 && (
                <p className="flex items-center gap-1.5 text-[11px] text-white/40">
                    <AlertCircle size={13} className="shrink-0" />
                    {data.unknown_size_count} archivo{data.unknown_size_count === 1 ? '' : 's'} antiguo{data.unknown_size_count === 1 ? '' : 's'} sin tamaño registrado: no suman al peso total.
                </p>
            )}
        </section>
    );
}
