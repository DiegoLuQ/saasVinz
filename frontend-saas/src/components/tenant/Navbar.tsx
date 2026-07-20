"use client";


import React, { useState, useRef, useEffect } from 'react';
import { useSidebar } from '@/app/(tenant)/tenant/context/SidebarContext';
import { useTheme } from '@/app/(tenant)/tenant/context/ThemeContext';
import { useTenant } from '@/app/(tenant)/tenant/context/TenantContext';
import {
    Bell,
    User,
    Palette,
    Check,
    LogOut,
    Eye,
    Trash2,
    Copy,
    Share2,
    Menu,
    Search
} from 'lucide-react';
import Modal from '@/components/tenant/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { apiRequest } from '@/lib/tenant/api';
import { clearToken } from '@/lib/auth/token';
import { formatChileDate, formatChileTime } from '@/lib/dates';
import SubmissionDetailModal from '@/components/tenant/modals/SubmissionDetailModal';
import NotificationDetailModal from '@/components/tenant/modals/NotificationDetailModal';
import GlobalSearchModal from '@/components/tenant/GlobalSearchModal';
import { copyToClipboard } from '@/lib/clipboard';
import { useInitialNotifications } from '@/hooks/useSessionBootstrap';
import { useQueryClient } from '@tanstack/react-query';

const themes = [
    { id: 'esmeralda', name: 'Esmeralda', color: '#10b981' },
    { id: 'oceano', name: 'Océano', color: '#0ea5e9' },
    { id: 'atardecer', name: 'Atardecer', color: '#fb923c' },
    { id: 'oro', name: 'Oro', color: '#facc15' },
    { id: 'monocromo', name: 'Monocromo', color: '#ffffff' },
    { id: 'turquesa', name: 'Turquesa', color: '#14b8a6' },
    { id: 'light', name: 'Light', color: '#e2e8f0' },
] as const;

