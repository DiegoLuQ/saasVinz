"use client";

import React, { useState } from 'react';
import { Heart, Flame, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SocialShareCard from '../SocialShareCard';

export default function CartaLayout(props: any) {
    const { memorial, mascota, randomMainImage, galleryImages, t, onShare, scrollToForm, tenant_info, locale, themeConfig } = props;

    const petName = mascota?.nombre || mascota?.name || '';
    const birthDate = mascota?.birth_date ? new Date(mascota.birth_date).toLocaleDateString() : null;
    const deathDate = mascota?.death_date ? new Date(mascota.death_date).toLocaleDateString() : null;
    const bio = memorial?.msg_despedida || t?.philosophy_text || '';

    const isDarkBg = !!memorial?.diseno?.portada_url;

    const btnClass = isDarkBg
        ? "flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-white/20 bg-white/20 backdrop-blur-md text-white text-[11.5px] font-semibold uppercase tracking-wider hover:bg-white/35 transition-all shadow-md"
        : "flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-black/15 bg-black/5 backdrop-blur-md text-slate-800 text-[11.5px] font-semibold uppercase tracking-wider hover:bg-black/10 transition-all shadow-sm";

    const images: string[] = (galleryImages && galleryImages.length > 0)
        ? galleryImages
        : randomMainImage ? [randomMainImage] : [];

    const [activeImg, setActiveImg] = useState<string>(images[0] || '');

    return (
        <div
            className="relative z-10 flex items-center justify-center min-h-[80vh] mt-0 py-24 px-4"
            style={memorial?.diseno?.portada_url ? { backgroundImage: `url(${memorial.diseno.portada_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        >
            {/* Overlay for portada readability */}
            {memorial?.diseno?.portada_url && (
                <div className="absolute inset-0 bg-black/45 z-0" />
            )}

            {/* Subtle moving clouds */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <motion.div
                    animate={{ x: [-200, 200], opacity: [0.07, 0.2, 0.07] }}
                    transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
                    className="absolute top-1/4 left-0 w-80 h-32 bg-white/50 blur-[100px] rounded-full"
                />
                <motion.div
                    animate={{ x: [200, -200], opacity: [0.05, 0.15, 0.05] }}
                    transition={{ duration: 44, repeat: Infinity, ease: 'linear' }}
                    className="absolute bottom-1/4 right-0 w-96 h-44 bg-white/40 blur-[120px] rounded-full"
                />
            </div>

            {/* Card wrapper — max 860px, centered */}
            <div className="relative z-10 w-full max-w-[860px] flex flex-col md:flex-row shadow-2xl rounded-3xl overflow-hidden border border-white/10">

                {/* ── LEFT — photo panel (inherits page bg) ── */}
                <div className="w-full md:w-[42%] flex flex-col items-center justify-center gap-5 p-8"
                    style={{ background: 'rgba(0,0,0,0.3)' }}>

                    {/* Main photo with crossfade on change */}
                    <div className="w-full max-w-[240px] aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 relative">
                        <AnimatePresence mode="wait">
                            <motion.img
                                key={activeImg}
                                src={activeImg}
                                alt={petName}
                                className="w-full h-full object-cover absolute inset-0"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.35 }}
                            />
                        </AnimatePresence>
                        {!activeImg && (
                            <div className="w-full h-full flex items-center justify-center bg-white/10">
                                <Heart className="text-white/30" size={60} />
                            </div>
                        )}
                    </div>

                    {/* Thumbnails */}
                    {images.length > 1 && (
                        <div className="flex gap-2 flex-wrap justify-center">
                            {images.map((img, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveImg(img)}
                                    className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all duration-200 ${activeImg === img ? 'border-white shadow-lg scale-105' : 'border-white/30 opacity-60 hover:opacity-90'}`}
                                >
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2.5 w-full max-w-[240px] mt-2">
                        {scrollToForm && (
                            <button
                                onClick={scrollToForm}
                                className={`${btnClass} w-full justify-center`}
                            >
                                <Flame size={13} className="text-[#c5a059]" />
                                {t?.mem_leave_message || 'Dedicatoria'}
                            </button>
                        )}
                        {onShare && (
                            <button
                                onClick={onShare}
                                className={`${btnClass} w-full justify-center`}
                            >
                                <Share2 size={13} />
                                {t?.mem_share || 'Compartir'}
                            </button>
                        )}
                        {/* Social Share Card (Story/Post Modal) */}
                        <SocialShareCard
                            memorial={memorial}
                            mascota={mascota}
                            tenant_info={tenant_info}
                            locale={locale}
                            mainImage={activeImg}
                            externalBtnClass={`${btnClass} w-full justify-center`}
                        />
                    </div>
                </div>

                {/* ── RIGHT — solemn letter (warm parchment) ── */}
                <div
                    className="w-full md:w-[58%] flex items-center p-8 md:p-12"
                    style={{ backgroundColor: '#fdfbf7', fontFamily: "'Cormorant Garamond', serif" }}
                >
                    <div className="w-full">
                        {/* Sparkle */}
                        <div className="text-[#c5a059] mb-4 text-lg">✦</div>

                        {/* Name */}
                        <h1 className="text-4xl md:text-5xl font-light text-[#3d2f1f] mb-1 leading-tight">
                            {petName}
                        </h1>

                        {/* Dates */}
                        {(birthDate || deathDate) && (
                            <p className="text-xs tracking-widest text-[#9b8b7a] mb-5 uppercase">
                                {birthDate || '...'} — {deathDate || '...'}
                            </p>
                        )}

                        {/* Divider */}
                        <div className="w-full h-px bg-[#c5a059]/30 mb-6" />

                        {/* Bio — full text */}
                        {bio && (
                            <p className="text-base md:text-lg leading-relaxed text-[#5c4a38] italic mb-8">
                                {bio}
                            </p>
                        )}

                        {/* CTA */}
                        {scrollToForm && (
                            <button
                                onClick={scrollToForm}
                                className="flex items-center justify-center gap-2 w-full py-3.5 border border-[#c5a059] text-[#c5a059] text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-[#c5a059]/10 transition-all rounded-xl"
                            >
                                <Flame size={13} />
                                {t?.mem_leave_message || 'Dejar una dedicatoria'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
