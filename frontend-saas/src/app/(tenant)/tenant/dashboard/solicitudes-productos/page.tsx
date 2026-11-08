"use client";

/**
 * Solicitudes de productos del catálogo público (carrito de las familias).
 * - De una orden: «Aceptar» agrega los productos a la orden (descuenta stock y
 *   recalcula total, convenio y comisión).
 * - Compra externa (sin orden, PC-0001): «Aceptar» descuenta stock y crea el
 *   cliente; luego «Entregada» o «Cancelar» (devuelve el stock).
 * No se avisa a la familia: se coordina por WhatsApp. Backend:
 * /api/internal/product-requests (services/product_requests.py).
 */
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Ban, Check, CheckCircle2, ClipboardList, Loader2, MessageCircle, Package, PackageCheck, ShoppingCart, Store, X,
} from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { usePermissions } from '@/app/(tenant)/tenant/context/PermissionContext';

type Status = 'pending' | 'accepted' | 'delivered' | 'rejected' | 'cancelled';
type Kind = 'order' | 'external';

type LineState = 'pending' | 'added' | 'discarded';
interface RequestItem {
    product_id: number; name: string; price: number; qty: number; made_to_order?: boolean; image_url?: string | null;
    /** Estado de la línea: se agrega o descarta una por una */
    state: LineState;
    /** Stock actual del producto (null = ya no existe) */
    stock: number | null;
    exists: boolean;
}
interface ProductRequest {
    id: number; code: string; kind: Kind; status: Status;
    pet_name?: string | null; contact_name?: string | null; contact_phone?: string | null;
    note?: string | null; items: RequestItem[]; total: number; reject_reason?: string | null;
    added_total: number; pending_total: number;
    created_at: string; decided_at?: string | null; delivered_at?: string | null;
    submission_id?: number | null;
    cremation?: { id: number; oc_number?: number | null; status: string; closed: boolean } | null;
    whatsapp_url?: string | null;
}
interface ListResponse { items: ProductRequest[]; counts: Record<Status, number> }

