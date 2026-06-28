
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselProps {
    images: string[];
    transition: 'fade' | 'slide' | 'zoom';
}

export default function Carousel({ images, transition }: CarouselProps) {
    const [index, setIndex] = useState(0);

    // Auto-advance
    useEffect(() => {
        const timer = setInterval(() => {
            nextSlide();
        }, 5000);
        return () => clearInterval(timer);
    }, [index, images.length]);

    const nextSlide = () => {
        setIndex((prev) => (prev + 1) % images.length);
    };

    const prevSlide = () => {
        setIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const variants = {
        enter: (direction: number) => {
            if (transition === 'slide') {
                return { x: direction > 0 ? 1000 : -1000, opacity: 0 };
            } else if (transition === 'zoom') {
                return { scale: 0.5, opacity: 0 };
            }
            return { opacity: 0 };
        },
        center: { zIndex: 1, x: 0, opacity: 1, scale: 1 },
        exit: (direction: number) => {
            if (transition === 'slide') {
                return { zIndex: 0, x: direction < 0 ? 1000 : -1000, opacity: 0 };
            } else if (transition === 'zoom') {
                return { zIndex: 0, scale: 1.5, opacity: 0 };
            }
            return { zIndex: 0, opacity: 0 };
        }
    };

    if (!images || images.length === 0) return null;

    return (
        <div className="relative w-full h-full overflow-hidden bg-[#0a192f]">
            <AnimatePresence initial={false} custom={1}>
                <motion.img
                    key={index}
                    src={images[index]}
                    custom={1}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                        x: { type: "spring", stiffness: 300, damping: 30 },
                        opacity: { duration: 0.5 },
                        scale: { duration: 0.5 }
                    }}
                    className="absolute inset-0 w-full h-full object-cover"
                />
            </AnimatePresence>

            {/* Navigation Arrows */}
            <button
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
                onClick={(e) => { e.preventDefault(); prevSlide(); }}
            >
                <ChevronLeft size={24} />
            </button>
            <button
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
                onClick={(e) => { e.preventDefault(); nextSlide(); }}
            >
                <ChevronRight size={24} />
            </button>

            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {images.map((_, i) => (
                    <button
                        key={i}
                        className={`w-2 h-2 rounded-full transition-all ${i === index ? 'bg-white w-6' : 'bg-white/50'}`}
                        onClick={() => setIndex(i)}
                    />
                ))}
            </div>
        </div>
    );
}
