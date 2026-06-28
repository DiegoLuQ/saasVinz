'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/admin/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import FormFileUpload from '@/components/forms/FormFileUpload';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Loader2, Search, Edit, Calendar, Sparkles, Smartphone, Monitor } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function getMemorialBaseUrl(): string {
    if (typeof window === 'undefined') return '';
    const host = window.location.host;
    const port = window.location.port || '3000';
    if (host.includes('lvh.me')) return `http://pm.lvh.me:${port}`;
    if (host.includes('localhost')) return `http://localhost:${port}`;
    const domain = process.env.NEXT_PUBLIC_MEMORIAL_DOMAIN;
    return domain ? `https://${domain}` : `https://${window.location.host}`;
}

interface Memorial {
    id: number;
    id_recuerdo: string;
    pet_name: string;
    pet_image_url: string | null;
    customer_name: string;
    tenant_name: string;
    tenant_slug: string;
    tenant_id: number;
    plan: string | null;
    status: string;
    valid_until: string | null;
    dedicatoria: string | null;
    main_image_url: string | null;
    lista_imagenes: string[] | null;
    diseno?: {
        color_fondo?: string;
        particulas?: string;
        tema?: string;
        tipo_diseno?: string;
    } | null;
    access_key?: string | null;
    created_at: string;
}

interface MemorialPlan {
    id: number;
    name: string;
    name_db: string;
}

