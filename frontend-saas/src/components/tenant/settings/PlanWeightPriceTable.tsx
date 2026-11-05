'use client';

/**
 * Tabla «precio por plan y peso» (Configuración → Formulario y Pesos → Pesos y precios).
 * Filas = planes, columnas = rangos de peso. Celda vacía = precio base del plan.
 * Las columnas siguen la posición de los rangos (el backend conserva los IDs por posición).
 */

export interface PlanWeightRow {
    plan_id: number;
    name: string;
    group_name?: string | null;
    price: number;
    is_active?: boolean;
}

interface TierHeader {
    label: string;
    min_weight: string;
    max_weight: string;
}

const formatCLP = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

const tierTitle = (t: TierHeader, idx: number) => {
    const range = t.max_weight.trim()
        ? `${t.min_weight || '0'} – ${t.max_weight} kg`
        : `Desde ${t.min_weight || '0'} kg`;
    return { name: t.label.trim() || `Rango ${idx + 1}`, range };
};

export default function PlanWeightPriceTable({ tiers, plans, values, onChange, onFillRow }: {
    tiers: TierHeader[];
    plans: PlanWeightRow[];
    values: Record<number, string[]>;
    onChange: (planId: number, tierIdx: number, value: string) => void;
    onFillRow: (planId: number) => void;
}) {
    if (tiers.length === 0) {
        return (
            <p className="text-sm text-muted-foreground py-2">
                Primero agrega los rangos de peso: cada rango será una columna de la tabla.
            </p>
        );
    }
    if (plans.length === 0) {
        return (
            <p className="text-sm text-muted-foreground py-2">
                No tienes planes activos. Créalos en Gestión de Servicios y vuelve aquí para ponerles precio por peso.
            </p>
        );
    }

    return (
        <div className="overflow-x-auto rounded-2xl border border-foreground/10">
            <table className="w-full min-w-max text-sm">
                <thead>
                    <tr className="bg-foreground/[0.03] text-left">
                        <th scope="col" className="sticky left-0 z-10 bg-card px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Plan
                        </th>
                        {tiers.map((t, idx) => {
                            const { name, range } = tierTitle(t, idx);
                            return (
                                <th key={idx} scope="col" className="px-2 py-2.5 align-bottom">
                                    <span className="block text-xs font-bold text-foreground">{name}</span>
                                    <span className="block text-[10px] font-semibold text-muted-foreground">{range}</span>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5">
                    {plans.map(plan => {
                        const row = values[plan.plan_id] || [];
                        const empty = tiers.some((_, i) => !(row[i] || '').trim());
                        return (
                            <tr key={plan.plan_id}>
                                <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2 text-left align-top">
                                    <span className="block max-w-[11rem] truncate text-sm font-bold text-foreground" title={plan.name}>{plan.name}</span>
                                    {plan.group_name && (
                                        <span className="block max-w-[11rem] truncate text-[10px] font-semibold text-primary" title={plan.group_name}>{plan.group_name}</span>
                                    )}
                                    <span className="block text-[10px] text-muted-foreground">Base {formatCLP(plan.price || 0)}</span>
                                    {empty && (
                                        <button
                                            type="button"
                                            onClick={() => onFillRow(plan.plan_id)}
                                            className="mt-1 text-[10px] font-bold text-primary hover:underline cursor-pointer"
                                        >
                                            Completar vacíos con el base
                                        </button>
                                    )}
                                </th>
                                {tiers.map((t, idx) => {
                                    const v = row[idx] ?? '';
                                    const { name } = tierTitle(t, idx);
                                    return (
                                        <td key={idx} className="px-2 py-2 align-top">
                                            <div className="flex items-center rounded-xl border border-foreground/10 bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                                <span className="pl-2.5 text-xs text-muted-foreground" aria-hidden="true">$</span>
                                                <input
                                                    value={v}
                                                    inputMode="numeric"
                                                    placeholder={String(Math.round(plan.price || 0))}
                                                    aria-label={`${plan.name}, ${name}: precio`}
                                                    onChange={e => onChange(plan.plan_id, idx, e.target.value.replace(/\D/g, ''))}
                                                    className="w-28 bg-transparent px-1.5 py-2 text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground/50"
                                                />
                                            </div>
                                            {v && (
                                                <span className="mt-0.5 block text-[10px] text-muted-foreground">{formatCLP(parseFloat(v))}</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
