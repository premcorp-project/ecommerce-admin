'use client';

/**
 * AddressBook — lists all saved addresses and provides add / edit / delete /
 * set-default actions.
 *
 * - Fetches GET /users/addresses via usePublicQuery
 * - Add via AddressForm (calls POST /users/addresses)
 * - Edit via AddressForm with a PUT /users/addresses/:id override
 * - Delete via DELETE /users/addresses/:id with AppAlertDialog confirmation
 * - Set default via PUT /users/addresses/:id/default
 * - Invalidates ['public', 'addresses'] after every mutation
 * - Skeleton while loading; EmptyState when no addresses
 * - All strings via t('public.account.*')
 * - Semantic tokens only — no hardcoded colours
 *
 * Requirements: 9.5
 */

import { AddressForm, type AddressFormValues } from '@/components/public/checkout/AddressForm';
import { EmptyState } from '@/components/public/common/EmptyState';
import { AppAlertDialog } from '@/components/shared/AppAlertDialog';
import { LocationSelect } from '@/components/shared/LocationSelect';
import { useDeliveryCities, useDeliveryCountries } from '@/hooks/use-delivery-locations';
import { usePublicMutation, usePublicQuery } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import type { Address } from '@/types/public';
import { useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import * as Yup from 'yup';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AddressesResponse {
  data: Address[];
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function AddressBookSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading addresses">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-6 w-16 rounded-full bg-muted" />
          </div>
          <div className="h-3 w-48 rounded bg-muted" />
          <div className="h-3 w-40 rounded bg-muted" />
          <div className="h-3 w-32 rounded bg-muted" />
          <div className="flex gap-2 pt-1">
            <div className="h-8 w-20 rounded-lg bg-muted" />
            <div className="h-8 w-20 rounded-lg bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── AddressCard ──────────────────────────────────────────────────────────────

interface AddressCardProps {
  address: Address;
  onEdit: (address: Address) => void;
  onDelete: (address: Address) => void;
  onSetDefault: (addressId: string) => void;
  isSettingDefault: boolean;
  isDeleting: boolean;
}

function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isSettingDefault,
  isDeleting,
}: AddressCardProps) {
  const t = useTranslations('public.account');
  const tCommon = useTranslations('public.common');

  return (
    <div
      className={[
        'relative rounded-xl border bg-card p-5 transition-shadow',
        address.isDefault
          ? 'border-primary/40 shadow-sm'
          : 'border-border hover:shadow-sm',
      ].join(' ')}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-primary shrink-0" aria-hidden="true" />
          <span className="text-sm font-semibold text-foreground">
            {address.label}
          </span>
        </div>

        {address.isDefault && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            <Star className="size-3" aria-hidden="true" />
            {t('defaultBadge')}
          </span>
        )}
      </div>

      {/* ── Address lines ────────────────────────────────────────────────── */}
      <div className="space-y-0.5 text-sm text-muted-foreground mb-4">
        <p className="font-medium text-foreground">{address.fullName}</p>
        <p>{address.phone}</p>
        <p>{address.line1}</p>
        {address.line2 && <p>{address.line2}</p>}
        <p>
          {address.city}{address.county ? `, ${address.county}` : ''} {address.postcode}
        </p>
        <p>{address.country}</p>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Set Default — only shown when not already default */}
        {!address.isDefault && (
          <button
            type="button"
            onClick={() => onSetDefault(address._id)}
            disabled={isSettingDefault || isDeleting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[36px]"
          >
            <Star className="size-3" aria-hidden="true" />
            {isSettingDefault ? tCommon('loading') : t('setDefault')}
          </button>
        )}

        {/* Edit */}
        <button
          type="button"
          onClick={() => onEdit(address)}
          disabled={isDeleting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[36px]"
        >
          <Pencil className="size-3" aria-hidden="true" />
          {tCommon('edit')}
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={() => onDelete(address)}
          disabled={isDeleting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-background px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[36px]"
        >
          <Trash2 className="size-3" aria-hidden="true" />
          {isDeleting ? tCommon('loading') : tCommon('delete')}
        </button>
      </div>
    </div>
  );
}

// ─── AddressBook ──────────────────────────────────────────────────────────────

type FormMode = 'add' | 'edit' | null;

export function AddressBook() {
  const t = useTranslations('public.account');
  const tCommon = useTranslations('public.common');
  const queryClient = useQueryClient();

  // ── UI state ───────────────────────────────────────────────────────────────
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingAddress, setDeletingAddress] = useState<Address | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Fetch addresses ────────────────────────────────────────────────────────
  const { data: raw, isLoading, isError } = usePublicQuery<AddressesResponse>(
    publicQueryKeys.addresses,
    '/users/addresses',
  );

  // Unwrap backend envelope: { success, data: { addresses: [...] } } or { success, data: [...] }
  const addresses: Address[] =
    (raw as any)?.data?.addresses ??
    (Array.isArray((raw as any)?.data) ? (raw as any).data : null) ??
    [];

  // ── Delete mutation ────────────────────────────────────────────────────────
  const deleteMutation = usePublicMutation<unknown, { id: string }>(
    'delete',
    (vars) => `/users/addresses/${vars.id}`,
  );

  // ── Set-default mutation ───────────────────────────────────────────────────
  const setDefaultMutation = usePublicMutation<unknown, { id: string }>(
    'put',
    (vars) => `/users/addresses/${vars.id}/default`,
  );

  // ── Edit mutation (PUT /users/addresses/:id) ───────────────────────────────
  const editMutation = usePublicMutation<Address, AddressFormValues & { _id: string }>(
    'put',
    (vars) => `/users/addresses/${vars._id}`,
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setFormMode('edit');
  };

  const handleAddNew = () => {
    setEditingAddress(null);
    setFormMode('add');
  };

  const handleFormCancel = () => {
    setFormMode(null);
    setEditingAddress(null);
  };

  /**
   * Called by AddressForm after a successful POST (add mode).
   * In add mode, AddressForm already called POST /users/addresses — just invalidate.
   */
  const handleAddSuccess = async (_savedAddress: Address) => {
    await queryClient.invalidateQueries({ queryKey: publicQueryKeys.addresses });
    setFormMode(null);
    setEditingAddress(null);
  };

  /**
   * Called when the edit form is submitted.
   * Calls PUT /users/addresses/:id directly (bypasses AddressForm's POST).
   */
  const handleEditSubmit = async (values: AddressFormValues) => {
    if (!editingAddress) return;
    try {
      await editMutation.mutateAsync({ ...values, _id: editingAddress._id });
      await queryClient.invalidateQueries({ queryKey: publicQueryKeys.addresses });
      toast.success(t('addressSaved'));
      setFormMode(null);
      setEditingAddress(null);
    } catch (err: unknown) {
      const apiError = err as {
        response?: { status?: number; data?: { errors?: Record<string, string> } };
      };
      // Re-throw so AddressForm can map 422 errors to fields
      if (apiError?.response?.status === 422) {
        throw err;
      }
      toast.error(t('addressError'));
    }
  };

  const handleDeleteRequest = (address: Address) => {
    setDeletingAddress(address);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAddress) return;
    setDeletingId(deletingAddress._id);
    try {
      await deleteMutation.mutateAsync({ id: deletingAddress._id });
      await queryClient.invalidateQueries({ queryKey: publicQueryKeys.addresses });
      toast.success(t('addressDeleted'));
    } catch {
      toast.error(t('addressError'));
    } finally {
      setDeletingId(null);
      setDeletingAddress(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingAddress(null);
  };

  const handleSetDefault = async (addressId: string) => {
    setSettingDefaultId(addressId);
    try {
      await setDefaultMutation.mutateAsync({ id: addressId });
      await queryClient.invalidateQueries({ queryKey: publicQueryKeys.addresses });
      toast.success(t('addressSaved'));
    } catch {
      toast.error(t('addressError'));
    } finally {
      setSettingDefaultId(null);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <section aria-labelledby="address-book-heading">
        <div className="flex items-center justify-between mb-6">
          <h2
            id="address-book-heading"
            className="text-xl font-semibold text-foreground"
          >
            {t('addressesTitle')}
          </h2>
        </div>
        <AddressBookSkeleton />
      </section>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <section aria-labelledby="address-book-heading">
        <h2
          id="address-book-heading"
          className="text-xl font-semibold text-foreground mb-6"
        >
          {t('addressesTitle')}
        </h2>
        <EmptyState
          icon={<MapPin className="size-8" />}
          title={t('addressError')}
          description={tCommon('errorHint')}
          ctaLabel={tCommon('tryAgain')}
          ctaHref="#"
        />
      </section>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <section aria-labelledby="address-book-heading">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <h2
          id="address-book-heading"
          className="text-xl font-semibold text-foreground"
        >
          {t('addressesTitle')}
        </h2>

        {formMode === null && addresses.length > 0 && (
          <button
            type="button"
            onClick={handleAddNew}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px]"
          >
            <Plus className="size-4" aria-hidden="true" />
            {t('addAddress')}
          </button>
        )}
      </div>

      {/* ── Add Form (uses AddressForm which calls POST /users/addresses) ──── */}
      {formMode === 'add' && (
        <div className="mb-6 rounded-xl border border-border bg-card p-5">
          <h3 className="text-base font-semibold text-foreground mb-4">
            {t('addAddress')}
          </h3>
          <AddressForm
            onSuccess={handleAddSuccess}
            onCancel={handleFormCancel}
            submitLabel={t('addAddress')}
          />
        </div>
      )}

      {/* ── Edit Form (uses AddressForm UI but calls PUT via handleEditSubmit) */}
      {formMode === 'edit' && editingAddress && (
        <div className="mb-6 rounded-xl border border-border bg-card p-5">
          <h3 className="text-base font-semibold text-foreground mb-4">
            {t('editAddress')}
          </h3>
          <EditAddressForm
            address={editingAddress}
            onSubmit={handleEditSubmit}
            onCancel={handleFormCancel}
            isPending={editMutation.isPending}
            submitLabel={t('editAddress')}
          />
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {formMode === null && addresses.length === 0 && (
        <EmptyState
          icon={<MapPin className="size-8" />}
          title={t('noAddresses')}
          description={t('noAddressesHint')}
          ctaLabel={t('addAddress')}
          onCtaClick={handleAddNew}
        />
      )}

      {/* ── Address cards ──────────────────────────────────────────────────── */}
      {addresses.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard
              key={address._id}
              address={address}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
              onSetDefault={handleSetDefault}
              isSettingDefault={settingDefaultId === address._id}
              isDeleting={deletingId === address._id}
            />
          ))}
        </div>
      )}

      {/* ── Delete confirmation dialog ─────────────────────────────────────── */}
      <AppAlertDialog
        open={deletingAddress !== null}
        onOpenChange={(open) => {
          if (!open) handleDeleteCancel();
        }}
        title={t('deleteAddress')}
        subTitle={t('deleteAddressConfirm')}
        description={deletingAddress?.label}
        confirmLabel={tCommon('delete')}
        cancelLabel={tCommon('cancel')}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={deleteMutation.isPending}
        variant="delete"
        size="md"
      />
    </section>
  );
}

