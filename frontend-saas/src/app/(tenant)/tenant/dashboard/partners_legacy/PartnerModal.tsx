import React, { useState, useEffect } from 'react';
import Modal from '@/components/tenant/Modal';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { Loader2, Eye, EyeOff, Copy, XCircle } from 'lucide-react';

interface PartnerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    partner?: any; // If present, edit mode
}

const COUNTRY_CODES = [
    { code: '+56', country: 'Chile', flag: '🇨🇱' },
    { code: '+54', country: 'Argentina', flag: '🇦🇷' },
    { code: '+51', country: 'Perú', flag: '🇵🇪' },
    { code: '+57', country: 'Colombia', flag: '🇨🇴' },
    { code: '+52', country: 'México', flag: '🇲🇽' },
    { code: '+1', country: 'USA', flag: '🇺🇸' },
];

export default function PartnerModal({ isOpen, onClose, onSuccess, partner }: PartnerModalProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [showToken, setShowToken] = useState(false);
    const [isEditingToken, setIsEditingToken] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        nombre_clinica: '',
        slug_publico: '',
        rut_clinica: '',
        telefono: '',
        phone_code: '+56',
        email: '',
        direccion: '',
        ciudad: '',
        region: '',
        pais: 'Chile',
        porcentaje_comision: 0,
        monto_comision: 0,
        codigo_acceso: '',
    });

    useEffect(() => {
        if (partner) {
            // Try to split phone if possible, otherwise just put it all in phone field or default
            // A robust way would be to check if it starts with one of our codes.
            let pCode = '+56';
            let pNum = partner.telefono || '';

            // Simple heuristic check
            for (const c of COUNTRY_CODES) {
                if (pNum.startsWith(c.code)) {
                    pCode = c.code;
                    pNum = pNum.substring(c.code.length).trim();
                    break;
                }
            }

            setFormData({
                nombre_clinica: partner.nombre_clinica || '',
                slug_publico: partner.slug_publico || '',
                rut_clinica: partner.rut_clinica || '',
                telefono: pNum,
                phone_code: pCode,
                email: partner.email || '',
                direccion: partner.direccion || '',
                ciudad: partner.ciudad || '',
                region: partner.region || '',
                pais: partner.pais || 'Chile',
                porcentaje_comision: partner.porcentaje_comision || 0,
                monto_comision: partner.monto_comision || 0,
                codigo_acceso: partner.codigo_acceso || '', // Now visible as requested
            });
            setIsEditingToken(false);
        } else {
            // Reset for create
            setFormData({
                nombre_clinica: '',
                slug_publico: '',
                rut_clinica: '',
                telefono: '',
                phone_code: '+56',
                email: '',
                direccion: '',
                ciudad: '',
                region: '',
                pais: 'Chile',
                porcentaje_comision: 0,
                monto_comision: 0,
                codigo_acceso: generateRandomToken(),
            });
            setIsEditingToken(true);
        }
    }, [partner, isOpen]);

    function generateRandomToken() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like 0, O, 1, I
        let result = '';
        for (let i = 0; i < 12; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    const generateSlug = (name: string) => {
        return name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
    };

    const formatRut = (rut: string) => {
        // Clean
        let value = rut.replace(/[^0-9kK]/g, '');
        if (value.length > 1) {
            const dv = value.slice(-1);
            const num = value.slice(0, -1);
            // Format number
            let formattedNum = num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
            return `${formattedNum}-${dv}`;
        }
        return value;
    };

    const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, rut_clinica: formatRut(val) }));
    };

    const handlePhoneCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCode = e.target.value;
        const countryObj = COUNTRY_CODES.find(c => c.code === newCode);
        setFormData(prev => ({
            ...prev,
            phone_code: newCode,
            pais: countryObj ? countryObj.country : prev.pais
        }));
    };

    const formatNumber = (num: number | string) => {
        if (!num && num !== 0) return '';
        const value = num.toString().replace(/\D/g, '');
        return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const parseFormattedNumber = (formatted: string) => {
        return parseInt(formatted.replace(/\./g, '')) || 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Validation
            if (!formData.nombre_clinica || !formData.slug_publico) {
                throw new Error("Nombre y Slug son obligatorios");
            }
            if (!partner && !formData.codigo_acceso) {
                throw new Error("Código de acceso es obligatorio");
            }

            const url = partner
                ? `/api/internal/partners/${partner.id_partner}`
                : '/api/internal/partners';

            const method = partner ? 'PATCH' : 'POST';

            // Guard clause removed - Backend is ready

            // Prepare payload
            // Extract phone_code to exclude it from payload
            const { phone_code, ...rest } = formData;

            const payload: any = {
                nombre_clinica: formData.nombre_clinica,
                slug_publico: formData.slug_publico,
                rut_clinica: formData.rut_clinica || undefined,
                telefono: `${formData.phone_code} ${formData.telefono}`,
                email: formData.email ? formData.email : undefined,
                direccion: formData.direccion || undefined,
                ciudad: formData.ciudad || undefined,
                region: formData.region || undefined,
                pais: formData.pais || undefined,
                porcentaje_comision: formData.porcentaje_comision,
                monto_comision: formData.monto_comision,
                tipo_comision: formData.monto_comision > 0 ? 'fijo' : 'porcentaje',
            };

            if (formData.codigo_acceso) {
                payload.codigo_acceso = formData.codigo_acceso;
            }

            await apiRequest(url, {
                method,
                body: JSON.stringify(payload)
            });

            showToast(partner ? 'Veterinaria actualizada' : 'Veterinaria creada', 'success');
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err.message || 'Error al guardar', 'error');
        } finally {
            setLoading(false);
        }
    };

    const activeCountry = COUNTRY_CODES.find(c => c.code === formData.phone_code);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={partner ? 'Editar Veterinaria' : 'Nueva Veterinaria'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Nombre Clínica</label>
                        <input
                            type="text"
                            className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-primary/50 outline-none"
                            value={formData.nombre_clinica}
                            onChange={(e) => {
                                const name = e.target.value;
                                setFormData(prev => ({
                                    ...prev,
                                    nombre_clinica: name,
                                    slug_publico: !partner ? generateSlug(name) : prev.slug_publico
                                }));
                            }}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Slug Público</label>
                        <input
                            type="text"
                            className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-primary/50 outline-none"
                            value={formData.slug_publico}
                            onChange={(e) => setFormData({ ...formData, slug_publico: e.target.value })}
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">RUT</label>
                        <input
                            type="text"
                            className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-primary/50 outline-none"
                            value={formData.rut_clinica}
                            onChange={handleRutChange}
                            maxLength={12}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Teléfono</label>
                        <div className="flex gap-2">
                            <select
                                className="bg-background border border-white/10 rounded-xl px-2 py-2 text-sm focus:border-primary/50 outline-none w-20 appearance-none text-center cursor-pointer"
                                value={formData.phone_code}
                                onChange={handlePhoneCodeChange}
                                title={activeCountry?.country}
                            >
                                {COUNTRY_CODES.map(c => (
                                    <option key={c.code} value={c.code}>
                                        {c.flag} {c.code}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="text"
                                className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-primary/50 outline-none"
                                value={formData.telefono}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    setFormData({ ...formData, telefono: val });
                                }}
                                placeholder="9 8765 4321"
                                maxLength={9}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Ciudad</label>
                        <input
                            type="text"
                            className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-primary/50 outline-none"
                            value={formData.ciudad}
                            onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Región / Comuna</label>
                        <input
                            type="text"
                            className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-primary/50 outline-none"
                            value={formData.region}
                            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Dirección</label>
                    <input
                        type="text"
                        className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-primary/50 outline-none"
                        value={formData.direccion}
                        onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                        placeholder="Calle, Número, Oficina/Depto"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Email Contacto</label>
                    <input
                        type="email"
                        className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-primary/50 outline-none"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                </div>

                <div className="pt-4 flex gap-4 items-start">
                    {/* Columna 1: Control de Acceso (25%) */}
                    <div className="w-1/4">
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1 text-emerald-400">Control de Acceso</label>
                        {!isEditingToken && partner ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditingToken(true);
                                    setFormData(prev => ({ ...prev, codigo_acceso: '' }));
                                }}
                                className="w-full h-[38px] bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="text-base">🔑</span>
                                Cambiar
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type={showToken ? "text" : "password"}
                                        maxLength={20}
                                        className="w-full bg-background border border-emerald-500/30 rounded-xl px-2 py-2 text-xs focus:border-emerald-500 outline-none font-mono tracking-widest text-center text-emerald-400 font-bold placeholder:text-emerald-500/20"
                                        value={formData.codigo_acceso}
                                        placeholder="TOKEN"
                                        onChange={(e) => setFormData({ ...formData, codigo_acceso: e.target.value.toUpperCase() })}
                                        required={!partner}
                                        autoFocus={isEditingToken && partner}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowToken(!showToken)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-500/50 hover:text-emerald-500"
                                    >
                                        {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData(prev => ({ ...prev, codigo_acceso: generateRandomToken() }));
                                        setShowToken(true);
                                    }}
                                    className="p-2 bg-white/5 rounded-lg hover:bg-white/10 flex items-center justify-center min-w-[36px] text-base"
                                    title="Generar Nuevo"
                                >
                                    🎲
                                </button>
                                {partner && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditingToken(false);
                                            setFormData(prev => ({ ...prev, codigo_acceso: partner.codigo_acceso }));
                                        }}
                                        className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"
                                        title="Cancelar"
                                    >
                                        <XCircle size={16} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Columna 2: Comisiones (Restante) */}
                    <div className="flex-1 grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Monto Fijo ($)</label>
                            <input
                                type="text"
                                className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-emerald-500/50 outline-none font-bold text-emerald-400"
                                value={formatNumber(formData.monto_comision)}
                                onChange={(e) => {
                                    const val = parseFormattedNumber(e.target.value);
                                    setFormData({ ...formData, monto_comision: val });
                                }}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Comisión (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-emerald-500/50 outline-none font-bold text-emerald-400"
                                value={formData.porcentaje_comision}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setFormData({ ...formData, porcentaje_comision: isNaN(val) ? 0 : val });
                                }}
                                placeholder="0.0%"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:bg-white/5"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading && <Loader2 className="animate-spin" size={16} />}
                        {partner ? 'Guardar Cambios' : 'Crear Veterinaria'}
                    </button>
                </div>
            </form>
        </Modal >
    );
}
