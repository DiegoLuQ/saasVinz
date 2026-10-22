"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, X } from 'lucide-react';
import Image from 'next/image';
import { API_BASE_URL } from '@/lib/api';
import { type WelcomeModalConfig } from '@/lib/publicFormConfig';
import FormVideoPlayer from './FormVideoPlayer';

interface Tenant {
    id: number;
    name: string;
    logo_url?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    tenant: Tenant;
    config?: WelcomeModalConfig | null;
}

export default function CondolenceModal({ isOpen, onClose, tenant, config }: Props) {
    const [watching, setWatching] = useState(false);
    if (config?.enabled === false) {
        return null;
    }

    const title = config?.title?.trim() || 'Lamentamos tu pérdida';
    const buttonText = config?.button_text?.trim() || 'Continuar';
    const rawMessage = config?.message?.trim() || 'En estos momentos difíciles, en {empresa} queremos acompañarte y brindarte todo nuestro apoyo. Estamos aquí para ayudarte a honrar la memoria de tu ser querido.';

    const messageParts = rawMessage.split(/(\{empresa\}|\{tenant\})/gi);
    // Video opcional: solo si el crematorio activó el botón (el backend lo quita fuera de PRO/ULTRA).
    // Con video_position 'end' el botón va en la pantalla final, no aquí.
    const video = config?.show_video_button && config.video && config.video_position !== 'end' ? config.video : null;
    const videoButtonText = config?.video_button_text?.trim() || 'Ver video';
    const close = () => { setWatching(false); onClose(); };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={close}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={`relative w-full ${watching ? 'max-w-2xl' : 'max-w-md'} bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl p-8 sm:p-10 text-center overflow-hidden border border-transparent dark:border-slate-800`}
                    >
                        {/* Decorative Background Blob */}
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-sky-50 dark:from-sky-950/20 to-transparent pointer-events-none" />

                        {/* Close Button */}
                        <button
                            onClick={close}
                            aria-label="Cerrar"
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors z-10 cursor-pointer"
                        >
                            <X size={20} />
                        </button>

                        {watching && video ? (
                            <div className="relative z-10 space-y-5 pt-6">
                                <FormVideoPlayer video={video} />
                                <div className="flex items-center justify-between gap-3">
                                    <button
                                        onClick={() => setWatching(false)}
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                                    >
                                        <ArrowLeft size={14} /> Volver al mensaje
                                    </button>
                                    <button
                                        onClick={close}
                                        className="bg-slate-900 dark:bg-slate-950 dark:border dark:border-slate-800/80 text-white dark:text-slate-300 font-black text-[10px] uppercase tracking-[0.2em] px-6 py-3.5 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                                    >
                                        {buttonText}
                                    </button>
                                </div>
                            </div>
                        ) : (<>
                        {/* Logo */}
                        <div className="relative mb-6 mx-auto w-24 h-24 rounded-full overflow-hidden bg-white dark:bg-slate-950 shadow-lg dark:shadow-none flex items-center justify-center z-10">
                            {tenant.logo_url ? (
                                <Image
                                    src={tenant.logo_url.startsWith('/') ? `${API_BASE_URL}${tenant.logo_url}` : tenant.logo_url}
                                    alt={tenant.name}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            ) : (
                                <span className="text-3xl font-black text-sky-500 italic">
                                    {tenant.name.charAt(0)}
                                </span>
                            )}
                        </div>

                        {/* Content */}
                        <div className="relative z-10 space-y-4">
                            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase italic tracking-tight">
                                {title}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-line">
                                {messageParts.map((part, idx) => {
                                    if (/^\{empresa\}$/i.test(part) || /^\{tenant\}$/i.test(part)) {
                                        return (
                                            <span key={idx} className="font-extrabold text-slate-700 dark:text-slate-300">
                                                {tenant.name}
                                            </span>
                                        );
                                    }
                                    return <React.Fragment key={idx}>{part}</React.Fragment>;
                                })}
                            </p>
                        </div>

                        {/* Action Button */}
                        <div className="mt-8 relative z-10">
                            {video && (
                                <button
                                    onClick={() => setWatching(true)}
                                    className="mb-3 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                    <Play size={14} className="fill-current" /> {videoButtonText}
                                </button>
                            )}
                            <button
                                onClick={close}
                                className="w-full bg-slate-900 dark:bg-slate-950 dark:border dark:border-slate-800/80 hover:dark:bg-slate-900 text-white dark:text-slate-300 font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                            >
                                {buttonText}
                            </button>
                        </div>
                        </>)}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
