import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/admin/api';
import { getToken } from '@/lib/auth/token';
import { Database, Clock, Calendar, Play, CheckCircle, AlertTriangle, Loader2, Save, Download } from 'lucide-react';

interface BackupConfig {
    backup_enabled: boolean;
    backup_day: number;
    backup_time: string;
}

interface BackupStatus {
    last_backup_at: string | null;
    last_backup_status: string | null;
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function BackupSettings() {
    const [config, setConfig] = useState<BackupConfig>({
        backup_enabled: false,
        backup_day: 0,
        backup_time: '03:00'
    });
    const [status, setStatus] = useState<BackupStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [triggering, setTriggering] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [configData, statusData] = await Promise.all([
                apiRequest('/api/internal/maintenance/backups/config'),
                apiRequest('/api/internal/maintenance/backups/status')
            ]);
            if (configData) setConfig(configData);
            if (statusData) setStatus(statusData);
        } catch (error) {
            console.error('Error fetching backup data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const updated = await apiRequest('/api/internal/maintenance/backups/config', {
                method: 'POST',
                body: config
            });
            setConfig(updated);
            setMessage({ type: 'success', text: 'Configuración guardada exitosamente' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Error al guardar la configuración' });
        } finally {
            setSaving(false);
        }
    };

    const handleManualTrigger = async () => {
        if (!confirm('¿Estás seguro de iniciar un respaldo manual ahora? Esto puede afectar ligeramente el rendimiento.')) return;

        setTriggering(true);
        try {
            await apiRequest('/api/internal/maintenance/backups/trigger', { method: 'POST' });
            setMessage({ type: 'success', text: 'Respaldo iniciado en segundo plano' });
            // Update status immediately to reflect "in_progress" if handled by frontend logic
            setStatus(prev => prev ? { ...prev, last_backup_status: 'in_progress' } : null);

            // Poll for status update after a few seconds
            setTimeout(fetchData, 5000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Error al iniciar el respaldo' });
        } finally {
            setTriggering(false);
        }
    };

    const handleDownload = async () => {
        setDownloading(true);
        setMessage(null);
        try {
            const token = getToken();
            const res = await fetch('/api/internal/maintenance/backups/download', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) {
                let detail = 'Error al generar el respaldo';
                try {
                    const j = await res.json();
                    if (j?.detail) detail = j.detail;
                } catch { /* respuesta sin JSON */ }
                throw new Error(detail);
            }
            const blob = await res.blob();
            const cd = res.headers.get('Content-Disposition') || '';
            const match = cd.match(/filename="?([^"]+)"?/);
            const filename = match ? match[1] : `backup_${Date.now()}.dump`;

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            setMessage({ type: 'success', text: 'Respaldo descargado correctamente' });
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || 'Error al descargar el respaldo' });
        } finally {
            setDownloading(false);
        }
    };

    if (loading) return <div className="text-white/50 p-4">Cargando configuración de respaldos...</div>;

    const lastBackupDate = status?.last_backup_at ? new Date(status.last_backup_at).toLocaleString() : 'Nunca';
    const isSuccess = status?.last_backup_status === 'success';
    const isInProgress = status?.last_backup_status === 'in_progress';
    const isError = status?.last_backup_status && status.last_backup_status.startsWith('error');

    return (
        <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Database className="text-primary" size={24} />
                            Respaldos de Base de Datos
                        </h3>
                        <p className="text-white/40 text-sm mt-1">
                            Configura copias de seguridad automáticas a Cloudflare R2.
                        </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${isSuccess ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            isInProgress ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                isError ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                    'bg-white/5 text-white/40 border-white/10'
                        }`}>
                        {isInProgress ? 'En Progreso...' :
                            isSuccess ? 'Sistema Saludable' :
                                isError ? 'Error en Respaldo' : 'Sin Respaldos'}
                    </div>
                </div>

                {message && (
                    <div className={`mb-6 p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}>
                        {message.text}
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Configuration Form */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                            <div>
                                <label className="font-bold block">Respaldos Automáticos</label>
                                <p className="text-xs text-white/50">Habilitar copias semanales</p>
                            </div>
                            <button
                                onClick={() => setConfig(prev => ({ ...prev, backup_enabled: !prev.backup_enabled }))}
                                className={`w-12 h-6 rounded-full transition-colors relative ${config.backup_enabled ? 'bg-primary' : 'bg-white/10'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${config.backup_enabled ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        <div className={`space-y-4 transition-opacity ${config.backup_enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                            <div>
                                <label className="text-xs uppercase font-bold text-white/40 mb-1 block flex items-center gap-2">
                                    <Calendar size={14} /> Día de la Semana
                                </label>
                                <select
                                    value={config.backup_day}
                                    onChange={(e) => setConfig({ ...config, backup_day: parseInt(e.target.value) })}
                                    className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary appearance-none cursor-pointer"
                                >
                                    {DAYS.map((day, idx) => (
                                        <option key={idx} value={idx}>{day}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs uppercase font-bold text-white/40 mb-1 block flex items-center gap-2">
                                    <Clock size={14} /> Hora de Ejecución (UTC)
                                </label>
                                <input
                                    type="time"
                                    value={config.backup_time}
                                    onChange={(e) => setConfig({ ...config, backup_time: e.target.value })}
                                    className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mt-4"
                        >
                            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Guardar Configuración
                        </button>
                    </div>

                    {/* Status & Actions */}
                    <div className="space-y-6">
                        <div className="p-6 bg-[#0a192f] rounded-2xl border border-white/10 relative overflow-hidden">
                            <div className="relative z-10">
                                <h4 className="text-sm font-bold text-white/60 mb-4">Último Respaldo</h4>
                                <div className="flex items-center gap-4 mb-2">
                                    {isInProgress ? <Loader2 className="text-blue-400 animate-spin" size={32} /> :
                                        isSuccess ? <CheckCircle className="text-emerald-400" size={32} /> :
                                            <AlertTriangle className="text-white/20" size={32} />}

                                    <div>
                                        <div className="text-xl font-mono font-bold">{lastBackupDate}</div>
                                        <div className="text-xs text-white/40 break-all">
                                            {status?.last_backup_status || 'Pendiente'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6">
                            <h4 className="font-bold text-primary mb-2">Acciones Manuales</h4>
                            <p className="text-xs text-white/60 mb-4">
                                Sube un respaldo a la nube (R2) o descárgalo directamente a tu equipo.
                            </p>
                            <button
                                onClick={handleManualTrigger}
                                disabled={triggering}
                                className="w-full bg-primary hover:bg-primary/90 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all"
                            >
                                {triggering ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
                                {triggering ? 'Iniciando...' : 'Respaldar a la Nube (R2)'}
                            </button>
                            <button
                                onClick={handleDownload}
                                disabled={downloading}
                                className="w-full mt-3 bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {downloading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                                {downloading ? 'Generando respaldo...' : 'Descargar Respaldo (.dump)'}
                            </button>
                            <p className="text-[10px] text-white/40 mt-2 text-center">
                                Formato custom de PostgreSQL. Restaura con pg_restore o la herramienta "Restore" de pgAdmin.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
