"use client";

import React, { useState } from 'react';
import { X, Info, Copy, Check, Eye, Play } from 'lucide-react';
import { getImageUrl } from '@/lib/admin/api';

export interface MediaInfoItem {
    id: number;
    tenant_id?: number | null;
    tenant_name?: string | null;
    url: string;
    media_type: 'image' | 'video';
    category: string;
    ratio: string;
    description: string;
    alt_text: string;
    file_size: number;
    width: number;
    height: number;
    duration?: number;
    thumbnail_url?: string;
    created_by?: { id: number; name: string; email: string; role?: string } | null;
    created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
    creator: 'SuperAdmin', admin: 'Administrador', recepcion: 'Recepción', operador_cremacion: 'Operador de cremación',
    contabilidad: 'Contabilidad', marketing: 'Marketing', auditor: 'Auditor', operator: 'Operador', driver: 'Conductor',
};

const formatBytes = (bytes: number) => {
    if (!+bytes) return '—';
    const k = 1024;
    const sizes = ['bytes', 'KB', 'MB', 'GB'];
    const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(i ? 2 : 0)).toLocaleString('es-CL')} ${sizes[i]}`;
};

const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')} min`;

/** Proporción reducida (1080×1350 → 4:5). */
const aspect = (w: number, h: number) => {
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
    const g = gcd(w, h);
    return `${w / g}:${h / g}`;
};

/** Ficha «i» de un archivo de la biblioteca: quién lo subió, cuándo, peso, dimensiones… */
export default function MediaInfoModal({ item, onClose, onShowUsage }: {
    item: MediaInfoItem | null;
    onClose: () => void;
    onShowUsage: (item: MediaInfoItem) => void;
}) {
    const [copied, setCopied] = useState(false);
    if (!item) return null;

    const url = getImageUrl(item.url);
    const fileName = decodeURIComponent(item.url.split('?')[0].split('/').pop() || '');
    const ext = fileName.includes('.') ? fileName.split('.').pop()!.toUpperCase() : '—';
    const preview = item.media_type === 'image' ? item.url : item.thumbnail_url;
    const created = new Date(item.created_at);
    const hasDims = item.width > 0 && item.height > 0;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch { /* sin portapapeles */ }
    };

    const rows: [string, React.ReactNode][] = [
        ['Subido por', item.created_by ? (
            <span key="u">
                <span className="text-white font-semibold">{item.created_by.name}</span>
                <span className="block text-[11px] text-white/40">
                    {item.created_by.email}{item.created_by.role ? ` · ${ROLE_LABELS[item.created_by.role] || item.created_by.role}` : ''}
                </span>
            </span>
        ) : <span key="u" className="text-white/40">No registrado (archivo anterior a este dato o creado por el sistema)</span>],
        ['Fecha de subida', `${created.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })} · ${created.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`],
        ['Empresa', item.tenant_id ? (item.tenant_name || `#${item.tenant_id}`) : 'Global (SuperAdmin)'],
        ['Categoría', item.category || '—'],
        ['Tipo', `${item.media_type === 'video' ? 'Video' : 'Imagen'} · ${ext}`],
        ['Peso', formatBytes(item.file_size)],
        ['Dimensiones', hasDims ? `${item.width.toLocaleString('es-CL')} × ${item.height.toLocaleString('es-CL')} px (${aspect(item.width, item.height)})` : '—'],
        ...(item.ratio && item.ratio !== 'original' ? [['Recorte', item.ratio] as [string, React.ReactNode]] : []),
        ...(item.media_type === 'video' && item.duration ? [['Duración', formatDuration(item.duration)] as [string, React.ReactNode]] : []),
        ['Descripción', item.description || <span key="d" className="text-white/40">Sin descripción</span>],
        ...(item.alt_text ? [['Texto alternativo', item.alt_text] as [string, React.ReactNode]] : []),
        ['ID', `#${item.id}`],
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-[#0a192f] border border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-white/5">
                    <h3 className="font-black text-white flex items-center gap-2"><Info size={18} className="text-primary" /> Información del archivo</h3>
                    <button onClick={onClose} className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10" aria-label="Cerrar"><X size={18} /></button>
                </div>

                <div className="overflow-y-auto p-5 space-y-5">
                    <div className="relative rounded-2xl bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center h-48">
                        {preview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={getImageUrl(preview)} alt={item.alt_text || ''} className="max-h-full max-w-full object-contain" />
                        ) : (
                            <video src={url} className="max-h-full max-w-full" />
                        )}
                        {item.media_type === 'video' && (
                            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"><Play size={18} className="text-white ml-0.5" fill="white" /></span>
                            </span>
                        )}
                    </div>

                    <dl className="divide-y divide-white/5 rounded-2xl border border-white/10">
                        {rows.map(([label, value]) => (
                            <div key={label} className="grid grid-cols-[120px_1fr] gap-3 px-4 py-2.5 text-sm">
                                <dt className="text-[11px] font-bold uppercase tracking-wider text-white/40 pt-0.5">{label}</dt>
                                <dd className="text-white/80 break-words min-w-0">{value}</dd>
                            </div>
                        ))}
                    </dl>

                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Archivo</p>
                        <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                            <span className="flex-1 min-w-0 truncate text-xs text-white/70 font-mono" title={url}>{fileName || url}</span>
                            <button onClick={copy} title="Copiar URL" className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 shrink-0">
                                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-white/5 flex justify-end gap-2">
                    <button onClick={() => onShowUsage(item)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold border border-white/10">
                        <Eye size={15} /> ¿Dónde se usa?
                    </button>
                    <button onClick={onClose} className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold">Cerrar</button>
                </div>
            </div>
        </div>
    );
}
