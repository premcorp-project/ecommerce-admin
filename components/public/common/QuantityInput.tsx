'use client';

import { MinusIcon } from '@/components/ui/animated-icons/minus-icon';
import { PlusIcon } from '@/components/ui/animated-icons/plus-icon';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface QuantityInputProps {
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
    disabled?: boolean;
    className?: string;
}

/**
 * QuantityInput — +/- stepper with min/max range enforcement.
 *
 * - Decrement button is disabled when value === min
 * - Increment button is disabled when value === max
 * - Touch targets are at least 44×44px per WCAG 2.5.5
 *
 * Requirements: 13.7, 14.9
 */
export function QuantityInput({
    value,
    min,
    max,
    onChange,
    disabled = false,
    className,
}: QuantityInputProps) {
    const t = useTranslations('public.common');

    const handleDecrement = () => {
        if (value > min) {
            onChange(value - 1);
        }
    };

    const handleIncrement = () => {
        if (value < max) {
            onChange(value + 1);
        }
    };

    const isAtMin = value <= min;
    const isAtMax = value >= max;

    return (
        <div
            className={cn(
                'inline-flex items-center rounded-md border border-border bg-background',
                className,
            )}
        >
            <button
                type="button"
                onClick={handleDecrement}
                disabled={disabled || isAtMin}
                aria-label={t('decrementQuantity')}
                className={cn(
                    'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-l-md',
                    'text-foreground transition-colors',
                    'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                    (disabled || isAtMin) &&
                        'cursor-not-allowed opacity-40',
                )}
            >
                <MinusIcon size={16} className="text-foreground" />
            </button>

            <input
                type="number"
                value={value}
                onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') return;
                    const num = parseInt(raw, 10);
                    if (isNaN(num)) return;
                    onChange(Math.max(min, Math.min(max, num)));
                }}
                onBlur={() => {
                    // Ensure value is within bounds on blur
                    if (value < min) onChange(min);
                    if (value > max) onChange(max);
                }}
                min={min}
                max={max}
                disabled={disabled}
                aria-label={t('quantity')}
                aria-live="polite"
                aria-atomic="true"
                className="w-12 bg-transparent text-center text-sm font-medium tabular-nums text-foreground border-x border-border py-2 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />

            <button
                type="button"
                onClick={handleIncrement}
                disabled={disabled || isAtMax}
                aria-label={t('incrementQuantity')}
                className={cn(
                    'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-r-md',
                    'text-foreground transition-colors',
                    'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                    (disabled || isAtMax) &&
                        'cursor-not-allowed opacity-40',
                )}
            >
                <PlusIcon size={16} className="text-foreground" />
            </button>
        </div>
    );
}

export default QuantityInput;
