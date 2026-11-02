import React from 'react';
import { getTranslations, type Locale } from '@/lib/translations';

interface LayoutCartaProps {
    mascota: any;
    tenant_info: any;
    locale: Locale;
    bgImage: string;
    isPost: boolean;
    isStories: boolean;
}

export default function LayoutCarta({ mascota, tenant_info, locale, bgImage, isPost, isStories }: LayoutCartaProps) {
    const t = getTranslations(locale);

    const birthYear = mascota?.birth_date ? new Date(mascota.birth_date).getFullYear() : '';
    const deathYear = mascota?.death_date ? new Date(mascota.death_date).getFullYear() : '';
    const yearsText = birthYear || deathYear ? `${birthYear || '…'} — ${deathYear || '…'}` : '';

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="relative w-full h-full overflow-hidden">
                <img src={bgImage} crossOrigin="anonymous" className="w-full h-full object-cover"
                    style={{ filter: 'contrast(1.1) brightness(0.9)' }} />

                <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }} />
                <div className="absolute inset-0 h-[40%]" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)' }} />
                <div className="absolute inset-0 top-[50%]" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 40%, transparent 100%)' }} />

                {/* Decorative Border for Carta */}
                <div className="absolute inset-[15px] border border-[#D4AF37]/30 pointer-events-none rounded-lg" />

                <div className="relative z-10 h-full flex flex-col p-10 pt-16 justify-between px-10">
                    <div className="text-center">
                        <span className="text-[10px] uppercase font-bold tracking-[0.5em] text-[#D4AF37] block mb-2 font-sans" style={{ fontFamily: 'Cinzel, serif' }}>
                            ♥ {t.altar_eternal_memory || 'Un Recuerdo Eterno'}
                        </span>
                        {yearsText && (
                            <p className="text-base italic text-white/90 font-serif" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                                {yearsText}
                            </p>
                        )}
                    </div>

                    <div className="text-center mb-10 py-10">
                        <h1 className="leading-[1] text-white" style={{
                            fontFamily: 'Cinzel, serif',
                            textShadow: '0 4px 20px rgba(0,0,0,0.6)',
                            fontSize: isPost ? '64px' : '56px'
                        }}>
                            {mascota?.name}
                        </h1>
                        <p className="text-xs text-amber-200/90 italic mt-3 font-serif" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                            “Siempre en nuestros corazones”
                        </p>
                    </div>

                    {/* Branding Footer */}
                    <div className="mt-auto flex flex-col items-center gap-1 mb-4 relative z-20 mx-auto w-full">
                        <div className="flex flex-col items-center">
                            <span className="tracking-[3px] uppercase mb-1 font-bold whitespace-nowrap text-[8px] text-white/60 font-sans">
                                {t.preview_tribute_from || 'Un Homenaje de'}
                            </span>
                            <h3 className="text-center tracking-[2px] text-sm text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.4)] uppercase"
                                style={{ fontFamily: 'Cinzel, serif' }}
                            >
                                {tenant_info?.name || 'Santuario de Recuerdos'}
                            </h3>
                        </div>

                        <div className="flex flex-col items-center">
                            <p className="tracking-[0.2em] font-bold whitespace-nowrap text-[9px] text-white/50 mt-1 font-sans uppercase">
                                {tenant_info?.instagram_handle ? `@${tenant_info.instagram_handle.replace('@', '')}` : '✦ Un Ángel en el Cielo ✦'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
