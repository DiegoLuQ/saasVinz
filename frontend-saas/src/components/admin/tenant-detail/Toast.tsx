import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import type { ToastMessage } from './types';

interface ToastProps {
    message: ToastMessage | null;
}

export default function Toast({ message }: ToastProps) {
    if (!message) return null;

    return (
        <div className={`fixed bottom-8 right-8 z-[200] px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 animate-slide-up ${
            message.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
            {message.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
            <span className="font-bold tracking-tight">{message.text}</span>
        </div>
    );
}
