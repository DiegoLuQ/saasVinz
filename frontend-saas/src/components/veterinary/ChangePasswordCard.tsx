"use client";

import React, { useState } from 'react';
import { KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/veterinary/api';

const MIN_LENGTH = 8;
const inputCls =
    'w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all';

/** Cambio de contraseña desde el perfil (requiere la contraseña actual). */
export default function ChangePasswordCard() {
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg(null);
        if (next.length < MIN_LENGTH) return setMsg({ ok: false, text: `La nueva contraseña debe tener al menos ${MIN_LENGTH} caracteres.` });
        if (next !== confirm) return setMsg({ ok: false, text: 'Las contraseñas nuevas no coinciden.' });
        setSaving(true);
        try {
            await apiRequest('/api/veterinary/profile/password', {
                method: 'POST',
                body: { current_password: current, new_password: next },
            });
            setCurrent('');
            setNext('');
            setConfirm('');
            setMsg({ ok: true, text: 'Contraseña actualizada.' });
        } catch (err: unknown) {
            setMsg({ ok: false, text: err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.' });
        } finally {
            setSaving(false);
        }
    };

    const fields = [
        { id: 'current-password', label: 'Contraseña actual', value: current, set: setCurrent, auto: 'current-password' },
        { id: 'new-password', label: 'Nueva contraseña', value: next, set: setNext, auto: 'new-password' },
        { id: 'confirm-password', label: 'Repite la nueva', value: confirm, set: setConfirm, auto: 'new-password' },
    ];

    return (
        <form onSubmit={handleSubmit} className="bg-[#0B1121] rounded-[2rem] border border-white/5 p-8 space-y-6">
            <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <KeyRound size={18} />
                </span>
                <div>
                    <h2 className="text-white font-bold">Cambiar contraseña</h2>
                    <p className="text-xs text-indigo-200/40">Mínimo {MIN_LENGTH} caracteres.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {fields.map((f) => (
                    <div key={f.id} className="space-y-2">
                        <label htmlFor={f.id} className="text-[10px] uppercase font-bold text-indigo-200/40 ml-1">{f.label}</label>
                        <input
                            id={f.id}
                            type="password"
                            value={f.value}
                            onChange={(e) => f.set(e.target.value)}
                            required
                            autoComplete={f.auto}
                            className={inputCls}
                        />
                    </div>
                ))}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-white/5">
                <div aria-live="polite" className="min-h-[1.25rem]">
                    {msg && (
                        <p className={`text-xs flex items-center gap-1.5 ${msg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {msg.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {msg.text}
                        </p>
                    )}
                </div>
                <button
                    type="submit"
                    disabled={saving}
                    className="bg-emerald-500 hover:bg-emerald-400 text-[#020617] px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                >
                    {saving ? 'Guardando...' : 'Actualizar contraseña'}
                </button>
            </div>
        </form>
    );
}
