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
    Search,
    Link2,
    Clock,
    Globe,
    Store,
    ShieldCheck,
    Sun,
    Moon
} from 'lucide-react';
import Modal from '@/components/tenant/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { apiRequest } from '@/lib/tenant/api';
import { isOwnerRole } from '@/lib/tenant/roles';
import { clearToken } from '@/lib/auth/token';
import { formatChileDate, formatChileTime } from '@/lib/dates';
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
    const { activeTheme, toggleTheme } = useTheme();
    const { showToast } = useToast();
    const router = useRouter();
    const [showPalette, setShowPalette] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
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
    const [shareMode, setShareMode] = useState<'permanent' | 'temporary'>('permanent');

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
        if (!tempToken) {
            await generateTemporaryToken();
        }
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

    const getFormUrl = (mode: 'permanent' | 'temporary') => {
        if (!tenantData?.slug) return '';
        const baseUrl = process.env.NEXT_PUBLIC_PUBLIC_FORM_URL ||
            (typeof window !== 'undefined'
                ? `${window.location.protocol}//${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'}`
                : 'http://localhost:3000');
        
        if (mode === 'permanent') {
            const permToken = tenantData.public_token;
            return permToken 
                ? `${baseUrl}/${tenantData.slug}/form?token=${permToken}` 
                : `${baseUrl}/${tenantData.slug}/form`;
        } else {
            return tempToken 
                ? `${baseUrl}/${tenantData.slug}/form?token=${tempToken}` 
                : '';
        }
    };

    const copyToClipboardHandler = async (textToCopy?: string) => {
        const targetText = textToCopy || getFormUrl(shareMode);
        if (!targetText) {
            showToast('Enlace no disponible aún', 'error');
            return;
        }

        const success = await copyToClipboard(targetText);
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
            <header className="h-16 sm:h-20 sticky top-0 z-30 flex-shrink-0 flex items-center justify-between px-3 sm:px-6 lg:px-8 bg-[#F4F7FC]/80 dark:bg-[#080E1A]/80 backdrop-blur-md gap-3">
                <div className="flex items-center gap-2 sm:gap-3 relative z-30 shrink-0">
                    {/* Hamburger — mobile/tablet only */}
                    <button
                        onClick={toggleMobile}
                        className="lg:hidden p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs"
                        aria-label="Abrir menú de navegación"
                    >
                        <Menu size={20} aria-hidden="true" />
                    </button>
                </div>

                {/* Buscador grande y redondeado como en la imagen */}
                <div className="flex-1 max-w-md hidden sm:block relative z-30 ml-2">
                    <button
                        type="button"
                        onClick={() => setIsSearchOpen(true)}
                        className="w-full flex items-center justify-between px-5 py-2.5 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 rounded-full text-slate-400 dark:text-slate-400 transition-all cursor-pointer text-xs font-medium shadow-xs"
                    >
                        <div className="flex items-center gap-2.5">
                            <Search size={16} className="text-slate-400" />
                            <span>Buscar mascota, cliente o código...</span>
                        </div>
                        <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-full font-mono text-[9px] text-slate-400">
                            <span>⌘</span>
                            <span>K</span>
                        </div>
                    </button>
                </div>

                <div className="flex-1" />

                {/* Actions */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {/* Mobile Search Button */}
                    <button
                        type="button"
                        onClick={() => setIsSearchOpen(true)}
                        className="sm:hidden p-2.5 rounded-full hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 relative transition-colors"
                        aria-label="Buscar"
                    >
                        <Search size={20} />
                    </button>

                    {/* Toggle Único: Light / Dark Mode */}
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 sm:p-3 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-all shadow-2xs hover:scale-105"
                        title={activeTheme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
                        aria-label="Cambiar modo claro / oscuro"
                    >
                        {activeTheme === 'light' ? (
                            <Moon size={18} className="transition-transform hover:-rotate-12" />
                        ) : (
                            <Sun size={18} className="text-amber-400 transition-transform hover:rotate-45" />
                        )}
                    </button>

                    {/* Share Link Button */}
                    {(userData?.role === 'admin' || userData?.role === 'recepcion' || userData?.role === 'creator') && !isRegistrarBloqueado && (
                        <button
                            onClick={handleShareLink}
                            className="inline-flex p-2.5 sm:p-3 rounded-full hover:bg-slate-100 text-slate-600 hover:text-[#19B5FE] transition-colors relative dark:hover:bg-slate-800 dark:text-slate-300"
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
                                className="p-2.5 sm:p-3 rounded-full hover:bg-slate-100 text-slate-600 hover:text-[#19B5FE] relative transition-colors dark:hover:bg-slate-800 dark:text-slate-300"
                            >
                                <Bell size={20} />
                                {notifications.length > 0 && (
                                    <span className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                                )}
                            </button>

                            <AnimatePresence>
                                {showNotifications && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="fixed sm:absolute left-1/2 sm:left-auto -translate-x-1/2 sm:translate-x-0 sm:right-0 top-[4.5rem] sm:top-auto sm:mt-3 p-0 w-[calc(100vw-1.5rem)] sm:w-[400px] max-w-[400px] bg-white rounded-3xl shadow-2xl z-[100] border border-slate-200 overflow-hidden dark:bg-slate-900 dark:border-slate-800"
                                    >
                                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white dark:border-slate-800 dark:bg-slate-900">
                                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Notificaciones</p>
                                            <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">{notifications.length}</span>
                                        </div>
                                        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                                            {notifications.length > 0 ? (
                                                notifications.map((n) => (
                                                    <div
                                                        key={n.id}
                                                        className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 transition-all group flex flex-col gap-2.5 border border-slate-100 relative overflow-hidden dark:bg-slate-800/50 dark:border-slate-800"
                                                    >
                                                        {/* Accent decoration */}
                                                        <div className="absolute top-0 right-0 w-1 h-full bg-[#10B981] rounded-r-lg opacity-0 group-hover:opacity-100 transition-opacity" />

                                                        <div className="flex items-start gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 flex-shrink-0 mt-0.5">
                                                                <Bell size={16} />
                                                            </div>
                                                            <div className="flex-1 min-w-0 space-y-1">
                                                                <p className="text-sm font-bold truncate text-slate-900 group-hover:text-[#19B5FE] transition-colors dark:text-white">
                                                                    {n.title || 'Notificación del Sistema'}
                                                                </p>

                                                                {/* Badge de Origen: Formulario Web vs Veterinaria */}
                                                                {(() => {
                                                                    const isVet = n.data?.origin === 'veterinaria' ||
                                                                        Boolean(n.data?.partner_name) ||
                                                                        (n.message && (n.message.toLowerCase().includes('derivó') || n.message.toLowerCase().includes('veterinaria')));
                                                                    const isWebForm = (n.type === 'new_submission' || n.data?.origin === 'web_crematorio') && !isVet;

                                                                    if (isVet) {
                                                                        const partnerName = n.data?.partner_name || (n.message?.match(/^(.*?)\s+derivó/)?.[1] || '');
                                                                        return (
                                                                            <div className="pt-0.5">
                                                                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                                                                                    <Store size={11} className="shrink-0" />
                                                                                    <span>Veterinaria{partnerName ? `: ${partnerName}` : ''}</span>
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (isWebForm) {
                                                                        return (
                                                                            <div className="pt-0.5">
                                                                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                                                                    <Globe size={11} className="shrink-0" />
                                                                                    <span>Web Crematorio</span>
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return null;
                                                                })()}

                                                                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                                                                    {n.message}
                                                                </p>
                                                                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider pt-1 dark:text-slate-300">
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
                            className="flex items-center sm:pl-3 lg:pl-4 sm:border-l border-slate-200 cursor-pointer group dark:border-slate-800"
                        >
                            <div className="text-right mr-3 hidden lg:block">
                                <p className="text-xs font-bold text-[#020210] group-hover:text-[#0284c7] transition-colors dark:text-white">
                                    {tenantData?.name || 'Cargando...'}
                                </p>
                                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                    {isOwnerRole(userData?.role) && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-700 font-black uppercase tracking-wider">
                                            Plan {planNames[tenantData?.subscription_plan?.name || 'FREE'] || tenantData?.subscription_plan?.name || '...'}
                                        </span>
                                    )}
                                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                                        {userData?.role ? (roleNames[userData.role] || userData.role) : '...'}
                                    </span>
                                </div>
                            </div>
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-[#19B5FE] to-[#10B981] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-all duration-200">
                                <User size={18} aria-hidden="true" />
                            </div>
                        </div>

                        <AnimatePresence>
                            {showUserMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 mt-3 p-2 w-56 bg-white rounded-2xl shadow-xl z-60 border border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                                >
                                    <div className="p-3 border-b border-slate-100 mb-1 dark:border-slate-800">
                                        <p className="text-xs font-bold truncate text-[#020210] dark:text-white">{userData?.email}</p>
                                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Socio Premium</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <Link
                                            href="/dashboard/perfil"
                                            onClick={() => setShowUserMenu(false)}
                                            className="flex items-center w-full p-2.5 rounded-xl hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all dark:hover:bg-slate-800 dark:text-slate-200"
                                        >
                                            <User size={15} className="mr-2.5 text-slate-400" />
                                            Mi Perfil
                                        </Link>
                                        {(userData?.role === 'admin' || userData?.role === 'creator') && (
                                            <button
                                                onClick={() => {
                                                    router.push('/dashboard/configuracion');
                                                    setShowUserMenu(false);
                                                }}
                                                className="flex items-center w-full p-2.5 rounded-xl hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all dark:hover:bg-slate-800 dark:text-slate-200"
                                            >
                                                <Palette size={15} className="mr-2.5 text-slate-400" />
                                                Configuración
                                            </button>
                                        )}
                                        <div className="h-px bg-slate-100 my-1 dark:bg-slate-800" />
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center w-full p-2.5 rounded-xl hover:bg-red-50 text-red-600 text-xs font-bold transition-all"
                                        >
                                            <LogOut size={15} className="mr-2.5" />
                                            Cerrar Sesión
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </header>

            <Modal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                title="Compartir Formulario Público"
                maxWidth="max-w-lg"
            >
                <div className="space-y-6">
                    {/* Selector de tipo de enlace */}
                    <div className="grid grid-cols-2 p-1.5 bg-foreground/5 rounded-2xl border border-foreground/10 gap-1.5">
                        <button
                            onClick={() => setShareMode('permanent')}
                            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                                shareMode === 'permanent'
                                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                            }`}
                        >
                            <Globe size={15} />
                            Enlace Permanente
                        </button>
                        <button
                            onClick={() => setShareMode('temporary')}
                            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                                shareMode === 'temporary'
                                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                            }`}
                        >
                            <Clock size={15} />
                            Enlace Temporal (3 Días)
                        </button>
                    </div>

                    {/* Contenido según pestaña activa */}
                    {shareMode === 'permanent' ? (
                        <div className="space-y-4">
                            <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-2xl flex items-start gap-3">
                                <ShieldCheck size={20} className="text-primary shrink-0 mt-0.5" />
                                <div className="space-y-1 text-xs">
                                    <p className="font-bold text-foreground">Enlace Fijo para Redes y Sitio Web</p>
                                    <p className="text-muted-foreground">
                                        Este enlace nunca expira. Es ideal para vincular en tu sitio web, perfil de Instagram, WhatsApp Business o folletos.
                                    </p>
                                </div>
                            </div>

                            <div className="relative group">
                                <input
                                    readOnly
                                    value={getFormUrl('permanent') || 'Cargando enlace...'}
                                    className="w-full bg-foreground/5 border border-foreground/10 rounded-2xl py-3.5 pl-4 pr-12 outline-none text-xs sm:text-sm font-mono text-primary truncate selection:bg-primary/20"
                                />
                                <button
                                    onClick={() => copyToClipboardHandler(getFormUrl('permanent'))}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-primary/20 text-primary rounded-xl transition-all"
                                    title="Copiar enlace permanente"
                                >
                                    <Copy size={17} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <p className="text-muted-foreground text-xs sm:text-sm">
                                    Enlace con vigencia de 3 días diseñado para enviar a clientes particulares en atenciones puntuales.
                                </p>
                                {tokenExpiry && (
                                    <div className="flex items-center gap-2 text-xs bg-foreground/5 px-3 py-1.5 rounded-xl w-fit border border-foreground/5">
                                        <span className="text-muted-foreground">Tiempo restante:</span>
                                        <span className={`font-mono font-bold ${
                                            timeRemaining === 'Expirado' ? 'text-red-500' :
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
                                    value={getFormUrl('temporary') || (isGeneratingToken ? 'Generando enlace temporal...' : 'Genera un nuevo enlace')}
                                    className="w-full bg-foreground/5 border border-foreground/10 rounded-2xl py-3.5 pl-4 pr-12 outline-none text-xs sm:text-sm font-mono text-primary truncate selection:bg-primary/20"
                                />
                                <button
                                    onClick={() => copyToClipboardHandler(getFormUrl('temporary'))}
                                    disabled={!tempToken}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-primary/20 text-primary rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Copiar enlace temporal"
                                >
                                    <Copy size={17} />
                                </button>
                            </div>

                            <button
                                onClick={generateTemporaryToken}
                                disabled={isGeneratingToken}
                                className="w-full py-2.5 text-xs bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isGeneratingToken ? 'Generando nuevo token...' : '🔄 Generar Nuevo Enlace Temporal'}
                            </button>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-foreground/5">
                        <button
                            onClick={() => setIsShareModalOpen(false)}
                            className="px-5 py-2.5 rounded-xl hover:bg-foreground/5 font-bold transition-all text-muted-foreground hover:text-foreground text-xs sm:text-sm"
                        >
                            Cerrar
                        </button>
                        <button
                            onClick={() => copyToClipboardHandler()}
                            disabled={shareMode === 'temporary' && !tempToken}
                            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center gap-2 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Copy size={16} />
                            Copiar {shareMode === 'permanent' ? 'Enlace Permanente' : 'Enlace Temporal'}
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
