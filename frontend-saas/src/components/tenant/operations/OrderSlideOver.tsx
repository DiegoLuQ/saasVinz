"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Activity, User, Dog, Copy, Check, FileText, ExternalLink, Loader2, Edit, Building2,
    MessageCircle, Compass, ArrowRight, CheckCircle2, Circle, CircleDot, Image as ImageIcon,
    BookHeart, Receipt, AlertCircle, Lock,
} from 'lucide-react';
import SlideOver from '@/components/tenant/SlideOver';
import type { Cremation } from '@/hooks/useCremations';
import { apiRequest, getImageUrl } from '@/lib/tenant/api';
import { copyToClipboard } from '@/lib/clipboard';
import { buildTrackingUrl, buildMemorialUrl } from '@/lib/publicUrls';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import FarewellCardSection from './expediente/FarewellCardSection';

// --- Tipos de GET /api/internal/cremations/{id}/expediente ---------------------
interface Expediente {
    order: {
        id: number; oc_number?: number | null; status?: string | null;
        status_group: 'pendiente' | 'en_proceso' | 'entregado' | 'cancelado';
        cremation_type?: string | null; created_at?: string | null;
        verification_code?: string | null; current_step?: string | null;
    };
    pet: { id?: number | null; name?: string | null; species?: string | null; breed?: string | null; dedication?: string | null; photos: string[] };
    customer: { name?: string | null; phone?: string | null; email?: string | null };
    items: { tipo: string; nombre: string; cantidad: number; precio: number }[];
    financial: { total: number; discount?: number };
    timeline: { step_id: number; name: string; state: 'completado' | 'en_curso' | 'pendiente'; photo_url?: string | null; comments: string[]; at?: string | null }[];
    partner: { name: string; commission: { amount: number; status: string; paid_at?: string | null } | null } | null;
    deliverables: {
        tracking: { tenant_slug?: string | null; token?: string | null };
        certificate: { enabled: boolean; issued: { id: number; number: string; issued_at?: string | null }[] };
        memorial: { uuid: string; status: string } | null;
        farewell_template: { id: number; config: Record<string, unknown> } | null;
    };
    origin: { submission_id?: number | null; submission_code?: string | null };
    next_action: { key: 'iniciar' | 'avanzar' | 'entregar' | 'emitir_certificado'; label: string } | null;
}

