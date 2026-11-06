"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, FileText, Loader2, Type } from 'lucide-react';
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
    format?: string;
}

/** Valor que se manda por campo al emitir: texto libre o fecha (AAAA-MM-DD) que falta en la ficha. */
export type CertOverrides = Record<string, { value?: string; date?: string; format?: string }>;

type DateKind = 'fecha_nacimiento' | 'fecha_fallecimiento';
export const DATE_LABELS: Record<DateKind, string> = { fecha_nacimiento: 'Nacimiento', fecha_fallecimiento: 'Fallecimiento' };
const PET_DATE_KEY: Record<DateKind, 'birth_date' | 'death_date'> = { fecha_nacimiento: 'birth_date', fecha_fallecimiento: 'death_date' };
const PET_YEAR_KEY: Record<DateKind, 'birth_date_year_only' | 'death_date_year_only'> = { fecha_nacimiento: 'birth_date_year_only', fecha_fallecimiento: 'death_date_year_only' };
const THIS_YEAR = new Date().getFullYear();
// En «solo año» el campo puede tener un año a medio escribir: solo cuenta una fecha completa.
const isFullDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/** «Fecha exacta / Solo año»: con solo año la fecha se guarda el 1 de enero y el certificado imprime el año. */
export function DateModeToggle({ yearOnly, onChange, light = false }: { yearOnly: boolean; onChange: (v: boolean) => void; light?: boolean }) {
    const btn = (active: boolean) => `px-2 py-0.5 rounded-md text-[9px] font-bold normal-case tracking-normal transition-colors ${active
        ? 'bg-primary/20 text-primary'
        : light ? 'text-slate-500 hover:text-slate-800 dark:text-white/40 dark:hover:text-white/70' : 'text-white/40 hover:text-white/70'}`;
    return (
        <span className={`inline-flex rounded-lg p-0.5 border ${light ? 'bg-slate-100 border-slate-200 dark:bg-black/40 dark:border-white/5' : 'bg-black/40 border-white/5'}`}>
            <button type="button" className={btn(!yearOnly)} onClick={() => onChange(false)}>Fecha exacta</button>
            <button type="button" className={btn(yearOnly)} onClick={() => onChange(true)}>Solo año</button>
        </span>
    );
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
export async function loadIssueTemplate(templateId?: number | null): Promise<IssueTemplate> {
    const [preview, local, global, texts] = await Promise.all([
        apiRequest(`/api/internal/ops-records/templates/preview${templateId ? `?template_id=${templateId}` : ''}`),
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

/** Fechas de la mascota que usa el diseño (nacimiento / fallecimiento salen de la ficha). */
export function issueDateFields(data: IssueTemplate | undefined): (CertTextField & { type: DateKind })[] {
    const tpl = data?.template;
    if (!tpl || tpl.category !== 'certificadoImg') return [];
    return (tpl.sections_config?.fields || []).filter((f): f is CertTextField & { type: DateKind } => f.type in PET_DATE_KEY);
}

export const petDatesQueryKey = (petId: number) => ['tenant', 'pet', petId, 'dates'];

/** Fechas de nacimiento y fallecimiento de la ficha (AAAA-MM-DD, '' si falta). */
export function usePetDates(petId: number | null | undefined, enabled = true) {
    return useQuery({
        queryKey: petDatesQueryKey(petId ?? 0),
        queryFn: async () => {
            const pet = await apiRequest(`/api/internal/pets/${petId}`);
            return {
                birth_date: (pet?.birth_date || '').slice(0, 10) as string,
                death_date: (pet?.death_date || '').slice(0, 10) as string,
                birth_date_year_only: !!pet?.birth_date_year_only,
                death_date_year_only: !!pet?.death_date_year_only,
            };
        },
        enabled: enabled && !!petId,
        staleTime: 30_000,
    });
}

/** Fechas que el diseño muestra y la ficha no tiene. */
export function missingPetDates(data: IssueTemplate | undefined, dates: { birth_date: string; death_date: string } | undefined): DateKind[] {
    if (!dates) return [];
    const kinds = new Set(issueDateFields(data).map((f) => f.type));
    return [...kinds].filter((k) => !dates[PET_DATE_KEY[k]]);
}

const ASPECT_PADDING: Record<string, number> = { '16:9': 56.25, '4:3': 75, '3:4': 133.333 };

interface Props {
    isOpen: boolean;
    onClose: () => void;
    cremationId: number;
    /** Mascota de la orden: sus fechas se completan aquí y se guardan en la ficha. */
    petId?: number | null;
    hasIssued: boolean;
    data: IssueTemplate | undefined;
    isLoading: boolean;
    /** Emite con los overrides dados (abre la pestaña del certificado). */
    onIssue: (templateId: number | undefined, overrides: CertOverrides) => Promise<boolean>;
    /** Tras guardar textos con código, para recargar los guardados. */
    onTextsSaved: () => void;
}

/**
 * Edición de los textos libres del certificado antes de emitirlo, con vista
 * previa en vivo. Si el diseño usa fechas de la mascota (nacimiento /
 * fallecimiento), se pueden completar aquí: se guardan en la ficha de la mascota
 * al emitir. El diseño del admin no se modifica.
 */
export default function CertificateTextsModal({ isOpen, onClose, cremationId, petId, hasIssued, data, isLoading, onIssue, onTextsSaved }: Props) {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [texts, setTexts] = useState<Record<string, string>>({});
    const [saveToggles, setSaveToggles] = useState<Record<string, boolean>>({});
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [issuing, setIssuing] = useState(false);
    const previewReqRef = useRef(0);

    const template = data?.template || null;
    const savedTexts = data?.savedTexts || {};
    const textFields = issueTextFields(data);
    const dateKinds = [...new Set(issueDateFields(data).map((f) => f.type))];
    const { data: petDates } = usePetDates(petId, isOpen && dateKinds.length > 0);
    const [dates, setDates] = useState<Record<DateKind, string>>({ fecha_nacimiento: '', fecha_fallecimiento: '' });
    const [yearOnly, setYearOnly] = useState<Record<DateKind, boolean>>({ fecha_nacimiento: false, fecha_fallecimiento: false });
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

    // Fechas: lo que tiene la ficha (se recarga al abrir).
    useEffect(() => {
        if (!isOpen || !petDates) return;
        setDates({ fecha_nacimiento: petDates.birth_date, fecha_fallecimiento: petDates.death_date });
        setYearOnly({ fecha_nacimiento: petDates.birth_date_year_only, fecha_fallecimiento: petDates.death_date_year_only });
    }, [isOpen, petDates]);

    const buildOverrides = () => {
        const overrides: CertOverrides = {};
        textFields.forEach((f) => {
            const v = texts[f.id];
            if (v !== undefined) overrides[f.id] = { value: v };
        });
        issueDateFields(data).forEach((f) => {
            const d = dates[f.type];
            if (isFullDate(d)) overrides[f.id] = yearOnly[f.type] ? { date: d, format: 'year' } : { date: d };
        });
        return overrides;
    };

    // Guarda en la ficha las fechas cambiadas (al mediodía, para que la zona horaria no mueva el día).
    const savePetDates = async (): Promise<boolean> => {
        if (!petId || !petDates) return true;
        const body: Record<string, string | boolean | null> = {};
        dateKinds.forEach((k) => {
            const key = PET_DATE_KEY[k];
            const value = isFullDate(dates[k]) ? dates[k] : '';
            const flag = !!value && yearOnly[k];
            if (value !== petDates[key]) body[key] = value ? `${value}T12:00:00` : null;
            if (flag !== petDates[PET_YEAR_KEY[k]]) body[PET_YEAR_KEY[k]] = flag;
        });
        if (!Object.keys(body).length) return true;
        try {
            await apiRequest(`/api/internal/pets/${petId}`, { method: 'PATCH', body });
            queryClient.invalidateQueries({ queryKey: petDatesQueryKey(petId) });
            queryClient.invalidateQueries({ queryKey: ['tenant', 'pets'] });
            return true;
        } catch (err: unknown) {
            showToast('No se pudieron guardar las fechas en la ficha: ' + (err instanceof Error ? err.message : ''), 'error');
            return false;
        }
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
        // buildOverrides se deriva de texts y dates
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, template?.id, cremationId, texts, dates, yearOnly]);

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
            if (!(await savePetDates())) return;
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
                        <div className="space-y-5">
                        {/* Fechas de la mascota (se guardan en la ficha) */}
                        {dateKinds.length > 0 && (
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><Calendar size={12} /> Fechas de la mascota</label>
                                {!petId ? (
                                    <p className="text-xs text-muted-foreground">Se usan las fechas de la ficha de la mascota.</p>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            {dateKinds.map((k) => {
                                                const missing = !!petDates && !petDates[PET_DATE_KEY[k]];
                                                const empty = !isFullDate(dates[k]);
                                                return (
                                                    <div key={k} className="space-y-1.5">
                                                        <span className="text-[10px] text-white/40 font-bold uppercase flex items-center gap-1.5 flex-wrap">
                                                            {DATE_LABELS[k]}
                                                            {missing && empty && <span className="text-amber-400 normal-case">· falta</span>}
                                                            <span className="ml-auto">
                                                                <DateModeToggle yearOnly={yearOnly[k]} onChange={(v) => {
                                                                    setYearOnly((prev) => ({ ...prev, [k]: v }));
                                                                    // Pasar a «solo año» deja el 1 de enero de ese año
                                                                    if (v) setDates((prev) => ({ ...prev, [k]: isFullDate(prev[k]) ? `${prev[k].slice(0, 4)}-01-01` : '' }));
                                                                    else setDates((prev) => ({ ...prev, [k]: isFullDate(prev[k]) ? prev[k] : '' }));
                                                                }} />
                                                            </span>
                                                        </span>
                                                        {yearOnly[k] ? (
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                placeholder={`Ej: ${THIS_YEAR - 8}`}
                                                                maxLength={4}
                                                                value={dates[k].slice(0, 4)}
                                                                onChange={(e) => {
                                                                    const y = e.target.value.replace(/\D/g, '').slice(0, 4);
                                                                    const ok = y.length === 4 && Number(y) >= 1950 && Number(y) <= THIS_YEAR;
                                                                    setDates((prev) => ({ ...prev, [k]: ok ? `${y}-01-01` : y }));
                                                                }}
                                                                className={`w-full bg-black/40 border rounded-xl py-2 px-3 text-xs font-bold text-white outline-none focus:border-primary/50 ${(missing && empty) || (dates[k] && empty) ? 'border-amber-500/50' : 'border-white/5'}`}
                                                            />
                                                        ) : (
                                                            <input
                                                                type="date"
                                                                value={dates[k]}
                                                                max={new Date().toISOString().slice(0, 10)}
                                                                onChange={(e) => setDates((prev) => ({ ...prev, [k]: e.target.value }))}
                                                                className={`w-full bg-black/40 border rounded-xl py-2 px-3 text-xs font-bold text-white outline-none focus:border-primary/50 dark:[color-scheme:dark] ${missing && empty ? 'border-amber-500/50' : 'border-white/5'}`}
                                                            />
                                                        )}
                                                        {yearOnly[k] && dates[k] && empty && (
                                                            <p className="text-[10px] text-amber-400">Escribe el año con 4 dígitos (1950–{THIS_YEAR}).</p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[10px] text-white/20 font-medium">Al emitir se guardan en la ficha de la mascota y quedan para sus otros documentos.</p>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Textos libres */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><Type size={12} /> Textos</label>
                            {textFields.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Este diseño no tiene textos editables.</p>
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