export default function Navbar() {
    const { collapsed, setCollapsed, toggleMobile } = useSidebar();
    const bootstrapNotifications = useInitialNotifications();
    const queryClient = useQueryClient();
    const { colorScheme, setColorScheme } = useTheme();
    const { showToast } = useToast();
    const router = useRouter();
    const [showPalette, setShowPalette] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<any>(null);
    const [showNotifModal, setShowNotifModal] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    const paletteRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);

    const notifications = bootstrapNotifications;

    const [userData, setUserData] = useState<{ name: string, email: string, role: string } | null>(null);
    const { tenantData } = useTenant();
    const isRegistrarBloqueado = false;
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const [tempToken, setTempToken] = useState<string | null>(null);
    const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<string>('');
    const [isGeneratingToken, setIsGeneratingToken] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
                setShowPalette(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    React.useEffect(() => {
        const storedUser = localStorage.getItem('saasc_user');
        if (storedUser) {
            setUserData(JSON.parse(storedUser));
        }

        const handleScroll = () => {
            if (window.scrollY > 0) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    React.useEffect(() => {
        if (!tokenExpiry) return;

        const updateCountdown = () => {
            const now = new Date();
            const diff = tokenExpiry.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeRemaining('Expirado');
                return;
            }

            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        };

        updateCountdown();
        const timer = setInterval(updateCountdown, 1000);
        return () => clearInterval(timer);
    }, [tokenExpiry]);

    const handleShareLink = async () => {
        setIsShareModalOpen(true);
        await generateTemporaryToken();
    };

    const generateTemporaryToken = async () => {
        setIsGeneratingToken(true);
        try {
            const response = await apiRequest('/api/internal/form-tokens/generate', {
                method: 'POST'
            });

            setTempToken(response.token);
            setTokenExpiry(new Date(response.expires_at));
            showToast('Enlace temporal generado (válido por 3 días)', 'success');
        } catch (err: any) {
            console.error('Error generating temporary token:', err);
            const errMsg = err?.message || (typeof err === 'string' ? err : 'Error al generar enlace temporal');
            showToast(errMsg, 'error');
        } finally {
            setIsGeneratingToken(false);
        }
    };

    const copyToClipboardHandler = async () => {
        if (!tenantData) return;
        const baseUrl = process.env.NEXT_PUBLIC_PUBLIC_FORM_URL ||
            (typeof window !== 'undefined'
                ? `${window.location.protocol}//${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'}`
                : 'http://localhost:3000');
        const token = tempToken || tenantData.public_token;
        const link = `${baseUrl}/${tenantData.slug}/form?token=${token}`;

        const success = await copyToClipboard(link);
        if (success) {
            showToast('Enlace copiado al portapapeles', 'success');
        } else {
            showToast('Error al copiar. Por favor selecciona el texto manualmente.', 'error');
        }
    };

    const handleMarkAsRead = async (id: number) => {
        try {
            await apiRequest(`/api/internal/notifications/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ is_read: true })
            });
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    const handleDeleteNotification = async (id: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!confirm('¿Estás seguro de eliminar esta notificación y sus datos asociados?')) return;
        try {
            await apiRequest(`/api/internal/notifications/${id}`, { method: 'DELETE' });
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
        } catch (err) {
            console.error('Error deleting notification:', err);
        }
    };

    const handleViewSubmission = (e: React.MouseEvent, n: any) => {
        e.stopPropagation();
        if (n.type === 'new_submission' && n.data?.submission_id) {
            router.push(`/dashboard/registros/${n.data.submission_id}`);
            setShowNotifications(false);
        } else {
            setSelectedNotification(n);
            setShowNotifModal(true);
            setShowNotifications(false);
        }
    };

    const roleNames: Record<string, string> = {
        admin: 'Administrador',
        recepcion: 'Recepción',
        operador_cremacion: 'Operador Cremación',
        contabilidad: 'Contabilidad',
        marketing: 'Marketing',
        auditor: 'Auditor',
        operator: 'Operador',
        creator: 'SuperAdmin'
    };

    const planNames: Record<string, string> = {
        'FREE': 'Free',
        'NORMAL': 'Normal',
        'PRO': 'Pro',
        'ULTRA': 'Ultra',
    };

    const handleLogout = async () => {
        await clearToken();
        localStorage.removeItem('saasc_user');
        router.push('/login');
    };

    return (
        <>
            <header className="h-16 sm:h-20 sticky top-0 z-30 flex-shrink-0 flex items-center justify-between px-3 sm:px-6 lg:px-10 bg-background/70 backdrop-blur-md border-b border-white/5 gap-2">
                <div className="flex items-center gap-2 sm:gap-3 relative z-30 shrink-0">
                    {/* Hamburger — mobile/tablet only */}
                    <button
                        onClick={toggleMobile}
                        className="lg:hidden p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-foreground transition-colors"
                        aria-label="Abrir menú de navegación"
                    >
                        <Menu size={20} aria-hidden="true" />
                    </button>
                </div>

                <div className="flex-1 max-w-xs md:max-w-sm hidden sm:block relative z-30 ml-4">
                    <button
                        type="button"
                        onClick={() => setIsSearchOpen(true)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-2xl text-muted-foreground transition-all cursor-pointer text-xs font-bold"
                    >
                        <div className="flex items-center gap-2">
                            <Search size={14} className="text-muted-foreground/60" />
                            <span>Buscar...</span>
                        </div>
                        <div className="flex items-center gap-0.5 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-md font-mono text-[9px] text-muted-foreground/60">
                            <span>⌘</span>
                            <span>K</span>
                        </div>
                    </button>
                </div>

                <div className="flex-1" />

                {/* Actions */}
                <div className="flex items-center gap-1 sm:gap-3 lg:gap-5 shrink-0">
                    {/* Mobile Search Button */}
                    <button
                        type="button"
                        onClick={() => setIsSearchOpen(true)}
                        className="sm:hidden p-2.5 rounded-full hover:bg-foreground/5 text-muted-foreground relative transition-colors"
                        aria-label="Buscar"
                    >
                        <Search size={20} />
                    </button>
                    {/* Theme Toggle — hidden on smallest screens */}
                    <div className="relative hidden sm:block" ref={paletteRef}>
                        <button
                            onClick={() => setShowPalette(!showPalette)}
                            className="p-2.5 sm:p-3 rounded-full hover:bg-foreground/5 text-muted-foreground hover:text-primary transition-colors relative"
                            aria-label="Cambiar paleta de tema"
                        >
                            <Palette size={20} aria-hidden="true" />
                            <motion.div
                                layoutId="active-theme"
                                className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-primary"
                            />
                        </button>

                        <AnimatePresence>
                            {showPalette && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 mt-3 p-3 w-48 glass-card rounded-2xl shadow-2xl z-60 border border-foreground/10"
                                >
                                    <p className="text-xs font-semibold text-muted-foreground px-2 mb-3 uppercase tracking-wider">Paleta de Temas</p>
                                    <div className="grid grid-cols-1 gap-1">
                                        {themes.map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => {
                                                    setColorScheme(t.id);
                                                    setShowPalette(false);
                                                }}
                                                className={`flex items-center justify-between p-2 rounded-xl transition-all ${colorScheme === t.id ? 'bg-primary/10 text-primary' : 'hover:bg-foreground/5'}`}
                                            >
                                                <div className="flex items-center">
                                                    <div className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: t.color }} />
                                                    <span className="text-sm font-bold text-foreground">{t.name}</span>
                                                </div>
                                                {colorScheme === t.id && <Check size={14} />}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Share Link Button — hidden on smallest screens */}
                    {(userData?.role === 'admin' || userData?.role === 'recepcion' || userData?.role === 'creator') && !isRegistrarBloqueado && (
                        <button
                            onClick={handleShareLink}
                            className="hidden sm:inline-flex p-2.5 sm:p-3 rounded-full hover:bg-foreground/5 text-muted-foreground hover:text-primary transition-colors relative"
                            title="Compartir enlace de formulario"
                            aria-label="Compartir enlace de formulario"
                        >
                            <Share2 size={20} aria-hidden="true" />
                        </button>
                    )}

                    {/* Notifications */}
                    {!isRegistrarBloqueado && (
                        <div className="relative" ref={notificationsRef}>
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="p-2.5 sm:p-3 rounded-full hover:bg-foreground/5 text-muted-foreground relative transition-colors"
                            >
                                <Bell size={20} />
                                {notifications.length > 0 && (
                                    <span className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background" />
                                )}
                            </button>

                            <AnimatePresence>
                                {showNotifications && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="fixed sm:absolute left-1/2 sm:left-auto -translate-x-1/2 sm:translate-x-0 sm:right-0 top-[4.5rem] sm:top-auto sm:mt-3 p-0 w-[calc(100vw-1.5rem)] sm:w-[400px] max-w-[400px] bg-[#1a1f2e] rounded-3xl shadow-2xl z-[100] border border-white/10 overflow-hidden"
                                    >
                                        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-[#1a1f2e]">
                                            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Notificaciones</p>
                                            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-bold">{notifications.length}</span>
                                        </div>
                                        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                            {notifications.length > 0 ? (
                                                notifications.map((n) => (
                                                    <div
                                                        key={n.id}
                                                        className="p-4 rounded-2xl bg-[#0f1219] hover:bg-[#131720] transition-all group flex flex-col gap-3 border border-white/5 relative overflow-hidden"
                                                    >
                                                        {/* Accent decoration */}
                                                        <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500/50 rounded-r-lg opacity-0 group-hover:opacity-100 transition-opacity" />

                                                        <div className="flex items-start gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0 mt-1">
                                                                <Bell size={18} />
                                                            </div>
                                                            <div className="flex-1 min-w-0 space-y-1">
                                                                <p className="text-base font-bold truncate text-white group-hover:text-emerald-400 transition-colors">
                                                                    {n.title || 'Notificación del Sistema'}
                                                                </p>
                                                                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                                                                    {n.message}
                                                                </p>
                                                                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider pt-1">
                                                                    {formatChileTime(n.created_at)} • {formatChileDate(n.created_at)}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 mt-2">
                                                            <button
                                                                onClick={(e) => handleViewSubmission(e, n)}
                                                                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                                                            >
                                                                <Eye size={16} />
                                                                Ver
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDeleteNotification(n.id, e)}
                                                                className="p-3 rounded-xl bg-white/5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="py-12 text-center opacity-50 flex flex-col items-center">
                                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-muted-foreground">
                                                        <Bell size={24} />
                                                    </div>
                                                    <p className="text-sm font-medium text-muted-foreground">No tienes notificaciones pendientes</p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* User Profile */}
                    <div className="relative" ref={userMenuRef}>
                        <div
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center sm:pl-3 lg:pl-5 sm:border-l border-foreground/10 cursor-pointer group"
                        >
                            <div className="text-right mr-4 hidden lg:block">
                                <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                                    {tenantData?.name || 'Cargando...'}
                                </p>
                                <div className="flex items-center justify-end gap-2 mt-0.5">
                                    <span className="text-[9px] px-1.5 py-0.5 rounded border border-primary/20 bg-primary/10 text-primary font-black uppercase tracking-wider">
                                        Plan {planNames[tenantData?.subscription_plan?.name || 'FREE'] || tenantData?.subscription_plan?.name || '...'}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider opacity-60">
                                        {userData?.role ? (roleNames[userData.role] || userData.role) : '...'}
                                    </span>
                                </div>
                            </div>
                            <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                                <User size={18} aria-hidden="true" />
                            </div>
                        </div>

                        <AnimatePresence>
                            {showUserMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 mt-3 p-2 w-56 glass-card rounded-2xl shadow-2xl z-60 border border-foreground/10"
                                >
                                    <div className="p-3 border-b border-foreground/5 mb-2">
                                        <p className="text-sm font-bold truncate">{userData?.email}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">Socio Premium</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Link
                                            href="/dashboard/perfil"
                                            onClick={() => setShowUserMenu(false)}
                                            className="flex items-center w-full p-3 rounded-xl hover:bg-foreground/5 text-sm font-medium transition-all"
                                        >
                                            <User size={16} className="mr-3 text-muted-foreground" />
                                            Mi Perfil
                                        </Link>
                                        {(userData?.role === 'admin' || userData?.role === 'creator') && (
                                            <button
                                                onClick={() => {
                                                    router.push('/dashboard/configuracion');
                                                    setShowUserMenu(false);
                                                }}
                                                className="flex items-center w-full p-3 rounded-xl hover:bg-foreground/5 text-sm font-medium transition-all"
                                            >
                                                <Palette size={16} className="mr-3 text-muted-foreground" />
                                                Configuración
                                            </button>
                                        )}
                                        <div className="h-px bg-foreground/5 my-2" />
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center w-full p-3 rounded-xl hover:bg-red-500/10 text-red-500 text-sm font-bold transition-all"
                                        >
                                            <LogOut size={16} className="mr-3" />
                                            Cerrar Sesión
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </header>

            <SubmissionDetailModal
                isOpen={isModalOpen}
                submissionId={selectedSubmissionId}
                onClose={() => setIsModalOpen(false)}
                onProcessed={() => {
                    queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
                    setIsModalOpen(false);
                }}
                onDeleted={() => {
                    queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
                    setIsModalOpen(false);
                }}
            />

            <Modal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                title="Compartir Formulario Público"
                maxWidth="max-w-md"
            >
                <div className="space-y-6">
                    <div className="space-y-2">
                        <p className="text-muted-foreground text-sm">
                            Copia este enlace temporal para compartir el formulario de registro con tus clientes.
                        </p>
                        {tokenExpiry && (
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">Tiempo restante:</span>
                                <span className={`font-mono font-bold ${timeRemaining === 'Expirado' ? 'text-red-500' :
                                    timeRemaining.startsWith('0:') && parseInt(timeRemaining.split(':')[1]) < 10 ? 'text-orange-500' :
                                        'text-primary'
                                    }`}>
                                    {timeRemaining}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="relative group">
                        <input
                            readOnly
                            value={tempToken && tenantData ?
                                `${process.env.NEXT_PUBLIC_PUBLIC_FORM_URL ||
                                (typeof window !== 'undefined'
                                    ? `${window.location.protocol}//${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'}`
                                    : 'http://localhost:3000')
                                }/${tenantData.slug}/form?token=${tempToken}` :
                                'Generando enlace...'
                            }
                            className="w-full bg-foreground/5 border border-foreground/10 rounded-2xl py-4 pl-4 pr-12 outline-none text-sm font-mono text-primary truncate"
                        />
                        <button
                            onClick={copyToClipboardHandler}
                            disabled={!tempToken}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-primary/20 text-primary rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Copiar enlace"
                        >
                            <Copy size={18} />
                        </button>
                    </div>

                    <button
                        onClick={generateTemporaryToken}
                        disabled={isGeneratingToken}
                        className="w-full py-2.5 text-xs bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 rounded-xl font-bold transition-all disabled:opacity-50"
                    >
                        {isGeneratingToken ? 'Generando...' : '🔄 Generar Nuevo Enlace'}
                    </button>

                    <div className="flex justify-end gap-3 pt-4 border-t border-foreground/5">
                        <button
                            onClick={() => setIsShareModalOpen(false)}
                            className="px-6 py-3 rounded-2xl hover:bg-foreground/5 font-bold transition-all text-muted-foreground hover:text-white"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={copyToClipboardHandler}
                            disabled={!tempToken}
                            className="bg-primary text-primary-foreground px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Copy size={18} className="mr-2" />
                            Copiar URL
                        </button>
                    </div>
                </div>
            </Modal>
            {/* Notification Detail Modal Rediseñado */}
            <NotificationDetailModal
                isOpen={showNotifModal}
                onClose={() => setShowNotifModal(false)}
                notification={selectedNotification}
                onMarkAsRead={(id) => {
                    handleMarkAsRead(id);
                    setShowNotifModal(false);
                }}
                onDelete={(id) => {
                    handleDeleteNotification(id);
                    setShowNotifModal(false);
                }}
            />
            <GlobalSearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
            />
        </>
    );
}
