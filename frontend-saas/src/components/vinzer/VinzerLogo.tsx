'use client';

import React from 'react';

export function VinzerLogo({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
    const heights = {
        sm: 'h-16 md:h-20',
        md: 'h-16 md:h-20',
        lg: 'h-24 md:h-30'
    }[size];

    return (
        <div className={`flex items-center ${className}`}>
            <img
                src="https://i.postimg.cc/jj4m8gtJ/Logo-Vinzerv2.webp"
                alt="Vinzer"
                className={`${heights} w-auto object-contain`}
            />
        </div>
    );
}
