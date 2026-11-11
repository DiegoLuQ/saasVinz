'use client';

/**
 * Cobro de traslado por comuna — Configuración → Formulario y Pesos → Pesos y precios.
 * El crematorio agrupa comunas en zonas con un precio de traslado y elige qué comunas
 * cuentan (retiro, entrega o ambas). Se cobra UNA vez (cubre retiro y entrega): la zona más cara.
 * Una comuna sin zona solo muestra un aviso en el formulario («a cotizar»).
 * Se guarda sola (API /api/internal/maintenance/transport, lógica app/services/transport.py).
 * Las comunas salen de la misma lista que usa el formulario (country-state-city).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Country, State, City } from 'country-state-city';
import {
    AlertTriangle, ChevronDown, Eye, EyeOff, Home, Loader2, MapPin, Pencil, Plus, Save, Search, Trash2, Truck, X,
} from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { normCommune } from '@/lib/transport';

interface Zone {
    id: string;
    name: string;
    price: string;
    communes: string[];
}

interface TransportResponse {
    enabled: boolean;
    charge_pickup: boolean;
    charge_delivery: boolean;
    show_prices: boolean;
    uncovered_message: string;
    zones: { id: string; name: string; price: number; communes: string[] }[];
    default_message: string;
    region?: string | null;
    country?: string | null;
}

const MAX_ZONES = 20;
const inputCls = 'w-full rounded-xl border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary';

/** Color por zona (punto y chips), para distinguirlas de un vistazo. */
const ZONE_COLORS = [
    { dot: 'bg-sky-400', chip: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
    { dot: 'bg-emerald-400', chip: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    { dot: 'bg-violet-400', chip: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
    { dot: 'bg-amber-400', chip: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    { dot: 'bg-rose-400', chip: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
    { dot: 'bg-teal-400', chip: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
];
const colorOf = (i: number) => ZONE_COLORS[i % ZONE_COLORS.length];

const priceNum = (s: string) => Number(s.replace(/\D/g, '') || 0);
const clp = (n: number) => `$${n.toLocaleString('es-CL')}`;
const newZone = (n: number): Zone => ({ id: Math.random().toString(36).slice(2, 12), name: `Zona ${n}`, price: '', communes: [] });

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
            className={`relative shrink-0 w-10 h-6 rounded-full transition-colors cursor-pointer ${checked ? 'bg-sky-500' : 'bg-foreground/20'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
        </button>
    );
}

/** Tarjeta de opción (retiro / entrega / precios visibles). */
function OptionCard({ icon: Icon, title, hint, checked, onChange }: {
    icon: React.ElementType; title: string; hint: string; checked: boolean; onChange: (v: boolean) => void;
}) {
    return (
        <button type="button" role="checkbox" aria-checked={checked} onClick={() => onChange(!checked)}
            className={`text-left rounded-2xl border p-3.5 transition-all cursor-pointer ${checked
                ? 'border-sky-500 bg-sky-50 dark:border-sky-400/60 dark:bg-sky-500/10'
                : 'border-slate-300 bg-white hover:border-slate-400 dark:border-white/15 dark:bg-white/[0.03] dark:hover:border-white/30'}`}>
            <div className="flex items-center justify-between gap-2">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${checked ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}>
                    <Icon size={16} />
                </span>
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${checked ? 'border-sky-600 dark:border-sky-300' : 'border-slate-400 dark:border-white/40'}`}>
                    {checked && <span className="w-2 h-2 rounded-full bg-sky-600 dark:bg-sky-300" />}
                </span>
            </div>
            <p className="mt-2.5 text-sm font-bold text-slate-900 dark:text-white">{title}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">{hint}</p>
        </button>
    );
}

export default function TransportSection() {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [open, setOpen] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [chargePickup, setChargePickup] = useState(true);
    const [chargeDelivery, setChargeDelivery] = useState(true);
    const [showPrices, setShowPrices] = useState(true);
    const [message, setMessage] = useState('');
    const [defaultMessage, setDefaultMessage] = useState('');
    const [zones, setZones] = useState<Zone[]>([]);
    const [openZone, setOpenZone] = useState<string | null>(null);
    const [country, setCountry] = useState('Chile');
    const [tenantRegion, setTenantRegion] = useState('');
    const [probe, setProbe] = useState('');

    useEffect(() => {
        apiRequest('/api/internal/maintenance/transport')
            .then((r: TransportResponse) => {
                setEnabled(r.enabled);
                setChargePickup(r.charge_pickup);
                setChargeDelivery(r.charge_delivery);
                setShowPrices(r.show_prices);
                setMessage(r.uncovered_message || '');
                setDefaultMessage(r.default_message);
                setZones(r.zones.map(z => ({ ...z, price: String(z.price ?? '') })));
                setCountry(r.country || 'Chile');
                setTenantRegion(r.region || '');
            })
            .catch(() => showToast('No se pudo cargar la configuración de traslados', 'error'))
            .finally(() => setLoading(false));
    }, [showToast]);

    const touch = () => setDirty(true);
    const updateZone = (id: string, patch: Partial<Zone>) => {
        setZones(zs => zs.map(z => (z.id === id ? { ...z, ...patch } : z)));
        touch();
    };

    // Comuna (normalizada) → zona que la tiene, para no repetirla en dos zonas
    const owner = useMemo(() => {
        const m = new Map<string, string>();
        zones.forEach(z => z.communes.forEach(c => m.set(normCommune(c), z.id)));
        return m;
    }, [zones]);

    const save = async () => {
        setSaving(true);
        try {
            const body = {
                enabled, charge_pickup: chargePickup, charge_delivery: chargeDelivery, show_prices: showPrices,
                uncovered_message: message,
                zones: zones.map(z => ({ id: z.id, name: z.name, price: priceNum(z.price), communes: z.communes })),
            };
            const r: TransportResponse = await apiRequest('/api/internal/maintenance/transport', {
                method: 'PUT', body: JSON.stringify(body),
            });
            setZones(r.zones.map(z => ({ ...z, price: String(z.price ?? '') })));
            setDirty(false);
            showToast('Traslados guardados', 'success');
        } catch (e) {
            showToast(e instanceof Error && e.message ? e.message : 'No se pudo guardar', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="glass-card p-6 rounded-3xl flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Cargando traslados…</div>;
    }

    const totalCommunes = zones.reduce((n, z) => n + z.communes.length, 0);
    const prices = zones.map(z => priceNum(z.price));
    const minP = prices.length ? Math.min(...prices) : 0;
    const maxP = prices.length ? Math.max(...prices) : 0;
    const range = prices.length ? (minP === maxP ? clp(minP) : `${clp(minP)} – ${clp(maxP)}`) : null;
    const legs = [chargePickup && 'retiro', chargeDelivery && 'entrega'].filter(Boolean).join(' y ');

    // «Probar una comuna»: qué vería la familia
    const probeZoneIdx = probe.trim() ? zones.findIndex(z => z.id === owner.get(normCommune(probe))) : -1;
    const probeZone = probeZoneIdx >= 0 ? zones[probeZoneIdx] : null;

    return (
        <div className="glass-card rounded-3xl overflow-hidden">
            {/* Cabecera plegable, igual que «Rangos de peso» */}
            <button type="button" onClick={() => setOpen(o => !o)}
                className="w-full p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 text-left cursor-pointer hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                        <Truck size={20} />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-white text-base">Traslados por comuna</h4>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${enabled
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-foreground/5 text-muted-foreground border-foreground/10'}`}>
                                {enabled ? 'Activo' : 'Apagado'}
                            </span>
                            {enabled && (
                                <span className="text-[10px] font-medium text-muted-foreground">
                                    · {zones.length} zona{zones.length === 1 ? '' : 's'} · {totalCommunes} comuna{totalCommunes === 1 ? '' : 's'}{range ? ` · ${range}` : ''}
                                </span>
                            )}
                            {dirty && <span className="text-[10px] font-bold text-amber-400">· Sin guardar</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                            {enabled && legs
                                ? `Un solo cobro por servicio según la comuna de ${legs}. Los convenios no lo descuentan.`
                                : 'Cobra el retiro y/o la entrega de cenizas según la comuna de la familia.'}
                        </p>
                    </div>
                </div>
                <span className="flex items-center gap-2">
                    <span className="text-xs font-bold px-3 py-1.5 rounded-xl border bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-500/15 dark:text-sky-200 dark:border-sky-500/40">
                        {open ? 'Plegar' : 'Expandir y editar'}
                    </span>
                    <span className={`p-2 rounded-xl bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/90 transition-transform ${open ? 'rotate-180' : ''}`}>
                        <ChevronDown size={18} />
                    </span>
                </span>
            </button>

            {open && (
                <div className="border-t border-white/5 p-5 sm:p-6 space-y-6">
                    {/* Interruptor principal */}
                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-foreground/10 bg-background/30 p-4">
                        <div>
                            <p className="text-sm font-bold text-white">Cobrar traslado en el formulario</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                La familia ve el costo al elegir su comuna y se suma al total. Queda en el registro y en la orden, donde puedes ajustarlo.
                            </p>
                        </div>
                        <Toggle label="Cobrar traslado" checked={enabled} onChange={v => { setEnabled(v); touch(); }} />
                    </div>

                    <div className={`space-y-6 ${enabled ? '' : 'pointer-events-none opacity-40'}`} aria-disabled={!enabled}>
                        {/* Qué se cobra */}
                        <div className="space-y-2.5">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Qué comuna define el precio</p>
                            <p className="text-xs text-muted-foreground -mt-1">El traslado se cobra una sola vez y cubre retiro y entrega. Si las dos comunas están en zonas distintas, se cobra la más cara.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <OptionCard icon={Truck} title="Retiro" hint="La comuna donde se retira a la mascota."
                                    checked={chargePickup} onChange={v => { setChargePickup(v); touch(); }} />
                                <OptionCard icon={Home} title="Entrega de cenizas" hint="La comuna donde se entregan las cenizas."
                                    checked={chargeDelivery} onChange={v => { setChargeDelivery(v); touch(); }} />
                                <OptionCard icon={showPrices ? Eye : EyeOff} title="Precios visibles"
                                    hint={showPrices ? 'La familia ve el valor del traslado.' : 'La familia ve «lo confirmaremos»; el valor igual llega al registro.'}
                                    checked={showPrices} onChange={v => { setShowPrices(v); touch(); }} />
                            </div>
                            {!chargePickup && !chargeDelivery && (
                                <p className="flex items-center gap-1.5 text-xs text-amber-400"><AlertTriangle size={13} /> Elige la comuna de retiro, la de entrega o ambas; si no, no se cobra nada.</p>
                            )}
                        </div>

                        {/* Zonas */}
                        <div className="space-y-2.5">
                            <div className="flex items-end justify-between gap-3">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Zonas y precio del traslado</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Cada comuna pertenece a una sola zona. Precio 0 = sin cargo.</p>
                                </div>
                                <button type="button" disabled={zones.length >= MAX_ZONES}
                                    onClick={() => { const z = newZone(zones.length + 1); setZones(zs => [...zs, z]); setOpenZone(z.id); touch(); }}
                                    className="shrink-0 flex items-center gap-1.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 px-3 py-2 text-xs font-bold hover:bg-sky-500/20 disabled:opacity-50 cursor-pointer">
                                    <Plus size={14} /> Agregar zona
                                </button>
                            </div>

                            {zones.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-foreground/15 p-6 text-center">
                                    <MapPin size={22} className="mx-auto text-muted-foreground/60" />
                                    <p className="text-sm text-white font-semibold mt-2">Aún no hay zonas</p>
                                    <p className="text-xs text-muted-foreground mt-1">Ej.: «Zona urbana» $0 con las comunas cercanas y «Zona extendida» $15.000 con las más lejanas.</p>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-foreground/10 overflow-hidden divide-y divide-foreground/10">
                                    {zones.map((z, i) => (
                                        <ZoneRow key={z.id} zone={z} color={colorOf(i)} open={openZone === z.id} country={country} tenantRegion={tenantRegion}
                                            zoneNames={Object.fromEntries(zones.map(x => [x.id, x.name]))} owner={owner}
                                            onToggle={() => setOpenZone(o => (o === z.id ? null : z.id))}
                                            onChange={patch => updateZone(z.id, patch)}
                                            onDelete={() => { setZones(zs => zs.filter(x => x.id !== z.id)); if (openZone === z.id) setOpenZone(null); touch(); }} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Comunas sin zona + prueba */}
                        <div className="grid lg:grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-foreground/10 bg-background/30 p-4 space-y-2">
                                <p className="text-sm font-bold text-white">Comunas sin zona</p>
                                <p className="text-xs text-muted-foreground">La familia puede enviar el formulario igual; el traslado queda «a cotizar». Este es el aviso que verá:</p>
                                <textarea value={message} maxLength={200} rows={3} placeholder={defaultMessage}
                                    onChange={e => { setMessage(e.target.value); touch(); }} className={inputCls} />
                                <p className="text-[10px] text-muted-foreground text-right">{message.length}/200</p>
                            </div>
                            <div className="rounded-2xl border border-foreground/10 bg-background/30 p-4 space-y-3">
                                <div>
                                    <p className="text-sm font-bold text-white">Probar una comuna</p>
                                    <p className="text-xs text-muted-foreground">Escribe una comuna y mira cuánto se cobraría por el traslado.</p>
                                </div>
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input value={probe} onChange={e => setProbe(e.target.value)} placeholder="Ej.: Providencia" className={`${inputCls} pl-8`} />
                                </div>
                                {probe.trim() && (
                                    probeZone ? (
                                        <div className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${colorOf(probeZoneIdx).chip}`}>
                                            <span className="text-xs font-semibold flex items-center gap-1.5"><MapPin size={13} /> {probeZone.name}</span>
                                            <span className="text-sm font-black">{priceNum(probeZone.price) === 0 ? 'Sin cargo' : clp(priceNum(probeZone.price))}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-400">
                                            <AlertTriangle size={14} className="shrink-0 mt-px" />
                                            <span>Sin zona: verá «{message.trim() || defaultMessage}»</span>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-1">
                        {dirty && <span className="text-xs text-amber-400">Hay cambios sin guardar</span>}
                        <button type="button" onClick={save} disabled={saving || !dirty}
                            className="flex items-center gap-2 bg-primary text-primary-foreground font-bold py-2.5 px-6 rounded-xl hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {saving ? 'Guardando…' : 'Guardar traslados'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function ZoneRow({ zone, color, open, country, tenantRegion, zoneNames, owner, onToggle, onChange, onDelete }: {
    zone: Zone; color: (typeof ZONE_COLORS)[number]; open: boolean; country: string; tenantRegion: string;
    zoneNames: Record<string, string>; owner: Map<string, string>;
    onToggle: () => void; onChange: (p: Partial<Zone>) => void; onDelete: () => void;
}) {
    const iso = useMemo(() => Country.getAllCountries().find(c => c.name === country)?.isoCode || 'CL', [country]);
    const regions = useMemo(() => State.getStatesOfCountry(iso), [iso]);
    const [region, setRegion] = useState(tenantRegion);
    const [q, setQ] = useState('');
    const [custom, setCustom] = useState('');

    const communes = useMemo(() => {
        const st = regions.find(s => s.name === region || s.isoCode === region);
        return st ? City.getCitiesOfState(iso, st.isoCode).map(c => c.name) : [];
    }, [regions, region, iso]);
    const filtered = communes.filter(c => normCommune(c).includes(normCommune(q)));
    const mine = new Set(zone.communes.map(normCommune));
    const freeInFilter = filtered.filter(c => !owner.has(normCommune(c))).length;

    const toggle = (c: string) => {
        const k = normCommune(c);
        onChange({ communes: mine.has(k) ? zone.communes.filter(x => normCommune(x) !== k) : [...zone.communes, c] });
    };
    const addAllFree = () => {
        const free = filtered.filter(c => !owner.has(normCommune(c)));
        onChange({ communes: [...zone.communes, ...free] });
    };
    const addCustom = () => {
        const c = custom.trim().slice(0, 60);
        if (!c || owner.has(normCommune(c))) return;
        onChange({ communes: [...zone.communes, c] });
        setCustom('');
    };
    const price = priceNum(zone.price);
    const preview = zone.communes.slice(0, 4);

    return (
        <div className={open ? 'bg-sky-500/[0.03]' : 'bg-background/20'}>
            {/* Fila: nombre · precio · comunas · acciones */}
            <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_minmax(0,1.2fr)_9rem_minmax(0,2fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3">
                <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                <input value={zone.name} maxLength={40} onChange={e => onChange({ name: e.target.value })}
                    className="min-w-0 bg-transparent text-sm font-bold text-white outline-none border-b border-transparent focus:border-sky-400 py-1" placeholder="Nombre de la zona" />
                <div className="relative col-start-2 sm:col-start-auto">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <input value={zone.price} inputMode="numeric" placeholder="0" aria-label={`Precio de ${zone.name}`}
                        onChange={e => onChange({ price: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                        className={`${inputCls} pl-6 py-1.5 font-semibold tabular-nums`} />
                    {price === 0 && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-400">Gratis</span>}
                </div>
                <button type="button" onClick={onToggle}
                    className="col-span-2 col-start-2 sm:col-span-1 sm:col-start-auto min-w-0 flex flex-wrap items-center gap-1 text-left cursor-pointer">
                    {zone.communes.length === 0 ? (
                        <span className="text-xs text-amber-400 font-semibold">Sin comunas · agregar</span>
                    ) : (
                        <>
                            {preview.map(c => (
                                <span key={c} className={`truncate max-w-[9rem] rounded-full border px-2 py-0.5 text-[11px] font-semibold ${color.chip}`}>{c}</span>
                            ))}
                            {zone.communes.length > preview.length && (
                                <span className="text-[11px] font-bold text-muted-foreground">+{zone.communes.length - preview.length}</span>
                            )}
                        </>
                    )}
                </button>
                <div className="row-start-1 col-start-3 sm:row-start-auto sm:col-start-auto flex items-center gap-0.5">
                    <button type="button" onClick={onToggle} title={open ? 'Cerrar' : 'Editar comunas'}
                        className={`p-2 rounded-lg cursor-pointer ${open ? 'text-sky-400 bg-sky-500/10' : 'text-muted-foreground hover:text-sky-400 hover:bg-sky-500/10'}`}>
                        {open ? <ChevronDown size={15} className="rotate-180" /> : <Pencil size={15} />}
                    </button>
                    <button type="button" onClick={onDelete} title="Eliminar zona" className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 cursor-pointer">
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            {open && (
                <div className="px-4 pb-4 space-y-3">
                    {zone.communes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {zone.communes.map(c => (
                                <span key={c} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${color.chip}`}>
                                    {c}
                                    <button type="button" onClick={() => toggle(c)} aria-label={`Quitar ${c}`} className="hover:text-red-400 cursor-pointer"><X size={11} /></button>
                                </span>
                            ))}
                        </div>
                    )}
                    <div className="rounded-2xl border border-foreground/10 bg-background/40 p-3 space-y-3">
                        <div className="grid sm:grid-cols-2 gap-2">
                            <select value={region} onChange={e => setRegion(e.target.value)} className={inputCls}>
                                <option value="">Elige una región…</option>
                                {regions.map(r => <option key={r.isoCode} value={r.name}>{r.name}</option>)}
                            </select>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar comuna" className={`${inputCls} pl-8`} />
                            </div>
                        </div>
                        {communes.length > 0 ? (
                            <>
                                <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                    <span>Toca una comuna para sumarla o quitarla. Las de otra zona aparecen tachadas.</span>
                                    {freeInFilter > 0 && (
                                        <button type="button" onClick={addAllFree} className="shrink-0 font-bold text-sky-400 hover:underline cursor-pointer">
                                            + Agregar {freeInFilter} libre{freeInFilter === 1 ? '' : 's'}
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1">
                                    {filtered.map(c => {
                                        const k = normCommune(c);
                                        const other = owner.get(k);
                                        const taken = other !== undefined && other !== zone.id;
                                        const on = mine.has(k);
                                        return (
                                            <button key={c} type="button" disabled={taken} onClick={() => toggle(c)}
                                                title={taken ? `Ya está en «${zoneNames[other!]}»` : undefined}
                                                className={`rounded-full px-2.5 py-1 text-xs border transition-colors ${on
                                                    ? `${color.chip} font-semibold`
                                                    : taken ? 'border-foreground/5 text-muted-foreground/50 line-through cursor-not-allowed'
                                                        : 'border-foreground/10 text-foreground hover:border-sky-400/50 cursor-pointer'}`}>
                                                {on ? '✓ ' : ''}{c}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <p className="text-xs text-muted-foreground">{region ? 'No hay comunas en la lista para esta región.' : 'Elige una región para ver sus comunas.'}</p>
                        )}
                        <div className="flex gap-2">
                            <input value={custom} maxLength={60} onChange={e => setCustom(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
                                placeholder="¿No aparece? Escribe la comuna" className={inputCls} />
                            <button type="button" onClick={addCustom} className="shrink-0 rounded-xl bg-foreground/5 px-3 text-xs font-bold text-foreground hover:bg-foreground/10 cursor-pointer">Agregar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
