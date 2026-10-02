'use client';

/**
 * CheckoutLayout — 5-step checkout flow orchestrator.
 *
 * Steps:
 *  1. Review Cart    — CouponInput + OrderSummaryPanel (cart items)
 *  2. Delivery Address — AddressSelector
 *  3. Order Summary  — DeliveryFeeDisplay + OrderSummaryPanel
 *  4. Payment Method — PaymentSelector
 *  5. Confirm        — Final summary + Place Order (COD) or Stripe Elements
 *
 * Step indicator:
 *  - Mobile: compact <progress> bar + "Step N of 5: Label"
 *  - Desktop: full horizontal step list with numbers, labels,
 *    and completed / active / upcoming visual states
 *
 * Requirements: 7.2, 14.6
 */

import { useConfig } from '@/hooks/use-config';
import { usePublicMutation, usePublicQuery } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import { useCheckoutPreview } from '@/lib/api/useCheckoutPreview';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import { useGuestCartStore } from '@/lib/stores/guest-cart-store';
import { cn } from '@/lib/utils';
import type { Address, Cart, CouponValidationResult, DeliveryMethod } from '@/types/public';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import AddressSelector from './AddressSelector';
import CheckoutStepContent from './CheckoutStepContent';
import CheckoutStepIndicator from './CheckoutStepIndicator';
import { cartItemsToLineItems } from './OrderSummaryPanel';
import type { PaymentMethod } from './PaymentSelector';
import StripePaymentForm from './StripePaymentForm';

// ─── Stripe ───────────────────────────────────────────────────────────────────

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CheckoutLayoutProps {
  /** Called after a successful order is placed. The page handles cart clearing + redirect. */
  onOrderComplete: (orderId: string) => void;
  /** Optional: called when a 429 rate-limit error occurs. */
  onRateLimitError?: () => void;
  /** Optional: called when a stock error (400) occurs. */
  onStockError?: () => void;
  /** Optional: called when any other order error occurs. */
  onOrderError?: (message: string) => void;
}

interface DeliveryAddressPayload {
  fullName?: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
}

interface OrderItem {
  productId: string;
  variantId: string;
  quantity: number;
}

interface CreateOrderPayload {
  deliveryMethod: DeliveryMethod;
  paymentMethod: 'stripe' | 'cod' | 'cop';
  couponCode?: string;
  // Auth user fields
  addressId?: string;
  // Guest user fields
  deliveryAddress?: DeliveryAddressPayload;
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;
  items?: OrderItem[];
}

interface CreateOrderApiResponse {
  data: {
    orderId: string;
    orderNumber: string;
    paymentIntent: { clientSecret: string; amount: number; currency: string } | null;
    total: number;
    deliveryFee: number;
    discountAmount: number;
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CheckoutLayout({ onOrderComplete, onRateLimitError, onStockError, onOrderError }: CheckoutLayoutProps) {
  const t = useTranslations('public.checkout');
  const { user } = useCustomerAuthStore();
  const isAuthenticated = !!user;
  const { items: guestItems } = useGuestCartStore();
  const { isPickupEnabled, pickupAddress, pickupInstructions } = useConfig();

  // ── Hydration guard — prevent SSR/client mismatch ─────────────────────────
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ── Step state ────────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);

  // ── Checkout state ────────────────────────────────────────────────────────
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('delivery');
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [guestAddress, setGuestAddress] = useState<Address | null>(null);
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('stripe');
  const [orderError, setOrderError] = useState<string | null>(null);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripeOrderId, setStripeOrderId] = useState<string | null>(null);

  // ── Order creation mutation ───────────────────────────────────────────────
  const { mutateAsync: createOrder, isPending: isPlacingOrder } =
    usePublicMutation<CreateOrderApiResponse, CreateOrderPayload>('post', '/orders/checkout');

  // ── Checkout preview (server-calculated pricing) ───────────────────────────
  const { preview, isLoading: isPreviewLoading, error: previewError, loadPreview } = useCheckoutPreview();

