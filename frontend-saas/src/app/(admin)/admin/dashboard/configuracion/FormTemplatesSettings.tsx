import React, { useEffect, useState } from 'react';
import {
    AlertTriangle, ArrowDown, ArrowUp, CheckCircle, ChevronDown, ClipboardList, Copy, Eye, EyeOff,
    Loader2, Plus, RotateCcw, Save, Trash2,
} from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import {
    cleanPhaseOrder, HUELLA_TEMPLATE, MAX_PHASE_NAME, MAX_PHASE_PHRASE, PHASE_DEFAULTS, PHASE_KEYS,
    type FormFieldKey, type FormTemplate, type PhaseKey,
} from '@/lib/publicFormConfig';

const BASE = '/api/internal/creator/config/form-templates';
const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-primary/60 placeholder:text-white/25';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1.5';

interface FieldMeta { key: FormFieldKey; section: 'owner' | 'pet'; label: string; phase: PhaseKey; never_required: boolean }
interface Payload { templates: FormTemplate[]; is_default: boolean; fields: FieldMeta[]; max: number }

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

const PHASE_DESC: Record<PhaseKey, string> = {
    familia: 'Datos de contacto y retiro',
    angel: 'Mascota, especie y tamaño',
    camino: 'Planes y servicios',
    recuerdos: 'Fotos y dedicatoria',
};
// Campos fijos (siempre visibles y obligatorios), solo informativo
const FIXED: Partial<Record<PhaseKey, string>> = {
    familia: 'Nombre y teléfono del tutor siempre se piden.',
    angel: 'Nombre y especie de la mascota siempre se piden.',
};

function blankTemplate(n: number): FormTemplate {
    return {
        id: `plantilla-${Date.now()}`,
        name: `Nueva plantilla ${n}`,
        description: '',
        active: false,
        phases: { familia: true, angel: true, camino: true, recuerdos: true },
        phase_order: [...PHASE_KEYS],
        phase_labels: {},
        fields: clone(HUELLA_TEMPLATE.fields),
    };
}

/**
 * Admin → Configuración → «Plantillas de formulario»: formatos que cada crematorio
 * puede usar para crear un formulario personalizado (orden y nombre de las fases,
 * campos visibles y obligatorios). Crear desde una plantilla hace una copia: editarla
 * después no cambia los formularios ya creados. Backend: services/form_templates.py.
 */
