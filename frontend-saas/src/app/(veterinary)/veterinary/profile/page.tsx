"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Save, Building, Camera, CheckCircle2, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import ChangePasswordCard from '@/components/veterinary/ChangePasswordCard';
import { useVeterinaryBootstrap } from '@/hooks/useVeterinaryBootstrap';
import { apiRequest } from '@/lib/veterinary/api';

export default function VeterinaryProfilePage() {
    const { data, isLoading } = useVeterinaryBootstrap();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        logo_url: '' // Future placeholder for logo
    });
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (data?.veterinary) {
            setFormData({
                name: data.veterinary.name || '',
                email: data.veterinary.email || '',
                phone: data.veterinary.phone || '',
                address: data.veterinary.address || '',
                logo_url: '' // Bind if available
            });
        }
    }, [data]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSaveMsg(null);
        try {
            await apiRequest('/api/veterinary/profile', {
                method: 'PUT',
                body: { name: formData.name, phone: formData.phone, address: formData.address },
            });
            // El nombre también se muestra en el header: refrescar el bootstrap.
            await queryClient.invalidateQueries({ queryKey: ['veterinary-bootstrap'] });
            setSaveMsg({ ok: true, text: 'Perfil actualizado.' });
        } catch (error: unknown) {
            setSaveMsg({ ok: false, text: error instanceof Error ? error.message : 'No se pudo guardar el perfil.' });
        } finally {
            setSaving(false);
        }
    };

    if (isLoading) return <div className="p-10 text-white">Cargando perfil...</div>;

    return (
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-[#020617] shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <User size={28} strokeWidth={2.5} />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight uppercase italic">Mi Perfil</h1>
                    <p className="text-indigo-200/40 text-sm font-medium tracking-widest uppercase">Gestiona los datos de tu clínica</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Logo & Branding Column */}
                <div className="space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#0B1121] rounded-[2rem] border border-white/5 p-6 text-center space-y-4 relative overflow-hidden group"
                    >
                        <div className="w-32 h-32 mx-auto bg-white/5 rounded-full flex items-center justify-center border-2 border-dashed border-white/10 group-hover:border-emerald-500/50 transition-colors relative cursor-pointer">
                            {/* Logo Placeholder */}
                            <Building size={40} className="text-white/20" />

                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                                <Camera className="text-white" size={24} />
                            </div>
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" title="Subir Logo" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm">Logo de la Clínica</h3>
                            <p className="text-indigo-200/30 text-xs mt-1">Recomendado: 500x500px PNG</p>
                        </div>
                    </motion.div>
                </div>

                {/* Form Column */}
                <div className="lg:col-span-2">
                    <motion.form
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        onSubmit={handleSubmit}
                        className="bg-[#0B1121] rounded-[2rem] border border-white/5 p-8 space-y-6"
                    >
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-indigo-200/40 ml-1">Nombre de la Clínica</label>
                            <div className="relative">
                                <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-white/20"
                                    placeholder="Ej: Clínica Veterinaria San José"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-indigo-200/40 ml-1">Teléfono</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                                    <input
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-white/20"
                                        placeholder="+56 9 1234 5678"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-indigo-200/40 ml-1">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                                    <input
                                        name="email"
                                        value={formData.email}
                                        readOnly
                                        disabled
                                        className="w-full bg-white/5 border border-white/5 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white/50 cursor-not-allowed opacity-70"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-indigo-200/40 ml-1">Dirección</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                                <input
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-white/20"
                                    placeholder="Av. Providencia 1234, Santiago"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div aria-live="polite" className="min-h-[1.25rem]">
                                {saveMsg && (
                                    <p className={`text-xs flex items-center gap-1.5 ${saveMsg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {saveMsg.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {saveMsg.text}
                                    </p>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-emerald-500 hover:bg-emerald-400 text-[#020617] px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving ? 'Guardando...' : (
                                    <>
                                        <Save size={16} /> Guardar Cambios
                                    </>
                                )}
                            </button>
                        </div>

                    </motion.form>
                </div>
            </div>

            <ChangePasswordCard />
        </div>
    );
}
