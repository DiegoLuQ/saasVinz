"use client";

import React, { useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    Download,
    Upload,
    FileSpreadsheet,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Loader2,
    RotateCcw,
} from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { authHeader } from '@/lib/auth/token';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

interface ImportRowIssue {
    sheet: string;
    row: number;
    messages?: string[];
    name?: string;
    reason?: string;
}

interface ImportResult {
    dry_run: boolean;
    applied: boolean;
    services: { to_create: number; preview: string[] };
    products: { to_create: number; preview: string[] };
    categories_to_create: string[];
    skipped: ImportRowIssue[];
    errors: ImportRowIssue[];
    tenant: { id: number; name: string; slug: string };
}

export default function TenantCatalogImportPage() {
    const params = useParams();
    const tenantSlug = params.slug as string;
    const { showToast } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [validating, setValidating] = useState(false);
    const [applying, setApplying] = useState(false);

    const downloadTemplate = async () => {
        setDownloading(true);
        try {
            const res = await fetch('/api/internal/creator/catalog-import/template', { headers: authHeader() });
            if (!res.ok) throw new Error('No se pudo descargar la plantilla');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'plantilla_catalogo_vinzer.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            showToast(err.message || 'Error al descargar la plantilla', 'error');
        } finally {
            setDownloading(false);
        }
    };

    const send = async (selected: File, dryRun: boolean): Promise<ImportResult> => {
        const form = new FormData();
        form.append('file', selected);
        return apiRequest(
            `/api/internal/creator/tenants/${tenantSlug}/catalog-import?dry_run=${dryRun}`,
            { method: 'POST', body: form },
        );
    };

    const handleFile = async (selected: File | undefined) => {
        if (!selected) return;
        setFile(selected);
        setResult(null);
        setValidating(true);
        try {
            setResult(await send(selected, true));
        } catch (err: any) {
            showToast(err.message || 'No se pudo validar el archivo', 'error');
            setFile(null);
        } finally {
            setValidating(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const applyImport = async () => {
        if (!file) return;
        setApplying(true);
        try {
            const res = await send(file, false);
            setResult(res);
            if (res.applied) {
                showToast(`Catálogo cargado: ${res.services.to_create} servicios y ${res.products.to_create} productos`, 'success');
            } else {
                showToast('El archivo cambió o tiene errores; revisa el detalle', 'error');
            }
        } catch (err: any) {
            showToast(err.message || 'Error al importar', 'error');
        } finally {
            setApplying(false);
        }
    };

    const reset = () => {
        setFile(null);
        setResult(null);
    };

    const nothingToCreate = result && result.services.to_create === 0 && result.products.to_create === 0;
    const canApply = result && !result.applied && result.errors.length === 0 && !nothingToCreate;

    return (
        <div className="space-y-6">
            {/* Paso 1 + 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-white/5 rounded-xl text-emerald-400"><FileSpreadsheet size={22} /></div>
                        <div>
                            <div className="text-[10px] uppercase tracking-widest font-bold text-white/30">Paso 1</div>
                            <div className="text-base font-black text-white">Descarga la plantilla</div>
                            <div className="text-xs text-white/40 font-medium mt-1">
                                Excel con hojas <strong className="text-white/60">Servicios</strong> y <strong className="text-white/60">Productos</strong> e instrucciones.
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={downloadTemplate}
                        disabled={downloading}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 text-sm font-bold transition-colors disabled:opacity-50"
                    >
                        {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        Descargar plantilla (.xlsx)
                    </button>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-white/5 rounded-xl text-sky-400"><Upload size={22} /></div>
                        <div>
                            <div className="text-[10px] uppercase tracking-widest font-bold text-white/30">Paso 2</div>
                            <div className="text-base font-black text-white">Sube el Excel completo</div>
                            <div className="text-xs text-white/40 font-medium mt-1">
                                Se valida primero; nada se guarda hasta que confirmes. Sin límites de plan.
                            </div>
                        </div>
                    </div>
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".xlsx"
                        className="hidden"
                        onChange={(e) => handleFile(e.target.files?.[0])}
                    />
                    <button
                        onClick={() => inputRef.current?.click()}
                        disabled={validating || applying}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/15 text-sky-300 border border-sky-500/30 hover:bg-sky-500/25 text-sm font-bold transition-colors disabled:opacity-50"
                    >
                        {validating ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        {file ? 'Elegir otro archivo' : 'Seleccionar archivo'}
                    </button>
                    {file && <div className="text-xs text-white/50 font-mono truncate">{file.name}</div>}
                </div>
            </div>

            {/* Paso 3: vista previa / resultado */}
            {result && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <div className="text-[10px] uppercase tracking-widest font-bold text-white/30">
                                {result.applied ? 'Resultado' : 'Paso 3 · Vista previa'}
                            </div>
                            <div className="text-base font-black text-white">
                                {result.applied ? `Catálogo cargado en ${result.tenant.name}` : `Se cargará en ${result.tenant.name}`}
                            </div>
                        </div>
                        {result.applied ? (
                            <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                                <CheckCircle2 size={12} /> Importado
                            </span>
                        ) : result.errors.length > 0 ? (
                            <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full">
                                <XCircle size={12} /> {result.errors.length} fila{result.errors.length === 1 ? '' : 's'} con error
                            </span>
                        ) : null}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Stat label="Servicios a crear" value={result.services.to_create} items={result.services.preview} />
                        <Stat label="Productos a crear" value={result.products.to_create} items={result.products.preview} />
                        <Stat label="Categorías nuevas" value={result.categories_to_create.length} items={result.categories_to_create} />
                    </div>

                    {result.errors.length > 0 && (
                        <IssueList
                            title="Errores — corrígelos en el Excel y vuelve a subirlo"
                            tone="error"
                            rows={result.errors.map(e => ({ key: `${e.sheet}-${e.row}`, where: `${e.sheet} · fila ${e.row}`, text: (e.messages || []).join(' · ') }))}
                        />
                    )}

                    {result.skipped.length > 0 && (
                        <IssueList
                            title="Filas omitidas (no se crean)"
                            tone="warn"
                            rows={result.skipped.map(s => ({ key: `${s.sheet}-${s.row}`, where: `${s.sheet} · fila ${s.row}`, text: `${s.name} — ${s.reason}` }))}
                        />
                    )}

                    <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                        {canApply && (
                            <button
                                onClick={applyImport}
                                disabled={applying}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-black hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {applying ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                Confirmar e importar
                            </button>
                        )}
                        {nothingToCreate && !result.applied && result.errors.length === 0 && (
                            <span className="text-xs text-white/50">No hay filas nuevas para crear.</span>
                        )}
                        <button
                            onClick={reset}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 text-sm font-bold transition-colors"
                        >
                            <RotateCcw size={14} /> {result.applied ? 'Nueva carga' : 'Cancelar'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function Stat({ label, value, items }: { label: string; value: number; items: string[] }) {
    return (
        <div className="bg-black/20 border border-white/5 rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-widest font-bold text-white/30">{label}</div>
            <div className="text-2xl font-black text-white">{value}</div>
            {items.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                    {items.map(i => <li key={i} className="text-[11px] text-white/50 truncate">{i}</li>)}
                    {value > items.length && <li className="text-[11px] text-white/30">y {value - items.length} más…</li>}
                </ul>
            )}
        </div>
    );
}

function IssueList({ title, tone, rows }: { title: string; tone: 'error' | 'warn'; rows: { key: string; where: string; text: string }[] }) {
    const color = tone === 'error' ? 'text-rose-400' : 'text-amber-400';
    const Icon = tone === 'error' ? XCircle : AlertTriangle;
    return (
        <div className="space-y-2">
            <div className={`flex items-center gap-2 text-xs font-bold ${color}`}>
                <Icon size={14} /> {title} ({rows.length})
            </div>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-white/5 divide-y divide-white/5">
                {rows.map(r => (
                    <div key={r.key} className="flex gap-4 px-4 py-2 text-xs">
                        <span className="text-white/40 font-mono shrink-0 w-36">{r.where}</span>
                        <span className="text-white/70">{r.text}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
