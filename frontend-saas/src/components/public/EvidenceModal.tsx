"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Heart } from 'lucide-react';

interface EvidenceModalProps {
    evidence: {
        photo_url?: string;
        comments?: string[] | string;
    } | null;
    onClose: () => void;
    petName: string;
    apiUrl: string;
}

export default function EvidenceModal({ evidence, onClose, petName, apiUrl }: EvidenceModalProps) {
    if (!evidence) return null;

    const getImageUrl = (path?: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${apiUrl}${cleanPath}`;
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-[#020617]/90 backdrop-blur-xl"
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    className="w-full sm:max-w-lg bg-[#0f172a] rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden border-t sm:border border-white/10 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] relative"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header with Close */}
                    <div className="absolute top-6 right-6 z-20">
                        <button
                            onClick={onClose}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-all border border-white/5 shadow-xl hover:scale-110 active:scale-95"
                            aria-label="Cerrar"
                        >
                            <X size={20} strokeWidth={3} />
                        </button>
                    </div>

                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        {/* Photo Area */}
                        {evidence.photo_url && (
                            <div className="relative aspect-square w-full bg-black/20 overflow-hidden">
                                <img
                                    src={getImageUrl(evidence.photo_url)}
                                    alt={`Registro de ${petName}`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent pointer-events-none" />
                            </div>
                        )}

                        <div className="p-8 sm:p-12">
                            {/* Title Section */}
                            <div className="flex items-center gap-5 mb-10">
                                <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 shadow-lg border border-emerald-500/20 shrink-0">
                                    <Camera size={28} strokeWidth={2} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-black text-2xl text-white leading-tight truncate italic uppercase tracking-tight">Paso a Paso al Cielo</h3>
                                    <p className="text-indigo-200/40 text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] mt-1 flex items-center gap-1.5">
                                        <Heart size={10} className="fill-emerald-500 text-emerald-500" />
                                        {petName}
                                    </p>
                                </div>
                            </div>

                            {/* Comments Section */}
                            <div className="space-y-4">
                                {Array.isArray(evidence.comments) && evidence.comments.length > 0 ? (
                                    <div className="grid gap-3">
                                        {evidence.comments.filter(c => c && c.trim()).map((c: string, i: number) => (
                                            <div key={i} className="bg-white/[0.03] p-5 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                                                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500/20" />
                                                <p className="text-indigo-100 text-sm sm:text-base leading-relaxed font-medium italic">
                                                    "{c}"
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5 text-center">
                                        <p className="text-indigo-200/30 text-xs sm:text-sm leading-relaxed font-medium italic">
                                            {typeof evidence.comments === 'string' && evidence.comments
                                                ? `"${evidence.comments}"`
                                                : "Hemos capturado este momento para brindarle tranquilidad en este proceso tan especial."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer / Caption */}
                    <div className="p-6 border-t border-white/5 bg-white/[0.01] text-center">
                        <p className="text-[10px] font-black text-indigo-200/20 uppercase tracking-[0.4em] italic drop-shadow-sm">
                            Vincer | Honrando la memoria de {petName}
                        </p>
                    </div>

                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
