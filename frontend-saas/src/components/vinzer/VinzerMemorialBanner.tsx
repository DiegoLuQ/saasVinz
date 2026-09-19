'use client';

import React from 'react';
import Image from 'next/image';

interface VinzerMemorialBannerProps {
    theme?: 'dark' | 'light';
}

/**
 * Puntos de polvo estelar y partículas brillantes distribuidas orgánicamente
 * en el cielo nocturno y a lo largo de la constelación infinita de la imagen.
 */
const STAR_PARTICLES = [
    { top: '18%', left: '33%', size: 2.5, delay: '0s', duration: '3.2s', glow: 'rgba(255,255,255,0.9)' },
    { top: '22%', left: '44%', size: 2, delay: '1.2s', duration: '4s', glow: 'rgba(25,181,254,0.85)' },
    { top: '15%', left: '53%', size: 3, delay: '0.5s', duration: '2.8s', glow: 'rgba(255,255,255,0.95)' },
    { top: '27%', left: '62%', size: 2, delay: '2s', duration: '3.6s', glow: 'rgba(56,189,248,0.85)' },
    { top: '34%', left: '38%', size: 2.5, delay: '1.7s', duration: '4.2s', glow: 'rgba(255,255,255,0.85)' },
    { top: '31%', left: '50%', size: 1.5, delay: '0.8s', duration: '3s', glow: 'rgba(25,181,254,0.75)' },
    { top: '20%', left: '67%', size: 2, delay: '2.5s', duration: '3.5s', glow: 'rgba(255,255,255,0.9)' },
    { top: '12%', left: '47%', size: 2.5, delay: '1.1s', duration: '4.5s', glow: 'rgba(255,255,255,0.95)' },
    { top: '36%', left: '59%', size: 2, delay: '0.3s', duration: '3.8s', glow: 'rgba(25,181,254,0.85)' },
    { top: '25%', left: '26%', size: 1.8, delay: '1.9s', duration: '4s', glow: 'rgba(255,255,255,0.8)' },
    { top: '24%', left: '74%', size: 2.2, delay: '0.6s', duration: '3.4s', glow: 'rgba(56,189,248,0.85)' },
    { top: '16%', left: '39%', size: 1.5, delay: '2.2s', duration: '2.9s', glow: 'rgba(255,255,255,0.75)' },
    { top: '29%', left: '30%', size: 2, delay: '1.4s', duration: '3.7s', glow: 'rgba(25,181,254,0.8)' },
    { top: '14%', left: '61%', size: 2.2, delay: '2.8s', duration: '4.1s', glow: 'rgba(255,255,255,0.9)' },
    { top: '38%', left: '46%', size: 1.5, delay: '0.9s', duration: '3.3s', glow: 'rgba(25,181,254,0.7)' },
];

/**
 * Banner celestial previo al footer con homenaje a las mascotas y el infinito de Vinzer.
 * Contiene únicamente partículas de estrellas titilantes integradas de forma natural dentro de la imagen.
 */
export function VinzerMemorialBanner({ theme = 'dark' }: VinzerMemorialBannerProps) {
    const isLight = theme === 'light';

    return (
        <section
            aria-label="Homenaje celestial Vinzer"
            className="relative w-full py-10 sm:py-16 px-4 sm:px-6 select-none max-w-7xl mx-auto z-10"
        >
            <style jsx>{`
                @keyframes bannerKenBurns {
                    0% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.03) translateY(-3px);
                    }
                    100% {
                        transform: scale(1);
                    }
                }
                @keyframes starParticleTwinkle {
                    0%, 100% {
                        opacity: 0.15;
                        transform: scale(0.75);
                    }
                    50% {
                        opacity: 1;
                        transform: scale(1.35);
                    }
                }
                @keyframes auroralGlow {
                    0%, 100% {
                        opacity: 0.25;
                        transform: translate(-50%, -50%) scale(0.96);
                    }
                    50% {
                        opacity: 0.6;
                        transform: translate(-50%, -50%) scale(1.06);
                    }
                }
                .animate-ken-burns {
                    animation: bannerKenBurns 20s ease-in-out infinite alternate;
                }
                .animate-aurora {
                    animation: auroralGlow 6s ease-in-out infinite;
                }
            `}</style>

            {/* Contenedor panorámico enmarcado con bordes redondeados y sombra de alta fidelidad */}
            <div className={`relative w-full h-[320px] sm:h-[420px] md:h-[500px] lg:h-[560px] rounded-[2.2rem] sm:rounded-[2.8rem] overflow-hidden transition-all duration-500 border ${
                isLight
                    ? 'border-slate-200/80 shadow-2xl shadow-slate-900/10 bg-[#071326]'
                    : 'border-white/10 shadow-2xl shadow-black/60 bg-[#071326]'
            }`}>
                {/* Imagen con efecto de respiración lenta */}
                <div className="absolute inset-0 w-full h-full animate-ken-burns will-change-transform">
                    <Image
                        src="/images/fondo-animales-logo-monte-cielo.webp"
                        alt="Un perro y un gato contemplan el símbolo de trazabilidad infinita de Vinzer en el cielo estrellado"
                        fill
                        priority={false}
                        sizes="(max-width: 1280px) 100vw, 1280px"
                        className="object-cover object-center"
                    />
                </div>

                {/* Resplandor cósmico sutil detrás del símbolo del infinito */}
                <div
                    className="absolute top-[28%] left-1/2 w-[240px] sm:w-[420px] md:w-[560px] h-[140px] sm:h-[220px] md:h-[280px] rounded-full bg-gradient-to-r from-[#19b5fe]/25 via-sky-300/30 to-amber-200/20 blur-[60px] sm:blur-[100px] pointer-events-none animate-aurora"
                    aria-hidden="true"
                />

                {/* Partículas de estrellas titilantes reales integradas en el cielo */}
                {STAR_PARTICLES.map((particle, idx) => (
                    <div
                        key={idx}
                        className="absolute rounded-full pointer-events-none"
                        style={{
                            top: particle.top,
                            left: particle.left,
                            width: `${particle.size}px`,
                            height: `${particle.size}px`,
                            backgroundColor: '#ffffff',
                            boxShadow: `0 0 5px ${particle.glow}, 0 0 10px ${particle.glow}`,
                            animation: `starParticleTwinkle ${particle.duration} ease-in-out infinite ${particle.delay}`,
                        }}
                        aria-hidden="true"
                    />
                ))}

                {/* Viñeteado perimetral sutil para realzar la profundidad */}
                <div
                    className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/50 via-transparent to-black/30"
                    aria-hidden="true"
                />

                {/* Badge flotante sutil centrado en la parte inferior */}
                <div className="absolute bottom-6 sm:bottom-9 inset-x-0 flex justify-center items-center z-10 px-4">
                    <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border backdrop-blur-md transition-all shadow-xl bg-black/45 border-white/20 text-slate-100 hover:border-[#19b5fe]/50 hover:scale-[1.02]">
                        <span className="w-2 h-2 rounded-full bg-[#19b5fe] animate-ping" />
                        <span className="text-xs sm:text-sm font-medium tracking-wide drop-shadow-xs">
                            El recuerdo de quienes amamos es infinito
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
}