  // ── Server cart (authenticated users) — needed for item count in navbar ──
  const { data: cartData } = usePublicQuery<Cart>(
    publicQueryKeys.cart,
    '/orders/cart',
    { enabled: isAuthenticated },
  );

  const serverCart: Cart | null = (() => {
    const rawD = (cartData as any)?.data;
    return rawD?.cart ?? rawD ?? null;
  })();

  // ── Computed cart values from preview ─────────────────────────────────────
  const lineItems = useMemo(() => {
    if (preview?.items) {
      return preview.items.map((item) => ({
        id: `${item.product._id}-${item.variant._id}`,
        productName: item.product.name,
        productImage: item.product.image ?? null,
        variantAttributes: item.variant.attributes,
        variantSku: item.variant.sku,
        variantWeight: item.variant.weight ?? null,
        variantFreeDelivery: item.variant.freeDelivery ?? false,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        basePrice: item.basePrice,
        pricingType: item.pricingType,
        savings: item.savings,
      }));
    }
    // Fallback to local calculation if preview hasn't loaded yet
    if (isAuthenticated && serverCart) return cartItemsToLineItems(serverCart.items);
    // For guests, return empty until preview loads (avoids hydration mismatch with localStorage)
    return [];
  }, [preview, isAuthenticated, serverCart, guestItems]);

  const subtotal = preview?.subtotal ?? lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const subtotalBeforeDiscount = preview?.subtotalBeforeDiscount ?? subtotal;
  const totalSavings = preview?.totalSavings ?? 0;
  const discountAmount = preview?.discount ?? couponResult?.discount ?? couponResult?.discountAmount ?? 0;
  const deliveryFeeValue = deliveryMethod === 'pickup' ? 0 : (preview?.deliveryFee ?? deliveryFee ?? null);
  const taxAmount = preview?.taxAmount ?? 0;
  const taxRate = preview?.taxRate ?? 0;
  const totalWeight = preview?.totalWeight ?? null;
  const deliveryWeightValue = preview?.deliveryWeight ?? null;
  const total = preview?.total ?? Math.max(0, subtotal + (deliveryFeeValue ?? 0) - discountAmount);
  const effectiveAddressId = selectedAddressId ?? guestAddress?._id ?? null;

  // ── Step labels ───────────────────────────────────────────────────────────
  const stepLabels = deliveryMethod === 'pickup'
    ? [
        t('stepReviewCart'),
        t('stepOrderSummary'),
        t('stepPaymentMethod'),
        t('stepConfirm'),
      ]
    : [
        t('stepReviewCart'),
        t('stepDeliveryAddress'),
        t('stepOrderSummary'),
        t('stepPaymentMethod'),
        t('stepConfirm'),
      ];

  const totalSteps = stepLabels.length;

  // ── Preview reload handlers ────────────────────────────────────────────────
  const handleAddressSelect = (addressId: string | null) => {
    setSelectedAddressId(addressId);
    if (addressId) {
      loadPreview({ addressId, couponCode: couponCode ?? undefined, deliveryMethod });
    }
  };

  const handleGuestAddress = (address: Address | null) => {
    setGuestAddress(address);
    if (address?.city) {
      loadPreview({ city: address.city, deliveryMethod });
    }
  };

  const handleCouponApplied = (result: CouponValidationResult, code: string) => {
    setCouponResult(result);
    setCouponCode(code);
    loadPreview({ addressId: selectedAddressId ?? undefined, couponCode: code, deliveryMethod });
  };

  const handleCouponRemoved = () => {
    setCouponResult(null);
    setCouponCode(null);
    loadPreview({ addressId: selectedAddressId ?? undefined, deliveryMethod });
  };

