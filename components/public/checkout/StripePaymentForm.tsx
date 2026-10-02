'use client';

/**
 * StripePaymentForm — wraps Stripe Elements and handles payment confirmation.
 *
 * Usage:
 *   The parent (CheckoutLayout) must wrap this component inside a Stripe
 *   <Elements> provider with the clientSecret obtained from POST /orders.
 *   This component renders the <PaymentElement> and a submit button.
 *
 * Flow:
 *   1. Parent calls POST /orders → receives { clientSecret, orderId }
 *   2. Parent renders <Elements stripe={stripePromise} options={{ clientSecret }}>
 *   3. This component renders PaymentElement + "Pay Now" button
 *   4. On submit: stripe.confirmPayment → redirects to confirmation on success
 *   5. On Stripe error: displays the error message inline
 *
 * Requirements: 7.8
 */

import { cn } from '@/lib/utils';
import {
    PaymentElement,
    useElements,
    useStripe,
} from '@stripe/react-stripe-js';
import { StripePaymentElementOptions } from '@stripe/stripe-js';
import { AlertCircle, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FormEvent, useState } from 'react';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface StripePaymentFormProps {
  /** The orderId returned by POST /orders — used to build the return URL */
  orderId: string;
  /** Called after successful payment confirmation */
  onSuccess?: (orderId: string) => void;
  /** Optional extra class names for the root element */
  className?: string;
}

// ─── Stripe PaymentElement appearance options ─────────────────────────────────

const PAYMENT_ELEMENT_OPTIONS: StripePaymentElementOptions = {
  layout: 'tabs',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function StripePaymentForm({ orderId, onSuccess, className }: StripePaymentFormProps) {
  const t = useTranslations('public.checkout');
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // ── Build the return URL for stripe.confirmPayment ─────────────────────────
  // After payment, Stripe redirects to this URL with payment_intent params.
  // The confirmation page reads the orderId from the path.
  const returnUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/orders/${orderId}/confirmation`
      : `/orders/${orderId}/confirmation`;

  // ── Submit handler ─────────────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not loaded yet — disable the button until it has
      return;
    }

    setIsProcessing(true);
    setStripeError(null);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
      });

      // If confirmPayment resolves without redirecting, an error occurred.
      // Stripe only resolves here on error — on success it redirects.
      if (error) {
        // Show validation errors or card errors inline
        if (error.type === 'card_error' || error.type === 'validation_error') {
          setStripeError(error.message ?? t('errorPaymentFailed'));
        } else {
          setStripeError(t('errorPaymentFailed'));
        }
      }
    } catch {
      setStripeError(t('errorGeneric'));
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('flex flex-col gap-5', className)}
      aria-label={t('payStripe')}
    >
      {/* ── Stripe PaymentElement ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4">
        <PaymentElement
          id="stripe-payment-element"
          options={PAYMENT_ELEMENT_OPTIONS}
          onReady={() => setIsReady(true)}
          onChange={() => {
            // Clear any previous error when the user modifies the form
            if (stripeError) setStripeError(null);
          }}
        />
      </div>

      {/* ── Inline error message ───────────────────────────────────────────── */}
      {stripeError && (
        <div
          role="alert"
          aria-live="polite"
          className={cn(
            'flex items-start gap-2.5 rounded-lg px-4 py-3',
            'bg-destructive/10 text-destructive',
            'text-sm',
          )}
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{stripeError}</span>
        </div>
      )}

      {/* ── Submit button ──────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={!stripe || !elements || !isReady || isProcessing}
        aria-disabled={!stripe || !elements || !isReady || isProcessing}
        className={cn(
          'inline-flex items-center justify-center gap-2',
          'w-full rounded-lg px-5 py-3',
          'bg-primary text-primary-foreground',
          'text-sm font-semibold',
          'transition-colors hover:bg-primary/90',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // Minimum touch target
          'min-h-[44px]',
          // Disabled state
          'disabled:cursor-not-allowed disabled:opacity-60',
        )}
      >
        <Lock className="size-4 shrink-0" aria-hidden="true" />
        {isProcessing ? t('processing') : t('payNow')}
      </button>

      {/* ── Secure checkout note ───────────────────────────────────────────── */}
      <p className="text-center text-xs text-muted-foreground">
        {t('secureCheckout')}
      </p>
    </form>
  );
}

export default StripePaymentForm;
