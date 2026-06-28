"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ImageIcon,
    Trash2,
    Lock,
    Eye,
    EyeOff,
    AlertCircle,
} from 'lucide-react';

import {
    listImageTemplates,
    deleteImageTemplate,
    updateImageTemplate,
} from '@/lib/admin/imageTemplates/api';
import type { ImageTemplate } from '@/lib/admin/imageTemplates/types';
import TemplatePreviewThumb, { templateRatio } from '@/components/admin/imageTemplates/TemplatePreviewThumb';

export default function PlantillasImagenPage() {
    const qc = useQueryClient();
    const [confirmDelete, setConfirmDelete] = useState<ImageTemplate | null>(null);
    const [previewTemplate, setPreviewTemplate] = useState<ImageTemplate | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const { data: templates, isLoading } = useQuery({
        queryKey: ['admin', 'image-templates'],
        queryFn: listImageTemplates,
    });

    const delMutation = useMutation({
        mutationFn: (id: number) => deleteImageTemplate(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin', 'image-templates'] });
            setConfirmDelete(null);
        },
        onError: (err: any) => {
            setErrorMsg(err.message || 'Error al eliminar');
            setConfirmDelete(null);
        },
    });

    const toggleActiveMutation = useMutation({
        mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
            updateImageTemplate(id, { is_active }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'image-templates'] }),
        onError: (err: any) => setErrorMsg(err.message || 'Error al actualizar'),
    });

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Fuentes de las plantillas: Konva las necesita cargadas en el documento
                para que la vista previa use la tipografía real y no la del sistema. */}
            <link
                href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
                rel="stylesheet"
            />
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <ImageIcon className="text-primary" size={28} />
                        Plantillas de Imagen
                    </h1>
                    <p className="text-white/50 mt-2 text-sm">
                        Recursos del sistema sembrados por código. Los tenants los reutilizan
                        completando nombre, fecha y foto de la mascota.
                    </p>
                </div>
            </div>

            {errorMsg && (
                <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl flex items-start gap-3">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <div className="flex-1 text-sm">{errorMsg}</div>
                    <button onClick={() => setErrorMsg(null)} className="text-red-300/60 hover:text-red-300">×</button>
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
                        Esperando sincronización del sistema
                    </h3>
                    <p className="text-white/40 text-sm max-w-md mx-auto">
                        Las plantillas de imagen se registran por código. Ejecuta el script de
                        sembrado en el backend para publicarlas.
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
                            onToggleActive={() =>
                                toggleActiveMutation.mutate({ id: t.id, is_active: !t.is_active })
                            }
                        />
                    ))}
                </div>
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
                                    {templateRatio(previewTemplate).label} · datos de ejemplo
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
    onToggleActive,
}: {
    template: ImageTemplate;
    onDelete: () => void;
    onPreview: () => void;
    onToggleActive: () => void;
}) {
    const ratios = template.supported_ratios.join(' · ');
    const hasDefinition = !!template.definition?.layers?.length;
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
                    <TemplatePreviewThumb template={template} className="w-full h-full p-3" />
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
                {hasDefinition && (
                    <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white/70 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <Eye size={10} /> Vista previa
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
                <div className="flex items-center justify-between mt-1 text-xs text-white/40">
                    <span>{template.usage_count} usos</span>
                    <span className={template.is_active ? 'text-emerald-400' : 'text-white/30'}>
                        {template.is_active ? '● Activa' : '○ Oculta'}
                    </span>
                </div>

                <div className="mt-4 flex items-center gap-2">
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
