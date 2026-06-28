import React from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import Image from 'next/image';
import MemorialActionButtons from '@/components/memorial/MemorialActionButtons';

/**
 * Plantilla ULTRA "Galería": sala de museo con el retrato bajo un foco de luz,
 * marco clásico y placa de bronce con nombre y fechas. La galería se cuelga
 * como obras enmarcadas.
 */
export default function GaleriaLayout(props: any) {
    const {
        memorial, mascota, randomMainImage, galleryImages,
        tenant_info, locale, t, onShare, onSendKiss, themeConfig
    } = props;

    const years = `${mascota?.birth_date ? new Date(mascota.birth_date).getFullYear() : '...'} — ${mascota?.death_date ? new Date(mascota.death_date).getFullYear() : '...'}`;
    const isDarkTheme = themeConfig?.text?.includes('white') || themeConfig?.text?.includes('50') || themeConfig?.text?.includes('slate-200');

    const portadaUrl = memorial?.diseno?.portada_url;
    const showDefaultGalleryBg = !portadaUrl && !memorial?.diseno?.color_fondo && (!themeConfig || themeConfig.bg.includes('faf9f6'));

    return (
        <div
            className={`relative z-10 min-h-screen w-full ${isDarkTheme ? 'text-stone-200' : 'text-stone-800'}`}
            style={{
                fontFamily: "'Lato', sans-serif",
                background: showDefaultGalleryBg ? 'linear-gradient(180deg, #f5f1ea 0%, #ece5d8 55%, #e3dac9 100%)' : undefined,
                ...(portadaUrl ? { backgroundImage: `url(${portadaUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {})
            }}
        >
            {/* Textura de pared y sombra de techo */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-stone-900/15 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-stone-900/10 to-transparent" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 flex flex-col items-center">
                {/* ─── FOCO DE LUZ + OBRA PRINCIPAL ─── */}
                <div className="relative flex flex-col items-center mb-14 sm:mb-20 w-full">
                    {/* Cono de luz del foco */}
                    <div
                        className="absolute -top-16 sm:-top-24 left-1/2 -translate-x-1/2 w-[150%] sm:w-[120%] h-[130%] pointer-events-none"
                        style={{
                            background: memorial?.diseno?.color_fondo
                                ? 'radial-gradient(ellipse 45% 60% at 50% 25%, rgba(255,250,235,0.25) 0%, rgba(255,248,225,0.08) 45%, transparent 70%)'
                                : 'radial-gradient(ellipse 45% 60% at 50% 25%, rgba(255,250,235,0.95) 0%, rgba(255,248,225,0.35) 45%, transparent 70%)'
                        }}
                    />

                    {/* Marco clásico */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.4, ease: 'easeOut' }}
                        className="relative p-3 sm:p-4 shadow-[0_30px_60px_-15px_rgba(60,45,20,0.45)]"
                        style={{
                            background: 'linear-gradient(135deg, #b08d4f 0%, #e6c98a 20%, #8a6a33 45%, #d4b06a 70%, #9c7a3e 100%)',
                        }}
                    >
                        <div className="p-2 sm:p-3 bg-gradient-to-br from-[#6b5224] to-[#4a3a1a]">
                            <div className="relative w-[280px] sm:w-[380px] md:w-[440px] aspect-[4/5] overflow-hidden bg-stone-200">
                                {randomMainImage ? (
                                    <Image
                                        src={randomMainImage}
                                        alt={mascota?.name || 'Memorial'}
                                        fill
                                        priority
                                        sizes="(max-width: 640px) 280px, 440px"
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-stone-400">
                                        <Heart size={90} fill="currentColor" />
                                    </div>
                                )}
                                {/* Brillo de vidrio del cuadro */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent pointer-events-none" />
                            </div>
                        </div>
                    </motion.div>

                    {/* Placa de bronce */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.6 }}
                        className="relative -mt-1 px-7 sm:px-10 py-4 sm:py-5 text-center shadow-[0_8px_20px_rgba(60,45,20,0.35)] border border-[#8a6a33]/60"
                        style={{
                            background: 'linear-gradient(170deg, #caa45d 0%, #a9853f 50%, #c29c52 100%)',
                        }}
                    >
                        <h1
                            className="text-3xl sm:text-5xl text-[#3d2e10] tracking-wide"
                            style={{ fontFamily: "'Cinzel', serif", textShadow: '0 1px 0 rgba(255,255,255,0.35)' }}
                        >
                            {mascota?.name}
                        </h1>
                        <p className="mt-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-[0.4em] text-[#5a4518]">
                            {years}
                        </p>
                    </motion.div>
                </div>

                {/* ─── CÉDULA DE LA OBRA (mensaje) ─── */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1 }}
                    className={`max-w-2xl w-full border p-8 sm:p-10 text-center shadow-[0_15px_35px_rgba(60,45,20,0.12)] mb-12 ${
                        isDarkTheme
                            ? 'bg-black/60 border-stone-800'
                            : 'bg-white/70 border-stone-300/60 backdrop-blur-sm'
                    }`}
                >
                    <p className={`text-[10px] uppercase tracking-[0.45em] mb-5 ${
                        isDarkTheme ? 'text-stone-500' : 'text-stone-400'
                    }`}>
                        {locale === 'es' ? 'Obra de una vida' : 'The work of a lifetime'}
                    </p>
                    <p
                        className={`text-lg sm:text-xl leading-relaxed italic ${
                            isDarkTheme ? 'text-stone-300' : 'text-stone-700'
                        }`}
                        style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                        {memorial?.msg_despedida || t.philosophy_text || (locale === 'es'
                            ? 'Algunas obras maestras no se pintan: se viven a nuestro lado, pata a pata.'
                            : 'Some masterpieces are not painted: they are lived beside us, paw by paw.')}
                    </p>
                    <div className="mt-6 mx-auto h-px w-24 bg-gradient-to-r from-transparent via-stone-400 to-transparent" />
                </motion.div>

                <div className="[&_button]:!bg-white [&_button]:!text-[#5a4518] [&_button]:!border-stone-300 [&_button:hover]:!bg-stone-50 mb-16 sm:mb-20">
                    <MemorialActionButtons
                        onSendKiss={onSendKiss}
                        onShare={onShare}
                        memorial={memorial}
                        mascota={mascota}
                        tenant_info={tenant_info}
                        locale={locale}
                        t={t}
                        mainImage={randomMainImage || mascota?.image_url}
                    />
                </div>

                {/* ─── SALA DE EXPOSICIÓN (galería) ─── */}
                {galleryImages?.length > 1 && (
                    <div className="w-full">
                        <p className={`text-center text-[10px] uppercase tracking-[0.5em] mb-10 ${
                            isDarkTheme ? 'text-stone-500' : 'text-stone-400'
                        }`}>
                            {locale === 'es' ? 'Sala de exposición' : 'Exhibition hall'}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 sm:gap-10 items-start">
                            {galleryImages.map((img: string, i: number) => (
                                <motion.figure
                                    key={i}
                                    initial={{ opacity: 0, y: 24 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: (i % 3) * 0.15, duration: 0.8 }}
                                    className="group"
                                    style={{ marginTop: i % 2 === 1 ? '1.5rem' : '0' }}
                                >
                                    <div className="p-1.5 sm:p-2 bg-gradient-to-br from-[#c4a05c] via-[#a9853f] to-[#8a6a33] shadow-[0_12px_25px_rgba(60,45,20,0.25)] group-hover:shadow-[0_18px_35px_rgba(60,45,20,0.35)] transition-shadow duration-500">
                                        <div className="relative aspect-square overflow-hidden bg-stone-200">
                                            <Image
                                                src={img}
                                                alt={`${mascota?.name} ${i + 1}`}
                                                fill
                                                sizes="(max-width: 768px) 50vw, 33vw"
                                                className="object-cover group-hover:scale-105 transition-transform duration-700"
                                            />
                                        </div>
                                    </div>
                                    <figcaption className={`mt-3 text-center text-[9px] uppercase tracking-[0.3em] ${
                                        isDarkTheme ? 'text-stone-500' : 'text-stone-400'
                                    }`}>
                                        {locale === 'es' ? `Obra ${['I', 'II', 'III', 'IV', 'V'][i] || i + 1}` : `Piece ${['I', 'II', 'III', 'IV', 'V'][i] || i + 1}`}
                                    </figcaption>
                                </motion.figure>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
