"use client";

import React, { useState } from 'react';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import ReceiptPDF from './ReceiptPDF';
import { Download, Loader2 } from 'lucide-react';

interface ReceiptPDFViewerProps {
    receipt: {
        receipt_number: string;
        tenant_name: string;
        plan_name: string;
        billing_cycle: string;
        amount: number;
        currency: string;
        period_start_date: string;
        period_end_date: string;
        issued_at: string;
        metadata_json?: string;
    };
    showViewer?: boolean;
}

const ReceiptPDFViewer: React.FC<ReceiptPDFViewerProps> = ({ receipt, showViewer = true }) => {
    const [isClient, setIsClient] = useState(false);

    React.useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Download Button */}
            <div className="flex justify-end">
                <PDFDownloadLink
                    document={<ReceiptPDF receipt={receipt} />}
                    fileName={`${receipt.receipt_number}.pdf`}
                    className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                    {({ loading }) =>
                        loading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Generando PDF...
                            </>
                        ) : (
                            <>
                                <Download size={18} />
                                Descargar PDF
                            </>
                        )
                    }
                </PDFDownloadLink>
            </div>

            {/* PDF Viewer */}
            {showViewer && (
                <div className="w-full h-[600px] border border-white/10 rounded-xl overflow-hidden">
                    <PDFViewer width="100%" height="100%" className="border-0">
                        <ReceiptPDF receipt={receipt} />
                    </PDFViewer>
                </div>
            )}
        </div>
    );
};

export default ReceiptPDFViewer;
