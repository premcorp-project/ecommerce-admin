'use client';

/**
 * AddressSelector — Delivery address selection for the checkout flow.
 *
 * Behaviour:
 * - Authenticated users: fetches saved addresses from GET /users/addresses,
 *   renders them as selectable cards, and shows an "Add new address" option
 *   that reveals AddressForm. Calls onAddressSelect(addressId) on selection.
 * - Guest users: shows only AddressForm for one-time address entry.
 *   Calls onGuestAddress(addressData) when the form is submitted.
 * - Shows skeleton cards while addresses are loading.
 * - All strings localised via t('public.checkout.*').
 * - All colours use semantic tokens only.
 * - Fully responsive.
 *
 * Requirements: 7.4
 */

import { usePublicQuery } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import type { Address } from '@/types/public';
import { CheckCircle2, MapPin, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import AddressForm from './AddressForm';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AddressSelectorProps {
  /** Called when an authenticated user selects a saved address. */
  onAddressSelect: (addressId: string) => void;
  /** Called when a guest submits the one-time address form. */
  onGuestAddress: (addressData: Address) => void;
  /** The currently selected address ID (for authenticated users). */
  selectedAddressId?: string | null;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function AddressCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="size-5 rounded-full bg-muted" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-32 rounded bg-muted" />
        <div className="h-3 w-48 rounded bg-muted" />
        <div className="h-3 w-40 rounded bg-muted" />
      </div>
    </div>
  );
}

// ─── Address Card ─────────────────────────────────────────────────────────────

interface AddressCardProps {
  address: Address;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function AddressCard({ address, isSelected, onSelect }: AddressCardProps) {
  const t = useTranslations('public.checkout');

  return (
    <button
      type="button"
      onClick={() => onSelect(address._id)}
      aria-pressed={isSelected}
      className={[
        'w-full rounded-xl border p-4 text-left transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'min-h-[44px]',
        isSelected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border bg-card hover:border-primary/50 hover:bg-muted/40',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Label + default badge */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {address.label}
          </span>
          {address.isDefault && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {t('addressDefault')}
            </span>
          )}
        </div>

        {/* Selection indicator */}
        {isSelected ? (
          <CheckCircle2
            className="mt-0.5 size-5 shrink-0 text-primary"
            aria-hidden="true"
          />
        ) : (
          <div
            className="mt-0.5 size-5 shrink-0 rounded-full border-2 border-border"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Address details */}
      <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">{address.fullName}</p>
        <p>{address.phone}</p>
        <p>
          {address.line1}
          {address.line2 ? `, ${address.line2}` : ''}
        </p>
        <p>
          {address.city}{address.county ? `, ${address.county}` : ''} {address.postcode}
        </p>
        <p>{address.country}</p>
      </div>
    </button>
  );
}

// ─── Authenticated view ───────────────────────────────────────────────────────

interface AuthenticatedSelectorProps {
  selectedAddressId?: string | null;
  onAddressSelect: (addressId: string) => void;
}

function AuthenticatedSelector({
  selectedAddressId,
  onAddressSelect,
}: AuthenticatedSelectorProps) {
  const t = useTranslations('public.checkout');
  const tCommon = useTranslations('public.common');
  const [showAddForm, setShowAddForm] = useState(false);

  const { data, isLoading, isError, refetch } = usePublicQuery<{
    data: Address[];
  }>(publicQueryKeys.addresses, '/users/addresses');

  // Unwrap backend envelope: { success, data: { addresses: [...] } } or { success, data: [...] }
  const addresses: Address[] =
    (data as any)?.data?.addresses ??
    (Array.isArray((data as any)?.data) ? (data as any).data : null) ??
    [];

  // Auto-select default address if none is selected yet
  const defaultAddress = addresses.find((a) => a.isDefault);
  if (addresses.length > 0 && !selectedAddressId && defaultAddress) {
    // Defer to avoid setState during render
    setTimeout(() => onAddressSelect(defaultAddress._id), 0);
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-3">
        <AddressCardSkeleton />
        <AddressCardSkeleton />
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
        <p className="text-sm text-destructive">{t('errorGeneric')}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-2 text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {tCommon('errorRetry')}
        </button>
      </div>
    );
  }

  // ── Handle new address saved ──────────────────────────────────────────────
  const handleNewAddressSaved = (savedAddress: Address) => {
    setShowAddForm(false);
    // Auto-select the newly saved address
    onAddressSelect(savedAddress._id);
    // Refetch to update the list
    refetch();
  };

  return (
    <div className="space-y-4">
      {/* Saved address cards */}
      {addresses.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard
              key={address._id}
              address={address}
              isSelected={selectedAddressId === address._id}
              onSelect={onAddressSelect}
            />
          ))}
        </div>
      )}

      {/* Add new address toggle */}
      {!showAddForm ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className={[
            'flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed',
            'border-border bg-transparent px-4 py-4 text-sm font-medium text-muted-foreground',
            'transition-colors hover:border-primary/50 hover:text-primary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'min-h-[44px]',
          ].join(' ')}
        >
          <Plus className="size-4" aria-hidden="true" />
          {t('addNewAddress')}
        </button>
      ) : (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="size-4 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground">
              {t('addNewAddress')}
            </h3>
          </div>
          <AddressForm
            onSuccess={handleNewAddressSaved}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Guest view ───────────────────────────────────────────────────────────────

interface GuestSelectorProps {
  onGuestAddress: (addressData: Address) => void;
}

function GuestSelector({ onGuestAddress }: GuestSelectorProps) {
  const t = useTranslations('public.checkout');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MapPin className="size-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">
          {t('deliveryAddress')}
        </h3>
      </div>
      <AddressForm
        onSuccess={onGuestAddress}
        submitLabel={t('continueToDelivery')}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AddressSelector({
  onAddressSelect,
  onGuestAddress,
  selectedAddressId,
}: AddressSelectorProps) {
  const { user } = useCustomerAuthStore();
  const isAuthenticated = user !== null;

  if (isAuthenticated) {
    return (
      <AuthenticatedSelector
        selectedAddressId={selectedAddressId}
        onAddressSelect={onAddressSelect}
      />
    );
  }

  return <GuestSelector onGuestAddress={onGuestAddress} />;
}

export default AddressSelector;
