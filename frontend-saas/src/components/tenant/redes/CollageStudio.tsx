"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type Konva from 'konva';
import {
    ArrowLeft, ArrowRight, CalendarDays, Check, Download, Images, LayoutGrid, Loader2, RotateCcw, ShieldCheck, X,
} from 'lucide-react';

import TemplateCanvas, { type Bindings } from '@/components/admin/imageTemplates/TemplateCanvas';
import TemplatePreviewThumb from '@/components/admin/imageTemplates/TemplatePreviewThumb';
import { ASPECT_RATIOS, EXPORT_WIDTH } from '@/lib/admin/imageTemplates/constants';
import type { AspectRatio, CollageLayer, CollagePhoto, ImageTemplate } from '@/lib/admin/imageTemplates/types';
import { apiRequest, getImageUrl } from '@/lib/tenant/api';
import {
    getCollagePhotos, getRenderData, listTenantImageTemplates, registerTemplateUse, saveCollage, type CollageItem,
} from '@/lib/tenant/imageTemplates';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { usePermissions } from '@/app/(tenant)/tenant/context/PermissionContext';

const STAGE_MAX = 520;
const LAST_OPTIONS = [6, 9, 12, 16, 20, 25, 30, 40];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const cardCls = 'bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/[0.06] rounded-2xl p-4 space-y-3';
const labelCls = 'block text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-1.5';
const inputCls = 'w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white outline-none focus:border-primary/60';

/** Últimos 12 meses (el actual primero) como AAAA-MM. */
function recentMonths(): { value: string; label: string }[] {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.getMonth();
        return { value: `${d.getFullYear()}-${String(m + 1).padStart(2, '0')}`, label: `${MONTHS[m][0].toUpperCase()}${MONTHS[m].slice(1)} ${d.getFullYear()}` };
    });
}

