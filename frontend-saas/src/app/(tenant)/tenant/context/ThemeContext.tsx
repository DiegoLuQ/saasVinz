"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ActiveTheme = 'light' | 'dark';
type ThemeMode = 'auto' | 'light' | 'dark';

interface ThemeContextType {
    activeTheme: ActiveTheme;
    themeMode: ThemeMode;
    toggleTheme: () => void;
    setThemeMode: (mode: ThemeMode) => void;
    // Compatibilidad retroactiva
    colorScheme: string;
    setColorScheme: (scheme: any) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}

interface ThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const [activeTheme, setActiveTheme] = useState<ActiveTheme>('light');
    const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('theme-mode-override');
        if (saved === 'dark' || saved === 'light' || saved === 'auto') {
            const resolved = saved === 'dark' ? 'dark' : 'light';
            setActiveTheme(resolved);
            setThemeModeState(saved as ThemeMode);
            document.documentElement.setAttribute('data-mode', resolved);
        } else {
            setActiveTheme('light');
            setThemeModeState('light');
            document.documentElement.setAttribute('data-mode', 'light');
        }
        document.documentElement.removeAttribute('data-theme');
        setMounted(true);
    }, []);

    const setThemeMode = (mode: ThemeMode) => {
        setThemeModeState(mode);
        const resolved: ActiveTheme = mode === 'dark' ? 'dark' : 'light';
        setActiveTheme(resolved);
        localStorage.setItem('theme-mode-override', mode);
        document.documentElement.setAttribute('data-mode', resolved);
        document.documentElement.removeAttribute('data-theme');
    };

    const toggleTheme = () => {
        const next: ActiveTheme = activeTheme === 'light' ? 'dark' : 'light';
        setThemeMode(next);
    };

    return (
        <ThemeContext.Provider
            value={{
                activeTheme,
                themeMode,
                toggleTheme,
                setThemeMode,
                colorScheme: activeTheme,
                setColorScheme: () => {}
            }}
        >
            <div className={mounted ? '' : 'invisible'}>
                {children}
            </div>
        </ThemeContext.Provider>
    );
}
