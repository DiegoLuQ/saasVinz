"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '@/lib/tenant/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck,
    Lock,
    Unlock,
    CheckCircle2,
    Circle,
    Save,
    Trash2,
    LayoutDashboard,
    Dog,
    ClipboardList,
    Package,
    CreditCard,
    FileText,
    Settings,
    MessageSquare,
    Target,
    ChevronRight,
    Search,
    AlertCircle,
    UserMinus,
    UserCheck,
    Mail,
    Fingerprint,
    Pencil,
    Shield,
    X,
    Flame,
    Users,
    Briefcase,
    BarChart3,
    Megaphone,
    Activity,
    Palette,
    ShoppingBag
} from 'lucide-react';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { useRouter } from 'next/navigation';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useCurrentUser, useCurrentTenant } from '@/hooks/useSessionBootstrap';
import { useTenantUsers, useToggleUserStatus, useUpdateUser } from '@/hooks/useUsers';
import { useRoleConfig, useUserPermissions, useSaveUserPermissions } from '@/hooks/useRoles';
import { useSessionBootstrap } from '@/hooks/useSessionBootstrap';

const MODULE_ICONS: Record<string, any> = {
    dashboard: LayoutDashboard,
    clientes: Users,
    mascotas: Dog,
    ordenes: Flame,
    servicios: Palette,
    inventario: ShoppingBag,
    pagos: CreditCard,
    certificados: FileText,
    operaciones: Briefcase,
    configuracion: ShieldCheck,
};

const OPERATIONAL_MODULE_KEYS = [
    'dashboard',
    'clientes',
    'mascotas',
    'servicios',
    'ordenes',
    'inventario',
    'certificados',
    'pagos',
    'operaciones',
    'veterinarios',
    'configuracion'
];

// Iconos/descripciones por rol. La LISTA de roles viene del backend (habilitados);
// aquí solo mapeamos el ícono y la descripción por key.
const ROLE_META: Record<string, { icon: any; desc: string }> = {
    admin: { icon: ShieldCheck, desc: 'Control total de la cuenta.' },
    recepcion: { icon: Users, desc: 'Gestión de clientes, mascotas y órdenes.' },
    operador_cremacion: { icon: Flame, desc: 'Procesamiento de servicios y certificados.' },
    contabilidad: { icon: BarChart3, desc: 'Pagos y reportes contables.' },
    marketing: { icon: Megaphone, desc: 'Campañas y comunicación.' },
    auditor: { icon: Activity, desc: 'Acceso de solo lectura y auditoría.' },
    operator: { icon: Briefcase, desc: 'Operaciones generales.' },
    driver: { icon: Package, desc: 'Retiros y transporte.' },
};

