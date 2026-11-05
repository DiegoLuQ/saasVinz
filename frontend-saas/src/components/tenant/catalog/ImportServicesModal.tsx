"use client";

import React, { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, XCircle, MinusCircle } from 'lucide-react';
import Modal from '@/components/tenant/Modal';
import { apiRequest } from '@/lib/tenant/api';
import { authHeader } from '@/lib/auth/token';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

type RowStatus = 'new' | 'exists' | 'error' | 'example';

interface ImportRow {
    row: number;
    name: string | null;
    group: string | null;
    price: number | null;
    is_active: boolean;
    show_in_form: boolean;
    is_special: boolean;
    status: RowStatus;
    messages: string[];
}

interface ImportResult {
    rows: ImportRow[];
    counts: Record<RowStatus, number>;
    new_groups: string[];
    capacity: { limit: number | null; usage: number; available: number | null };
    active_new: number;
    over_limit: boolean;
    applied: boolean;
    created: number;
}

const STATUS: Record<RowStatus, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
    new: { label: 'Nuevo', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-800', Icon: CheckCircle2 },
    exists: { label: 'Ya existe', cls: 'text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700', Icon: MinusCircle },
    error: { label: 'Error', cls: 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/40 dark:border-red-800', Icon: XCircle },
    example: { label: 'Ejemplo', cls: 'text-slate-500 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-800/60 dark:border-slate-700', Icon: MinusCircle },
};

const clp = (v: number | null) => (v == null ? '—' : `$${Math.round(v).toLocaleString('es-CL')}`);

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function ImportServicesModal({ isOpen, onClose }: Props) {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<'template' | 'preview' | 'apply' | null>(null);

    const reset = () => {
        setFile(null);
        setPreview(null);
        setError(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    const close = () => {
        if (busy === 'apply') return;
        reset();
        onClose();
    };

    const downloadTemplate = async () => {
        setBusy('template');
        try {
            const res = await fetch('/api/internal/services/import/template', { headers: authHeader(), credentials: 'same-origin' });
            if (!res.ok) throw new Error();
            const url = URL.createObjectURL(await res.blob());
            const a = document.createElement('a');
            a.href = url;
            a.download = 'plantilla_servicios.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch {
            showToast('No se pudo descargar la plantilla', 'error');
        } finally {
            setBusy(null);
        }
    };

    const send = async (f: File, dryRun: boolean): Promise<ImportResult> => {
        const body = new FormData();
        body.append('file', f);
        return apiRequest(`/api/internal/services/import?dry_run=${dryRun}`, { method: 'POST', body });
    };

    const handleFile = async (f: File | undefined) => {
        if (!f) return;
        setFile(f);
        setPreview(null);
        setError(null);
        setBusy('preview');
        try {
            setPreview(await send(f, true));
        } catch (e) {
            setError((e as { message?: string })?.message || 'No se pudo leer el archivo');
        } finally {
            setBusy(null);
        }
    };

    const apply = async () => {
        if (!file) return;
        setBusy('apply');
        setError(null);
        try {
            const res = await send(file, false);
            queryClient.invalidateQueries({ queryKey: ['catalog-services'] });
            queryClient.invalidateQueries({ queryKey: ['catalog-service-groups'] });
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
            showToast(`${res.created} servicio${res.created === 1 ? '' : 's'} importado${res.created === 1 ? '' : 's'}`, 'success');
            reset();
            onClose();
        } catch (e) {
            setError((e as { message?: string })?.message || 'No se pudo importar');
        } finally {
            setBusy(null);
        }
    };

    const canApply = !!preview && preview.counts.new > 0 && !preview.over_limit && !busy;

    return (
        <Modal isOpen={isOpen} onClose={close} title="Importar servicios desde Excel" maxWidth="max-w-4xl">
            <div className="space-y-5">
                {/* Paso 1 y 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">1. Descarga la plantilla</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            Nombre, descripción, precio, costo, estado operativo, visible en formulario web, grupo y servicio especial.
                        </p>
                        <button
                            type="button"
                            onClick={downloadTemplate}
                            disabled={busy !== null}
                            className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-primary hover:text-primary transition-all disabled:opacity-50"
                        >
                            {busy === 'template' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                            Plantilla .xlsx
                        </button>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">2. Sube el archivo completo</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            Verás una vista previa antes de guardar. Nada se crea hasta que confirmes.
                        </p>
                        <input
                            ref={inputRef}
                            type="file"
                            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            className="hidden"
                            onChange={(e) => handleFile(e.target.files?.[0])}
                        />
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            disabled={busy !== null}
                            className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:bg-primary/95 transition-all disabled:opacity-50"
                        >
                            {busy === 'preview' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            {file ? 'Elegir otro archivo' : 'Elegir archivo'}
                        </button>
                        {file && (
                            <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                                <FileSpreadsheet size={12} className="shrink-0 text-emerald-600" /> {file.name}
                            </p>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-400">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {preview && (
                    <>
                        <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                            {(['new', 'exists', 'error', 'example'] as RowStatus[]).filter(s => preview.counts[s] > 0).map(s => {
                                const { label, cls, Icon } = STATUS[s];
                                return (
                                    <span key={s} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${cls}`}>
                                        <Icon size={12} /> {preview.counts[s]} {label.toLowerCase()}
                                    </span>
                                );
                            })}
                            {preview.new_groups.length > 0 && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-400">
                                    Grupos nuevos: {preview.new_groups.join(', ')}
                                </span>
                            )}
                        </div>

                        {preview.over_limit && (
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-400">
                                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                <span>
                                    Tu plan permite {preview.capacity.limit} servicios activos y ya tienes {preview.capacity.usage}.
                                    El archivo agrega {preview.active_new} activos (te quedan {preview.capacity.available}).
                                    Marca algunos como «Inactivo» en el Excel o mejora tu plan.
                                </span>
                            </div>
                        )}

                        <div className="max-h-[45vh] overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                            <table className="w-full text-left text-xs">
                                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    <tr>
                                        <th className="py-2 px-3">Fila</th>
                                        <th className="py-2 px-3">Servicio</th>
                                        <th className="py-2 px-3">Grupo</th>
                                        <th className="py-2 px-3 text-right">Precio</th>
                                        <th className="py-2 px-3">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                    {preview.rows.map(r => {
                                        const { label, cls, Icon } = STATUS[r.status];
                                        return (
                                            <tr key={r.row} className={r.status === 'example' ? 'opacity-60' : ''}>
                                                <td className="py-2 px-3 text-muted-foreground">{r.row}</td>
                                                <td className="py-2 px-3">
                                                    <div className="font-bold text-slate-900 dark:text-white">{r.name || '—'}</div>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        {[!r.is_active && 'Inactivo', !r.show_in_form && 'Oculto en formulario', r.is_special && 'Especial'].filter(Boolean).join(' · ')}
                                                    </div>
                                                </td>
                                                <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{r.group || <span className="text-muted-foreground">Sin grupo</span>}</td>
                                                <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">{clp(r.price)}</td>
                                                <td className="py-2 px-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${cls}`}>
                                                        <Icon size={10} /> {label}
                                                    </span>
                                                    {r.messages.length > 0 && r.status !== 'example' && (
                                                        <div className="text-[10px] text-muted-foreground mt-0.5">{r.messages.join(' · ')}</div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {preview.counts.error > 0 && (
                            <p className="text-[11px] text-muted-foreground">
                                Las filas con error no se importan. Corrígelas en el Excel y vuelve a subirlo, o importa ahora solo las válidas.
                            </p>
                        )}
                    </>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={close}
                        disabled={busy === 'apply'}
                        className="px-4 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all text-slate-700 dark:text-slate-300"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={apply}
                        disabled={!canApply}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/95 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {busy === 'apply' && <Loader2 size={14} className="animate-spin" />}
                        {preview && preview.counts.new > 0
                            ? `Importar ${preview.counts.new} servicio${preview.counts.new === 1 ? '' : 's'}`
                            : 'Importar'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
