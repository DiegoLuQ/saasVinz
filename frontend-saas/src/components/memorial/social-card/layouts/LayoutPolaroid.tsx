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

    return (
        <div className={`relative w-full h-full flex flex-col items-center justify-between overflow-hidden bg-black ${isStories ? 'py-16 px-10' : 'py-12 px-8'}`}>

            {/* 1. IMAGEN DE FONDO (Full Cover) */}
            <div className="absolute inset-0 z-0">
                <img
                    src={bgImage}
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover opacity-60 brightness-[0.7] contrast-[1.1]"
                    alt={mascota?.name}
                />
                {/* Degradados para legibilidad: Oscurece arriba y abajo */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />

                {/* Luces celestiales sobre la imagen para dar el efecto eterno */}
                <div className="absolute top-[20%] -left-1/4 w-[100%] h-[40%] bg-sky-500/20 blur-[120px] rounded-full opacity-40" />
                <div className="absolute bottom-0 -right-1/4 w-[100%] h-[50%] bg-[#D4AF37]/10 blur-[100px] rounded-full opacity-30" />
            </div>

            {/* 3. HEADER: BRANDING SUTIL */}
            <div className="relative z-20 flex flex-col items-center gap-1">
                <span className="text-[10px] uppercase tracking-[0.6em] text-white/50 font-bold">
                    {t.preview_tribute_from || 'In Loving Memory'}
                </span>
                <div className="h-px w-10 bg-[#D4AF37]/60 my-1 shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
                <p className="text-3xl text-[#D4AF37] drop-shadow-md" style={{ fontFamily: "'Pinyon Script', cursive" }}>
                    {tenant_info?.name || 'Pets Paradise'}
                </p>
            </div>

            {/* 4. BLOQUE CENTRAL: NOMBRE (Impacto Visual) */}
            <div className="relative z-20 text-center w-full flex flex-col items-center">
                {/* Destello sutil sobre el nombre */}
                <span className="text-[#D4AF37] text-xl mb-2 opacity-80 animate-pulse">✦</span>

                <h1 className="text-6xl md:text-7xl text-white font-serif tracking-tight leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,1)]"
                    style={{ fontFamily: "'Marcellus', serif" }}>
                    {mascota?.name}
                </h1>

                <div className="mt-6 flex flex-col items-center gap-4">
                    <div className="flex items-center justify-center gap-4">
                        <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#D4AF37]/50" />
                        <span className="text-[14px] font-light tracking-[0.4em] text-white/80 uppercase">
                            {mascota?.birth_date ? new Date(mascota.birth_date).getFullYear() : '...'} — {mascota?.death_date ? new Date(mascota.death_date).getFullYear() : '...'}
                        </span>
                        <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#D4AF37]/50" />
                    </div>

                    <p className="text-[11px] text-white/40 italic tracking-[0.2em] uppercase">
                        "Vuela alto, pequeño ángel"
                    </p>
                </div>
            </div>

            {/* 5. FOOTER: HANDLE MINIMALISTA */}
            <div className="relative z-20 pt-4">
                <div className="flex items-center gap-3 px-6 py-2 rounded-full border border-white/10 bg-black/40 backdrop-blur-md">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_#D4AF37] animate-pulse" />
                    <p className="text-[10px] font-bold tracking-[0.3em] text-white/60 uppercase">
                        {tenant_info?.instagram_handle ? tenant_info.instagram_handle.replace('@', '') : '♥ Un Angel en el Cielo ♥'}
                    </p>
                </div>
            </div>
        </div>
    );
}
