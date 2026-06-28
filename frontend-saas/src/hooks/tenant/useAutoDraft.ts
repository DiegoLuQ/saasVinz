"use client";

import { useEffect, useCallback, useRef } from 'react';
import type { Cremation, SelectedService, SelectedPlan, SelectedProduct } from '@/lib/tenant/orders/types';

const DRAFT_KEY_PREFIX = 'vincer_order_draft';
const AUTO_SAVE_INTERVAL = 30_000; // 30 seconds

interface DraftState {
    cremation: Partial<Cremation>;
    services: SelectedService[];
    plans: SelectedPlan[];
    products: SelectedProduct[];
    savedAt: string;
}

interface UseAutoDraftOptions {
    editId: string | null;
    isDirty: boolean;
    currentCremation: Partial<Cremation>;
    selectedServices: SelectedService[];
    selectedPlans: SelectedPlan[];
    selectedProducts: SelectedProduct[];
}

function getDraftKey(editId: string | null): string {
    return editId ? `${DRAFT_KEY_PREFIX}_edit_${editId}` : `${DRAFT_KEY_PREFIX}_new`;
}

/**
 * Auto-saves form state to localStorage every 30s.
 * On load, checks for an existing draft and returns it for recovery.
 */
export function useAutoDraft({
    editId,
    isDirty,
    currentCremation,
    selectedServices,
    selectedPlans,
    selectedProducts,
}: UseAutoDraftOptions) {
    const draftKey = getDraftKey(editId);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Check for existing draft on mount
    const getExistingDraft = useCallback((): DraftState | null => {
        try {
            const raw = localStorage.getItem(draftKey);
            if (!raw) return null;
            const draft: DraftState = JSON.parse(raw);
            // Validate draft age (max 24 hours)
            const age = Date.now() - new Date(draft.savedAt).getTime();
            if (age > 24 * 60 * 60 * 1000) {
                localStorage.removeItem(draftKey);
                return null;
            }
            return draft;
        } catch {
            return null;
        }
    }, [draftKey]);

    // Save current state as draft
    const saveDraft = useCallback(() => {
        try {
            const draft: DraftState = {
                cremation: currentCremation,
                services: selectedServices,
                plans: selectedPlans,
                products: selectedProducts,
                savedAt: new Date().toISOString(),
            };
            localStorage.setItem(draftKey, JSON.stringify(draft));
        } catch {
            // localStorage full or unavailable — silently fail
        }
    }, [draftKey, currentCremation, selectedServices, selectedPlans, selectedProducts]);

    // Clear draft (after successful save)
    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(draftKey);
        } catch {
            // silently fail
        }
    }, [draftKey]);

    // Auto-save interval
    useEffect(() => {
        if (!isDirty) return;

        intervalRef.current = setInterval(() => {
            saveDraft();
        }, AUTO_SAVE_INTERVAL);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isDirty, saveDraft]);

    // Save on beforeunload too (best effort)
    useEffect(() => {
        if (!isDirty) return;
        const handler = () => saveDraft();
        window.addEventListener('pagehide', handler);
        return () => window.removeEventListener('pagehide', handler);
    }, [isDirty, saveDraft]);

    return {
        getExistingDraft,
        saveDraft,
        clearDraft,
    };
}

/**
 * Format a draft's save time for display
 */
export function formatDraftAge(savedAt: string): string {
    const diff = Date.now() - new Date(savedAt).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return 'hace unos segundos';
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours}h`;
    return 'hace más de 24h';
}
