"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Flame, Flower2 } from 'lucide-react';

interface ReactionType {
    key: string;
    icon: React.ReactNode;
    activeIcon: React.ReactNode;
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
}

interface MemorialReactionsProps {
    memorialId: string;
    memorial?: any;
    themeConfig?: any;
    locale?: string;
    className?: string;
}

export default function MemorialReactions({
    memorialId,
    memorial,
    themeConfig,
    locale = 'es',
    className = ''
}: MemorialReactionsProps) {
    const STORAGE_KEY = `memorial_reactions_${memorialId}`;

    const reactionTypes: ReactionType[] = [
        {
            key: 'candle',
            icon: <Flame size={18} />,
            activeIcon: <Flame size={18} fill="currentColor" />,
            label: locale === 'es' ? 'Vela' : 'Candle',
            color: 'text-amber-400',
            bgColor: 'bg-amber-400/10 hover:bg-amber-400/20',
            borderColor: 'border-amber-400/20',
        },
        {
            key: 'flower',
            icon: <Flower2 size={18} />,
            activeIcon: <Flower2 size={18} fill="currentColor" />,
            label: locale === 'es' ? 'Flor' : 'Flower',
            color: 'text-pink-400',
            bgColor: 'bg-pink-400/10 hover:bg-pink-400/20',
            borderColor: 'border-pink-400/20',
        },
        {
            key: 'heart',
            icon: <Heart size={18} />,
            activeIcon: <Heart size={18} fill="currentColor" />,
            label: locale === 'es' ? 'Amor' : 'Love',
            color: 'text-red-400',
            bgColor: 'bg-red-400/10 hover:bg-red-400/20',
            borderColor: 'border-red-400/20',
        },
    ];

    const [counts, setCounts] = useState<Record<string, number>>({ candle: 0, flower: 0, heart: 0 });
    const [userReacted, setUserReacted] = useState<Record<string, boolean>>({ candle: false, flower: false, heart: false });
    const [burstKey, setBurstKey] = useState<string | null>(null);

    // Load from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                setCounts(data.counts || { candle: 0, flower: 0, heart: 0 });
                setUserReacted(data.userReacted || { candle: false, flower: false, heart: false });
            } else {
                // Seed some initial counts for social proof
                const seed = {
                    candle: Math.floor(Math.random() * 20) + 5,
                    flower: Math.floor(Math.random() * 15) + 3,
                    heart: Math.floor(Math.random() * 30) + 10,
                };
                setCounts(seed);
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ counts: seed, userReacted: { candle: false, flower: false, heart: false } }));
            }
        } catch { }
    }, [STORAGE_KEY]);

    const handleReaction = useCallback((key: string) => {
        setCounts(prev => {
            const newCounts = { ...prev, [key]: prev[key] + 1 };
            setUserReacted(prevR => {
                const newReacted = { ...prevR, [key]: true };
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify({ counts: newCounts, userReacted: newReacted }));
                } catch { }
                return newReacted;
            });
            return newCounts;
        });
        setBurstKey(key);
        setTimeout(() => setBurstKey(null), 800);
    }, [STORAGE_KEY]);

    return (
        <div className={`flex items-center gap-2 md:gap-3 ${className}`}>
            {reactionTypes.map((reaction) => (
                <motion.button
                    key={reaction.key}
                    onClick={() => handleReaction(reaction.key)}
                    whileTap={{ scale: 0.9 }}
                    className={`relative flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-2xl border backdrop-blur-sm transition-all duration-300
                        ${userReacted[reaction.key]
                            ? `${reaction.bgColor} ${reaction.borderColor} ${reaction.color}`
                            : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10'
                        }`}
                >
                    {/* Burst animation */}
                    <AnimatePresence>
                        {burstKey === reaction.key && (
                            <motion.div
                                initial={{ scale: 0.5, opacity: 1 }}
                                animate={{ scale: 2.5, opacity: 0 }}
                                exit={{ opacity: 0 }}
                                className={`absolute inset-0 rounded-2xl ${reaction.bgColor} pointer-events-none`}
                            />
                        )}
                    </AnimatePresence>

                    <span className="relative z-10">
                        {userReacted[reaction.key] ? reaction.activeIcon : reaction.icon}
                    </span>
                    <span className="relative z-10 text-[10px] md:text-xs font-bold tabular-nums">
                        {counts[reaction.key]}
                    </span>
                </motion.button>
            ))}
        </div>
    );
}
