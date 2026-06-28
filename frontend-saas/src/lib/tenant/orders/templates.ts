import type { Cremation, SelectedService, SelectedPlan, SelectedProduct } from '@/lib/tenant/orders/types';

export interface OrderTemplate {
    id: string;
    name: string;
    icon: string;
    description: string;
    defaults: {
        cremation?: Partial<Cremation>;
        autoAddPlan?: string;       // Plan name to auto-select
        autoAddServices?: string[]; // Service names to auto-add
    };
}

/**
 * Pre-defined order templates for common cremation types.
 * These are intended for operators who create 20+ orders/day
 * and want to skip repetitive selection steps.
 */
export const ORDER_TEMPLATES: OrderTemplate[] = [
    {
        id: 'individual_standard',
        name: 'Individual Estándar',
        icon: '🕯️',
        description: 'Cremación individual con retiro y entrega de cenizas',
        defaults: {
            cremation: {
                status: 'pendiente',
                notes: 'Cremación individual estándar',
            },
            autoAddPlan: 'Individual',
        },
    },
    {
        id: 'individual_premium',
        name: 'Individual Premium',
        icon: '⭐',
        description: 'Cremación individual con urna premium y memorial digital',
        defaults: {
            cremation: {
                status: 'pendiente',
                notes: 'Cremación individual premium con memorial incluido',
            },
            autoAddPlan: 'Premium',
        },
    },
    {
        id: 'grupal',
        name: 'Cremación Grupal',
        icon: '🕊️',
        description: 'Cremación grupal sin retorno de cenizas',
        defaults: {
            cremation: {
                status: 'pendiente',
                notes: 'Cremación grupal — sin retorno de cenizas',
                discount: 0,
            },
            autoAddPlan: 'Grupal',
        },
    },
    {
        id: 'urgente',
        name: 'Servicio Urgente',
        icon: '🚨',
        description: 'Retiro y cremación urgente (mismo día)',
        defaults: {
            cremation: {
                status: 'pendiente',
                notes: 'URGENTE — Servicio mismo día. Confirmar disponibilidad con equipo operativo.',
                scheduled_at: new Date().toISOString().slice(0, 16),
            },
            autoAddPlan: 'Individual',
            autoAddServices: ['Retiro Urgente'],
        },
    },
];
