'use client';

import React, { useRef, useState, useCallback } from 'react';
import { ImagePlus, Trash2, Scissors, Check, X } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';

interface FormFileUploadProps {
    label?: string;
    onFileSelect: (base64: string | null) => void;
    preview: string | null;
    accept?: string;
}

export default function FormFileUpload({
    label, onFileSelect, preview, accept = 'image/*'
}: FormFileUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    // Cropping states
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [showCropper, setShowCropper] = useState(false);

    const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => {
            setImageSrc(reader.result as string);
            setShowCropper(true);
        };
        reader.readAsDataURL(file);
    };

    const generateCroppedImage = async () => {
        if (!imageSrc || !croppedAreaPixels) return;

        const image = new Image();
        image.src = imageSrc;
        await new Promise((resolve) => { image.onload = resolve; });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = croppedAreaPixels.width;
        canvas.height = croppedAreaPixels.height;

        ctx.drawImage(
            image,
            croppedAreaPixels.x,
            croppedAreaPixels.y,
            croppedAreaPixels.width,
            croppedAreaPixels.height,
            0,
            0,
            croppedAreaPixels.width,
            croppedAreaPixels.height
        );

        const base64Image = canvas.toDataURL('image/webp', 0.8);
        onFileSelect(base64Image);
        setShowCropper(false);
        setImageSrc(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        e.target.value = '';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };

    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
                    {label}
                </label>
            )}

            {preview ? (
                <div className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-50 max-w-[200px] mx-auto">
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                        type="button"
                        onClick={() => onFileSelect(null)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-rose-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-rose-600"
                    >
                        <Trash2 size={14} />
                    </button>
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <Scissors size={20} className="text-white" />
                    </div>
                </div>
            ) : (
                <div
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`flex flex-col items-center justify-center gap-3 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 ${dragOver
                        ? 'border-blue-400 bg-blue-50/50'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
                        }`}
                >
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                        <ImagePlus size={20} className="text-blue-400" />
                    </div>
                    <div className="text-center px-4">
                        <p className="text-sm font-medium text-slate-500">
                            Haz clic o arrastra una imagen
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                            Se recortará automáticamente a formato cuadrado
                        </p>
                    </div>
                </div>
            )}

            <input
                ref={inputRef}
                type="file"
                accept={accept}
                onChange={handleChange}
                className="hidden"
            />

            {/* Cropping Modal */}
            <AnimatePresence>
                {showCropper && imageSrc && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Scissors size={18} className="text-blue-500" />
                                    Ajustar Fotografía
                                </h3>
                                <button onClick={() => setShowCropper(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="relative h-80 bg-slate-100">
                                <Cropper
                                    image={imageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1 / 1}
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                />
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                        <span>Zoom</span>
                                        <span>{zoom.toFixed(1)}x</span>
                                    </div>
                                    <input
                                        type="range"
                                        value={zoom}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        aria-labelledby="Zoom"
                                        onChange={(e) => setZoom(Number(e.target.value))}
                                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowCropper(false)}
                                        className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={generateCroppedImage}
                                        className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                                    >
                                        <Check size={14} /> Aplicar Recorte
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
