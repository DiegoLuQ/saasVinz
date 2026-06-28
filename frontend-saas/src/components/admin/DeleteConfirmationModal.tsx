"use client";

import React from 'react';
import Modal from './Modal';
import { Trash2 } from 'lucide-react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    isDeleting?: boolean;
}

export default function DeleteConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    isDeleting = false
}: DeleteConfirmationModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            maxWidth="max-w-md"
        >
            <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
                    <Trash2 size={32} className="text-red-500" />
                </div>

                <h4 className="text-xl font-bold text-white">¿Estás seguro?</h4>
                <p className="text-white/40">
                    {description}
                </p>

                <div className="w-full flex justify-end gap-3 pt-6 border-t border-white/5 mt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-3 rounded-xl hover:bg-white/5 text-white font-medium transition-all disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all shadow-lg hover:shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isDeleting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                Eliminando...
                            </>
                        ) : (
                            <>
                                <Trash2 size={18} />
                                Eliminar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
