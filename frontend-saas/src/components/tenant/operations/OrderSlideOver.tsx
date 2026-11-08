"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Activity, User, Dog, Copy, Check, FileText, ExternalLink, Loader2, Edit, Building2,
    MessageCircle, Compass, ArrowRight, CircleDot,
    BookHeart, Receipt, AlertCircle, Lock, Download, Undo2, Calendar,
    Scale, MapPin, StickyNote, Printer, Phone, Mail, Sparkles, Pencil, Percent
} from 'lucide-react';
import SlideOver from '@/components/tenant/SlideOver';
import EditWeightModal from '@/components/tenant/EditWeightModal';
import type { Cremation } from '@/hooks/useCremations';
import { apiRequest, getImageUrl } from '@/lib/tenant/api';
import { copyToClipboard } from '@/lib/clipboard';
import { buildTrackingUrl } from '@/lib/publicUrls';
import { downloadHtmlAsPdf, pdfFileName } from '@/lib/certPdf';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import FarewellCardSection from './expediente/FarewellCardSection';
import GeneratedImagesSection from './expediente/GeneratedImagesSection';
import MemorialOrderSection from './expediente/MemorialOrderSection';
import DedicationSection from './expediente/DedicationSection';
import OrderDiscountsBox from './expediente/OrderDiscountsBox';
import FamilyNoticesBox from './FamilyNoticesBox';
import AdvanceNoticeModal from './AdvanceNoticeModal';
import StageTimeline, { type Stage } from './expediente/StageTimeline';
import RevertOrderModal, { canRevertStatus } from './RevertOrderModal';
import CertificateTextsModal, { DATE_LABELS, ISSUE_TEMPLATE_QUERY_KEY, issueDateFields, issueTextFields, loadIssueTemplate, missingPetDates, usePetDates, type CertOverrides } from './CertificateTextsModal';
import { useIsOwner } from '@/hooks/useSessionBootstrap';
import { usePermissions } from '@/app/(tenant)/tenant/context/PermissionContext';
import { useTenant } from '@/app/(tenant)/tenant/context/TenantContext';
import { useFeatures } from '@/hooks/useFeatures';
import { isProOrUltraCrematoryPlan } from '@/lib/memorialDesign';
import PriorityBadge from './PriorityBadge';
import MainPhotoToggle from '@/components/tenant/crm/MainPhotoToggle';
import { useSetMainImage } from '@/hooks/usePets';
// --- Tipos de GET /api/internal/cremations/{id}/expediente ---------------------
interface Expediente {
    order: {
        id: number; oc_number?: number | null; status?: string | null;
        status_group: 'pendiente' | 'en_proceso' | 'entregado' | 'cancelado';
        cremation_type?: string | null; created_at?: string | null;
        scheduled_at?: string | null; completed_at?: string | null;
        verification_code?: string | null; current_step?: string | null;
        notes?: string | null;
        /** Plan prioritario de la orden (null = prioridad normal) */
        priority_plan?: string | null;
    };
    pet: {
        id?: number | null; name?: string | null; species?: string | null; breed?: string | null;
        weight?: number | null; size?: string | null;
        dedication?: string | null; dedication_source?: 'orden' | 'formulario' | null;
        photos: string[];
        /** Fotos de la ficha (se pueden marcar como principal) */
        pet_photos?: string[];
    };
    customer: { name?: string | null; phone?: string | null; email?: string | null };
    logistics?: {
        pickup_address?: string | null; pickup_city?: string | null; pickup_region?: string | null;
        address?: string | null; city?: string | null; region?: string | null;
    };
    items: { tipo: 'servicio' | 'plan' | 'producto' | 'peso'; nombre: string; cantidad: number; precio: number; incluye?: string[] }[];
    financial: {
        subtotal?: number; total: number; discount?: number;
        agreement?: { id: number | null; name: string | null; discount: number } | null;
    };
    timeline: (Stage & { photo_url?: string | null; comments: string[]; at?: string | null })[];
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

type ExpedienteTab = 'operacion' | 'recuerdos' | 'cobro';

const STATUS: Record<Expediente['order']['status_group'], { label: string; cls: string; dot: string }> = {
    pendiente: {
        label: 'Por iniciar',
        cls: 'bg-amber-500/10 text-amber-800 border-amber-500/25 dark:text-amber-300',
        dot: 'bg-amber-500'
    },
    en_proceso: {
        label: 'En proceso',
        cls: 'bg-sky-500/10 text-sky-800 border-sky-500/25 dark:text-sky-300',
        dot: 'bg-sky-500 animate-pulse'
    },
    entregado: {
        label: 'Entregado',
        cls: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/25 dark:text-emerald-300',
        dot: 'bg-emerald-500'
    },
    cancelado: {
        label: 'Cancelado',
        cls: 'bg-rose-500/10 text-rose-800 border-rose-500/25 dark:text-rose-300',
        dot: 'bg-rose-500'
    },
};

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function Section({ title, icon, action, children }: { title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    {icon} {title}
                </h4>
                {action}
            </div>
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
 * Expediente unificado del servicio: organizado en 3 pestañas limpias
 * (Operación y Familia · Recuerdos y Certificado · Cobro y Convenio).
 */
export default function OrderSlideOver({ isOpen, onClose, cremation, onUpdateStatus, isUpdatingStatus }: OrderSlideOverProps) {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { canEdit } = usePermissions();
    const [activeTab, setActiveTab] = useState<ExpedienteTab>('operacion');
    const [copied, setCopied] = useState<string | null>(null);
    const [showMainPicker, setShowMainPicker] = useState(false);
    const setMainImage = useSetMainImage();
    const [acting, setActing] = useState(false);
    // Confirmación de avance + aviso a la familia (AdvanceNoticeModal)
    const [askNotice, setAskNotice] = useState(false);
    const [loadingReceipt, setLoadingReceipt] = useState(false);
    const [downloadingCertId, setDownloadingCertId] = useState<number | null>(null);
    const [showRevert, setShowRevert] = useState(false);
    const [showCertTexts, setShowCertTexts] = useState(false);
    const [showEditWeight, setShowEditWeight] = useState(false);
    const isOwner = useIsOwner();
    const { tenantData } = useTenant();
    const { hasFeature } = useFeatures();
    // Memorial online: misma regla que Mascotas (feature del plan + PRO/ULTRA)
    const canUseMemorial = hasFeature('mascotas:memorial')
        && isProOrUltraCrematoryPlan(tenantData?.subscription_plan?.name || tenantData?.plan || 'PRO');

    const orderId = cremation?.id;
    const { data: exp, isLoading, isError } = useQuery<Expediente>({
        queryKey: ['expediente', orderId],
        queryFn: () => apiRequest(`/api/internal/cremations/${orderId}/expediente`),
        enabled: isOpen && !!orderId,
        staleTime: 30_000,
    });

    // Resetear a la pestaña principal al cambiar de orden
    useEffect(() => {
        if (orderId) setActiveTab('operacion');
    }, [orderId]);

    // Diseño con el que se emite el certificado
    const certEnabled = !!exp?.deliverables.certificate.enabled;
    const { data: issueTpl, isLoading: issueTplLoading } = useQuery({
        queryKey: ISSUE_TEMPLATE_QUERY_KEY,
        queryFn: () => loadIssueTemplate(),
        enabled: isOpen && certEnabled,
        staleTime: 60_000,
    });
    const { data: petDates } = usePetDates(exp?.pet.id, isOpen && issueDateFields(issueTpl).length > 0);
    const missingDates = missingPetDates(issueTpl, petDates);

    if (!cremation) return null;

    const refresh = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['expediente', orderId] }),
            queryClient.invalidateQueries({ queryKey: ['cremations-simple'] }),
            queryClient.invalidateQueries({ queryKey: ['cremations'] }),
            queryClient.invalidateQueries({ queryKey: ['ops-board'] }),
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
    const phoneDigits = (exp?.customer.phone || '').replace(/\D/g, '');
    const whatsappUrl = phoneDigits
        ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
            `Hola ${exp?.customer.name || ''}, te escribimos por el servicio de ${petName}.` +
            (trackingUrl ? ` Puedes seguir el proceso aquí: ${trackingUrl}` : '')
        )}`
        : '';

    const openDocumentHtml = async (loader: () => Promise<string>) => {
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

    const handleOpenReceipt = async () => {
        if (loadingReceipt) return;
        setLoadingReceipt(true);
        try {
            await openDocumentHtml(async () => {
                const res = await apiRequest('/api/internal/ops-records/receipt', {
                    method: 'POST',
                    body: { cremation_id: cremation.id, persist: false },
                });
                return res.html_content;
            });
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'No se pudo generar el recibo', 'error');
        } finally {
            setLoadingReceipt(false);
        }
    };

    const viewCertificate = async (certId: number) => {
        try {
            await openDocumentHtml(async () => {
                const res = await apiRequest(`/api/internal/ops-records/certificates/${certId}/content`);
                return res.html_content;
            });
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'No se pudo abrir el certificado', 'error');
        }
    };

    const downloadCertificate = async (certId: number, number: string) => {
        if (downloadingCertId) return;
        setDownloadingCertId(certId);
        try {
            const res = await apiRequest(`/api/internal/ops-records/certificates/${certId}/content`);
            await downloadHtmlAsPdf(res.html_content, pdfFileName(`certificado_${petName}_${number}`));
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'No se pudo descargar el certificado', 'error');
        } finally {
            setDownloadingCertId(null);
        }
    };

    const issueCertificate = async (templateId?: number, overrides?: CertOverrides): Promise<boolean> => {
        setActing(true);
        try {
            await openDocumentHtml(async () => {
                const res = await apiRequest('/api/internal/ops-records/generate', {
                    method: 'POST',
                    body: { cremation_id: cremation.id, template_id: templateId, image_overrides: overrides, persist: true },
                });
                return res.html_content;
            });
            showToast('Certificado emitido', 'success');
            await refresh();
            return true;
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'No se pudo emitir el certificado', 'error');
            return false;
        } finally {
            setActing(false);
        }
    };

    const startIssueCertificate = () => {
        if (!issueTpl || issueTextFields(issueTpl).length > 0 || issueDateFields(issueTpl).length > 0) {
            setShowCertTexts(true);
            return;
        }
        issueCertificate();
    };

    const runNextAction = async () => {
        if (!exp?.next_action) return;
        const key = exp.next_action.key;
        if (key === 'emitir_certificado') {
            setActiveTab('recuerdos');
            return startIssueCertificate();
        }
        setActing(true);
        try {
            if (key === 'entregar') {
                if (onUpdateStatus) await onUpdateStatus(cremation.id, 'entregado');
            } else {
                // Avanzar pide confirmación primero (modal); el avance se guarda al confirmar
                setAskNotice(true);
                return;
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

    const pickupText = [exp?.logistics?.pickup_address, exp?.logistics?.pickup_city].filter(Boolean).join(', ');
    const deliveryText = [exp?.logistics?.address, exp?.logistics?.city].filter(Boolean).join(', ');
    const hasLogistics = !!(pickupText || deliveryText || exp?.order.scheduled_at);
    const weightVal = exp?.pet.weight ?? cremation.weight ?? 0;
    const canEditOrder = canEdit('ordenes');
    // Foto principal de la mascota (la usan plantillas, IA, certificado y memorial)
    const canPickMain = canEdit('mascotas') && !!exp?.pet.id && (exp?.pet.pet_photos?.length || 0) > 1;

    const certsCount = exp?.deliverables.certificate.issued.length || 0;

    return (
        <SlideOver
            isOpen={isOpen}
            onClose={onClose}
            title={`Orden ${exp?.order.oc_number ? `OC ${exp.order.oc_number}` : `#${cremation.id}`}`}
            subtitle={`${petName} · ${exp?.order.cremation_type || cremation.cremation_type || 'Servicio de cremación'}`}
            icon={<Activity size={20} />}
            width="max-w-2xl"
        >
            <div className="p-5 sm:p-6 space-y-5">
                {isLoading && (
                    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                        <Loader2 size={18} className="animate-spin" /> Cargando expediente...
                    </div>
                )}
                {isError && (
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
                        <AlertCircle size={16} /> No se pudo cargar el expediente de la orden.
                    </div>
                )}

                {exp && status && (
                    <>
                        {/* Cabecera Operativa Fija: Estado + Seguimiento Rápido + Siguiente Acción */}
                        <div className="p-4 rounded-2xl bg-white border border-slate-200 dark:bg-white/5 dark:border-white/10 shadow-2xs space-y-3.5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${status.cls}`}>
                                            <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                                            {status.label}
                                        </span>
                                        <PriorityBadge plan={exp.order.priority_plan} size="md" />
                                        {exp.order.cremation_type && (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10">
                                                {exp.order.cremation_type}
                                            </span>
                                        )}
                                    </div>
                                    {exp.order.current_step && exp.order.status_group === 'en_proceso' && (
                                        <p className="text-xs text-slate-500 dark:text-muted-foreground">
                                            Etapa actual: <span className="text-slate-900 dark:text-white font-bold">{exp.order.current_step}</span>
                                        </p>
                                    )}
                                </div>
                                <Link
                                    href={`/dashboard/recepcion-pedidos/registro?id=${cremation.id}`}
                                    className="shrink-0 px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border border-orange-400/60 shadow-md shadow-orange-500/30 hover:shadow-lg hover:shadow-orange-500/40 dark:from-orange-500 dark:to-amber-400 dark:hover:from-orange-400 dark:hover:to-amber-300 dark:text-slate-950 dark:border-amber-300/40 dark:shadow-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background text-xs font-black transition-all flex items-center gap-1.5"
                                >
                                    <Edit size={14} /> Editar orden
                                </Link>
                            </div>

                            {/* Barra rápida de Seguimiento en Vivo */}
                            {(exp.order.verification_code || trackingUrl) && (
                                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 dark:bg-black/25 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Compass size={15} className="text-primary shrink-0" />
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Tracking:</span>
                                            {exp.order.verification_code && (
                                                <button
                                                    type="button"
                                                    onClick={() => copy('code', exp.order.verification_code!, 'Código de seguimiento copiado')}
                                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-800 dark:text-white hover:border-primary/50 transition"
                                                    title="Copiar código de seguimiento"
                                                >
                                                    {exp.order.verification_code}
                                                    {copied === 'code' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-slate-400" />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {trackingUrl && (
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => copy('tracking', trackingUrl, 'Enlace de seguimiento copiado')}
                                                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white dark:border-white/10 text-xs font-bold transition flex items-center gap-1.5"
                                            >
                                                {copied === 'tracking' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />} Copiar link
                                            </button>
                                            <a
                                                href={trackingUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white dark:border-white/10 text-xs font-bold transition flex items-center gap-1.5"
                                            >
                                                <ExternalLink size={13} /> Abrir
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Acciones de Avance / Retroceso */}
                            {(exp.next_action || (isOwner && canRevertStatus(exp.order.status_group))) && (
                                <div className="flex gap-2">
                                    {isOwner && canRevertStatus(exp.order.status_group) && (
                                        <button
                                            type="button"
                                            onClick={() => setShowRevert(true)}
                                            disabled={busy}
                                            className={`${exp.next_action ? '' : 'flex-1 '}py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 dark:text-white text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-50`}
                                            title="Retroceder un paso"
                                        >
                                            <Undo2 size={16} /> Retroceder
                                        </button>
                                    )}
                                    {exp.next_action && (
                                        <button
                                            type="button"
                                            onClick={runNextAction}
                                            disabled={busy}
                                            className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold transition hover:opacity-95 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                                            {exp.next_action.label}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Barra de 3 Pestañas Internas */}
                        <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-slate-200/70 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10">
                            <button
                                type="button"
                                onClick={() => setActiveTab('operacion')}
                                className={`py-2 px-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                                    activeTab === 'operacion'
                                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                }`}
                            >
                                <CircleDot size={13} className="text-primary shrink-0" />
                                <span className="truncate">Operación</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('recuerdos')}
                                className={`py-2 px-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                                    activeTab === 'recuerdos'
                                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                }`}
                            >
                                <Sparkles size={13} className="text-amber-500 shrink-0" />
                                <span className="truncate">Recuerdos</span>
                                {certsCount > 0 && (
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-black">
                                        ✓
                                    </span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('cobro')}
                                className={`py-2 px-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                                    activeTab === 'cobro'
                                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                }`}
                            >
                                <Receipt size={13} className="text-emerald-500 shrink-0" />
                                <span className="truncate tabular-nums">{clp.format(exp.financial.total || 0)}</span>
                            </button>
                        </div>

                        {/* ==========================================
                            TAB 1: OPERACIÓN Y FAMILIA
                        ========================================== */}
                        {activeTab === 'operacion' && (
                            <div className="space-y-6">
                                {/* Familia y Angelito */}
                                <Section title="Familia y angelito" icon={<User size={14} />}>
                                    <div className="p-4 rounded-2xl bg-white border border-slate-200 dark:bg-white/5 dark:border-white/10 shadow-2xs space-y-4">
                                        {/* Datos de la mascota + Peso editable */}
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 dark:bg-white/5 dark:border-white/10 overflow-hidden shrink-0">
                                                    {exp.pet.photos[0] ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={getImageUrl(exp.pet.photos[0]) || ''} alt={petName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-muted-foreground"><Dog size={24} /></div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate">{petName}</h3>
                                                    <p className="text-xs text-slate-500 dark:text-muted-foreground capitalize">
                                                        {[exp.pet.species, exp.pet.breed].filter(Boolean).join(' • ') || 'Mascota'}
                                                    </p>
                                                    {canPickMain && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowMainPicker(v => !v)}
                                                            className="mt-0.5 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
                                                        >
                                                            {showMainPicker ? 'Listo' : 'Cambiar foto principal'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Peso interactivo (abre EditWeightModal) */}
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                {canEditOrder ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowEditWeight(true)}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/20 text-xs font-extrabold tabular-nums transition"
                                                        title="Editar peso en báscula (kg)"
                                                    >
                                                        <Scale size={13} />
                                                        {weightVal > 0 ? `${weightVal} kg` : 'Pesar (kg)'}
                                                        <Pencil size={11} className="opacity-70" />
                                                    </button>
                                                ) : weightVal > 0 ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 text-xs font-extrabold tabular-nums">
                                                        <Scale size={13} /> {weightVal} kg
                                                    </span>
                                                ) : null}
                                                {exp.pet.size && (
                                                    <span className="text-[10px] font-semibold text-slate-500 dark:text-muted-foreground">
                                                        Tamaño: {exp.pet.size}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Elegir la foto principal (la familia a veces sube primero otra) */}
                                        {canPickMain && showMainPicker && (
                                            <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-2">
                                                <p className="text-[11px] text-slate-500 dark:text-muted-foreground">
                                                    Toca ⭐ en la foto que debe ser la principal. Se usará en lo que generes desde ahora (diseños, IA, certificado, memorial); lo ya generado puedes rehacerlo.
                                                </p>
                                                <div className="flex gap-2 flex-wrap">
                                                    {(exp.pet.pet_photos || []).map((url, idx) => (
                                                        <div key={url} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img src={getImageUrl(url) || ''} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                                                            <MainPhotoToggle
                                                                size="md"
                                                                isMain={idx === 0}
                                                                busy={setMainImage.isPending && setMainImage.variables?.url === url}
                                                                onSelect={() => exp.pet.id && setMainImage.mutate({ petId: exp.pet.id, url })}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Datos del tutor */}
                                        <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3">
                                            <div className="text-xs space-y-1 min-w-0">
                                                <p className="text-slate-900 dark:text-white font-bold truncate">{exp.customer.name || 'Tutor sin nombre'}</p>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 dark:text-muted-foreground">
                                                    {exp.customer.phone && (
                                                        <button
                                                            type="button"
                                                            onClick={() => copy('phone', exp.customer.phone!, 'Teléfono copiado')}
                                                            className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition"
                                                            title="Copiar teléfono"
                                                        >
                                                            <Phone size={11} /> {exp.customer.phone}
                                                        </button>
                                                    )}
                                                    {exp.customer.email && (
                                                        <button
                                                            type="button"
                                                            onClick={() => copy('email', exp.customer.email!, 'Correo copiado')}
                                                            className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition truncate max-w-[220px]"
                                                            title="Copiar correo"
                                                        >
                                                            <Mail size={11} /> {exp.customer.email}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {whatsappUrl && (exp.order.status_group === 'pendiente' || exp.order.status_group === 'cancelado') && (
                                                <a
                                                    href={whatsappUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-3 py-2 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-emerald-800 dark:text-[#25D366] border border-[#25D366]/30 text-xs font-bold transition flex items-center gap-1.5"
                                                >
                                                    <MessageCircle size={14} /> WhatsApp
                                                </a>
                                            )}
                                        </div>

                                        {/* Convenio Veterinario resumido */}
                                        {exp.partner && (
                                            <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
                                                <span className="flex items-center gap-2">
                                                    <Building2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                                                    <span className="text-slate-500 dark:text-muted-foreground">Derivado por</span>
                                                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">{exp.partner.name}</span>
                                                </span>
                                            </div>
                                        )}

                                        {/* Logística y Fecha Programada */}
                                        {hasLogistics && (
                                            <div className="pt-3 border-t border-slate-100 dark:border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                                                {pickupText && (
                                                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 flex items-start gap-2">
                                                        <MapPin size={14} className="text-primary shrink-0 mt-0.5" />
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground">Retiro</p>
                                                            <p className="text-slate-800 dark:text-slate-200 font-medium break-words">{pickupText}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {deliveryText && (
                                                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 flex items-start gap-2">
                                                        <MapPin size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground">Entrega cenizas</p>
                                                            <p className="text-slate-800 dark:text-slate-200 font-medium break-words">{deliveryText}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Notas e Instrucciones Especiales */}
                                        {exp.order.notes && (
                                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs">
                                                <StickyNote size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                                                        Notas / Instrucciones de la orden
                                                    </p>
                                                    <p className="text-amber-950 dark:text-amber-100 mt-0.5 whitespace-pre-line leading-relaxed">
                                                        {exp.order.notes}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Section>

                                {/* Etapas Operativas y Aviso a la Familia */}
                                {exp.timeline.length > 0 && (
                                    <Section title="Etapas del servicio" icon={<CircleDot size={14} />}>
                                        <StageTimeline
                                            stages={exp.timeline}
                                            orderId={exp.order.id}
                                            canEdit={canEditOrder}
                                            onEvidenceAdded={refresh}
                                        />
                                        {exp.order.status_group !== 'pendiente' && exp.order.status_group !== 'cancelado' && (
                                            <FamilyNoticesBox orderId={exp.order.id} finished={exp.order.status_group === 'entregado'} />
                                        )}
                                    </Section>
                                )}
                            </div>
                        )}

                        {/* ==========================================
                            TAB 2: RECUERDOS Y CERTIFICADO
                        ========================================== */}
                        {activeTab === 'recuerdos' && (
                            <div className="space-y-4">
                                {/* Certificado */}
                                <div className="p-4 rounded-2xl bg-white border border-slate-200 dark:bg-white/5 dark:border-white/10 shadow-2xs space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <FileText size={16} className="text-emerald-600 dark:text-emerald-400" />
                                            <div>
                                                <p className="text-xs font-bold text-slate-900 dark:text-white">Certificado de cremación</p>
                                                <p className="text-[10px] text-slate-500 dark:text-muted-foreground">
                                                    Documento oficial PDF para entregar a la familia
                                                </p>
                                            </div>
                                        </div>
                                        {exp.deliverables.certificate.enabled && (
                                            <button
                                                type="button"
                                                onClick={startIssueCertificate}
                                                disabled={busy}
                                                className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                                            >
                                                {acting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                                                {exp.deliverables.certificate.issued.length ? 'Volver a emitir' : 'Emitir certificado'}
                                            </button>
                                        )}
                                    </div>
                                    {!exp.deliverables.certificate.enabled ? (
                                        <p className="text-xs text-slate-500 dark:text-muted-foreground flex items-center gap-1.5">
                                            <Lock size={12} /> Disponible desde el plan NORMAL.
                                        </p>
                                    ) : (
                                        <>
                                            {missingDates.length > 0 && (
                                                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25">
                                                    <p className="text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                                        <Calendar size={12} className="shrink-0" />
                                                        Falta en la ficha: {missingDates.map((k) => DATE_LABELS[k].toLowerCase()).join(' y ')}. En el certificado quedará vacío.
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCertTexts(true)}
                                                        disabled={busy}
                                                        className="text-[11px] font-bold text-amber-900 dark:text-amber-200 underline-offset-2 hover:underline disabled:opacity-50"
                                                    >
                                                        Completar fecha
                                                    </button>
                                                </div>
                                            )}
                                            {exp.deliverables.certificate.issued.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {exp.deliverables.certificate.issued.map((c) => (
                                                        <div key={c.id} className="flex items-stretch rounded-xl border border-emerald-500/25 overflow-hidden">
                                                            <button
                                                                type="button"
                                                                onClick={() => viewCertificate(c.id)}
                                                                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition flex items-center gap-1.5"
                                                                title="Ver certificado"
                                                            >
                                                                <ExternalLink size={14} /> {c.number}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => downloadCertificate(c.id, c.number)}
                                                                disabled={downloadingCertId !== null}
                                                                className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-l border-emerald-500/25 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                                                                title="Descargar PDF"
                                                                aria-label={`Descargar ${c.number} en PDF`}
                                                            >
                                                                {downloadingCertId === c.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PDF
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Carta de despedida */}
                                <DedicationSection
                                    orderId={exp.order.id}
                                    petName={petName}
                                    dedication={exp.pet.dedication}
                                    source={exp.pet.dedication_source}
                                    canEdit={canEditOrder}
                                    onSaved={() => queryClient.invalidateQueries({ queryKey: ['expediente', orderId] })}
                                />

                                {/* Tarjeta de homenaje */}
                                <FarewellCardSection
                                    templateConfig={exp.deliverables.farewell_template?.config}
                                    petName={petName}
                                    dedication={exp.pet.dedication}
                                    photoUrl={exp.pet.photos[0]}
                                />

                                {/* Imágenes generadas (con modal de confirmación) */}
                                <GeneratedImagesSection
                                    orderId={exp.order.id}
                                    petId={exp.pet.id}
                                    petName={petName}
                                    dedication={exp.pet.dedication}
                                    photoUrl={exp.pet.photos[0]}
                                    photos={exp.pet.photos}
                                    farewellTemplateConfig={exp.deliverables.farewell_template?.config}
                                    certificate={{ enabled: exp.deliverables.certificate.enabled, issued: exp.deliverables.certificate.issued.length }}
                                    certMissing={missingDates.map((k) => DATE_LABELS[k].toLowerCase())}
                                />

                                {/* Memorial online conmemorativo (solo si el plan lo incluye) */}
                                {canUseMemorial && <MemorialOrderSection
                                    orderId={exp.order.id}
                                    pet={{
                                        id: exp.pet.id,
                                        name: petName,
                                        photos: exp.pet.photos,
                                        dedication: exp.pet.dedication,
                                    }}
                                    customer={exp.customer}
                                    deliverableMemorial={exp.deliverables.memorial}
                                    onUpdated={() => queryClient.invalidateQueries({ queryKey: ['expediente', orderId] })}
                                />}
                            </div>
                        )}

                        {/* ==========================================
                            TAB 3: COBRO Y CONVENIO
                        ========================================== */}
                        {activeTab === 'cobro' && (
                            <div className="space-y-5">
                                <Section
                                    title="Desglose de servicios y productos"
                                    icon={<Receipt size={14} />}
                                    action={
                                        <button
                                            type="button"
                                            onClick={handleOpenReceipt}
                                            disabled={loadingReceipt}
                                            className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/25 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                                            title="Ver o imprimir comprobante de servicio"
                                        >
                                            {loadingReceipt ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />}
                                            Ver / Imprimir Recibo
                                        </button>
                                    }
                                >
                                    <div className="p-4 rounded-2xl bg-white border border-slate-200 dark:bg-white/5 dark:border-white/10 shadow-2xs text-xs space-y-2.5">
                                        {exp.items.length === 0 ? (
                                            <p className="text-slate-500 dark:text-muted-foreground">Sin servicios registrados.</p>
                                        ) : exp.items.map((it, i) => (
                                            <div key={`${it.tipo}-${i}`}>
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="text-slate-800 dark:text-white font-medium truncate">
                                                        {it.cantidad > 1 ? `${it.cantidad} × ` : ''}{it.nombre}
                                                        {it.tipo !== 'peso' && (
                                                            <span className="ml-2 text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-muted-foreground font-bold">
                                                                {it.tipo}
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="text-slate-600 dark:text-slate-300 font-semibold tabular-nums">{clp.format(it.precio * it.cantidad)}</span>
                                                </div>
                                                {!!it.incluye?.length && (
                                                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-muted-foreground">Incluye: {it.incluye.join(', ')}</p>
                                                )}
                                            </div>
                                        ))}
                                        {!!exp.financial.agreement?.discount && (
                                            <div className="flex justify-between text-sky-700 dark:text-sky-400 font-medium">
                                                <span>Convenio {exp.financial.agreement.name}</span>
                                                <span className="tabular-nums">−{clp.format(exp.financial.agreement.discount)}</span>
                                            </div>
                                        )}
                                        {!!exp.financial.discount && (
                                            <div className="flex justify-between text-amber-700 dark:text-amber-400 font-medium">
                                                <span>Descuento ({exp.financial.discount}%)</span>
                                                <span className="tabular-nums">−{clp.format((exp.financial.subtotal || 0) - (exp.financial.agreement?.discount || 0) - exp.financial.total)}</span>
                                            </div>
                                        )}
                                        <div className="pt-2.5 border-t border-slate-200 dark:border-white/10 flex justify-between font-extrabold text-sm">
                                            <span className="text-slate-900 dark:text-white">Total a cobrar</span>
                                            <span className="text-slate-900 dark:text-white tabular-nums">{clp.format(exp.financial.total || 0)}</span>
                                        </div>
                                    </div>
                                </Section>

                                {/* Descuentos: convenio empresa + % manual (el servidor recalcula total y comisión) */}
                                <Section title="Descuentos" icon={<Percent size={14} />}>
                                    <OrderDiscountsBox
                                        orderId={exp.order.id}
                                        agreementId={exp.financial.agreement?.id ?? null}
                                        discount={exp.financial.discount || 0}
                                        agreementsEnabled={hasFeature('clientes:convenios', true)}
                                        canEdit={!!(canEditOrder && exp.order.status_group !== 'cancelado' && (exp.order.status_group !== 'entregado' || isOwner))}
                                        lockedReason={exp.order.status_group === 'cancelado'
                                            ? 'La orden está cancelada.'
                                            : exp.order.status_group === 'entregado' && !isOwner
                                                ? 'La orden ya fue entregada: solo el administrador puede cambiar sus descuentos.'
                                                : undefined}
                                        onSaved={refresh}
                                    />
                                </Section>

                                {/* Convenio Veterinario detallado */}
                                <Section title="Convenio veterinario" icon={<Building2 size={14} />}>
                                    <div className="p-4 rounded-2xl bg-white border border-slate-200 dark:bg-white/5 dark:border-white/10 shadow-2xs text-xs space-y-2">
                                        {exp.partner ? (
                                            <>
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-slate-500 dark:text-muted-foreground">Clínica / Veterinario</span>
                                                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{exp.partner.name}</span>
                                                </div>
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-slate-500 dark:text-muted-foreground">Comisión asociada</span>
                                                    <span className="font-bold text-slate-900 dark:text-white">
                                                        {exp.partner.commission
                                                            ? `${clp.format(exp.partner.commission.amount)} · ${exp.partner.commission.status}`
                                                            : 'Sin comisión registrada'}
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            <p className="text-slate-500 dark:text-muted-foreground">
                                                Atención particular directa (sin clínica veterinaria asociada).
                                            </p>
                                        )}
                                    </div>
                                </Section>
                            </div>
                        )}

                        {/* Origen */}
                        <p className="text-[11px] text-slate-400 dark:text-muted-foreground text-center pt-1">
                            Creada el {exp.order.created_at ? new Date(exp.order.created_at).toLocaleString('es-CL') : '—'}
                            {exp.origin.submission_code ? ` · Solicitud ${exp.origin.submission_code}` : ''}
                        </p>
                    </>
                )}
            </div>
            {showCertTexts && (
                <CertificateTextsModal
                    isOpen={showCertTexts}
                    onClose={() => setShowCertTexts(false)}
                    cremationId={cremation.id}
                    petId={exp?.pet.id}
                    hasIssued={!!exp?.deliverables.certificate.issued.length}
                    data={issueTpl}
                    isLoading={issueTplLoading}
                    onIssue={issueCertificate}
                    onTextsSaved={() => queryClient.invalidateQueries({ queryKey: ISSUE_TEMPLATE_QUERY_KEY })}
                />
            )}
            {showRevert && (
                <RevertOrderModal
                    isOpen={showRevert}
                    orderId={cremation.id}
                    onClose={() => setShowRevert(false)}
                />
            )}
            {showEditWeight && (
                <EditWeightModal
                    isOpen={showEditWeight}
                    onClose={() => setShowEditWeight(false)}
                    currentWeight={weightVal}
                    orderId={cremation.id}
                    petName={petName}
                    onSave={() => refresh()}
                />
            )}
            {askNotice && (
                <AdvanceNoticeModal
                    orderId={cremation.id}
                    onAdvance={async () => {
                        try {
                            await apiRequest(`/api/internal/operations/ops/orders/${cremation.id}/advance`, { method: 'PATCH' });
                            showToast(exp?.next_action?.key === 'iniciar' ? 'Operación iniciada' : 'Etapa avanzada', 'success');
                            await refresh();
                            return true;
                        } catch (err: unknown) {
                            showToast(err instanceof Error ? err.message : 'No se pudo avanzar la etapa', 'error');
                            return false;
                        }
                    }}
                    onClose={() => setAskNotice(false)}
                />
            )}
        </SlideOver>
    );
}
