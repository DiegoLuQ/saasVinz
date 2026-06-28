"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { apiRequest } from '@/lib/tenant/api';
import { useTenant } from './TenantContext';
import { useSessionBootstrap } from '@/hooks/useSessionBootstrap';
import { useQueryClient } from '@tanstack/react-query';

type ThemeMode = 'auto' | 'light' | 'dark';
type ActiveTheme = 'light' | 'dark';
type ColorScheme = 'esmeralda' | 'oceano' | 'atardecer' | 'monocromo' | 'oro' | 'turquesa' | 'light';

interface ThemeConfig {
    theme_mode: ThemeMode;
    auto_light_start: string;
    auto_light_end: string;
    custom_theme_colors?: Record<string, any>;
}

interface ThemeContextType {
    // Light/Dark mode
    activeTheme: ActiveTheme;
    themeMode: ThemeMode;
    themeConfig: ThemeConfig | null;
    setThemeMode: (mode: ThemeMode) => void;
    updateThemeConfig: (config: Partial<ThemeConfig>) => Promise<void>;
    toggleTheme: () => void;

    // Color scheme
    colorScheme: ColorScheme;
    setColorScheme: (scheme: ColorScheme) => void;
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
    const [themeConfig, setThemeConfig] = useState<ThemeConfig | null>(null);
    const [activeTheme, setActiveTheme] = useState<ActiveTheme>('dark');
    const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
    const [colorScheme, setColorSchemeState] = useState<ColorScheme>('esmeralda');
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();
    const { tenantData } = useTenant();
    const { data: bootstrapData } = useSessionBootstrap();

    // Load theme configuration from bootstrap data
    useEffect(() => {
        if (bootstrapData?.theme) {
            const config = bootstrapData.theme;
            setThemeConfig(config as ThemeConfig);
            setThemeModeState(config.theme_mode as ThemeMode);

            // Check for saved color scheme in database
            const dbScheme = config.custom_theme_colors?.scheme as ColorScheme;
            if (dbScheme && ['esmeralda', 'oceano', 'atardecer', 'monocromo', 'oro', 'turquesa', 'light'].includes(dbScheme)) {
                setColorSchemeState(dbScheme);
            } else {
                // Fallback to localStorage override if not set in DB
                const savedScheme = localStorage.getItem('saasc-admin-theme') as ColorScheme;
                if (savedScheme && ['esmeralda', 'oceano', 'atardecer', 'monocromo', 'oro', 'turquesa', 'light'].includes(savedScheme)) {
                    setColorSchemeState(savedScheme);
                }
            }

            // Check for localStorage override for mode
            const savedMode = localStorage.getItem('theme-mode-override');
            if (savedMode && ['auto', 'light', 'dark'].includes(savedMode)) {
                setThemeModeState(savedMode as ThemeMode);
            }
        }
    }, [bootstrapData]);

    // Initial mounting and local storage scheme
    useEffect(() => {
        // Load color scheme from localStorage as fast layout fallback
        const savedScheme = localStorage.getItem('saasc-admin-theme') as ColorScheme;
        if (savedScheme) {
            setColorSchemeState(savedScheme);
        }

        setMounted(true);
    }, []);

    // Apply light/dark theme to document
    useEffect(() => {
        if (!mounted) return;
        document.documentElement.setAttribute('data-mode', activeTheme);
    }, [activeTheme, mounted]);

