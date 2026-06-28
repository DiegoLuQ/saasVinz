"use client";

import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Transaction {
    id: number;
    amount: number;
    currency: string;
    payment_status: string; // pending, completed, failed
    created_at: string;
    invoice_url?: string;
    description?: string;
}

interface BillingHistoryProps {
    transactions: Transaction[];
}

const ITEMS_PER_PAGE = 10;

export function BillingHistory({ transactions }: BillingHistoryProps) {
    const [currentPage, setCurrentPage] = useState(1);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-CL', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatPrice = (amount: number, currency: string) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: currency || 'CLP' }).format(amount);
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Pagado</Badge>;
            case 'pending':
                return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none">Pendiente</Badge>;
            case 'failed':
                return <Badge variant="destructive">Fallido</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    }

    if (!transactions || transactions.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed text-sm">
                No hay transacciones registradas aún.
            </div>
        );
    }

    // Pagination Logic
    const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentTransactions = transactions.slice(startIndex, endIndex);

    const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
    const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));

    return (
        <div className="space-y-4">
            <div className="rounded-md border bg-black/5">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-white/5">
                            <TableHead className="text-white/40 font-bold uppercase text-[10px] tracking-widest">Fecha</TableHead>
                            <TableHead className="text-white/40 font-bold uppercase text-[10px] tracking-widest">Descripción</TableHead>
                            <TableHead className="text-white/40 font-bold uppercase text-[10px] tracking-widest">Monto</TableHead>
                            <TableHead className="text-white/40 font-bold uppercase text-[10px] tracking-widest">Estado</TableHead>
                            <TableHead className="text-right text-white/40 font-bold uppercase text-[10px] tracking-widest">Recibo</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentTransactions.map((tx) => (
                            <TableRow key={tx.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                <TableCell className="font-medium text-white/80">{formatDate(tx.created_at)}</TableCell>
                                <TableCell className="text-white/60">{tx.description || "Suscripción Mensual"}</TableCell>
                                <TableCell className="font-bold text-white">{formatPrice(tx.amount, tx.currency)}</TableCell>
                                <TableCell>{getStatusBadge(tx.payment_status)}</TableCell>
                                <TableCell className="text-right">
                                    {(tx as any).payment_reference ? (
                                        <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary hover:bg-primary/10">
                                            <a href={`/dashboard/recibo/${(tx as any).payment_reference}`} target="_blank" rel="noopener noreferrer">
                                                <Download className="h-4 w-4 mr-1" /> Ver
                                            </a>
                                        </Button>
                                    ) : tx.invoice_url ? (
                                        <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary hover:bg-primary/10">
                                            <a href={tx.invoice_url} target="_blank" rel="noopener noreferrer">
                                                <Download className="h-4 w-4 mr-1" /> Ver
                                            </a>
                                        </Button>
                                    ) : (
                                        <span className="text-white/20 text-xs">-</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                    <div className="text-xs text-white/40 font-medium">
                        Mostrando <span className="text-white font-bold">{startIndex + 1}</span> a <span className="text-white font-bold">{Math.min(endIndex, transactions.length)}</span> de <span className="text-white font-bold">{transactions.length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrevPage}
                            disabled={currentPage === 1}
                            className="bg-white/5 border-white/10 text-white hover:bg-white/10 disabled:opacity-30 rounded-xl px-3"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center gap-1 mx-2">
                            {[...Array(totalPages)].map((_, i) => {
                                const pageNum = i + 1;
                                // Show first, last, current, and pages around current
                                if (
                                    pageNum === 1 ||
                                    pageNum === totalPages ||
                                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                ) {
                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={currentPage === pageNum ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === pageNum
                                                ? 'bg-primary text-black hover:bg-primary shadow-lg shadow-primary/20'
                                                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                                }`}
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                } else if (
                                    pageNum === currentPage - 2 ||
                                    pageNum === currentPage + 2
                                ) {
                                    return <span key={pageNum} className="text-white/20 px-1">...</span>;
                                }
                                return null;
                            })}
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
                            className="bg-white/5 border-white/10 text-white hover:bg-white/10 disabled:opacity-30 rounded-xl px-3"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
