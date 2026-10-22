"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ImageIcon,
    Trash2,
    Lock,
    Eye,
    EyeOff,
    AlertCircle,
    Plus,
    Pencil,
    Copy,
    Building2,
    ImagePlus,
    Eraser,
    CheckCircle2,
} from 'lucide-react';

import {
    listImageTemplates,
    deleteImageTemplate,
    updateImageTemplate,
    duplicateImageTemplate,
    getTemplatesUsage,
} from '@/lib/admin/imageTemplates/api';
import { TEMPLATE_FONTS_URL } from '@/lib/admin/imageTemplates/constants';
import { useAdminTenants } from '@/hooks/useAdminBootstrap';
import type { ImageTemplate, TemplateUsage } from '@/lib/admin/imageTemplates/types';
import TemplatePreviewThumb, { templateRatio } from '@/components/admin/imageTemplates/TemplatePreviewThumb';
import TemplateUsageModal from '@/components/admin/imageTemplates/TemplateUsageModal';
import TemplateExampleModal from '@/components/admin/imageTemplates/TemplateExampleModal';
import PurgeTemplateExportsModal from '@/components/admin/imageTemplates/PurgeTemplateExportsModal';
import { getImageUrl } from '@/lib/admin/api';

/** Lo real que conviene mostrar de una plantilla: su último diseño o, si no hay, su última ilustración IA. */
function realPreview(usage: TemplateUsage | undefined) {
    const design = usage?.latest_design ?? null;
    const illustration = design ? null : usage?.latest.find(it => it.kind === 'illustration' && it.url) ?? null;
    const label = design
        ? `Último diseño creado${design.tenant_name ? ` · ${design.tenant_name}` : ''}`
        : illustration ? `Con la última ilustración IA${illustration.tenant_name ? ` · ${illustration.tenant_name}` : ''}` : null;
    return { design, illustrationUrl: illustration?.url ?? null, label };
}

