"use client";

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, Heart, Sparkles, Eye, X, Loader2, FileText, ExternalLink, Calendar, Pencil } from 'lucide-react';
import { apiRequest, getImageUrl } from '@/lib/tenant/api';
import { useDocuments, fetchDocumentContent } from '@/hooks/useDocuments';
import { listTemplateExports } from '@/lib/tenant/imageTemplates';
import { buildFarewellConfig, farewellCardDims } from '@/lib/tenant/farewellCard';
import type { AutoDocKind, AutoDocuments } from '@/lib/tenant/autoDocuments';
import FarewellPreview from '@/app/(tenant)/tenant/dashboard/documentos/disenos/components/FarewellPreview';
import TemplatePreviewThumb from '@/components/admin/imageTemplates/TemplatePreviewThumb';
import { RecipeDesignView, isRecipeDesign } from '@/components/tenant/redes/RecipeDesign';
import CertificateTextsModal, { DATE_LABELS, ISSUE_TEMPLATE_QUERY_KEY, issueDateFields, loadIssueTemplate, missingPetDates, usePetDates, type CertOverrides } from '@/components/tenant/operations/CertificateTextsModal';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

/** Tamaño de referencia con el que se dibuja el HTML del certificado antes de escalarlo. */
const CERT_W = 1123;
const CERT_H = 794;

const META: Record<AutoDocKind, { label: string; icon: typeof Award; href: string }> = {
    certificate: { label: 'Certificado', icon: Award, href: '/dashboard/documentos/repositorio' },
    digital: { label: 'Imagen digital', icon: Heart, href: '/dashboard/documentos/redes' },
    social: { label: 'Imagen redes', icon: Sparkles, href: '/dashboard/documentos/redes' },
};

type Tenant = Parameters<typeof buildFarewellConfig>[2];

interface Props {
    kinds: AutoDocKind[];
    auto: AutoDocuments;
    petId: number | null;
    cremationId: number | null;
    petName: string;
    dedication?: string | null;
    tenant: Tenant;
    socialUsesAi: boolean;
}

