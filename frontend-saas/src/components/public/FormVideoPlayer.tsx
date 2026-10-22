"use client";

import React from 'react';
import { type FormVideo } from '@/lib/publicFormConfig';

/** Reproductor del video de bienvenida: archivo propio o reproductor de Vimeo / Cloudflare Stream. */
export default function FormVideoPlayer({ video, autoPlay = true, className = '' }: { video: FormVideo; autoPlay?: boolean; className?: string }) {
    if (video.source === 'upload') {
        return (
            <video
                src={video.url}
                controls
                playsInline
                autoPlay={autoPlay}
                preload="metadata"
                className={`w-full max-h-[60vh] rounded-2xl bg-black ${className}`}
            />
        );
    }
    const sep = video.url.includes('?') ? '&' : '?';
    const src = video.source === 'vimeo'
        ? `${video.url}${sep}dnt=1&title=0&byline=0&portrait=0${autoPlay ? '&autoplay=1' : ''}`
        : `${video.url}${autoPlay ? `${sep}autoplay=true` : ''}`;
    return (
        <div className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-black ${className}`}>
            <iframe
                src={src}
                title="Video de bienvenida"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                allowFullScreen
                className="absolute inset-0 w-full h-full border-0"
            />
        </div>
    );
}
