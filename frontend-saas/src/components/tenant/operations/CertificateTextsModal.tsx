"use client";

import React, { useEffect, useRef, useState } from 'react';
import { FileText, Loader2, Type } from 'lucide-react';
import Modal from '@/components/tenant/Modal';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

// Campo "texto libre" del diseño (texto_fijo). Con código, el crematorio puede
// guardar su texto para los próximos certificados (sys_tenants.cert_text_values).
export interface CertTextField {
    id: string;
    type: string;
    value?: string;
    code?: string;
}

export interface IssueTemplate {
    template: {
        id: number;
        category: string;
        sections_config: { aspect_ratio?: string; fields?: CertTextField[] } | null;
    } | null;
    savedTexts: Record<string, string>;
}

export const ISSUE_TEMPLATE_QUERY_KEY = ['cert-issue-template'];

/**
 * Plantilla con la que se emite el certificado de una orden (la predeterminada
 * del crematorio, resuelta por el backend) + los textos guardados por código.
 */
export async function loadIssueTemplate(): Promise<IssueTemplate> {
    const [preview, local, global, texts] = await Promise.all([
        apiRequest('/api/internal/ops-records/templates/preview'),
        apiRequest('/api/internal/ops-records/templates').catch(() => []),
        apiRequest('/api/internal/ops-records/templates/global').catch(() => []),
        apiRequest('/api/internal/ops-records/text-values').catch(() => null),
    ]);
    const all: IssueTemplate['template'][] = [...(local || []), ...(global || [])];
    const template = preview?.template_id ? all.find((t) => t?.id === preview.template_id) || null : null;
    return { template, savedTexts: texts?.values || {} };
}

/** Campos de texto libre editables al emitir (solo diseños con imagen). */
export function issueTextFields(data: IssueTemplate | undefined): CertTextField[] {
    const tpl = data?.template;
    if (!tpl || tpl.category !== 'certificadoImg') return [];
    return (tpl.sections_config?.fields || []).filter((f) => f.type === 'texto_fijo');
}

const ASPECT_PADDING: Record<string, number> = { '16:9': 56.25, '4:3': 75, '3:4': 133.333 };

interface Props {
    isOpen: boolean;
    onClose: () => void;
    cremationId: number;
    hasIssued: boolean;
    data: IssueTemplate | undefined;
    isLoading: boolean;
    /** Emite con los overrides dados (abre la pestaña del certificado). */
    onIssue: (templateId: number | undefined, overrides: Record<string, { value: string }>) => Promise<boolean>;
    /** Tras guardar textos con código, para recargar los guardados. */
    onTextsSaved: () => void;
}

/**
 * Edición de los textos libres del certificado antes de emitirlo desde el
 * expediente de la orden, con vista previa en vivo. Mismo comportamiento que
 * Documentos (solo textos): el diseño del admin no se modifica.
 */
