import React, { useCallback, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Crop, ZoomIn, Check, Camera, Plus, Trash2, Star, Sparkles, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../lib/canvasUtils';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    images: File[];
    setImages: (files: File[]) => void;
    petName?: string;
}

const SLOT_TITLES = ['Foto Principal', 'Segundo Recuerdo', 'Tercer Recuerdo'];

export default function ImageUploadStep({ images, setImages, petName }: Props) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Cropping State
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [currentFileName, setCurrentFileName] = useState<string>('recuerdo');

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const processFile = (file: File, slotIndex: number | null = null) => {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setError('Formato no compatible. Por favor sube una imagen JPG, PNG o WEBP.');
            return;
        }

        setError(null);
        setTargetSlotIndex(slotIndex);

        const reader = new FileReader();
        reader.addEventListener('load', () => {
            setImageSrc(reader.result?.toString() || null);
            setCurrentFileName(file.name.split('.')[0]);
            setIsCropModalOpen(true);
            setZoom(1);
            setCrop({ x: 0, y: 0 });
        });
        reader.readAsDataURL(file);
    };

    const handleSlotClick = (index: number) => {
        setTargetSlotIndex(index);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFile(e.target.files[0], targetSlotIndex);
        }
    };

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            const firstEmptySlot = images.length < 3 ? images.length : 0;
            processFile(files[0], firstEmptySlot);
        }
    }, [images]);

    const handleCropSave = async () => {
        if (!imageSrc || !croppedAreaPixels) return;

        try {
            const croppedBlob = (await getCroppedImg(imageSrc, croppedAreaPixels)) as Blob;
            const newFile = new File([croppedBlob], `${currentFileName}_memorial.png`, {
                type: 'image/png',
            });

            if (targetSlotIndex !== null && targetSlotIndex < images.length) {
                // Reemplazar slot específico
                const updated = [...images];
                updated[targetSlotIndex] = newFile;
                setImages(updated);
            } else {
                // Agregar al final
                if (images.length < 3) {
                    setImages([...images, newFile]);
                }
            }

            handleCloseModal();
        } catch (e) {
            console.error(e);
            setError('Error al recortar la imagen.');
        }
    };

    const handleCloseModal = () => {
        setIsCropModalOpen(false);
        setImageSrc(null);
        setTargetSlotIndex(null);
    };

    const removeImage = (index: number) => {
        const newImages = [...images];
        newImages.splice(index, 1);
        setImages(newImages);
        setError(null);
    };

    return (
        <div 
            className="space-y-4"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
            />

            {/* Cabecera de la Galería */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <Camera size={15} />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                            Portarretratos del Homenaje
                        </h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                            Sube hasta 3 fotos especiales para su certificado y memorial
                        </p>
                    </div>
                </div>

                <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-1 rounded-full border border-amber-200/60 dark:border-amber-900/30 self-start sm:self-center">
                    {images.length} de 3 enmarcadas
                </div>
            </div>

            {error && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs rounded-xl text-center font-semibold">
                    {error}
                </div>
            )}

            {/* Grid de 3 Marcos Grandes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[0, 1, 2].map((index) => {
                    const file = images[index];
                    const hasImage = !!file;
                    const previewUrl = hasImage ? URL.createObjectURL(file) : null;
                    const isPrimary = index === 0;

                    return (
                        <div key={index} className="space-y-1.5">
                            {/* Título de slot */}
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                    {isPrimary && <Star size={10} className="text-amber-500" fill="currentColor" />}
                                    {SLOT_TITLES[index]}
                                </span>
                            </div>

                            {hasImage && previewUrl ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="relative aspect-square rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border-2 border-amber-200/70 dark:border-amber-500/30 shadow-md group"
                                >
                                    <Image
                                        src={previewUrl}
                                        alt={SLOT_TITLES[index]}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                                    />

                                    {/* Overlay de acciones */}
                                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-xs">
                                        <button
                                            type="button"
                                            onClick={() => handleSlotClick(index)}
                                            className="p-2.5 bg-white/90 hover:bg-white text-slate-800 rounded-xl shadow-lg transition-all hover:scale-110 flex items-center justify-center cursor-pointer"
                                            title="Cambiar o recortar foto"
                                        >
                                            <RefreshCw size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="p-2.5 bg-red-500/90 hover:bg-red-600 text-white rounded-xl shadow-lg transition-all hover:scale-110 flex items-center justify-center cursor-pointer"
                                            title="Eliminar foto"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    {isPrimary && (
                                        <div className="absolute top-2 left-2 bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm">
                                            Principal
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => handleSlotClick(index)}
                                    className={`w-full aspect-square rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-4 text-center cursor-pointer group ${
                                        isDragging
                                            ? 'border-amber-400 bg-amber-500/10'
                                            : isPrimary
                                            ? 'border-amber-300/80 dark:border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/10 hover:border-amber-400 hover:bg-amber-50/40 dark:hover:bg-amber-950/20'
                                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/30'
                                    }`}
                                >
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110 ${
                                        isPrimary
                                            ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shadow-sm'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                                    }`}>
                                        <Plus size={20} className="stroke-[2.5]" />
                                    </div>
                                    <span className={`text-[11px] font-black uppercase tracking-wider ${
                                        isPrimary
                                            ? 'text-amber-700 dark:text-amber-400'
                                            : 'text-slate-600 dark:text-slate-400'
                                    }`}>
                                        {isPrimary ? 'Enmarcar foto' : 'Agregar foto'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                                        Haz clic para elegir
                                    </span>
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modal de Recorte Cuadrado renderizado al nivel de body con Portal */}
            {mounted && createPortal(
                <AnimatePresence>
                    {isCropModalOpen && imageSrc && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4"
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                            >
                                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 uppercase italic tracking-tight">
                                            <Crop size={18} className="text-amber-500" /> Enmarcar Recuerdo
                                        </h3>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                            Ajusta y encuadra la imagen para el portarretratos
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleCloseModal}
                                        className="p-2.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                                    >
                                        <X size={18} className="text-slate-400 dark:text-slate-500" />
                                    </button>
                                </div>

                                <div className="relative w-full h-[22rem] bg-slate-950">
                                    <Cropper
                                        image={imageSrc}
                                        crop={crop}
                                        zoom={zoom}
                                        aspect={1}
                                        onCropChange={setCrop}
                                        onCropComplete={onCropComplete}
                                        onZoomChange={setZoom}
                                        showGrid={false}
                                    />
                                </div>

                                <div className="p-6 bg-white dark:bg-slate-900 space-y-5">
                                    <div className="flex items-center gap-4">
                                        <ZoomIn size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                        <input
                                            type="range"
                                            value={zoom}
                                            min={1}
                                            max={3}
                                            step={0.1}
                                            aria-labelledby="Zoom"
                                            onChange={(e) => setZoom(Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-amber-500"
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={handleCloseModal}
                                            className="w-1/3 py-3.5 px-4 rounded-xl text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCropSave}
                                            className="w-2/3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3.5 rounded-xl text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            <Check size={16} />
                                            Guardar en Álbum
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
