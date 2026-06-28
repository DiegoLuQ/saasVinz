import { pdf } from '@react-pdf/renderer';
import { useState, createElement } from 'react';
import ReceiptPDF from '@/components/admin/receipts/ReceiptPDF';

export const useExportReceipt = () => {
    const [exporting, setExporting] = useState(false);

    const exportToPDF = async (data: any, filename: string = 'recibo-suscripcion.pdf') => {
        setExporting(true);
        try {
            // Generate PDF Blob using the existing ReceiptPDF component
            // We cast to any to bypass strict typing mismatch between Document element and React component
            const doc = <ReceiptPDF receipt={data} /> as any;
            const blob = await pdf(doc).toBlob();

            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('Error generating PDF:', error);
            return false;
        } finally {
            setExporting(false);
        }
    };

    return {
        exportToPDF,
        exporting
    };
};
