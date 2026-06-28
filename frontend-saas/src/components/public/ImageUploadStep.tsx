import React, { useCallback, useState } from 'react';
import { UploadCloud, X, Image as ImageIcon, Crop, ZoomIn, Check } from 'lucide-react';
import Image from 'next/image';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../lib/canvasUtils';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    images: File[];
    setImages: (files: File[]) => void;
}

export default function ImageUploadStep({ images, setImages }: Props) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Cropping State
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [currentFileName, setCurrentFileName] = useState<string>('image');

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    }, []);

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    // 1. Initial File Selection / Drop
    const processFileSelection = (files: File[]) => {
        if (images.length >= 3) {
            setError('Solo puedes subir un máximo de 3 imágenes.');
            return;
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const file = files[0]; // We assume one by one cropping for better UX, or just take the first one

        if (!file) return;

        if (!validTypes.includes(file.type)) {
            setError('Formato no válido. Solo JPG, PNG o WEBP.');
            return;
        }

        // Read file for cropping
        const reader = new FileReader();
        reader.addEventListener('load', () => {
            setImageSrc(reader.result?.toString() || null);
            setCurrentFileName(file.name.split('.')[0]); // Keep simplified name
            setIsCropModalOpen(true);
            setZoom(1);
            setCrop({ x: 0, y: 0 });
            setError(null);
        });
        reader.readAsDataURL(file);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            processFileSelection(files);
        }
    }, [images]);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFileSelection(Array.from(e.target.files));
        }
        // Reset input so same file can be selected again if cancelled
        e.target.value = '';
    };

    // 2. Perform Clip & Save
    const handleCropSave = async () => {
        if (!imageSrc || !croppedAreaPixels) return;

        try {
            const croppedBlob = (await getCroppedImg(imageSrc, croppedAreaPixels)) as Blob;
            // Force PNG extension
            const newFile = new File([croppedBlob], `${currentFileName}_cropped.png`, {
                type: 'image/png',
            });

            setImages([...images, newFile]);
            handleCloseModal();
        } catch (e) {
            console.error(e);
            setError('Error al recortar la imagen.');
        }
    };

    const handleCloseModal = () => {
        setIsCropModalOpen(false);
        setImageSrc(null);
    };

    const removeImage = (index: number) => {
        const newImages = [...images];
        newImages.splice(index, 1);
        setImages(newImages);
        setError(null); // Clear potential "max limit" errors if we free up space
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-4">
                <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-slate-800 dark:text-slate-100 mb-1">Galería de Recuerdos</h2>
                <div className="flex flex-col sm:flex-row items-center justify-center text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] font-bold gap-2 mt-2">
                    <p>Sube hasta <span className="font-black text-emerald-500">3 fotos</span></p>
                    <span className="bg-emerald-50 dark:bg-emerald-950/20 px-3 py-0.5 rounded-full text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 shadow-sm">Formato Cuadrado (1:1)</span>
                </div>
            </div>

            {/* Main Drop Zone */}
            {images.length < 3 ? (
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-[2rem] p-6 sm:p-8 text-center transition-all duration-500 ${isDragging
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 shadow-lg'
                        : 'border-slate-200 dark:border-slate-800 hover:border-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-900/20'
                        }`}
                >
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileInput}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />

                    <div className="flex flex-col items-center justify-center space-y-5 pointer-events-none">
                        <div className={`p-6 rounded-3xl transition-colors duration-500 ${isDragging ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                            <UploadCloud className={`w-10 h-10`} />
                        </div>
                        <div>
                            <p className="text-slate-700 dark:text-slate-300 font-black uppercase tracking-widest text-xs italic">
                                Arrastra o selecciona una foto
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-bold uppercase tracking-tight">
                                Se abrirá el editor para recortar
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-6 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/40 rounded-3xl text-center text-yellow-600 dark:text-yellow-400 text-[10px] font-black uppercase tracking-widest">
                    Has alcanzado el límite de 3 imágenes. Elimina una para agregar otra.
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-500 dark:text-red-400 text-[10px] rounded-2xl text-center font-black uppercase tracking-widest animate-pulse">
                    {error}
                </div>
            )}

            {/* Preview Grid */}
            {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mt-10">
                    {images.map((file, index) => (
                        <div key={index} className="relative aspect-square rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-800 group shadow-lg bg-slate-50 dark:bg-slate-950 transition-all hover:border-red-300">
                            <Image
                                src={URL.createObjectURL(file)}
                                alt={`Preview ${index}`}
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                <button
                                    onClick={() => removeImage(index)}
                                    className="p-4 bg-white text-red-500 border border-red-200 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-xl transform hover:scale-110"
                                    type="button"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="absolute bottom-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-1 rounded-full text-[9px] font-black text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 shadow-sm pointer-events-none uppercase tracking-widest">
                                PNG
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {images.length === 0 && (
                <div className="text-center py-10 opacity-60">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-slate-50 dark:bg-slate-900/50 mb-4">
                        <ImageIcon className="text-slate-300 dark:text-slate-700" size={32} />
                    </div>
                    <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">Aún no hay fotos seleccionadas</p>
                </div>
            )}

            {/* CROP MODAL */}
            <AnimatePresence>
                {isCropModalOpen && imageSrc && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3 uppercase italic tracking-tight">
                                    <Crop size={24} className="text-emerald-500" /> Recortar Imagen
                                </h3>
                                <button
                                    onClick={handleCloseModal}
                                    className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-all"
                                >
                                    <X size={24} className="text-slate-400 dark:text-slate-500" />
                                </button>
                            </div>

                            <div className="relative w-full h-[25rem] sm:h-[30rem] bg-slate-900">
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

                            <div className="p-8 bg-white dark:bg-slate-900 space-y-8">
                                <div className="flex items-center gap-6">
                                    <ZoomIn size={20} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                    <input
                                        type="range"
                                        value={zoom}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        aria-labelledby="Zoom"
                                        onChange={(e) => setZoom(Number(e.target.value))}
                                        className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
                                    />
                                </div>

                                <button
                                    onClick={handleCropSave}
                                    className="w-full bg-emerald-500 text-white font-black py-5 rounded-2xl text-xs uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/20 hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center justify-center gap-3"
                                >
                                    <Check size={20} />
                                    Confirmar Recorte
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
