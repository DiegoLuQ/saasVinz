"use client";

import React, { useMemo } from 'react';
import { seededRandom } from '@/lib/memorialDesign';

// Tonos de pétalo suaves (rosa, durazno, crema) que funcionan en temas claros y oscuros
const PETAL_COLORS = ['#f9c5d1', '#f7a8b8', '#fbd3c4', '#fde2e4', '#f4b6c2'];

/**
 * Partícula "Flores": pétalos que caen meciéndose. Posiciones deterministas
 * (mismas en servidor y cliente) y animación solo con CSS.
 */
const FloatingPetals = React.memo(function FloatingPetals() {
    const petals = useMemo(() => {
        const rand = seededRandom(14);
        return Array.from({ length: 14 }, (_, i) => ({
            id: i,
            left: rand() * 100,
            size: rand() * 8 + 10,
            duration: rand() * 8 + 12,
            delay: rand() * 12,
            sway: rand() * 60 + 30,
            color: PETAL_COLORS[i % PETAL_COLORS.length],
            rotate: rand() * 360,
        }));
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
            <style>{`
                @keyframes memorial-petal-fall {
                    0%   { transform: translate3d(0, -5vh, 0) rotate(var(--r)); opacity: 0; }
                    10%  { opacity: .75; }
                    50%  { transform: translate3d(var(--sway), 50vh, 0) rotate(calc(var(--r) + 180deg)); }
                    90%  { opacity: .6; }
                    100% { transform: translate3d(calc(var(--sway) * -0.5), 105vh, 0) rotate(calc(var(--r) + 360deg)); opacity: 0; }
                }
                @media (prefers-reduced-motion: reduce) { .memorial-petal { display: none; } }
            `}</style>
            {petals.map(p => (
                <span
                    key={p.id}
                    className="memorial-petal absolute top-0 block"
                    style={{
                        left: `${p.left}%`,
                        width: p.size,
                        height: p.size * 0.7,
                        background: p.color,
                        borderRadius: '80% 0 80% 0',
                        animation: `memorial-petal-fall ${p.duration}s linear ${p.delay}s infinite`,
                        ['--sway' as string]: `${p.sway}px`,
                        ['--r' as string]: `${p.rotate}deg`,
                    } as React.CSSProperties}
                />
            ))}
        </div>
    );
});

export default FloatingPetals;
