"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CreditCard, CheckCircle, Smartphone, Calendar, AlertCircle } from "lucide-react";
import { cn } from '@/lib/utils';

interface PlanLimitProps {
    label: string;
    usage: number;
    max: number;
}

const ResourceProgress = ({ label, usage, max }: PlanLimitProps) => {
    const isUnlimited = max === -1 || max >= 999999;
    const percentage = isUnlimited ? 0 : Math.min((usage / max) * 100, 100);
    const displayMax = isUnlimited ? "∞" : max;

    // Color logic
    let colorClass = "bg-primary";
    if (!isUnlimited && percentage >= 90) colorClass = "bg-red-500";
    else if (!isUnlimited && percentage >= 75) colorClass = "bg-yellow-500";

    return (
        <div className="mb-4">
            <div className="flex justify-between items-center mb-1 text-sm">
                <span className="font-medium text-muted-foreground">{label}</span>
                <span className="text-xs font-semibold">
                    {usage} / {displayMax}
                </span>
            </div>
            <Progress value={percentage} className={`h-2 ${colorClass}`} />
        </div>
    );
};

interface CurrentPlanCardProps {
    planName: string;
    status: string; // active, expired, past_due
    price: number;
    nextBillingDate: string; // ISO string
    billingCycle: 'monthly' | 'annual';
    limits: {
        pets: { usage: number; max: number };
        customers: { usage: number; max: number };
        users: { usage: number; max: number };
        orders: { usage: number; max: number };
        storage?: { usage: number; max: number }; // Future
    };
    onUpgradeClick: () => void;
}

export function CurrentPlanCard({
    planName,
    status,
    price,
    nextBillingDate,
    billingCycle,
    limits,
    onUpgradeClick
}: CurrentPlanCardProps) {

    // Status Badge Logic
    const getStatusBadge = () => {
        switch (status) {
            case 'active':
                return <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/25 border-none">Activo</Badge>;
            case 'past_due':
                return <Badge variant="destructive">Pago Pendiente</Badge>;
            case 'expired':
                return <Badge variant="outline" className="text-gray-500 border-gray-300">Expirado</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const formatPrice = (amount: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
    }

    return (
        <Card className="w-full h-full shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4 border-l-primary">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Tu Plan Actual</p>
                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                            {planName}
                            {getStatusBadge()}
                        </CardTitle>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-bold text-primary">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price)}</p>
                        <p className="text-xs text-muted-foreground">/{billingCycle === 'annual' ? 'año' : 'mes'}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                    {/* Billing Info */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                            <Calendar className="h-5 w-5 text-primary" />
                            <div>
                                <p className="text-sm font-medium">Próxima Renovación</p>
                                <p className="text-sm text-muted-foreground">{formatDate(nextBillingDate)}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                            <CreditCard className="h-5 w-5 text-primary" />
                            <div>
                                <p className="text-sm font-medium">Método de Pago</p>
                                <p className="text-sm text-muted-foreground">Gestionar en Pasarela</p>
                            </div>
                        </div>

                        <Button onClick={onUpgradeClick} className="w-full mt-2" variant="default">
                            Cambiar Plan
                        </Button>
                    </div>

                    {/* Usage Stats */}
                    <div className="space-y-1">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Activity className="h-4 w-4" /> Consumo de Recursos
                        </h4>
                        <ResourceProgress label="Mascotas (Mensual)" usage={limits.pets.usage} max={limits.pets.max} />
                        <ResourceProgress label="Base de Clientes" usage={limits.customers.usage} max={limits.customers.max} />
                        <ResourceProgress label="Cremaciones (Mensual)" usage={limits.orders.usage} max={limits.orders.max} />
                        <ResourceProgress label="Usuarios" usage={limits.users.usage} max={limits.users.max} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

import { Activity } from 'lucide-react';
