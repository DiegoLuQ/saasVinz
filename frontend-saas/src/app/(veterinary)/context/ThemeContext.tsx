"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type VeterinaryTheme = 'esmeralda' | 'oceano' | 'atardecer' | 'oro' | 'monocromo';

interface ThemeContextType {
    activeTheme: VeterinaryTheme;
    setTheme: (theme: VeterinaryTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useVetTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useVetTheme must be used within VeterinaryThemeProvider');
    }
    return context;
}

export function VeterinaryThemeProvider({ children }: { children: ReactNode }) {
    const [activeTheme, setActiveTheme] = useState<VeterinaryTheme>('esmeralda');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        console.log('VeterinaryThemeProvider mounted');
        const savedTheme = localStorage.getItem('vet-theme') as VeterinaryTheme;
        if (savedTheme) {
            setActiveTheme(savedTheme);
        }
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        // Updates the data-theme attribute on <html> element or body
        // Since we are inside a layout, manipulating document.documentElement is global, 
        // but for a subdomain app it's fine.
        if (activeTheme === 'esmeralda') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', activeTheme);
        }

        // Optional: Save to local storage
        localStorage.setItem('vet-theme', activeTheme);

    }, [activeTheme, mounted]);

    const setTheme = (theme: VeterinaryTheme) => {
        setActiveTheme(theme);
    };

    return (
        <ThemeContext.Provider value={{ activeTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
