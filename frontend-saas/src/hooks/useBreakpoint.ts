"use client";

import { useEffect, useState } from 'react';

// Tailwind default breakpoints
const BREAKPOINTS = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * SSR-safe hook that returns whether the viewport matches `min-width: <bp>`.
 * Defaults to `false` on server / first paint to avoid hydration mismatches —
 * components should design mobile-first and progressively enhance.
 *
 * @example
 *   const isDesktop = useBreakpoint('lg');
 *   return isDesktop ? <Table /> : <CardList />;
 */
export function useBreakpoint(bp: Breakpoint): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const mql = window.matchMedia(`(min-width: ${BREAKPOINTS[bp]}px)`);
        const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
        // Initial value after mount
        setMatches(mql.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, [bp]);

    return matches;
}