export default function CertificateTextsModal({ isOpen, onClose, cremationId, hasIssued, data, isLoading, onIssue, onTextsSaved }: Props) {
    const { showToast } = useToast();
    const [texts, setTexts] = useState<Record<string, string>>({});
    const [saveToggles, setSaveToggles] = useState<Record<string, boolean>>({});
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [issuing, setIssuing] = useState(false);
    const previewReqRef = useRef(0);

    const template = data?.template || null;
    const savedTexts = data?.savedTexts || {};
    const textFields = issueTextFields(data);
    const aspect = template?.sections_config?.aspect_ratio || '16:9';

    // Precarga: texto guardado para el código del campo > texto del diseño.
    useEffect(() => {
        if (!isOpen || !template) return;
        const initTexts: Record<string, string> = {};
        const initSave: Record<string, boolean> = {};
        textFields.forEach((f) => {
            initTexts[f.id] = (f.code && f.code in savedTexts) ? savedTexts[f.code] : (f.value ?? '');
            if (f.code) initSave[f.id] = true;
        });
        setTexts(initTexts);
        setSaveToggles(initSave);
        // Solo al abrir o cambiar de plantilla; no pisar lo que se está escribiendo.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, template?.id]);

    const buildOverrides = () => {
        const overrides: Record<string, { value: string }> = {};
        textFields.forEach((f) => {
            const v = texts[f.id];
            if (v !== undefined) overrides[f.id] = { value: v };
        });
        return overrides;
    };

    // Vista previa (sin guardar) cada vez que cambia un texto.
    useEffect(() => {
        if (!isOpen || !template) {
            setPreviewHtml(null);
            return;
        }
        const reqId = ++previewReqRef.current;
        const timer = setTimeout(async () => {
            setPreviewLoading(true);
            try {
                const res = await apiRequest('/api/internal/ops-records/generate', {
                    method: 'POST',
                    body: {
                        cremation_id: cremationId,
                        template_id: template.id,
                        image_overrides: buildOverrides(),
                        persist: false,
                    },
                });
                if (reqId === previewReqRef.current) setPreviewHtml(res.html_content);
            } catch {
                if (reqId === previewReqRef.current) setPreviewHtml(null);
            } finally {
                if (reqId === previewReqRef.current) setPreviewLoading(false);
            }
        }, 400);
        return () => clearTimeout(timer);
        // buildOverrides se deriva de texts
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, template?.id, cremationId, texts]);

    // Guarda los textos con código marcados "para próximos certificados".
    // Volver al texto del diseño borra lo guardado (null).
    const saveCodedTexts = async () => {
        const changes: Record<string, string | null> = {};
        textFields.forEach((f) => {
            if (!f.code || !saveToggles[f.id]) return;
            const v = texts[f.id] ?? f.value ?? '';
            const next = v === (f.value ?? '') ? null : v;
            const prev = f.code in savedTexts ? savedTexts[f.code] : null;
            if (next !== prev) changes[f.code] = next;
        });
        if (!Object.keys(changes).length) return;
        try {
            await apiRequest('/api/internal/ops-records/text-values', { method: 'PUT', body: { values: changes } });
            onTextsSaved();
            showToast('Textos guardados para tus próximos certificados', 'success');
        } catch (err: unknown) {
            showToast('No se pudieron guardar los textos: ' + (err instanceof Error ? err.message : ''), 'error');
        }
    };

    const handleIssue = async () => {
        setIssuing(true);
        try {
            const ok = await onIssue(template?.id, buildOverrides());
            if (ok) {
                await saveCodedTexts();
                onClose();
            }
        } finally {
            setIssuing(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={issuing ? () => {} : onClose}
            title={hasIssued ? 'Volver a emitir certificado' : 'Emitir certificado'}
            maxWidth="max-w-5xl"
        >
            {isLoading && !data ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground gap-2 text-sm">
                    <Loader2 size={18} className="animate-spin" /> Cargando diseño...
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-5">
                        {/* Textos libres */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><Type size={12} /> Textos</label>
                            {textFields.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Este diseño no tiene textos editables. Se emitirá tal como está.</p>
                            ) : (
                                <>
                                    {textFields.map((f, i) => (
                                        <div key={f.id} className="space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                {f.code ? (
                                                    <span className="text-[10px] font-mono font-black text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">{f.code}</span>
                                                ) : (
                                                    <span className="text-[10px] text-white/40 font-bold uppercase">
                                                        {textFields.length > 1 ? `Texto #${i + 1}` : 'Texto libre'}
                                                    </span>
                                                )}
                                                {f.code && f.code in savedTexts && (texts[f.id] ?? '') === savedTexts[f.code] && (
                                                    <span className="text-[10px] text-emerald-400 font-bold">Guardado</span>
                                                )}
                                            </div>
                                            <textarea
                                                value={texts[f.id] ?? f.value ?? ''}
                                                onChange={(e) => setTexts((prev) => ({ ...prev, [f.id]: e.target.value }))}
                                                rows={2}
                                                placeholder="Escribe el texto para este certificado"
                                                className="w-full bg-black/40 border border-white/5 rounded-xl py-2 px-3 text-xs font-bold text-white outline-none focus:border-primary/50 resize-y"
                                            />
                                            {(texts[f.id] ?? '') !== (f.value ?? '') && (
                                                <button
                                                    type="button"
                                                    onClick={() => setTexts((prev) => ({ ...prev, [f.id]: f.value ?? '' }))}
                                                    className="text-[10px] font-bold text-primary hover:underline"
                                                >
                                                    Restaurar el texto del diseño
                                                </button>
                                            )}
                                            {f.code && (
                                                <label className="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!saveToggles[f.id]}
                                                        onChange={(e) => setSaveToggles((prev) => ({ ...prev, [f.id]: e.target.checked }))}
                                                        className="accent-primary"
                                                    />
                                                    Guardar para próximos certificados
                                                </label>
                                            )}
                                        </div>
                                    ))}
                                    <p className="text-[10px] text-white/20 font-medium">
                                        {textFields.some((f) => f.code)
                                            ? 'Los textos con código marcados se guardan al emitir el certificado. El diseño original no se modifica.'
                                            : 'Solo cambia este certificado; el diseño original no se modifica.'}
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Vista previa */}
                        <div className="relative w-full shadow-2xl rounded-lg overflow-hidden bg-white self-start" style={{ paddingBottom: `${ASPECT_PADDING[aspect] ?? 56.25}%` }}>
                            {previewHtml ? (
                                <iframe
                                    title="Vista previa del certificado"
                                    srcDoc={previewHtml}
                                    className="absolute inset-0 w-full h-full border-0"
                                    sandbox="allow-same-origin"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm gap-2">
                                    {previewLoading || template ? <><Loader2 size={18} className="animate-spin" /> Generando vista previa...</> : 'Vista previa no disponible'}
                                </div>
                            )}
                            {previewLoading && previewHtml && (
                                <div className="absolute top-2 right-2 bg-black/60 text-white text-[11px] px-2 py-1 rounded-lg flex items-center gap-1.5">
                                    <Loader2 size={12} className="animate-spin" /> Actualizando
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={issuing}
                            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleIssue}
                            disabled={issuing}
                            className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                            {issuing ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                            {hasIssued ? 'Volver a emitir' : 'Emitir certificado'}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
