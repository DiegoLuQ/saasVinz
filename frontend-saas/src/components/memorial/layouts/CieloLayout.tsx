import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart,
    Cloud as CloudIcon
} from 'lucide-react';

export default function CieloLayout(props: any) {
    const { memorial, mascota, randomMainImage, t, themeConfig } = props;
    const [sentKisses, setSentKisses] = useState(0);
    
    const isDarkTheme = themeConfig?.text?.includes('white') || themeConfig?.text?.includes('50') || themeConfig?.text?.includes('slate-200');
    const showDefaultCieloBg = !memorial?.diseno?.portada_url && !memorial?.diseno?.color_fondo && (!themeConfig || themeConfig.bg.includes('faf9f6'));
    const portadaUrl = memorial?.diseno?.portada_url;

    return (
        <div
            className={`relative z-10 min-h-screen w-full flex items-center justify-center p-4 overflow-hidden ${
                showDefaultCieloBg ? 'bg-gradient-to-br from-[#89f7fe] to-[#66a6ff]' : ''
            }`}
            style={{
                fontFamily: "'Quicksand', sans-serif",
                ...(portadaUrl ? { backgroundImage: `url(${portadaUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {})
            }}
        >
            {/* Background Decorations */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute bg-white rounded-full shadow-[0_0_10px_white]"
                        style={{
                            width: Math.random() * 4 + 2,
                            height: Math.random() * 4 + 2,
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                        }}
                        animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.2, 1] }}
                        transition={{ duration: Math.random() * 3 + 2, repeat: Infinity }}
                    />
                ))}
                <div className="absolute top-[10%] left-[-5%] w-80 h-32 bg-white/40 blur-[40px] rounded-full animate-pulse" />
                <div className="absolute bottom-[20%] right-[-5%] w-96 h-40 bg-white/40 blur-[40px] rounded-full animate-pulse" />
            </div>

            <div className="max-w-6xl w-full bg-white/20 backdrop-blur-xl border border-white/60 rounded-[40px] p-12 md:p-20 flex flex-col md:flex-row items-center gap-16 relative z-10 shadow-2xl">
                {/* Image Section */}
                <div className="flex-1 relative">
                    {/* Wings Effect */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] opacity-40">
                        <img src="https://www.transparenttextures.com/patterns/cubes.png" className="w-full opacity-0" alt="" /> {/* Spacer */}
                        <div className="absolute inset-0 bg-white/40 blur-3xl rounded-full" />
                    </div>

                    <motion.div
                        animate={{ y: [-10, 10, -10] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        className="relative w-[280px] md:w-[350px] aspect-[3/4] p-3 rounded-[150px_150px_20px_20px] shadow-2xl"
                        style={{ background: 'linear-gradient(45deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)' }}
                    >
                        <div className="w-full h-full bg-white rounded-[145px_145px_15px_15px] overflow-hidden border border-black/5">
                            {randomMainImage ? (
                                <img src={randomMainImage} className="w-full h-full object-cover" alt={mascota?.name} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-blue-200">
                                    <CloudIcon size={100} />
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Content Section */}
                <div className="flex-[1.2] text-center md:text-left">
                    <h1
                        className={`text-5xl md:text-8xl font-black mb-4 bg-gradient-to-r bg-clip-text text-transparent ${
                            isDarkTheme ? 'from-white to-blue-200' : 'from-[#1c4b82] to-[#4facfe]'
                        }`}
                        style={{ fontFamily: "'Cinzel', serif" }}
                    >
                        {mascota?.name}
                    </h1>

                    <div className={`inline-block px-5 py-2 bg-white/30 border border-white/40 rounded-full font-bold uppercase tracking-widest text-sm mb-8 ${
                        isDarkTheme ? 'text-white' : 'text-[#1c4b82]'
                    }`}>
                        {mascota?.birth_date ? new Date(mascota.birth_date).getFullYear() : '...'} — {mascota?.death_date ? new Date(mascota.death_date).getFullYear() : '...'} • ÁNGEL GUARDIÁN
                    </div>

                    <p className={`text-xl md:text-2xl font-medium leading-[1.8] mb-12 ${
                        isDarkTheme ? 'text-white/90' : 'text-blue-900/80'
                    }`}>
                        {memorial.msg_despedida || t.philosophy_text}
                    </p>

                    <div className="relative group w-fit mx-auto md:mx-0">
                        <button
                            onClick={() => setSentKisses(prev => prev + 1)}
                            className={`px-10 py-5 rounded-full text-lg font-bold shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 ${
                                isDarkTheme
                                    ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                                    : 'bg-white text-[#1c4b82]'
                            }`}
                        >
                            <motion.span animate={sentKisses > 0 ? { rotate: [0, 20, -20, 0] } : {}} transition={{ duration: 0.5 }}>
                                <Heart size={24} className={sentKisses > 0 ? "fill-pink-400 text-pink-400" : "fill-blue-400 text-blue-400"} />
                            </motion.span>
                            {sentKisses > 0 ? `RECIBIDO EN EL CIELO (${sentKisses})` : 'ENVIAR UN BESO AL CIELO'}
                        </button>
                        {sentKisses > 0 && (
                            <AnimatePresence>
                                <motion.div
                                    key={sentKisses}
                                    initial={{ y: 0, opacity: 1, scale: 1 }}
                                    animate={{ y: -200, opacity: 0, scale: 1.5 }}
                                    className="absolute left-1/2 -translate-x-1/2 pointer-events-none text-3xl"
                                >
                                    ✨
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