export default function AdminMemorialsPage() {
    const { showToast } = useToast();
    const [memorials, setMemorials] = useState<Memorial[]>([]);
    const [plans, setPlans] = useState<MemorialPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingMemorial, setEditingMemorial] = useState<Memorial | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('desktop');

    // Edit Form State
    const [formData, setFormData] = useState({
        plan: '',
        valid_until: '',
        status: '',
        pet_name: '',
        pet_image_url: '',
        main_image_url: '',
        dedicatoria: '',
        lista_imagenes: [] as string[],
        tipo_diseno: 'normal',
        tema: 'claro',
        particulas: 'flores',
        color_fondo: '#ffffff',
        access_key: ''
    });

    const fetchMemorials = async () => {
        setLoading(true);
        try {
            const query = searchTerm ? `?search=${searchTerm}` : '';

            // Fetch memorials and plans in parallel but handle plans error separately
            const memorialsPromise = apiRequest(`/api/internal/creator/memorials${query}`);
            const plansPromise = apiRequest(`/api/internal/creator/memorials/plans`).catch(err => {
                console.error('Error fetching plans, using empty list:', err);
                return [];
            });

            const [memorialsData, plansData] = await Promise.all([
                memorialsPromise,
                plansPromise
            ]);

            setMemorials(memorialsData);
            setPlans(plansData);
        } catch (error) {
            console.error('Error fetching memorials:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchMemorials();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleEdit = (memorial: Memorial) => {
        setEditingMemorial(memorial);
        setFormData({
            plan: memorial.plan ? memorial.plan.toLowerCase() : '',
            valid_until: memorial.valid_until ? memorial.valid_until.split('T')[0] : '',
            status: memorial.status,
            pet_name: memorial.pet_name,
            pet_image_url: memorial.pet_image_url || '',
            main_image_url: memorial.main_image_url || '',
            dedicatoria: memorial.dedicatoria || '',
            lista_imagenes: memorial.lista_imagenes || [],
            tipo_diseno: memorial.diseno?.tipo_diseno || 'normal',
            tema: memorial.diseno?.tema || 'claro',
            particulas: memorial.diseno?.particulas || 'flores',
            color_fondo: memorial.diseno?.color_fondo || '#ffffff',
            access_key: memorial.access_key || ''
        });
        setIsEditOpen(true);
    };

    const handleImageUpload = async (base64Image: string | null) => {
        if (!base64Image) {
            setFormData({ ...formData, pet_image_url: '' });
            return;
        }

        try {
            // Convert base64 to blob
            const res = await fetch(base64Image);
            const blob = await res.blob();
            const file = new File([blob], "pet-image.webp", { type: "image/webp" });

            const uploadFormData = new FormData();
            uploadFormData.append('file', file);

            // Upload with X-Tenant-ID header
            const response = await apiRequest('/api/internal/upload/image', {
                method: 'POST',
                headers: {
                    'X-Tenant-ID': editingMemorial?.tenant_id.toString() || ''
                },
                body: uploadFormData
            });

            setFormData({ ...formData, pet_image_url: response.url });
        } catch (error) {
            console.error("Error uploading image:", error);
            showToast('Error al subir la imagen. Por favor intente nuevamente.', 'error');
        }
    };

    const handleSave = async () => {
        if (!editingMemorial) return;
        setSaving(true);
        try {
            await apiRequest(`/api/internal/creator/memorials/${editingMemorial.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    plan: formData.plan,
                    valid_until: formData.valid_until || null,
                    status: formData.status,
                    pet_name: formData.pet_name,
                    pet_image_url: formData.pet_image_url || null,
                    main_image_url: formData.main_image_url || null,
                    dedicatoria: formData.dedicatoria || null,
                    access_key: formData.access_key || null,
                    diseno: {
                        tipo_diseno: formData.tipo_diseno,
                        tema: formData.tema,
                        particulas: formData.particulas,
                        color_fondo: formData.color_fondo
                    }
                })
            });
            await fetchMemorials();
            setIsEditOpen(false);
            showToast('Cambios guardados', 'success');
        } catch (error: any) {
            console.error('Error saving memorial:', error);
            showToast(`Error al guardar cambios: ${error.message || 'Error desconocido'}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black mb-1 text-white">Recuerdos Globales</h1>
                    <p className="text-white/40">Gestión centralizada de memoriales y suscripciones.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                    <input
                        placeholder="Buscar mascota o cliente..."
                        className="bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 w-64 text-xs text-white outline-none focus:border-primary/50 transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-sm">
                <Table>
                    <TableHeader className="bg-white/5">
                        <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead className="text-[10px] uppercase font-bold text-white/40 h-14">Mascota</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold text-white/40 h-14">Cliente</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold text-white/40 h-14">Empresa</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold text-white/40 h-14">Plan Actual</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold text-white/40 h-14">Vence</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold text-white/40 h-14">Estado</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold text-white/40 h-14 text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow className="border-white/5">
                                <TableCell colSpan={7} className="h-32 text-center">
                                    <Loader2 className="animate-spin mx-auto text-primary" size={24} />
                                </TableCell>
                            </TableRow>
                        ) : memorials.length === 0 ? (
                            <TableRow className="border-white/5">
                                <TableCell colSpan={7} className="h-32 text-center text-white/30 italic">
                                    No se encontraron recuerdos que coincidan con tu búsqueda.
                                </TableCell>
                            </TableRow>
                        ) : (
                            memorials.map((memorial) => (
                                <TableRow key={memorial.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                                    <TableCell className="font-bold text-white text-base py-4 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-white/50">
                                                <span className="text-xs font-black">{memorial.pet_name.substring(0, 2).toUpperCase()}</span>
                                            </div>
                                            {memorial.pet_name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-white/70 py-4">{memorial.customer_name}</TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase tracking-wide">
                                                {memorial.tenant_name}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${memorial.plan?.toLowerCase() === 'ultra' || memorial.plan?.toLowerCase() === 'paraiso'
                                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                                            : memorial.plan?.toLowerCase() === 'pro' || memorial.plan?.toLowerCase() === 'vinculo'
                                                ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                                : memorial.plan?.toLowerCase() === 'normal' || memorial.plan?.toLowerCase() === 'huella'
                                                    ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                                    : 'bg-white/5 text-white/40 border-white/10'
                                            }`}>
                                            {plans.find(p => p.name_db === memorial.plan?.toLowerCase())?.name || memorial.plan || 'N/A'}
                                            <span className="ml-1.5 opacity-40 text-[8px] font-black">
                                                ({memorial.plan?.toLowerCase() || 'N/A'})
                                            </span>
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        {memorial.valid_until ? (
                                            <div className={`text-xs font-bold ${new Date(memorial.valid_until) < new Date() ? 'text-red-400' : 'text-white/60'}`}>
                                                {format(new Date(memorial.valid_until), 'dd MMM yyyy', { locale: es }).toUpperCase()}
                                            </div>
                                        ) : (
                                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Perpetuo</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${memorial.status === 'active'
                                            ? 'text-green-400 bg-green-400/10'
                                            : memorial.status === 'expired'
                                                ? 'text-red-400 bg-red-400/10'
                                                : 'text-white/30 bg-white/5'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${memorial.status === 'active' ? 'bg-green-400 animate-pulse' : memorial.status === 'expired' ? 'bg-red-400' : 'bg-white/30'}`} />
                                            {memorial.status === 'active' ? 'ACTIVE' : memorial.status === 'expired' ? 'EXPIRED' : memorial.status.toUpperCase()}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right py-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(memorial)}
                                            className="hover:bg-white/10 text-white/40 hover:text-white rounded-lg transition-colors"
                                        >
                                            <Edit size={16} />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>


            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="bg-[#0f121d] border-white/5 text-white sm:max-w-7xl max-h-[95vh] overflow-y-auto p-0 shadow-2xl">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="text-2xl font-bold tracking-tight">
                            Editar Memorial: <span className="text-primary">{editingMemorial?.pet_name}</span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 pt-2">
                        {/* Columna Izquierda: Configuración del Formulario (7/12) */}
                        <div className="lg:col-span-7 space-y-6">
                            {/* FILA 1: Nombre, Status y Plan */}
                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-12 md:col-span-5 space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Nombre Mascota</label>
                                    <Input
                                        value={formData.pet_name}
                                        onChange={(e) => setFormData({ ...formData, pet_name: e.target.value })}
                                        className="bg-black/20 border-white/10 text-white h-11"
                                    />
                                </div>
                                <div className="col-span-12 md:col-span-3 space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Estado</label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(val) => setFormData({ ...formData, status: val })}
                                    >
                                        <SelectTrigger className={`bg-black/20 border-white/10 h-11 ${formData.status === 'active' ? 'text-green-400 font-bold' :
                                            formData.status === 'expired' ? 'text-red-400 font-bold' :
                                                formData.status === 'pending' ? 'text-yellow-400 font-bold' :
                                                    'text-white'
                                            }`}>
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1a1f2e] border-white/10 text-white">
                                            <SelectItem value="active" className="text-green-400 font-bold">ACTIVE</SelectItem>
                                            <SelectItem value="pending" className="text-yellow-400 font-bold">PENDING</SelectItem>
                                            <SelectItem value="archived" className="text-slate-400 font-bold">ARCHIVED</SelectItem>
                                            <SelectItem value="expired" className="text-red-400 font-bold">EXPIRED</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-12 md:col-span-4 space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Plan de Características</label>
                                    <Select
                                        value={formData.plan}
                                        onValueChange={(val) => setFormData({ ...formData, plan: val })}
                                    >
                                        <SelectTrigger className="bg-black/20 border-white/10 text-white h-11">
                                            <SelectValue placeholder="Seleccionar Plan" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1a1f2e] border-white/10 text-white">
                                            {plans.map((plan) => (
                                                <SelectItem key={plan.id} value={plan.name_db}>
                                                    {plan.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            {/* PIN de Acceso Familiar (Editable) */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <div className="space-y-0.5">
                                        <h4 className="text-[11px] font-bold text-white/70 uppercase tracking-wider">PIN de Acceso Familiar</h4>
                                        <p className="text-[10px] text-white/30">Código de 6 dígitos que requiere la familia para gestionar este memorial.</p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const newPin = Math.floor(100000 + Math.random() * 900000).toString();
                                            setFormData(prev => ({ ...prev, access_key: newPin }));
                                        }}
                                        className="h-8 text-[10px] uppercase tracking-wider border-white/10 hover:bg-white/5 text-primary hover:text-primary font-bold"
                                    >
                                        Generar Nuevo
                                    </Button>
                                </div>
                                <Input
                                    value={formData.access_key}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6);
                                        setFormData(prev => ({ ...prev, access_key: val }));
                                    }}
                                    placeholder="Ej: 123456"
                                    className="bg-black/20 border-white/10 text-white h-10 font-mono text-center text-lg tracking-[0.2em] font-black"
                                    maxLength={6}
                                />
                            </div>

                            {/* Dedicatoria */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Mensaje de Despedida (Dedicatoria)</label>
                                <textarea
                                    value={formData.dedicatoria}
                                    onChange={(e) => setFormData({ ...formData, dedicatoria: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 text-white rounded-md p-3 text-sm min-h-[70px] max-h-[100px] outline-none focus:border-primary/50 transition-all resize-none scrollbar-thin scrollbar-thumb-white/10"
                                    placeholder="Escribe el mensaje..."
                                />
                            </div>

                            {/* Foto Mascota, Vencimiento y Portada */}
                            <div className="grid grid-cols-12 gap-6">
                                <div className="col-span-12 md:col-span-5 space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Fotografía de la Mascota</label>
                                    <div className="bg-white/5 border border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center min-h-[140px]">
                                        <FormFileUpload
                                            onFileSelect={handleImageUpload}
                                            preview={formData.pet_image_url}
                                            accept="image/*"
                                        />
                                        <p className="text-[9px] text-white/20 mt-3 uppercase tracking-tighter text-center">JPG, PNG, WEBP (Se optimizará)</p>
                                    </div>
                                </div>

                                <div className="col-span-12 md:col-span-7 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Vencimiento</label>
                                            <Input
                                                type="date"
                                                value={formData.valid_until}
                                                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                                                className="bg-black/20 border-white/10 text-white h-11"
                                            />
                                            <p className="text-[9px] text-white/20 italic">Vacío = Perpetuo</p>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase text-white/40 tracking-widest leading-tight">Galería (Portada)</label>
                                            <span className="text-[9px] text-white/20 block leading-tight mb-2">Selecciona la portada</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {formData.lista_imagenes?.filter(img => img && img.startsWith('http')).slice(0, 4).map((img, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`relative w-9 h-9 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${formData.main_image_url === img ? 'border-primary shadow-[0_0_10px_rgba(0,149,255,0.5)]' : 'border-white/10'}`}
                                                        onClick={() => setFormData({ ...formData, main_image_url: img })}
                                                    >
                                                        <img src={img} alt="gal" className="w-full h-full object-cover" />
                                                        {formData.main_image_url === img && (
                                                            <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                                                                <div className="bg-primary text-white rounded-full p-0.5 scale-75">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECCIÓN DE DISEÑO Y PERSONALIZACIÓN */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-5">
                                <h3 className="text-sm font-bold text-white/80 uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles size={16} className="text-primary" />
                                    Personalización del Diseño
                                </h3>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold uppercase text-white/40 tracking-widest block">Layout / Diseño Visual</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {['normal', 'altar', 'editorial', 'carta', 'cielo', 'cinematico', 'constelacion', 'galeria'].map((layout) => (
                                            <button
                                                key={layout}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, tipo_diseno: layout })}
                                                className={`py-2 px-1 rounded-xl border text-[9px] uppercase font-bold tracking-widest transition-all ${formData.tipo_diseno === layout
                                                    ? 'bg-primary border-primary text-primary-foreground font-black'
                                                    : 'bg-black/20 border-white/10 text-white/60 hover:bg-white/5'
                                                    }`}
                                            >
                                                {layout}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold uppercase text-white/40 tracking-widest block">Tema de Color</label>
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {['claro', 'oscuro', 'esmeralda', 'dorado', 'rosado', 'safiro', 'orange'].map((t) => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, tema: t })}
                                                    className={`py-1.5 rounded-lg border text-[8px] uppercase font-bold tracking-wider transition-all ${formData.tema === t
                                                        ? 'bg-primary border-primary text-primary-foreground font-black'
                                                        : 'bg-black/20 border-white/10 text-white/50 hover:bg-white/5'
                                                        }`}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold uppercase text-white/40 tracking-widest block">Partículas</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['nieve', 'estrellas', 'flores'].map((p) => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, particulas: p })}
                                                    className={`py-2 px-1 rounded-xl border text-[9px] uppercase font-bold tracking-widest transition-all ${formData.particulas === p
                                                        ? 'bg-primary border-primary text-primary-foreground font-black'
                                                        : 'bg-black/20 border-white/10 text-white/60 hover:bg-white/5'
                                                        }`}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-white/40 tracking-widest block">Color de Fondo Personalizado</label>
                                    <div className="flex gap-3 items-center">
                                        <input
                                            type="color"
                                            value={formData.color_fondo || '#ffffff'}
                                            onChange={(e) => setFormData({ ...formData, color_fondo: e.target.value })}
                                            className="w-10 h-10 rounded border border-white/10 bg-transparent cursor-pointer"
                                        />
                                        <Input
                                            value={formData.color_fondo || ''}
                                            onChange={(e) => setFormData({ ...formData, color_fondo: e.target.value })}
                                            className="bg-black/20 border-white/10 text-white h-10 font-mono w-32"
                                            placeholder="#ffffff"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Botones de Gestión */}
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <Button
                                    asChild
                                    variant="outline"
                                    className="bg-white/5 border-white/10 hover:bg-white/10 text-white h-10 text-[11px] font-bold uppercase"
                                >
                                    <a href={`${getMemorialBaseUrl()}/memorials/m/${editingMemorial?.id_recuerdo}/gestion`} target="_blank">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1 1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                                        Ir a Gestión
                                    </a>
                                </Button>
                                <Button
                                    asChild
                                    className="bg-primary/20 border border-primary/30 hover:bg-primary/40 text-primary-foreground h-10 text-[11px] font-bold uppercase shadow-[0_0_20px_-5px_rgba(0,149,255,0.4)]"
                                >
                                    <a href={`${getMemorialBaseUrl()}/memorials/v/${editingMemorial?.tenant_slug}/${editingMemorial?.pet_name.toLowerCase().replace(/\s+/g, '-')}/${editingMemorial?.id_recuerdo}`} target="_blank">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                                        Ver Altar
                                    </a>
                                </Button>
                            </div>
                        </div>

                        {/* Columna Derecha: Vista Previa en Vivo Simulada (5/12) */}
                        <div className="lg:col-span-5 h-[650px] bg-black/40 border border-white/10 rounded-2xl overflow-hidden relative flex flex-col">
                            <div className="bg-white/5 border-b border-white/10 p-3 flex justify-between items-center text-xs">
                                <span className="font-bold text-white/60 uppercase tracking-wider">Vista Previa del Memorial</span>
                                <div className="flex items-center gap-1 bg-black/30 p-0.5 rounded-lg border border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewMode('mobile')}
                                        className={`px-2 py-1 rounded transition-all flex items-center gap-1 text-[9px] font-black uppercase tracking-wider ${previewMode === 'mobile' ? 'bg-primary text-primary-foreground' : 'text-white/40 hover:text-white'}`}
                                    >
                                        <Smartphone size={12} />
                                        Móvil
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewMode('desktop')}
                                        className={`px-2 py-1 rounded transition-all flex items-center gap-1 text-[9px] font-black uppercase tracking-wider ${previewMode === 'desktop' ? 'bg-primary text-primary-foreground' : 'text-white/40 hover:text-white'}`}
                                    >
                                        <Monitor size={12} />
                                        Escritorio
                                    </button>
                                </div>
                            </div>

                            {editingMemorial ? (
                                <div className="flex-1 overflow-hidden relative flex items-center justify-center p-2 bg-[#080a12]/30">
                                    {previewMode === 'mobile' ? (
                                        <iframe
                                            src={`${getMemorialBaseUrl()}/memorials/v/${editingMemorial.tenant_slug}/${editingMemorial.pet_name.toLowerCase().replace(/\s+/g, '-')}/${editingMemorial.id_recuerdo}?preview_layout=${formData.tipo_diseno}&preview_theme=${formData.tema}&preview_particles=${formData.particulas}&preview_bg=${encodeURIComponent(formData.color_fondo)}`}
                                            className="w-[375px] h-[550px] border border-white/10 rounded-3xl shadow-2xl bg-[#faf9f6] transition-all duration-300"
                                            title="Live Preview Mobile"
                                        />
                                    ) : (
                                        <div className="w-[1024px] h-[1250px] origin-top scale-[0.43] transition-all duration-300 border border-white/10 rounded-2xl shadow-2xl overflow-hidden bg-[#faf9f6] absolute top-4">
                                            <iframe
                                                src={`${getMemorialBaseUrl()}/memorials/v/${editingMemorial.tenant_slug}/${editingMemorial.pet_name.toLowerCase().replace(/\s+/g, '-')}/${editingMemorial.id_recuerdo}?preview_layout=${formData.tipo_diseno}&preview_theme=${formData.tema}&preview_particles=${formData.particulas}&preview_bg=${encodeURIComponent(formData.color_fondo)}`}
                                                className="w-full h-full border-0"
                                                title="Live Preview Desktop"
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-white/20 italic">
                                    Cargando vista previa...
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="p-6 bg-black/20 flex items-center justify-end gap-4">
                        <button onClick={() => setIsEditOpen(false)} className="text-white/40 hover:text-white text-sm transition-colors">Cancelar</button>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-[#0095ff] hover:bg-[#0084e6] text-white px-10 h-12 rounded-lg font-bold shadow-lg shadow-blue-500/20"
                        >
                            {saving ? <Loader2 className="animate-spin" /> : 'Guardar Cambios'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
