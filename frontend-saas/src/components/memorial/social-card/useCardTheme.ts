import { useMemo } from 'react';

// Helper to detect brightness
const isColorDark = (hex?: string) => {
    if (!hex) return false;
    try {
        const color = hex.replace('#', '');
        if (color.length < 6) return false;
        const r = parseInt(color.substring(0, 2), 16);
        const g = parseInt(color.substring(2, 4), 16);
        const b = parseInt(color.substring(4, 6), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness < 128;
    } catch (e) { return false; }
};

interface UseCardThemeProps {
    memorial: any;
    layoutType: string;
    ratio: string;
}

export function useCardTheme({ memorial, layoutType, ratio }: UseCardThemeProps) {
    const isEditorial = layoutType === 'editorial';
    const isCarta = layoutType === 'carta';
    const isAltar = layoutType === 'altar';
    const isStories = ratio === '9:16';
    const isPost = ratio === '3:4';

    const tema = memorial?.diseno?.tema || 'claro';
    const customBg = memorial?.diseno?.color_fondo;
    const isDark = tema !== 'claro' || (customBg && isColorDark(customBg));

    // Theme background colors — must match the public memorial page exactly
    const themeBgColors: Record<string, string> = {
        claro: '#faf9f6',
        oscuro: '#0a192f',
        esmeralda: '#064e3b',
        dorado: '#451a03',
        rosado: '#500724',
        safiro: '#1e3a8a',
        orange: '#7c2d12',
    };

    // Determine Background Color: custom > theme > fallback
    let bgColor = customBg || themeBgColors[tema] || (isDark ? '#0a192f' : '#faf9f6');
    if (isEditorial && !customBg && tema === 'claro') bgColor = '#FDFCF9';
    if (isCarta && !customBg && tema === 'claro') bgColor = '#fffcf5';
    if (isAltar) bgColor = '#111111'; // Fixed dark background for Altar Solemne share card

    return {
        bgColor,
        isEditorial,
        isCarta,
        isAltar,
        isStories,
        isPost,
        isDark,
        isColorDark
    };
}
