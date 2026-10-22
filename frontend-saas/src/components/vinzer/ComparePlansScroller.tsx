'use client';

import React, { useEffect, useRef } from 'react';

/**
 * Contenedor con scroll horizontal (snap) de la tabla de /comparar-planes. En
 * pantallas angostas abre con la columna recomendada (data-highlight-col)
 * centrada, para no mostrar solo FREE al entrar.
 */
export function ComparePlansScroller({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const box = ref.current;
        if (!box || box.scrollWidth <= box.clientWidth) return;
        const col = box.querySelector<HTMLElement>('[data-highlight-col]');
        if (!col) return;
        // La primera columna es fija (sticky): se centra la recomendada en el espacio restante.
        const sticky = box.querySelector<HTMLElement>('th')?.offsetWidth ?? 0;
        const visible = box.clientWidth - sticky;
        box.scrollLeft = Math.max(0, col.offsetLeft - sticky - (visible - col.offsetWidth) / 2);
    }, []);

    return (
        <div ref={ref} className={`overflow-x-auto snap-x snap-proximity scroll-smooth overscroll-x-contain ${className}`}>
            {children}
        </div>
    );
}
