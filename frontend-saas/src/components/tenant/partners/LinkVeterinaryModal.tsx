import { useState, useEffect } from 'react';
import { searchGlobalVeterinaries, requestPartnerLink, VeterinaryBase } from '@/lib/tenant/api';
import Modal from '../Modal';
import { Search, CheckCircle, ChevronDown, Mail, MapPin, Building2, Wallet } from 'lucide-react';

interface LinkVeterinaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    preSelectedVet?: VeterinaryBase | null;
}

export default function LinkVeterinaryModal({ isOpen, onClose, onSuccess, preSelectedVet }: LinkVeterinaryModalProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [vets, setVets] = useState<VeterinaryBase[]>([]);
    const [loadingVets, setLoadingVets] = useState(false);
    const [selectedVet, setSelectedVet] = useState<VeterinaryBase | null>(null);
    const [config, setConfig] = useState<{
        tipo_comision: string;
        monto_comision: number;
        porcentaje_comision: number;
        referral_message: string;
    }>({
        tipo_comision: 'porcentaje',
        monto_comision: 0,
        porcentaje_comision: 0,
        referral_message: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (preSelectedVet) {
                setSelectedVet(preSelectedVet);
                setStep(2);
            } else {
                setStep(1);
                setVets([]);
            }
            setConfig({
                tipo_comision: 'porcentaje',
                monto_comision: 0,
                porcentaje_comision: 0,
                referral_message: ''
            });
            setError(null);
        } else {
            setSearchQuery('');
            setSelectedVet(null);
        }
    }, [isOpen, preSelectedVet]);

    const handleSearch = async (query: string) => {
        setLoadingVets(true);
        try {
            const results = await searchGlobalVeterinaries(query);
            setVets(results);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingVets(false);
        }
    };

    useEffect(() => {
        if (step === 1 && isOpen && searchQuery.length >= 2) {
            const timer = setTimeout(() => {
                handleSearch(searchQuery);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [searchQuery, step, isOpen]);


    const handleSelectVet = (vet: VeterinaryBase) => {
        setSelectedVet(vet);
        setStep(2);
    };

    const handleSubmit = async () => {
        if (!selectedVet) return;
        setLoading(true);
        setError(null);
        try {
            await requestPartnerLink({
                veterinary_id: selectedVet.id,
                tipo_comision: config.tipo_comision,
                monto_comision: config.tipo_comision === 'fijo' ? config.monto_comision : 0,
                porcentaje_comision: config.tipo_comision === 'porcentaje' ? config.porcentaje_comision : 0,
                referral_message: config.referral_message
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al solicitar vinculación');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={preSelectedVet ? "Invitar Partner" : "Vincular Veterinaria"}>
            <div className="space-y-6">
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <p className="text-sm text-gray-400">
                                Busca en el catálogo global de veterinarias para enviarles una solicitud de alianza.
                            </p>
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-indigo-400 transition-colors">
                                <Search className="h-5 w-5" />
                            </div>
                            <input
                                type="text"
                                className="block w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                                placeholder="Buscar por nombre o RUT..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                            {loadingVets && (
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <span className="text-xs text-indigo-400 font-medium animate-pulse">Buscando...</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-2 text-sm max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {vets.length > 0 ? (
                                <ul className="space-y-2">
                                    {vets.map(vet => (
                                        <li
                                            key={vet.id}
                                            className="group p-3 hover:bg-white/5 cursor-pointer rounded-xl border border-transparent hover:border-white/10 transition-all flex justify-between items-center"
                                            onClick={() => handleSelectVet(vet)}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
                                                    <Building2 className="w-5 h-5 text-indigo-400" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-200 group-hover:text-white transition-colors">{vet.name}</p>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                        <span className="bg-white/5 px-1.5 py-0.5 rounded text-[10px] tracking-wide">RUT: {vet.rut}</span>
                                                    </p>
                                                    {vet.city && <p className="text-xs text-gray-500 mt-1 flex items-center"><MapPin className="w-3 h-3 mr-1" />{vet.city}</p>}
                                                </div>
                                            </div>
                                            <button className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-semibold hover:bg-indigo-500 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                                                Seleccionar
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : searchQuery.length >= 2 && !loadingVets ? (
                                <div className="p-8 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                                    <p className="text-gray-500">No encontramos resultados para "{searchQuery}"</p>
                                </div>
                            ) : (
                                <div className="p-8 text-center">
                                    <p className="text-gray-600 text-xs">Ingresa al menos 2 caracteres para buscar</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {step === 2 && selectedVet && (
                    <div className="space-y-5">
                        {/* Selected Vet Card */}
                        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 p-4">
                            <div className="flex items-start gap-4 sticky z-10">
                                <div className="p-3 bg-indigo-500/20 rounded-xl">
                                    <CheckCircle className="h-6 w-6 text-indigo-400" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-medium text-indigo-300 mb-1">Veterinaria Seleccionada</h4>
                                    <p className="text-lg font-bold text-white tracking-tight">{selectedVet.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-indigo-200/60 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/10">{selectedVet.rut}</span>
                                        {selectedVet.city && <span className="text-xs text-gray-400 flex items-center"><MapPin className="w-3 h-3 mr-0.5" /> {selectedVet.city}</span>}
                                    </div>
                                </div>
                                {!preSelectedVet && (
                                    <button
                                        onClick={() => setStep(1)}
                                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-500/10 transition-colors"
                                    >
                                        Cambiar
                                    </button>
                                )}
                            </div>
                            {/* Decorative Glow */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none"></div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                                <Wallet className="w-4 h-4 text-gray-400" />
                                <h4 className="font-medium text-gray-200 text-sm">Propuesta Comercial</h4>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide ml-1">Modelo</label>
                                    <div className="relative">
                                        <select
                                            value={config.tipo_comision}
                                            onChange={(e) => setConfig({ ...config, tipo_comision: e.target.value })}
                                            className="block w-full rounded-xl border border-white/10 bg-black/40 pl-3 pr-10 py-2.5 text-white focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none appearance-none text-sm cursor-pointer hover:bg-white/5"
                                        >
                                            <option value="porcentaje" className="bg-gray-900">Porcentaje (%)</option>
                                            <option value="fijo" className="bg-gray-900">Monto Fijo ($)</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide ml-1">
                                        {config.tipo_comision === 'porcentaje' ? 'Valor (%)' : 'Monto ($)'}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step={config.tipo_comision === 'porcentaje' ? '0.1' : '100'}
                                        required
                                        value={config.tipo_comision === 'porcentaje' ? config.porcentaje_comision : config.monto_comision}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            setConfig(prev => config.tipo_comision === 'porcentaje'
                                                ? { ...prev, porcentaje_comision: val }
                                                : { ...prev, monto_comision: val });
                                        }}
                                        className="block w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-white placeholder-gray-600 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-sm font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 pb-2 pt-2 border-b border-white/5">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <h4 className="font-medium text-gray-200 text-sm">Mensaje de Invitación</h4>
                            </div>
                            <div className="relative">
                                <textarea
                                    rows={4}
                                    className="block w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white placeholder-gray-600 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-sm resize-none"
                                    placeholder="Hola, nos gustaría invitarles a formar parte de nuestra red de partners..."
                                    value={config.referral_message}
                                    onChange={(e) => setConfig({ ...config, referral_message: e.target.value })}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 text-sm rounded-xl">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2.5 px-4 rounded-xl text-sm font-medium transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-[2] bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-500/20 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Enviando...
                                    </span>
                                ) : 'Enviar Solicitud'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
