"use client";

import React, { useEffect, useState } from 'react';
import {
    Plus,
    FileText,
    Trash2,
    Loader2,
    Image as ImageIcon,
    Settings2,
    AlertCircle,
    CheckCircle,
    X
} from 'lucide-react';
import { apiRequest, getImageUrl } from '@/lib/admin/api';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface Template {
    id: number;
    name: string;
    category: string;
    paper_format: string;
    theme: string;
    declaration_text: string | null;
    is_default: boolean;
    created_at: string;
    background_logo_url?: string | null;
    sections_config?: any;
}

export default function DocumentTemplatesPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const data = await apiRequest('/api/internal/creator/document-templates/templates');
            setTemplates(data || []);
        } catch (err) {
            showToast('Error al cargar plantillas', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [showTypeModal, setShowTypeModal] = useState(false);

    const filteredTemplates = templates.filter(t => {
        if (activeFilter === 'all') return true;
        return t.category === activeFilter;
    });

    const editorRouteFor = (category: string) =>
        category === 'certificadoImg' ? '/dashboard/disenos/editor-imagen' : '/dashboard/disenos/editor';

    const handleDeleteTemplate = async (template: Template) => {
        if (!confirm(`¿Estás seguro de eliminar la plantilla "${template.name}"?`)) return;

        try {
            await apiRequest(`/api/internal/creator/document-templates/templates/${template.id}`, {
                method: 'DELETE'
            });
            showToast('Plantilla eliminada correctamente', 'success');
            fetchTemplates();
        } catch (err: any) {
            showToast('Error al eliminar: ' + err.message, 'error');
        }
    };

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Toast Notification */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`fixed top-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${message.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}
                    >
                        {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        <span className="font-bold text-sm">{message.text}</span>
                        <button onClick={() => setMessage(null)} className="ml-2 hover:opacity-70 transition-opacity">
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight">Diseños de Documentos</h1>
                    <p className="text-white/40 mt-2 font-medium">Configura las plantillas globales para certificados y recibos del sistema.</p>
                </div>
                <button
                    onClick={() => setShowTypeModal(true)}
                    className="bg-primary hover:bg-primary/90 text-white font-black py-4 px-8 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 active:scale-95 transition-all text-sm uppercase tracking-wider"
                >
                    <Plus className="mr-2" size={20} />
                    Nueva Plantilla
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {[
                    { id: 'all', label: 'Todos' },
                    { id: 'para mascotas', label: 'Certificados' },
                    { id: 'certificadoImg', label: 'Cert. Imagen' },
                    { id: 'recibo_suscripcion', label: 'Recibos SaaS' }
                ].map((filter) => (
                    <button
                        key={filter.id}
                        onClick={() => setActiveFilter(filter.id as any)}
                        className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border ${activeFilter === filter.id
                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                            : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Content List */}
            <div className="bg-[#0a192f] border border-white/5 rounded-[2.5rem] p-8 min-h-[400px]">
                {loading ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-4 text-white/20">
                        <Loader2 className="animate-spin text-primary" size={48} />
                        <span className="font-bold uppercase tracking-widest text-xs">Cargando Diseños...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredTemplates.map((template) => (
                            <div key={template.id} className="group relative p-8 bg-white/[0.02] rounded-[2.5rem] border border-white/5 hover:border-primary/30 transition-all flex flex-col justify-between h-full hover:shadow-2xl hover:shadow-primary/5">
                                <div>
                                    <div className="flex items-start justify-between">
                                        {template.category === 'certificadoImg' && template.background_logo_url ? (
                                            <div className="w-24 h-16 rounded-2xl overflow-hidden border border-white/10 bg-black/40 shrink-0">
                                                <img src={getImageUrl(template.background_logo_url)} alt={template.name} className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className={`p-4 rounded-2xl ${template.is_default ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/40'}`}>
                                                {template.category === 'certificadoImg' ? <ImageIcon size={28} /> : <FileText size={28} />}
                                            </div>
                                        )}
                                        {template.is_default && (
                                            <span className="text-[10px] bg-primary/20 text-primary px-3 py-1.5 rounded-full font-black uppercase tracking-[0.2em]">Default</span>
                                        )}
                                    </div>
                                    <div className="mt-6">
                                        <h4 className="font-black text-xl text-white tracking-tight">{template.name}</h4>
                                        <div className="flex gap-2 mt-3 flex-wrap">
                                            <span className="text-[9px] bg-white/5 text-white/40 px-2 py-1 rounded-lg font-black uppercase tracking-wider border border-white/5">{template.paper_format}</span>
                                            <span className="text-[9px] bg-white/5 text-white/40 px-2 py-1 rounded-lg font-black uppercase tracking-wider border border-white/5">{template.theme}</span>
                                            <span className={`text-[9px] px-2 py-1 rounded-lg font-black uppercase tracking-wider border ${template.category === 'recibo_suscripcion'
                                                ? 'bg-orange-500/10 text-orange-400 border-orange-500/10'
                                                : template.category === 'certificadoImg'
                                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/10'
                                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/10'
                                                }`}>
                                                {template.category === 'recibo_suscripcion' ? 'Recibo SaaS' : template.category === 'certificadoImg' ? 'Cert. Imagen' : 'Certificado'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-white/30 mt-6 line-clamp-3 italic leading-relaxed">
                                            {template.declaration_text ? `"${template.declaration_text.substring(0, 100)}..."` : "Sin texto descriptivo"}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-10 flex flex-col gap-3">
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => router.push(`${editorRouteFor(template.category)}?id=${template.id}`)}
                                            className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-2xl transition-all flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider border border-white/5"
                                        >
                                            <Settings2 size={16} />
                                            Configurar
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTemplate(template)}
                                            className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all border border-red-500/10"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>

                                </div>
                            </div>
                        ))}
                        {filteredTemplates.length === 0 && (
                            <div className="col-span-full h-80 flex flex-col items-center justify-center text-center p-12 bg-white/[0.03] rounded-[3rem] border-2 border-dashed border-white/5">
                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                                    <ImageIcon size={40} className="text-white/10" />
                                </div>
                                <h3 className="text-xl font-black text-white mb-2">No se encontraron plantillas</h3>
                                <p className="text-white/30 font-medium max-w-sm">No hay diseños configurados para esta categoría aún.</p>
                                <button
                                    onClick={() => setShowTypeModal(true)}
                                    className="text-primary hover:text-primary/70 text-xs font-black uppercase tracking-widest mt-6 transition-colors"
                                >
                                    + Crear primera plantilla
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Type Chooser Modal */}
            <AnimatePresence>
                {showTypeModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    >
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowTypeModal(false)} />
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-[#0a192f] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-white tracking-tight">Elige el tipo de diseño</h3>
                                    <p className="text-white/40 text-sm font-medium mt-1">Selecciona cómo quieres construir tu plantilla.</p>
                                </div>
                                <button onClick={() => setShowTypeModal(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <button
                                    onClick={() => router.push('/dashboard/disenos/editor')}
                                    className="group p-8 bg-white/[0.02] hover:bg-white/[0.05] rounded-[2rem] border border-white/5 hover:border-primary/30 transition-all text-left"
                                >
                                    <div className="p-4 bg-blue-500/10 text-blue-400 rounded-2xl w-fit mb-5"><FileText size={28} /></div>
                                    <h4 className="font-black text-lg text-white">Certificado / Recibo (HTML)</h4>
                                    <p className="text-sm text-white/30 mt-2 leading-relaxed">Diseño maquetado por secciones: título, datos, declaración, firma. Para certificados de mascota y recibos SaaS.</p>
                                </button>
                                <button
                                    onClick={() => router.push('/dashboard/disenos/editor-imagen')}
                                    className="group p-8 bg-white/[0.02] hover:bg-white/[0.05] rounded-[2rem] border border-white/5 hover:border-primary/30 transition-all text-left"
                                >
                                    <div className="p-4 bg-purple-500/10 text-purple-400 rounded-2xl w-fit mb-5"><ImageIcon size={28} /></div>
                                    <h4 className="font-black text-lg text-white">Certificado con Imagen</h4>
                                    <p className="text-sm text-white/30 mt-2 leading-relaxed">Sube una imagen de fondo (16:9, 4:3 o 3:4) y arrastra los campos dinámicos encima: nombre, fechas y fotos de la mascota.</p>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
