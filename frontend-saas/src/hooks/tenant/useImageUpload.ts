"use client";

import { useState, useCallback, useMemo } from 'react';

export interface ImageItem {
    type: 'remote' | 'local';
    url: string;        // display URL (remote path or object URL)
    file?: File;        // only for local items
}

interface UseImageUploadOptions {
    max?: number;
    existing?: string[];
}

/**
 * Unified image management hook.
 * Merges remote (server) and local (File) images into a single `items` array.
 * Eliminates the need for parallel `selectedImages` and `localPreviews` states.
 */
export function useImageUpload({ max = 3, existing = [] }: UseImageUploadOptions = {}) {
    const [remoteImages, setRemoteImages] = useState<string[]>(existing);
    const [localImages, setLocalImages] = useState<{ file: File; preview: string }[]>([]);

    // Single unified list
    const items = useMemo<ImageItem[]>(() => [
        ...remoteImages.map(url => ({ type: 'remote' as const, url })),
        ...localImages.map(item => ({ type: 'local' as const, url: item.preview, file: item.file })),
    ], [remoteImages, localImages]);

    const totalCount = items.length;
    const canAdd = totalCount < max;

    // Sync remote images when cremation data loads (e.g. editing)
    const setExistingImages = useCallback((images: string[]) => {
        setRemoteImages(images);
    }, []);

    // Add a new local image (after cropping)
    const addLocal = useCallback((blob: Blob, filename?: string) => {
        if (!canAdd) return;
        const file = new File([blob], filename || `order_image_${Date.now()}.png`, { type: 'image/png' });
        const preview = URL.createObjectURL(file);
        setLocalImages(prev => [...prev, { file, preview }]);
    }, [canAdd]);

    // Add remote images (e.g. synced from pet profile)
    const addRemote = useCallback((urls: string[]) => {
        setRemoteImages(prev => {
            const newUrls = urls.filter(u => !prev.includes(u));
            const available = max - prev.length - localImages.length;
            if (available <= 0 || newUrls.length === 0) return prev;
            return [...prev, ...newUrls.slice(0, available)];
        });
    }, [max, localImages.length]);

    // Remove by index from the unified list
    const remove = useCallback((index: number) => {
        if (index < remoteImages.length) {
            // It's a remote image
            setRemoteImages(prev => prev.filter((_, i) => i !== index));
        } else {
            // It's a local image
            const localIndex = index - remoteImages.length;
            setLocalImages(prev => {
                const item = prev[localIndex];
                if (item) URL.revokeObjectURL(item.preview);
                return prev.filter((_, i) => i !== localIndex);
            });
        }
    }, [remoteImages.length]);

    // Get all File objects for upload
    const getFiles = useCallback((): File[] => {
        return localImages.map(item => item.file);
    }, [localImages]);

    // Get all remote URLs (for payload)
    const getRemoteUrls = useCallback((): string[] => {
        return remoteImages;
    }, [remoteImages]);

    // Reset after successful save
    const reset = useCallback(() => {
        localImages.forEach(item => URL.revokeObjectURL(item.preview));
        setLocalImages([]);
    }, [localImages]);

    return {
        items,
        totalCount,
        canAdd,
        addLocal,
        addRemote,
        remove,
        setExistingImages,
        getFiles,
        getRemoteUrls,
        reset,
    };
}
