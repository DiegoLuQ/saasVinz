import { useState, useEffect } from 'react';
import { createVeterinary, updateVeterinary, getVeterinary, Veterinary } from '@/lib/admin/api';
import Modal from '../Modal';
import { Country, State, City } from 'country-state-city';
import { ChevronDown, Lock, Plus, Globe, MapPin, Phone } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';
import { formatRut } from '@/lib/formatters';

interface CreateVeterinaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Veterinary | null;
}

export default function CreateVeterinaryModal({ isOpen, onClose, onSuccess, initialData }: CreateVeterinaryModalProps) {
    const isEditing = !!initialData;
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPasswordInput, setShowPasswordInput] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        rut: '',
        slug: '',
        email: '',
        password: '',
        address: '',
        city: '',
        region: '',
        country: 'Chile',
        phone: '',
        is_active: true
    });
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShowPasswordInput(false);
            if (initialData) {
                // Pre-fill with available data immediately
                setFormData({
                    name: initialData.name,
                    rut: initialData.rut,
                    slug: initialData.slug,
                    email: initialData.email,
                    password: '',
                    address: initialData.address || '',
                    city: initialData.city || '',
                    region: initialData.region || '',
                    country: initialData.country || 'Chile',
                    phone: initialData.phone || '',
                    is_active: initialData.is_active ?? true
                });

                // Fetch full details
                setFetching(true);
                getVeterinary(initialData.id)
                    .then(fullData => {
                        setFormData({
                            name: fullData.name,
                            rut: fullData.rut,
                            slug: fullData.slug,
                            email: fullData.email,
                            password: '',
                            address: fullData.address || '',
                            city: fullData.city || '',
                            region: fullData.region || '',
                            country: fullData.country || 'Chile',
                            phone: fullData.phone || '',
                            is_active: fullData.is_active ?? true
                        });
                    })
                    .catch(err => console.error("Error fetching full details:", err))
                    .finally(() => setFetching(false));

            } else {
                setFormData({
                    name: '',
                    rut: '',
                    slug: '',
                    email: '',
                    password: '',
                    address: '',
                    city: '',
                    region: '',
                    country: 'Chile',
                    phone: '',
                    is_active: true
                });
            }
        }
    }, [isOpen, initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        let finalValue = value;

        // Validation Logic
        if (name === 'rut') {
            finalValue = formatRut(value).slice(0, 12);
        }
        else if (name === 'phone') {
            // Keep only + and digits, limit to 13 chars
            finalValue = value.replace(/[^+\d]/g, '').slice(0, 13);
        }

        setFormData(prev => {
            const updates = { ...prev, [name]: finalValue };
            if (name === 'name' && !prev.slug && !isEditing) {
                updates.slug = finalValue.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            }
            if (name === 'country') {
                updates.region = '';
                updates.city = '';
            }
            if (name === 'region') {
                updates.city = '';
            }
            return updates;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!isEditing && !formData.password) {
            setError("La contraseña es obligatoria. Por favor presione 'Crear Contraseña' e ingrese una.");
            setLoading(false);
            return;
        }

        try {
            const payload = { ...formData };
            if (isEditing && initialData) {
                // Remove password from main update if empty (handled by separate modal or left unchanged)
                if (!payload.password) {
                    delete (payload as any).password;
                }
                await updateVeterinary(initialData.id, payload);
            } else {
                await createVeterinary(payload);
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || `Error al ${isEditing ? 'actualizar' : 'crear'} veterinaria`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Editar Veterinaria" : "Alta de Veterinaria Global"}>
                <form onSubmit={handleSubmit} className="space-y-3">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-3 rounded-xl text-sm backdrop-blur-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-300">Nombre Clínica</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                maxLength={50}
                                className="block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 sm:text-sm transition-all outline-none"
                                placeholder="Ej: Clínica Vet..."
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-300">Email (Usuario)</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                maxLength={50}
                                className="block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 sm:text-sm transition-all outline-none"
                                placeholder="contacto@veterinaria.cl"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-300">RUT</label>
                            <input
                                type="text"
                                name="rut"
                                value={formData.rut}
                                onChange={handleChange}
                                required
                                maxLength={12}
                                className="block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 sm:text-sm transition-all outline-none"
                                placeholder="77.888.999-K"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-300">Slug (URL)</label>
                            <input
                                type="text"
                                name="slug"
                                value={formData.slug}
                                onChange={handleChange}
                                required
                                className="block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-gray-400 placeholder-gray-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 sm:text-sm transition-all outline-none cursor-not-allowed opacity-75"
                                readOnly={isEditing}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-300">País</label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <select
                                    name="country"
                                    value={formData.country}
                                    onChange={handleChange}
                                    className="block w-full appearance-none rounded-xl border border-white/10 bg-white/5 pl-10 pr-8 py-2 text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 sm:text-sm transition-all outline-none"
                                >
                                    <option value="" className="bg-slate-900 text-gray-400">Selecciona País</option>
                                    {Country.getAllCountries().map(c => (
                                        <option key={c.isoCode} value={c.name} className="bg-slate-900 text-white">{c.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-300">Teléfono</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    maxLength={13}
                                    className="block w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 py-2 text-white placeholder-gray-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 sm:text-sm transition-all outline-none"
                                    placeholder="+569..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-300">Dirección</label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            maxLength={100}
                            className="block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 sm:text-sm transition-all outline-none"
                            placeholder="Calle 123..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-300">Región / Estado</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <select
                                    name="region"
                                    value={formData.region}
                                    onChange={handleChange}
                                    disabled={!formData.country}
                                    className="block w-full appearance-none rounded-xl border border-white/10 bg-white/5 pl-10 pr-8 py-2 text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 sm:text-sm transition-all outline-none disabled:opacity-50"
                                >
                                    <option value="" className="bg-slate-900 text-gray-400">Selecciona Región</option>
                                    {formData.country && State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === formData.country)?.isoCode).map(s => (
                                        <option key={s.isoCode} value={s.name} className="bg-slate-900 text-white">{s.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-300">Ciudad</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <select
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    disabled={!formData.region}
                                    className="block w-full appearance-none rounded-xl border border-white/10 bg-white/5 pl-10 pr-8 py-2 text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 sm:text-sm transition-all outline-none disabled:opacity-50"
                                >
                                    <option value="" className="bg-slate-900 text-gray-400">Selecciona Ciudad</option>
                                    {formData.country && formData.region && City.getCitiesOfState(
                                        Country.getAllCountries().find(c => c.name === formData.country)?.isoCode || '',
                                        State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === formData.country)?.isoCode).find(s => s.name === formData.region)?.isoCode || ''
                                    ).map(city => (
                                        <option key={city.name} value={city.name} className="bg-slate-900 text-white">{city.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                            {/* Password Section */}
                            {isEditing ? (
                                <div className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                                            <Lock size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">Contraseña</p>
                                            <p className="text-xs text-gray-500">Administrar acceso</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordModal(true)}
                                        className="px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/5"
                                    >
                                        Cambiar
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {showPasswordInput ? (
                                        <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                            <div className="flex items-center justify-between">
                                                <label className="block text-sm font-medium text-gray-300">Contraseña Inicial</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswordInput(false)}
                                                    className="text-xs text-gray-500 hover:text-white transition-colors"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                name="password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                required
                                                minLength={6}
                                                autoFocus
                                                className="block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 sm:text-sm transition-all outline-none"
                                                placeholder="Mínimo 6 caracteres"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/5 h-full">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-gray-500/10 text-gray-400">
                                                    <Lock size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-white">Contraseña Inicial</p>
                                                    <p className="text-xs text-gray-500">Requerida</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswordInput(true)}
                                                className="group flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-lg transition-colors border border-sky-500/20"
                                            >
                                                <Plus size={14} className="group-hover:scale-110 transition-transform" />
                                                Crear
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Status Section */}
                            <div className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/5 h-full">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${formData.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                        <div className={`w-2 h-2 rounded-full ${formData.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">Estado Cuenta</p>
                                        <p className="text-xs text-gray-500">{formData.is_active ? 'Activado' : 'Desactivado'}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-offset-slate-900 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${formData.is_active ? 'bg-emerald-500' : 'bg-gray-600'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            className="w-full inline-flex justify-center items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/20 transition-all"
                            onClick={onClose}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full inline-flex justify-center items-center rounded-xl border border-transparent bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-sky-500/25 hover:from-sky-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Veterinaria')}
                        </button>
                    </div>
                </form>
            </Modal>

            {isEditing && initialData && (
                <ChangePasswordModal
                    isOpen={showPasswordModal}
                    onClose={() => setShowPasswordModal(false)}
                    data={initialData}
                    onSuccess={() => {
                        onSuccess();
                    }}
                />
            )}
        </>
    );
}
