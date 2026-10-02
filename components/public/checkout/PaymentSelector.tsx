'use client';

/**
 * PaymentSelector — renders available payment methods based on the
 * authenticated user's `hasCODAccess` flag.
 *
 * Rules (Requirements 7.7, Design Property 9):
 *  - WHEN user.hasCODAccess === true  → radio group with Stripe AND COD options
 *  - WHEN user.hasCODAccess === false → Stripe only; COD option is never rendered
 *  - WHEN user is a guest (user === null) → Stripe only; COD option is never rendered
 *
 * The COD option is conditionally rendered — it is never hidden via CSS.
 * This satisfies Property 9: "the COD option SHALL never appear in the
 * PaymentSelector" for ineligible users.
 */

import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import { cn } from '@/lib/utils';
import { CreditCard, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentMethod = 'stripe' | 'cod' | 'cop';

export interface PaymentSelectorProps {
  /** Currently selected payment method */
  value: PaymentMethod;
  /** Called when the user selects a different method */
  onChange: (method: PaymentMethod) => void;
  /** Delivery method — determines which cash option to show (cod vs cop) */
  deliveryMethod?: 'delivery' | 'pickup';
  /** Optional extra class names for the root element */
  className?: string;
  /** Disable all options (e.g. while an order is being placed) */
  disabled?: boolean;
}

// ─── Sub-component: individual radio option ───────────────────────────────────

interface PaymentOptionProps {
  id: string;
  name: string;
  value: PaymentMethod;
  checked: boolean;
  disabled: boolean;
  onChange: (method: PaymentMethod) => void;
  icon: React.ReactNode;
  label: string;
  description?: string;
}

function PaymentOption({
  id,
  name,
  value,
  checked,
  disabled,
  onChange,
  icon,
  label,
  description,
}: PaymentOptionProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        // Base card style
        'flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors',
        // Selected state
        checked
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card hover:bg-muted/50',
        // Disabled state
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      {/* Radio input — visually hidden but accessible */}
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="sr-only"
        aria-describedby={description ? `${id}-description` : undefined}
      />

      {/* Custom radio indicator */}
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          checked ? 'border-primary' : 'border-muted-foreground',
        )}
      >
        {checked && (
          <span className="size-2 rounded-full bg-primary" />
        )}
      </span>

      {/* Icon */}
      <span
        aria-hidden="true"
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-md',
          checked
            ? 'bg-primary/10 text-primary'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {icon}
      </span>

      {/* Label + description */}
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {description && (
          <span
            id={`${id}-description`}
            className="text-xs text-muted-foreground"
          >
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * PaymentSelector
 *
 * Reads `user.hasCODAccess` from CustomerAuthStore.
 * Renders a radio group with Stripe only, or Stripe + COD when eligible.
 *
 * Requirements: 7.7
 */
export function PaymentSelector({
  value,
  onChange,
  deliveryMethod = 'delivery',
  className,
  disabled = false,
}: PaymentSelectorProps) {
  const t = useTranslations('public.checkout');
  const { user } = useCustomerAuthStore();

  // COD is only available for delivery orders with hasCODAccess.
  // COP is available for pickup orders (all users).
  const hasCODAccess = user?.hasCODAccess === true;
  const isPickup = deliveryMethod === 'pickup';

  const radioGroupName = 'payment-method';

  return (
    <fieldset className={cn('space-y-3', className)} disabled={disabled}>
      <legend className="mb-3 text-sm font-semibold text-foreground">
        {t('paymentMethod')}
      </legend>

      {/* ── Stripe option — always rendered ─────────────────────────────── */}
      <PaymentOption
        id="payment-stripe"
        name={radioGroupName}
        value="stripe"
        checked={value === 'stripe'}
        disabled={disabled}
        onChange={onChange}
        icon={<CreditCard className="size-5" aria-hidden="true" />}
        label={t('payStripe')}
      />

      {/* ── COP option — only for pickup orders ─────────────────────────── */}
      {isPickup && (
        <PaymentOption
          id="payment-cop"
          name={radioGroupName}
          value="cop"
          checked={value === 'cop'}
          disabled={disabled}
          onChange={onChange}
          icon={<Truck className="size-5" aria-hidden="true" />}
          label={t('payCop')}
          description={t('copNote')}
        />
      )}

      {/* ── COD option — only for delivery orders with hasCODAccess ──────── */}
      {!isPickup && hasCODAccess && (
        <PaymentOption
          id="payment-cod"
          name={radioGroupName}
          value="cod"
          checked={value === 'cod'}
          disabled={disabled}
          onChange={onChange}
          icon={<Truck className="size-5" aria-hidden="true" />}
          label={t('payCod')}
          description={t('codNote')}
        />
      )}
    </fieldset>
  );
}

export default PaymentSelector;
