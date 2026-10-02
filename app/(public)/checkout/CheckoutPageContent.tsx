'use client';

/**
 * Checkout Page Content — app/(public)/checkout/CheckoutPageContent.tsx
 *
 * Client component extracted from page.tsx to allow metadata export in the
 * server component page.
 *
 * Behaviour:
 *  - Guests proceed without redirect (no auth guard on this page).
 *  - Authenticated users: on successful order, invalidate ['public', 'cart']
 *    query and redirect to /orders/:orderId/confirmation.
 *  - Guest users: on successful order, call clearCart() from useGuestCartStore
 *    and redirect to /orders/:orderId/confirmation.
 *  - 429 response: show "Too many checkout attempts. Please wait a moment and try again."
 *  - Stock errors (400 with stock-related message): show message directing
 *    customer to update their cart.
 *  - All mutateAsync calls wrapped in try/catch (handled inside CheckoutLayout).
 *
 * Requirements: 7.1, 7.10, 7.11, 7.12
 */
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ShoppingCart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import { useGuestCartStore } from '@/lib/stores/guest-cart-store';
import CheckoutLayout from '@/components/public/checkout/CheckoutLayout';

// ─── Error banner ─────────────────────────────────────────────────────────────

type CheckoutError = 'rate_limit' | 'stock' | 'generic';

interface ErrorBannerProps {
  type: CheckoutError;
  message?: string;
  onDismiss: () => void;
}

function ErrorBanner({ type, message, onDismiss }: ErrorBannerProps) {
  const t = useTranslations('public.checkout');

  const text =
    type === 'rate_limit'
      ? t('errorTooManyAttempts')
      : type === 'stock'
        ? t('errorStockIssue')
        : message || t('errorGeneric');

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">{text}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="shrink-0 text-destructive/70 hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        ×
      </button>
    </div>
  );
}

// ─── Exported content component ───────────────────────────────────────────────

export function CheckoutPageContent() {
  const t = useTranslations('public.checkout');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useCustomerAuthStore();
  const { clearCart: clearGuestCart } = useGuestCartStore();
  const isAuthenticated = !!user;

  // ── Error state ───────────────────────────────────────────────────────────
  const [checkoutError, setCheckoutError] = useState<{
    type: CheckoutError;
    message?: string;
  } | null>(null);

  // ── Order complete handler ────────────────────────────────────────────────
  const handleOrderComplete = useCallback(
    async (orderId: string) => {
      // Clear the cart based on user type
      if (isAuthenticated) {
        // Remove cart data from cache immediately (so navbar shows 0)
        queryClient.setQueryData(publicQueryKeys.cart, null);
        // Also invalidate so next fetch returns fresh empty cart
        queryClient.invalidateQueries({ queryKey: publicQueryKeys.cart });
      } else {
        // Clear the guest cart from localStorage
        clearGuestCart();
      }

      // Redirect to confirmation page
      router.push(`/orders/${orderId}/confirmation`);
    },
    [isAuthenticated, queryClient, clearGuestCart, router],
  );

  // ── Error handlers ────────────────────────────────────────────────────────
  const handleRateLimitError = useCallback(() => {
    setCheckoutError({ type: 'rate_limit' });
  }, []);

  const handleStockError = useCallback(() => {
    setCheckoutError({ type: 'stock' });
  }, []);

  const handleOrderError = useCallback((message: string) => {
    setCheckoutError({ type: 'generic', message });
  }, []);

  const dismissError = useCallback(() => {
    setCheckoutError(null);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Page heading */}
      <div className="mb-8 flex items-center gap-3">
        <ShoppingCart
          className="size-6 shrink-0 text-muted-foreground"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t('title')}
        </h1>
      </div>

      {/* Error banner — shown above the checkout layout */}
      {checkoutError && (
        <div className="mb-6">
          <ErrorBanner
            type={checkoutError.type}
            message={checkoutError.message}
            onDismiss={dismissError}
          />
        </div>
      )}

      {/* Checkout layout */}
      <CheckoutLayout
        onOrderComplete={handleOrderComplete}
        onRateLimitError={handleRateLimitError}
        onStockError={handleStockError}
        onOrderError={handleOrderError}
      />
    </div>
  );
}
