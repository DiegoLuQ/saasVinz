"use client";

import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { DIAG_API, type DiagCategory, type DiagConfig, type QuestionsResponse } from '@/lib/diagnostics';

const cardCls = 'bg-white/5 border border-white/10 rounded-2xl p-5';
const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/60';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5';
const btnCls = 'px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:brightness-110 disabled:opacity-40 flex items-center gap-2';

function NumberField({ label, value, onChange, suffix, hint }: { label: string; value: number; onChange: (n: number) => void; suffix?: string; hint?: string }) {
    return (
        <div>
            <label className={labelCls}>{label}</label>
            <div className="relative">
                <input type="number" min={0} value={value} onChange={e => onChange(Number(e.target.value) || 0)} className={`${inputCls} ${suffix ? 'pr-16' : ''}`} />
                {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40">{suffix}</span>}
            </div>
            {hint && <p className="text-[11px] text-white/40 mt-1">{hint}</p>}
        </div>
    );
}

export default function ConfigTab() {
    const qc = useQueryClient();
    const { showToast } = useToast();
    const { data: qdata } = useQuery<QuestionsResponse>({
        queryKey: ['admin', 'diagnostics', 'questions', 'all'],
        queryFn: () => apiRequest(`${DIAG_API}/questions?include_inactive=true`),
    });
    const { data: config } = useQuery<DiagConfig>({
        queryKey: ['admin', 'diagnostics', 'config'],
        queryFn: () => apiRequest(`${DIAG_API}/config`),
    });

    const [cats, setCats] = useState<DiagCategory[]>([]);
    const [cfg, setCfg] = useState<DiagConfig | null>(null);
    useEffect(() => { if (qdata) setCats(qdata.categories); }, [qdata]);
    useEffect(() => { if (config) setCfg(config); }, [config]);

    const saveCats = useMutation({
        mutationFn: () => apiRequest(`${DIAG_API}/categories`, {
            method: 'PUT', body: cats.map(c => ({ id: c.id, name: c.name, weight: c.weight, vinzer_feature: c.vinzer_feature })),
        }),
        onSuccess: () => { showToast('Categorías guardadas', 'success'); qc.invalidateQueries({ queryKey: ['admin', 'diagnostics', 'questions'] }); },
        onError: (e: Error) => showToast(e.message, 'error'),
    });
    const saveCfg = useMutation({
        mutationFn: () => apiRequest(`${DIAG_API}/config`, { method: 'PUT', body: cfg }),
        onSuccess: (data: DiagConfig) => { showToast('Configuración guardada', 'success'); qc.setQueryData(['admin', 'diagnostics', 'config'], data); },
        onError: (e: Error) => showToast(e.message, 'error'),
    });

    if (!qdata || !cfg) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    const total = Math.round(cats.reduce((a, c) => a + (Number(c.weight) || 0), 0) * 100) / 100;
    const setCat = (id: number, patch: Partial<DiagCategory>) => setCats(cs => cs.map(c => (c.id === id ? { ...c, ...patch } : c)));
    const setLevel = (i: number, patch: Partial<DiagConfig['levels'][number]>) =>
        setCfg(c => (c ? { ...c, levels: c.levels.map((l, j) => (j === i ? { ...l, ...patch } : l)) } : c));
    const setRule = (k: keyof DiagConfig['plan_rules'], v: number) =>
        setCfg(c => (c ? { ...c, plan_rules: { ...c.plan_rules, [k]: v } } : c));

    return (
        <div className="space-y-5">
            <section className={cardCls}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="text-white font-bold">Categorías y pesos</h3>
                        <p className="text-xs text-white/40 mt-1">El peso es cuánto influye cada área en el resultado general. Deben sumar 100 %.</p>
                    </div>
                    <span className={`text-sm font-black ${Math.abs(total - 100) < 0.01 ? 'text-emerald-300' : 'text-amber-300'}`}>Suma: {total} %</span>
                </div>
                <div className="mt-4 space-y-2">
                    {cats.map(c => (
                        <div key={c.id} className="grid grid-cols-[1fr_90px] sm:grid-cols-[minmax(0,14rem)_90px_1fr] gap-2 items-center">
                            <input value={c.name} onChange={e => setCat(c.id, { name: e.target.value })} maxLength={80} className={inputCls} aria-label="Nombre de la categoría" />
                            <div className="relative">
                                <input type="number" min={0} max={100} value={c.weight} onChange={e => setCat(c.id, { weight: Number(e.target.value) || 0 })}
                                    className={`${inputCls} pr-7 text-right`} aria-label={`Peso de ${c.name}`} />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40">%</span>
                            </div>
                            <input value={c.vinzer_feature ?? ''} onChange={e => setCat(c.id, { vinzer_feature: e.target.value })} maxLength={300}
                                placeholder="Cómo ayuda Vinzer en esta área (vacío = no aplica)" className={`${inputCls} col-span-2 sm:col-span-1`} />
                        </div>
                    ))}
                </div>
                <div className="mt-4 flex justify-end">
                    <button type="button" className={btnCls} disabled={saveCats.isPending || Math.abs(total - 100) > 0.01} onClick={() => saveCats.mutate()}>
                        {saveCats.isPending && <Loader2 size={14} className="animate-spin" />} Guardar categorías
                    </button>
                </div>
            </section>

            <section className={cardCls}>
                <h3 className="text-white font-bold">Niveles del resultado</h3>
                <p className="text-xs text-white/40 mt-1">Cada nivel empieza en su % mínimo y llega hasta el siguiente. El primero debe empezar en 0 %.</p>
                <div className="mt-4 space-y-2">
                    {cfg.levels.map((lv, i) => (
                        <div key={i} className="grid grid-cols-[80px_1fr_auto] sm:grid-cols-[80px_12rem_1fr_auto] gap-2 items-center">
                            <div className="relative">
                                <input type="number" min={0} max={100} value={lv.min} onChange={e => setLevel(i, { min: Number(e.target.value) || 0 })}
                                    className={`${inputCls} pr-7 text-right`} aria-label="Desde" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40">%</span>
                            </div>
                            <input value={lv.name} onChange={e => setLevel(i, { name: e.target.value })} maxLength={40} className={inputCls} aria-label="Nombre del nivel" />
                            <input value={lv.message} onChange={e => setLevel(i, { message: e.target.value })} maxLength={300}
                                placeholder="Mensaje para el crematorio" className={`${inputCls} col-span-2 sm:col-span-1 order-last sm:order-none`} />
                            <button type="button" aria-label="Quitar nivel" disabled={cfg.levels.length <= 2}
                                onClick={() => setCfg(c => (c ? { ...c, levels: c.levels.filter((_, j) => j !== i) } : c))}
                                className="p-2 rounded-lg text-white/40 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-30"><Trash2 size={15} /></button>
                        </div>
                    ))}
                </div>
                {cfg.levels.length < 6 && (
                    <button type="button" onClick={() => setCfg(c => (c ? { ...c, levels: [...c.levels, { min: 90, name: '', message: '' }] } : c))}
                        className="mt-2 text-xs font-bold text-primary flex items-center gap-1 hover:underline"><Plus size={13} /> Agregar nivel</button>
                )}
            </section>

            <section className={cardCls}>
                <h3 className="text-white font-bold">Recomendaciones y plan sugerido</h3>
                <div className="mt-4 grid sm:grid-cols-3 gap-4">
                    <NumberField label="Recomendar bajo" value={cfg.recommend_below} suffix="%" onChange={v => setCfg({ ...cfg, recommend_below: v })}
                        hint="Respuestas bajo este % muestran su recomendación." />
                    <NumberField label="Mínimo aplicable" value={cfg.min_applicable} suffix="%" onChange={v => setCfg({ ...cfg, min_applicable: v })}
                        hint="Con menos preguntas aplicables el informe dice «Diagnóstico parcial»." />
                    <NumberField label="Sugerir empezar gratis bajo" value={cfg.plan_rules.free_below} suffix="%" onChange={v => setRule('free_below', v)}
                        hint="Las cremaciones al mes suben el plan sugerido al que tenga órdenes suficientes (tope de cada plan)." />
                    <div>
                        <label className={labelCls}>Modalidad marcada en la web</label>
                        <select value={cfg.public_mode} onChange={e => setCfg({ ...cfg, public_mode: Number(e.target.value) as DiagConfig['public_mode'] })} className={inputCls}>
                            <option value={10}>Rápido · 10 preguntas</option>
                            <option value={15}>Estándar · 15 preguntas</option>
                            <option value={20}>Completo · 20 preguntas</option>
                        </select>
                        <p className="text-[11px] text-white/40 mt-1">En /diagnostico el crematorio elige Rápido, Estándar o Completo; esta viene marcada.</p>
                    </div>
                    <NumberField label="Descuento ofrecido" value={cfg.promo_pct} suffix="%" onChange={v => setCfg({ ...cfg, promo_pct: Math.min(90, v) })}
                        hint="Se muestra en el informe y el PDF (0 = sin promoción)." />
                    <div>
                        <label className={labelCls}>Texto de la promoción</label>
                        <input value={cfg.promo_text ?? ''} onChange={e => setCfg({ ...cfg, promo_text: e.target.value })} maxLength={160} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Enlace del informe</label>
                        <input value={cfg.cta_url} onChange={e => setCfg({ ...cfg, cta_url: e.target.value })} maxLength={300} className={inputCls} />
                        <p className="text-[11px] text-white/40 mt-1">Botón y QR del PDF.</p>
                    </div>
                </div>
                <p className="text-[11px] text-white/40 mt-4">
                    Reglas: más cremaciones al mes → PRO o ULTRA; si no, identidad/certificados o alianzas bajas → NORMAL;
                    gestión u operación bajas → Track; en otro caso NORMAL.
                </p>
                <div className="mt-4 flex justify-end">
                    <button type="button" className={btnCls} disabled={saveCfg.isPending} onClick={() => saveCfg.mutate()}>
                        {saveCfg.isPending && <Loader2 size={14} className="animate-spin" />} Guardar configuración
                    </button>
                </div>
            </section>
        </div>
    );
}