const TABS: { key: Status; label: string }[] = [
    { key: 'pending', label: 'Pendientes' },
    { key: 'accepted', label: 'Aceptadas' },
    { key: 'delivered', label: 'Entregadas' },
    { key: 'rejected', label: 'Rechazadas' },
    { key: 'cancelled', label: 'Canceladas' },
];
const KINDS: { key: Kind | 'all'; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'order', label: 'De órdenes' },
    { key: 'external', label: 'Compras externas' },
];
const clp = (v: number) => `$${Math.round(v || 0).toLocaleString('es-CL')}`;
const when = (d: string) => new Date(d).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function ProductRequestsPage() {
    const qc = useQueryClient();
    const { showToast } = useToast();
    const { canEdit } = usePermissions();
    const canManage = canEdit('ordenes');
    const [tab, setTab] = useState<Status>('pending');
    const [kind, setKind] = useState<Kind | 'all'>('all');
    const [busy, setBusy] = useState<string | null>(null);
    const [rejecting, setRejecting] = useState<ProductRequest | null>(null);
    const [reason, setReason] = useState('');
    const [highlight, setHighlight] = useState<number | null>(null);

    useEffect(() => {
        try {
            const id = Number(new URLSearchParams(window.location.search).get('id'));
            if (id) setHighlight(id);
        } catch { /* sin URL */ }
    }, []);

    const key = ['product-requests', tab, kind];
    const { data, isLoading } = useQuery<ListResponse>({
        queryKey: key,
        queryFn: () => apiRequest(`/api/internal/product-requests?status=${tab}${kind !== 'all' ? `&kind=${kind}` : ''}`),
    });

    useEffect(() => {
        if (!highlight || !data) return;
        const el = document.getElementById(`pr-${highlight}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [highlight, data]);

    const act = async (req: ProductRequest, action: string, ok: string, body?: object) => {
        setBusy(`${req.id}:${action}`);
        try {
            await apiRequest(`/api/internal/product-requests/${req.id}/${action}`, { method: 'POST', body: body ?? {} });
            showToast(ok, 'success');
            qc.invalidateQueries({ queryKey: ['product-requests'] });
            qc.invalidateQueries({ queryKey: ['session-bootstrap'] });
            return true;
        } catch (e: unknown) {
            showToast((e as { message?: string } | null)?.message || 'No se pudo completar la acción', 'error');
            return false;
        } finally {
            setBusy(null);
        }
    };

    const counts = data?.counts;
    const items = data?.items ?? [];
    const btn = 'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-40';

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-black flex items-center gap-2"><ShoppingCart className="text-primary" size={24} /> Solicitudes de productos</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Lo que las familias piden desde tu catálogo de productos. Agrega o descarta cada producto (o todos juntos): al agregar se descuenta su stock. Nada se avisa solo: coordina por WhatsApp.
                </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex flex-wrap rounded-2xl p-1 border border-foreground/10 bg-foreground/5">
                    {TABS.map(t => (
                        <button key={t.key} type="button" onClick={() => setTab(t.key)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${tab === t.key ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                            {t.label}{counts ? ` (${counts[t.key] ?? 0})` : ''}
                        </button>
                    ))}
                </div>
                <div className="inline-flex rounded-2xl p-1 border border-foreground/10 bg-foreground/5">
                    {KINDS.map(k => (
                        <button key={k.key} type="button" onClick={() => setKind(k.key)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${kind === k.key ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                            {k.label}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="py-16 text-center text-muted-foreground"><Loader2 className="inline animate-spin" size={24} /></div>
            ) : items.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground glass-card rounded-3xl">
                    <Package size={32} className="mx-auto mb-2 opacity-60" />
                    <p className="text-sm font-semibold">No hay solicitudes {TABS.find(t => t.key === tab)?.label.toLowerCase()}</p>
                    <p className="text-xs mt-1">Las familias las envían desde el catálogo de productos con el botón «Solicitar».</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {items.map(r => {
                        const isBusy = (a: string) => busy === `${r.id}:${a}`;
                        const noOrderYet = r.kind === 'order' && !r.cremation;
                        const blocked = noOrderYet || !!r.cremation?.closed;
                        const pendingLines = r.items.filter(it => it.state === 'pending');
                        const lineOk = (it: RequestItem) => it.exists && (!!it.made_to_order || (it.stock ?? 0) >= it.qty);
                        const allOk = pendingLines.length > 0 && pendingLines.every(lineOk);
                        const partial = r.items.some(it => it.state !== 'pending') && pendingLines.length > 0;
                        return (
                            <div key={r.id} id={`pr-${r.id}`}
                                className={`glass-card rounded-3xl p-5 space-y-4 ${highlight === r.id ? 'ring-2 ring-primary' : ''}`}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-xs font-bold text-muted-foreground">{r.code}</span>
                                            {r.kind === 'order' ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-700 dark:text-sky-300">
                                                    <ClipboardList size={11} /> Orden {r.cremation?.oc_number ? `#${r.cremation.oc_number}` : ''}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-700 dark:text-violet-300">
                                                    <Store size={11} /> Compra externa
                                                </span>
                                            )}
                                            <span className="text-[11px] text-muted-foreground">{when(r.created_at)}</span>
                                        </div>
                                        <p className="mt-1 text-lg font-black truncate">
                                            {r.kind === 'order' ? (r.pet_name || 'Mascota') : (r.contact_name || 'Cliente')}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {[r.kind === 'order' ? r.contact_name : null, r.contact_phone].filter(Boolean).join(' · ') || 'Sin contacto registrado'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[11px] text-muted-foreground">Total solicitado</p>
                                        <p className="text-xl font-black">{clp(r.total)}</p>
                                        {(partial || r.status !== 'pending') && r.added_total !== r.total && (
                                            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Agregado: {clp(r.added_total)}</p>
                                        )}
                                    </div>
                                </div>

                                <ul className="divide-y divide-foreground/5 rounded-2xl border border-foreground/10">
                                    {r.items.map((it, idx) => {
                                        const ok = lineOk(it);
                                        const key = (a: string) => `items/${idx}/${a}`;
                                        return (
                                        <li key={`${it.product_id}-${idx}`} className={`flex flex-wrap sm:flex-nowrap items-center gap-3 px-3 py-2.5 ${it.state === 'discarded' ? 'opacity-55' : ''}`}>
                                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-foreground/5 shrink-0 flex items-center justify-center">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                {it.image_url ? <img src={it.image_url} alt="" className="w-full h-full object-cover" /> : <Package size={16} className="text-muted-foreground" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-semibold truncate ${it.state === 'discarded' ? 'line-through' : ''}`}>
                                                    {it.qty} × {it.name}
                                                </p>
                                                <p className="text-[11px] font-bold mt-0.5">
                                                    {!it.exists ? (
                                                        <span className="text-rose-600 dark:text-rose-400">Ya no está en tu inventario</span>
                                                    ) : it.made_to_order ? (
                                                        <span className="text-sky-600 dark:text-sky-300">A pedido · stock {it.stock ?? 0}</span>
                                                    ) : (it.stock ?? 0) >= it.qty || it.state !== 'pending' ? (
                                                        <span className="text-muted-foreground">Stock: {it.stock ?? 0}</span>
                                                    ) : (
                                                        <span className="text-rose-600 dark:text-rose-400">Sin stock suficiente · quedan {Math.max(it.stock ?? 0, 0)}</span>
                                                    )}
                                                </p>
                                            </div>
                                            <p className="text-sm font-bold tabular-nums">{clp(it.price * it.qty)}</p>
                                            <div className="w-full sm:w-auto flex items-center justify-end gap-1.5">
                                                {it.state === 'added' && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400 px-2"><CheckCircle2 size={13} /> Agregado</span>
                                                )}
                                                {it.state === 'discarded' && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-muted-foreground px-2"><Ban size={13} /> Descartado</span>
                                                )}
                                                {it.state === 'pending' && canManage && r.status === 'pending' && (
                                                    <>
                                                        <button type="button" disabled={!!busy}
                                                            onClick={() => act(r, key('discard'), `«${it.name}» descartado`)}
                                                            className={`${btn} !px-2.5 !py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10`}
                                                            title="No disponible: se descarta de la solicitud">
                                                            {isBusy(key('discard')) ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} Descartar
                                                        </button>
                                                        <button type="button" disabled={!!busy || blocked || !ok}
                                                            onClick={() => act(r, key('accept'), r.kind === 'order' ? `«${it.name}» agregado a la orden` : `«${it.name}» aceptado`)}
                                                            className={`${btn} !px-2.5 !py-1.5 bg-primary/15 text-primary hover:bg-primary/25`}
                                                            title={!ok ? 'Sin stock suficiente' : undefined}>
                                                            {isBusy(key('accept')) ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Agregar
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </li>
                                        );
                                    })}
                                </ul>

                                {r.note && <p className="text-sm rounded-2xl bg-amber-500/10 border border-amber-500/20 px-3 py-2"><b>Nota:</b> {r.note}</p>}
                                {r.reject_reason && <p className="text-xs text-muted-foreground"><b>Motivo del rechazo:</b> {r.reject_reason}</p>}
                                {noOrderYet && r.status === 'pending' && (
                                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                                        Aún no hay orden para esta mascota: procesa primero su{' '}
                                        {r.submission_id ? <Link href={`/dashboard/registros/${r.submission_id}`} className="underline">registro del formulario</Link> : 'registro'}.
                                    </p>
                                )}
                                {r.cremation?.closed && r.status === 'pending' && (
                                    <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">La orden ya está entregada o cancelada: solo se puede rechazar.</p>
                                )}

                                <div className="flex flex-wrap items-center gap-2">
                                    {r.cremation && (
                                        <Link href={`/dashboard/recepcion-pedidos?orden=${r.cremation.id}`} className={`${btn} bg-foreground/5 hover:bg-foreground/10`}>
                                            Ver orden
                                        </Link>
                                    )}
                                    {r.whatsapp_url && (
                                        <a href={r.whatsapp_url} target="_blank" rel="noopener noreferrer" className={`${btn} bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25`}>
                                            <MessageCircle size={14} /> Escribir por WhatsApp
                                        </a>
                                    )}
                                    <div className="flex-1" />
                                    {canManage && r.status === 'pending' && (
                                        <>
                                            <button type="button" disabled={!!busy} onClick={() => { setRejecting(r); setReason(''); }}
                                                className={`${btn} text-rose-600 dark:text-rose-400 hover:bg-rose-500/10`}>
                                                <X size={14} /> {partial ? 'Descartar el resto' : 'Rechazar'}
                                            </button>
                                            <button type="button" disabled={!!busy || blocked || !allOk}
                                                onClick={() => act(r, 'accept', r.kind === 'order' ? 'Productos agregados a la orden' : 'Compra aceptada')}
                                                title={!allOk ? 'Hay productos sin stock: agrégalos uno por uno o descártalos' : undefined}
                                                className={`${btn} bg-primary text-primary-foreground`}>
                                                {isBusy('accept') ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                {partial ? `Agregar los ${pendingLines.length} restantes` : r.kind === 'order' ? 'Agregar todo a la orden' : 'Aceptar todo'}
                                            </button>
                                        </>
                                    )}
                                    {canManage && r.status === 'accepted' && r.kind === 'external' && (
                                        <>
                                            <button type="button" disabled={!!busy}
                                                onClick={() => { if (window.confirm('¿Cancelar esta compra? El stock se devuelve.')) act(r, 'cancel', 'Compra cancelada, stock devuelto'); }}
                                                className={`${btn} text-rose-600 dark:text-rose-400 hover:bg-rose-500/10`}>
                                                <Ban size={14} /> Cancelar
                                            </button>
                                            <button type="button" disabled={!!busy} onClick={() => act(r, 'deliver', 'Compra marcada como entregada')}
                                                className={`${btn} bg-emerald-600 text-white`}>
                                                {isBusy('deliver') ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={14} />} Marcar entregada
                                            </button>
                                        </>
                                    )}
                                    {r.status === 'accepted' && r.kind === 'order' && (
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={14} /> Agregado a la orden</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {rejecting && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setRejecting(null)}>
                    <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"
                        className="bg-card text-foreground w-full max-w-sm rounded-3xl border border-foreground/10 shadow-2xl p-6 space-y-4">
                        <p className="text-lg font-black">Rechazar {rejecting.code}</p>
                        <p className="text-sm text-muted-foreground">No se descuenta stock ni se avisa a la familia.</p>
                        <textarea value={reason} onChange={e => setReason(e.target.value.slice(0, 300))} rows={3}
                            placeholder="Motivo (opcional, solo para el panel)"
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-primary" />
                        <div className="flex gap-2 justify-end">
                            <button type="button" onClick={() => setRejecting(null)} className="px-4 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-foreground/5">Volver</button>
                            <button type="button" disabled={!!busy}
                                onClick={async () => { if (await act(rejecting, 'reject', 'Solicitud rechazada', { reason: reason.trim() || null })) setRejecting(null); }}
                                className="px-4 py-2.5 rounded-xl text-sm font-bold bg-rose-600 text-white disabled:opacity-50">
                                Rechazar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
