"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Image from 'next/image';
import { API_BASE_URL } from '@/lib/api';

interface Tenant {
    id: number;
    name: string;
    logo_url?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    tenant: Tenant;
}

export default function CondolenceModal({ isOpen, onClose, tenant }: Props) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl p-8 sm:p-10 text-center overflow-hidden border border-transparent dark:border-slate-800"
                    >
                        {/* Decorative Background Blob */}
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-sky-50 dark:from-sky-950/20 to-transparent pointer-events-none" />

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors z-10"
                        >
                            <X size={20} />
                        </button>

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
                                Lamentamos tu pérdida
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                                En estos momentos difíciles, en <span className="font-extrabold text-slate-700 dark:text-slate-300">{tenant.name}</span> queremos acompañarte y brindarte todo nuestro apoyo. Estamos aquí para ayudarte a honrar la memoria de tu ser querido.
                            </p>
                        </div>

                        {/* Action Button */}
                        <div className="mt-8 relative z-10">
                            <button
                                onClick={onClose}
                                className="w-full bg-slate-900 dark:bg-slate-950 dark:border dark:border-slate-800/80 hover:dark:bg-slate-900 text-white dark:text-slate-300 font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                Continuar
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
