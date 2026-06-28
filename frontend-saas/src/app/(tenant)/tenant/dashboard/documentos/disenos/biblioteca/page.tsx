"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Copy,
    Eye,
    Loader2,
    Sparkles,
    Filter,
    ArrowLeft,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useRouter } from 'next/navigation';

interface CertificateTemplate {
    id: number;
    name: string;
    category: string;
    theme: string;
    paper_format: string;
    tenant_id: number | null;
    source_template_id: number | null;
    created_at: string;
}

export default function BibliotecaTemplatesPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
    const [filteredTemplates, setFilteredTemplates] = useState<CertificateTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [copyingId, setCopyingId] = useState<number | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [previewTemplate, setPreviewTemplate] = useState<CertificateTemplate | null>(null);
    const [previewHtml, setPreviewHtml] = useState<string>('');
    const [loadingPreview, setLoadingPreview] = useState(false);

    // Toast states
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    useEffect(() => {
        fetchGlobalTemplates();
    }, []);

    useEffect(() => {
        if (selectedCategory === 'all') {
            setFilteredTemplates(templates);
        } else {
            setFilteredTemplates(templates.filter(t => t.category === selectedCategory));
        }
    }, [selectedCategory, templates]);

    const fetchGlobalTemplates = async () => {
        try {
            const data = await apiRequest('/api/internal/ops-records/templates/global');
            setTemplates(data);
            setFilteredTemplates(data);
        } catch (error) {
            console.error('Error fetching global templates:', error);
            showToastMessage('Error al cargar plantillas globales', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyTemplate = async (templateId: number) => {
        setCopyingId(templateId);
        try {
            await apiRequest(`/api/internal/ops-records/templates/copy/${templateId}`, {
                method: 'POST'
            });
            showToastMessage('¡Plantilla copiada exitosamente!', 'success');
        } catch (error: any) {
            const message = error?.detail || 'Error al copiar la plantilla';
            showToastMessage(message, 'error');
        } finally {
            setCopyingId(null);
        }
    };

    const handlePreview = async (template: CertificateTemplate) => {
        setPreviewTemplate(template);
        setLoadingPreview(true);
        try {
            const result = await apiRequest(`/api/internal/ops-records/templates/${template.id}/preview`);
            setPreviewHtml(result.html_content || '');
        } catch (error) {
            console.error('Error loading preview:', error);
            showToastMessage('Error al cargar vista previa', 'error');
        } finally {
            setLoadingPreview(false);
        }
    };

    const showToastMessage = (message: string, type: 'success' | 'error') => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const categories = [
        { value: 'all', label: 'Todas' },
        { value: 'para mascotas', label: 'Para Mascotas' },
        { value: 'para empresa', label: 'Para Empresa' },
        { value: 'recibo_suscripcion', label: 'Recibos' }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/dashboard/documentos/disenos')}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors text-muted-foreground hover:text-white"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <Sparkles className="text-primary" size={28} />
                            <h1 className="text-3xl font-black tracking-tight">Biblioteca de Plantillas</h1>
                        </div>
                        <p className="text-muted-foreground mt-1">
                            Explora y copia plantillas profesionales creadas por nuestro equipo
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card rounded-[2rem] p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Filter size={18} className="text-muted-foreground" />
                    <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                        Filtrar por Categoría
                    </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                        <button
                            key={cat.value}
                            onClick={() => setSelectedCategory(cat.value)}
                            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${selectedCategory === cat.value
                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                : 'bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Templates Grid */}
            {filteredTemplates.length === 0 ? (
                <div className="glass-card rounded-[2.5rem] p-12 text-center">
                    <p className="text-muted-foreground text-lg">
                        No hay plantillas disponibles en esta categoría
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTemplates.map((template) => (
                        <motion.div
                            key={template.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-card rounded-[2rem] p-6 hover:shadow-2xl transition-all group"
                        >
                            {/* Template Preview Placeholder */}
                            <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-2xl mb-4 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                                <div className="relative z-10 text-center p-4">
                                    <div className="text-6xl mb-2">📄</div>
                                    <p className="text-xs font-bold text-white/60 uppercase tracking-wider">
                                        {template.theme}
                                    </p>
                                </div>
                                {/* Global Badge */}
                                <div className="absolute top-3 right-3 px-3 py-1 bg-primary/90 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                                    GLOBAL
                                </div>
                            </div>

                            {/* Template Info */}
                            <div className="space-y-3">
                                <div>
                                    <h3 className="font-black text-lg truncate">{template.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs px-2 py-1 bg-white/5 rounded-lg text-muted-foreground font-medium">
                                            {template.category}
                                        </span>
                                        <span className="text-xs px-2 py-1 bg-white/5 rounded-lg text-muted-foreground font-medium">
                                            {template.paper_format}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => handlePreview(template)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all font-bold text-sm"
                                    >
                                        <Eye size={16} />
                                        Preview
                                    </button>
                                    <button
                                        onClick={() => handleCopyTemplate(template.id)}
                                        disabled={copyingId === template.id}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:opacity-90 text-primary-foreground rounded-xl transition-all font-bold text-sm shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {copyingId === template.id ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Copiando...
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={16} />
                                                Copiar
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Preview Modal */}
            {previewTemplate && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                    onClick={() => setPreviewTemplate(null)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl"
                    >
                        {/* Modal Header */}
                        <div className="p-6 border-b border-white/10">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-black">{previewTemplate.name}</h3>
                                <button
                                    onClick={() => setPreviewTemplate(null)}
                                    className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                                >
                                    <XCircle size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto max-h-[70vh]">
                            {loadingPreview ? (
                                <div className="flex items-center justify-center h-64">
                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                </div>
                            ) : (
                                <div
                                    className="bg-white rounded-2xl p-8"
                                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                                />
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Toast Notification */}
            {showToast && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="fixed bottom-6 right-6 z-[110]"
                >
                    <div className={`glass-card rounded-2xl p-4 shadow-2xl flex items-center gap-3 ${toastType === 'success' ? 'border-emerald-500/20' : 'border-red-500/20'
                        }`}>
                        {toastType === 'success' ? (
                            <CheckCircle2 className="text-emerald-400" size={24} />
                        ) : (
                            <XCircle className="text-red-400" size={24} />
                        )}
                        <p className="font-medium">{toastMessage}</p>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
