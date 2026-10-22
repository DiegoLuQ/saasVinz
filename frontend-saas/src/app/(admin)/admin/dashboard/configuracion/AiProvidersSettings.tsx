import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/admin/api';
import { Bot, Plus, Trash2, Save, Loader2, Plug, CheckCircle, AlertTriangle, Eye, EyeOff, Type, ImageIcon } from 'lucide-react';

type ProviderKey = 'gemini' | 'anthropic' | 'openai' | 'openrouter' | 'deepseek';

interface CatalogEntry {
    label: string;
    supports_image: boolean;
    model_hint: string;
}

interface AiProvider {
    id: number;
    provider: ProviderKey;
    name: string;
    model: string;
    is_active: boolean;
    use_for_text: boolean;
    use_for_image: boolean;
    cost_per_use_usd: number;
    priority: number;
    api_key_hint: string | null;
    last_test_at: string | null;
    last_test_ok: boolean | null;
    last_test_message: string | null;
}

/** Fila editable: `id` null = aún no guardada. `api_key` vacía = conservar la guardada. */
interface Draft {
    key: string;
    id: number | null;
    provider: ProviderKey;
    name: string;
    model: string;
    api_key: string;
    api_key_hint: string | null;
    is_active: boolean;
    use_for_text: boolean;
    use_for_image: boolean;
    /** Texto del input (permite escribir "0,04"); se convierte al guardar. */
    cost: string;
    /** Orden de uso (1 = principal); texto del input. */
    priority: string;
    last_test_ok: boolean | null;
    last_test_message: string | null;
    last_test_at: string | null;
    /** Hay cambios en pantalla que aún no se guardan en la DB. */
    dirty: boolean;
}

interface TestResult {
    ok: boolean;
    message: string;
    detail?: string | null;
}

const BASE = '/api/internal/creator/ai-providers';

const PROVIDER_ORDER: ProviderKey[] = ['gemini', 'anthropic', 'openai', 'openrouter', 'deepseek'];
const PROVIDER_COLORS: Record<ProviderKey, string> = {
    gemini: 'bg-blue-500/15 text-blue-300',
    anthropic: 'bg-orange-500/15 text-orange-300',
    openai: 'bg-emerald-500/15 text-emerald-300',
    openrouter: 'bg-violet-500/15 text-violet-300',
    deepseek: 'bg-sky-500/15 text-sky-300',
};

const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary/60';
const labelCls = 'block text-xs font-bold text-white/50 mb-1.5';

const toDraft = (p: AiProvider): Draft => ({
    key: `p_${p.id}`, id: p.id, provider: p.provider, name: p.name, model: p.model, api_key: '',
    api_key_hint: p.api_key_hint, is_active: p.is_active, use_for_text: p.use_for_text, use_for_image: p.use_for_image,
    cost: String(p.cost_per_use_usd ?? 0), priority: String(p.priority ?? 1),
    last_test_ok: p.last_test_ok, last_test_message: p.last_test_message, last_test_at: p.last_test_at,
    dirty: false,
});

