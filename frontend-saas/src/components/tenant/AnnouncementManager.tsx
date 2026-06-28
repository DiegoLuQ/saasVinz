"use client";

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/tenant/api';
import { X, Info, AlertTriangle, Gift, Megaphone, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnnouncements } from '@/hooks/useSessionBootstrap';

interface Announcement {
    id: number;
    title: string;
    content: string;
    type: string;
    display_type: 'modal' | 'banner';
    show_once: boolean;
    must_read: boolean;
}

export default function AnnouncementManager() {
    const bootstrapAnnouncements = useAnnouncements();
    const [currentModal, setCurrentModal] = useState<Announcement | null>(null);
    const [banners, setBanners] = useState<Announcement[]>([]);

    useEffect(() => {
        if (Array.isArray(bootstrapAnnouncements)) {
            const modals = bootstrapAnnouncements.filter(a => a.display_type === 'modal');
            const bannerList = bootstrapAnnouncements.filter(a => a.display_type === 'banner');

            setBanners(bannerList as Announcement[]);
            if (modals.length > 0) {
                setCurrentModal(modals[0] as Announcement);
            }
        }
    }, [bootstrapAnnouncements]);

    const handleDismiss = async (announcement: Announcement) => {
        if (announcement.show_once) {
            try {
                await apiRequest(`/api/internal/announcements/${announcement.id}/view`, {
                    method: 'POST'
                });
            } catch (err) {
                console.error("Error marking announcement as viewed", err);
            }
        }

        if (announcement.display_type === 'modal') {
            setCurrentModal(null);
            // Show next modal if any
            const remaining = (bootstrapAnnouncements as Announcement[]).filter(a => a.display_type === 'modal' && a.id !== announcement.id);
            if (remaining.length > 0) {
                setCurrentModal(remaining[0]);
            }
        } else {
            setBanners(prev => prev.filter(b => b.id !== announcement.id));
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'pending_info': return <Info className="text-blue-400" />;
            case 'suspended_block': return <AlertTriangle className="text-red-400" />;
            case 'welcome': return <Gift className="text-primary" />;
            case 'promotion': return <Megaphone className="text-amber-400" />;
            default: return <Bell className="text-primary" />;
        }
    };

    return (
        <>
            {/* Banners Container */}
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-70 w-full max-w-4xl px-4 space-y-2 pointer-events-none">
                <AnimatePresence>
                    {banners.map((banner) => (
                        <motion.div
                            key={banner.id}
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="pointer-events-auto bg-[#0a192f]/90 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-4"
                        >
                            <div className="flex items-center gap-3">
                                {getIcon(banner.type)}
                                <div>
                                    <div className="text-xs font-black uppercase tracking-widest text-white/40">{banner.title}</div>
                                    <div className="text-sm text-white/80 font-medium">{banner.content}</div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDismiss(banner)}
                                className="p-1 hover:bg-white/5 rounded-lg transition-colors text-white/20 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Modal Overlay */}
            <AnimatePresence>
                {currentModal && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-lg bg-[#0a192f] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 space-y-6">
                                <div className="flex flex-col items-center text-center space-y-4">
                                    <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center text-3xl">
                                        {getIcon(currentModal.type)}
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black text-white">{currentModal.title}</h3>
                                        <p className="text-white/60 leading-relaxed">{currentModal.content}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleDismiss(currentModal)}
                                    className="w-full py-4 bg-gradient-to-r from-primary to-orange-600 text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95"
                                >
                                    ENTENDIDO
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
