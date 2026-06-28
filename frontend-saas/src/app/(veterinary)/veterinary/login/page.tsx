"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Stethoscope } from 'lucide-react';
import { apiRequest } from '@/lib/veterinary/api';
import { useRouter } from 'next/navigation';

export default function VeterinaryLoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Veterinary Auth Endpoint
            const data = await apiRequest('/api/veterinary/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                }),
            });

            // Save token (localStorage + Cookie for middleware)
            localStorage.setItem('vet_token', data.access_token);

            // Cookie expires in 7 days
            const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
            const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
            document.cookie = `vet_token=${data.access_token}; path=/; max-age=604800; SameSite=Strict${isSecure ? '; Secure' : ''}`;

            router.push('/dashboard');

        } catch (err: any) {
            setError(err.detail || err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-teal-500/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-900/10 rounded-full blur-[150px]" />
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-6">
                        <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center text-teal-400">
                            <Stethoscope size={28} />
                        </div>
                    </div>
                    <h1 className="text-3xl font-black mb-2 tracking-tight">Portal <span className="text-teal-400">Veterinario</span></h1>
                    <p className="text-slate-400 text-sm">Gestiona tus vínculos y comisiones.</p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-500 to-transparent opacity-50" />

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Correo Electrónico</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:border-teal-500/50 focus:bg-slate-900/80 transition-all text-sm text-slate-200 placeholder:text-slate-600"
                                    placeholder="contacto@veterinaria.cl"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:border-teal-500/50 focus:bg-slate-900/80 transition-all text-sm text-slate-200 placeholder:text-slate-600"
                                    placeholder="••••••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-3">
                                <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
                                <p className="text-red-200 text-xs leading-relaxed">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-teal-500 py-4 rounded-xl font-bold text-slate-900 text-sm flex items-center justify-center gap-2 hover:bg-teal-400 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {loading ? (
                                <span className="animate-pulse">Iniciando...</span>
                            ) : (
                                <>Ingresar <ArrowRight size={18} /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
                        <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                            <ShieldCheck size={12} /> Área segura para socios
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
