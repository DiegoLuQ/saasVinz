"use client";

import React, { useState } from 'react';
import { Clock, Calendar, Infinity as InfinityIcon, X, Check, Trash2 } from 'lucide-react';

export interface TrialRule {
    mode: 'days' | 'until';
    days?: number;
    until?: string;
}

interface TrialConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    planName: string;
    itemLabel: string;
    itemType: 'module' | 'feature';
    currentRule: TrialRule | null;
    inheritedRule?: TrialRule | null;
    onSave: (rule: TrialRule | null) => void;
}

const DAY_PRESETS = [7, 14, 30, 60, 90];

export function formatTrialBadge(rule: TrialRule | null | undefined): string | null {
    if (!rule || !rule.mode) return null;
    if (rule.mode === 'days' && rule.days) {
        return `${rule.days}d`;
    }
    if (rule.mode === 'until' && rule.until) {
        const parts = rule.until.slice(0, 10).split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}`;
        }
        return rule.until;
    }
    return null;
}

export function formatTrialTooltip(rule: TrialRule | null | undefined, inherited = false): string {
    if (!rule || !rule.mode) return 'Configurar tiempo de vida (acceso permanente)';
    const prefix = inherited ? 'Heredado del módulo: ' : 'Tiempo de vida: ';
    if (rule.mode === 'days' && rule.days) {
        return `${prefix}${rule.days} días de prueba desde el alta del crematorio`;
    }
    if (rule.mode === 'until' && rule.until) {
        return `${prefix}habilitado hasta el ${rule.until.slice(0, 10)}`;
    }
    return 'Configurar tiempo de vida';
}

export default function FeatureTrialModal({
    isOpen,
    onClose,
    planName,
    itemLabel,
    itemType,
    currentRule,
    inheritedRule,
    onSave,
}: TrialConfigModalProps) {
    const [mode, setMode] = useState<'permanent' | 'days' | 'until'>(
        currentRule?.mode === 'days' ? 'days' : currentRule?.mode === 'until' ? 'until' : 'permanent'
    );
    const [days, setDays] = useState<number>(currentRule?.days || 14);
    const [until, setUntil] = useState<string>(
        currentRule?.until?.slice(0, 10) || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    );

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (mode === 'permanent') {
            onSave(null);
        } else if (mode === 'days') {
            const validDays = Math.max(1, Math.min(3650, Number(days) || 14));
            onSave({ mode: 'days', days: validDays });
        } else if (mode === 'until' && until) {
            onSave({ mode: 'until', until });
        }
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#0a192f] border border-white/15 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/20">
                            <Clock size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-white">Tiempo de Vida / Vigencia</h3>
                            <p className="text-xs text-white/50">
                                Plan <span className="text-violet-300 font-bold">{planName}</span> ·{' '}
                                <span className="text-white/80 font-semibold">{itemLabel}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    {inheritedRule && !currentRule && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                            Actualmente hereda el tiempo de vida del módulo principal (
                            <b>{formatTrialTooltip(inheritedRule, false)}</b>). Si configuras uno aquí, tendrá su propia vigencia.
                        </div>
                    )}

                    <div className="space-y-2.5">
                        {/* Opción 1: Permanente */}
                        <button
                            type="button"
                            onClick={() => setMode('permanent')}
                            className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                                mode === 'permanent'
                                    ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                                    : 'bg-white/[0.02] border-white/10 text-white/60 hover:border-white/20'
                            }`}
                        >
                            <InfinityIcon
                                size={18}
                                className={`mt-0.5 shrink-0 ${mode === 'permanent' ? 'text-emerald-400' : 'text-white/40'}`}
                            />
                            <div className="flex-1">
                                <div className="text-sm font-bold">Acceso Permanente</div>
                                <p className="text-[11px] text-white/45 mt-0.5">
                                    Disponible sin límite de tiempo mientras el crematorio tenga activo el plan {planName}.
                                </p>
                            </div>
                        </button>

                        {/* Opción 2: Días de prueba */}
                        <div
                            onClick={() => setMode('days')}
                            className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                                mode === 'days'
                                    ? 'bg-violet-500/10 border-violet-500/40 text-white'
                                    : 'bg-white/[0.02] border-white/10 text-white/60 hover:border-white/20'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <Clock
                                    size={18}
                                    className={`mt-0.5 shrink-0 ${mode === 'days' ? 'text-violet-400' : 'text-white/40'}`}
                                />
                                <div className="flex-1">
                                    <div className="text-sm font-bold">Días de vida / Prueba (Trial)</div>
                                    <p className="text-[11px] text-white/45 mt-0.5">
                                        El {itemType === 'module' ? 'módulo' : 'permiso'} se activa durante un número de días desde que el crematorio contrata y luego se bloquea automáticamente.
                                    </p>
                                </div>
                            </div>

                            {mode === 'days' && (
                                <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {DAY_PRESETS.map((preset) => (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => setDays(preset)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                                    days === preset
                                                        ? 'bg-violet-500 text-white border-violet-400 shadow-sm'
                                                        : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                                                }`}
                                            >
                                                {preset} días
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-white/60">Duración personalizada:</span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={3650}
                                            value={days}
                                            onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-20 px-2.5 py-1 rounded-lg bg-black/30 border border-white/15 text-white text-sm font-bold outline-none focus:border-violet-400"
                                        />
                                        <span className="text-xs text-white/60">días</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Opción 3: Fecha límite fija */}
                        <div
                            onClick={() => setMode('until')}
                            className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                                mode === 'until'
                                    ? 'bg-sky-500/10 border-sky-500/40 text-white'
                                    : 'bg-white/[0.02] border-white/10 text-white/60 hover:border-white/20'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <Calendar
                                    size={18}
                                    className={`mt-0.5 shrink-0 ${mode === 'until' ? 'text-sky-400' : 'text-white/40'}`}
                                />
                                <div className="flex-1">
                                    <div className="text-sm font-bold">Fecha de expiración fija</div>
                                    <p className="text-[11px] text-white/45 mt-0.5">
                                        Habilitado como promoción o acceso temporal hasta una fecha calendario específica.
                                    </p>
                                </div>
                            </div>

                            {mode === 'until' && (
                                <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <span className="text-xs text-white/60">Válido hasta:</span>
                                    <input
                                        type="date"
                                        value={until}
                                        onChange={(e) => setUntil(e.target.value)}
                                        className="px-3 py-1.5 rounded-lg bg-black/30 border border-white/15 text-white text-xs font-bold outline-none focus:border-sky-400"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-white/[0.02] border-t border-white/10 flex items-center justify-between gap-2">
                    {currentRule ? (
                        <button
                            type="button"
                            onClick={() => {
                                onSave(null);
                                onClose();
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-all"
                        >
                            <Trash2 size={14} />
                            Quitar límite
                        </button>
                    ) : (
                        <div />
                    )}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/25 transition-all"
                        >
                            <Check size={14} />
                            Aplicar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