    // Apply color scheme to document
    useEffect(() => {
        if (!mounted) return;
        if (colorScheme === 'esmeralda') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', colorScheme);
        }
    }, [colorScheme, mounted]);

    // Automatic theme based on plan
    useEffect(() => {
        if (!mounted || !tenantData?.subscription_plan?.name) return;

        // Manual override check - we allow manual selection to persist
        const manualScheme = localStorage.getItem('saasc-admin-theme-manual');
        if (manualScheme) return;

        const planToScheme: Record<string, ColorScheme> = {
            'FREE': 'oro',
            'NORMAL': 'oceano',
            'PRO': 'atardecer',
            'ULTRA': 'esmeralda'
        };

        const planName = tenantData.subscription_plan.name.toUpperCase();
        const recommendedScheme = planToScheme[planName];

        if (recommendedScheme && recommendedScheme !== colorScheme) {
            setColorSchemeState(recommendedScheme);
        }
    }, [tenantData, mounted]);

    // Auto-switching logic based on time
    useEffect(() => {
        if (themeMode !== 'auto' || !themeConfig) return;

        const checkTime = () => {
            const now = new Date();
            const currentHours = now.getHours();
            const currentMinutes = now.getMinutes();
            const currentTotalMinutes = currentHours * 60 + currentMinutes;

            const { auto_light_start, auto_light_end } = themeConfig;

            // Convert time strings to minutes since midnight
            const parseTime = (timeStr: string) => {
                const [hours, minutes] = timeStr.split(':').map(Number);
                return hours * 60 + minutes;
            };

            const lightStartMinutes = parseTime(auto_light_start);
            const lightEndMinutes = parseTime(auto_light_end);

            // Check if current time is within light theme hours
            const isLightTime = currentTotalMinutes >= lightStartMinutes && currentTotalMinutes < lightEndMinutes;

            console.log('Theme Auto-Switch Check:', {
                currentTime: `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`,
                lightStart: auto_light_start,
                lightEnd: auto_light_end,
                isLightTime,
                willSet: isLightTime ? 'light' : 'dark'
            });

            setActiveTheme(isLightTime ? 'light' : 'dark');
        };

        // Check immediately
        checkTime();

        // Check every minute
        const interval = setInterval(checkTime, 60000);

        return () => clearInterval(interval);
    }, [themeMode, themeConfig]);

    // Manual theme override
    useEffect(() => {
        if (themeMode === 'light') {
            setActiveTheme('light');
        } else if (themeMode === 'dark') {
            setActiveTheme('dark');
        }
        // If 'auto', the auto-switching effect above handles it
    }, [themeMode]);

    const queryClient = useQueryClient();

    const setThemeMode = async (mode: ThemeMode) => {
        setThemeModeState(mode);
        localStorage.setItem('theme-mode-override', mode);

        // Update backend
        try {
            await updateThemeConfig({ theme_mode: mode });
        } catch (error) {
            console.error('Failed to update theme mode:', error);
        }
    };

    const updateThemeConfig = async (updates: Partial<ThemeConfig>) => {
        try {
            const updated = await apiRequest('/api/internal/theme/config', {
                method: 'PATCH',
                body: JSON.stringify(updates)
            });
            setThemeConfig(updated);
            // Invalidate bootstrap to keep everything in sync
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
        } catch (error) {
            console.error('Failed to update theme config:', error);
            throw error;
        }
    };

    const toggleTheme = () => {
        const newTheme: ActiveTheme = activeTheme === 'light' ? 'dark' : 'light';
        setActiveTheme(newTheme);
        // When manually toggling, switch to manual mode
        setThemeMode(newTheme);
    };

    const setColorScheme = (scheme: ColorScheme) => {
        setColorSchemeState(scheme);
        localStorage.setItem('saasc-admin-theme', scheme);
        localStorage.setItem('saasc-admin-theme-manual', 'true'); // Flag to prevent auto-override
        
        // Save to backend database
        updateThemeConfig({
            custom_theme_colors: { scheme }
        }).catch(err => {
            console.error('Failed to save color scheme to database:', err);
        });
    };

    return (
        <ThemeContext.Provider
            value={{
                activeTheme,
                themeMode,
                themeConfig,
                setThemeMode,
                updateThemeConfig,
                toggleTheme,
                colorScheme,
                setColorScheme
            }}
        >
            <div className={mounted ? '' : 'invisible'}>
                {children}
            </div>
        </ThemeContext.Provider>
    );
}
