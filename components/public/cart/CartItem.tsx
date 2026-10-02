'use client';

/**
 * CartItem — renders a single line item in the cart drawer and cart page.
 *
 * Layout:
 *  - Row: Image (left) | Name + Attributes + Price + Qty/Remove (right)
 *  - Compact, no card borders — uses dividers between items
 *
 * Requirements: 6.3, 6.4, 6.5, 15.2, 15.3, 15.4
 */

import { CurrencyDisplay } from '@/components/public/common/CurrencyDisplay';
import { Trash2Icon } from '@/components/ui/animated-icons/trash-2-icon';
import publicApi from '@/lib/api/public-api';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import { useGuestCartStore } from '@/lib/stores/guest-cart-store';
import { cn } from '@/lib/utils';
import type { Cart, CartItem as CartItemType, GuestCartItem } from '@/types/public';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Minus, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CartItemAuthProps {
  item: CartItemType;
  isGuest?: false;
}

export interface CartItemGuestProps {
  item: GuestCartItem;
  isGuest: true;
}

export type CartItemProps = (CartItemAuthProps | CartItemGuestProps) & {
  className?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEffectivePrice(price: number, discountedPrice: number | null): number {
  return discountedPrice ?? price;
}

// ─── Inline Quantity Stepper (compact for drawer) ─────────────────────────────

function CompactStepper({
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-muted/50">
      <button
        type="button"
        onClick={() => value > min && onChange(value - 1)}
        disabled={disabled || value <= min}
        className="flex items-center justify-center size-7 rounded-lg text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Decrease quantity"
      >
        <Minus className="size-3" />
      </button>
      <span className="w-7 text-center text-xs font-semibold tabular-nums text-foreground">
        {value}
      </span>
      <button
        type="button"
        onClick={() => value < max && onChange(value + 1)}
        disabled={disabled || value >= max}
        className="flex items-center justify-center size-7 rounded-lg text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Increase quantity"
      >
        <Plus className="size-3" />
      </button>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CartItem({ className, ...props }: CartItemProps) {
  const t = useTranslations('public.cart');

  if (props.isGuest) {
    return <GuestCartItemRow item={props.item} t={t} className={className} />;
  }

  return <AuthCartItemRow item={props.item} t={t} className={className} />;
}

// ─── Authenticated item row ───────────────────────────────────────────────────

interface AuthCartItemRowProps {
  item: CartItemType;
  t: ReturnType<typeof useTranslations<'public.cart'>>;
  className?: string;
}

function AuthCartItemRow({ item, t, className }: AuthCartItemRowProps) {
  const queryClient = useQueryClient();
  const user = useCustomerAuthStore((s) => s.user);
  const isBulkBuyer = user?.hasBulkAccess ?? false;
  const effectivePrice = getEffectivePrice(item.variant.price, item.variant.discountedPrice);
  const lineTotal = effectivePrice * item.quantity;
  const productImage = item.product.images[0]?.url ?? null;

  // Determine effective max quantity based on user type and variant limits
  const maxQuantity = (() => {
    if (isBulkBuyer) {
      const limit = item.variant.maxOrderQtyBulk ?? item.variant.maxOrderQty;
      if (limit) return Math.min(limit, item.variant.inventory > 0 ? item.variant.inventory : 99);
      return item.variant.inventory > 0 ? item.variant.inventory : 99;
    }
    const limit = item.variant.maxOrderQty;
    if (limit) return Math.min(limit, item.variant.inventory > 0 ? item.variant.inventory : 99);
    return item.variant.inventory > 0 ? item.variant.inventory : 99;
  })();

  const updateMutation = useMutation({
    mutationFn: (newQty: number) =>
      publicApi.put(`/orders/cart/${item._id}`, { quantity: newQty }),
    onMutate: async (newQty: number) => {
      await queryClient.cancelQueries({ queryKey: publicQueryKeys.cart });
      const previousCart = queryClient.getQueryData<Cart>(publicQueryKeys.cart);
      queryClient.setQueryData(publicQueryKeys.cart, (old: any) => {
        if (!old) return old;
        const cart = old?.data?.cart ?? old?.data ?? old;
        const updatedItems = (cart?.items ?? []).map((i: any) =>
          i._id === item._id ? { ...i, quantity: newQty } : i,
        );
        if (old?.data?.cart) return { ...old, data: { ...old.data, cart: { ...old.data.cart, items: updatedItems } } };
        if (old?.data?.items) return { ...old, data: { ...old.data, items: updatedItems } };
        return { ...old, items: updatedItems };
      });
      return { previousCart };
    },
    onError: (err, _newQty, context) => {
      queryClient.setQueryData(publicQueryKeys.cart, context?.previousCart);
      const message = (err as any)?.response?.data?.message;
      toast.error(message || t('updateError'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: publicQueryKeys.cart });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => publicApi.delete(`/orders/cart/${item._id}`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: publicQueryKeys.cart });
      const previousCart = queryClient.getQueryData<Cart>(publicQueryKeys.cart);
      queryClient.setQueryData(publicQueryKeys.cart, (old: any) => {
        if (!old) return old;
        const cart = old?.data?.cart ?? old?.data ?? old;
        const updatedItems = (cart?.items ?? []).filter((i: any) => i._id !== item._id);
        const newCount = updatedItems.reduce((sum: number, i: any) => sum + i.quantity, 0);
        if (old?.data?.cart) return { ...old, data: { ...old.data, cart: { ...old.data.cart, items: updatedItems, itemCount: newCount } } };
        if (old?.data?.items) return { ...old, data: { ...old.data, items: updatedItems, itemCount: newCount } };
        return { ...old, items: updatedItems, itemCount: newCount };
      });
      return { previousCart };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(publicQueryKeys.cart, context?.previousCart);
      toast.error(t('removeError'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: publicQueryKeys.cart });
    },
  });

  const isMutating = updateMutation.isPending || removeMutation.isPending;

  const handleQuantityChange = async (newQty: number) => {
    if (isMutating) return;
    try { await updateMutation.mutateAsync(newQty); } catch { /* handled */ }
  };

  const handleRemove = async () => {
    if (isMutating) return;
    try { await removeMutation.mutateAsync(); } catch { /* handled */ }
  };

  return (
    <article
      className={cn(
        'flex gap-3 py-4 transition-opacity',
        isMutating && 'opacity-50',
        className,
      )}
      aria-label={item.product.name}
    >
      {/* Image */}
      <Link
        href={`/products/${item.product.slug}`}
        className="shrink-0 size-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center"
        tabIndex={-1}
      >
        {productImage ? (
          <Image
            src={productImage}
            alt={item.product.name}
            width={64}
            height={64}
            className="size-full object-contain p-1"
          />
        ) : (
          <span className="text-[10px] text-muted-foreground">{t('noImage')}</span>
        )}
      </Link>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        {/* Top: name + price */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/products/${item.product.slug}`}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
            >
              {item.product.name}
            </Link>
            {item.variant.attributes.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.variant.attributes.map((a) => a.value).join(' / ')}
              </p>
            )}
          </div>
          <CurrencyDisplay
            amount={lineTotal}
            className="text-sm font-semibold text-foreground tabular-nums shrink-0"
          />
        </div>

        {/* Bottom: stepper + remove */}
        <div className="flex items-center justify-between mt-2">
          <CompactStepper
            value={item.quantity}
            min={1}
            max={maxQuantity}
            onChange={handleQuantityChange}
            disabled={isMutating}
          />
          <button
            type="button"
            onClick={handleRemove}
            disabled={isMutating}
            aria-label={t('removeAriaLabel', { name: item.product.name })}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            {isMutating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2Icon size={14} className="text-current" />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── Guest item row ───────────────────────────────────────────────────────────

interface GuestCartItemRowProps {
  item: GuestCartItem;
  t: ReturnType<typeof useTranslations<'public.cart'>>;
  className?: string;
}

function GuestCartItemRow({ item, t, className }: GuestCartItemRowProps) {
  const guestCart = useGuestCartStore();
  const effectivePrice = getEffectivePrice(item.variantPrice, item.variantDiscountedPrice);
  const lineTotal = effectivePrice * item.quantity;

  const handleQuantityChange = (newQty: number) => {
    guestCart.updateItem(item.variantId, newQty);
  };

  const handleRemove = () => {
    guestCart.removeItem(item.variantId);
    toast.success(t('itemRemoved'));
  };

  return (
    <article
      className={cn('flex gap-3 py-4', className)}
      aria-label={item.productName}
    >
      {/* Image */}
      <Link
        href={`/products/${item.productSlug}`}
        className="shrink-0 size-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center"
        tabIndex={-1}
      >
        {item.productImage ? (
          <Image
            src={item.productImage}
            alt={item.productName}
            width={64}
            height={64}
            className="size-full object-contain p-1"
          />
        ) : (
          <span className="text-[10px] text-muted-foreground">{t('noImage')}</span>
        )}
      </Link>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        {/* Top: name + price */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/products/${item.productSlug}`}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
            >
              {item.productName}
            </Link>
            {item.variantAttributes.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.variantAttributes.map((a) => a.value).join(' / ')}
              </p>
            )}
          </div>
          <CurrencyDisplay
            amount={lineTotal}
            className="text-sm font-semibold text-foreground tabular-nums shrink-0"
          />
        </div>

        {/* Bottom: stepper + remove */}
        <div className="flex items-center justify-between mt-2">
          <CompactStepper
            value={item.quantity}
            min={1}
            max={99}
            onChange={handleQuantityChange}
          />
          <button
            type="button"
            onClick={handleRemove}
            aria-label={t('removeAriaLabel', { name: item.productName })}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2Icon size={14} className="text-current" />
          </button>
        </div>
      </div>
    </article>
  );
}

export default CartItem;
