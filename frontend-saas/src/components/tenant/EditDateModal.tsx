import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EditDateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (isoDate: string) => void;
    initialDate?: string; // ISO string
    title?: string;
    timezone?: string; // IANA timezone (e.g., 'America/Santiago')
}

export default function EditDateModal({
    isOpen,
    onClose,
    onSave,
    initialDate,
    title = "Editar Fecha y Hora",
    timezone = 'America/Santiago'
}: EditDateModalProps) {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (initialDate) {
                // Parse the ISO date and convert to tenant's timezone
                const dt = new Date(initialDate);

                // Format date in tenant timezone
                const dateFormatter = new Intl.DateTimeFormat('en-CA', {
                    timeZone: timezone,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });

                const parts = dateFormatter.formatToParts(dt);
                const year = parts.find(p => p.type === 'year')?.value;
                const month = parts.find(p => p.type === 'month')?.value;
                const day = parts.find(p => p.type === 'day')?.value;
                setDate(`${year}-${month}-${day}`);

                // Format time in tenant timezone
                const timeFormatter = new Intl.DateTimeFormat('en-US', {
                    timeZone: timezone,
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });

                const timeParts = timeFormatter.formatToParts(dt);
                const hours = timeParts.find(p => p.type === 'hour')?.value;
                const minutes = timeParts.find(p => p.type === 'minute')?.value;
                setTime(`${hours}:${minutes}`);
            } else {
                // Use current time in tenant timezone
                const now = new Date();

                const dateFormatter = new Intl.DateTimeFormat('en-CA', {
                    timeZone: timezone,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });

                const parts = dateFormatter.formatToParts(now);
                const year = parts.find(p => p.type === 'year')?.value;
                const month = parts.find(p => p.type === 'month')?.value;
                const day = parts.find(p => p.type === 'day')?.value;
                setDate(`${year}-${month}-${day}`);

                const timeFormatter = new Intl.DateTimeFormat('en-US', {
                    timeZone: timezone,
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });

                const timeParts = timeFormatter.formatToParts(now);
                const hours = timeParts.find(p => p.type === 'hour')?.value;
                const minutes = timeParts.find(p => p.type === 'minute')?.value;
                setTime(`${hours}:${minutes}`);
            }
        }
    }, [isOpen, initialDate, timezone]);

    const handleSave = () => {
        if (!date || !time) return;

        // Send the date/time as a simple ISO string WITHOUT timezone offset
        // The backend will interpret this as local time in the tenant's timezone
        const isoString = `${date}T${time}:00`;

        onSave(isoString);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={e => e.stopPropagation()}
                        className="bg-[#0f1115] border border-white/10 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-white/5">
                            <h3 className="font-bold text-white text-lg">{title}</h3>
                            <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Calendar size={14} /> Fecha
                                </label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 transition-all font-mono"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Clock size={14} /> Hora ({timezone.split('/')[1]})
                                </label>
                                <input
                                    type="time"
                                    value={time}
                                    onChange={e => setTime(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 transition-all font-mono"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Zona horaria: {timezone}
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end gap-2">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:bg-white/5 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                            >
                                <Save size={16} /> Guardar
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
