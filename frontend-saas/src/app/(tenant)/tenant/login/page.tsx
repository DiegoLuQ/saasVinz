"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flame, Mail, Lock, LogIn, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiRequest } from '@/lib/tenant/api';
import { hasSession } from '@/lib/auth/token';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    React.useEffect(() => {
        if (hasSession()) {
            router.push('/dashboard');
        } else {
            setChecking(false);
        }
    }, [router]);

    if (checking) return null;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Nota: El backend espera OAuth2 Password Flow o un login JSON. 
            // Según nuestra implementación en internal/auth.py es un POST JSON a /api/internal/login
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const data = await apiRequest('/api/internal/auth/login', {
                method: 'POST',
                body: formData, // Pass object directly
            });

            // La sesión queda en cookies httpOnly emitidas por el backend.
            localStorage.setItem('saasc_user', JSON.stringify(data.user));

            router.push('/dashboard');
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Credenciales incorrectas';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md glass-card p-8 lg:p-10 rounded-[2.5rem] relative z-10"
            >
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-xl shadow-primary/20">
                        <Flame className="text-white" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">SaaSCrematorio</h1>
                    <p className="text-muted-foreground mt-2 font-medium">Panel Administrativo</p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-center"
                    >
                        <ShieldCheck className="mr-3 shrink-0" size={18} />
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold ml-1 text-muted-foreground">Correo Electrónico</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="nombre@empresa.com"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold ml-1 text-muted-foreground">Contraseña</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center mt-8 cursor-pointer disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <LogIn className="mr-3" size={20} />
                                Iniciar Sesión
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-10 text-center">
                    <p className="text-sm text-muted-foreground font-medium">
                        ¿Tu empresa no está registrada? <br />
                        <span className="text-primary hover:underline cursor-pointer transition-all">Contactar a soporte</span>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