  const handleDeliveryMethodChange = (method: DeliveryMethod) => {
    setDeliveryMethod(method);
    // Reset payment method when switching — cod/cop are delivery-method-specific
    setPaymentMethod('stripe');
    // Reload preview with new delivery method
    if (method === 'pickup') {
      loadPreview({ deliveryMethod: 'pickup', couponCode: couponCode ?? undefined });
    } else if (selectedAddressId) {
      loadPreview({ addressId: selectedAddressId, couponCode: couponCode ?? undefined, deliveryMethod: 'delivery' });
    }
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const canGoNext = () => {
    // Step 1: guests must provide email (and phone for pickup)
    if (currentStep === 1) {
      if (!isAuthenticated && !guestEmail.trim()) return false;
      if (!isAuthenticated && deliveryMethod === 'pickup' && !guestPhone.trim()) return false;
    }
    // Step 2 (delivery only): must have an address
    if (deliveryMethod === 'delivery' && currentStep === 2) {
      return isAuthenticated ? !!selectedAddressId : !!guestAddress;
    }
    return true;
  };

  const goNext = () => {
    if (!canGoNext()) { toast.error(t('addressRequired')); return; }
    if (currentStep < totalSteps) setCurrentStep((s) => s + 1);
  };

  const goBack = () => {
    setOrderError(null);
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  // ── Place order ───────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    setOrderError(null);
    try {
      const payload: CreateOrderPayload = {
        deliveryMethod,
        paymentMethod,
        ...(couponCode ? { couponCode } : {}),
      };

      if (deliveryMethod === 'pickup') {
        // Pickup — no address needed
        if (!isAuthenticated) {
          if (guestEmail.trim()) payload.guestEmail = guestEmail.trim();
          if (guestName.trim()) payload.guestName = guestName.trim();
          if (guestPhone.trim()) payload.guestPhone = guestPhone.trim();
          payload.items = guestItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          }));
        }
      } else if (isAuthenticated && selectedAddressId) {
        // Auth user — delivery with saved address
        payload.addressId = selectedAddressId;
      } else if (guestAddress) {
        // Guest user — delivery with entered address
        payload.deliveryAddress = {
          fullName: guestAddress.fullName,
          phone: guestAddress.phone,
          line1: guestAddress.line1,
          line2: guestAddress.line2,
          city: guestAddress.city,
          county: guestAddress.county,
          postcode: guestAddress.postcode,
          country: guestAddress.country,
        };
        if (guestEmail.trim()) payload.guestEmail = guestEmail.trim();
        if (guestName.trim()) payload.guestName = guestName.trim();
        payload.items = guestItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        }));
      }

      const response = await createOrder(payload);
      const rawData = (response as any)?.data ?? response;
      const order = rawData?.order ?? rawData;
      const orderId = order?.orderId ?? order?._id;
      const clientSecret = rawData?.clientSecret ?? order?.clientSecret ?? null;

      if (!orderId) throw new Error('No order data returned');

      if (paymentMethod === 'cod' || paymentMethod === 'cop') {
        onOrderComplete(orderId);
      } else if (clientSecret) {
        setStripeClientSecret(clientSecret);
        setStripeOrderId(orderId);
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
      const status = axiosError?.response?.status;
      const message = axiosError?.response?.data?.message ?? '';
      if (status === 429) {
        setOrderError(t('errorTooManyAttempts'));
        onRateLimitError?.();
      } else if (status === 400 && /delivery.*not available|not.*deliver/i.test(message)) {
        // Delivery unavailable (strict mode, city not served)
        setOrderError(message);
        onOrderError?.(message);
      } else if (status === 400 && /stock|inventory|out of stock|insufficient/i.test(message)) {
        setOrderError(t('errorStockIssue'));
        onStockError?.();
      } else {
        const errorMsg = message || t('errorGeneric');
        setOrderError(errorMsg);
        onOrderError?.(errorMsg);
      }
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // Determine step logic based on delivery method
  const isConfirmStep = currentStep === totalSteps;
  const isAddressStep = deliveryMethod === 'delivery' && currentStep === 2;

  // On confirm step with Stripe clientSecret, show the Stripe Elements form
  const showStripeForm = isConfirmStep && !!stripeClientSecret && !!stripeOrderId;
  // Hide nav buttons on confirm step (step has its own CTA)
  const showNavButtons = !isConfirmStep;

  if (!mounted) {
    return (
      <div className="flex flex-col gap-0 animate-pulse">
        <div className="h-12 bg-muted rounded-lg mb-5" />
        <div className="h-6 w-48 bg-muted rounded mb-5" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  // Map currentStep to the logical content step for CheckoutStepContent
  // CheckoutStepContent always uses: 1=Cart, 3=Summary, 4=Payment, 5=Confirm
  const getContentStep = (): number => {
    if (deliveryMethod === 'pickup') {
      // Pickup: 1=Cart, 2=Summary, 3=Payment, 4=Confirm
      const map: Record<number, number> = { 1: 1, 2: 3, 3: 4, 4: 5 };
      return map[currentStep] ?? currentStep;
    }
    // Delivery: 1=Cart, 2=Address, 3=Summary, 4=Payment, 5=Confirm
    return currentStep;
  };

  const contentStep = getContentStep();

  return (
    <div className="flex flex-col gap-0">
      <CheckoutStepIndicator
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepLabels={stepLabels}
      />

      <h2 className="mb-5 text-lg font-semibold text-foreground">
        {stepLabels[currentStep - 1]}
      </h2>

      <div className="min-h-[200px]">
        {showStripeForm ? (
          <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret! }}>
            <StripePaymentForm orderId={stripeOrderId!} onSuccess={onOrderComplete} />
          </Elements>
        ) : isAddressStep ? (
          <AddressSelector
            selectedAddressId={selectedAddressId}
            onAddressSelect={handleAddressSelect}
            onGuestAddress={handleGuestAddress}
          />
        ) : (
          <CheckoutStepContent
            currentStep={contentStep}
            isAuthenticated={isAuthenticated}
            isBulkBuyer={user?.hasBulkAccess ?? false}
            deliveryMethod={deliveryMethod}
            isPickupEnabled={isPickupEnabled}
            pickupAddress={pickupAddress}
            pickupInstructions={pickupInstructions}
            onDeliveryMethodChange={handleDeliveryMethodChange}
            guestName={guestName}
            onGuestNameChange={setGuestName}
            guestPhone={guestPhone}
            onGuestPhoneChange={setGuestPhone}
            lineItems={lineItems}
            subtotal={subtotal}
            subtotalBeforeDiscount={subtotalBeforeDiscount}
            totalSavings={totalSavings}
            deliveryFee={deliveryFeeValue}
            discountAmount={discountAmount}
            taxAmount={taxAmount}
            taxRate={taxRate}
            totalWeight={totalWeight}
            deliveryWeight={deliveryWeightValue}
            total={total}
            deliveryError={previewError}
            effectiveAddressId={effectiveAddressId}
            guestCity={guestAddress?.city ?? null}
            guestEmail={guestEmail}
            onGuestEmailChange={setGuestEmail}
            paymentMethod={paymentMethod}
            isPlacingOrder={isPlacingOrder}
            orderError={orderError}
            onCouponApplied={handleCouponApplied}
            onCouponRemoved={handleCouponRemoved}
            onDeliveryFeeCalculated={setDeliveryFee}
            onPaymentMethodChange={setPaymentMethod}
            onPlaceOrder={handlePlaceOrder}
          />
        )}
      </div>

      {showNavButtons && (
        <div className={cn('mt-6 flex items-center gap-4', currentStep > 1 ? 'justify-between' : 'justify-end')}>
          {currentStep > 1 && (
            <button
              type="button"
              onClick={goBack}
              disabled={isPlacingOrder}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              {t('backToCart')}
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            {t('confirmOrder')}
          </button>
        </div>
      )}
    </div>
  );
}

export default CheckoutLayout;
