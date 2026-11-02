import React from 'react';
import { getTranslations, type Locale } from '@/lib/translations';

interface LayoutPolaroidProps {
    mascota: any;
    tenant_info: any;
    locale: Locale;
    bgImage: string;
    isStories: boolean;
}

export default function LayoutPolaroid({ mascota, tenant_info, locale, bgImage, isStories }: LayoutPolaroidProps) {
    const t = getTranslations(locale);

    const birthYear = mascota?.birth_date ? new Date(mascota.birth_date).getFullYear() : '';
    const deathYear = mascota?.death_date ? new Date(mascota.death_date).getFullYear() : '';
    const yearsText = birthYear || deathYear ? `${birthYear || '…'} — ${deathYear || '…'}` : '';

    return (
        <div className={`relative w-full h-full flex flex-col items-center justify-between overflow-hidden bg-black ${isStories ? 'py-16 px-10' : 'py-12 px-8'}`}>

            {/* 1. IMAGEN DE FONDO (Full Cover) */}
            <div className="absolute inset-0 z-0">
                <img
                    src={bgImage}
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover opacity-65 brightness-[0.75] contrast-[1.1]"
                    alt={mascota?.name}
                />
                {/* Degradados para legibilidad */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/20 to-black/90" />

                {/* Luces celestiales doradas */}
                <div className="absolute top-[20%] -left-1/4 w-[100%] h-[40%] bg-amber-500/15 blur-[120px] rounded-full opacity-40" />
                <div className="absolute bottom-0 -right-1/4 w-[100%] h-[50%] bg-[#D4AF37]/15 blur-[100px] rounded-full opacity-35" />
            </div>

            {/* 2. HEADER: BRANDING SUTIL EN ESPAÑOL */}
            <div className="relative z-20 flex flex-col items-center gap-1">
                <span className="text-[10px] uppercase tracking-[0.5em] text-white/60 font-bold font-sans">
                    {t.preview_tribute_from || 'En Memoria Eterna de'}
                </span>
                <div className="h-px w-12 bg-[#D4AF37]/60 my-1 shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
                <p className="text-3xl text-[#D4AF37] drop-shadow-md" style={{ fontFamily: "'Pinyon Script', cursive" }}>
                    {tenant_info?.name || 'Santuario de Recuerdos'}
                </p>
            </div>

            {/* 3. BLOQUE CENTRAL: NOMBRE */}
            <div className="relative z-20 text-center w-full flex flex-col items-center">
                <span className="text-[#D4AF37] text-lg mb-1.5 opacity-90">♥</span>

                <h1 className="text-6xl md:text-7xl text-white font-serif tracking-tight leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,1)]"
                    style={{ fontFamily: "'Marcellus', serif" }}>
                    {mascota?.name}
                </h1>

                <div className="mt-5 flex flex-col items-center gap-3">
                    {yearsText && (
                        <div className="flex items-center justify-center gap-4">
                            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#D4AF37]/50" />
                            <span className="text-[13px] font-light tracking-[0.35em] text-white/90 uppercase font-sans">
                                {yearsText}
                            </span>
                            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#D4AF37]/50" />
                        </div>
                    )}

                    <p className="text-[12px] text-amber-200/90 italic tracking-[0.1em] font-serif" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                        “Siempre vivirás en nuestros corazones”
                    </p>
                </div>
            </div>

            {/* 4. FOOTER: INSTAGRAM O LEYENDA SOLEMNE */}
            <div className="relative z-20 pt-4">
                <div className="flex items-center gap-3 px-6 py-2 rounded-full border border-amber-400/20 bg-black/50 backdrop-blur-md">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_#D4AF37] animate-pulse" />
                    <p className="text-[10px] font-bold tracking-[0.3em] text-white/70 uppercase font-sans">
                        {tenant_info?.instagram_handle ? `@${tenant_info.instagram_handle.replace('@', '')}` : '✦ Un Ángel en el Cielo ✦'}
                    </p>
                </div>
            </div>
        </div>
    );
}
