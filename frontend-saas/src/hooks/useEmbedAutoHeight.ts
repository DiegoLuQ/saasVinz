import { useCallback, useEffect, useRef } from 'react';

/**
 * Comunicación del formulario incrustable (iframe) con la página del tenant.
 *
 * Mensajes enviados al parent (contrato estable, lo consume el snippet embebido):
 *   { source: 'vinzer-form', type: 'height', height: number }
 *   { source: 'vinzer-form', type: 'scroll-top' }
 *
 * Se mide el contenedor raíz del formulario (no el body): el layout público usa
 * min-h-screen, que dentro del iframe es el alto del propio iframe y haría que
 * nunca pudiera achicarse.
 */
export function postToEmbedParent(message: Record<string, unknown>) {
    if (typeof window === 'undefined' || window.parent === window) return;
    // Sin datos sensibles (solo alto / scroll): '*' es aceptable; el parent
    // valida event.origin y event.source.
    window.parent.postMessage({ source: 'vinzer-form', ...message }, '*');
}

export function useEmbedAutoHeight(enabled: boolean) {
    const observerRef = useRef<ResizeObserver | null>(null);
    const lastHeightRef = useRef(0);

    const rootRef = useCallback((node: HTMLElement | null) => {
        observerRef.current?.disconnect();
        observerRef.current = null;
        if (!enabled || !node || typeof ResizeObserver === 'undefined') return;

        const send = () => {
            const height = Math.ceil(node.getBoundingClientRect().height);
            if (height > 0 && height !== lastHeightRef.current) {
                lastHeightRef.current = height;
                postToEmbedParent({ type: 'height', height });
            }
        };
        const observer = new ResizeObserver(send);
        observer.observe(node);
        observerRef.current = observer;
        send();
    }, [enabled]);

    useEffect(() => () => observerRef.current?.disconnect(), []);

    return rootRef;
}
