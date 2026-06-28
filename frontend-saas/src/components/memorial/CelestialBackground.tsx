"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * CelestialBackground
 * Renders animated celestial clouds and twinkling yellow stars.
 * adaptative to light/dark themes via isDark prop.
 */
interface CelestialBackgroundProps {
    isDark?: boolean;
}

const CelestialBackground = ({ isDark = true }: CelestialBackgroundProps) => {
    const [stars, setStars] = useState<any[]>([]);
    const [clouds, setClouds] = useState<any[]>([]);

    useEffect(() => {
        // Generate twinkling yellow stars
        const newStars = Array.from({ length: 40 }).map((_, i) => ({
            id: i,
            left: Math.random() * 100,
            top: Math.random() * 100,
            size: Math.random() * 3 + 1,
            duration: Math.random() * 4 + 2,
            delay: Math.random() * 5
        }));
        setStars(newStars);

        // Generate slow moving clouds
        const newClouds = Array.from({ length: 6 }).map((_, i) => ({
            id: i,
            left: Math.random() * 120 - 10,
            top: Math.random() * 100,
            width: Math.random() * 400 + 300,
            height: Math.random() * 200 + 100,
            duration: Math.random() * 60 + 60,
            delay: -Math.random() * 60,
            opacity: Math.random() * 0.2 + 0.1
        }));
        setClouds(newClouds);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
            {/* Atmosphere Glow - slightly adjusted for theme */}
            <div className={`absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(255,255,255,${isDark ? '0.1' : '0.2'})_0%,_transparent_70%)] opacity-30`} />

            {/* Twinkling Stars (Yellow) */}
            {stars.map((star) => (
                <motion.div
                    key={`star-${star.id}`}
                    initial={{ opacity: 0.1, scale: 0.5 }}
                    animate={{
                        opacity: isDark ? [0.1, 0.7, 0.1] : [0.05, 0.4, 0.05], // Subtle stars in light theme
                        scale: [0.5, 1.2, 0.5],
                        boxShadow: isDark ? [
                            '0 0 0px rgba(255, 230, 100, 0)',
                            '0 0 10px rgba(255, 230, 100, 0.8)',
                            '0 0 0px rgba(255, 230, 100, 0)'
                        ] : []
                    }}
                    transition={{
                        duration: star.duration,
                        repeat: Infinity,
                        delay: star.delay,
                        ease: "easeInOut"
                    }}
                    style={{
                        position: 'absolute',
                        left: `${star.left}%`,
                        top: `${star.top}%`,
                        width: `${star.size}px`,
                        height: `${star.size}px`,
                        borderRadius: '50%',
                        backgroundColor: '#ffec85',
                    }}
                />
            ))}

            {/* Slow Celestial Clouds */}
            {clouds.map((cloud) => (
                <motion.div
                    key={`cloud-${cloud.id}`}
                    initial={{ x: '-100%' }}
                    animate={{ x: '200%' }}
                    transition={{
                        duration: cloud.duration,
                        repeat: Infinity,
                        delay: cloud.delay,
                        ease: "linear"
                    }}
                    style={{
                        position: 'absolute',
                        top: `${cloud.top}%`,
                        width: `${cloud.width}px`,
                        height: `${cloud.height}px`,
                        borderRadius: '100%',
                        backgroundColor: isDark ? 'white' : '#bae6fd', // White in dark, Light Blue in light theme
                        filter: 'blur(100px)',
                        opacity: isDark ? cloud.opacity : cloud.opacity * 1.8, // More visible blue in light theme
                    }}
                />
            ))}
        </div>
    );
};

export default CelestialBackground;