const STATUS: Record<Expediente['order']['status_group'], { label: string; cls: string }> = {
    pendiente: { label: 'Por iniciar', cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    en_proceso: { label: 'En proceso', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    entregado: { label: 'Entregado', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    cancelado: { label: 'Cancelado', cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                {icon} {title}
            </h4>
            {children}
        </section>
    );
}

interface OrderSlideOverProps {
    isOpen: boolean;
    onClose: () => void;
    cremation: Cremation | null;
    onUpdateStatus?: (id: number, newStatus: string) => Promise<void>;
    isUpdatingStatus?: boolean;
}

/**
 * Expediente del servicio: todo lo de una orden en un solo panel (familia y
 * mascota, servicio, etapas, veterinaria/comisión y entregables) con la
 * siguiente acción sugerida.
 */
export default function OrderSlideOver({ isOpen, onClose, cremation, onUpdateStatus, isUpdatingStatus }: OrderSlideOverProps) {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [copied, setCopied] = useState<string | null>(null);
    const [acting, setActing] = useState(false);

    const orderId = cremation?.id;
    const { data: exp, isLoading, isError } = useQuery<Expediente>({
        queryKey: ['expediente', orderId],
        queryFn: () => apiRequest(`/api/internal/cremations/${orderId}/expediente`),
        enabled: isOpen && !!orderId,
        staleTime: 30_000,
    });

    if (!cremation) return null;

    const refresh = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['expediente', orderId] }),
            queryClient.invalidateQueries({ queryKey: ['cremations-simple'] }),
            queryClient.invalidateQueries({ queryKey: ['cremations'] }),
        ]);
    };

    const copy = async (key: string, value: string, msg: string) => {
        if (await copyToClipboard(value)) {
            setCopied(key);
            showToast(msg, 'success');
            setTimeout(() => setCopied(null), 2000);
        }
    };

    const petName = exp?.pet.name || cremation.pet?.name || 'Mascota';
    const tenantSlug = exp?.deliverables.tracking.tenant_slug || '';
    const trackingUrl = exp && tenantSlug && exp.deliverables.tracking.token
        ? buildTrackingUrl(tenantSlug, petName, exp.deliverables.tracking.token)
        : '';
    const memorialUrl = exp?.deliverables.memorial && tenantSlug
        ? buildMemorialUrl(tenantSlug, petName, exp.deliverables.memorial.uuid)
        : '';
    const phoneDigits = (exp?.customer.phone || '').replace(/\D/g, '');
    const whatsappUrl = phoneDigits
        ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
            `Hola ${exp?.customer.name || ''}, te escribimos por el servicio de ${petName}.` +
            (trackingUrl ? ` Puedes seguir el proceso aquí: ${trackingUrl}` : '')
        )}`
        : '';

    // Abre el HTML del certificado en una pestaña nueva (se abre antes del await
    // para que el navegador no la bloquee como popup).
    const openCertificateHtml = async (loader: () => Promise<string>) => {
        const win = window.open('', '_blank');
        try {
            const html = await loader();
            if (win) {
                win.document.open();
                win.document.write(html);
                win.document.close();
            }
        } catch (err: unknown) {
            win?.close();
            throw err;
        }
    };

    const viewCertificate = async (certId: number) => {
        try {
            await openCertificateHtml(async () => {
                const res = await apiRequest(`/api/internal/ops-records/certificates/${certId}/content`);
                return res.html_content;
            });
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'No se pudo abrir el certificado', 'error');
        }
    };

    const issueCertificate = async () => {
        setActing(true);
        try {
            await openCertificateHtml(async () => {
                const res = await apiRequest('/api/internal/ops-records/generate', {
                    method: 'POST',
                    body: { cremation_id: cremation.id, persist: true },
                });
                return res.html_content;
            });
            showToast('Certificado emitido', 'success');
            await refresh();
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'No se pudo emitir el certificado', 'error');
        } finally {
            setActing(false);
        }
    };

    const runNextAction = async () => {
        if (!exp?.next_action) return;
        const key = exp.next_action.key;
        if (key === 'emitir_certificado') return issueCertificate();
        setActing(true);
        try {
            if (key === 'entregar') {
                if (onUpdateStatus) await onUpdateStatus(cremation.id, 'entregado');
            } else {
                await apiRequest(`/api/internal/operations/ops/orders/${cremation.id}/advance`, { method: 'PATCH' });
                showToast(key === 'iniciar' ? 'Operación iniciada' : 'Etapa avanzada', 'success');
            }
            await refresh();
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'No se pudo completar la acción', 'error');
        } finally {
            setActing(false);
        }
    };

    const status = exp ? STATUS[exp.order.status_group] : null;
    const busy = acting || !!isUpdatingStatus;

    return (
        <SlideOver
            isOpen={isOpen}
            onClose={onClose}
            title={`Orden ${exp?.order.oc_number ? `OC ${exp.order.oc_number}` : `#${cremation.id}`}`}
            subtitle={`${petName} · ${exp?.order.cremation_type || cremation.cremation_type || 'Servicio de cremación'}`}
            icon={<Activity size={20} />}
            width="max-w-2xl"
        >
            <div className="p-6 space-y-7">
                {isLoading && (
                    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                        <Loader2 size={18} className="animate-spin" /> Cargando expediente...
                    </div>
                )}
                {isError && (
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-300 flex items-center gap-2">
                        <AlertCircle size={16} /> No se pudo cargar el expediente de la orden.
                    </div>
                )}

                {exp && status && (
                    <>
                        {/* Estado + siguiente acción */}
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${status.cls}`}>
                                        {status.label}
                                    </span>
                                    {exp.order.current_step && exp.order.status_group === 'en_proceso' && (
                                        <p className="text-xs text-muted-foreground mt-2">Etapa actual: <span className="text-white font-semibold">{exp.order.current_step}</span></p>
                                    )}
                                </div>
                                <Link
                                    href={`/dashboard/recepcion-pedidos/registro?id=${cremation.id}`}
                                    className="shrink-0 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold transition flex items-center gap-1.5"
                                >
                                    <Edit size={14} /> Editar orden
                                </Link>
                            </div>
                            {exp.next_action && (
                                <button
                                    type="button"
                                    onClick={runNextAction}
                                    disabled={busy}
                                    className="w-full py-3 px-4 rounded-xl bg-primary text-white text-sm font-bold transition hover:brightness-110 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                                    {exp.next_action.label}
                                </button>
                            )}
                        </div>

                        {/* Familia y mascota */}
                        <Section title="Familia y mascota" icon={<User size={14} />}>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 overflow-hidden shrink-0">
                                        {exp.pet.photos[0] ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={getImageUrl(exp.pet.photos[0]) || ''} alt={petName} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Dog size={24} /></div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base font-bold text-white truncate">{petName}</h3>
                                        <p className="text-xs text-muted-foreground capitalize">
                                            {[exp.pet.species, exp.pet.breed].filter(Boolean).join(' • ') || 'Mascota'}
                                        </p>
                                    </div>
                                </div>
                                <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                                    <div className="text-xs space-y-1 min-w-0">
                                        <p className="text-white font-semibold truncate">{exp.customer.name || 'Tutor sin nombre'}</p>
                                        {exp.customer.phone && <p className="text-muted-foreground">{exp.customer.phone}</p>}
                                        {exp.customer.email && <p className="text-muted-foreground truncate">{exp.customer.email}</p>}
                                    </div>
                                    {whatsappUrl && (
                                        <a
                                            href={whatsappUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-2 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 text-xs font-bold transition flex items-center gap-1.5"
                                        >
                                            <MessageCircle size={14} /> WhatsApp
                                        </a>
                                    )}
                                </div>
                                {exp.partner && (
                                    <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
                                        <span className="flex items-center gap-2">
                                            <Building2 size={14} className="text-emerald-400" />
                                            <span className="text-muted-foreground">Derivado por</span>
                                            <span className="text-emerald-400 font-bold">{exp.partner.name}</span>
                                        </span>
                                        <span className="text-muted-foreground">
                                            {exp.partner.commission
                                                ? <>Comisión <span className="text-white font-semibold">{clp.format(exp.partner.commission.amount)}</span> · {exp.partner.commission.status}</>
                                                : 'Sin comisión registrada'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </Section>

                        {/* Servicio */}
                        <Section title="Servicio" icon={<Receipt size={14} />}>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs space-y-2">
                                {exp.items.length === 0 ? (
                                    <p className="text-muted-foreground">Sin servicios registrados.</p>
                                ) : exp.items.map((it, i) => (
                                    <div key={`${it.tipo}-${i}`} className="flex items-center justify-between gap-3">
                                        <span className="text-white truncate">
                                            {it.cantidad > 1 ? `${it.cantidad} × ` : ''}{it.nombre}
                                            <span className="ml-2 text-[10px] uppercase text-muted-foreground">{it.tipo}</span>
                                        </span>
                                        <span className="text-muted-foreground tabular-nums">{clp.format(it.precio * it.cantidad)}</span>
                                    </div>
                                ))}
                                <div className="pt-2 border-t border-white/5 flex justify-between font-bold text-sm">
                                    <span className="text-white">Total</span>
                                    <span className="text-white tabular-nums">{clp.format(exp.financial.total || 0)}</span>
                                </div>
                            </div>
                        </Section>

                        {/* Etapas */}
                        {exp.timeline.length > 0 && (
                            <Section title="Etapas del servicio" icon={<CircleDot size={14} />}>
                                <ol className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                                    {exp.timeline.map((st) => (
                                        <li key={st.step_id} className="flex gap-3 text-xs">
                                            <span className="mt-0.5 shrink-0">
                                                {st.state === 'completado' ? <CheckCircle2 size={16} className="text-emerald-400" />
                                                    : st.state === 'en_curso' ? <CircleDot size={16} className="text-blue-400" />
                                                    : <Circle size={16} className="text-white/20" />}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className={st.state === 'pendiente' ? 'text-muted-foreground' : 'text-white font-semibold'}>{st.name}</p>
                                                {st.comments[0] && <p className="text-muted-foreground mt-0.5 line-clamp-2">{st.comments[0]}</p>}
                                            </div>
                                            {st.photo_url && (
                                                <a href={getImageUrl(st.photo_url) || '#'} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-white" title="Ver evidencia">
                                                    <ImageIcon size={16} />
                                                </a>
                                            )}
                                        </li>
                                    ))}
                                </ol>
                            </Section>
                        )}

                        {/* Entregables para la familia */}
                        <Section title="Entregables para la familia" icon={<FileText size={14} />}>
                            {/* Seguimiento */}
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Compass size={16} className="text-primary shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-white">Seguimiento en vivo</p>
                                        <p className="text-[11px] font-mono text-muted-foreground truncate">{exp.order.verification_code}</p>
                                    </div>
                                </div>
                                {trackingUrl && (
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => copy('tracking', trackingUrl, 'Enlace de seguimiento copiado')}
                                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition flex items-center gap-1.5"
                                        >
                                            {copied === 'tracking' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />} Copiar
                                        </button>
                                        <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition flex items-center gap-1.5">
                                            <ExternalLink size={14} /> Ver
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Tarjeta de homenaje */}
                            <FarewellCardSection
                                templateConfig={exp.deliverables.farewell_template?.config}
                                petName={petName}
                                dedication={exp.pet.dedication}
                                photoUrl={exp.pet.photos[0]}
                            />

                            {/* Certificado */}
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                                <div className="flex items-center gap-2">
                                    <FileText size={16} className="text-emerald-400" />
                                    <p className="text-xs font-bold text-white">Certificado de cremación</p>
                                </div>
                                {!exp.deliverables.certificate.enabled ? (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Lock size={12} /> Disponible desde el plan NORMAL.</p>
                                ) : (
                                    <div className="flex flex-wrap items-center gap-2">
                                        {exp.deliverables.certificate.issued.map((c) => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => viewCertificate(c.id)}
                                                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-xs font-semibold transition flex items-center gap-1.5"
                                            >
                                                <ExternalLink size={14} /> {c.number}
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={issueCertificate}
                                            disabled={busy}
                                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition flex items-center gap-1.5 disabled:opacity-50"
                                        >
                                            {acting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                                            {exp.deliverables.certificate.issued.length ? 'Volver a emitir' : 'Emitir certificado'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Memorial */}
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <BookHeart size={16} className="text-rose-300" />
                                    <div>
                                        <p className="text-xs font-bold text-white">Memorial online</p>
                                        <p className="text-[11px] text-muted-foreground">{memorialUrl ? 'Publicado' : 'Aún no se ha creado'}</p>
                                    </div>
                                </div>
                                {memorialUrl && (
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => copy('memorial', memorialUrl, 'Enlace del memorial copiado')}
                                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition flex items-center gap-1.5"
                                        >
                                            {copied === 'memorial' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />} Copiar
                                        </button>
                                        <a href={memorialUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition flex items-center gap-1.5">
                                            <ExternalLink size={14} /> Ver
                                        </a>
                                    </div>
                                )}
                            </div>
                        </Section>

                        {/* Origen */}
                        <p className="text-[11px] text-muted-foreground text-center">
                            Creada el {exp.order.created_at ? new Date(exp.order.created_at).toLocaleString('es-CL') : '—'}
                            {exp.origin.submission_code ? ` · Solicitud ${exp.origin.submission_code}` : ''}
                        </p>
                    </>
                )}
            </div>
        </SlideOver>
    );
}
