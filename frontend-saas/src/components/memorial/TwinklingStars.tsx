"use client";

import React, { useMemo } from 'react';
import { seededRandom } from '@/lib/memorialDesign';

const TwinklingStars = React.memo(function TwinklingStars({ color = '#ffffff' }: { color?: string }) {
    const stars = useMemo(() => {
        const rand = seededRandom(88);
        return Array.from({ length: 40 }, (_, i) => {
            const size = (rand() * 3 + 1).toFixed(2);
            return {
                id: i,
                left: `${(rand() * 100).toFixed(3)}%`,
                top: `${(rand() * 100).toFixed(3)}%`,
                width: `${size}px`,
                height: `${size}px`,
                animationDelay: `${(rand() * 5).toFixed(3)}s`,
                animationDuration: `${(rand() * 3 + 2).toFixed(3)}s`,
                opacity: Number((rand() * 0.5 + 0.3).toFixed(3)),
            };
        });
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" suppressHydrationWarning>
            {stars.map((s) => (
                <div
                    key={s.id}
                    className="absolute rounded-full star-twinkle"
                    style={{
                        backgroundColor: color,
                        boxShadow: `0 0 5px ${color}`,
                        left: s.left,
                        top: s.top,
                        width: s.width,
                        height: s.height,
                        animationDelay: s.animationDelay,
                        animationDuration: s.animationDuration,
                        opacity: s.opacity,
                    }}
                />
            ))}
            <style>{`
                .star-twinkle {
                    animation: memorial-star-twinkle ease-in-out infinite;
                }
                @keyframes memorial-star-twinkle {
                    0%, 100% { transform: scale(1); opacity: 0.3; }
                    50% { transform: scale(1.5); opacity: 1; filter: blur(1px) drop-shadow(0 0 5px white); }
                }
            `}</style>
        </div>
    );
});

export default TwinklingStars;
