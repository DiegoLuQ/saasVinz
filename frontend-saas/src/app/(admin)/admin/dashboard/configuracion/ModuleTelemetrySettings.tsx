'use client';

import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle2, Loader2, Save, ShieldCheck, Zap } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';

export default function ModuleTelemetrySettings() {
    const [enabled, setEnabled] = useState<boolean>(false);
    const [initial, setInitial] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    useEffect(() => {
        let active = true;
        apiRequest('/api/internal/creator/config')
            .then((data) => {
                if (!active) return;
                const isEnabled = Boolean(data?.module_tracking_enabled);
                setEnabled(isEnabled);
                setInitial(isEnabled);
            })
            .catch(() => {
                if (active) setFeedback({ type: 'err', text: 'No se pudo cargar la configuración actual.' });
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setFeedback(null);
        try {
            await apiRequest('/api/internal/creator/config', {
                method: 'PUT',
                body: JSON.stringify({ module_tracking_enabled: enabled }),
            });
            setInitial(enabled);
            setFeedback({
                type: 'ok',
                text: enabled
                    ? 'Telemetría de módulos activada exitosamente.'
                    : 'Telemetría de módulos pausada (sin registro de clics).'
            });
        } catch (err: any) {
            setFeedback({ type: 'err', text: err?.message || 'Error al guardar la configuración de telemetría.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-3 text-white/60 text-sm">
                <Loader2 size={18} className="animate-spin" /> Cargando configuración de telemetría...
            </div>
        );
    }

    const dirty = enabled !== initial;

    return (
        <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                            <Activity className="text-primary" size={20} /> Telemetría de Módulos (Sidebar)
                        </h3>
                        <p className="text-white/60 text-xs mt-1">
                            Mide qué módulos son los más clickeados por los crematorios para enfocar mejoras y detectar módulos en desuso.
                        </p>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving || !dirty}
                        className="bg-primary hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20 active:scale-95"
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>

                {feedback && (
                    <div
                        className={`mb-4 px-4 py-3 rounded-xl text-xs flex items-center gap-2 ${
                            feedback.type === 'ok'
                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                                : 'bg-red-500/10 border border-red-500/30 text-red-300'
                        }`}
                    >
                        {feedback.type === 'ok' && <CheckCircle2 size={14} className="shrink-0" />}
                        <span>{feedback.text}</span>
                    </div>
                )}

                {/* Switch de control */}
                <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">Estado de la telemetría:</span>
                            <span
                                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    enabled
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-white/10 text-white/50 border border-white/10'
                                }`}
                            >
                                {enabled ? 'Activa' : 'Pausada / Desactivada'}
                            </span>
                        </div>
                        <p className="text-white/50 text-xs">
                            {enabled
                                ? 'Los clics se están acumulando silenciosamente en lotes diarios y anónimos.'
                                : 'Completamente apagada. Los crematorios no envían ningún paquete de telemetría a la red.'}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setEnabled(!enabled)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            enabled ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                        role="switch"
                        aria-checked={enabled}
                    >
                        <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                    </button>
                </div>

                {/* Garantías técnicas de privacidad y rendimiento */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs text-white/70">
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-start gap-2.5">
                        <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                            <strong className="text-white block font-semibold mb-0.5">100% Anónima & Agregada</strong>
                            <span>No se guardan direcciones IP, usuarios ni datos personales. Solo 1 fila por día y módulo.</span>
                        </div>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-start gap-2.5">
                        <Zap size={18} className="text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <strong className="text-white block font-semibold mb-0.5">Cero Impacto en Velocidad</strong>
                            <span>Envío desacoplado con buffer en memoria. La navegación en el menú sigue siendo instantánea.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
