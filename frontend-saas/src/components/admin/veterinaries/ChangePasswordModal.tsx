import { useState } from 'react';
import { updateVeterinary, Veterinary } from '@/lib/admin/api';
import Modal from '../Modal';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: Veterinary;
    onSuccess: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose, data, onSuccess }: ChangePasswordModalProps) {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password || password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Backend requires all fields for PUT
            const updateData = {
                name: data.name,
                rut: data.rut,
                slug: data.slug,
                email: data.email,
                address: data.address,
                city: data.city,
                region: data.region,
                phone: data.phone,
                password: password, // The only change
            };

            await updateVeterinary(data.id, updateData);
            onSuccess();
            onClose();
            setPassword(''); // Reset
        } catch (err: any) {
            setError(err.message || 'Error al actualizar la contraseña');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Cambiar Contraseña">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4 mb-4">
                    <p className="text-sm text-sky-200">
                        Estás cambiando la contraseña para la veterinaria <span className="font-bold text-white">{data.name}</span>.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Nueva Contraseña</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 sm:text-sm transition-all outline-none"
                        placeholder="Mínimo 6 caracteres"
                        autoComplete="new-password"
                    />
                </div>

                <div className="flex gap-4 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 justify-center items-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 justify-center items-center rounded-xl border border-transparent bg-sky-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-sky-500/25 hover:bg-sky-500 disabled:opacity-50 transition-all"
                    >
                        {loading ? 'Guardando...' : 'Actualizar Contraseña'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
