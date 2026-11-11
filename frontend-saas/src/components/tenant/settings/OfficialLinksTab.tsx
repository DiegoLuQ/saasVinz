'use client';
import { serverDate } from '@/lib/dates';

/**
 * Configuración → «Enlaces oficiales»: formulario, catálogo de planes y catálogo de
 * productos oficiales. Con los tres se activa la «tiendita de recuerdos» (pantalla final
 * del formulario, correo de confirmación con productos y botón en el seguimiento).
 * Los catálogos elegidos dejan de vencer.
 */
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ClipboardList, ExternalLink, Gift, Layers, Loader2, Package, XCircle } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import {
    getOfficialLinks, saveOfficialLinks, OFFICIAL_LABELS, OFFICIAL_WHERE, type OfficialLinkKey,
} from '@/lib/tenant/officialLinks';

interface CatalogLink { id: number; name: string | null; is_active: boolean; is_expired?: boolean; expires_at?: string | null; created_at?: string }

/** Mismo nombre por defecto que «Compartir catálogo» cuando el enlace no tiene nombre. */
const DEFAULT_NAME = { plans: 'Catálogo de Planes', products: 'Catálogo General' } as const;

const listLinks = (type: 'plans' | 'products'): Promise<CatalogLink[]> =>
    apiRequest(`/api/internal/catalog/links?type=${type}`).catch(() => []);

const selectCls = 'w-full bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl py-3 px-4 text-sm font-semibold outline-none focus:border-violet-600 dark:focus:border-violet-500 focus:ring-4 focus:ring-violet-600/15 transition-all shadow-sm cursor-pointer [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-900 dark:[&>option]:text-white';

export function OfficialLinksTab() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { data: status, isLoading } = useQuery({ queryKey: ['official-links'], queryFn: getOfficialLinks });
    const { data: plansLinks = [] } = useQuery({ queryKey: ['catalog-links', 'plans'], queryFn: () => listLinks('plans') });
    const { data: productLinks = [] } = useQuery({ queryKey: ['catalog-links', 'products'], queryFn: () => listLinks('products') });

    const [form, setForm] = useState<string>('');
    const [plans, setPlans] = useState<string>('');
    const [products, setProducts] = useState<string>('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!status) return;
        setForm(status.form?.id || '');
        setPlans(status.plans ? String(status.plans.id) : '');
        setProducts(status.products ? String(status.products.id) : '');
    }, [status]);

    const save = async () => {
        setSaving(true);
        try {
            const res = await saveOfficialLinks({
                form: form || null,
                plans_token_id: plans ? Number(plans) : null,
                products_token_id: products ? Number(products) : null,
            });
            queryClient.setQueryData(['official-links'], res);
            queryClient.invalidateQueries({ queryKey: ['catalog-links'] });
            showToast(res.complete ? 'Enlaces oficiales guardados. La tiendita de recuerdos está activa.' : 'Guardado. Aún faltan enlaces oficiales.', res.complete ? 'success' : 'info');
        } catch (e) {
            showToast(e instanceof Error ? e.message : 'No se pudo guardar', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (isLoading || !status) {
        return <div className="p-8 text-center text-muted-foreground"><Loader2 className="inline animate-spin mr-2" size={16} />Cargando…</div>;
    }

    const linkLabel = (l: CatalogLink, type: 'plans' | 'products') =>
        `${l.name || DEFAULT_NAME[type]}${l.created_at ? ` · creado el ${serverDate(l.created_at).toLocaleDateString('es-CL')}` : ''}${!l.is_active ? ' (desactivado)' : l.is_expired ? ' (vencido: al elegirlo deja de vencer)' : ''}`;

    const row = (key: OfficialLinkKey, icon: React.ReactNode, control: React.ReactNode, url?: string | null) => {
        const ok = !status.missing.includes(key);
        return (
            <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] p-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <p className="font-bold flex items-center gap-2">{icon} {OFFICIAL_LABELS[key]}</p>
                    {ok
                        ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400"><CheckCircle2 size={14} /> Configurado</span>
                        : <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400"><XCircle size={14} /> Falta</span>}
                </div>
                {control}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>¿No tienes uno? Créalo en <Link href={OFFICIAL_WHERE[key].href} className="text-primary font-semibold hover:underline">{OFFICIAL_WHERE[key].text}</Link></span>
                    {url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary font-semibold hover:underline">Abrir <ExternalLink size={12} /></a>}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-black">Enlaces oficiales</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Elige tu formulario, tu catálogo de planes y tu catálogo de productos oficiales. Los catálogos oficiales no vencen.
                </p>
            </div>

            <div className={`rounded-3xl border p-5 flex items-start gap-3 ${status.complete ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-sky-500/30 bg-sky-500/[0.06]'}`}>
                <Gift className={status.complete ? 'text-emerald-400 shrink-0' : 'text-sky-400 shrink-0'} size={22} />
                <div className="text-sm">
                    <p className="font-bold">{status.complete ? 'Tiendita de recuerdos activa' : 'Tiendita de recuerdos inactiva'}</p>
                    <p className="text-muted-foreground mt-0.5">
                        Con los tres enlaces configurados, las familias ven tu catálogo de recuerdos y relicarios al terminar el formulario,
                        en el correo de confirmación (hasta 6 productos, el más vendido siempre) y en el seguimiento («Tiendita de recuerdos»).
                        {!status.complete && <> Falta: <b>{status.missing_labels.join(', ')}</b>.</>}
                    </p>
                </div>
            </div>

            {row('form', <ClipboardList size={16} className="text-primary" />, (
                <select value={form} onChange={(e) => setForm(e.target.value)} className={selectCls}>
                    <option value="">Sin elegir</option>
                    {status.form_options.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
            ))}

            {row('plans', <Layers size={16} className="text-primary" />, (
                <select value={plans} onChange={(e) => setPlans(e.target.value)} className={selectCls}>
                    <option value="">{plansLinks.length ? 'Sin elegir' : 'No tienes enlaces de catálogo de planes'}</option>
                    {plansLinks.filter(l => l.is_active || String(l.id) === plans).map(l => <option key={l.id} value={l.id}>{linkLabel(l, 'plans')}</option>)}
                </select>
            ), status.plans?.url)}

            {row('products', <Package size={16} className="text-primary" />, (
                <select value={products} onChange={(e) => setProducts(e.target.value)} className={selectCls}>
                    <option value="">{productLinks.length ? 'Sin elegir' : 'No tienes enlaces de catálogo de productos'}</option>
                    {productLinks.filter(l => l.is_active || String(l.id) === products).map(l => <option key={l.id} value={l.id}>{linkLabel(l, 'products')}</option>)}
                </select>
            ), status.products?.url)}

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="bg-primary text-primary-foreground px-8 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 disabled:opacity-50"
                >
                    {saving && <Loader2 size={16} className="animate-spin" />} Guardar enlaces oficiales
                </button>
            </div>
        </div>
    );
}
