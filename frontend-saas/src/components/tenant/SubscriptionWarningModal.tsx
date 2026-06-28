"use client";

import { useEffect, useState } from "react";
import { useTenant } from "@/app/(tenant)/tenant/context/TenantContext";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Clock, X, CreditCard } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function SubscriptionWarningModal() {
    const { tenantData } = useTenant();
    const [showModal, setShowModal] = useState(false);
    const [status, setStatus] = useState<"warning" | "grace" | null>(null);
    const [daysRemaining, setDaysRemaining] = useState<number>(0);
    const router = useRouter();

    useEffect(() => {
        if (!tenantData || !tenantData.next_billing_date) return;

        // Don't show for FREE plans unless we decide otherwise
        if (tenantData.plan === "FREE") return;

        const checkExpiration = () => {
            try {
                const datePart = tenantData.next_billing_date!.split('T')[0];
                const parts = datePart.split('-');
                if (parts.length !== 3) return;

                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; // 0-indexed month
                const day = parseInt(parts[2], 10);

                const expiration = new Date(year, month, day);
                
                // Get today's local date at midnight
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const diffTime = expiration.getTime() - today.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                setDaysRemaining(diffDays);

                if (diffDays < 0) {
                    // Subscription Expired (Grace Period)
                    setStatus("grace");
                    setShowModal(true);
                } else if (diffDays <= 5) {
                    // Approaching Expiration (5 days or less)
                    const dismissed = sessionStorage.getItem("sub_warning_dismissed");
                    if (!dismissed) {
                        setStatus("warning");
                        setShowModal(true);
                    }
                }
            } catch (err) {
                console.error("Error calculating subscription expiration:", err);
            }
        };

        checkExpiration();
    }, [tenantData]);

    const handleDismiss = () => {
        setShowModal(false);
        if (status === "warning") {
            sessionStorage.setItem("sub_warning_dismissed", "true");
        }
    };

    const handlePayNow = () => {
        // Redirigir a configuración o facturación
        router.push("/dashboard/configuracion");
        setShowModal(false);
    };

    if (!showModal || !status) return null;

    const isGrace = status === "grace";

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4 sm:p-0">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                    onClick={isGrace ? undefined : handleDismiss}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className={`
                        relative w-full max-w-md rounded-2xl shadow-xl overflow-hidden bg-card border
                        ${isGrace
                            ? "border-red-500/30"
                            : "border-yellow-500/30"}
                    `}
                >
                    {/* Header Background Pattern */}
                    <div className={`absolute top-0 left-0 w-full h-1 ${isGrace ? "bg-red-500" : "bg-yellow-500"}`} />

                    <div className="p-6">
                        <div className="flex items-start gap-4">
                            <div className={`
                                p-3 rounded-xl shrink-0
                                ${isGrace ? "bg-red-500/10 text-red-500" : "bg-yellow-500/10 text-yellow-500"}
                            `}>
                                {isGrace ? <AlertTriangle size={24} strokeWidth={2.5} /> : <Clock size={24} strokeWidth={2.5} />}
                            </div>

                            <div className="flex-1 space-y-2">
                                <h3 className={`text-lg font-bold ${isGrace ? "text-red-400" : "text-yellow-400"}`}>
                                    {isGrace ? "Suscripción Vencida" : "Suscripción por Vencer"}
                                </h3>

                                <div className="text-muted-foreground text-sm leading-relaxed">
                                    {isGrace ? (
                                        <>
                                            Tu suscripción venció hace <span className="text-red-400 font-bold">{Math.abs(daysRemaining)} {Math.abs(daysRemaining) === 1 ? "día" : "días"}</span>.
                                            Estás en el periodo de gracia de 3 días (te quedan <span className="text-red-400 font-bold">{Math.max(0, 3 - Math.abs(daysRemaining))} {Math.max(0, 3 - Math.abs(daysRemaining)) === 1 ? "día" : "días"}</span>). Por favor realiza el pago para evitar el bloqueo del sistema.
                                        </>
                                    ) : (
                                        <>
                                            Tu suscripción vencerá en <span className="text-yellow-400 font-bold">{daysRemaining} días</span>
                                            ({new Date(tenantData?.next_billing_date!).toLocaleDateString('es-CL')}).
                                            Asegura la continuidad de tu servicio.
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={handlePayNow}
                                className={`
                                    flex-1 py-2.5 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors
                                    ${isGrace
                                        ? "bg-red-500 hover:bg-red-600 text-white"
                                        : "bg-yellow-500 hover:bg-yellow-600 text-black"}
                                `}
                            >
                                <CreditCard size={18} />
                                {isGrace ? "Regularizar Pago" : "Renovar Ahora"}
                            </button>

                            {!isGrace && (
                                <button
                                    onClick={handleDismiss}
                                    className="px-4 py-2.5 rounded-xl border border-foreground/10 hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Más tarde
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Close button for non-grace only */}
                    {!isGrace && (
                        <button
                            onClick={handleDismiss}
                            className="absolute top-3 right-3 p-2 text-muted-foreground/50 hover:text-foreground transition-colors"
                        >
                            <X size={18} />
                        </button>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
