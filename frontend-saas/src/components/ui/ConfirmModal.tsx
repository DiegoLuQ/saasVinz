import React from 'react';
import { AlertTriangle, CheckCircle2, X, Info } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'success' | 'warning' | 'info';
    isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = "warning",
    isLoading = false
}) => {
    if (!isOpen) return null;

    const getVariantStyles = () => {
        switch (variant) {
            case 'danger':
                return {
                    icon: <AlertTriangle className="text-red-500" size={32} />,
                    button: 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                };
            case 'success':
                return {
                    icon: <CheckCircle2 className="text-emerald-500" size={32} />,
                    button: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                };
            case 'info':
                return {
                    icon: <Info className="text-blue-500" size={32} />,
                    button: 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'
                };
            default: // warning
                return {
                    icon: <AlertTriangle className="text-yellow-500" size={32} />,
                    button: 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/20 text-[#020617]'
                };
        }
    };

    const styles = getVariantStyles();

    return (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="glass-card w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/10 bg-[#0B1121]/90"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 text-center">
                    <div className="flex justify-center mb-6">
                        <div className={`p-4 rounded-full bg-white/5 border border-white/5 shadow-inner`}>
                            {styles.icon}
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                    <p className="text-indigo-200/70 text-sm leading-relaxed mb-8">
                        {message}
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors disabled:opacity-50"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:transform-none ${styles.button}`}
                        >
                            {isLoading ? 'Procesando...' : confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
