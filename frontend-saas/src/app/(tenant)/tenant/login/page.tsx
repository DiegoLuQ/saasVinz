"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Mail, Lock, LogIn, ShieldCheck, MessageCircle, Compass, FileCheck2, HeartHandshake,
    Instagram, Facebook, Linkedin, Youtube, Globe, AtSign,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { apiRequest } from '@/lib/tenant/api';
import { hasSession } from '@/lib/auth/token';
import { usePlatformInfo, whatsappLink, socialUrl } from '@/lib/platformInfo';

const SOCIAL_ICON: Record<string, React.ElementType> = {
    instagram: Instagram, facebook: Facebook, linkedin: Linkedin, youtube: Youtube,
};

const BENEFITS = [
    { icon: Compass, title: 'Trazabilidad en tiempo real', text: 'La familia sigue cada etapa del servicio desde su celular.' },
    { icon: FileCheck2, title: 'Certificados y homenajes', text: 'Documentos con tu marca, listos para entregar.' },
    { icon: HeartHandshake, title: 'Órdenes y veterinarias', text: 'Recepción, operaciones y convenios en un solo lugar.' },
];

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const [checking, setChecking] = useState(true);
    const platform = usePlatformInfo();

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
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const data = await apiRequest('/api/internal/auth/login', {
                method: 'POST',
                body: formData,
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

    const waHelp = whatsappLink(platform.whatsapp, 'Hola, necesito ayuda para ingresar a mi panel de Vinzer.');
    const waInfo = whatsappLink(platform.whatsapp, 'Hola, quiero información sobre Vinzer para mi crematorio.');
    const socials = platform.redes_sociales
        .map((r) => ({ name: r.name || '', url: socialUrl(r.name, r.link) }))
        .filter((r): r is { name: string; url: string } => !!r.url);

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-background">
            {/* ── Columna informativa (solo escritorio) ─────────────────────── */}
            <aside className="hidden lg:flex relative overflow-hidden flex-col justify-between p-12 xl:p-16 bg-[#0A192F] text-white">
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/15 blur-[120px] pointer-events-none" />
                <div className="absolute -bottom-40 -right-24 w-[28rem] h-[28rem] rounded-full bg-sky-500/10 blur-[130px] pointer-events-none" />

                <div className="relative flex items-center gap-3">
                    <img src="/logo-vinzer.webp" alt="" className="h-11 w-auto object-contain" />
                    <span className="text-2xl font-black tracking-tight">{platform.name}</span>
                </div>

                <div className="relative space-y-8 max-w-lg">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                            {platform.eslogan || 'Cuando el vínculo importa, todo cambia'}
                        </p>
                        <h2 className="mt-3 text-3xl xl:text-4xl font-black leading-tight tracking-tight">
                            Confianza y trazabilidad para cada despedida
                        </h2>
                        <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                            {platform.name} ayuda a los crematorios de mascotas a gestionar cada servicio con orden y
                            transparencia, y a acompañar a las familias en todo el proceso.
                        </p>
                    </div>

                    <ul className="space-y-4">
                        {BENEFITS.map(({ icon: Icon, title, text }) => (
                            <li key={title} className="flex gap-3">
                                <span className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                                    <Icon size={17} className="text-emerald-300" />
                                </span>
                                <div>
                                    <p className="text-sm font-bold">{title}</p>
                                    <p className="text-xs text-slate-400">{text}</p>
                                </div>
                            </li>
                        ))}
                    </ul>

                    {waInfo && (
                        <a
                            href={waInfo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#1fb857] text-[#063b1c] font-bold text-sm px-5 py-3 transition-colors"
                        >
                            <MessageCircle size={18} /> Consultas por WhatsApp
                        </a>
                    )}
                </div>

                <div className="relative flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
                    <div className="flex items-center gap-4">
                        {platform.correo && (
                            <a href={`mailto:${platform.correo}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
                                <AtSign size={13} /> {platform.correo}
                            </a>
                        )}
                        {platform.whatsapp && <span>{platform.whatsapp}</span>}
                    </div>
                    {socials.length > 0 && (
                        <div className="flex items-center gap-2">
                            {socials.map((s) => {
                                const Icon = SOCIAL_ICON[s.name.toLowerCase()] || Globe;
                                return (
                                    <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" title={s.name || s.url} aria-label={s.name || 'Red social'} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/15 hover:text-white transition-colors">
                                        <Icon size={15} />
                                    </a>
                                );
                            })}
                        </div>
                    )}
                </div>
            </aside>

            {/* ── Formulario ─────────────────────────────────────────────── */}
            <main className="relative flex items-center justify-center p-6 sm:p-10 overflow-hidden">
                <div className="lg:hidden absolute top-[-10%] left-[-10%] w-[60%] h-[40%] bg-primary/10 rounded-full blur-[100px]" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md relative z-10"
                >
                    <div className="flex flex-col items-center lg:items-start mb-8">
                        <div className="lg:hidden flex items-center gap-2.5 mb-6">
                            <img src="/logo-vinzer.webp" alt="" className="h-9 w-auto object-contain" />
                            <span className="text-xl font-black tracking-tight text-foreground">{platform.name}</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Ingresa a tu panel</h1>
                        <p className="text-muted-foreground mt-1.5 text-sm font-medium text-center lg:text-left">
                            Gestiona los servicios de tu crematorio en {platform.name}.
                        </p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium flex items-center"
                        >
                            <ShieldCheck className="mr-3 shrink-0" size={18} />
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <label htmlFor="login-email" className="text-sm font-semibold ml-1 text-muted-foreground">Correo electrónico</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                                <input
                                    id="login-email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nombre@crematorio.cl"
                                    className="w-full bg-white border border-slate-300 text-slate-900 dark:bg-white/5 dark:border-white/10 dark:text-white rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="login-password" className="text-sm font-semibold ml-1 text-muted-foreground">Contraseña</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                                <input
                                    id="login-password"
                                    type="password"
                                    required
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-white border border-slate-300 text-slate-900 dark:bg-white/5 dark:border-white/10 dark:text-white rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-medium"
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
                                    Iniciar sesión
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center lg:text-left space-y-3">
                        <p className="text-sm text-muted-foreground">
                            ¿Problemas para ingresar o tu crematorio aún no está registrado?{' '}
                            {waHelp ? (
                                <a href={waHelp} target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">
                                    Escríbenos por WhatsApp
                                </a>
                            ) : platform.correo ? (
                                <a href={`mailto:${platform.correo}`} className="text-primary font-semibold hover:underline">Escríbenos</a>
                            ) : null}
                        </p>

                        {/* Contacto y redes (solo móvil: en escritorio están en la columna izquierda) */}
                        {socials.length > 0 && (
                            <div className="lg:hidden flex items-center justify-center gap-2 pt-2">
                                {socials.map((s) => {
                                    const Icon = SOCIAL_ICON[s.name.toLowerCase()] || Globe;
                                    return (
                                        <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.name || 'Red social'} className="w-9 h-9 rounded-xl border border-slate-200 dark:border-white/10 text-muted-foreground flex items-center justify-center hover:text-primary transition-colors">
                                            <Icon size={16} />
                                        </a>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
