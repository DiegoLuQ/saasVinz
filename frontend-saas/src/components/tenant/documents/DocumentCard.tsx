"use client";

import React from 'react';
import { FileText, FileBadge, FileCheck, Files, Printer, Trash2, Sparkles, Calendar, Hash, Loader2 } from 'lucide-react';
import type { DocumentItem } from '@/hooks/useDocuments';

export type DocCategory = 'certificados' | 'recibos' | 'autorizaciones' | 'otros';

export function categorizeDoc(doc: DocumentItem): DocCategory {
    const t = (doc.type || '').toLowerCase();
    if (t.includes('certif')) return 'certificados';
    if (t.includes('recib') || t.includes('boleta') || t.includes('factura')) return 'recibos';
    if (t.includes('autoriz') || t.includes('consent')) return 'autorizaciones';
    return 'otros';
}

const CATEGORY_STYLES: Record<DocCategory, {
    icon: React.ReactNode;
    label: string;
    chipBg: string;
    chipText: string;
    iconBg: string;
    glow: string;
    border: string;
    accentBar: string;
}> = {
    certificados: {
        icon: <FileText size={22} />,
        label: 'Certificado',
        chipBg: 'bg-blue-500/15 border-blue-400/25',
        chipText: 'text-blue-300',
        iconBg: 'bg-gradient-to-br from-blue-500/25 to-cyan-500/15 text-blue-300 ring-1 ring-blue-400/20',
        glow: 'group-hover:shadow-blue-500/20',
        border: 'group-hover:border-blue-400/40',
        accentBar: 'bg-gradient-to-b from-blue-400 to-cyan-400',
    },
    recibos: {
        icon: <FileBadge size={22} />,
        label: 'Recibo',
        chipBg: 'bg-emerald-500/15 border-emerald-400/25',
        chipText: 'text-emerald-300',
        iconBg: 'bg-gradient-to-br from-emerald-500/25 to-teal-500/15 text-emerald-300 ring-1 ring-emerald-400/20',
        glow: 'group-hover:shadow-emerald-500/20',
        border: 'group-hover:border-emerald-400/40',
        accentBar: 'bg-gradient-to-b from-emerald-400 to-teal-400',
    },
    autorizaciones: {
        icon: <FileCheck size={22} />,
        label: 'Autorización',
        chipBg: 'bg-purple-500/15 border-purple-400/25',
        chipText: 'text-purple-300',
        iconBg: 'bg-gradient-to-br from-purple-500/25 to-fuchsia-500/15 text-purple-300 ring-1 ring-purple-400/20',
        glow: 'group-hover:shadow-purple-500/20',
        border: 'group-hover:border-purple-400/40',
        accentBar: 'bg-gradient-to-b from-purple-400 to-fuchsia-400',
    },
    otros: {
        icon: <Files size={22} />,
        label: 'Documento',
        chipBg: 'bg-orange-500/15 border-orange-400/25',
        chipText: 'text-orange-300',
        iconBg: 'bg-gradient-to-br from-orange-500/25 to-amber-500/15 text-orange-300 ring-1 ring-orange-400/20',
        glow: 'group-hover:shadow-orange-500/20',
        border: 'group-hover:border-orange-400/40',
        accentBar: 'bg-gradient-to-b from-orange-400 to-amber-400',
    },
};

interface DocumentCardProps {
    doc: DocumentItem;
    isPrinting?: boolean;
    onPrint: (doc: DocumentItem) => void;
    onDelete: (doc: DocumentItem) => void;
}

export default function DocumentCard({ doc, isPrinting = false, onPrint, onDelete }: DocumentCardProps) {
    const category = categorizeDoc(doc);
    const s = CATEGORY_STYLES[category];
    const issueDate = doc.issue_date || doc.created_at;

    return (
        <article
            className={`
                group relative overflow-hidden bg-white/[0.02] rounded-2xl border border-white/[0.06]
                ${s.border} transition-all duration-300
                shadow-md shadow-black/20 hover:shadow-xl ${s.glow}
                hover:-translate-y-0.5
                flex
            `}
            aria-labelledby={`doc-title-${doc.id}`}
        >
            {/* Accent vertical bar — folder spine */}
            <div className={`w-1 shrink-0 ${s.accentBar}`} aria-hidden="true" />

            <div className="flex-1 p-5 flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className={`p-3 rounded-xl ${s.iconBg}`} aria-hidden="true">
                        {s.icon}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        {/* Type Badge */}
                        <span
                            className={`
                                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border
                                text-[9px] font-black uppercase tracking-[0.16em]
                                ${s.chipBg} ${s.chipText}
                            `}
                        >
                            {doc.is_generated && <Sparkles size={9} aria-hidden="true" />}
                            {s.label}
                        </span>
                        {doc.is_generated && (
                            <span className="text-[8px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                                Auto-generado
                            </span>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1">
                    <h4
                        id={`doc-title-${doc.id}`}
                        className="text-base font-black text-white tracking-tight truncate mb-1"
                    >
                        {doc.pet_name || 'Sin nombre'}
                    </h4>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.16em] mb-1 truncate">
                        {doc.service_type || 'Servicio'}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80 font-mono truncate">
                        {doc.number}
                    </p>
                </div>

                {/* Footer */}
                <div className="mt-5 pt-4 border-t border-white/[0.05] flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium min-w-0">
                        <span className="flex items-center gap-1 font-mono">
                            <Hash size={10} className={s.chipText} aria-hidden="true" />
                            {doc.cremation_id}
                        </span>
                        <span className="w-px h-3 bg-white/[0.08]" aria-hidden="true" />
                        <span className="flex items-center gap-1 font-mono truncate">
                            <Calendar size={10} aria-hidden="true" />
                            {issueDate ? new Date(issueDate).toLocaleDateString('es-CL') : '—'}
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                            type="button"
                            onClick={() => onPrint(doc)}
                            disabled={isPrinting}
                            className="p-2 rounded-lg hover:bg-primary/15 text-muted-foreground hover:text-primary transition-all active:scale-90 disabled:opacity-50"
                            title="Visualizar / Imprimir"
                            aria-label={`Visualizar documento ${doc.number}`}
                        >
                            {isPrinting ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} aria-hidden="true" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => onDelete(doc)}
                            className="p-2 rounded-lg hover:bg-red-500/15 text-muted-foreground hover:text-red-400 transition-all active:scale-90"
                            title="Eliminar"
                            aria-label={`Eliminar documento ${doc.number}`}
                        >
                            <Trash2 size={14} aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>
        </article>
    );
}
