import React from 'react';
import { getTranslations, type Locale } from '@/lib/translations';

interface LayoutAltarProps {
    memorial: any;
    mascota: any;
    tenant_info: any;
    locale: Locale;
    bgImage: string;
}

export default function LayoutAltar({ memorial, mascota, tenant_info, locale, bgImage }: LayoutAltarProps) {
    const t = getTranslations(locale);

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="relative w-full h-full overflow-hidden">
                <div className="absolute inset-0 flex flex-col items-center">
                    {/* Atmospheric Lighting (Amber Aura) - Centers on photo position */}
                    <div className="absolute top-[45%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-orange-400/10 blur-[90px] rounded-full pointer-events-none" />

                    {/* Background Stone Texture/Pattern (Subtle) */}
                    <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                    }} />
                </div>

                <div className="flex flex-col items-center w-full h-full px-8 md:px-10 pb-16 pt-0 relative z-10">
                    {/* Top Branding & Dates */}
                    <div className="text-center mb-6">
                        <span className="text-[8px] uppercase font-bold tracking-[0.4em] text-white/40 block mb-0.5">
                            {t.preview_tribute_from}
                        </span>
                        <h3 className="text-base tracking-[1.5px] text-[#D4AF37] mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
                            {tenant_info?.name || 'Paraíso de Mascotas'}
                        </h3>
                        <div className="flex items-center justify-center gap-4 text-[11px] font-black tracking-[0.2em] text-white/60">
                            <span>{mascota?.birth_date ? new Date(mascota.birth_date).getFullYear() : '...'}</span>
                            <span className="text-[#D4AF37] opacity-40">✦</span>
                            <span>{mascota?.death_date ? new Date(mascota.death_date).getFullYear() : '...'}</span>
                        </div>
                    </div>

                    {/* Middle: Frame with Name Overlaid */}
                    <div className="relative mt-0.5">
                        <div className="relative w-56 h-72 border-4 border-[#D4AF37]/50 shadow-[0_0_50px_rgba(0,0,0,0.7),0_10px_30px_rgba(212,175,55,0.2)] rounded-sm overflow-hidden bg-black/40">
                            <img src={bgImage} crossOrigin="anonymous" className="w-full h-full object-cover" alt={mascota?.name} />
                            <div className="absolute inset-0 shadow-[inset_0_5px_25px_rgba(0,0,0,0.9)]" />

                            {/* Pet Name Overlaid as a subtle title/caption */}
                            <div className="absolute bottom-6 left-0 w-full text-center z-20 px-4 pointer-events-none">
                                <h1 className="text-2xl font-bold tracking-[0.15em] uppercase"
                                    style={{
                                        fontFamily: "'Quicksand', sans-serif",
                                        color: '#D4AF37', // Color de la letra
                                        WebkitTextStroke: '1.9px black', // Grosor y color del borde
                                        paintOrder: 'stroke fill', // Dibuja el borde detrás del blanco para no perder grosor de letra
                                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' // Sombra para dar profundidad
                                    }}>
                                    {mascota?.name}
                                </h1>
                            </div>
                        </div>
                    </div>

                    {/* Bottom: Candles - 60% Smaller */}
                    <div className="flex gap-6 mt-6 mb-auto">
                        {[...Array(memorial.diseno?.velas || 4)].map((_, i) => (
                            <div key={i} className="flex flex-col items-center">
                                {/* Body scaled from w-6 h-14 to w-2.5 h-6 */}
                                <div className="w-2.5 h-6 bg-gradient-to-b from-gray-200 to-gray-400 rounded-sm relative shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                                    {/* Wick scaled from top-[-5px] h-2 to top-[-3px] h-1.5 */}
                                    <div className="absolute top-[-3px] left-1/2 -translate-x-1/2 w-[1px] h-1.5 bg-gray-800" />
                                    {/* Flame scaled from w-3 h-5 to w-1.5 h-2.5 */}
                                    <div className="absolute top-[-11px] left-1/2 -translate-x-1/2 w-1.5 h-2.5 bg-[radial-gradient(ellipse_at_bottom,_#ffff00_0%,_#ff8800_50%,_transparent_100%)] rounded-full shadow-[0_0_8px_#ff8800]" />
                                    <div className="absolute top-[-6px] left-1/2 -translate-x-1/2 w-[15px] h-[15px] bg-orange-500/10 blur-sm rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer for Altar */}
                    <div className="mt-auto flex flex-col items-center gap-1 mb-4 relative z-20 mx-auto w-full">
                        <div className="w-8 h-px bg-white/10 mb-2" />
                        <div className="flex flex-col items-center">
                            <p className="tracking-[0.15em] font-bold whitespace-nowrap text-[11px] text-white/70 tracking-[0.4em] font-medium">
                                {tenant_info?.instagram_handle ? `@${tenant_info.instagram_handle.replace('@', '')}` : '♥ Un Angel en el Cielo ♥'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
