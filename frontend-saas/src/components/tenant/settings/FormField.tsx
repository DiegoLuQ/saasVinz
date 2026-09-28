import React from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';

type Variant = 'default' | 'compact';

const variantBase: Record<Variant, string> = {
    default:
        'w-full bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-sm rounded-2xl py-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all font-bold text-lg dark:bg-[#0a192f] dark:border-white/10 dark:text-white dark:placeholder:text-white/30 dark:shadow-none dark:focus:border-primary/50 dark:focus:ring-0',
    compact:
        'w-full bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all text-sm dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-white/30 dark:focus:border-primary/50 dark:focus:ring-0',
};

const variantPad = {
    default: { icon: 'px-14', prefix: 'pl-10 pr-6', plain: 'px-6', select: 'pl-6 pr-12' },
    compact: { icon: 'pl-10 pr-3', prefix: 'pl-8 pr-3', plain: 'px-4', select: 'pl-3 pr-10' },
};

const iconPos = {
    default: { left: 'left-6', right: 'right-6', size: 20 as const, prefixLeft: 'left-6', color: 'text-slate-400 dark:text-white/20' },
    compact: { left: 'left-3', right: 'right-3', size: 16 as const, prefixLeft: 'left-3', color: 'text-muted-foreground' },
};

interface FormFieldShellProps {
    label?: string;
    children: React.ReactNode;
    variant: Variant;
}

function FormFieldShell({ label, children, variant }: FormFieldShellProps) {
    if (!label) return <>{children}</>;
    const labelClass =
        variant === 'compact'
            ? 'text-xs font-bold text-muted-foreground ml-1'
            : 'text-[10px] uppercase font-black text-slate-600 dark:text-white/40 tracking-[0.2em] ml-1';
    return (
        <div className="space-y-2">
            <label className={labelClass}>{label}</label>
            {children}
        </div>
    );
}

interface FormInputProps {
    label?: string;
    value: string | number;
    onChange?: (value: string) => void;
    icon?: LucideIcon;
    type?: string;
    placeholder?: string;
    readOnly?: boolean;
    prefix?: string;
    variant?: Variant;
    step?: string | number;
}

export function FormInput({
    label,
    value,
    onChange,
    icon: Icon,
    type = 'text',
    placeholder,
    readOnly = false,
    prefix,
    variant = 'default',
    step,
}: FormInputProps) {
    const pads = variantPad[variant];
    const pos = iconPos[variant];
    const padX = Icon ? pads.icon : prefix ? pads.prefix : pads.plain;
    const readOnlyClasses = readOnly
        ? variant === 'default'
            ? '!bg-slate-100 !border-slate-200 !text-slate-600 cursor-not-allowed shadow-inner dark:!bg-[#0a192f]/50 dark:!border-white/5 dark:!text-white/70'
            : 'opacity-70 cursor-not-allowed'
        : '';

    return (
        <FormFieldShell label={label} variant={variant}>
            <div className="relative group">
                {Icon && (
                    <Icon
                        className={`absolute ${pos.left} top-1/2 -translate-y-1/2 ${pos.color} group-focus-within:text-primary transition-colors`}
                        size={pos.size}
                    />
                )}
                {prefix && (
                    <div className={`absolute ${pos.prefixLeft} top-1/2 -translate-y-1/2 text-slate-500 dark:text-white/30 font-bold`}>
                        {prefix}
                    </div>
                )}
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                    placeholder={placeholder}
                    readOnly={readOnly}
                    step={step}
                    className={`${variantBase[variant]} ${padX} ${readOnlyClasses}`.trim()}
                />
            </div>
        </FormFieldShell>
    );
}

export interface SelectOption {
    value: string;
    label: string;
}

interface FormSelectProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    icon?: LucideIcon;
    placeholder?: string;
    disabled?: boolean;
    variant?: Variant;
}

export function FormSelect({
    label,
    value,
    onChange,
    options,
    icon: Icon,
    placeholder,
    disabled = false,
    variant = 'default',
}: FormSelectProps) {
    const pads = variantPad[variant];
    const pos = iconPos[variant];
    const padX = Icon ? pads.icon : pads.select;
    const disabledClass = disabled ? 'opacity-50' : '';
    const optionBg = variant === 'compact' ? 'bg-white text-slate-900 dark:bg-[#1a1f2e] dark:text-white' : 'bg-white text-slate-900 dark:bg-[#0a192f] dark:text-white';

    return (
        <FormFieldShell label={label} variant={variant}>
            <div className="relative group">
                {Icon && (
                    <Icon
                        className={`absolute ${pos.left} top-1/2 -translate-y-1/2 ${pos.color} group-focus-within:text-primary transition-colors`}
                        size={pos.size}
                    />
                )}
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className={`${variantBase[variant]} ${padX} appearance-none cursor-pointer ${disabledClass}`.trim()}
                >
                    {placeholder && (
                        <option value="" className={optionBg}>
                            {placeholder}
                        </option>
                    )}
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value} className={optionBg}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <ChevronDown
                    className={`absolute ${pos.right} top-1/2 -translate-y-1/2 ${pos.color} group-focus-within:text-primary transition-colors pointer-events-none`}
                    size={pos.size}
                />
            </div>
        </FormFieldShell>
    );
}
