import React, { useState } from 'react';
import {
    Users as UsersIcon,
    UserPlus,
    Pencil,
    ShieldCheck,
    Trash2
} from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import TenantUserModal from './TenantUserModal';
import TenantUserPermissionsModal from './TenantUserPermissionsModal';
import { planColors, planNames } from './TenantGeneralTab';
import type { TenantUser, UserFormData } from './types';

interface TenantUsersTabProps {
    users: TenantUser[];
    tenantSlug: string | string[] | undefined;
    tenantName?: string;
    tenantPlan?: string;
    onShowToast: (text: string, type?: 'success' | 'error') => void;
    onUsersChanged: () => void;
}

const EMPTY_USER: UserFormData = {
    name: '',
    email: '',
    password: '',
    role: 'operator',
    is_active: true
};

export default function TenantUsersTab({
    users,
    tenantSlug,
    tenantName,
    tenantPlan,
    onShowToast,
    onUsersChanged
}: TenantUsersTabProps) {
    const [showUserModal, setShowUserModal] = useState(false);
    const [userModalMode, setUserModalMode] = useState<'create' | 'edit'>('create');
    const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null);
    const [userFormData, setUserFormData] = useState<UserFormData>(EMPTY_USER);
    const [savingUser, setSavingUser] = useState(false);

    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [permissionsUser, setPermissionsUser] = useState<TenantUser | null>(null);
    const [availableModules, setAvailableModules] = useState<any[]>([]);
    const [permissions, setPermissions] = useState<any[]>([]);
    const [savingPermissions, setSavingPermissions] = useState(false);

    const handleOpenUserModal = (mode: 'create' | 'edit', user: TenantUser | null = null) => {
        setUserModalMode(mode);
        setSelectedUser(user);
        if (mode === 'edit' && user) {
            setUserFormData({
                name: user.name || '',
                email: user.email || '',
                password: '',
                role: user.role || 'operator',
                is_active: user.is_active
            });
        } else {
            setUserFormData(EMPTY_USER);
        }
        setShowUserModal(true);
    };

    const handleSaveUser = async () => {
        setSavingUser(true);
        try {
            if (userModalMode === 'create') {
                await apiRequest(`/api/internal/creator/tenants/${tenantSlug}/users`, {
                    method: 'POST',
                    body: userFormData
                });
                onShowToast('Usuario creado correctamente');
            } else if (selectedUser) {
                const payload: any = { ...userFormData };
                if (!payload.password) delete payload.password;
                await apiRequest(`/api/internal/creator/users/${selectedUser.id}`, {
                    method: 'PUT',
                    body: payload
                });
                onShowToast('Usuario actualizado');
            }
            setShowUserModal(false);
            onUsersChanged();
        } catch (err: any) {
            onShowToast(err.message || 'Error al guardar usuario', 'error');
        } finally {
            setSavingUser(false);
        }
    };

    const handleDeleteUser = async (user: TenantUser) => {
        if (!confirm(`¿Estás seguro de eliminar al usuario ${user.name || user.email}? Esta acción no se puede deshacer.`)) return;
        try {
            await apiRequest(`/api/internal/creator/users/${user.id}`, { method: 'DELETE' });
            onShowToast('Usuario eliminado');
            onUsersChanged();
        } catch (err: any) {
            onShowToast(err.message || 'Error al eliminar usuario', 'error');
        }
    };

    const handleOpenPermissions = async (user: TenantUser) => {
        setPermissionsUser(user);
        try {
            const data = await apiRequest(`/api/internal/creator/users/${user.id}/permissions`);
            setAvailableModules(data.modules);
            setPermissions(data.permissions);
            setShowPermissionsModal(true);
        } catch (err: any) {
            onShowToast('Error al cargar permisos', 'error');
        }
    };

    const togglePermission = (moduleKey: string, action: string) => {
        setPermissions(prev => {
            const existing = prev.find(p => p.module_key === moduleKey);
            if (existing) {
                return prev.map(p => {
                    if (p.module_key === moduleKey) {
                        const newActions = { ...p.actions, [action]: !p.actions[action] };
                        return {
                            ...p,
                            actions: newActions,
                            is_active: action === 'view' ? newActions.view : p.is_active
                        };
                    }
                    return p;
                });
            }
            const isView = action === 'view';
            return [...prev, {
                module_key: moduleKey,
                is_active: isView,
                actions: {
                    view: isView,
                    create: action === 'create',
                    edit: action === 'edit',
                    delete: action === 'delete'
                }
            }];
        });
    };

    const handleSavePermissions = async () => {
        if (!permissionsUser) return;
        setSavingPermissions(true);
        try {
            await apiRequest(`/api/internal/creator/users/${permissionsUser.id}/permissions`, {
                method: 'PUT',
                body: permissions
            });
            onShowToast('Configuración de accesos actualizada');
            setShowPermissionsModal(false);
        } catch (err: any) {
            onShowToast(err.message || 'Error al guardar permisos', 'error');
        } finally {
            setSavingPermissions(false);
        }
    };

    return (
        <>
            <div className="bg-[#0a192f] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/10 bg-gradient-to-r from-blue-500/5 to-transparent flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-white flex items-center gap-3">
                            <UsersIcon size={24} className="text-blue-400" />
                            Cuentas y Usuarios
                        </h2>
                        <p className="text-white/40 text-xs mt-1 font-medium italic">
                            Gestiona el personal con acceso a esta empresa
                        </p>
                    </div>
                    <button
                        onClick={() => handleOpenUserModal('create')}
                        className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-xs font-black transition-all flex items-center gap-2 border border-blue-500/20"
                    >
                        <UserPlus size={16} /> NUEVO USUARIO
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 text-[10px] font-black uppercase text-white/30 tracking-widest">
                            <tr>
                                <th className="px-8 py-4">Usuario</th>
                                <th className="px-8 py-4">Rol en el Sistema</th>
                                <th className="px-8 py-4">Estado</th>
                                <th className="px-8 py-4">Registro</th>
                                <th className="px-8 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.length > 0 ? users.map((u) => (
                                <tr key={u.id} className="hover:bg-white/[0.02] group transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-gradient-to-br from-blue-600/20 to-primary/20 rounded-full flex items-center justify-center font-black text-primary border border-white/5">
                                                {u.name?.charAt(0) || u.email?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-sm">{u.name || 'Sin Nombre'}</div>
                                                <div className="text-[10px] text-white/30 font-medium">{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border ${
                                            u.role === 'admin'
                                                ? 'bg-primary/10 text-primary border-primary/20'
                                                : 'bg-white/5 text-white/40 border-white/10'
                                        }`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-white/10'}`} />
                                            <span className={`text-[10px] font-bold ${u.is_active ? 'text-green-400' : 'text-white/20'}`}>
                                                {u.is_active ? 'ACTIVO' : 'INACTIVO'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-[10px] font-mono text-white/30">
                                        {new Date(u.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => handleOpenUserModal('edit', u)}
                                                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all border border-white/5"
                                                title="Editar Datos"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleOpenPermissions(u)}
                                                className="p-2 bg-purple-500/5 hover:bg-purple-500/20 rounded-xl text-purple-400 hover:text-purple-300 transition-all border border-purple-500/10"
                                                title="Módulos y Permisos"
                                            >
                                                <ShieldCheck size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(u)}
                                                className="p-2 bg-red-500/5 hover:bg-red-500/20 rounded-xl text-red-400 hover:text-red-300 transition-all border border-red-500/10"
                                                title="Eliminar Usuario"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-8 py-10 text-center text-white/20 italic text-sm">
                                        No se encontraron usuarios registrados
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <TenantUserModal
                isOpen={showUserModal}
                mode={userModalMode}
                formData={userFormData}
                saving={savingUser}
                onChange={setUserFormData}
                onClose={() => setShowUserModal(false)}
                onSave={handleSaveUser}
            />

            <TenantUserPermissionsModal
                isOpen={showPermissionsModal}
                userEmail={permissionsUser?.email}
                tenantName={tenantName}
                planLabel={tenantPlan ? (planNames[tenantPlan] || tenantPlan) : undefined}
                planAccentClass={tenantPlan ? planColors[tenantPlan] : undefined}
                availableModules={availableModules}
                permissions={permissions}
                saving={savingPermissions}
                onClose={() => setShowPermissionsModal(false)}
                onTogglePermission={togglePermission}
                onSave={handleSavePermissions}
            />
        </>
    );
}
