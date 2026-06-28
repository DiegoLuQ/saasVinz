"use client";

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Check, AlertCircle, FileText, Loader2, ArrowRight, ArrowLeft, Image as ImageIcon, Crop } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { Point, Area } from 'react-easy-crop';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

// --- Image Processing Helpers ---
const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    reportError: (msg: string) => void
): Promise<Blob | null> => {
    try {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return null;
        }

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

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

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reportError('Canvas is empty');
                    resolve(null);
                    return;
                }
                resolve(blob);
            }, 'image/webp', 0.9);
        });
    } catch (e) {
        console.error(e);
        return null;
    }
};

interface PaymentReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    amountToPay?: number; // Optional pre-fill
}

export function PaymentReportModal({ isOpen, onClose, onSuccess, amountToPay }: PaymentReportModalProps) {
    // Steps: 1=Details, 2=Crop, 3=Review
    const [step, setStep] = useState(1);

    // Form Data
    const [amount, setAmount] = useState<string>(amountToPay ? amountToPay.toString() : '');
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    // Image / Cropper State
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [file, setFile] = useState<File | Blob | null>(null);
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [aspect, setAspect] = useState(1); // Default 1:1
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [croppedPreview, setCroppedPreview] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToast();

    // Reset state on close/open
    React.useEffect(() => {
        if (isOpen) {
            setStep(1);
            setAmount(amountToPay ? amountToPay.toString() : '');
            setDate(new Date().toISOString().split('T')[0]);
            setNotes('');
            setImageSrc(null);
            setFile(null);
            setCroppedPreview(null);
            setZoom(1);
            setAspect(1);
        }
    }, [isOpen, amountToPay]);

    // Handle File Selection
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];

            // Validate type
            if (!['image/jpeg', 'image/png', 'image/jpg'].includes(selectedFile.type)) {
                showToast('Solo se permiten imágenes JPG o PNG', 'error');
                return;
            }

            // Read image for cropping
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImageSrc(reader.result?.toString() || null);
                setStep(2); // Go to crop step
            });
            reader.readAsDataURL(selectedFile);
        }
    };

    const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const processCrop = async () => {
        if (!imageSrc || !croppedAreaPixels) return;

        try {
            const blob = await getCroppedImg(imageSrc, croppedAreaPixels, (msg) => showToast(msg, 'error'));
            if (blob) {
                // Create a File object from Blob to keep name if needed, or just use Blob
                // Backend expects 'file' in FormData.
                setFile(blob);
                setCroppedPreview(URL.createObjectURL(blob));
                setStep(3);
            }
        } catch (e) {
            console.error(e);
            showToast('Error al recortar la imagen', 'error');
        }
    };

    const handleSubmit = async () => {
        if (!amount || !date || !file) {
            showToast('Faltan datos requeridos', 'error');
            return;
        }

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('amount', amount);
            formData.append('date', new Date(date).toISOString());
            formData.append('notes', notes);

            // Append file with a filename (especially important for Blobs)
            // If it's a PDF (File object), it has a name. If it's a Blob (webp image), add name.
            if (file instanceof File) {
                formData.append('file', file);
            } else {
                formData.append('file', file, `payment_receipt_${Date.now()}.webp`);
            }

            await apiRequest('/api/internal/billing/report-payment', {
                method: 'POST',
                body: formData
            });

            showToast('Pago reportado exitosamente', 'success');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Submit error:', error);
            showToast(error.message || 'Error al enviar el reporte', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 ${step === 2 ? 'overflow-hidden' : ''}`}>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-xl bg-[#1a1f2e] border border-white/10 rounded-3xl shadow-2xl z-[70] flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between shrink-0">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                Reportar Pago
                                <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-white/50">Paso {step}/3</span>
                            </h2>
                            <p className="text-sm text-white/40 mt-1">
                                {step === 1 && "Ingresa los detalles de la transferencia."}
                                {step === 2 && "Sube y ajusta tu comprobante."}
                                {step === 3 && "Revisa y confirma el envío."}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content Body */}
                    <div className="flex-1 overflow-y-auto p-8 relative">

                        {/* STEP 1: Details */}
                        {step === 1 && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-white/40">Monto ($)</label>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors text-lg font-bold"
                                            placeholder="Ej: 50000"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-white/40">Fecha</label>
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-white/40">Observaciones</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors min-h-[100px] text-sm"
                                        placeholder="Nro de operación, banco origen, etc..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* STEP 2: Crop / Upload */}
                        {step === 2 && (
                            <div className="h-full flex flex-col gap-6 animate-in slide-in-from-right-4 fade-in duration-300">
                                {!imageSrc ? (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-white/5 rounded-2xl p-12 cursor-pointer transition-all flex flex-col items-center justify-center gap-4 text-center h-64"
                                    >
                                        <input ref={fileInputRef} type="file" className="hidden" accept="image/jpeg,image/png" onChange={handleFileChange} />
                                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/30">
                                            <Upload size={32} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-lg text-white">Sube tu comprobante</p>
                                            <p className="text-sm text-white/40">Imagen JPG o PNG</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col h-full gap-4">
                                        <div className="relative w-full h-80 bg-black/50 rounded-2xl overflow-hidden border border-white/10">
                                            <Cropper
                                                image={imageSrc}
                                                crop={crop}
                                                zoom={zoom}
                                                aspect={aspect}
                                                onCropChange={setCrop}
                                                onCropComplete={onCropComplete}
                                                onZoomChange={setZoom}
                                            />
                                        </div>

                                        {/* Controls */}
                                        <div className="space-y-4">
                                            <label className="text-xs font-bold uppercase tracking-wider text-white/40">Zoom</label>
                                            <input
                                                type="range"
                                                value={zoom}
                                                min={1}
                                                max={3}
                                                step={0.1}
                                                aria-labelledby="Zoom"
                                                onChange={(e) => setZoom(Number(e.target.value))}
                                                className="w-full accent-primary h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                            />

                                            <div className="flex gap-2 justify-center">
                                                {[{ l: '1:1', v: 1 }, { l: '16:9', v: 16 / 9 }, { l: '9:16', v: 9 / 16 }, { l: '4:3', v: 4 / 3 }].map((ratio) => (
                                                    <button
                                                        key={ratio.l}
                                                        onClick={() => setAspect(ratio.v)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${Math.abs(aspect - ratio.v) < 0.01
                                                            ? 'bg-primary text-black border-primary'
                                                            : 'bg-white/5 text-white/60 border-white/5 hover:bg-white/10'
                                                            }`}
                                                    >
                                                        {ratio.l}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STEP 3: Review */}
                        {step === 3 && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                                {croppedPreview && (
                                    <div className="relative w-full h-48 bg-black/30 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center">
                                        <img src={croppedPreview} alt="Comprobante" className="h-full object-contain" />
                                        <button
                                            onClick={() => { setStep(2); setImageSrc(null); setFile(null); }}
                                            className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full hover:bg-red-500/80 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}

                                <div className="bg-white/5 rounded-2xl p-6 space-y-4 border border-white/5">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-white/40">Monto:</span>
                                        <span className="font-bold text-white text-lg">${parseInt(amount).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-white/40">Fecha:</span>
                                        <span className="text-white">{new Date(date).toLocaleDateString()}</span>
                                    </div>
                                    {notes && (
                                        <div className="pt-4 border-t border-white/5">
                                            <span className="text-white/40 text-xs block mb-1">Observaciones:</span>
                                            <p className="text-white text-sm">{notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-white/5 bg-black/20 flex gap-4 shrink-0">
                        {step > 1 && (
                            <button
                                onClick={() => setStep(s => s - 1)}
                                className="px-6 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5"
                                disabled={loading}
                            >
                                <ArrowLeft size={18} />
                            </button>
                        )}

                        {step === 1 && (
                            <button
                                onClick={() => { if (amount && date) setStep(2); else showToast('Completa monto y fecha', 'error'); }}
                                className="flex-1 py-3 rounded-xl font-bold bg-primary hover:bg-primary-dark text-black transition-colors flex items-center justify-center gap-2"
                            >
                                Siguiente <ArrowRight size={18} />
                            </button>
                        )}

                        {step === 2 && (
                            <button
                                onClick={processCrop}
                                className="flex-1 py-3 rounded-xl font-bold bg-primary hover:bg-primary-dark text-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!imageSrc && !file} // If PDF, file is set, imageSrc null
                            >
                                {imageSrc ? 'Recortar y Continuar' : 'Continuar'} <ArrowRight size={18} />
                            </button>
                        )}

                        {step === 3 && (
                            <button
                                onClick={handleSubmit}
                                className="flex-1 py-3 rounded-xl font-bold bg-green-500 hover:bg-green-600 text-white transition-colors flex items-center justify-center gap-2"
                                disabled={loading}
                            >
                                {loading && <Loader2 size={18} className="animate-spin" />}
                                {loading ? 'Enviando...' : 'Confirmar y Enviar'}
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
