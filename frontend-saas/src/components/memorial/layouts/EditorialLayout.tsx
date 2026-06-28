import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart,
    Check,
    Flower2
} from 'lucide-react';
import MemorialActionButtons from '@/components/memorial/MemorialActionButtons';

export default function EditorialLayout(props: any) {
    const {
        memorial, mascota, randomMainImage, t, themeConfig,
        onSendKiss, onShare, tenant_info, locale
    } = props;
    const [depositedFlower, setDepositedFlower] = useState(false);
    const [roses, setRoses] = useState<any[]>([]);

    const leaveRose = () => {
        setDepositedFlower(true);
        const newRoses = Array.from({ length: 12 }).map((_, i) => ({
            id: Date.now() + i,
            x: Math.random() * 200 - 100,
            delay: Math.random() * 1000
        }));
        setRoses(newRoses);
    };
    return (
        <div
            className="relative z-10 min-h-screen flex items-center justify-center mt-0 py-24 px-4"
            style={memorial?.diseno?.portada_url ? { backgroundImage: `url(${memorial.diseno.portada_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        >
            {/* Overlay for portada readability */}
            {memorial?.diseno?.portada_url && (
                <div className="absolute inset-0 bg-black/45 z-0" />
            )}
            <div className="max-w-[1200px] w-[90%] min-h-[80vh] grid grid-cols-1 md:grid-cols-2 gap-16 items-center relative z-10">

                {/* Visual Column */}
                <div className="relative flex justify-center items-center">
                    <div className="absolute w-[80%] h-[80%] bg-[radial-gradient(circle,rgba(255,220,150,0.3)_0%,rgba(255,255,255,0)_70%)] blur-[40px] animate-pulse-slow" />
                    <div className="relative w-full max-w-[420px] aspect-[4/5] rounded-[210px_210px_20px_20px] overflow-hidden p-2 shadow-2xl border border-white/20 bg-white/5 backdrop-blur-sm">
                        <div className="w-full h-full bg-black rounded-[205px_205px_15px_15px] overflow-hidden relative border border-black/30">
                            {randomMainImage ? (
                                <img src={randomMainImage} className="w-full h-full object-cover sepia-[0.1] contrast-[1.05] brightness-[0.95] transition-transform duration-[10000ms] hover:scale-110" alt={mascota?.name} />
                            ) : (
                                <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                                    <Heart size={64} className="text-amber-500/20" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Text Column */}
                <div className={`flex flex-col justify-center py-8 ${themeConfig.text} ${
                    memorial?.diseno?.portada_url 
                        ? 'bg-black/40 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-white/10 shadow-2xl' 
                        : ''
                }`}>
                    <div className="text-center mb-8 pb-4 border-b border-current/10 w-fit mx-auto">
                        <span className="text-[0.7rem] uppercase tracking-[0.4em] opacity-50">Memorial Issue • Vol. IV</span>
                    </div>

                    <h1 className="text-6xl md:text-8xl font-serif text-center mb-4 leading-none tracking-tight"
                        style={{
                            fontFamily: "'Cinzel', serif",
                            textShadow: memorial?.diseno?.portada_url 
                                ? '0 2px 10px rgba(0,0,0,0.8), 0 0 30px rgba(0,0,0,0.4)' 
                                : '0 10px 30px rgba(0,0,0,0.2)'
                        }}>
                        {mascota?.name}
                    </h1>

                    <div className="text-center text-2xl md:text-3xl mb-12 opacity-80" style={{ fontFamily: "'Pinyon Script', cursive" }}>
                        {mascota?.birth_date ? new Date(mascota.birth_date).getFullYear() : '...'} — {mascota?.death_date ? new Date(mascota.death_date).getFullYear() : '...'}
                    </div>

                    <div className="text-[1.1rem] md:text-[1.25rem] leading-[2] text-justify relative mb-16 px-4 font-serif opacity-90 italic">
                        <span className="float-left text-[5rem] leading-[0.7] pr-4 pt-2 text-[#c5a059]" style={{ fontFamily: "'Cinzel', serif" }}>
                            {memorial.msg_despedida?.[0] || 'E'}
                        </span>
                        {memorial.msg_despedida?.substring(1) || t.philosophy_text}
                    </div>

                    <div className="flex flex-col items-center gap-12 w-full">
                        <div className="flex justify-center relative w-full">
                            <button
                                onClick={leaveRose}
                                className={`px-10 py-4 border-2 border-[#c5a059] text-[#c5a059] rounded-full uppercase tracking-widest text-xs hover:bg-[#c5a059] hover:text-[#1a1a1a] transition-all duration-500 font-bold flex items-center gap-3 bg-white/5 backdrop-blur-sm shadow-xl ${depositedFlower ? 'pointer-events-none opacity-40 grayscale' : 'hover:-translate-y-1'}`}
                            >
                                {depositedFlower ? (
                                    <><Check size={18} /> {t.mem_flower_deposited || "Flor Depositada"}</>
                                ) : (
                                    <><Flower2 size={18} /> {t.mem_deposit_flower || "Depositar una flor"}</>
                                )}
                            </button>

                            <AnimatePresence>
                                {roses.map((rose) => (
                                    <motion.div
                                        key={rose.id}
                                        initial={{ y: 0, opacity: 1, scale: 1 }}
                                        animate={{ y: -180, opacity: 0, transition: { duration: 3, ease: 'easeOut', delay: rose.delay / 1000 } }}
                                        className="absolute text-3xl pointer-events-none"
                                        style={{ left: `calc(50% + ${rose.x}px)` }}
                                    >
                                        🌹
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* Action Buttons Integration */}
                        <div className="w-full">
                            <MemorialActionButtons
                                onSendKiss={onSendKiss}
                                onShare={onShare}
                                memorial={memorial}
                                mascota={mascota}
                                tenant_info={tenant_info}
                                locale={locale}
                                t={t}
                                mainImage={randomMainImage}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
