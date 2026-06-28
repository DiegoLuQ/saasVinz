import type { AspectRatio } from './types';

export const ASPECT_RATIOS: { value: AspectRatio; label: string; w: number; h: number }[] = [
    { value: '9:16', label: '9:16 · Vertical (Stories)', w: 9, h: 16 },
    { value: '3:4', label: '3:4 · Retrato', w: 3, h: 4 },
    { value: '4:3', label: '4:3 · Apaisado', w: 4, h: 3 },
    { value: '1:1', label: '1:1 · Cuadrado', w: 1, h: 1 },
];

export const SAMPLE_PHOTO_URL =
    'https://images.unsplash.com/photo-1546238232-20216dec9f72?auto=format&fit=crop&w=400&q=80';
