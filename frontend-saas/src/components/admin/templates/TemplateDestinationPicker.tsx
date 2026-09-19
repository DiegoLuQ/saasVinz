"use client";

import React from 'react';
import { Globe, Lock, Star } from 'lucide-react';
import { useAdminTenants } from '@/hooks/useAdminBootstrap';

export interface TemplateDestination {
    scope: 'global' | 'exclusive';
    target_tenant_id: number | null;
    set_as_tenant_default: boolean;
}

export const DEFAULT_DESTINATION: TemplateDestination = { scope: 'global', target_tenant_id: null, set_as_tenant_default: false };

/** Destino a partir de la plantilla guardada (globales vienen con tenant_id = 0). */
export function destinationFromTemplate(t: { tenant_id?: number | null; is_locked?: boolean; is_tenant_default?: boolean }): TemplateDestination {
    const exclusive = !!t.is_locked && !!t.tenant_id;
    return {
        scope: exclusive ? 'exclusive' : 'global',
        target_tenant_id: exclusive ? (t.tenant_id as number) : null,
        set_as_tenant_default: !!t.is_tenant_default,
    };
}

/**
 * Global (todos los crematorios) o exclusiva para un solo tenant. La exclusiva
 * solo la edita el admin; el tenant la usa y puede elegirla como predeterminada.
 */
export function TemplateDestinationPicker({
    value,
    onChange,
    category,
}: {
    value: TemplateDestination;
    onChange: (next: TemplateDestination) => void;
    category?: string;
}) {
    const tenants = useAdminTenants();
    const exclusiveAllowed = category !== 'recibo_suscripcion';

    const option = (scope: TemplateDestination['scope'], Icon: typeof Globe, title: string, hint: string, disabled = false) => {
        const active = value.scope === scope;
        return (
            <button
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...value, scope, ...(scope === 'global' ? { target_tenant_id: null, set_as_tenant_default: false } : {}) })}
                className={`flex-1 text-left p-4 rounded-2xl border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${active ? 'bg-primary/10 border-primary/40' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
            >
                <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider ${active ? 'text-primary' : 'text-white/60'}`}>
                    <Icon size={14} /> {title}
                </div>
                <p className="text-[11px] text-white/40 mt-1 leading-snug">{hint}</p>
            </button>
        );
    };

    return (
        <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/30 ml-1">Destino de la plantilla</label>
            <div className="flex flex-col sm:flex-row gap-2">
                {option('global', Globe, 'Global', 'Disponible para todos los crematorios.')}
                {option('exclusive', Lock, 'Exclusiva', 'Solo para un crematorio. Solo tú puedes editarla.', !exclusiveAllowed)}
            </div>
            {!exclusiveAllowed && (
                <p className="text-[11px] text-white/30 ml-1">El recibo de suscripción siempre es global.</p>
            )}

            {value.scope === 'exclusive' && (
                <div className="space-y-3 p-4 rounded-2xl bg-black/30 border border-white/5">
                    <select
                        value={value.target_tenant_id ?? ''}
                        onChange={e => onChange({ ...value, target_tenant_id: e.target.value ? Number(e.target.value) : null })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-primary/50"
                    >
                        <option value="">Selecciona el crematorio…</option>
                        {tenants.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={value.set_as_tenant_default}
                            onChange={e => onChange({ ...value, set_as_tenant_default: e.target.checked })}
                            className="w-4 h-4 accent-primary"
                        />
                        <span className="text-xs text-white/70 flex items-center gap-1.5">
                            <Star size={12} className="text-amber-400" /> Usarla como plantilla predeterminada de ese crematorio
                        </span>
                    </label>
                    <p className="text-[11px] text-white/30">
                        El interruptor &quot;Predeterminado&quot; del sistema solo aplica a plantillas globales.
                    </p>
                </div>
            )}
        </div>
    );
}

/** Valida antes de guardar; devuelve el mensaje de error o null. */
export function destinationError(d: TemplateDestination): string | null {
    return d.scope === 'exclusive' && !d.target_tenant_id ? 'Elige el crematorio para la plantilla exclusiva' : null;
}
