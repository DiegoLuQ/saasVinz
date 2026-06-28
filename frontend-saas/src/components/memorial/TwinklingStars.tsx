"use client";

import React from 'react';

const TwinklingStars = React.memo(function TwinklingStars({ color = '#ffffff' }: { color?: string }) {
    return (
        <div className="absolute inset-0 overflow-hidden">
            {[...Array(40)].map((_, i) => (
                <div key={i} className="absolute rounded-full star-twinkle"
                    style={{
                        backgroundColor: color,
                        boxShadow: `0 0 5px ${color}`,
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        width: `${Math.random() * 3 + 1}px`,
                        height: `${Math.random() * 3 + 1}px`,
                        animationDelay: `${Math.random() * 5}s`,
                        animationDuration: `${Math.random() * 3 + 2}s`,
                        opacity: Math.random() * 0.5 + 0.3
                    }}
                />
            ))}
            <style jsx>{`
                .star-twinkle {
                    animation: twinkle ease-in-out infinite;
                }
                @keyframes twinkle {
                    0%, 100% { transform: scale(1); opacity: 0.3; }
                    50% { transform: scale(1.5); opacity: 1; filter: blur(1px) drop-shadow(0 0 5px white); }
                }
            `}</style>
        </div>
    );
});

export default TwinklingStars;
