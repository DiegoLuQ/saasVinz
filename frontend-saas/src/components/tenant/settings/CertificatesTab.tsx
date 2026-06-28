import React, { useState, useEffect } from 'react';
import { Award, Building2, Fingerprint, User, FileCheck, Save, Eye } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { apiRequest } from '@/lib/tenant/api';
import { FormInput } from './FormField';

interface CertificatesTabProps {
    bootstrapTenant: any;
}

export function CertificatesTab({ bootstrapTenant }: CertificatesTabProps) {
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const [info, setInfo] = useState({
        name: '',
        rut: '',
        legal_rep_name: '',
        legal_rep_rut: '',
    });
    const [templates, setTemplates] = useState<{ id: number; name: string; isGlobal: boolean }[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (bootstrapTenant) {
            setInfo({
                name: bootstrapTenant.name || '',
                rut: bootstrapTenant.rut || '',
                legal_rep_name: bootstrapTenant.legal_rep_name || '',
                legal_rep_rut: bootstrapTenant.legal_rep_rut || '',
            });
            setSelectedTemplateId(bootstrapTenant.default_certificate_template_id || null);
        }
    }, [bootstrapTenant]);

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const [globalRes, localRes] = await Promise.all([
                    apiRequest('/api/internal/ops-records/templates/global'),
                    apiRequest('/api/internal/ops-records/templates'),
                ]);
                const global = (globalRes || []).map((t: any) => ({ id: t.id, name: t.name, isGlobal: true }));
                const local = (localRes || []).map((t: any) => ({ id: t.id, name: t.name, isGlobal: false }));
                setTemplates([...local, ...global]);
            } catch (err) {
                console.error('Error fetching templates:', err);
            }
        };
        fetchTemplates();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiRequest('/api/internal/tenants/me', {
                method: 'PATCH',
                body: JSON.stringify({
                    name: info.name,
                    rut: info.rut,
                    legal_rep_name: info.legal_rep_name,
                    legal_rep_rut: info.legal_rep_rut,
                    default_certificate_template_id: selectedTemplateId,
                }),
            });
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
            showToast('Datos del certificado guardados exitosamente', 'success');
        } catch (err: any) {
            showToast(err.message || 'Error al guardar los datos del certificado', 'error');
        } finally {
            setSaving(false);
        }
    };

    const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

    return (
        <div className="space-y-10 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Award size={22} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">Datos del Certificado</h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-md">
                            Esta información se imprime en los certificados de cremación que generes. Mantenla actualizada para que los documentos sean válidos.
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-primary to-orange-600 text-white rounded-2xl font-black shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                >
                    <Save size={20} />
                    {saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10">
                {/* Datos de la empresa */}
                <div className="space-y-8">
                    <div className="border-b border-white/5 pb-4 mb-2">
                        <h4 className="text-lg font-bold flex items-center gap-2">
                            <Building2 className="text-primary" size={20} />
                            Empresa
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">Razón social y RUT que emiten el certificado</p>
                    </div>

                    <FormInput
                        label="Nombre / Razón Social"
                        icon={Building2}
                        value={info.name}
                        placeholder="Crematorio Ejemplo SpA"
                        onChange={(name) => setInfo({ ...info, name })}
                    />

                    <FormInput
                        label="RUT Empresa"
                        icon={Fingerprint}
                        value={info.rut}
                        placeholder="76.543.210-K"
                        onChange={(rut) => setInfo({ ...info, rut })}
                    />
                </div>

                {/* Datos del representante */}
                <div className="space-y-8">
                    <div className="border-b border-white/5 pb-4 mb-2">
                        <h4 className="text-lg font-bold flex items-center gap-2">
                            <User className="text-primary" size={20} />
                            Representante Legal
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">Persona que firma / autoriza el certificado</p>
                    </div>

                    <FormInput
                        label="Nombre del Representante"
                        icon={User}
                        value={info.legal_rep_name}
                        placeholder="María González"
                        onChange={(legal_rep_name) => setInfo({ ...info, legal_rep_name })}
                    />

                    <FormInput
                        label="RUT del Representante"
                        icon={Fingerprint}
                        value={info.legal_rep_rut}
                        placeholder="12.345.678-9"
                        onChange={(legal_rep_rut) => setInfo({ ...info, legal_rep_rut })}
                    />
                </div>
            </div>

            {/* Plantilla predeterminada */}
            <div className="pt-10 border-t border-white/5">
                <div className="glass-card p-6 rounded-2xl border-white/5 space-y-4 max-w-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                            <FileCheck size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-sm">Plantilla de Certificados</p>
                            <p className="text-[10px] text-white/40">Formato predeterminado al generar certificados</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-muted-foreground ml-1">Plantilla Predeterminada</label>
                        <select
                            value={selectedTemplateId ?? ''}
                            onChange={(e) => setSelectedTemplateId(e.target.value ? Number(e.target.value) : null)}
                            className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all appearance-none cursor-pointer"
                        >
                            <option value="" className="bg-[#0d1b2a] text-white/60">— Automático (por defecto del sistema) —</option>
                            {templates.filter((t) => !t.isGlobal).length > 0 && (
                                <optgroup label="Mis Plantillas" className="bg-[#0d1b2a]">
                                    {templates.filter((t) => !t.isGlobal).map((t) => (
                                        <option key={t.id} value={t.id} className="bg-[#0d1b2a] text-white">{t.name}</option>
                                    ))}
                                </optgroup>
                            )}
                            {templates.filter((t) => t.isGlobal).length > 0 && (
                                <optgroup label="Plantillas Globales (Premium)" className="bg-[#0d1b2a]">
                                    {templates.filter((t) => t.isGlobal).map((t) => (
                                        <option key={t.id} value={t.id} className="bg-[#0d1b2a] text-white">🌐 {t.name}</option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                        {selectedTemplate && (
                            <p className="text-[10px] text-amber-400/60 ml-1 flex items-center gap-1">
                                <FileCheck size={10} />
                                Plantilla seleccionada: <strong className="text-amber-400">{selectedTemplate.name}</strong>
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Vista previa de los datos */}
            <div className="pt-10 border-t border-white/5">
                <div className="flex items-center gap-2 mb-5">
                    <Eye className="text-primary" size={20} />
                    <h4 className="text-lg font-bold">Vista Previa</h4>
                    <span className="text-[10px] text-white/40">Cómo aparecerán los datos en el certificado</span>
                </div>

                <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-[#0a192f] to-[#0d1b2a] p-8 sm:p-10 shadow-2xl">
                    <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
                    <div className="relative text-center space-y-1">
                        <p className="text-[10px] uppercase tracking-[0.35em] text-amber-400/70 font-black">Certificado de Cremación</p>
                        <p className="text-2xl font-black text-white pt-2">{info.name || 'Nombre de la Empresa'}</p>
                        <p className="text-xs text-white/50">RUT: {info.rut || '—'}</p>
                    </div>
                    <div className="relative mt-10 pt-6 border-t border-white/10 flex flex-col items-center gap-1">
                        <div className="w-40 border-b border-white/30 mb-1" />
                        <p className="text-sm font-bold text-white">{info.legal_rep_name || 'Representante Legal'}</p>
                        <p className="text-[11px] text-white/50">RUT: {info.legal_rep_rut || '—'}</p>
                        <p className="text-[9px] uppercase tracking-widest text-white/30 mt-1">Representante Legal</p>
                    </div>
                </div>
                <p className="text-[10px] text-white/30 mt-3 ml-1">
                    Esta es una vista referencial. La posición exacta de cada dato depende de la plantilla seleccionada y se ajusta en el diseñador de documentos.
                </p>
            </div>
        </div>
    );
}
