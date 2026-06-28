import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { Download, X, Loader2 } from 'lucide-react';
import ReceiptTemplate from './ReceiptTemplate';
import { useExportReceipt } from '@/hooks/useExportReceipt';

interface ReceiptPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: {
        tenantName: string;
        tenantId: string | number;
        planName: string;
        cycle: string;
        amount: number;
        startDate: Date | string;
        endDate: Date | string;
        advantages?: string[];
    } | null;
}

export default function ReceiptPreviewModal({ isOpen, onClose, data }: ReceiptPreviewModalProps) {
    const { exportToPDF, exporting } = useExportReceipt();
    const [config, setConfig] = React.useState<any>(null);

    React.useEffect(() => {
        if (isOpen && data) {
            // Fetch default receipt template
            import('@/lib/admin/api').then(({ apiRequest }) => {
                apiRequest('/api/internal/creator/document-templates/templates?category=recibo_suscripcion&is_default=true')
                    .then((templates: any[]) => {
                        const defaultTemplate = templates.find((t: any) => t.is_default);
                        if (defaultTemplate) {
                            // Map DB template structure to ReceiptTemplate config structure
                            setConfig({
                                ...defaultTemplate.sections_config,
                                advantages_list: defaultTemplate.advantages_list
                            });
                        }
                    })
                    .catch(console.error);
            });
        }
    }, [isOpen, data]);

    if (!data) return null;

    const handleDownload = async () => {
        const filename = `recibo-${data.tenantName.toLowerCase().replace(/\s+/g, '-')}.pdf`;
        await exportToPDF('receipt-preview-content', filename);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[900px] w-[95vw] h-[90vh] bg-[#0a0f18] border-white/10 p-0 overflow-hidden flex flex-col">
                <DialogHeader className="p-6 border-b border-white/5 shrink-0 flex flex-row items-center justify-between">
                    <div>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            Vista Previa de Recibo
                        </DialogTitle>
                        <DialogDescription className="text-white/40">
                            Revisa el documento antes de descargarlo.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-black/40 custom-scrollbar">
                    <div className="shadow-2xl scale-[0.85] origin-top transform-gpu">
                        <ReceiptTemplate
                            id="receipt-preview-content"
                            {...data}
                            config={config}
                            advantages={config?.advantages_list || data?.advantages}
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors"
                        disabled={exporting}
                    >
                        Cerrar
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={exporting}
                        className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                        {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                        {exporting ? 'Generando PDF...' : 'Descargar Recibo'}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
