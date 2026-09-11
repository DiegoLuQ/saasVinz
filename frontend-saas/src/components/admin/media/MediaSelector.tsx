"use client";

import React, { useState, useEffect } from 'react';
import {
    Image as ImageIcon,
    Film,
    X,
    Check,
    Play
} from 'lucide-react';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { apiRequest, getImageUrl } from '@/lib/admin/api';

interface MediaItem {
    id: number;
    url: string;
    media_type: 'image' | 'video';
    category: string;
    ratio: string;
    description: string;
    alt_text: string;
    thumbnail_url?: string;
}

interface MediaSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string, type: 'image' | 'video') => void;
    categoryFilter?: string; // Optional: Force a specific category
}

export default function MediaSelector({ isOpen, onClose, onSelect, categoryFilter = 'altars' }: MediaSelectorProps) {
    const { showToast } = useToast();
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video'>('all');
    const [selectedId, setSelectedId] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchMedia();
        }
    }, [isOpen]);

    const fetchMedia = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (categoryFilter) queryParams.append('category', categoryFilter);
            queryParams.append('page_size', '100');

            const data = await apiRequest(`/api/internal/media?${queryParams.toString()}`);
            if (Array.isArray(data)) {
                setMediaItems(data);
            } else if (data && Array.isArray(data.items)) {
                setMediaItems(data.items);
            } else {
                setMediaItems([]);
            }
        } catch (error) {
            console.error('Error fetching media in MediaSelector:', error);
            showToast("No se pudo cargar la galería", "error");
            setMediaItems([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = (Array.isArray(mediaItems) ? mediaItems : []).filter(item => {
        if (activeTab === 'all') return true;
        return item.media_type === activeTab;
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <ImageIcon size={20} className="text-primary" />
                            Seleccionar Fondo
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1">Elige un fondo de la biblioteca oficial.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Filters */}
                <div className="px-6 py-4 flex gap-4 border-b border-white/5 bg-black/10">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${activeTab === 'all' ? 'bg-white text-black' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setActiveTab('image')}
                        className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${activeTab === 'image' ? 'bg-white text-black' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    >
                        Imágenes
                    </button>
                    <button
                        onClick={() => setActiveTab('video')}
                        className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${activeTab === 'video' ? 'bg-white text-black' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    >
                        Videos
                    </button>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-6 bg-black/40">
                    {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="aspect-video bg-white/5 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {filteredItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onSelect(item.url, item.media_type)}
                                    className="group relative aspect-video bg-black rounded-xl overflow-hidden border border-white/10 hover:border-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black"
                                >
                                    {item.media_type === 'image' ? (
                                        <img
                                            src={getImageUrl(item.url)}
                                            alt={item.alt_text || 'Media'}
                                            className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center relative">
                                            {item.thumbnail_url ? (
                                                <img
                                                    src={getImageUrl(item.thumbnail_url)}
                                                    alt="Video thumbnail"
                                                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                                                />
                                            ) : (
                                                <video src={getImageUrl(item.url)} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" muted />
                                            )}
                                            <div className="z-10 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20">
                                                <Play size={14} fill="currentColor" className="text-white ml-0.5" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end">
                                        <span className="text-[10px] text-white font-medium truncate max-w-[80%]">{item.description}</span>
                                        {item.media_type === 'video' && <Film size={12} className="text-primary" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {!loading && filteredItems.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-4">
                            <ImageIcon size={48} strokeWidth={1} />
                            <p>No se encontraron fondos en esta categoría</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
