"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
    Plus,
    FileText,
    Trash2,
    Loader2,
    Image as ImageIcon,
    Settings2,
    Sparkles,
    Globe,
    CheckCircle2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTemplates, useSetDefaultTemplate, useDeleteTemplate, UnifiedDoc, Template, FarewellTemplate } from '@/hooks/useTemplates';

export default function DocumentConfigPage() {
    const router = useRouter();

    // Route guard: redirect non-SuperAdmin users away from this page
    useEffect(() => {
        router.replace('/dashboard');
    }, [router]);
    
    // React Query Hooks
    const { data, isLoading } = useTemplates();
    const setDefaultMutation = useSetDefaultTemplate();
    const deleteMutation = useDeleteTemplate();

    // Data parsing
    const { localTemplates = [], globalTemplates = [], farewellTemplates = [], tenantData = null } = data || {};

    // State
    const [activeFilter, setActiveFilter] = useState<'all' | 'global' | 'document' | 'farewell' | 'convenio' | 'descuento'>('all');

    // Memos
    const combinedItems = useMemo<UnifiedDoc[]>(() => {
        const items: UnifiedDoc[] = [
            ...localTemplates.map(t => ({ ...t, type: 'document' as const, isGlobal: false })),
            ...globalTemplates.map(t => ({ ...t, type: 'document' as const, isGlobal: true })),
            ...farewellTemplates.map(t => ({ ...t, type: 'farewell' as const, isGlobal: false }))
        ];

        return items.filter(item => {
            if (activeFilter === 'all') return !item.isGlobal;
            if (activeFilter === 'global') return item.isGlobal;
            if (activeFilter === 'farewell') return item.type === 'farewell';
            if (activeFilter === 'document') return item.type === 'document' && !item.isGlobal && (item as Template).category !== 'convenio' && (item as Template).category !== 'descuento';
            if (activeFilter === 'convenio') return item.type === 'document' && !item.isGlobal && (item as Template).category === 'convenio';
            if (activeFilter === 'descuento') return item.type === 'document' && !item.isGlobal && (item as Template).category === 'descuento';
            return true;
        });
    }, [localTemplates, globalTemplates, farewellTemplates, activeFilter]);

    // Handlers
    const openCreateModal = () => router.push('/dashboard/documentos/certificados/editor');
    
    const handleConfigure = (item: UnifiedDoc) => {
        if (item.type === 'document') {
            router.push(`/dashboard/documentos/certificados/editor?id=${item.id}`);
        } else {
            router.push(`/dashboard/documentos/disenos?id=${item.id}`);
        }
    };

    const handleDeleteItem = async (item: UnifiedDoc) => {
        if (!confirm(`¿Estás seguro de eliminar "${item.name}"?`)) return;
        deleteMutation.mutate({ id: item.id, type: item.type });
    };

    const handleSetDefault = (templateId: number) => {
        setDefaultMutation.mutate(templateId);
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Estudio de Documentos</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Gestiona certificados, diseños conmemorativos y plantillas globales.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.push('/dashboard/documentos/disenos/biblioteca')}
                        className="bg-amber-500/10 text-amber-500 font-bold py-3 px-6 rounded-2xl flex items-center justify-center border border-amber-500/30 hover:bg-amber-500/20 active:scale-95 transition-all text-sm"
                    >
                        <Globe className="mr-2" size={18} />
                        Descubrir Premium
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="bg-primary text-primary-foreground font-bold py-3 px-6 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all text-sm"
                    >
                        <Plus className="mr-2" size={18} />
                        Nueva Plantilla
                    </button>
                </div>
            </div>

            {/* Segmented Control Filters */}
            <div className="bg-black/40 p-1.5 rounded-2xl border border-white/5 inline-flex flex-wrap gap-1 w-full md:w-auto">
                {[
                    { id: 'all', label: 'Mis Plantillas' },
                    { id: 'global', label: 'Globales' },
                    { id: 'document', label: 'Certificados' },
                    { id: 'farewell', label: 'Diseños' },
                    { id: 'convenio', label: 'Convenios' },
                    { id: 'descuento', label: 'Descuentos' }
                ].map((filter) => (
                    <button
                        key={filter.id}
                        onClick={() => setActiveFilter(filter.id as any)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-1 md:flex-none text-center ${
                            activeFilter === filter.id
                                ? 'bg-white/10 text-white shadow-lg shadow-black/20 ring-1 ring-white/10'
                                : 'text-muted-foreground hover:bg-white/[0.04] hover:text-white/80'
                        }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Content List */}
            <div className="bg-zinc-950/40 border border-white/5 rounded-[2.5rem] p-6 lg:p-8 relative overflow-hidden">
                {/* Ambient glow based on active filter */}
                <div className={`absolute -top-40 -right-40 w-96 h-96 blur-[120px] rounded-full pointer-events-none transition-colors duration-700 ${
                    activeFilter === 'global' ? 'bg-amber-500/10' : 
                    activeFilter === 'farewell' ? 'bg-purple-500/10' : 
                    'bg-primary/10'
                }`} />

                {isLoading ? (
                    <div className="h-64 flex flex-col items-center justify-center relative z-10">
                        <Loader2 className="animate-spin text-primary mb-4" size={32} />
                        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Cargando Estudio...</p>
                    </div>
                ) : (
                    <div className="relative z-10">
                        <AnimatePresence mode="popLayout">
                            {combinedItems.length > 0 ? (
                                <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {combinedItems.map((item) => {
                                        const isCurrentDefault = item.type === 'document' && 
                                            (tenantData?.default_certificate_template_id === item.id || 
                                            (!tenantData?.default_certificate_template_id && (item as Template).is_default));
                                        
                                        // Visual Themes
                                        let cardTheme = "border-white/5 bg-white/[0.02] hover:border-primary/30";
                                        let iconTheme = "bg-white/5 text-muted-foreground";
                                        let tagBadge = null;

                                        if (isCurrentDefault) {
                                            cardTheme = "border-primary/40 bg-primary/5 ring-1 ring-primary/20 shadow-xl shadow-primary/5";
                                            iconTheme = "bg-primary text-white";
                                            tagBadge = <span className="text-[9px] bg-primary text-white px-2.5 py-1 rounded-md font-black uppercase tracking-widest flex items-center gap-1 shadow-sm"><CheckCircle2 size={10}/> Default</span>;
                                        } else if (item.isGlobal) {
                                            cardTheme = "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40";
                                            iconTheme = "bg-amber-500/20 text-amber-500";
                                            tagBadge = <span className="text-[9px] bg-amber-500/20 text-amber-500 px-2.5 py-1 rounded-md font-black uppercase tracking-widest flex items-center gap-1"><Globe size={10}/> Global</span>;
                                        } else if (item.type === 'farewell') {
                                            cardTheme = "border-purple-500/20 bg-purple-500/5 hover:border-purple-500/40";
                                            iconTheme = "bg-purple-500/20 text-purple-400";
                                            tagBadge = <span className="text-[9px] bg-purple-500/20 text-purple-400 px-2.5 py-1 rounded-md font-black uppercase tracking-widest flex items-center gap-1"><Sparkles size={10}/> Diseño</span>;
                                        }

                                        return (
                                            <motion.div 
                                                layout
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                key={`${item.type}-${item.id}`} 
                                                className={`group relative p-6 rounded-[2rem] border transition-all flex flex-col justify-between h-full overflow-hidden ${cardTheme}`}
                                            >
                                                {/* Top edge highlight */}
                                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                                <div>
                                                    <div className="flex items-start justify-between">
                                                        <div className={`p-3.5 rounded-2xl ${iconTheme} shadow-inner`}>
                                                            {item.type === 'document' ? <FileText size={22} /> : <div className="i-lucide-palette text-2xl" />}
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1.5">
                                                            {tagBadge}
                                                        </div>
                                                    </div>
                                                    <div className="mt-5">
                                                        <h4 className="font-bold text-xl text-white tracking-tight">{item.name}</h4>
                                                        <div className="flex gap-1.5 mt-3 flex-wrap">
                                                            {item.type === 'document' && (
                                                                <>
                                                                    <span className="text-[9px] bg-black/40 text-muted-foreground/80 px-2 py-1 rounded-md font-black uppercase tracking-wider">{(item as Template).paper_format}</span>
                                                                    <span className="text-[9px] bg-black/40 text-muted-foreground/80 px-2 py-1 rounded-md font-black uppercase tracking-wider">{(item as Template).theme}</span>
                                                                    <span className="text-[9px] bg-black/40 text-muted-foreground/80 px-2 py-1 rounded-md font-black uppercase tracking-wider">{(item as Template).category}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-4 line-clamp-3 leading-relaxed">
                                                            {item.type === 'document'
                                                                ? `"${(item as Template).declaration_text?.substring(0, 100)}..."`
                                                                : (item as FarewellTemplate).description || "Sin descripción"
                                                            }
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-8 flex flex-col gap-2">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => router.push(`/dashboard/documentos/certificados/vista-previa?id=${item.id}&type=${item.type}`)}
                                                            className="flex-[1.5] bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider border border-white/5"
                                                        >
                                                            <ImageIcon size={14} />
                                                            Vista Previa
                                                        </button>
                                                        <button
                                                            onClick={() => handleConfigure(item)}
                                                            className={`flex-1 ${item.isGlobal ? 'opacity-50 cursor-not-allowed bg-black/20 text-muted-foreground/50' : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20'} py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider`}
                                                            disabled={!!item.isGlobal}
                                                        >
                                                            <Settings2 size={14} />
                                                            Editar
                                                        </button>
                                                        {!item.isGlobal && (
                                                            <button
                                                                onClick={() => handleDeleteItem(item)}
                                                                disabled={deleteMutation.isPending}
                                                                className="px-3 py-2.5 bg-red-500/5 hover:bg-red-500 hover:text-white text-red-500/60 rounded-xl transition-all border border-red-500/10 hover:border-red-500"
                                                                title="Eliminar plantilla"
                                                            >
                                                                {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                            </button>
                                                        )}
                                                    </div>

                                                    {item.type === 'document' && !isCurrentDefault && (
                                                        <button
                                                            onClick={() => handleSetDefault(item.id)}
                                                            disabled={setDefaultMutation.isPending}
                                                            className="w-full mt-1 bg-gradient-to-r from-amber-500/10 to-amber-500/5 hover:from-amber-500/20 hover:to-amber-500/10 text-amber-500 py-2.5 rounded-xl border border-amber-500/20 hover:border-amber-500/40 transition-all text-[10px] uppercase font-black tracking-widest flex items-center justify-center gap-2"
                                                        >
                                                            {setDefaultMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                            Fijar como Predeterminado
                                                        </button>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="col-span-full h-48 flex flex-col items-center justify-center text-center p-10 bg-white/[0.02] rounded-[2rem] border-dashed border-white/10"
                                >
                                    <Settings2 size={40} className="text-muted-foreground/20 mb-3" />
                                    <p className="text-muted-foreground font-medium text-sm">No se encontraron plantillas para este filtro.</p>
                                    <button onClick={openCreateModal} className="text-primary hover:text-primary/80 transition-colors text-xs font-bold uppercase tracking-widest mt-4">Crear nueva plantilla</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
