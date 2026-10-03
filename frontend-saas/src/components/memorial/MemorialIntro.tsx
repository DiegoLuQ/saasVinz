"use client";

import { useEffect, useState, useSyncExternalStore } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

/** "copito-de-nieve" -> "Copito De Nieve" */
function prettifyName(raw: string): string {
    let clean = raw || '';
    try { clean = decodeURIComponent(clean); } catch { /* slug mal formado */ }
    return clean
        .replace(/-/g, ' ')
        .trim()
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

const noopSubscribe = () => () => {};
const readEnglish = () => {
    try { return localStorage.getItem('preferred_locale') === 'en'; } catch { return false; }
};

// Intro leve y cálida al entrar al memorial: una luz de vela que se enciende,
// el nombre de la mascota y un fundido suave hacia el altar. Se muestra en cada
// visita, corre en paralelo a la carga de datos y se puede saltar con un toque.
export default function MemorialIntro({ petSlug }: { petSlug: string }) {
    const reduceMotion = useReducedMotion();
    const [visible, setVisible] = useState(true);
    const english = useSyncExternalStore(noopSubscribe, readEnglish, () => false);
    const name = prettifyName(petSlug);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(false), reduceMotion ? 1200 : 2800);
        return () => clearTimeout(timer);
    }, [reduceMotion]);

    // Sin scroll mientras la intro cubre la página
    useEffect(() => {
        if (!visible) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [visible]);

    useEffect(() => {
        if (!visible) return;
        const skip = () => setVisible(false);
        window.addEventListener('keydown', skip);
        return () => window.removeEventListener('keydown', skip);
    }, [visible]);

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    key="memorial-intro"
                    className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden cursor-pointer select-none"
                    style={{ background: 'radial-gradient(ellipse at center, #3b2414 0%, #1c110a 55%, #0e0805 100%)' }}
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, filter: reduceMotion ? 'none' : 'blur(6px)' }}
                    transition={{ duration: reduceMotion ? 0.4 : 1.1, ease: 'easeInOut' }}
                    onClick={() => setVisible(false)}
                    aria-hidden="true"
                >
                    {/* Halo de luz cálida */}
                    <motion.div
                        className="absolute rounded-full pointer-events-none"
                        style={{
                            width: '70vmin',
                            height: '70vmin',
                            background: 'radial-gradient(circle, rgba(251,191,36,0.28) 0%, rgba(245,158,11,0.10) 40%, transparent 70%)',
                            filter: 'blur(20px)',
                        }}
                        initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.6 }}
                        animate={reduceMotion
                            ? { opacity: 1 }
                            : { opacity: [0, 1, 0.85, 1], scale: [0.6, 1, 1.04, 1] }}
                        transition={{ duration: reduceMotion ? 0.4 : 2.6, ease: 'easeOut' }}
                    />

                    {/* Llama de vela */}
                    <motion.div
                        className="relative mb-8 pointer-events-none"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: reduceMotion ? 0.3 : 1, ease: 'easeOut' }}
                    >
                        <motion.div
                            className="w-3 h-6 rounded-[50%_50%_50%_50%/60%_60%_40%_40%]"
                            style={{
                                background: 'radial-gradient(ellipse at 50% 70%, #fff7e0 0%, #fcd34d 45%, #f59e0b 80%, transparent 100%)',
                                boxShadow: '0 0 24px 8px rgba(251,191,36,0.35)',
                            }}
                            animate={reduceMotion ? undefined : { scaleY: [1, 1.08, 0.96, 1.05, 1], rotate: [0, 1.5, -1, 0.5, 0] }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                        />
                    </motion.div>

                    <motion.p
                        className="relative text-[11px] sm:text-xs uppercase tracking-[0.4em] text-amber-200/70"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: reduceMotion ? 0 : 0.5, duration: reduceMotion ? 0.3 : 0.9, ease: 'easeOut' }}
                    >
                        {english ? 'In loving memory of' : 'En memoria de'}
                    </motion.p>

                    {name && (
                        <motion.h1
                            className="relative mt-3 px-6 text-center text-4xl sm:text-6xl italic"
                            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: '#f6e7c8', textShadow: '0 0 30px rgba(251,191,36,0.25)' }}
                            initial={{ opacity: 0, y: 10, letterSpacing: reduceMotion ? '0em' : '0.08em' }}
                            animate={{ opacity: 1, y: 0, letterSpacing: '0em' }}
                            transition={{ delay: reduceMotion ? 0 : 0.8, duration: reduceMotion ? 0.3 : 1.3, ease: 'easeOut' }}
                        >
                            {name}
                        </motion.h1>
                    )}

                    <motion.div
                        className="relative mt-6 h-px w-24 bg-gradient-to-r from-transparent via-amber-300/50 to-transparent"
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ delay: reduceMotion ? 0 : 1.2, duration: reduceMotion ? 0.3 : 1, ease: 'easeOut' }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
