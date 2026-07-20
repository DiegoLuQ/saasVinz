"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, LogIn, ArrowRight } from 'lucide-react';
import { hasSession } from '@/lib/auth/token';
import "./globals.css";

type HostContext = 'admin' | 'app' | 'veterinary' | 'public';

function detectHostContext(): HostContext {
    if (typeof window === 'undefined') return 'public';
    const hostname = window.location.hostname;
    if (hostname.startsWith('admin.')) return 'admin';
    if (hostname.startsWith('app.')) return 'app';
    if (hostname.startsWith('veterinary.')) return 'veterinary';
    return 'public';
}

function getVetToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        const ls = localStorage.getItem('vet_token');
        if (ls) return ls;
    } catch {}
    const match = document.cookie.match(/(^| )vet_token=([^;]+)/);
    return match ? match[2] : null;
}

function getRedirectTarget(): string {
    const context = detectHostContext();
    switch (context) {
        case 'admin':
            return hasSession() ? '/dashboard' : '/iniciar-sesion-creador';
        case 'app':
            return hasSession() ? '/dashboard' : '/login';
        case 'veterinary':
            return getVetToken() ? '/dashboard' : '/login';
        case 'public':
        default:
            return '/';
    }
}

export default function NotFound() {
    const router = useRouter();
    const [countdown, setCountdown] = useState(5);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const context = detectHostContext();
        if (context === 'veterinary') {
            setIsAuthenticated(!!getVetToken());
        } else if (context === 'public') {
            setIsAuthenticated(false);
        } else {
            setIsAuthenticated(hasSession());
        }

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (mounted && countdown === 0) {
            router.push(getRedirectTarget());
        }
    }, [countdown, mounted, router]);

    if (!mounted) return null;

    const handleRedirectNow = () => router.push(getRedirectTarget());

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
            {/* Fondo con gradientes animados */}
            <div className="absolute inset-0">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_50%)]"></div>
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse"></div>
            </div>

            <div className="max-w-xl w-full relative z-10">
                <div className="bg-white/[0.02] backdrop-blur-2xl rounded-[3rem] p-10 md:p-16 border border-white/10 shadow-2xl text-center">

                    {/* Branding */}
                    <div className="mb-12">
                        <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                            <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Error 404</span>
                        </div>
                        <h2 className="text-5xl font-black text-white tracking-tight mb-2">
                            Vinzer
                        </h2>
                        <p className="text-emerald-400/60 font-medium tracking-wide">Aliado en tu negocio</p>
                    </div>

                    {/* Contenido Principal */}
                    <div className="mb-12 space-y-4">
                        <h3 className="text-3xl font-bold text-white">Página no encontrada</h3>
                        <p className="text-slate-400 text-lg leading-relaxed font-sans">
                            Parece que has llegado a un lugar que no existe.
                            Te llevaremos de vuelta en un momento.
                        </p>
                    </div>

                    {/* Indicador de Redirección */}
                    <div className="mb-12">
                        <div className="flex items-center justify-center gap-4 mb-6">
                            <span className="text-slate-500 font-medium font-sans">Redirigiendo en</span>
                            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center shadow-inner">
                                <span className="text-2xl font-black text-emerald-400">{countdown}</span>
                            </div>
                            <span className="text-slate-500 font-medium font-sans">segundos</span>
                        </div>

                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-1000 ease-linear"
                                style={{ width: `${(countdown / 5) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Botón de Acción */}
                    <button
                        onClick={handleRedirectNow}
                        className="w-full group relative flex items-center justify-center gap-3 py-5 px-8 bg-white text-slate-950 font-bold rounded-2xl hover:bg-emerald-400 transition-all duration-300 shadow-xl"
                        style={{ cursor: 'pointer' }}
                    >
                        {isAuthenticated ? (
                            <>
                                <Home size={20} className="group-hover:-translate-y-0.5 transition-transform" />
                                <span>Volver al Dashboard</span>
                            </>
                        ) : detectHostContext() === 'public' ? (
                            <>
                                <Home size={20} className="group-hover:-translate-y-0.5 transition-transform" />
                                <span>Ir a la Página Principal</span>
                            </>
                        ) : (
                            <>
                                <LogIn size={20} />
                                <span>Ir al Inicio de Sesión</span>
                            </>
                        )}
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>

                </div>
            </div>
        </div>
    );
}
