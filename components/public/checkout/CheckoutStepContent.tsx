'use client';

/**
 * CheckoutStepContent — renders the content for checkout steps 1, 3, 4, and 5.
 * Step 2 (AddressSelector) is rendered directly in CheckoutLayout.
 *
 * Requirements: 7.2
 */

import { cn } from '@/lib/utils';
import type { CouponValidationResult, DeliveryMethod } from '@/types/public';
import { AlertCircle, CreditCard, Lock, MapPin, Store, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import CouponInput from './CouponInput';
import OrderSummaryPanel, { type OrderSummaryLineItem } from './OrderSummaryPanel';
import PaymentSelector, { type PaymentMethod } from './PaymentSelector';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CheckoutStepContentProps {
  currentStep: number;
  isAuthenticated: boolean;
  /** Whether the user is a bulk buyer (hides coupon input) */
  isBulkBuyer: boolean;
  /** Current delivery method */
  deliveryMethod: DeliveryMethod;
  /** Whether pickup is enabled in platform config */
  isPickupEnabled: boolean;
  /** Pickup address from config */
  pickupAddress: string;
  /** Pickup instructions from config */
  pickupInstructions: string;
  /** Called when delivery method changes */
  onDeliveryMethodChange: (method: DeliveryMethod) => void;
  /** Guest name (optional) */
  guestName?: string;
  /** Called when guest name changes */
  onGuestNameChange?: (name: string) => void;
  /** Guest phone for pickup orders */
  guestPhone?: string;
  /** Called when guest phone changes */
  onGuestPhoneChange?: (phone: string) => void;
  lineItems: OrderSummaryLineItem[];
  subtotal: number;
  /** Subtotal before tier discounts (for strikethrough display) */
  subtotalBeforeDiscount: number;
  /** Total savings from tier pricing */
  totalSavings: number;
  deliveryFee: number | null;
  discountAmount: number;
  taxAmount: number;
  taxRate: number;
  totalWeight: number | null;
  deliveryWeight: number | null;
  total: number;
  /** Delivery error message (e.g. "Delivery is not available for Bradford.") */
  deliveryError: string | null;
  /** Real saved address ID for authenticated users */
  effectiveAddressId: string | null;
  /** City from the guest-entered address — used for delivery fee calculation */
  guestCity?: string | null;
  /** Guest email for order confirmation */
  guestEmail?: string;
  /** Called when guest email changes */
  onGuestEmailChange?: (email: string) => void;
  paymentMethod: PaymentMethod;
  isPlacingOrder: boolean;
  orderError: string | null;
  onCouponApplied: (result: CouponValidationResult, code: string) => void;
  onCouponRemoved: () => void;
  onDeliveryFeeCalculated: (fee: number) => void;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onPlaceOrder: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CheckoutStepContent({
  currentStep,
  isAuthenticated,
  isBulkBuyer,
  deliveryMethod,
  isPickupEnabled,
  pickupAddress,
  pickupInstructions,
  onDeliveryMethodChange,
  guestName,
  onGuestNameChange,
  guestPhone,
  onGuestPhoneChange,
  lineItems,
  subtotal,
  subtotalBeforeDiscount,
  totalSavings,
  deliveryFee,
  discountAmount,
  taxAmount,
  taxRate,
  totalWeight,
  deliveryWeight,
  total,
  deliveryError,
  effectiveAddressId,
  guestCity,
  guestEmail,
  onGuestEmailChange,
  paymentMethod,
  isPlacingOrder,
  orderError,
  onCouponApplied,
  onCouponRemoved,
  onDeliveryFeeCalculated,
  onPaymentMethodChange,
  onPlaceOrder,
}: CheckoutStepContentProps) {
  const t = useTranslations('public.checkout');

  // ── Step 1: Review Cart ───────────────────────────────────────────────────
  if (currentStep === 1) {
    return (
      <div className="flex flex-col gap-5">
        {/* Delivery method selector — only show if pickup is enabled */}
        {isPickupEnabled && (
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground mb-3">
              {t('deliveryMethodTitle')}
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Delivery option */}
              <label
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors',
                  deliveryMethod === 'delivery'
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:bg-muted/50',
                )}
              >
                <input
                  type="radio"
                  name="delivery-method"
                  value="delivery"
                  checked={deliveryMethod === 'delivery'}
                  onChange={() => onDeliveryMethodChange('delivery')}
                  className="sr-only"
                />
                <span className={cn(
                  'flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  deliveryMethod === 'delivery' ? 'border-primary' : 'border-muted-foreground',
                )}>
                  {deliveryMethod === 'delivery' && <span className="size-2 rounded-full bg-primary" />}
                </span>
                <Truck className="size-5 text-muted-foreground shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium text-foreground">{t('deliveryMethodDelivery')}</span>
              </label>

              {/* Pickup option */}
              <label
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors',
                  deliveryMethod === 'pickup'
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:bg-muted/50',
                )}
              >
                <input
                  type="radio"
                  name="delivery-method"
                  value="pickup"
                  checked={deliveryMethod === 'pickup'}
                  onChange={() => onDeliveryMethodChange('pickup')}
                  className="sr-only"
                />
                <span className={cn(
                  'flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  deliveryMethod === 'pickup' ? 'border-primary' : 'border-muted-foreground',
                )}>
                  {deliveryMethod === 'pickup' && <span className="size-2 rounded-full bg-primary" />}
                </span>
                <Store className="size-5 text-muted-foreground shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium text-foreground">{t('deliveryMethodPickup')}</span>
              </label>
            </div>

            {/* Pickup details — shown when pickup is selected */}
            {deliveryMethod === 'pickup' && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="size-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{t('pickupCollectionPoint')}</p>
                    <p className="text-sm text-muted-foreground">{pickupAddress}</p>
                  </div>
                </div>
                {pickupInstructions && (
                  <p className="text-xs text-muted-foreground ml-6">{pickupInstructions}</p>
                )}
              </div>
            )}
          </fieldset>
        )}

        {!isAuthenticated && (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              {t('guestCheckoutNote')}
            </div>
            {/* Guest name input (optional) */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="guest-name" className="text-sm font-medium text-foreground">
                {t('guestNameLabel')}
              </label>
              <input
                id="guest-name"
                type="text"
                value={guestName ?? ''}
                onChange={(e) => onGuestNameChange?.(e.target.value)}
                placeholder={t('guestNamePlaceholder')}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Guest email input */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="guest-email" className="text-sm font-medium text-foreground">
                {t('guestEmailLabel')}
              </label>
              <input
                id="guest-email"
                type="email"
                value={guestEmail ?? ''}
                onChange={(e) => onGuestEmailChange?.(e.target.value)}
                placeholder={t('guestEmailPlaceholder')}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">{t('guestEmailHint')}</p>
            </div>
            {/* Guest phone — required for pickup */}
            {deliveryMethod === 'pickup' && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="guest-phone" className="text-sm font-medium text-foreground">
                  {t('guestPhoneLabel')}
                </label>
                <input
                  id="guest-phone"
                  type="tel"
                  value={guestPhone ?? ''}
                  onChange={(e) => onGuestPhoneChange?.(e.target.value)}
                  placeholder={t('guestPhonePlaceholder')}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
          </div>
        )}
        {!isBulkBuyer && isAuthenticated && (
          <CouponInput
            cartTotal={subtotal}
            onCouponApplied={onCouponApplied}
            onCouponRemoved={onCouponRemoved}
          />
        )}
        <OrderSummaryPanel
          items={lineItems}
          subtotal={subtotal}
          subtotalBeforeDiscount={subtotalBeforeDiscount}
          totalSavings={totalSavings}
          deliveryFee={null}
          discountAmount={discountAmount}
          taxAmount={taxAmount}
          taxRate={taxRate}
          total={subtotal + taxAmount - discountAmount}
        />
      </div>
    );
  }

  // ── Step 3: Order Summary ───────────────────────────────────────────────
  if (currentStep === 3) {
    return (
      <div className="flex flex-col gap-4">
        {/* Delivery unavailable error */}
        {deliveryError && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
            <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{deliveryError}</p>
          </div>
        )}
        <OrderSummaryPanel
          items={lineItems}
          subtotal={subtotal}
          subtotalBeforeDiscount={subtotalBeforeDiscount}
          totalSavings={totalSavings}
          deliveryFee={deliveryFee}
          discountAmount={discountAmount}
          taxAmount={taxAmount}
          taxRate={taxRate}
          totalWeight={totalWeight}
          deliveryWeight={deliveryWeight}
          total={total}
        />
      </div>
    );
  }

  // ── Step 4: Payment Method ────────────────────────────────────────────────
  if (currentStep === 4) {
    return (
      <PaymentSelector
        value={paymentMethod}
        onChange={onPaymentMethodChange}
        deliveryMethod={deliveryMethod}
        disabled={isPlacingOrder}
      />
    );
  }

  // ── Step 5: Confirm (COD / COP / pre-Stripe) ───────────────────────────────
  if (currentStep === 5) {
    return (
      <div className="flex flex-col gap-5">
        {/* Payment method badge */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            {paymentMethod === 'cod' || paymentMethod === 'cop'
              ? <Truck className="size-5" aria-hidden="true" />
              : <CreditCard className="size-5" aria-hidden="true" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {paymentMethod === 'cod' ? t('payCod') : paymentMethod === 'cop' ? t('payCop') : t('payStripe')}
            </p>
            {paymentMethod === 'cod' && (
              <p className="text-xs text-muted-foreground">{t('codNote')}</p>
            )}
            {paymentMethod === 'cop' && (
              <p className="text-xs text-muted-foreground">{t('copNote')}</p>
            )}
          </div>
        </div>

        <OrderSummaryPanel
          items={lineItems}
          subtotal={subtotal}
          subtotalBeforeDiscount={subtotalBeforeDiscount}
          totalSavings={totalSavings}
          deliveryFee={deliveryFee}
          discountAmount={discountAmount}
          taxAmount={taxAmount}
          taxRate={taxRate}
          totalWeight={totalWeight}
          deliveryWeight={deliveryWeight}
          total={total}
        />

        {/* Place order button */}
        <button
          type="button"
          onClick={onPlaceOrder}
          disabled={isPlacingOrder || !!deliveryError}
          aria-busy={isPlacingOrder}
          className={cn(
            'inline-flex min-h-[44px] w-full items-center justify-center gap-2',
            'rounded-lg bg-primary px-6 py-3',
            'text-sm font-semibold text-primary-foreground',
            'transition-colors hover:bg-primary/90',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
        >
          <Lock className="size-4 shrink-0" aria-hidden="true" />
          {isPlacingOrder ? t('placingOrder') : t('placeOrder')}
        </button>
        <p className="text-center text-xs text-muted-foreground">{t('secureCheckout')}</p>
      </div>
    );
  }

  return null;
}

export default CheckoutStepContent;