/** «Luna, Max y Milo». */
function joinNames(names: string[]): string {
    if (names.length <= 1) return names[0] || '';
    return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

function capacityOf(t: ImageTemplate | null): number {
    const l = t?.definition.layers.find((x): x is CollageLayer => x.type === 'collage');
    return l ? Math.max(1, l.cols * l.rows) : 0;
}

/**
 * Collage de las mascotas despedidas (Diseños para Redes → Collage): plantilla
 * de collage del SuperAdmin + fotos principales de las órdenes entregadas en un
 * mes o las últimas N, solo con la autorización de la familia. Se descarga como PNG.
 */
export default function CollageStudio() {
    const { showToast } = useToast();
    const { canEdit } = usePermissions();
    const qc = useQueryClient();
    const stageRef = useRef<Konva.Stage>(null);
    const months = useMemo(recentMonths, []);

    const { data: templatesPage, isLoading: loadingTemplates } = useQuery({
        queryKey: ['tenant', 'image-templates', 'collage'],
        queryFn: () => listTenantImageTemplates(1, 60, 'collage'),
    });
    const templates = useMemo(() => templatesPage?.items || [], [templatesPage]);
    const [templateId, setTemplateId] = useState<number | null>(null);
    const template = templates.find(t => t.id === templateId) || templates[0] || null;
    const capacity = capacityOf(template);

    const [mode, setMode] = useState<'month' | 'last'>('month');
    const [month, setMonth] = useState(months[0].value);
    const [lastN, setLastN] = useState<number | null>(null);
    const last = lastN ?? (capacity || 12);
    const [ratio, setRatio] = useState<AspectRatio | null>(null);
    const [phrase, setPhrase] = useState('');
    // Fotos quitadas y orden manual (por pet_id), se reinician al cambiar de periodo.
    const [removed, setRemoved] = useState<number[]>([]);
    const [order, setOrder] = useState<number[] | null>(null);
    const [busy, setBusy] = useState<number | null>(null);
    const [confirmAll, setConfirmAll] = useState(false);
    const [authorizingAll, setAuthorizingAll] = useState(false);
    const [exporting, setExporting] = useState(false);

    const periodKey = mode === 'month' ? `m:${month}` : `l:${last}`;
    const { data, isFetching, error } = useQuery({
        queryKey: ['tenant', 'collage-photos', periodKey],
        queryFn: () => getCollagePhotos(mode === 'month' ? { month } : { last }),
    });
    const { data: tenantData } = useQuery({ queryKey: ['tenant', 'render-data', 'none'], queryFn: () => getRenderData(null) });

    // Reiniciar la selección manual cuando cambia el periodo.
    const [seenKey, setSeenKey] = useState(periodKey);
    if (seenKey !== periodKey) {
        setSeenKey(periodKey);
        setRemoved([]);
        setOrder(null);
    }

    const available = useMemo(() => (data?.photos || []).filter(p => !removed.includes(p.pet_id)), [data, removed]);
    const ordered = useMemo(() => {
        if (!order) return available;
        const pos = (id: number) => { const i = order.indexOf(id); return i < 0 ? Number.MAX_SAFE_INTEGER : i; };
        return [...available].sort((a, b) => pos(a.pet_id) - pos(b.pet_id));
    }, [available, order]);
    const used = capacity ? ordered.slice(0, capacity) : ordered;

    const collage: CollagePhoto[] = useMemo(() => used.map(p => ({ url: getImageUrl(p.url), name: p.pet_name })), [used]);

    const ratios = (template?.supported_ratios?.length ? template.supported_ratios : ['1:1']) as AspectRatio[];
    const activeRatio = ratio && ratios.includes(ratio) ? ratio : ratios[0];
    const stageSize = useMemo(() => {
        const r = ASPECT_RATIOS.find(a => a.value === activeRatio) || ASPECT_RATIOS[0];
        return r.w >= r.h
            ? { width: STAGE_MAX, height: Math.round((STAGE_MAX * r.h) / r.w) }
            : { width: Math.round((STAGE_MAX * r.w) / r.h), height: STAGE_MAX };
    }, [activeRatio]);

    const label = mode === 'month' ? (months.find(m => m.value === month)?.label || data?.label || '') : (data?.label || '');
    const bindings: Bindings = useMemo(() => ({
        ...(tenantData || {}),
        period_label: label,
        period_count: String(used.length),
        pet_names: joinNames(used.map(p => p.pet_name)),
        phrase: phrase || template?.default_phrase || '',
        date: new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }),
    }), [tenantData, label, used, phrase, template]);

    const move = (petId: number, dir: -1 | 1) => {
        const ids = ordered.map(p => p.pet_id);
        const i = ids.indexOf(petId);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= ids.length) return;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        setOrder(ids);
    };

    const authorize = async (item: CollageItem) => {
        setBusy(item.pet_id);
        try {
            await apiRequest(`/api/internal/pets/${item.pet_id}`, { method: 'PATCH', body: { photo_consent: true } });
            await qc.invalidateQueries({ queryKey: ['tenant', 'collage-photos'] });
            showToast(`Foto de ${item.pet_name} autorizada`, 'success');
        } catch (e) {
            showToast((e as Error).message || 'No se pudo guardar la autorización', 'error');
        } finally {
            setBusy(null);
        }
    };

    /** Autoriza todas las pendientes del periodo (el crematorio declara tener la autorización). */
    const authorizeAll = async (items: CollageItem[]) => {
        setAuthorizingAll(true);
        let ok = 0;
        for (const item of items) {
            try {
                await apiRequest(`/api/internal/pets/${item.pet_id}`, { method: 'PATCH', body: { photo_consent: true } });
                ok++;
            } catch { /* se informa abajo */ }
        }
        await qc.invalidateQueries({ queryKey: ['tenant', 'collage-photos'] });
        setAuthorizingAll(false);
        setConfirmAll(false);
        if (ok === items.length) showToast(`${ok} foto${ok === 1 ? '' : 's'} autorizada${ok === 1 ? '' : 's'}`, 'success');
        else showToast(`Se autorizaron ${ok} de ${items.length}. Intenta de nuevo con las restantes.`, 'error');
    };

    const download = () => {
        const stage = stageRef.current;
        if (!stage || !template) return;
        setExporting(true);
        try {
            const url = stage.toDataURL({ pixelRatio: EXPORT_WIDTH / stageSize.width, mimeType: 'image/png' });
            registerTemplateUse(template.id).catch(() => { });
            // Queda registrado (receta, sin imagen) para las estadísticas de uso de la plantilla.
            saveCollage(template.id, {
                ratio: activeRatio, mode, period: mode === 'month' ? month : String(last), label,
                phrase: phrase || template.default_phrase || '',
                photos: used.map(p => ({ pet_id: p.pet_id, url: p.url, name: p.pet_name })),
            }).catch(() => { });
            const a = document.createElement('a');
            a.href = url;
            a.download = `collage-${(label || 'mascotas').replace(/\s+/g, '-').toLowerCase()}-${activeRatio.replace(':', 'x')}.png`;
            a.click();
            showToast('Collage descargado', 'success');
        } catch {
            showToast('No se pudo exportar el collage (alguna foto no cargó)', 'error');
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        if (!templateId && templates[0]) setTemplateId(templates[0].id);
    }, [templateId, templates]);

    if (loadingTemplates) {
        return <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" size={28} /></div>;
    }
    if (!templates.length) {
        return (
            <div className="text-center py-20 text-slate-500">
                <LayoutGrid className="mx-auto mb-3 opacity-40" size={44} />
                <p className="font-semibold">Aún no hay plantillas de collage disponibles.</p>
                <p className="text-sm mt-1">Pronto tendrás diseños para juntar a los angelitos de cada mes.</p>
            </div>
        );
    }

    const pending = data?.pending || [];
    const total = data?.photos.length || 0;

    return (
        <div className="flex flex-col xl:flex-row gap-6 items-start">
            <div className="w-full xl:w-[420px] shrink-0 space-y-4">
                {/* Plantilla */}
                <div className={cardCls}>
                    <label className={labelCls}>Plantilla</label>
                    <div className="grid grid-cols-3 gap-2">
                        {templates.map(t => (
                            <button key={t.id} type="button" onClick={() => setTemplateId(t.id)} title={t.name}
                                className={`rounded-xl overflow-hidden border-2 transition ${template?.id === t.id ? 'border-primary' : 'border-transparent hover:border-slate-300 dark:hover:border-white/20'}`}>
                                <TemplatePreviewThumb template={t} className="h-24 w-full" />
                                <span className="block truncate px-1 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">{t.name}</span>
                            </button>
                        ))}
                    </div>
                    {capacity > 0 && <p className="text-[11px] text-slate-500">Esta plantilla tiene espacio para <b>{capacity}</b> fotos.</p>}
                </div>

                {/* Periodo */}
                <div className={cardCls}>
                    <label className={labelCls}>Periodo</label>
                    <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                        {([['month', 'Por mes', CalendarDays], ['last', 'Últimas', Images]] as const).map(([k, l, Icon]) => (
                            <button key={k} type="button" onClick={() => setMode(k)}
                                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold ${mode === k ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                <Icon size={13} /> {l}
                            </button>
                        ))}
                    </div>
                    {mode === 'month' ? (
                        <select value={month} onChange={(e) => setMonth(e.target.value)} className={inputCls}>
                            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    ) : (
                        <select value={last} onChange={(e) => setLastN(Number(e.target.value))} className={inputCls}>
                            {[...new Set([...LAST_OPTIONS, capacity].filter(Boolean))].sort((a, b) => a - b).map(n => (
                                <option key={n} value={n}>Últimas {n} mascotas entregadas</option>
                            ))}
                        </select>
                    )}
                    <div>
                        <label className={labelCls}>Frase (opcional)</label>
                        <input value={phrase} maxLength={160} onChange={(e) => setPhrase(e.target.value)}
                            placeholder={template?.default_phrase || 'Siempre en nuestro corazón'} className={inputCls} />
                    </div>
                </div>

                {/* Fotos */}
                <div className={cardCls}>
                    <div className="flex items-center justify-between">
                        <label className={labelCls}>Fotos · {used.length}{capacity ? ` de ${capacity}` : ''}</label>
                        {(removed.length > 0 || order) && (
                            <button type="button" onClick={() => { setRemoved([]); setOrder(null); }}
                                className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-primary">
                                <RotateCcw size={11} /> Restablecer
                            </button>
                        )}
                    </div>
                    {isFetching && !data ? (
                        <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-primary" size={20} /></div>
                    ) : error ? (
                        <p className="text-xs text-red-500">{(error as Error).message}</p>
                    ) : total === 0 ? (
                        <p className="text-xs text-slate-500">No hay fotos autorizadas de mascotas entregadas en este periodo.</p>
                    ) : (
                        <>
                            <div className="grid grid-cols-4 gap-2">
                                {ordered.map((p, i) => {
                                    const inCollage = !capacity || i < capacity;
                                    return (
                                        <div key={p.pet_id} className={`relative group rounded-xl overflow-hidden aspect-square border ${inCollage ? 'border-slate-200 dark:border-white/10' : 'border-dashed border-slate-300 opacity-45'}`}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={getImageUrl(p.url)} alt={p.pet_name} className="w-full h-full object-cover" loading="lazy" />
                                            <span className="absolute inset-x-0 bottom-0 bg-black/55 text-white text-[9px] font-bold px-1 py-0.5 truncate">{p.pet_name}</span>
                                            <div className="absolute inset-0 flex items-start justify-between p-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                                                <div className="flex gap-0.5">
                                                    <button type="button" aria-label={`Mover ${p.pet_name} antes`} onClick={() => move(p.pet_id, -1)}
                                                        className="p-0.5 rounded bg-white/90 text-slate-700"><ArrowLeft size={11} /></button>
                                                    <button type="button" aria-label={`Mover ${p.pet_name} después`} onClick={() => move(p.pet_id, 1)}
                                                        className="p-0.5 rounded bg-white/90 text-slate-700"><ArrowRight size={11} /></button>
                                                </div>
                                                <button type="button" aria-label={`Quitar ${p.pet_name}`} onClick={() => setRemoved(r => [...r, p.pet_id])}
                                                    className="p-0.5 rounded bg-white/90 text-red-600"><X size={11} /></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {capacity > 0 && ordered.length > capacity && (
                                <p className="text-[11px] text-slate-500">Las atenuadas no caben: quita alguna de arriba o muévelas para cambiarlas.</p>
                            )}
                        </>
                    )}
                </div>

                {/* Autorizaciones pendientes */}
                {(pending.length > 0 || (data?.declined || 0) > 0) && (
                    <div className={`${cardCls} border-amber-200 dark:border-amber-500/20`}>
                        <p className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                            <ShieldCheck size={14} /> Fotos sin autorización de la familia
                        </p>
                        <p className="text-[11px] text-slate-500">
                            Solo se usan las fotos que la familia autorizó en el formulario.
                            {pending.length > 0 && ' Si tienes su autorización por otro medio, márcala aquí.'}
                            {(data?.declined || 0) > 0 && ` ${data!.declined} familia${data!.declined === 1 ? '' : 's'} no autorizó.`}
                        </p>
                        {pending.length > 1 && canEdit('mascotas') && (
                            confirmAll ? (
                                <div className="rounded-xl border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-3 space-y-2">
                                    <p className="text-[11px] text-emerald-900 dark:text-emerald-200">
                                        Confirmas que tienes la autorización de las <b>{pending.length}</b> familias para publicar la foto de su mascota.
                                    </p>
                                    <div className="flex gap-2">
                                        <button type="button" disabled={authorizingAll} onClick={() => authorizeAll(pending)}
                                            className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50">
                                            {authorizingAll ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Sí, autorizar todas
                                        </button>
                                        <button type="button" disabled={authorizingAll} onClick={() => setConfirmAll(false)}
                                            className="rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5">
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button type="button" onClick={() => setConfirmAll(true)}
                                    className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-500/30 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
                                    <Check size={13} /> Agregar todas ({pending.length})
                                </button>
                            )
                        )}
                        {pending.length > 0 && (
                            <ul className="space-y-1.5 max-h-56 overflow-y-auto">
                                {pending.map(p => (
                                    <li key={p.pet_id} className="flex items-center gap-2">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={getImageUrl(p.url)} alt="" className="w-8 h-8 rounded-lg object-cover" loading="lazy" />
                                        <span className="flex-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{p.pet_name}</span>
                                        {canEdit('mascotas') && (
                                            <button type="button" disabled={busy === p.pet_id} onClick={() => authorize(p)}
                                                className="flex items-center gap-1 rounded-lg border border-emerald-300 dark:border-emerald-500/30 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 disabled:opacity-50">
                                                {busy === p.pet_id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Tengo autorización
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>

            {/* Lienzo */}
            <div className="flex-1 flex flex-col items-center gap-4 min-w-0">
                {ratios.length > 1 && (
                    <div className="flex gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                        {ratios.map(r => (
                            <button key={r} onClick={() => setRatio(r)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold ${activeRatio === r ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500'}`}>{r}</button>
                        ))}
                    </div>
                )}
                <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-white/10 max-w-full">
                    {template && (
                        <TemplateCanvas ref={stageRef} width={stageSize.width} height={stageSize.height}
                            definition={template.definition} bindings={bindings} collage={collage} />
                    )}
                </div>
                <button type="button" onClick={download} disabled={exporting || !template || used.length === 0}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-40">
                    {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Descargar PNG
                </button>
                <p className="text-[11px] text-slate-500 text-center max-w-md">
                    Se descarga en 1080 px, listo para Instagram. No se guarda en la nube.
                </p>
            </div>
        </div>
    );
}
