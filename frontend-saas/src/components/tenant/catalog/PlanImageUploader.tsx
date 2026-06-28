"use client";

import React, { useRef, useState, useCallback } from 'react';
import { ImagePlus, Loader2, Trash2, AlertCircle, Crop } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { getImageUrl } from '@/lib/tenant/api';

interface PlanImageUploaderProps {
    imageUrl?: string | null;
    onChange: (file: File | null) => void;
    onClearUrl: () => void;
}

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

// Helper para recortar la imagen usando HTML5 Canvas
const getCroppedImg = (imageSrc: string, pixelCrop: any, fileName: string): Promise<File> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = imageSrc;
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = pixelCrop.width;
            canvas.height = pixelCrop.height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('No se pudo obtener el contexto 2D del canvas'));
                return;
            }

            ctx.drawImage(
                image,
                pixelCrop.x,
                pixelCrop.y,
                pixelCrop.width,
                pixelCrop.height,
                0,
                0,
                pixelCrop.width,
                pixelCrop.height
            );

            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('El canvas está vacío'));
                    return;
                }
                const file = new File([blob], fileName, { type: 'image/jpeg' });
                resolve(file);
            }, 'image/jpeg', 0.9);
        };
        image.onerror = (err) => reject(err);
    });
};

export default function PlanImageUploader({ imageUrl, onChange, onClearUrl }: PlanImageUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);

    // Crop State
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
    const [tempFileName, setTempFileName] = useState('plan_image.jpg');
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    // Local Preview State
    const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

    const onCropComplete = useCallback((_: any, croppedPixels: any) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        const file = e.target.files?.[0];
        if (!file) return;

        if (!ALLOWED_TYPES.includes(file.type)) {
            setError('Formato no permitido. Solo JPG, JPEG o PNG.');
            return;
        }
        if (file.size > MAX_BYTES) {
            setError('La imagen supera los 8MB.');
            return;
        }

        setTempFileName(file.name);
        const reader = new FileReader();
        reader.addEventListener('load', () => {
            setTempImageSrc(reader.result as string);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setCropModalOpen(true);
        });
        reader.readAsDataURL(file);
        
        // Reset value to allow choosing same file
        e.target.value = '';
    };

    const handleConfirmCrop = async () => {
        if (!tempImageSrc || !croppedAreaPixels) return;

        try {
            const croppedFile = await getCroppedImg(tempImageSrc, croppedAreaPixels, tempFileName);
            
            // Crear URL de vista previa local
            const previewUrl = URL.createObjectURL(croppedFile);
            setLocalPreviewUrl(previewUrl);
            
            // Pasar archivo recortado al padre (no se sube al servidor hasta guardar el formulario)
            onChange(croppedFile);
            setCropModalOpen(false);
            setTempImageSrc(null);
        } catch (e: any) {
            setError('Error al recortar la imagen: ' + (e.message || e));
        }
    };

    const handleRemoveImage = () => {
        setLocalPreviewUrl(null);
        onClearUrl();
        onChange(null);
    };

    const currentDisplayUrl = localPreviewUrl || (imageUrl ? getImageUrl(imageUrl) : null);

    return (
        <div className="flex flex-col items-center gap-3 py-2 w-full">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider self-center text-center">
                Imagen del plan <span className="text-muted-foreground/40 normal-case font-medium">(opcional · 1:1)</span>
            </label>

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handleFileSelect}
            />

            <div className="w-full max-w-[350px] aspect-square">
                {currentDisplayUrl ? (
                    <div className="relative group/img w-full h-full rounded-2xl overflow-hidden border border-white/10 bg-black/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={currentDisplayUrl} alt="Imagen del plan" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/55 transition-all flex items-center justify-center gap-2 opacity-0 group-hover/img:opacity-100">
                            <button
                                type="button"
                                onClick={() => inputRef.current?.click()}
                                className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm"
                            >
                                <ImagePlus size={13} />
                                Cambiar
                            </button>
                            <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="px-3 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5"
                            >
                                <Trash2 size={13} /> Quitar
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="w-full h-full rounded-2xl border-2 border-dashed border-white/10 hover:border-amber-500/40 bg-black/10 hover:bg-amber-500/[0.03] transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground/50 hover:text-amber-400/70"
                    >
                        <ImagePlus size={28} />
                        <span className="text-sm font-bold">Subir imagen</span>
                        <span className="text-[10px] text-muted-foreground/40">JPG, JPEG o PNG · Recorte 1:1</span>
                    </button>
                )}
            </div>

            {error && (
                <p className="text-[10px] text-red-400 flex items-center gap-1.5">
                    <AlertCircle size={11} /> {error}
                </p>
            )}

            {/* Modal para Recortar Imagen */}
            {cropModalOpen && tempImageSrc && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-[#121214] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-5 border-b border-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Crop className="text-amber-500" size={18} />
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recortar Imagen 1:1</h3>
                            </div>
                            <button 
                                type="button"
                                onClick={() => {
                                    setCropModalOpen(false);
                                    setTempImageSrc(null);
                                }}
                                className="text-muted-foreground hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                        
                        {/* Area de Recorte */}
                        <div className="relative w-full h-[320px] bg-black/40">
                            <Cropper
                                image={tempImageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                            />
                        </div>

                        {/* Controles de Zoom */}
                        <div className="p-5 space-y-5 bg-[#121214]">
                            <div className="flex flex-col gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Zoom</span>
                                <input
                                    type="range"
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    value={zoom}
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full accent-amber-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                            
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCropModalOpen(false);
                                        setTempImageSrc(null);
                                    }}
                                    className="px-5 py-2.5 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 transition-all text-xs font-bold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmCrop}
                                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-xs hover:shadow-lg hover:shadow-amber-500/20 active:scale-95 transition-all"
                                >
                                    Aplicar Recorte
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