/** Ancho de un contenedor (para escalar certificado y tarjeta a su tamaño). */
function useBoxWidth(): [(el: HTMLDivElement | null) => (() => void) | void, number] {
    const [width, setWidth] = useState(0);
    const ref = useCallback((el: HTMLDivElement | null) => {
        if (!el) return;
        setWidth(el.clientWidth);
        const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    return [ref, width];
}

/**
 * Vista previa de los documentos del registro: lo ya generado para esta mascota
 * o, si aún no existe, un ejemplo con la plantilla configurada. El ojito lo amplía.
 */
export default function DocumentPreviews({ kinds, auto, petId, cremationId, petName, dedication, tenant, socialUsesAi }: Props) {
    const [open, setOpen] = useState<AutoDocKind | null>(null);
    const [editCert, setEditCert] = useState(false);
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const social = auto.resolved.social;
    const wants = (k: AutoDocKind) => kinds.includes(k);

    // Certificado: el emitido para esta orden o la vista previa de la plantilla.
    const { data: docs } = useDocuments();
    const cert = cremationId
        ? (docs?.documents || [])
            .filter(d => d.is_generated && d.cremation_id === cremationId)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        : undefined;
    const certTemplateId = auto.resolved.certificate?.id;
    const { data: certHtml, isLoading: certLoading } = useQuery({
        queryKey: ['tenant', 'registro-doc-preview', 'certificate', cert?.id ?? cremationId ?? 'sample', certTemplateId],
        queryFn: async (): Promise<string | null> => {
            if (cert) return cert.html_content || await fetchDocumentContent(cert.id);
            // Con orden: vista previa con los datos reales de la mascota (sin emitir).
            if (cremationId) {
                const res = await apiRequest('/api/internal/ops-records/generate', {
                    method: 'POST',
                    body: { cremation_id: cremationId, template_id: certTemplateId, certificate_type: 'Cremación', persist: false },
                });
                return res?.html_content || null;
            }
            const qs = certTemplateId ? `?template_id=${certTemplateId}` : '';
            const res = await apiRequest(`/api/internal/ops-records/templates/preview${qs}`);
            return res?.html_content || null;
        },
        enabled: wants('certificate') && docs !== undefined,
        staleTime: 60_000,
    });

    // Fechas de la mascota que usa el diseño: si faltan en la ficha, se avisa y se completan en el modal.
    const { data: issueTpl, isLoading: issueTplLoading } = useQuery({
        queryKey: [...ISSUE_TEMPLATE_QUERY_KEY, certTemplateId ?? 'default'],
        queryFn: () => loadIssueTemplate(certTemplateId),
        enabled: wants('certificate'),
        staleTime: 60_000,
    });
    const { data: petDates } = usePetDates(petId, wants('certificate') && issueDateFields(issueTpl).length > 0);
    const missingDates = missingPetDates(issueTpl, petDates);
    const canEditCert = cremationId != null;

    // Emite (o vuelve a emitir) desde el modal y refresca la miniatura.
    const issueCert = async (templateId: number | undefined, overrides: CertOverrides) => {
        try {
            await apiRequest('/api/internal/ops-records/generate', {
                method: 'POST',
                body: { cremation_id: cremationId, certificate_type: 'Cremación', template_id: templateId, image_overrides: overrides, persist: true },
            });
            await queryClient.invalidateQueries({ queryKey: ['ops-documents'] });
            queryClient.invalidateQueries({ queryKey: ['tenant', 'registro-doc-preview', 'certificate'] });
            showToast(cert ? 'Certificado actualizado' : 'Certificado emitido', 'success');
            return true;
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'No se pudo emitir el certificado', 'error');
            return false;
        }
    };

    // Imágenes ya generadas para esta mascota.
    const { data: digitalData } = useQuery({
        queryKey: ['tenant', 'template-exports', 'registro', 'digital', petId],
        queryFn: () => listTemplateExports({ kind: 'digital', pet_id: petId!, page_size: 1 }),
        enabled: wants('digital') && petId != null,
    });
    const { data: socialData } = useQuery({
        queryKey: ['tenant', 'template-exports', 'registro', 'design', petId, social?.id],
        queryFn: () => listTemplateExports({ kind: 'design', pet_id: petId!, template_id: social!.id, page_size: 1 }),
        enabled: wants('social') && petId != null && !!social,
    });
    const digitalDone = digitalData?.items[0];
    const socialDone = socialData?.items[0];

    const generated: Record<AutoDocKind, boolean> = { certificate: !!cert, digital: !!digitalDone, social: !!socialDone };
    const templateName = (k: AutoDocKind) => (k === 'social' ? social?.name : auto.resolved[k]?.name) || '—';

    const digitalConfig = auto.resolved.digital
        ? buildFarewellConfig(auto.resolved.digital.config, { petName: petName || 'Luna', dedication: dedication || null, photoUrl: null }, tenant)
        : null;

    const content = (k: AutoDocKind, size: 'thumb' | 'full') => {
        if (k === 'certificate') {
            if (certLoading) return <Center><Loader2 size={18} className="animate-spin text-primary" /></Center>;
            if (!certHtml) return <Center><FileText size={22} className="text-muted-foreground" /></Center>;
            return size === 'full'
                ? <iframe title="Certificado" srcDoc={certHtml} sandbox="allow-same-origin" className="w-full h-full bg-white" />
                : <ScaledHtml html={certHtml} />;
        }
        if (k === 'digital') {
            if (digitalDone?.url) return <Img src={digitalDone.url} alt={digitalDone.title} />;
            return digitalConfig ? <ScaledFarewell config={digitalConfig} /> : null;
        }
        // Diseño guardado como receta: se dibuja en vivo con la plantilla y los datos.
        if (socialDone && isRecipeDesign(socialDone)) return <RecipeDesignView item={socialDone} className="absolute inset-0 p-1" />;
        if (socialDone?.url) return <Img src={socialDone.url} alt={socialDone.title} />;
        if (!social) return null;
        return social.thumbnail_url
            ? <Img src={social.thumbnail_url} alt={`Ejemplo de ${social.name}`} />
            : <TemplatePreviewThumb template={social} className="w-full h-full p-2" />;
    };

    const openMeta = open ? META[open] : null;

    return (
        <>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {kinds.map(k => {
                    const Icon = META[k].icon;
                    return (
                        <div key={k} className="min-w-0">
                            <div className="group relative aspect-[4/5] rounded-2xl overflow-hidden bg-slate-100 ring-1 ring-slate-200 dark:bg-black/30 dark:ring-white/10">
                                {content(k, 'thumb')}
                                <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold shadow-sm ${generated[k] ? 'bg-emerald-500 text-white' : 'bg-white/90 text-slate-700'}`}>
                                    {generated[k] ? 'Generado' : 'Ejemplo'}
                                </span>
                                {k === 'certificate' && missingDates.length > 0 && (
                                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold shadow-sm bg-amber-500 text-white flex items-center gap-1">
                                        <Calendar size={9} /> Falta fecha
                                    </span>
                                )}
                                <button onClick={() => setOpen(k)} title="Ver en grande" aria-label={`Ver ${META[k].label}`}
                                    className="absolute bottom-1.5 right-1.5 h-8 w-8 rounded-full bg-white/95 text-slate-700 shadow-md flex items-center justify-center hover:bg-primary hover:text-white transition-colors dark:bg-slate-800/95 dark:text-slate-100">
                                    <Eye size={15} />
                                </button>
                            </div>
                            <p className="mt-2 text-[11px] sm:text-xs font-bold text-foreground flex items-center gap-1 truncate">
                                <Icon size={11} className="text-primary shrink-0" /> {META[k].label}
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate" title={templateName(k)}>{templateName(k)}</p>
                            {k === 'social' && socialUsesAi && (
                                <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-600 dark:text-violet-300 text-[9px] font-bold">1 crédito IA</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {open && openMeta && (
                <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpen(null)}>
                    <div className={`bg-white dark:bg-slate-900 rounded-3xl w-full flex flex-col overflow-hidden shadow-2xl ${open === 'certificate' ? 'max-w-4xl h-[85vh]' : 'max-w-lg max-h-[90vh]'}`}
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-200 dark:border-white/10">
                            <div className="min-w-0">
                                <p className="font-bold text-slate-900 dark:text-white truncate">{openMeta.label} · {templateName(open)}</p>
                                <p className="text-[11px] text-slate-500">
                                    {generated[open] ? `Generado para ${petName || 'esta mascota'}` : 'Ejemplo de cómo quedará (aún no generado)'}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {open === 'certificate' && canEditCert && (
                                    <button onClick={() => { setOpen(null); setEditCert(true); }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${missingDates.length ? 'bg-amber-500 text-white hover:bg-amber-600' : 'text-primary hover:bg-primary/10'}`}>
                                        {missingDates.length ? <><Calendar size={13} /> Completar fecha</> : <><Pencil size={13} /> Editar datos</>}
                                    </button>
                                )}
                                {generated[open] && (
                                    <Link href={openMeta.href} className="px-3 py-1.5 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 flex items-center gap-1">
                                        <ExternalLink size={13} /> Abrir
                                    </Link>
                                )}
                                <button onClick={() => setOpen(null)} aria-label="Cerrar" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X size={18} /></button>
                            </div>
                        </div>
                        {open === 'certificate' && missingDates.length > 0 && (
                            <p className="px-5 py-2 text-xs font-medium bg-amber-50 text-amber-800 border-b border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20">
                                Falta en la ficha de la mascota: {missingDates.map((k) => DATE_LABELS[k].toLowerCase()).join(' y ')}. Por eso aparece vacío en el certificado.
                                {canEditCert ? ' Usa «Completar fecha».' : ' Procesa el registro para poder completarlo.'}
                            </p>
                        )}
                        <div className={open === 'certificate' ? 'flex-1 min-h-0' : 'p-4 overflow-auto'}>
                            {open === 'certificate' ? content(open, 'full') : (
                                <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-slate-100 dark:bg-black/30">
                                    {content(open, 'full')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {editCert && cremationId != null && (
                <CertificateTextsModal
                    isOpen={editCert}
                    onClose={() => setEditCert(false)}
                    cremationId={cremationId}
                    petId={petId}
                    hasIssued={!!cert}
                    data={issueTpl}
                    isLoading={issueTplLoading}
                    onIssue={issueCert}
                    onTextsSaved={() => queryClient.invalidateQueries({ queryKey: ISSUE_TEMPLATE_QUERY_KEY })}
                />
            )}
        </>
    );
}

function Center({ children }: { children: React.ReactNode }) {
    return <div className="absolute inset-0 flex items-center justify-center">{children}</div>;
}

function Img({ src, alt }: { src: string; alt: string }) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={getImageUrl(src)} alt={alt} loading="lazy" className="absolute inset-0 w-full h-full object-contain" />;
}

/** HTML del certificado dibujado a tamaño real y reducido al ancho de la miniatura. */
function ScaledHtml({ html }: { html: string }) {
    const [ref, width] = useBoxWidth();
    const scale = width / CERT_W;
    return (
        <div ref={ref} className="absolute inset-0 flex items-center overflow-hidden pointer-events-none">
            {width > 0 && (
                <div style={{ width, height: CERT_H * scale }} className="relative overflow-hidden bg-white">
                    <iframe title="Certificado" srcDoc={html} sandbox="allow-same-origin" tabIndex={-1}
                        style={{ width: CERT_W, height: CERT_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}
                        className="absolute top-0 left-0 border-0" />
                </div>
            )}
        </div>
    );
}

/** Tarjeta de homenaje con los datos del registro, escalada al contenedor. */
function ScaledFarewell({ config }: { config: ReturnType<typeof buildFarewellConfig> }) {
    const [ref, width] = useBoxWidth();
    const dims = farewellCardDims(config.format || '1:1');
    const scale = width / dims.width;
    return (
        <div ref={ref} className="absolute inset-0 flex items-center overflow-hidden">
            {width > 0 && (
                <div style={{ width, height: dims.height * scale }} className="relative overflow-hidden">
                    <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: dims.width, height: dims.height }} className="absolute top-0 left-0">
                        <FarewellPreview config={config} />
                    </div>
                </div>
            )}
        </div>
    );
}