export default function RolesModulosPage() {
    const queryClient = useQueryClient();
    const router = useRouter();
    const { data: bootstrapData, isLoading: loadingBootstrap } = useSessionBootstrap();
    const bootstrapUser = bootstrapData?.user;
    const bootstrapTenant = bootstrapData?.tenant;

    // Lista de roles = roles habilitados (el SuperAdmin puede desactivarlos).
    const { data: enabledRoles } = useQuery<{ key: string; label: string; is_system: boolean }[]>({
        queryKey: ['enabled-roles'],
        queryFn: () => apiRequest('/api/internal/admin/roles/enabled'),
    });
    const ROLES = useMemo(
        () => (enabledRoles || [])
            .filter(r => r.key !== 'creator')
            .map(r => ({ id: r.key, name: r.label, icon: ROLE_META[r.key]?.icon || Shield, desc: ROLE_META[r.key]?.desc || '' })),
        [enabledRoles]
    );

    const [selectedRole, setSelectedRole] = useState('admin');
    const [searchTerm, setSearchTerm] = useState('');

    // Modals state
    const [editingUser, setEditingUser] = useState<any>(null);
    const [permissionsUser, setPermissionsUser] = useState<any>(null);
    const [userPermissions, setUserPermissions] = useState<any[]>([]);
    const [loadingPerms, setLoadingPerms] = useState(false);
    const [savingPerms, setSavingPerms] = useState(false);

    const [togglingUser, setTogglingUser] = useState<number | null>(null);

    const { showToast } = useToast();

    // TanStack Query Hooks
    const { data: users = [], isLoading: loadingUsers } = useTenantUsers(!!bootstrapUser && (bootstrapUser.role === 'admin' || bootstrapUser.role === 'creator'));

    const { data: rawModules = [], isLoading: loadingModules } = useRoleConfig(selectedRole);

    const allowedModuleKeys = bootstrapData?.rbac.modules.map((m: any) => m.module_key) || [];

    const modules = React.useMemo(() =>
        rawModules.filter((m: any) =>
            OPERATIONAL_MODULE_KEYS.includes(m.module_key) &&
            allowedModuleKeys.includes(m.module_key)
        ),
        [rawModules, allowedModuleKeys]);

    const toggleUserStatusMutation = useToggleUserStatus();
    const updateUserMutation = useUpdateUser();
    const savePermissionsMutation = useSaveUserPermissions();

    useEffect(() => {
        if (bootstrapUser && bootstrapUser.role !== 'admin' && bootstrapUser.role !== 'creator') {
            router.push('/dashboard');
        }
    }, [bootstrapUser, router]);

    // Access Protection based on 'configuracion' module permission
    const hasConfigPermission = bootstrapData?.rbac.modules.some((m: any) => m.module_key === 'configuracion' && m.is_active);

    if (!hasConfigPermission && !loadingModules) {
        return (
            <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto">
                <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 border border-primary/20">
                    <ShieldCheck size={48} className="text-primary" />
                </div>
                <h1 className="text-4xl font-bold mb-4">Acceso Restringido</h1>
                <p className="text-xl text-muted-foreground mb-8">
                    La gestión avanzada de roles y módulos es una característica exclusiva de los planes <span className="text-primary font-bold">PRO</span> y <span className="text-emerald-400 font-bold">ULTRA</span>.
                </p>
                <p className="text-sm text-muted-foreground/60 mb-8 border border-white/5 bg-white/5 p-4 rounded-xl">
                    Actualiza tu plan para definir qué módulos puede ver cada empleado y controlar los permisos granulares de tu equipo.
                </p>
            </div>
        );
    }

    const handleToggleUser = async (userId: number, currentStatus: boolean) => {
        if (bootstrapUser?.id === userId) return;

        setTogglingUser(userId);
        try {
            await toggleUserStatusMutation.mutateAsync({
                userId,
                isActive: !currentStatus
            });
        } catch (error) {
            // Error handled in mutation
        } finally {
            setTogglingUser(null);
        }
    };

    const fetchUserPermissions = async (userId: number) => {
        setLoadingPerms(true);
        try {
            const data = await apiRequest(`/api/internal/auth/users/${userId}/permissions`);
            // Filtrar solo módulos operativos
            const filtered = data.filter((p: any) => OPERATIONAL_MODULE_KEYS.includes(p.module_key));
            setUserPermissions(filtered);
        } catch (error) {
            console.error('Error fetching user permissions:', error);
        } finally {
            setLoadingPerms(false);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        const form = e.target as HTMLFormElement;
        const name = (form.elements.namedItem('name') as HTMLInputElement).value;
        const email = (form.elements.namedItem('email') as HTMLInputElement).value;
        const role = (form.elements.namedItem('role') as HTMLSelectElement).value;
        const password = (form.elements.namedItem('password') as HTMLInputElement).value;

        try {
            const body: any = { name, email, role };
            if (password) body.password = password;

            await updateUserMutation.mutateAsync({
                userId: editingUser.id,
                data: body
            });
            setEditingUser(null);
        } catch (error) {
            // Error handled in mutation
        }
    };

    const handleSavePermissions = async () => {
        if (!permissionsUser) return;
        setSavingPerms(true);
        try {
            await savePermissionsMutation.mutateAsync({
                userId: permissionsUser.id,
                permissions: userPermissions
            });
            setPermissionsUser(null);
        } catch (error) {
            // Error handled in mutation
        } finally {
            setSavingPerms(false);
        }
    };

    const togglePermissionAction = (moduleKey: string, action: string) => {
        setUserPermissions(prev => prev.map(p => {
            if (p.module_key === moduleKey) {
                return {
                    ...p,
                    actions: {
                        ...p.actions,
                        [action]: !p.actions[action as keyof typeof p.actions]
                    }
                };
            }
            return p;
        }));
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Roles y Módulos</h1>
                <p className="text-muted-foreground mt-1 text-lg">
                    Gestiona los accesos y funcionalidades disponibles para cada perfil de tu empresa.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Role Selector */}
                <div className="lg:col-span-4 space-y-4">
                    <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest ml-1">Seleccionar Rol</h2>
                    <div className="space-y-2">
                        {ROLES.map((role) => (
                            <button
                                key={role.id}
                                onClick={() => setSelectedRole(role.id)}
                                className={`w-full text-left p-4 rounded-2xl transition-all duration-300 border flex items-center group relative overflow-hidden ${selectedRole === role.id
                                    ? 'bg-primary border-primary text-primary-foreground shadow-xl shadow-primary/20'
                                    : 'bg-white/5 border-white/10 hover:border-primary/50 text-foreground'
                                    }`}
                            >
                                <div className={`p-3 rounded-xl mr-4 transition-colors ${selectedRole === role.id ? 'bg-white/20' : 'bg-white/5 group-hover:bg-primary/10 group-hover:text-primary'
                                    }`}>
                                    <role.icon size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold">{role.name}</p>
                                    <p className={`text-xs mt-0.5 ${selectedRole === role.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                        {role.desc}
                                    </p>
                                </div>
                                <ChevronRight className={`transition-transform duration-300 ${selectedRole === role.id ? 'translate-x-0' : '-translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0'}`} size={18} />
                            </button>
                        ))}
                    </div>

                    <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 mt-6">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="text-primary mt-0.5" size={18} />
                            <div className="text-sm space-y-2">
                                <p className="font-bold text-primary">Acceso definido globalmente</p>
                                <p className="text-muted-foreground leading-relaxed">
                                    El acceso a módulos de cada rol lo define el <strong>SuperAdmin del SaaS</strong>. Aquí solo se muestra (lectura); no es editable desde el tenant.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modules Manager */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="flex items-center justify-between ml-1">
                        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                            Módulos Habilitados para {ROLES.find(r => r.id === selectedRole)?.name}
                        </h2>
                        {loadingModules && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-sm">
                        <div className="p-4 border-b border-white/5 bg-white/5 flex items-center gap-3">
                            <Search className="text-muted-foreground" size={18} />
                            <input
                                type="text"
                                placeholder="Filtrar módulos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground font-medium"
                            />
                        </div>

                        <div className="divide-y divide-white/5">
                            <AnimatePresence mode="wait">
                                {loadingModules ? (
                                    <motion.div
                                        key="loader"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="p-12 flex flex-col items-center justify-center text-muted-foreground"
                                    >
                                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                                        <p className="font-medium animate-pulse">Cargando módulos permitidos...</p>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="content"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="grid grid-cols-1 p-2 gap-1"
                                    >
                                        {modules.filter(m =>
                                            m.is_active &&
                                            m.name.toLowerCase().includes(searchTerm.toLowerCase())
                                        ).map((mod) => {
                                            const Icon = MODULE_ICONS[mod.module_key] || Activity;
                                            return (
                                                <div
                                                    key={mod.module_key}
                                                    className="p-4 rounded-2xl flex items-center justify-between transition-all duration-200 bg-primary/5"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${mod.is_active
                                                            ? 'bg-primary/10 border-primary/20 text-primary'
                                                            : 'bg-white/5 border-white/10 text-muted-foreground'
                                                            }`}>
                                                            <Icon size={22} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-bold text-lg">{mod.name}</p>
                                                                {mod.is_mandatory && (
                                                                    <span className="bg-primary/20 text-primary text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter flex items-center gap-1">
                                                                        <Lock size={10} /> Obligatorio
                                                                    </span>
                                                                )}
                                                                {!mod.is_in_blueprint && (
                                                                    <span className="bg-amber-500/20 text-amber-400 text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                                        Extra
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-muted-foreground">
                                                                {mod.is_in_blueprint
                                                                    ? "Módulo recomendado para este perfil."
                                                                    : "Módulo adicional asignado manualmente."}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
                                                        <CheckCircle2 size={12} /> Con acceso
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        {modules.filter(m =>
                                            m.is_active &&
                                            m.name.toLowerCase().includes(searchTerm.toLowerCase())
                                        ).length === 0 && (
                                            <div className="p-10 text-center text-muted-foreground text-sm">
                                                Este rol no tiene módulos con acceso.
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
                            <p className="text-xs text-muted-foreground">
                                Esta lista es solo informativa. El acceso a módulos por rol se administra globalmente desde el panel del SuperAdmin.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Users Table Section */}
            {(bootstrapUser?.role === 'admin' || bootstrapUser?.role === 'creator') && (
                <div className="space-y-4 pt-8">
                    <div className="flex items-center justify-between ml-1">
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">Cuentas Registradas</h2>
                            <p className="text-muted-foreground text-sm">Gestiona el acceso de los empleados de tu sucursal.</p>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-3xl overflow-x-auto backdrop-blur-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/5">
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Empleado</th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Rol / Acceso</th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loadingUsers ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center">
                                                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                                                <p className="text-xs animate-pulse">Cargando nómina...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : users.map((user) => (
                                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm">{user.name}</p>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Mail size={10} /> {user.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
                                                    {ROLES.find(r => r.id === user.role)?.icon && React.createElement(ROLES.find(r => r.id === user.role)!.icon, { size: 14, className: "text-primary" })}
                                                    <span className="text-xs font-medium capitalize">{user.role.replace('_', ' ')}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/20">
                                                    <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> Activo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] font-bold uppercase border border-red-500/20">
                                                    Desactivado
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {bootstrapUser?.id !== user.id && (
                                                    <button
                                                        onClick={() => setEditingUser(user)}
                                                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"
                                                        title="Editar Perfil"
                                                    >
                                                        <Pencil size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setPermissionsUser(user);
                                                        fetchUserPermissions(user.id);
                                                    }}
                                                    className="p-2 text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-all"
                                                    title="Editar Permisos"
                                                >
                                                    <Shield size={18} />
                                                </button>
                                                {bootstrapUser?.id !== user.id && (
                                                    <button
                                                        onClick={() => handleToggleUser(user.id, user.is_active)}
                                                        disabled={togglingUser === user.id}
                                                        className={`p-2 rounded-lg transition-all ${user.is_active
                                                            ? 'text-red-400 hover:bg-red-400/10'
                                                            : 'text-emerald-400 hover:bg-emerald-400/10'
                                                            }`}
                                                        title={user.is_active ? "Desactivar Cuenta" : "Activar Cuenta"}
                                                    >
                                                        {user.is_active ? <UserMinus size={18} /> : <UserCheck size={18} />}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {/* Modal: Editar Usuario */}
            <AnimatePresence>
                {editingUser && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setEditingUser(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-slate-900 border border-white/10 w-full max-w-md rounded-3xl shadow-2xl relative overflow-hidden"
                        >
                            <form onSubmit={handleUpdateUser}>
                                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                    <h3 className="text-xl font-bold">Editar Cuenta</h3>
                                    <button type="button" onClick={() => setEditingUser(null)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Nombre Completo</label>
                                        <input
                                            name="name"
                                            type="text"
                                            defaultValue={editingUser.name}
                                            required
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Correo Electrónico</label>
                                        <input
                                            name="email"
                                            type="email"
                                            defaultValue={editingUser.email}
                                            required
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Rol Asignado</label>
                                        <select
                                            name="role"
                                            defaultValue={editingUser.role}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all appearance-none"
                                        >
                                            {ROLES.map(r => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2 pt-2 border-t border-white/5">
                                        <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Nueva Contraseña (Opcional)</label>
                                        <input
                                            name="password"
                                            type="password"
                                            placeholder="••••••••"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition-all"
                                        />
                                        <p className="text-[10px] text-muted-foreground ml-1 italic">Deja en blanco para mantener la actual.</p>
                                    </div>
                                </div>
                                <div className="p-6 bg-white/5 flex gap-3">
                                    <button type="button" onClick={() => setEditingUser(null)} className="flex-1 px-4 py-3 rounded-xl border border-white/10 font-bold hover:bg-white/5 transition-all text-sm">
                                        Cancelar
                                    </button>
                                    <button type="submit" className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all text-sm flex items-center justify-center gap-2">
                                        <Save size={18} /> Guardar Perfil
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* Modal: Permisos Granulares */}
                {permissionsUser && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setPermissionsUser(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-slate-900 border border-white/10 w-full max-w-4xl rounded-3xl shadow-2xl relative overflow-hidden h-[85vh] flex flex-col"
                        >
                            <div className="p-8 border-b border-white/10 flex items-center justify-between bg-primary/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                                        <Shield size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold">Permisos Granulares</h3>
                                        <p className="text-muted-foreground text-sm">Configurando accesos para <strong>{permissionsUser.name}</strong></p>
                                    </div>
                                </div>
                                <button onClick={() => setPermissionsUser(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                {loadingPerms ? (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                                        <p className="font-bold animate-pulse">Obteniendo matriz de permisos...</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {userPermissions.map((perm) => (
                                            <div key={perm.module_key} className="p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group hover:border-primary/30 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-xl ${perm.is_active ? 'bg-primary/10 text-primary' : 'bg-white/5 text-muted-foreground'}`}>
                                                        {React.createElement(MODULE_ICONS[perm.module_key] || Activity, { size: 20 })}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-lg">{perm.module_key.charAt(0).toUpperCase() + perm.module_key.slice(1)}</p>
                                                        <p className="text-xs text-muted-foreground">Personaliza las acciones del usuario.</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-8">
                                                    {/* Acciones CRUD */}
                                                    <div className="flex items-center gap-4 bg-black/20 p-1 rounded-xl border border-white/5">
                                                        {['view', 'create', 'edit', 'delete'].map((action) => (
                                                            <button
                                                                key={action}
                                                                onClick={() => togglePermissionAction(perm.module_key, action)}
                                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${perm.actions[action]
                                                                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                                                    : 'text-muted-foreground hover:bg-white/5'
                                                                    }`}
                                                            >
                                                                {action === 'view' ? 'Ver' : action === 'create' ? 'Crear' : action === 'edit' ? 'Edit' : 'Elim'}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            setUserPermissions(prev => prev.map(p =>
                                                                p.module_key === perm.module_key ? { ...p, is_active: !p.is_active } : p
                                                            ));
                                                        }}
                                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ${perm.is_active ? 'bg-primary' : 'bg-white/20'}`}
                                                    >
                                                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${perm.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-8 bg-white/5 border-t border-white/10 flex justify-end gap-4">
                                <button onClick={() => setPermissionsUser(null)} className="px-6 py-3 rounded-2xl border border-white/10 font-bold hover:bg-white/10 transition-all">
                                    Descartar
                                </button>
                                <button
                                    onClick={handleSavePermissions}
                                    disabled={savingPerms}
                                    className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-2xl shadow-xl shadow-primary/20 hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {savingPerms ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={20} />}
                                    Aplicar Cambios
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
