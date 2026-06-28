export function translateCycle(cycle: string | null | undefined): string {
    const map: Record<string, string> = {
        monthly: 'Mensual',
        annual: 'Anual',
        bimonthly: 'Bimensual',
        semiannual: 'Semestral',
    };
    return cycle ? map[cycle] || cycle : '';
}

export function translateStatus(status: string | null | undefined): string {
    const map: Record<string, string> = {
        pending: 'Pendiente',
        completed: 'Completado',
        failed: 'Fallido',
        refunded: 'Reembolsado',
    };
    return status ? map[status] || status : '';
}
