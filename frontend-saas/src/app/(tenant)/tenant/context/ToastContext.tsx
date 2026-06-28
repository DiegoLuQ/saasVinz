"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    cta?: {
        label: string;
        onClick: () => void;
    };
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, cta?: { label: string, onClick: () => void }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info', cta?: { label: string, onClick: () => void }) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type, cta }]);
        // Solo auto-borrar si no tiene CTA (para que el usuario tenga tiempo de clickear)
        if (!cta) {
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, 4000);
        }
    }, []);

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: 50, scale: 0.8 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                            className={`pointer-events-auto flex items-center p-4 min-w-[300px] glass-card rounded-2xl shadow-xl border-l-4 ${toast.type === 'success' ? 'border-emerald-500' :
                                toast.type === 'error' ? 'border-red-500' : 'border-blue-500'
                                }`}
                        >
                            <div className={`mr-3 ${toast.type === 'success' ? 'text-emerald-500' :
                                toast.type === 'error' ? 'text-red-500' : 'text-blue-500'
                                }`}>
                                {toast.type === 'success' && <CheckCircle2 size={20} />}
                                {toast.type === 'error' && <AlertCircle size={20} />}
                                {toast.type === 'info' && <Info size={20} />}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold">{toast.message}</p>
                                {toast.cta && (
                                    <button
                                        onClick={() => {
                                            toast.cta?.onClick();
                                            removeToast(toast.id);
                                        }}
                                        className="mt-2 text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all"
                                    >
                                        {toast.cta.label}
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="ml-4 text-muted-foreground hover:text-foreground p-1 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
}