export default function AiProvidersSettings() {
    const [catalog, setCatalog] = useState<Record<string, CatalogEntry>>({});
    const [rows, setRows] = useState<Draft[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<Record<string, 'save' | 'test' | 'delete' | undefined>>({});
    const [tests, setTests] = useState<Record<string, TestResult | undefined>>({});
    const [showKey, setShowKey] = useState<Record<string, boolean>>({});
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const load = async () => {
        try {
            const [cat, list] = await Promise.all([apiRequest(`${BASE}/catalog`), apiRequest(BASE)]);
            setCatalog(cat);
            setRows((list as AiProvider[]).map(toDraft));
        } catch (e) {
            setMessage({ type: 'error', text: (e as Error).message || 'No se pudieron cargar las plataformas' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const update = (key: string, patch: Partial<Draft>) =>
        setRows(prev => prev.map(r => (r.key === key ? { ...r, ...patch, dirty: true } : r)));

    const addRow = () => {
        const provider: ProviderKey = 'gemini';
        setRows(prev => [...prev, {
            key: `new_${Date.now()}`, id: null, provider, name: catalog[provider]?.label || 'Gemini',
            model: catalog[provider]?.model_hint || '', api_key: '', api_key_hint: null, is_active: true,
            use_for_text: prev.length === 0, use_for_image: false, cost: '0',
            priority: String(Math.min(20, prev.reduce((m, x) => Math.max(m, Number(x.priority) || 1), 0) + 1)),
            last_test_ok: null, last_test_message: null, last_test_at: null, dirty: true,
        }]);
    };

    const setBusyFor = (key: string, v: 'save' | 'test' | 'delete' | undefined) => setBusy(b => ({ ...b, [key]: v }));

    const flash = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    const save = async (r: Draft) => {
        if (!r.name.trim() || !r.model.trim()) { flash('error', 'Completa el nombre y el modelo'); return; }
        if (!r.id && r.api_key.trim().length < 8) { flash('error', 'Ingresa la API key'); return; }
        const cost = Number(r.cost.replace(',', '.'));
        if (!Number.isFinite(cost) || cost < 0 || cost > 100) { flash('error', 'El costo por uso debe ser un número entre 0 y 100 USD'); return; }
        const priority = Number(r.priority);
        if (!Number.isInteger(priority) || priority < 1 || priority > 20) { flash('error', 'El orden debe ser un número entero entre 1 y 20'); return; }
        setBusyFor(r.key, 'save');
        const body = {
            provider: r.provider, name: r.name.trim(), model: r.model.trim(), is_active: r.is_active,
            use_for_text: r.use_for_text, use_for_image: r.use_for_image, cost_per_use_usd: cost, priority,
            ...(r.api_key.trim() ? { api_key: r.api_key.trim() } : {}),
        };
        try {
            if (r.id) await apiRequest(`${BASE}/${r.id}`, { method: 'PATCH', body });
            else await apiRequest(BASE, { method: 'POST', body });
            // Recargar: el orden de las cadenas de respaldo depende de todas las conexiones.
            const list: AiProvider[] = await apiRequest(BASE);
            setRows(prev => {
                const unsaved = prev.filter(x => !x.id && x.key !== r.key);
                return [...list.map(toDraft), ...unsaved];
            });
            flash('success', 'Plataforma guardada');
        } catch (e) {
            flash('error', (e as Error).message || 'Error al guardar');
        } finally {
            setBusyFor(r.key, undefined);
        }
    };

    const test = async (r: Draft) => {
        if (!r.model.trim()) { flash('error', 'Ingresa el modelo'); return; }
        if (!r.id && !r.api_key.trim()) { flash('error', 'Ingresa la API key para probar'); return; }
        setBusyFor(r.key, 'test');
        setTests(t => ({ ...t, [r.key]: undefined }));
        try {
            const res: TestResult = await apiRequest(`${BASE}/test`, {
                method: 'POST',
                body: { id: r.id, provider: r.provider, model: r.model.trim(), api_key: r.api_key.trim() || null },
            });
            // Probar no guarda: la IA usa solo lo guardado.
            const pending = !r.id || r.dirty;
            setTests(t => ({ ...t, [r.key]: pending && res.ok ? { ...res, message: `${res.message} Presiona Guardar para usarla.` } : res }));
        } catch (e) {
            setTests(t => ({ ...t, [r.key]: { ok: false, message: (e as Error).message || 'Error al probar' } }));
        } finally {
            setBusyFor(r.key, undefined);
        }
    };

    const remove = async (r: Draft) => {
        if (!r.id) { setRows(prev => prev.filter(x => x.key !== r.key)); return; }
        setBusyFor(r.key, 'delete');
        try {
            await apiRequest(`${BASE}/${r.id}`, { method: 'DELETE' });
            setRows(prev => prev.filter(x => x.key !== r.key));
            flash('success', 'Plataforma eliminada');
        } catch (e) {
            flash('error', (e as Error).message || 'Error al eliminar');
        } finally {
            setBusyFor(r.key, undefined);
        }
    };

    // Cadena efectiva por uso, igual que el backend: activas, guardadas, por orden e id.
    const chains = {
        text: rows.filter(r => r.id && !r.dirty && r.is_active && r.use_for_text),
        image: rows.filter(r => r.id && !r.dirty && r.is_active && r.use_for_image && catalog[r.provider]?.supports_image),
    };
    for (const k of ['text', 'image'] as const) {
        chains[k].sort((a, b) => (Number(a.priority) - Number(b.priority)) || ((a.id ?? 0) - (b.id ?? 0)));
    }
    const roleLabel = (kind: 'text' | 'image', r: Draft) => {
        const i = chains[kind].findIndex(x => x.key === r.key);
        if (i < 0) return null;
        return i === 0 ? 'Principal' : `Respaldo #${i}`;
    };

    if (loading) return <div className="text-white/50 p-4">Cargando plataformas de IA...</div>;

    return (
        <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex justify-between items-start gap-4 mb-2">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Bot className="text-primary" size={24} /> Plataformas de IA
                        </h3>
                        <p className="text-white/40 text-sm mt-1 max-w-2xl">
                            Conexiones con Gemini, Claude, ChatGPT, OpenRouter o DeepSeek. Marca cuáles se usan para los
                            <b className="text-white/60"> textos</b> y cuáles para las <b className="text-white/60">ilustraciones</b> de
                            las plantillas para redes. Puedes marcar varias para el mismo uso: se usa la de menor <b className="text-white/60">orden</b> y,
                            si falla (saturada, sin saldo, key inválida), se salta automáticamente a la siguiente (la ilustración desde foto requiere Gemini o un modelo de imagen de OpenRouter, ej. qwen/qwen-image-2.1-turbo). Las API keys se guardan cifradas.
                        </p>
                    </div>
                    <button onClick={addRow}
                        className="shrink-0 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2">
                        <Plus size={16} /> Agregar plataforma
                    </button>
                </div>
                {message && (
                    <div className={`mt-4 p-3 rounded-xl border text-sm ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                        {message.text}
                    </div>
                )}
                <div className="mt-4 space-y-1.5">
                    {(['text', 'image'] as const).map(kind => {
                        const label = kind === 'text' ? 'Textos' : 'Ilustraciones';
                        const chain = chains[kind];
                        if (!chain.length) return (
                            <p key={kind} className="text-xs text-amber-300/80">
                                Sin conexión guardada para {label.toLowerCase()}: esa función de IA está deshabilitada.
                            </p>
                        );
                        return (
                            <p key={kind} className="text-xs text-white/50 flex items-center gap-1.5 flex-wrap">
                                {kind === 'text' ? <Type size={12} /> : <ImageIcon size={12} />}
                                <b className="text-white/70">{label}:</b>
                                {chain.map((c, i) => (
                                    <React.Fragment key={c.key}>
                                        {i > 0 && <span className="text-white/30">→</span>}
                                        <span className={i === 0 ? 'text-white/80 font-semibold' : ''}>{c.name}</span>
                                    </React.Fragment>
                                ))}
                                {chain.length === 1 && <span className="text-white/30">(sin respaldo)</span>}
                            </p>
                        );
                    })}
                </div>
            </div>

            {rows.length === 0 && (
                <div className="text-center text-white/40 text-sm py-10 border border-dashed border-white/10 rounded-2xl">
                    Aún no hay plataformas configuradas.
                </div>
            )}

            {rows.map(r => {
                const info = catalog[r.provider];
                const result = tests[r.key];
                const b = busy[r.key];
                const supportsImage = !!info?.supports_image;
                return (
                    <div key={r.key} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${PROVIDER_COLORS[r.provider]}`}>{info?.label || r.provider}</span>
                                {(!r.id || r.dirty) && <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300">{r.id ? 'Cambios sin guardar' : 'Sin guardar'}</span>}
                                {roleLabel('text', r) && <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-primary/20 text-primary flex items-center gap-1"><Type size={10} /> Textos · {roleLabel('text', r)}</span>}
                                {roleLabel('image', r) && <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-300 flex items-center gap-1"><ImageIcon size={10} /> Ilustraciones · {roleLabel('image', r)}</span>}
                                {!r.is_active && <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-white/10 text-white/50">Inactiva</span>}
                            </div>
                            {r.last_test_ok !== null && !result && (
                                <span className={`text-xs flex items-center gap-1 ${r.last_test_ok ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {r.last_test_ok ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                                    Última prueba {r.last_test_at ? new Date(r.last_test_at).toLocaleString('es-CL') : ''}
                                </span>
                            )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Plataforma</label>
                                <select value={r.provider} className={inputCls}
                                    onChange={(e) => {
                                        const provider = e.target.value as ProviderKey;
                                        const prevInfo = catalog[r.provider];
                                        update(r.key, {
                                            provider,
                                            // Si el nombre/modelo eran los sugeridos, se cambian por los de la nueva plataforma.
                                            name: !r.name || r.name === prevInfo?.label ? catalog[provider]?.label || r.name : r.name,
                                            model: !r.model || r.model === prevInfo?.model_hint ? catalog[provider]?.model_hint || '' : r.model,
                                            use_for_image: catalog[provider]?.supports_image ? r.use_for_image : false,
                                        });
                                    }}>
                                    {PROVIDER_ORDER.map(p => <option key={p} value={p} className="bg-slate-900">{catalog[p]?.label || p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Nombre</label>
                                <input value={r.name} maxLength={120} onChange={(e) => update(r.key, { name: e.target.value })}
                                    placeholder="Ej: Gemini producción" className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Modelo</label>
                                <input value={r.model} maxLength={160} onChange={(e) => update(r.key, { model: e.target.value })}
                                    placeholder={info?.model_hint} className={`${inputCls} font-mono`} />
                            </div>
                            <div>
                                <label className={labelCls}>API key</label>
                                <div className="relative">
                                    <input type={showKey[r.key] ? 'text' : 'password'} value={r.api_key} autoComplete="off"
                                        onChange={(e) => update(r.key, { api_key: e.target.value })}
                                        placeholder={r.api_key_hint ? `Guardada ${r.api_key_hint} · vacío = conservar` : 'Pega la API key'}
                                        className={`${inputCls} font-mono pr-10`} />
                                    <button type="button" onClick={() => setShowKey(s => ({ ...s, [r.key]: !s[r.key] }))}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                                        {showKey[r.key] ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Costo por uso (USD)</label>
                                <input value={r.cost} inputMode="decimal" onChange={(e) => update(r.key, { cost: e.target.value })}
                                    placeholder="0.04" className={`${inputCls} font-mono`} />
                                <p className="text-[11px] text-white/40 mt-1">
                                    Costo estimado de una generación, para medir el gasto.
                                    {r.provider === 'openrouter' ? ' En imágenes de OpenRouter se registra el costo real que informa la plataforma.' : ''}
                                </p>
                            </div>
                            <div>
                                <label className={labelCls}>Orden (1 = principal)</label>
                                <input type="number" min={1} max={20} step={1} value={r.priority}
                                    onChange={(e) => update(r.key, { priority: e.target.value })}
                                    className={`${inputCls} font-mono`} />
                                <p className="text-[11px] text-white/40 mt-1">
                                    Entre las conexiones del mismo uso se prueba primero la de menor número; si falla, la siguiente.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={r.is_active} onChange={(e) => update(r.key, { is_active: e.target.checked })} className="accent-emerald-500 w-4 h-4" />
                                Activa
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={r.use_for_text} onChange={(e) => update(r.key, { use_for_text: e.target.checked })} className="accent-emerald-500 w-4 h-4" />
                                Usar para textos
                            </label>
                            <label className={`flex items-center gap-2 ${supportsImage ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                                title={supportsImage ? undefined : 'La ilustración desde foto solo está disponible con Gemini u OpenRouter'}>
                                <input type="checkbox" disabled={!supportsImage} checked={r.use_for_image}
                                    onChange={(e) => update(r.key, { use_for_image: e.target.checked })} className="accent-emerald-500 w-4 h-4" />
                                Usar para ilustraciones
                            </label>
                        </div>

                        {(result || (r.last_test_message && r.last_test_ok === false)) && (
                            <div className={`p-3 rounded-xl border text-sm ${(result ? result.ok : r.last_test_ok) ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>
                                <div className="flex items-center gap-2 font-semibold">
                                    {(result ? result.ok : r.last_test_ok) ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                                    {result ? result.message : r.last_test_message}
                                </div>
                                {result?.detail && <p className="mt-1.5 text-xs opacity-75 font-mono break-words">{result.detail}</p>}
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2 justify-end">
                            <button onClick={() => remove(r)} disabled={!!b}
                                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-white/60 text-sm font-bold flex items-center gap-2 disabled:opacity-40">
                                {b === 'delete' ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Eliminar
                            </button>
                            <button onClick={() => test(r)} disabled={!!b}
                                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-40">
                                {b === 'test' ? <Loader2 size={15} className="animate-spin" /> : <Plug size={15} />} Probar conexión
                            </button>
                            <button onClick={() => save(r)} disabled={!!b}
                                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-40">
                                {b === 'save' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Guardar
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
