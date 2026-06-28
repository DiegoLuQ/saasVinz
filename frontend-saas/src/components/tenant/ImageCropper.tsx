"use client";

import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/tenant/imageUtils';

interface ImageCropperProps {
    image: string;
    aspect: number;
    onCropComplete: (croppedBlob: Blob) => void;
    onCancel: () => void;
    title?: string;
    cropShape?: 'rect' | 'round';
    showAspectSelector?: boolean;
}

export default function ImageCropper({
    image,
    aspect: initialAspect,
    onCropComplete,
    onCancel,
    title = "Recortar Imagen",
    cropShape = 'rect',
    showAspectSelector = true
}: ImageCropperProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [currentAspect, setCurrentAspect] = useState(initialAspect);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    const onCropChange = useCallback((crop: any) => {
        setCrop(crop);
    }, []);

    const onZoomChange = useCallback((zoom: any) => {
        setZoom(zoom);
    }, []);

    const onCropCompleteCallback = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleConfirm = async () => {
        try {
            const croppedImage = await getCroppedImg(image, croppedAreaPixels);
            if (croppedImage) {
                onCropComplete(croppedImage);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onCancel}></div>
            <div className="relative w-full max-w-2xl bg-[#0f172a] rounded-2xl sm:rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[90dvh] sm:h-[80vh] max-h-[90dvh]">
                <div className="p-4 sm:p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                    <h3 className="text-base sm:text-xl font-bold truncate pr-2">{title}</h3>
                    <button onClick={onCancel} className="text-muted-foreground hover:text-white transition-colors shrink-0 p-1.5 -m-1.5" aria-label="Cerrar recorte">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 relative bg-black/20 min-h-0">
                    <Cropper
                        image={image}
                        crop={crop}
                        zoom={zoom}
                        aspect={currentAspect}
                        onCropChange={onCropChange}
                        onCropComplete={onCropCompleteCallback}
                        onZoomChange={onZoomChange}
                        cropShape={cropShape}
                    />
                </div>

                <div className="p-4 sm:p-6 lg:p-8 border-t border-white/5 space-y-4 sm:space-y-6 shrink-0 overflow-y-auto">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
                        <div className="flex-1 space-y-2 sm:space-y-4">
                            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">Zoom</label>
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-labelledby="Zoom"
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>

                        {showAspectSelector && (
                            <div className="space-y-2 sm:space-y-4">
                                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">Proporción (Aspect Ratio)</label>
                                <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
                                    <button
                                        onClick={() => setCurrentAspect(1)}
                                        className={`flex-1 px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all ${currentAspect === 1 ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-white'}`}
                                    >
                                        1:1
                                    </button>
                                    <button
                                        onClick={() => setCurrentAspect(16 / 9)}
                                        className={`flex-1 px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all ${currentAspect === 16 / 9 ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-white'}`}
                                    >
                                        16:9
                                    </button>
                                    <button
                                        onClick={() => setCurrentAspect(undefined as any)}
                                        className={`flex-1 px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all ${!currentAspect ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-white'}`}
                                    >
                                        Libre
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 transition-all pt-2">
                        <button
                            onClick={onCancel}
                            className="bg-white/5 hover:bg-white/10 text-foreground font-bold min-h-[44px] py-3 px-8 rounded-2xl transition-all text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="bg-primary text-primary-foreground font-bold min-h-[44px] py-3 px-8 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all text-sm"
                        >
                            Confirmar Recorte
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
