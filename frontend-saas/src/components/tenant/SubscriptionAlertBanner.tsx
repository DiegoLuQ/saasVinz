"use client";

import { useEffect, useState } from "react";
import { useTenant } from "@/app/(tenant)/tenant/context/TenantContext";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Clock, CreditCard, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSubscriptionInfo, SubscriptionState } from "@/lib/tenant/subscription";

export function SubscriptionAlertBanner() {
    const { tenantData } = useTenant();
    const [status, setStatus] = useState<Exclude<SubscriptionState, "active"> | null>(null);
    const [daysRemaining, setDaysRemaining] = useState<number>(0);
    const router = useRouter();

    useEffect(() => {
        if (!tenantData || !tenantData.next_billing_date) return;
        if (tenantData.plan === "FREE") return;

        const checkExpiration = () => {
            const info = getSubscriptionInfo(tenantData.plan, tenantData.next_billing_date);
            setDaysRemaining(info.daysRemaining === Infinity ? 0 : info.daysRemaining);
            setStatus(info.state === "active" ? null : info.state);
        };

        checkExpiration();
        // Recalculate every hour
        const timer = setInterval(checkExpiration, 3600000);
        return () => clearInterval(timer);
    }, [tenantData]);

    if (!status) return null;

    const isLocked = status === "locked";
    const isGrace = status === "grace";
    const isRed = isGrace || isLocked;
    const planName = tenantData?.plan || "Ultra";

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full px-4 sm:px-6 lg:px-10 pb-4 relative z-20"
            >
                <div
                    className={`
                        w-full rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 border shadow-2xl relative overflow-hidden backdrop-blur-md transition-all duration-300
                        ${isRed
                            ? "bg-red-500/10 border-red-500/30 text-red-200 shadow-red-500/5 hover:border-red-500/40"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-200 shadow-amber-500/5 hover:border-amber-500/40"
                        }
                    `}
                >
                    {/* Glowing Accent Ring */}
                    <div
                        className={`
                            absolute -left-16 -top-16 w-32 h-32 rounded-full filter blur-[40px] opacity-25
                            ${isRed ? "bg-red-500" : "bg-amber-500"}
                        `}
                    />

                    <div className="flex items-center gap-4 relative z-10">
                        <div
                            className={`
                                p-3 rounded-xl shrink-0 flex items-center justify-center
                                ${isRed ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}
                            `}
                        >
                            {isLocked ? (
                                <Lock size={24} className="animate-pulse" strokeWidth={2.5} />
                            ) : isGrace ? (
                                <AlertTriangle size={24} className="animate-pulse" strokeWidth={2.5} />
                            ) : (
                                <Clock size={24} strokeWidth={2.5} />
                            )}
                        </div>

                        <div className="space-y-1">
                            <h4 className={`text-base font-bold tracking-wide ${isRed ? "text-red-400" : "text-amber-400"}`}>
                                {isLocked ? "Suscripción Vencida — Módulos Bloqueados" : isGrace ? "¡Acceso en Período de Gracia!" : "Renovación de Suscripción Requerida"}
                            </h4>
                            <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                {isLocked ? (
                                    <>
                                        Tu suscripción al plan <span className="font-extrabold uppercase text-white">{planName}</span> venció el{" "}
                                        <span className="font-bold text-red-400">
                                            {new Date(tenantData?.next_billing_date!).toLocaleDateString('es-CL', { timeZone: 'UTC' })}
                                        </span>{" "}
                                        y el período de gracia finalizó. Todos los módulos están bloqueados salvo <span className="font-bold text-white">Configuración</span>. Regulariza tu pago para reactivar el sistema.
                                    </>
                                ) : isGrace ? (
                                    <>
                                        Tu suscripción al plan <span className="font-extrabold uppercase text-white">{planName}</span> venció el{" "}
                                        <span className="font-bold text-red-400">
                                            {new Date(tenantData?.next_billing_date!).toLocaleDateString('es-CL', { timeZone: 'UTC' })}
                                        </span>
                                        . Tienes un periodo de gracia de 3 días (quedan <span className="font-bold text-red-400">{Math.max(0, 3 - Math.abs(daysRemaining))} {Math.max(0, 3 - Math.abs(daysRemaining)) === 1 ? "día" : "días"}</span>) para regularizar tu pago y evitar la suspensión automática del sistema.
                                    </>
                                ) : (
                                    <>
                                        Tu suscripción al plan <span className="font-extrabold uppercase text-white">{planName}</span> vencerá en{" "}
                                        <span className="font-extrabold text-amber-400">{daysRemaining} {daysRemaining === 1 ? "día" : "días"}</span> el{" "}
                                        <span className="font-bold text-amber-400">
                                            {new Date(tenantData?.next_billing_date!).toLocaleDateString('es-CL', { timeZone: 'UTC' })}
                                        </span>
                                        . Asegura la continuidad de tu servicio renovando a tiempo.
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => router.push("/dashboard/configuracion")}
                        className={`
                            shrink-0 py-3 px-6 rounded-xl font-bold flex items-center gap-2.5 transition-all relative z-10 active:scale-[0.98] shadow-lg
                            ${isRed
                                ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20"
                                : "bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20"
                            }
                        `}
                    >
                        <CreditCard size={18} />
                        {isRed ? "Regularizar Pago" : "Renovar Ahora"}
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
