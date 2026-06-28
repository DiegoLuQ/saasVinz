'use client';

import React from 'react';

interface MemorialCandleProps {
    /** Scale multiplier (1 = default ~120px tall) */
    scale?: number;
    /** Optional CSS class for the outer wrapper */
    className?: string;
}

/**
 * MemorialCandle — A pure CSS/Tailwind candle with realistic flame flicker.
 * Designed for Next.js App Router. No external dependencies.
 */
export const MemorialCandle: React.FC<MemorialCandleProps> = ({
    scale = 1,
    className = '',
}) => {
    return (
        <>
            {/* Keyframes injected once via JSX style tag */}
            <style jsx global>{`
                @keyframes flicker {
                    0%, 100% {
                        transform: scaleY(1) scaleX(1) rotate(0deg);
                        opacity: 1;
                    }
                    10% {
                        transform: scaleY(1.04) scaleX(0.96) rotate(-1deg);
                        opacity: 0.95;
                    }
                    20% {
                        transform: scaleY(0.96) scaleX(1.02) rotate(1.5deg);
                        opacity: 1;
                    }
                    30% {
                        transform: scaleY(1.06) scaleX(0.94) rotate(-0.5deg);
                        opacity: 0.92;
                    }
                    40% {
                        transform: scaleY(0.98) scaleX(1.01) rotate(1deg);
                        opacity: 0.97;
                    }
                    50% {
                        transform: scaleY(1.03) scaleX(0.97) rotate(-1.5deg);
                        opacity: 0.94;
                    }
                    60% {
                        transform: scaleY(0.95) scaleX(1.04) rotate(0.5deg);
                        opacity: 1;
                    }
                    70% {
                        transform: scaleY(1.05) scaleX(0.95) rotate(-1deg);
                        opacity: 0.93;
                    }
                    80% {
                        transform: scaleY(0.97) scaleX(1.03) rotate(1deg);
                        opacity: 0.98;
                    }
                    90% {
                        transform: scaleY(1.02) scaleX(0.98) rotate(-0.5deg);
                        opacity: 0.96;
                    }
                }

                @keyframes glow-pulse {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 0.8; }
                }
            `}</style>

            <div
                className={`relative inline-flex flex-col items-center ${className}`}
                style={{ transform: `scale(${scale})` }}
            >
                {/* ═══ Flame Assembly ═══ */}
                <div className="relative flex flex-col items-center mb-0.5">
                    {/* Glow / Halo behind flame */}
                    <div
                        className="absolute -top-3 w-10 h-10 rounded-full pointer-events-none"
                        style={{
                            background: 'radial-gradient(circle, rgba(251,191,36,0.35) 0%, transparent 70%)',
                            animation: 'glow-pulse 2s ease-in-out infinite',
                        }}
                    />

                    {/* Outer Flame (orange, larger, softer) */}
                    <div
                        className="relative z-10"
                        style={{ animation: 'flicker 1.8s ease-in-out infinite' }}
                    >
                        <div
                            className="w-4 h-7 rounded-full blur-[1px]"
                            style={{
                                background: 'linear-gradient(to top, #f97316 0%, #fb923c 30%, #fbbf24 70%, #fde68a 100%)',
                                borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                            }}
                        />
                    </div>

                    {/* Inner Flame (bright white-yellow core) */}
                    <div
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20"
                        style={{ animation: 'flicker 1.4s ease-in-out infinite reverse' }}
                    >
                        <div
                            className="w-2 h-4 blur-[0.5px]"
                            style={{
                                background: 'linear-gradient(to top, #fbbf24 0%, #fef3c7 50%, #fffbeb 100%)',
                                borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                            }}
                        />
                    </div>
                </div>

                {/* ═══ Wick (Mecha) ═══ */}
                <div className="relative z-30 w-px h-2 bg-gradient-to-b from-slate-800 to-slate-600 rounded-full" />

                {/* ═══ Candle Body ═══ */}
                <div className="relative">
                    {/* Wax drip highlight */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-white/60 rounded-b-full blur-[0.5px] z-10" />

                    {/* Main cylinder */}
                    <div
                        className="w-8 h-20 rounded-b-lg"
                        style={{
                            background: 'linear-gradient(to right, #cbd5e1 0%, #e2e8f0 20%, #f8fafc 50%, #e2e8f0 80%, #cbd5e1 100%)',
                            borderRadius: '2px 2px 4px 4px',
                        }}
                    />

                    {/* Top ellipse (candle opening) */}
                    <div
                        className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-2 rounded-full"
                        style={{
                            background: 'linear-gradient(to right, #cbd5e1 0%, #f1f5f9 40%, #e2e8f0 100%)',
                        }}
                    />

                    {/* Subtle vertical shine */}
                    <div className="absolute inset-0 overflow-hidden rounded-b-lg">
                        <div className="absolute top-0 left-1/3 w-1 h-full bg-white/20 blur-[2px]" />
                    </div>
                </div>

                {/* ═══ Base / Plate ═══ */}
                <div className="relative mt-0">
                    {/* Top rim */}
                    <div
                        className="w-12 h-1.5 rounded-full mx-auto"
                        style={{
                            background: 'linear-gradient(to right, #94a3b8 0%, #cbd5e1 40%, #94a3b8 100%)',
                        }}
                    />
                    {/* Bottom plate */}
                    <div
                        className="w-14 h-1 rounded-b-full mx-auto -mt-px"
                        style={{
                            background: 'linear-gradient(to right, #6b7280 0%, #9ca3af 40%, #6b7280 100%)',
                        }}
                    />
                </div>

                {/* ═══ Surface Glow (reflection on surface) ═══ */}
                <div
                    className="absolute -bottom-2 w-16 h-4 rounded-full pointer-events-none"
                    style={{
                        background: 'radial-gradient(ellipse, rgba(251,191,36,0.12) 0%, transparent 70%)',
                    }}
                />
            </div>
        </>
    );
};

export default MemorialCandle;
