import React, { useEffect, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface RejectTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => Promise<void> | void;
}

export default function RejectTransactionModal({
    isOpen,
    onClose,
    onConfirm
}: RejectTransactionModalProps) {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setReason('');
            setLoading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm(reason);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#1a1f2e] border border-red-500/20 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-red-500/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                            <AlertTriangle size={20} />
                        </div>
                        <h3 className="text-lg font-bold">Rechazar Solicitud</h3>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-white/70">
                        ¿Estás seguro de que quieres rechazar esta solicitud? El tenant será notificado (si corresponde).
                    </p>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-white/40">
                            Motivo del rechazo (opcional):
                        </label>
                        <textarea
                            autoFocus
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Escribe el motivo aquí..."
                            disabled={loading}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-red-500/50 min-h-[80px] disabled:opacity-50"
                        />
                    </div>
                </div>

                <div className="p-4 bg-black/20 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-500/20 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Rechazando...' : 'Rechazar Solicitud'}
                    </button>
                </div>
            </div>
        </div>
    );
}
