"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, RotateCcw, Zap, ZapOff, Camera } from 'lucide-react';

interface CameraModalProps {
    onCapture: (imageFile: File) => void;
    onClose: () => void;
}

export default function CameraModal({ onCapture, onClose }: CameraModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [currentDeviceId, setCurrentDeviceId] = useState<string>('');
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const [error, setError] = useState<string>('');
    const [isFlashSupported, setIsFlashSupported] = useState(false);
    const [flashOn, setFlashOn] = useState(false);

    // Initialize camera
    const startCamera = useCallback(async (deviceId?: string, mode: 'user' | 'environment' = 'environment') => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("La API de cámara no está disponible. Asegúrate de usar HTTPS o localhost.");
            }

            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            const constraints: MediaStreamConstraints = {
                video: {
                    deviceId: deviceId ? { exact: deviceId } : undefined,
                    facingMode: deviceId ? undefined : mode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            };

            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

            // Log for debugging
            console.log("Camera started:", mediaStream.id);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                // Wait for video to be ready to play
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play().catch(e => console.error("Error playing video:", e));
                };
            }

            setStream(mediaStream);

            // Check flash support
            const track = mediaStream.getVideoTracks()[0];
            const capabilities = track.getCapabilities?.();
            // @ts-ignore - torch is not in standard types yet
            setIsFlashSupported(!!capabilities?.torch);

        } catch (err: any) {
            console.error("Error accessing camera:", err);
            setError(err.message || "No se pudo acceder a la cámara. Verifica permisos y conexión HTTPS.");
        }
    }, [stream]); // Add stream as dependency to clean up previous stream

    // Initial setup
    useEffect(() => {
        // List devices to find multiple cameras
        const getDevices = async () => {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                    console.warn("enumerateDevices not supported");
                    return;
                }

                // Request permissions first to get device labels
                await navigator.mediaDevices.getUserMedia({ video: true });

                const devs = await navigator.mediaDevices.enumerateDevices();
                const videoDevs = devs.filter(d => d.kind === 'videoinput');
                setDevices(videoDevs);

                // Don't set initial ID, let facingMode handle it first time
            } catch (err) {
                console.error("Error listing devices:", err);
                // Don't block startCamera on listing error
            }
        };

        if (navigator.mediaDevices) {
            getDevices().then(() => {
                startCamera(undefined, 'environment');
            });
        } else {
            setError("Tu navegador o conexión no soporta acceso a cámara (requiere HTTPS).");
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Toggle Flash
    const toggleFlash = async () => {
        if (!stream) return;
        const track = stream.getVideoTracks()[0];
        try {
            await track.applyConstraints({
                advanced: [{ torch: !flashOn } as any]
            });
            setFlashOn(!flashOn);
        } catch (err) {
            console.error("Error toggling flash", err);
        }
    };

    // Switch Camera
    const switchCamera = () => {
        const newMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(newMode);
        setCurrentDeviceId(''); // Clear explicit device ID to let facingMode take over
        startCamera(undefined, newMode);
    };

    const takePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        // Set canvas dimensions to match video source
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Verify video has dimensions
        if (canvas.width === 0 || canvas.height === 0) return;

        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to blob/file
        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], `evidence_${Date.now()}.jpg`, { type: 'image/jpeg' });
                onCapture(file);

                // Stop stream immediately
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
            }
        }, 'image/jpeg', 0.95);
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center animate-in fade-in duration-300">
            {/* Header controls */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
                <button
                    onClick={onClose}
                    className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-all active:scale-95"
                >
                    <X size={24} />
                </button>

                {isFlashSupported && (
                    <button
                        onClick={toggleFlash}
                        className={`p-3 rounded-full backdrop-blur-md transition-all active:scale-95 ${flashOn ? 'bg-yellow-400 text-black' : 'bg-white/10 text-white'}`}
                    >
                        {flashOn ? <Zap size={24} fill="currentColor" /> : <ZapOff size={24} />}
                    </button>
                )}
            </div>

            {/* Video Feed */}
            <div className="flex-1 w-full relative flex items-center justify-center bg-black overflow-hidden">
                {error ? (
                    <div className="text-white text-center p-6 max-w-sm">
                        <Camera size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="mb-6 text-lg">{error}</p>
                        <div className="flex flex-col gap-3 w-full">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl active:scale-95 transition-transform hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                            >
                                Subir Foto
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full px-6 py-3 bg-white/10 text-white font-bold rounded-xl active:scale-95 transition-transform hover:bg-white/20"
                            >
                                Cerrar Cámara
                            </button>
                        </div>
                    </div>
                ) : (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                )}
                <canvas ref={canvasRef} className="hidden" />
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            onCapture(file);
                            // Stop stream if active (though likely not in error case)
                            if (stream) {
                                stream.getTracks().forEach(track => track.stop());
                            }
                        }
                    }}
                />
            </div>

            {/* Bottom Controls */}
            {!error && (
                <div className="absolute bottom-0 left-0 right-0 p-10 pb-16 flex justify-around items-center bg-gradient-to-t from-black/90 to-transparent z-10">
                    {/* Placeholder for symmetry */}
                    <div className="w-12">
                        {/* Hidden file upload trigger for consistency if needed */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-all active:scale-95"
                            title="Subir archivo"
                        >
                            <span className="sr-only">Subir archivo</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
                        </button>
                    </div>

                    {/* Shutter Button */}
                    <button
                        onClick={takePhoto}
                        className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-transform active:scale-90 hover:bg-white/10 shadow-2xl shadow-emerald-500/20"
                    >
                        <div className="w-16 h-16 rounded-full bg-white transition-transform active:scale-90" />
                    </button>

                    {/* Switch Camera */}
                    <button
                        onClick={switchCamera}
                        className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-all active:scale-95 active:rotate-180 duration-500"
                    >
                        <RotateCcw size={24} />
                    </button>
                </div>
            )}
        </div>
    );
}
