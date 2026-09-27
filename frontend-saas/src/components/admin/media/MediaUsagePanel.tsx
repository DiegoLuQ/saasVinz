"use client";

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2, Building2, PawPrint, ClipboardList, Inbox, Flame, Heart, Package, Palette, ExternalLink } from 'lucide-react';
import { apiRequest, getImageUrl } from '@/lib/admin/api';

type Usage = {
    kind: 'mascota' | 'solicitud' | 'orden' | 'memorial' | 'catalogo' | 'diseno';
    label: string;
    detail?: string | null;
    tenant_id?: number | null;
    tenant_name?: string | null;
    orders?: { id: number; oc_number: number; status: string }[];
};

type UsageResponse = {
    media: { id: number; category?: string | null; description?: string | null; created_at?: string | null };
    tenant: { id: number; name: string; slug: string } | null;
    usages: Usage[];
};

const KIND: Record<Usage['kind'], { icon: React.ElementType; title: string; cls: string }> = {
    mascota: { icon: PawPrint, title: 'Mascota', cls: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
    solicitud: { icon: Inbox, title: 'Solicitud web', cls: 'text-sky-300 bg-sky-500/10 border-sky-500/20' },
    orden: { icon: Flame, title: 'Orden', cls: 'text-orange-300 bg-orange-500/10 border-orange-500/20' },
    memorial: { icon: Heart, title: 'Memorial', cls: 'text-rose-300 bg-rose-500/10 border-rose-500/20' },
    catalogo: { icon: Package, title: 'Catálogo', cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
    diseno: { icon: Palette, title: 'Diseño', cls: 'text-violet-300 bg-violet-500/10 border-violet-500/20' },
};

interface Props {
    item: { id: number; url: string; media_type?: string; thumbnail_url?: string | null } | null;
    onClose: () => void;
}

/** "¿A quién pertenece este archivo?": crematorio, mascota, orden, solicitud... */
export default function MediaUsagePanel({ item, onClose }: Props) {
    const { data, isLoading, isError } = useQuery<UsageResponse>({
        queryKey: ['media-usage', item?.id],
        queryFn: () => apiRequest(`/api/internal/media/${item!.id}/usage`),
        enabled: !!item,
        staleTime: 60 * 1000,
    });

    if (!item) return null;
    const preview = item.media_type === 'image' ? item.url : item.thumbnail_url;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-[#0a192f] border border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-white/5">
                    <div className="flex items-center gap-3 min-w-0">
                        {preview && (
                            <img src={getImageUrl(preview)} alt="" className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0" />
                        )}
                        <div className="min-w-0">
                            <h3 className="font-black text-white">¿Dónde se usa?</h3>
                            <p className="text-xs text-white/40 truncate">
                                {data?.media.description || `Archivo #${item.id}`}
                                {data?.media.category ? ` · ${data.media.category}` : ''}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white p-1" aria-label="Cerrar">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-2 py-10 text-white/40 text-sm">
                            <Loader2 size={16} className="animate-spin" /> Buscando...
                        </div>
                    ) : isError || !data ? (
                        <p className="text-sm text-red-400 text-center py-8">No se pudo consultar el uso del archivo.</p>
                    ) : (
                        <>
                            {/* Crematorio dueño del archivo */}
                            <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] border border-white/5 px-4 py-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <Building2 size={16} className="text-primary shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] uppercase tracking-widest font-black text-white/30">Crematorio</p>
                                        <p className="text-sm font-bold text-white truncate">{data.tenant?.name || 'Recurso global (Vinzer)'}</p>
                                    </div>
                                </div>
                                {data.tenant && (
                                    <Link
                                        href={`/dashboard/tenants/${data.tenant.slug}`}
                                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 shrink-0"
                                    >
                                        Ver empresa <ExternalLink size={11} />
                                    </Link>
                                )}
                            </div>

                            {data.usages.length === 0 ? (
                                <div className="text-center py-6 text-white/40 text-sm">
                                    No se encontró en mascotas, órdenes, solicitudes, memoriales, catálogo ni diseños.
                                    <span className="block text-xs text-white/25 mt-1">Puede ser un archivo huérfano (su registro fue eliminado).</span>
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {data.usages.map((u, i) => {
                                        const k = KIND[u.kind];
                                        const Icon = k.icon;
                                        return (
                                            <li key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] p-3.5">
                                                <div className="flex items-start gap-3">
                                                    <span className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${k.cls}`}>
                                                        <Icon size={15} />
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[10px] uppercase tracking-widest font-black text-white/30">{k.title}</p>
                                                        <p className="text-sm font-bold text-white">{u.label}</p>
                                                        {u.detail && <p className="text-xs text-white/50">{u.detail}</p>}
                                                        {u.tenant_name && data.tenant && u.tenant_name !== data.tenant.name && (
                                                            <p className="text-[11px] text-amber-400/80 mt-0.5">En {u.tenant_name}</p>
                                                        )}
                                                        {u.orders && u.orders.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                                {u.orders.map(o => (
                                                                    <span key={o.id} className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-300 bg-orange-500/10 border border-orange-500/20 rounded-md px-2 py-0.5">
                                                                        <ClipboardList size={10} /> OC {o.oc_number} · {o.status.replace(/_/g, ' ')}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