export default function PlantillasImagenPage() {
    const qc = useQueryClient();
    const router = useRouter();
    const [confirmDelete, setConfirmDelete] = useState<ImageTemplate | null>(null);
    const [previewTemplate, setPreviewTemplate] = useState<ImageTemplate | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [usageTemplate, setUsageTemplate] = useState<ImageTemplate | null>(null);
    const [exampleTemplate, setExampleTemplate] = useState<ImageTemplate | null>(null);
    const [purgeTemplate, setPurgeTemplate] = useState<ImageTemplate | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const { data: templates, isLoading } = useQuery({
        queryKey: ['admin', 'image-templates'],
        queryFn: listImageTemplates,
    });
    // Uso por plantilla: crematorios, totales y los últimos 5 creados.
    const { data: usage } = useQuery({
        queryKey: ['admin', 'image-templates', 'usage'],
        queryFn: () => getTemplatesUsage(5),
    });

    const delMutation = useMutation({
        mutationFn: (id: number) => deleteImageTemplate(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin', 'image-templates'] });
            setConfirmDelete(null);
        },
        onError: (err: Error) => {
            setErrorMsg(err.message || 'Error al eliminar');
            setConfirmDelete(null);
        },
    });

    const toggleActiveMutation = useMutation({
        mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
            updateImageTemplate(id, { is_active }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'image-templates'] }),
        onError: (err: Error) => setErrorMsg(err.message || 'Error al actualizar'),
    });

    const duplicateMutation = useMutation({
        mutationFn: (id: number) => duplicateImageTemplate(id),
        onSuccess: (clone) => {
            qc.invalidateQueries({ queryKey: ['admin', 'image-templates'] });
            router.push(`/dashboard/plantillas-imagen/editor?id=${clone.id}`);
        },
        onError: (err: Error) => setErrorMsg(err.message || 'Error al duplicar'),
    });

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Fuentes de las plantillas: Konva las necesita cargadas en el documento
                para que la vista previa use la tipografía real y no la del sistema. */}
            <link href={TEMPLATE_FONTS_URL} rel="stylesheet" />
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-3">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Uso en Tenant: Módulo Documentos → Catálogo de Diseños</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <ImageIcon className="text-primary" size={28} />
                        Diseños Gráficos (Canvas)
                    </h1>
                    <p className="text-white/50 mt-2 text-sm">
                        Plantillas para redes (Instagram) sobre lienzo Konva. Los crematorios las rellenan con los datos y fotos de la mascota, y pueden generar el texto y una ilustración con IA (Gemini) según los prompts de cada plantilla.
                    </p>
                </div>
                <button
                    onClick={() => router.push('/dashboard/plantillas-imagen/editor')}
                    className="shrink-0 flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
                >
                    <Plus size={16} /> Nueva plantilla
                </button>
            </div>

            {errorMsg && (
                <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl flex items-start gap-3">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <div className="flex-1 text-sm">{errorMsg}</div>
                    <button onClick={() => setErrorMsg(null)} className="text-red-300/60 hover:text-red-300">×</button>
                </div>
            )}

            {successMsg && (
                <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl flex items-start gap-3">
                    <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                    <div className="flex-1 text-sm">{successMsg}</div>
                    <button onClick={() => setSuccessMsg(null)} className="text-emerald-300/60 hover:text-emerald-300">×</button>
                </div>
            )}

            {/* Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white/5 rounded-2xl h-80 animate-pulse" />
                    ))}
                </div>
            ) : !templates || templates.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
                    <ImageIcon className="mx-auto text-white/20 mb-4" size={48} />
                    <h3 className="text-white/80 font-bold text-lg mb-2">
                        Aún no hay plantillas
                    </h3>
                    <p className="text-white/40 text-sm max-w-md mx-auto">
                        Crea la primera con el botón “Nueva plantilla”.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map((t) => (
                        <TemplateCard
                            key={t.id}
                            template={t}
                            onDelete={() => setConfirmDelete(t)}
                            onPreview={() => setPreviewTemplate(t)}
                            usage={usage?.[String(t.id)]}
                            onShowUsage={() => setUsageTemplate(t)}
                            onExample={() => setExampleTemplate(t)}
                            onPurge={() => setPurgeTemplate(t)}
                            onEdit={() => router.push(`/dashboard/plantillas-imagen/editor?id=${t.id}`)}
                            onDuplicate={() => duplicateMutation.mutate(t.id)}
                            onToggleActive={() =>
                                toggleActiveMutation.mutate({ id: t.id, is_active: !t.is_active })
                            }
                        />
                    ))}
                </div>
            )}

            {exampleTemplate && (
                <TemplateExampleModal template={exampleTemplate} onClose={() => setExampleTemplate(null)}
                    onSaved={() => qc.invalidateQueries({ queryKey: ['admin', 'image-templates'] })} />
            )}

            {purgeTemplate && (
                <PurgeTemplateExportsModal template={purgeTemplate} onClose={() => setPurgeTemplate(null)}
                    onDone={(msg) => {
                        setPurgeTemplate(null);
                        setSuccessMsg(msg);
                        qc.invalidateQueries({ queryKey: ['admin', 'image-templates'] });
                    }} />
            )}

            {usageTemplate && (
                <TemplateUsageModal template={usageTemplate} usage={usage?.[String(usageTemplate.id)]} onClose={() => setUsageTemplate(null)} />
            )}

            {/* Preview modal (vista ampliada) */}
            {previewTemplate && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setPreviewTemplate(null)}
                >
                    <div
                        className="bg-[#0a192f] border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-white font-bold text-lg">{previewTemplate.name}</h3>
                                <p className="text-white/40 text-xs mt-0.5">
                                    {templateRatio(previewTemplate).label} · {realPreview(usage?.[String(previewTemplate.id)]).label || 'datos de ejemplo'}
                                </p>
                            </div>
                            <button
                                onClick={() => setPreviewTemplate(null)}
                                className="text-white/40 hover:text-white text-xl leading-none px-2"
                            >
                                ×
                            </button>
                        </div>

                        <TemplatePreviewThumb
                            template={previewTemplate}
                            className="w-full h-[60vh]"
                            design={realPreview(usage?.[String(previewTemplate.id)]).design}
                            illustrationUrl={realPreview(usage?.[String(previewTemplate.id)]).illustrationUrl}
                        />

                        {previewTemplate.description && (
                            <p className="text-white/50 text-sm mt-4">{previewTemplate.description}</p>
                        )}
                        {previewTemplate.default_phrase && (
                            <p className="text-white/30 text-xs mt-2 italic">
                                Frase por defecto: “{previewTemplate.default_phrase}”
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Delete confirm modal */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0a192f] border border-white/10 rounded-2xl p-6 max-w-md w-full">
                        <h3 className="text-white font-bold text-lg mb-2">¿Eliminar plantilla?</h3>
                        <p className="text-white/60 text-sm mb-6">
                            Se eliminará <span className="text-white font-semibold">{confirmDelete.name}</span>.
                            Esta acción no se puede deshacer.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-4 py-2 text-white/70 hover:text-white text-sm font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => delMutation.mutate(confirmDelete.id)}
                                disabled={delMutation.isPending}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
                            >
                                {delMutation.isPending ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


function TemplateCard({
    template,
    onDelete,
    onPreview,
    usage,
    onShowUsage,
    onExample,
    onPurge,
    onEdit,
    onDuplicate,
    onToggleActive,
}: {
    template: ImageTemplate;
    onDelete: () => void;
    onPreview: () => void;
    usage: TemplateUsage | undefined;
    onShowUsage: () => void;
    onExample: () => void;
    onPurge: () => void;
    onEdit: () => void;
    onDuplicate: () => void;
    onToggleActive: () => void;
}) {
    const tenants = useAdminTenants();
    const ratios = template.supported_ratios.join(' · ');
    const exclusiveFor = template.tenant_id != null
        ? (tenants.find(t => t.id === template.tenant_id)?.name || `Tenant #${template.tenant_id}`)
        : null;
    const hasDefinition = !!template.definition?.layers?.length;
    const real = realPreview(usage);
    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-primary/30 transition-all group">
            <div
                onClick={hasDefinition ? onPreview : undefined}
                title={hasDefinition ? 'Ver en grande' : undefined}
                className={`aspect-[4/5] bg-gradient-to-br from-slate-800 to-slate-900 relative overflow-hidden flex items-center justify-center ${hasDefinition ? 'cursor-zoom-in' : ''}`}
            >
                {hasDefinition ? (
                    // Vista previa en vivo: misma ruta de render que usa el tenant,
                    // con datos de ejemplo (nombre, fecha de hoy, frase por defecto).
                    <TemplatePreviewThumb template={template} className="w-full h-full p-3"
                        design={real.design} illustrationUrl={real.illustrationUrl} />
                ) : template.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={template.thumbnail_url}
                        alt={template.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <ImageIcon className="text-white/10" size={56} />
                )}
                {hasDefinition && real.label && (
                    <div className={`absolute ${template.is_active ? 'top-3' : 'top-11'} left-3 bg-black/60 backdrop-blur-sm text-white/90 text-[10px] font-bold px-2 py-1 rounded-full truncate w-fit max-w-[65%]`} title={real.label}>
                        {real.label}
                    </div>
                )}
                {hasDefinition && (
                    <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white/70 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <Eye size={10} /> Vista previa
                    </div>
                )}
                {template.thumbnail_url && (
                    <div className="absolute bottom-3 left-3 w-14 aspect-[4/5] rounded-md overflow-hidden ring-2 ring-white/80 shadow-lg" title="Imagen de ejemplo">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getImageUrl(template.thumbnail_url)} alt="Ejemplo" className="w-full h-full object-cover" />
                        <span className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-[8px] font-bold text-center">EJEMPLO</span>
                    </div>
                )}
                {template.is_locked && (
                    <div className="absolute top-3 right-3 bg-amber-500/90 text-black text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full flex items-center gap-1">
                        <Lock size={10} /> En uso
                    </div>
                )}
                {!template.is_active && (
                    <div className="absolute top-3 left-3 bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
                        Inactiva
                    </div>
                )}
            </div>
            <div className="p-4">
                <h3 className="font-bold text-white text-base truncate">{template.name}</h3>
                <p className="text-white/40 text-xs mt-1 truncate">{ratios}</p>
                <p className={`text-[11px] mt-1 truncate flex items-center gap-1 ${exclusiveFor ? 'text-amber-300' : 'text-white/40'}`}>
                    {exclusiveFor ? <><Lock size={10} /> Exclusiva · {exclusiveFor}</> : 'Global · todos los crematorios'}
                </p>
                <div className="flex items-center justify-between mt-1 text-xs text-white/40">
                    <span>{template.usage_count} {template.usage_count === 1 ? 'descarga' : 'descargas'}</span>
                    <span className={template.is_active ? 'text-emerald-400' : 'text-white/30'}>
                        {template.is_active ? '● Activa' : '○ Oculta'}
                    </span>
                </div>

                {/* Uso: crematorios y últimos creados */}
                <button onClick={onShowUsage} title="Ver quiénes la usan y lo último creado"
                    className="mt-3 w-full text-left rounded-xl bg-white/[0.03] border border-white/10 hover:border-primary/40 p-2.5 transition-colors">
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 font-bold text-white/80">
                            <Building2 size={12} className="text-primary" />
                            {usage?.tenants_count
                                ? `Usada por ${usage.tenants_count} ${usage.tenants_count === 1 ? 'crematorio' : 'crematorios'}`
                                : 'Sin uso todavía'}
                        </span>
                        {usage && (usage.designs + usage.illustrations) > 0 && (
                            <span className="text-white/40">{usage.designs} diseños · {usage.illustrations} IA</span>
                        )}
                    </div>
                    {usage?.latest.length ? (
                        <div className="flex gap-1.5 mt-2">
                            {usage.latest.slice(0, 5).map(item => (
                                <div key={item.id} className="w-1/5 aspect-[4/5] rounded-md overflow-hidden bg-black/30 ring-1 ring-white/10" title={`${item.title} · ${item.tenant_name || ''}`}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={getImageUrl(item.url)} alt="" loading="lazy" className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    ) : null}
                </button>
                {usage && (usage.designs + usage.illustrations) > 0 && (
                    <button onClick={onPurge} title="Eliminar en todos los crematorios los diseños e imágenes creados con esta plantilla"
                        className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-300 px-2 py-1.5 text-[11px] font-bold transition-colors">
                        <Eraser size={12} /> Eliminar lo creado con esta plantilla
                    </button>
                )}

                <div className="mt-3 flex items-center gap-2">
                    {template.is_locked ? (
                        <button
                            onClick={onDuplicate}
                            title="En uso: duplícala para crear una versión editable"
                            className="flex-1 flex items-center justify-center gap-1.5 bg-primary/15 hover:bg-primary/25 text-primary px-2 py-2 rounded-lg text-xs font-bold transition-colors"
                        >
                            <Copy size={13} /> Duplicar
                        </button>
                    ) : (
                        <button
                            onClick={onEdit}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-primary/15 hover:bg-primary/25 text-primary px-2 py-2 rounded-lg text-xs font-bold transition-colors"
                        >
                            <Pencil size={13} /> Editar
                        </button>
                    )}
                    <button
                        onClick={onExample}
                        title={template.thumbnail_url ? 'Cambiar imagen de ejemplo' : 'Agregar imagen de ejemplo'}
                        className={`p-2 rounded-lg transition-colors ${template.thumbnail_url ? 'bg-primary/15 text-primary hover:bg-primary/25' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                    >
                        <ImagePlus size={13} />
                    </button>
                    <button
                        onClick={onToggleActive}
                        title={template.is_active ? 'Ocultar a tenants' : 'Mostrar a tenants'}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white/80 px-2 py-2 rounded-lg text-xs font-bold transition-colors"
                    >
                        {template.is_active ? <EyeOff size={13} /> : <Eye size={13} />}
                        {template.is_active ? 'Ocultar' : 'Mostrar'}
                    </button>
                    <button
                        onClick={onDelete}
                        disabled={template.is_locked}
                        title={template.is_locked ? 'No se puede eliminar (en uso)' : 'Eliminar'}
                        className="bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-white/70 p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:text-white/70"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>
        </div>
    );
}
