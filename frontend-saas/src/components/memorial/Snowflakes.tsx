"use client";

import React, { useMemo } from 'react';
import { seededRandom } from '@/lib/memorialDesign';

const Snowflakes = React.memo(function Snowflakes({ color = '#ffffff' }: { color?: string }) {
    const flakes = useMemo(() => {
        const rand = seededRandom(77);
        return Array.from({ length: 20 }, (_, i) => ({
            id: i,
            left: `${(rand() * 100).toFixed(3)}%`,
            animationDuration: `${(rand() * 10 + 10).toFixed(3)}s`,
            animationDelay: `${(rand() * 10).toFixed(3)}s`,
        }));
    }, []);

    return (
        <div className="snow-container absolute inset-0 pointer-events-none" suppressHydrationWarning>
            {flakes.map((flake) => (
                <div
                    key={flake.id}
                    className="snowflake absolute w-2 h-2 rounded-full opacity-30"
                    style={{
                        backgroundColor: color,
                        boxShadow: `0 0 10px ${color}`,
                        left: flake.left,
                        animationDuration: flake.animationDuration,
                        animationDelay: flake.animationDelay,
                        top: '-10px',
                    }}
                />
            ))}
            <style>{`
                .snowflake {
                    animation: memorial-snow-fall linear infinite;
                }
                @keyframes memorial-snow-fall {
                    to {
                        transform: translateY(100vh) rotate(360deg);
                    }
                }
            `}</style>
        </div>
    );
});

export default Snowflakes;