// ─── EditAddressForm ──────────────────────────────────────────────────────────
// Inline edit form that mirrors AddressForm's UI but calls PUT instead of POST.
// Uses LocationSelect for country/city from backend delivery zones.


interface EditAddressFormProps {
  address: Address;
  onSubmit: (values: AddressFormValues) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
}

function EditAddressForm({
  address,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
}: EditAddressFormProps) {
  const t = useTranslations('public.checkout');
  const tCommon = useTranslations('public.common');
  const tValidation = useTranslations('public.checkout.validation');

  const schema = Yup.object<AddressFormValues>({
    label: Yup.string().required(tValidation('labelRequired')).min(2, tValidation('labelMin')).max(50, tValidation('labelMax')),
    fullName: Yup.string().required(tValidation('fullNameRequired')).min(2, tValidation('fullNameMin')).max(100, tValidation('fullNameMax')),
    phone: Yup.string().required(tValidation('phoneRequired')).matches(/^\+?[0-9\s\-()]{7,20}$/, tValidation('phoneInvalid')),
    line1: Yup.string().required(tValidation('addressLine1Required')).min(3, tValidation('addressLine1Min')).max(200, tValidation('addressLine1Max')),
    line2: Yup.string().max(200, tValidation('addressLine2Max')),
    city: Yup.string().required(tValidation('cityRequired')),
    county: Yup.string().max(100, tValidation('countyMax')),
    postcode: Yup.string().required(tValidation('postalCodeRequired')).min(3, tValidation('postalCodeMin')).max(15, tValidation('postalCodeMax')).matches(/^[A-Za-z0-9\s\-]{3,15}$/, tValidation('postalCodeInvalid')),
    country: Yup.string().required(tValidation('countryRequired')),
    isDefault: Yup.boolean(),
  });

  const countryOptions = useDeliveryCountries().countries;

  const formik = useFormik<AddressFormValues>({
    initialValues: {
      label: address.label ?? '',
      fullName: address.fullName ?? '',
      phone: address.phone ?? '',
      line1: address.line1,
      line2: address.line2 ?? '',
      city: address.city,
      county: address.county ?? '',
      postcode: address.postcode,
      country: address.country,
      isDefault: address.isDefault,
    },
    validationSchema: schema,
    onSubmit: async (values, helpers) => {
      try {
        await onSubmit(values);
      } catch (err: unknown) {
        const apiError = err as {
          response?: { status?: number; data?: { errors?: Record<string, string> } };
        };
        if (apiError?.response?.status === 422 && apiError?.response?.data?.errors) {
          Object.entries(apiError.response.data.errors).forEach(([field, message]) => {
            helpers.setFieldError(field, message as string);
          });
        }
      }
    },
  });

  const cityOptions = useDeliveryCities(formik.values.country).cities;

  const handleCountryChange = (countryCode: string) => {
    formik.setFieldValue('country', countryCode);
    formik.setFieldValue('city', '');
    formik.setFieldTouched('country', true);
  };

  const handleCityChange = (city: string) => {
    formik.setFieldValue('city', city);
    formik.setFieldTouched('city', true);
  };

  const inputClass = (hasError: boolean) =>
    [
      'w-full rounded-md border bg-background px-3 py-2',
      'text-sm text-foreground placeholder:text-muted-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      'transition-colors min-h-[44px]',
      hasError ? 'border-destructive' : 'border-input',
    ].join(' ');

  const fieldError = (name: keyof AddressFormValues) =>
    formik.touched[name] && formik.errors[name] ? (
      <p className="text-xs text-destructive" role="alert">{formik.errors[name] as string}</p>
    ) : null;

  return (
    <form onSubmit={formik.handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-label" className="text-sm font-medium text-foreground">
            {t('addressLabel')} <span className="text-destructive">*</span>
          </label>
          <select
            id="edit-label"
            name="label"
            value={formik.values.label}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={inputClass(!!(formik.touched.label && formik.errors.label))}
          >
            <option value="">Select label</option>
            <option value="Home">Home</option>
            <option value="Office">Office</option>
            <option value="Warehouse">Warehouse</option>
            <option value="Site">Site</option>
            <option value="Other">Other</option>
          </select>
          {fieldError('label')}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-fullName" className="text-sm font-medium text-foreground">
            {t('addressFullName')} <span className="text-destructive">*</span>
          </label>
          <input id="edit-fullName" type="text" autoComplete="name" {...formik.getFieldProps('fullName')}
            className={inputClass(!!(formik.touched.fullName && formik.errors.fullName))} />
          {fieldError('fullName')}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-phone" className="text-sm font-medium text-foreground">
            {t('addressPhone')} <span className="text-destructive">*</span>
          </label>
          <input id="edit-phone" type="tel" autoComplete="tel" placeholder="+44 7700 900000"
            {...formik.getFieldProps('phone')}
            className={inputClass(!!(formik.touched.phone && formik.errors.phone))} />
          {fieldError('phone')}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-country" className="text-sm font-medium text-foreground">
            {t('addressCountry')} <span className="text-destructive">*</span>
          </label>
          <LocationSelect
            id="edit-country"
            options={countryOptions}
            value={formik.values.country}
            onChange={handleCountryChange}
            placeholder={t('addressCountryPlaceholder') ?? t('addressCountry')}
            error={!!(formik.touched.country && formik.errors.country)}
          />
          {fieldError('country')}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-line1" className="text-sm font-medium text-foreground">
          {t('addressLine1')} <span className="text-destructive">*</span>
        </label>
        <input id="edit-line1" type="text" autoComplete="address-line1" {...formik.getFieldProps('line1')}
          className={inputClass(!!(formik.touched.line1 && formik.errors.line1))} />
        {fieldError('line1')}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-line2" className="text-sm font-medium text-foreground">
          {t('addressLine2')}
        </label>
        <input id="edit-line2" type="text" autoComplete="address-line2" {...formik.getFieldProps('line2')}
          className={inputClass(false)} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-city" className="text-sm font-medium text-foreground">
            {t('addressCity')} <span className="text-destructive">*</span>
          </label>
          <LocationSelect
            id="edit-city"
            options={cityOptions}
            value={formik.values.city}
            onChange={handleCityChange}
            placeholder={t('addressCityPlaceholder') ?? t('addressCity')}
            error={!!(formik.touched.city && formik.errors.city)}
            disabled={!formik.values.country}
          />
          {fieldError('city')}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-county" className="text-sm font-medium text-foreground">
            {t('addressCounty')}
          </label>
          <input id="edit-county" type="text" autoComplete="address-level1" {...formik.getFieldProps('county')}
            className={inputClass(false)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-postcode" className="text-sm font-medium text-foreground">
            {t('addressPostcode')} <span className="text-destructive">*</span>
          </label>
          <input id="edit-postcode" type="text" autoComplete="postal-code" placeholder="SW1A 1AA"
            {...formik.getFieldProps('postcode')}
            className={inputClass(!!(formik.touched.postcode && formik.errors.postcode))} />
          {fieldError('postcode')}
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3 text-sm text-foreground">
        <input id="edit-isDefault" type="checkbox" {...formik.getFieldProps('isDefault')}
          checked={formik.values.isDefault} className="size-4 rounded border-input accent-primary" />
        {t('addressDefault')}
      </label>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={isPending}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {tCommon('cancel')}
        </button>
        <button type="submit" disabled={isPending}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {isPending ? t('addressSaving') : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default AddressBook;
