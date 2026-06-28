"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';

interface StickySaveBarProps {
    /** Whether to render — typically tied to dirty state of a form */
    visible?: boolean;

    /** Save action — pass null/undefined to render only Cancel */
    onSave?: () => void;
    saveLabel?: string;
    isSaving?: boolean;
    saveDisabled?: boolean;

    /** Cancel/secondary action */
    onCancel?: () => void;
    cancelLabel?: string;

    /** Optional left-side hint (e.g. unsaved changes indicator) */
    hint?: React.ReactNode;

    /** Force always-on (instead of mobile-only). Default false. */
    alwaysVisible?: boolean;
}

/**
 * Bottom-fixed save bar — by default only renders on mobile/tablet (< lg).
 * Use it as a companion to a regular submit button so the user can always
 * save without scrolling on long forms.
 */
export default function StickySaveBar({
    visible = true,
    onSave,
    saveLabel = 'Guardar',
    isSaving = false,
    saveDisabled = false,
    onCancel,
    cancelLabel = 'Cancelar',
    hint,
    alwaysVisible = false,
}: StickySaveBarProps) {
    if (!visible) return null;

    return (
        <>
            {/* Spacer so content isn't hidden behind the bar */}
            <div className={`${alwaysVisible ? 'block' : 'lg:hidden'} h-20`} aria-hidden="true" />

            <div
                role="region"
                aria-label="Acciones de guardado"
                className={`
                    ${alwaysVisible ? 'fixed' : 'fixed lg:hidden'}
                    bottom-0 left-0 right-0 z-30
                    bg-background/95 backdrop-blur-md border-t border-white/10
                    px-4 py-3
                    pb-[max(0.75rem,env(safe-area-inset-bottom))]
                    flex items-center gap-3
                `}
            >
                {hint && (
                    <div className="hidden sm:block text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">
                        {hint}
                    </div>
                )}

                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSaving}
                        className="flex-1 sm:flex-none h-12 px-5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white font-bold uppercase text-[11px] tracking-[0.18em] transition-all active:scale-95 disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                )}

                {onSave && (
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={isSaving || saveDisabled}
                        className="flex-[2] h-12 px-6 rounded-xl bg-gradient-to-r from-primary to-[#00B377] text-white font-black uppercase text-[11px] tracking-[0.22em] shadow-lg shadow-primary/30 hover:shadow-primary/50 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
                    >
                        {isSaving && <Loader2 className="animate-spin mr-2" size={16} aria-hidden="true" />}
                        {saveLabel}
                    </button>
                )}
            </div>
        </>
    );
}
