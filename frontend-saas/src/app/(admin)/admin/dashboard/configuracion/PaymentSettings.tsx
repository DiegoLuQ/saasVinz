import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/admin/api';
import { Landmark, Loader2, Save, CheckCircle, AlertTriangle } from 'lucide-react';

interface BankInfo {
    holder_name: string;
    rut: string;
    bank: string;
    account_type: string;
    account_number: string;
    email: string;
}

const EMPTY_BANK: BankInfo = { holder_name: '', rut: '', bank: '', account_type: '', account_number: '', email: '' };
const ACCOUNT_TYPES = ['Cuenta Corriente', 'Cuenta Vista', 'Cuenta RUT', 'Cuenta de Ahorro'];
const BASE = '/api/internal/creator/ai-credits/payment-settings';

const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/60';
const labelCls = 'block text-sm font-bold text-white/60 mb-2';

/**
 * Datos de pago de Vinzer para la compra de créditos IA: los ve el crematorio
 * en Configuración → Compra de créditos.
 */
export default function PaymentSettings() {
    const [bank, setBank] = useState<BankInfo>(EMPTY_BANK);
    const [other, setOther] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        apiRequest(BASE)
            .then((d) => {
                setBank({ ...EMPTY_BANK, ...(d.bank || {}) });
                setOther(d.other_instructions || '');
            })
            .catch((e) => setMessage({ type: 'error', text: (e as Error).message || 'No se pudieron cargar los datos de pago' }))
            .finally(() => setLoading(false));
    }, []);

    const save = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await apiRequest(BASE, { method: 'PUT', body: { bank, other_instructions: other } });
            setMessage({ type: 'success', text: 'Datos de pago guardados' });
        } catch (e) {
            setMessage({ type: 'error', text: (e as Error).message || 'No se pudo guardar' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-white/50 p-4">Cargando datos de pago...</div>;

    const field = (key: keyof BankInfo, label: string, placeholder: string) => (
        <div>
            <label className={labelCls}>{label}</label>
            <input value={bank[key]} placeholder={placeholder} onChange={(e) => setBank(b => ({ ...b, [key]: e.target.value }))} className={inputCls} />
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2"><Landmark className="text-primary" size={24} /> Datos de pago</h3>
                    <p className="text-white/40 text-sm mt-1">
                        Los crematorios los ven al comprar créditos de IA (Configuración → Compra de créditos). Las compras se aprueban en Créditos IA → Solicitudes.
                    </p>
                </div>

                {message && (
                    <div className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                        {message.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />} {message.text}
                    </div>
                )}

                <div>
                    <h4 className="font-bold mb-3">Transferencia bancaria</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                        {field('holder_name', 'Nombre del titular', 'Vinzer SpA')}
                        {field('rut', 'RUT del titular', '77.777.777-7')}
                        {field('bank', 'Banco', 'Banco Estado')}
                        <div>
                            <label className={labelCls}>Tipo de cuenta</label>
                            <input list="account-types" value={bank.account_type} placeholder="Cuenta Corriente"
                                onChange={(e) => setBank(b => ({ ...b, account_type: e.target.value }))} className={inputCls} />
                            <datalist id="account-types">{ACCOUNT_TYPES.map(t => <option key={t} value={t} />)}</datalist>
                        </div>
                        {field('account_number', 'Número de cuenta', '123456789')}
                        {field('email', 'Correo para comprobantes', 'pagos@vinzer.cl')}
                    </div>
                    <p className="text-xs text-white/40 mt-2">Sin número de cuenta, la opción de transferencia no se muestra a los crematorios.</p>
                </div>

                <div>
                    <h4 className="font-bold mb-3">Otros medios de pago</h4>
                    <textarea value={other} rows={4} maxLength={1500} onChange={(e) => setOther(e.target.value)}
                        placeholder="Ej: también puedes pagar por PayPal a pagos@vinzer.cl o escribirnos por WhatsApp al +56 9 ..."
                        className={inputCls} />
                    <p className="text-xs text-white/40 mt-2">Si lo dejas vacío, la opción «Otro medio de pago» no se muestra.</p>
                </div>

                <p className="text-xs text-white/40">
                    El precio del crédito por plan y el tipo de cambio a CLP se editan en Créditos IA → Configuración.
                </p>

                <div className="flex justify-end">
                    <button onClick={save} disabled={saving}
                        className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50">
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Guardar datos de pago
                    </button>
                </div>
            </div>
        </div>
    );
}
