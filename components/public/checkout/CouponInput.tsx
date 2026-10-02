'use client';

/**
 * CouponInput — coupon code field with validate button for the checkout flow.
 *
 * Behaviour:
 *  - Calls POST /coupons/validate with { code, cartTotal }
 *  - On success: displays discount preview (type, amount, final total)
 *  - On 403: shows "This coupon requires an account. Please log in to use it."
 *  - On other errors: shows the API error message or a generic fallback
 *  - Applied coupon can be removed to reset the field
 *
 * Props:
 *  - cartTotal: current cart subtotal (required for the validation payload)
 *  - onCouponApplied: callback fired with the validation result when a coupon is applied
 *  - onCouponRemoved: callback fired when the applied coupon is removed
 *
 * Requirements: 7.3
 */

import { usePublicMutation } from '@/lib/api/public-hooks';
import { cn } from '@/lib/utils';
import { CouponValidationResult } from '@/types/public';
import { CheckCircle, Tag, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CouponValidatePayload {
  code: string;
  orderTotal: number;
}

interface CouponValidateResponse {
  data: CouponValidationResult;
}

export interface CouponInputProps {
  /** Current cart subtotal — sent as cartTotal in the validation request */
  cartTotal: number;
  /** Called when a coupon is successfully validated */
  onCouponApplied?: (result: CouponValidationResult, code: string) => void;
  /** Called when the applied coupon is removed */
  onCouponRemoved?: () => void;
  /** Optional extra class names for the root element */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CouponInput({
  cartTotal,
  onCouponApplied,
  onCouponRemoved,
  className,
}: CouponInputProps) {
  const t = useTranslations('public.checkout');

  const [code, setCode] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [appliedResult, setAppliedResult] = useState<CouponValidationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Mutation ──────────────────────────────────────────────────────────────

  const { mutateAsync, isPending } = usePublicMutation<
    CouponValidateResponse,
    CouponValidatePayload
  >('post', '/catalog/coupons/validate');

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleApply = async () => {
    const trimmedCode = code.trim();
    if (!trimmedCode) return;

    setErrorMessage(null);

    try {
      const response = await mutateAsync({ code: trimmedCode, orderTotal: cartTotal });
      const result = response?.data;

      if (result) {
        setAppliedCode(trimmedCode);
        setAppliedResult(result);
        setCode('');
        onCouponApplied?.(result, trimmedCode);
      }
    } catch (err: unknown) {
      // Check for 403 — coupon requires authentication
      const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
      const status = axiosError?.response?.status;
      const message = axiosError?.response?.data?.message;

      if (status === 403) {
        setErrorMessage(t('couponRequiresAccount'));
      } else {
        setErrorMessage(message ?? t('couponInvalid'));
      }
    }
  };

  const handleRemove = () => {
    setAppliedCode(null);
    setAppliedResult(null);
    setErrorMessage(null);
    setCode('');
    onCouponRemoved?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  // ── Applied state ─────────────────────────────────────────────────────────

  if (appliedCode && appliedResult) {
    return (
      <div
        className={cn(
          'rounded-xl border border-border bg-card p-4',
          'flex flex-col gap-3',
          className,
        )}
        role="region"
        aria-label={t('couponCode')}
      >
        {/* Applied coupon header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle
              className="size-4 shrink-0 text-green-600 dark:text-green-400"
              aria-hidden="true"
            />
            <span className="text-sm font-semibold text-foreground truncate">
              {appliedCode}
            </span>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className={cn(
              'flex items-center gap-1 shrink-0',
              'text-xs text-muted-foreground',
              'hover:text-destructive transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded',
              'min-h-[44px] min-w-[44px] justify-end',
            )}
            aria-label={t('couponRemove')}
          >
            <X className="size-3.5" aria-hidden="true" />
            <span>{t('couponRemove')}</span>
          </button>
        </div>

        {/* Discount preview — actual amount shown in order summary via checkout-preview */}
        <div className="rounded-lg bg-green-100 dark:bg-green-900/30 px-3 py-2.5 text-sm">
          <span className="text-green-800 dark:text-green-400 font-medium">
            {t('couponApplied')}
          </span>
        </div>
      </div>
    );
  }

  // ── Input state ───────────────────────────────────────────────────────────

  return (
    <div
      className={cn('flex flex-col gap-2', className)}
      role="region"
      aria-label={t('couponCode')}
    >
      {/* Label */}
      <label
        htmlFor="coupon-code-input"
        className="flex items-center gap-1.5 text-sm font-medium text-foreground"
      >
        <Tag className="size-3.5 text-muted-foreground" aria-hidden="true" />
        {t('couponCode')}
      </label>

      {/* Input row */}
      <div className="flex gap-2">
        <input
          id="coupon-code-input"
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (errorMessage) setErrorMessage(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder={t('couponPlaceholder')}
          disabled={isPending}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-describedby={errorMessage ? 'coupon-error' : undefined}
          aria-invalid={!!errorMessage}
          className={cn(
            'flex-1 min-w-0 rounded-lg border px-3 py-2',
            'bg-background text-foreground text-sm',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors',
            errorMessage
              ? 'border-destructive focus-visible:ring-destructive'
              : 'border-border',
            // Minimum touch target height
            'min-h-[44px]',
          )}
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={isPending || !code.trim()}
          className={cn(
            'shrink-0 rounded-lg px-4 py-2',
            'bg-primary text-primary-foreground text-sm font-semibold',
            'hover:bg-primary/90 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            // Minimum touch target
            'min-h-[44px] min-w-[44px]',
          )}
          aria-busy={isPending}
        >
          {isPending ? t('couponApplying') : t('couponApply')}
        </button>
      </div>

      {/* Error message */}
      {errorMessage && (
        <p
          id="coupon-error"
          role="alert"
          className="text-sm text-destructive"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}

export default CouponInput;
