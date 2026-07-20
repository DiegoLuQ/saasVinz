"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, PlusCircle } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { clearToken } from '@/lib/auth/token';
import { useRouter } from 'next/navigation';

export default function CreatorLoginPage() {
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
            const data = await apiRequest('/api/internal/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    username: formData.email,
                    password: formData.password,
                }),
            });

            if (data.user.role !== 'creator') {
                // El backend ya emitió cookies de sesión: revocarlas antes de rechazar.
                await clearToken();
                throw new Error('Acceso denegado: No tienes permisos de Creador.');
            }

            // La sesión queda en cookies httpOnly emitidas por el backend.
            router.push('/dashboard');

        } catch (err: any) {
            setError(err.detail || err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a192f] text-white flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-900/10 rounded-full blur-[150px]" />
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-6">
                        <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                            <PlusCircle size={24} />
                        </div>
                        <span className="text-2xl font-black tracking-tighter">SaaS<span className="text-primary">Creator</span></span>
                    </div>
                    <h1 className="text-3xl font-black mb-2">Acceso Restringido</h1>
                    <p className="text-white/40 text-sm">Panel de Control maestro del sistema.</p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Correo Maestro</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                <input
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#0a192f]/50 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:border-primary/50 focus:bg-[#0a192f]/80 transition-all text-sm"
                                    placeholder="creator@saascrematorio.cl"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                <input
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#0a192f]/50 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:border-primary/50 focus:bg-[#0a192f]/80 transition-all text-sm"
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
                            className="w-full bg-primary py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {loading ? (
                                <span className="animate-pulse">Validando...</span>
                            ) : (
                                <>Ingresar al Sistema <ArrowRight size={18} /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <p className="text-[10px] text-white/20 flex items-center justify-center gap-1">
                            <ShieldCheck size={12} /> Acceso monitoreado y seguro
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

