"use client";

import React from 'react';

const Snowflakes = React.memo(function Snowflakes({ color = '#ffffff' }: { color?: string }) {
    return (
        <div className="snow-container absolute inset-0">
            {[...Array(20)].map((_, i) => (
                <div key={i} className="snowflake absolute w-2 h-2 rounded-full opacity-30"
                    style={{
                        backgroundColor: color,
                        boxShadow: `0 0 10px ${color}`,
                        left: `${Math.random() * 100}%`,
                        animationDuration: `${Math.random() * 10 + 10}s`,
                        animationDelay: `${Math.random() * 10}s`,
                        top: '-10px'
                    }}
                />
            ))}
            <style jsx>{`
                .snowflake {
                    animation: fall linear infinite;
                }
                @keyframes fall {
                    to {
                        transform: translateY(100vh) rotate(360deg);
                    }
                }
            `}</style>
        </div>
    );
});

export default Snowflakes;