export default function FormTemplatesSettings() {
    const [templates, setTemplates] = useState<FormTemplate[]>([]);
    const [fieldsMeta, setFieldsMeta] = useState<FieldMeta[]>([]);
    const [max, setMax] = useState(8);
    const [saved, setSaved] = useState('');
    const [isDefault, setIsDefault] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [open, setOpen] = useState<number | null>(0);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const load = (d: Payload) => {
        const list = (d?.templates || []).map(t => ({ ...t, phase_order: cleanPhaseOrder(t.phase_order), phase_labels: t.phase_labels || {} }));
        setTemplates(list);
        setSaved(JSON.stringify(list));
        setIsDefault(Boolean(d?.is_default));
        if (d?.fields) setFieldsMeta(d.fields);
        if (d?.max) setMax(d.max);
    };

    useEffect(() => {
        apiRequest(BASE)
            .then(load)
            .catch((e) => setMessage({ type: 'error', text: (e as Error).message || 'No se pudieron cargar las plantillas' }))
            .finally(() => setLoading(false));
    }, []);

    const dirty = JSON.stringify(templates) !== saved;
    const invalid = templates.some(t => !t.name.trim() || !PHASE_KEYS.some(k => t.phases?.[k] !== false));

    const patch = (i: number, p: Partial<FormTemplate>) =>
        setTemplates(prev => prev.map((t, j) => (j === i ? { ...t, ...p } : t)));

    const movePhase = (i: number, key: PhaseKey, dir: -1 | 1) => {
        const t = templates[i];
        const order = cleanPhaseOrder(t.phase_order);
        const a = order.indexOf(key);
        const b = a + dir;
        if (b < 0 || b >= order.length) return;
        [order[a], order[b]] = [order[b], order[a]];
        if (order.indexOf('camino') < order.indexOf('angel')) {
            setMessage({ type: 'error', text: '«Camino» debe ir después de «Ángel»: el tamaño elegido define los precios.' });
            return;
        }
        setMessage(null);
        patch(i, { phase_order: order });
    };

    const setLabel = (i: number, key: PhaseKey, part: 'name' | 'phrase', value: string) => {
        const labels = { ...(templates[i].phase_labels || {}) };
        labels[key] = { ...(labels[key] || {}), [part]: value };
        patch(i, { phase_labels: labels });
    };

    const setField = (i: number, key: FormFieldKey, p: { visible?: boolean; required?: boolean }) => {
        const fields = { ...(templates[i].fields || {}) };
        const cur = fields[key] || { visible: false, required: false };
        const next = { ...cur, ...p };
        if (p.required) next.visible = true;
        if (!next.visible) next.required = false;
        fields[key] = next;
        patch(i, { fields });
    };

    const move = (i: number, d: -1 | 1) =>
        setTemplates(prev => {
            const list = [...prev];
            const j = i + d;
            if (j < 0 || j >= list.length) return prev;
            [list[i], list[j]] = [list[j], list[i]];
            setOpen(j);
            return list;
        });

    const persist = async (body: { templates: FormTemplate[] | null }, okText: string) => {
        setSaving(true);
        setMessage(null);
        try {
            load(await apiRequest(BASE, { method: 'PUT', body }));
            setMessage({ type: 'success', text: okText });
        } catch (e) {
            setMessage({ type: 'error', text: (e as Error).message || 'No se pudo guardar' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-primary" size={28} /></div>;

    return (
        <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="text-primary" size={20} /> Plantillas de formulario</h3>
                    <p className="text-sm text-white/50 mt-1 max-w-2xl">
                        Formatos del formulario para las familias que cada crematorio puede usar en Configuración → Formulario y Pesos → Enlaces
                        («Crear desde plantilla»). Define el orden y el nombre de las fases y qué campos se muestran u obligan.
                        Crear desde una plantilla hace una copia: los formularios ya creados y el formulario principal no cambian. Hasta {max} plantillas;
                        los crematorios solo ven las activas.
                        {isDefault && <span className="block mt-1 text-amber-300/80">Hoy se usa la lista original («Formulario Huella»).</span>}
                    </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => persist({ templates }, 'Plantillas guardadas')} disabled={!dirty || invalid || saving}
                        className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar plantillas
                    </button>
                    <button type="button" onClick={() => persist({ templates: null }, 'Se restauró la lista original')} disabled={isDefault || saving}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30">
                        <RotateCcw size={13} /> Restaurar original
                    </button>
                </div>
            </div>

            {message && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'}`}>
                    {message.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />} {message.text}
                </div>
            )}

            {templates.map((t, i) => {
                const isOpen = open === i;
                const order = cleanPhaseOrder(t.phase_order);
                const visibleOrder = order.filter(k => t.phases?.[k] !== false);
                return (
                    <div key={t.id + i} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-3 p-4">
                            <button type="button" onClick={() => setOpen(isOpen ? null : i)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
                                <div className="min-w-0">
                                    <p className="flex items-center gap-2">
                                        <span className={`text-sm font-bold truncate ${t.name.trim() ? 'text-white' : 'text-rose-300'}`}>{t.name.trim() || 'Sin nombre (obligatorio)'}</span>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${t.active !== false ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-white/40'}`}>
                                            {t.active !== false ? 'Activa' : 'Inactiva'}
                                        </span>
                                    </p>
                                    <p className="text-[11px] text-white/40 truncate mt-0.5">
                                        {visibleOrder.map((k, n) => `${n + 1}. ${t.phase_labels?.[k]?.name?.trim() || PHASE_DEFAULTS[k].name}`).join(' → ')} → Resumen
                                    </p>
                                </div>
                                <ChevronDown size={16} className={`ml-auto shrink-0 text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <div className="flex items-center gap-1 shrink-0">
                                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir" className="p-2 rounded-lg text-white/50 hover:bg-white/10 disabled:opacity-20"><ArrowUp size={15} /></button>
                                <button type="button" onClick={() => move(i, 1)} disabled={i === templates.length - 1} aria-label="Bajar" className="p-2 rounded-lg text-white/50 hover:bg-white/10 disabled:opacity-20"><ArrowDown size={15} /></button>
                                <button type="button" disabled={templates.length >= max} title="Duplicar"
                                    onClick={() => { setTemplates(prev => [...prev, { ...clone(t), id: `${t.id}-copia`, name: `${t.name} (copia)`.slice(0, 60), active: false }]); setOpen(templates.length); }}
                                    aria-label="Duplicar plantilla" className="p-2 rounded-lg text-white/50 hover:bg-white/10 disabled:opacity-20"><Copy size={15} /></button>
                                <button type="button" onClick={() => { setTemplates(prev => prev.filter((_, j) => j !== i)); setOpen(null); }}
                                    aria-label="Eliminar plantilla" title="Eliminar plantilla"
                                    className="p-2 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 size={15} /></button>
                            </div>
                        </div>

                        {isOpen && (
                            <div className="border-t border-white/10 p-5 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-4 items-end">
                                    <div>
                                        <label className={labelCls}>Nombre *</label>
                                        <input className={inputCls} value={t.name} maxLength={60} onChange={(e) => patch(i, { name: e.target.value })} />
                                    </div>
                                    <button type="button" onClick={() => patch(i, { active: t.active === false })}
                                        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border ${t.active !== false ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-white/5 border-white/10 text-white/50'}`}>
                                        {t.active !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                                        {t.active !== false ? 'Visible para los crematorios' : 'Oculta para los crematorios'}
                                    </button>
                                    <div className="md:col-span-2">
                                        <label className={labelCls}>Descripción para la familia</label>
                                        <textarea className={`${inputCls} resize-none`} rows={2} maxLength={250} value={t.description || ''}
                                            onChange={(e) => patch(i, { description: e.target.value })}
                                            placeholder="Aparece arriba del formulario (el crematorio la puede cambiar)." />
                                    </div>
                                </div>

                                <div>
                                    <p className={labelCls}>Fases y campos</p>
                                    <p className="text-xs text-white/40 mb-3">
                                        Ordena las fases con las flechas. «Camino» siempre va después de «Ángel» (ahí se elige el tamaño que define los precios)
                                        y el resumen siempre al final. Los campos ocultos conservan su fase por si el crematorio los activa.
                                    </p>
                                    <div className="space-y-3">
                                        {order.map((key, idx) => {
                                            const visible = t.phases?.[key] !== false;
                                            const pos = order.slice(0, idx + 1).filter(k => t.phases?.[k] !== false).length;
                                            const phaseFields = fieldsMeta.filter(f => f.phase === key);
                                            return (
                                                <div key={key} className={`rounded-xl border p-4 ${visible ? 'border-primary/30 bg-primary/[0.04]' : 'border-white/10 bg-white/[0.02]'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex flex-col shrink-0">
                                                            <button type="button" onClick={() => movePhase(i, key, -1)} disabled={idx === 0} aria-label="Subir fase" className="p-1 rounded text-white/50 hover:bg-white/10 disabled:opacity-20"><ArrowUp size={13} /></button>
                                                            <button type="button" onClick={() => movePhase(i, key, 1)} disabled={idx === order.length - 1} aria-label="Bajar fase" className="p-1 rounded text-white/50 hover:bg-white/10 disabled:opacity-20"><ArrowDown size={13} /></button>
                                                        </div>
                                                        <p className={`flex-1 min-w-0 text-sm font-bold ${visible ? 'text-white' : 'text-white/40 line-through'}`}>
                                                            {visible ? `${pos}. ` : ''}{PHASE_DEFAULTS[key].name}
                                                            <span className="font-normal text-white/40 no-underline"> · {PHASE_DESC[key]}</span>
                                                        </p>
                                                        <button type="button" onClick={() => patch(i, { phases: { ...(t.phases || {}), [key]: !visible } })}
                                                            className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${visible ? 'bg-primary/20 border-primary/40 text-white' : 'bg-white/5 border-white/10 text-white/50'}`}>
                                                            {visible ? <Eye size={12} /> : <EyeOff size={12} />} {visible ? 'Visible' : 'Oculta'}
                                                        </button>
                                                    </div>
                                                    {visible && (
                                                        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] gap-2 mt-3">
                                                            <input className={inputCls} value={t.phase_labels?.[key]?.name || ''} maxLength={MAX_PHASE_NAME}
                                                                onChange={(e) => setLabel(i, key, 'name', e.target.value)} placeholder={`Nombre: ${PHASE_DEFAULTS[key].name}`} />
                                                            <input className={inputCls} value={t.phase_labels?.[key]?.phrase || ''} maxLength={MAX_PHASE_PHRASE}
                                                                onChange={(e) => setLabel(i, key, 'phrase', e.target.value)} placeholder={`Frase: ${PHASE_DEFAULTS[key].phrase}`} />
                                                        </div>
                                                    )}
                                                    {(phaseFields.length > 0 || FIXED[key]) && (
                                                        <div className="mt-3 rounded-lg border border-white/10 divide-y divide-white/5">
                                                            {FIXED[key] && <p className="px-3 py-2 text-[11px] text-white/40">{FIXED[key]}</p>}
                                                            {phaseFields.map(f => {
                                                                const st = t.fields?.[f.key] || { visible: false, required: false };
                                                                return (
                                                                    <div key={f.key} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-3 py-2">
                                                                        <span className={`text-xs truncate ${st.visible ? 'text-white/80' : 'text-white/35'}`}>{f.label}</span>
                                                                        <Chip on={st.visible} onClick={() => setField(i, f.key, { visible: !st.visible })}>Mostrar</Chip>
                                                                        <Chip on={st.required} disabled={f.never_required} onClick={() => setField(i, f.key, { required: !st.required })}
                                                                            title={f.never_required ? 'Este campo nunca es obligatorio' : undefined}>Obligatorio</Chip>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                    {key === 'camino' && <p className="mt-2 text-[11px] text-white/40">Planes, servicios especiales y precios del crematorio.</p>}
                                                    {key === 'recuerdos' && <p className="mt-2 text-[11px] text-white/40">Fotos y dedicatoria (cada crematorio decide si son obligatorias).</p>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            <div className="flex flex-wrap gap-2">
                <button type="button" disabled={templates.length >= max}
                    onClick={() => { setTemplates(prev => [...prev, blankTemplate(prev.length + 1)]); setOpen(templates.length); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-bold disabled:opacity-30">
                    <Plus size={15} /> Nueva plantilla
                </button>
                {!templates.some(t => t.id === HUELLA_TEMPLATE.id) && (
                    <button type="button" disabled={templates.length >= max}
                        onClick={() => { setTemplates(prev => [...prev, clone(HUELLA_TEMPLATE)]); setOpen(templates.length); }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold text-white/70 disabled:opacity-30">
                        <Plus size={15} /> Agregar «Formulario Huella»
                    </button>
                )}
            </div>
        </div>
    );
}

function Chip({ on, disabled, onClick, title, children }: { on: boolean; disabled?: boolean; onClick: () => void; title?: string; children: React.ReactNode }) {
    return (
        <button type="button" onClick={onClick} disabled={disabled} title={title}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${on ? 'bg-primary/25 border-primary/40 text-white' : 'bg-white/5 border-white/10 text-white/45 hover:text-white/70'}`}>
            {children}
        </button>
    );
}
