import { useState, useRef, useCallback, useEffect } from 'react';
import { toPng } from 'html-to-image';

interface UseSocialCardGeneratorProps {
    fileNamePrefix?: string;
    metrics?: {
        ratio: '9:16' | '3:4';
    };
}

export function useSocialCardGenerator({ fileNamePrefix = 'memorial', metrics }: UseSocialCardGeneratorProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fontCSSRef = useRef<string>('');

    // Load fonts once on mount
    useEffect(() => {
        const loadFonts = async () => {
            if (fontCSSRef.current) return;
            try {
                const response = await fetch("https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Marcellus&family=Outfit:wght@300;600&family=Cormorant+Garamond:ital,wght@0,300;0,600;1,400&family=Montserrat:wght@300;600&family=Pinyon+Script&display=swap");
                fontCSSRef.current = await response.text();
            } catch (err) {
                console.warn('Failed to preload fonts for social card generator:', err);
            }
        };
        loadFonts();
    }, []);

    const getProxiedUrl = useCallback((url?: string) => {
        if (!url) return '';
        if (url.startsWith('data:')) return url;
        if (url.startsWith('/')) return url; // Local assets
        // If already proxied, don't double proxy
        if (url.includes('/api/image-proxy')) return url;

        return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    }, []);

    const generateCard = useCallback(async (element: HTMLElement) => {
        if (!element) return;
        setIsGenerating(true);
        setError(null);

        try {
            // 1. Wait for a moment to ensure rendering is stable
            await new Promise(resolve => setTimeout(resolve, 500));

            // 2. Pre-load all images within the element
            const images = Array.from(element.getElementsByTagName('img'));
            await Promise.all(images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve; // Continue even if one fails
                });
            }));

            // 3. Configure dimensions
            const ratio = metrics?.ratio || '9:16';
            const baseWidth = ratio === '9:16' ? 320 : 400;
            const baseHeight = ratio === '9:16' ? 569 : 533;
            // High resolution export (1080p width)
            const targetWidth = 1080;
            const pixelRatio = targetWidth / baseWidth;

            // 4. Generate Image
            const dataUrl = await toPng(element, {
                cacheBust: true,
                quality: 1.0,
                pixelRatio: pixelRatio,
                width: baseWidth,
                height: baseHeight,
                backgroundColor: '#ffffff',
                fontEmbedCSS: fontCSSRef.current || undefined,
                style: {
                    visibility: 'visible',
                    opacity: '1',
                    transform: 'none',
                },
                filter: (node) => {
                    // Exclude potential interfering scripts or styles
                    const tagName = (node as HTMLElement).tagName;
                    return tagName !== 'SCRIPT' && tagName !== 'IFRAME';
                }
            });

            // 5. Trigger Download
            const link = document.createElement('a');
            link.download = `${fileNamePrefix}_${new Date().getTime()}.png`;
            link.href = dataUrl;
            link.click();

        } catch (err) {
            console.error('Social Card Generation failed:', err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsGenerating(false);
        }
    }, [fileNamePrefix, metrics?.ratio]);

    return {
        generateCard,
        isGenerating,
        error,
        getProxiedUrl
    };
}
