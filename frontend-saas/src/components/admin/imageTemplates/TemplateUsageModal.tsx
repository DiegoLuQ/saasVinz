"use client";

import React, { useState } from 'react';
import { X, Building2, Sparkles, LayoutTemplate } from 'lucide-react';
import { getImageUrl } from '@/lib/admin/api';
import type { ImageTemplate, TemplateUsage, TemplateUsageItem } from '@/lib/admin/imageTemplates/types';

const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

/** Detalle de uso de una plantilla: crematorios que la usan y lo último creado con ella. */
export default function TemplateUsageModal({ template, usage, onClose }: {
    template: ImageTemplate;
    usage: TemplateUsage | undefined;
    onClose: () => void;
}) {
    const [zoom, setZoom] = useState<TemplateUsageItem | null>(null);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#0a192f] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-[#0a192f] flex items-start justify-between gap-4 p-5 border-b border-white/10">
                    <div>
                        <h3 className="text-white font-bold text-lg">Uso de «{template.name}»</h3>
                        <p className="text-white/40 text-xs mt-0.5">Crematorios que la usan y lo último creado con ella.</p>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white p-1"><X size={20} /></button>
                </div>

                <div className="p-5 space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            ['Crematorios', usage?.tenants_count ?? 0],
                            ['Diseños', usage?.designs ?? 0],
                            ['Ilustraciones IA', usage?.illustrations ?? 0],
                            ['Generaciones IA', usage?.ai_generations ?? 0],
                        ].map(([label, value]) => (
                            <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-3">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">{label}</p>
                                <p className="text-2xl font-black text-white mt-0.5">{value}</p>
                            </div>
                        ))}
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-white mb-3">Últimos creados</h4>
                        {!usage?.latest.length ? (
                            <p className="text-white/40 text-sm">Todavía nadie ha creado algo con esta plantilla.</p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                {usage.latest.map(item => (
                                    <button key={item.id} onClick={() => setZoom(item)} className="text-left group" title={item.title}>
                                        <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-black/30 ring-1 ring-white/10 group-hover:ring-primary">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={getImageUrl(item.url)} alt={item.title} loading="lazy" className="w-full h-full object-contain" />
                                            <span className={`absolute top-1.5 left-1.5 p-1 rounded-md ${item.kind === 'illustration' ? 'bg-violet-600' : 'bg-white/90'}`}>
                                                {item.kind === 'illustration'
                                                    ? <Sparkles size={10} className="text-white" />
                                                    : <LayoutTemplate size={10} className="text-slate-800" />}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-white/70 font-semibold mt-1 truncate">{item.tenant_name || '—'}</p>
                                        <p className="text-[10px] text-white/40">{fmt(item.created_at)}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-white mb-3">Quiénes la usan</h4>
                        {!usage?.tenants.length ? (
                            <p className="text-white/40 text-sm">Ningún crematorio la ha usado todavía.</p>
                        ) : (
                            <div className="overflow-x-auto border border-white/10 rounded-xl">
                                <table className="w-full text-sm">
                                    <thead className="bg-white/5">
                                        <tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
                                            <th className="px-3 py-2">Crematorio</th>
                                            <th className="px-3 py-2">Diseños</th>
                                            <th className="px-3 py-2">Ilustraciones</th>
                                            <th className="px-3 py-2">Generaciones IA</th>
                                            <th className="px-3 py-2">Último uso</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usage.tenants.map(t => (
                                            <tr key={t.tenant_id} className="border-t border-white/5 text-white/80">
                                                <td className="px-3 py-2 font-semibold text-white flex items-center gap-2"><Building2 size={13} className="text-white/40" /> {t.tenant_name}</td>
                                                <td className="px-3 py-2">{t.designs}</td>
                                                <td className="px-3 py-2">{t.illustrations}</td>
                                                <td className="px-3 py-2">{t.ai_generations}</td>
                                                <td className="px-3 py-2 text-xs text-white/60">{fmt(t.last_used_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {zoom && (
                <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); setZoom(null); }}>
                    <div className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getImageUrl(zoom.url)} alt={zoom.title} className="w-full max-h-[80vh] object-contain rounded-xl" />
                        <div className="flex items-center justify-between mt-3 text-sm">
                            <span className="text-white font-semibold">{zoom.title} · <span className="text-white/60">{zoom.tenant_name}</span></span>
                            <button onClick={() => setZoom(null)} className="text-white/60 hover:text-white">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
