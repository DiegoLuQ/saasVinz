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

    const birthYear = mascota?.birth_date ? new Date(mascota.birth_date).getFullYear() : '';
    const deathYear = mascota?.death_date ? new Date(mascota.death_date).getFullYear() : '';
    const yearsText = birthYear || deathYear ? `${birthYear || '…'} — ${deathYear || '…'}` : '';

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="relative w-full h-full overflow-hidden">
                <div className="absolute inset-0 flex flex-col items-center">
                    {/* Atmospheric Lighting (Amber Aura) */}
                    <div className="absolute top-[45%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-amber-500/15 blur-[90px] rounded-full pointer-events-none" />

                    <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                    }} />
                </div>

                <div className="flex flex-col items-center w-full h-full px-8 md:px-10 pb-12 pt-6 relative z-10">
                    {/* Top Branding & Dates */}
                    <div className="text-center mb-4">
                        <span className="text-[9px] uppercase font-bold tracking-[0.4em] text-white/50 block mb-0.5 font-sans">
                            {t.preview_tribute_from || 'Un Homenaje de'}
                        </span>
                        <h3 className="text-base tracking-[2px] text-[#D4AF37] mb-1 font-serif uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
                            {tenant_info?.name || 'Santuario de Recuerdos'}
                        </h3>
                        {yearsText && (
                            <div className="flex items-center justify-center gap-3 text-[11px] font-bold tracking-[0.2em] text-white/70 font-sans">
                                <span>{yearsText}</span>
                            </div>
                        )}
                    </div>

                    {/* Middle: Frame with Name Overlaid */}
                    <div className="relative mt-1">
                        <div className="relative w-56 h-72 border-4 border-[#D4AF37]/50 shadow-[0_0_50px_rgba(0,0,0,0.8),0_10px_30px_rgba(212,175,55,0.25)] rounded-2xl overflow-hidden bg-black/50">
                            <img src={bgImage} crossOrigin="anonymous" className="w-full h-full object-cover" alt={mascota?.name} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20" />

                            {/* Pet Name Overlaid */}
                            <div className="absolute bottom-4 left-0 w-full text-center z-20 px-3 pointer-events-none">
                                <h1
                                    className="text-2xl font-bold tracking-[0.14em] uppercase"
                                    style={{
                                        fontFamily: "'Cinzel', serif",
                                        color: '#ffffff',
                                        textShadow: '0 2px 10px rgba(0,0,0,0.9), 0 0 15px rgba(212,175,55,0.6)',
                                    }}
                                >
                                    {mascota?.name}
                                </h1>
                                <p className="text-[10px] text-amber-200/90 italic font-serif mt-0.5" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                                    “Su luz brilla para siempre”
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Bottom: Twin Ceremonial Candles */}
                    <div className="flex gap-8 mt-5 mb-auto">
                        {[1, 2].map((_, i) => (
                            <div key={i} className="flex flex-col items-center">
                                <div className="w-3 h-8 bg-gradient-to-b from-[#fffef9] to-[#ebd8b5] rounded-t-sm relative shadow-[0_0_12px_rgba(251,191,36,0.5)] border border-amber-300/40">
                                    <div className="absolute top-[-3px] left-1/2 -translate-x-1/2 w-[1px] h-2 bg-stone-700" />
                                    <div className="absolute top-[-11px] left-1/2 -translate-x-1/2 w-2 h-3.5 bg-[radial-gradient(ellipse_at_bottom,_#ffffff_0%,_#fef08a_30%,_#f59e0b_70%,_transparent_100%)] rounded-full shadow-[0_0_12px_#fbbf24]" />
                                    <div className="absolute top-[-7px] left-1/2 -translate-x-1/2 w-5 h-5 bg-amber-400/20 blur-sm rounded-full" />
                                </div>
                                <div className="w-5 h-1.5 bg-gradient-to-r from-amber-800 to-amber-600 rounded-b-sm mt-0.5" />
                            </div>
                        ))}
                    </div>

                    {/* Footer for Altar */}
                    <div className="mt-auto flex flex-col items-center gap-1 mb-2 relative z-20 mx-auto w-full">
                        <div className="w-12 h-px bg-amber-400/20 mb-1.5" />
                        <p className="font-bold text-[10px] text-white/70 tracking-[0.3em] font-sans uppercase">
                            {tenant_info?.instagram_handle ? `@${tenant_info.instagram_handle.replace('@', '')}` : '✦ Un Ángel en el Cielo ✦'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
