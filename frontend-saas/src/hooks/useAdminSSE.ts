"use client";

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getToken } from '@/lib/auth/token';

const SSE_URL = '/api/internal/creator/notifications/stream';
const POLL_INTERVAL_MS = 10_000;
const MAX_RETRIES = 5;

/**
 * Connects to the creator SSE stream and keeps the React Query
 * admin-bootstrap cache up to date without polling the full bootstrap endpoint.
 *
 * Mount once inside the authenticated dashboard layout.
 */
export function useAdminSSE() {
    const queryClient = useQueryClient();
    const esRef = useRef<EventSource | null>(null);
    const retriesRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        let cancelled = false;

        const connect = () => {
            if (cancelled) return;

            const token = getToken();
            if (!token) return;

            const url = `${SSE_URL}?token=${encodeURIComponent(token)}`;
            const es = new EventSource(url);
            esRef.current = es;

            es.addEventListener('notification', (e: MessageEvent) => {
                try {
                    const notif = JSON.parse(e.data);
                    retriesRef.current = 0;

                    queryClient.setQueryData<any>(['admin-bootstrap'], (old: any) => {
                        if (!old) return old;
                        const already = old.notifications?.some((n: any) => n.id === notif.id);
                        if (already) return old;
                        return {
                            ...old,
                            notifications: [notif, ...(old.notifications ?? [])],
                            metadata: {
                                ...old.metadata,
                                unread_notifications: (old.metadata?.unread_notifications ?? 0) + 1,
                            },
                        };
                    });
                } catch {
                    // malformed event — ignore
                }
            });

            es.onerror = () => {
                es.close();
                esRef.current = null;

                retriesRef.current += 1;
                if (retriesRef.current > MAX_RETRIES) return;

                // Exponential back-off: 10s, 20s, 40s …
                const delay = Math.min(POLL_INTERVAL_MS * 2 ** (retriesRef.current - 1), 120_000);
                timerRef.current = setTimeout(connect, delay);
            };
        };

        connect();

        return () => {
            cancelled = true;
            if (timerRef.current) clearTimeout(timerRef.current);
            esRef.current?.close();
            esRef.current = null;
        };
    }, [queryClient]);
}
