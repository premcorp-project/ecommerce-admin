'use client';

/**
 * AddressForm — Formik + Yup form for creating/editing a delivery address.
 *
 * Uses country-state-city for country and city dropdowns.
 * Strict validation: phone format, postcode format, min lengths.
 *
 * Requirements: 7.5, 9.5
 */

import { LocationSelect } from '@/components/shared/LocationSelect';
import { useDeliveryCheck, useDeliveryCities, useDeliveryCountries } from '@/hooks/use-delivery-locations';
import { usePublicMutation } from '@/lib/api/public-hooks';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import type { Address } from '@/types/public';
import { useFormik } from 'formik';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import * as Yup from 'yup';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AddressFormValues {
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
  isDefault: boolean;
}

export interface AddressFormProps {
  onSuccess: (address: Address) => void;
  onCancel?: () => void;
  initialValues?: Partial<AddressFormValues>;
  submitLabel?: string;
}

// ─── Validation schema ────────────────────────────────────────────────────────

function useAddressSchema() {
  const t = useTranslations('public.checkout.validation');
  return Yup.object<AddressFormValues>({
    label: Yup.string()
      .required(t('labelRequired'))
      .min(2, t('labelMin'))
      .max(50, t('labelMax')),
    fullName: Yup.string()
      .required(t('fullNameRequired'))
      .min(2, t('fullNameMin'))
      .max(100, t('fullNameMax')),
    phone: Yup.string()
      .required(t('phoneRequired'))
      .matches(/^\+?[0-9\s\-()]{7,20}$/, t('phoneInvalid')),
    line1: Yup.string()
      .required(t('addressLine1Required'))
      .min(3, t('addressLine1Min'))
      .max(200, t('addressLine1Max')),
    line2: Yup.string().max(200, t('addressLine2Max')),
    city: Yup.string().required(t('cityRequired')),
    county: Yup.string().max(100, t('countyMax')),
    postcode: Yup.string()
      .required(t('postalCodeRequired'))
      .min(3, t('postalCodeMin'))
      .max(15, t('postalCodeMax'))
      .matches(/^[A-Za-z0-9\s\-]{3,15}$/, t('postalCodeInvalid')),
    country: Yup.string().required(t('countryRequired')),
    isDefault: Yup.boolean(),
  });
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  children: React.ReactNode;
}

function Field({ id, label, error, touched, required, children }: FieldProps) {
  const showError = touched && error;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>}
      </label>
      {children}
      {showError && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">{error}</p>
      )}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return [
    'w-full rounded-md border bg-background px-3 py-2',
    'text-sm text-foreground placeholder:text-muted-foreground',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'transition-colors min-h-[44px]',
    hasError ? 'border-destructive' : 'border-input',
  ].join(' ');
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AddressForm({ onSuccess, onCancel, initialValues, submitLabel }: AddressFormProps) {
  const t = useTranslations('public.checkout');
  const tCommon = useTranslations('public.common');
  const { user } = useCustomerAuthStore();
  const isAuthenticated = user !== null;
  const schema = useAddressSchema();

  const mutation = usePublicMutation<Address, AddressFormValues>('post', '/users/addresses');

  // Fetch countries and cities from backend delivery zones (no hardcoding)
  const { countries: countryOptions, isLoading: countriesLoading } = useDeliveryCountries();

  const formik = useFormik<AddressFormValues>({
    initialValues: {
      label: initialValues?.label ?? '',
      fullName: initialValues?.fullName ?? '',
      phone: initialValues?.phone ?? '',
      line1: initialValues?.line1 ?? '',
      line2: initialValues?.line2 ?? '',
      city: initialValues?.city ?? '',
      county: initialValues?.county ?? '',
      postcode: initialValues?.postcode ?? '',
      country: initialValues?.country ?? 'GB',
      isDefault: initialValues?.isDefault ?? false,
    },
    validationSchema: schema,
    onSubmit: async (values, helpers) => {
      if (!isAuthenticated) {
        const guestAddress: Address = {
          _id: `guest-${Date.now()}`,
          label: values.label,
          fullName: values.fullName,
          phone: values.phone,
          line1: values.line1,
          line2: values.line2 || undefined,
          city: values.city,
          county: values.county || undefined,
          postcode: values.postcode,
          country: values.country,
          isDefault: false,
        };
        onSuccess(guestAddress);
        return;
      }

      try {
        const saved = await mutation.mutateAsync(values);
        const address =
          (saved as unknown as { data: { address: Address } })?.data?.address ??
          (saved as unknown as { data: Address })?.data ??
          (saved as unknown as Address);
        toast.success(t('addressSave'));
        onSuccess(address);
      } catch (err: unknown) {
        const apiError = err as {
          response?: { status?: number; data?: { errors?: Record<string, string> } };
        };
        if (apiError?.response?.status === 422 && apiError?.response?.data?.errors) {
          Object.entries(apiError.response.data.errors).forEach(([field, message]) => {
            helpers.setFieldError(field, message as string);
          });
        } else {
          toast.error(t('errorGeneric'));
        }
      }
    },
  });

  // Fetch deliverable cities from backend (changes when country changes)
  const { cities: cityOptions, isLoading: citiesLoading } = useDeliveryCities(formik.values.country);

  // Deliverability check — runs when both country and city are selected
  const { deliverable, zone, estimatedDays, isLoading: checkLoading } = useDeliveryCheck(
    formik.values.country,
    formik.values.city,
  );

  // Reset city when country changes
  const handleCountryChange = (countryCode: string) => {
    formik.setFieldValue('country', countryCode);
    formik.setFieldValue('city', ''); // Reset city when country changes
    formik.setFieldTouched('country', true);
  };

  const handleCityChange = (city: string) => {
    formik.setFieldValue('city', city);
    formik.setFieldTouched('city', true);
  };

  const isPending = mutation.isPending;

  return (
    <form onSubmit={formik.handleSubmit} noValidate aria-label={t('addNewAddress')} className="flex flex-col gap-5">
      {/* Two-column grid on md+ */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field id="label" label={t('addressLabel')} error={formik.errors.label} touched={formik.touched.label} required>
          <select
            id="label"
            name="label"
            value={formik.values.label}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={inputClass(Boolean(formik.touched.label && formik.errors.label))}
          >
            <option value="">{t('addressLabelPlaceholder') ?? 'Select label'}</option>
            <option value="Home">Home</option>
            <option value="Office">Office</option>
            <option value="Warehouse">Warehouse</option>
            <option value="Site">Site</option>
            <option value="Other">Other</option>
          </select>
        </Field>

        <Field id="fullName" label={t('addressFullName')} error={formik.errors.fullName} touched={formik.touched.fullName} required>
          <input id="fullName" name="fullName" type="text" autoComplete="name"
            placeholder={t('addressFullName')} value={formik.values.fullName}
            onChange={formik.handleChange} onBlur={formik.handleBlur}
            className={inputClass(Boolean(formik.touched.fullName && formik.errors.fullName))} />
        </Field>

        <Field id="phone" label={t('addressPhone')} error={formik.errors.phone} touched={formik.touched.phone} required>
          <input id="phone" name="phone" type="tel" autoComplete="tel"
            placeholder="+44 7700 900000" value={formik.values.phone}
            onChange={formik.handleChange} onBlur={formik.handleBlur}
            className={inputClass(Boolean(formik.touched.phone && formik.errors.phone))} />
        </Field>

        <Field id="country" label={t('addressCountry')} error={formik.errors.country} touched={formik.touched.country} required>
          <LocationSelect
            id="country"
            options={countryOptions}
            value={formik.values.country}
            onChange={handleCountryChange}
            placeholder={countriesLoading ? t('loadingCountries') : (t('addressCountryPlaceholder') ?? t('addressCountry'))}
            error={Boolean(formik.touched.country && formik.errors.country)}
            disabled={countriesLoading}
          />
        </Field>
      </div>

      {/* Line 1 — full width */}
      <Field id="line1" label={t('addressLine1')} error={formik.errors.line1} touched={formik.touched.line1} required>
        <input id="line1" name="line1" type="text" autoComplete="address-line1"
          placeholder={t('addressLine1')} value={formik.values.line1}
          onChange={formik.handleChange} onBlur={formik.handleBlur}
          className={inputClass(Boolean(formik.touched.line1 && formik.errors.line1))} />
      </Field>

      {/* Line 2 — full width, optional */}
      <Field id="line2" label={t('addressLine2')} error={formik.errors.line2} touched={formik.touched.line2}>
        <input id="line2" name="line2" type="text" autoComplete="address-line2"
          placeholder={t('addressLine2')} value={formik.values.line2}
          onChange={formik.handleChange} onBlur={formik.handleBlur}
          className={inputClass(false)} />
      </Field>

      {/* City / County / Postcode */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field id="city" label={t('addressCity')} error={formik.errors.city} touched={formik.touched.city} required>
          <LocationSelect
            id="city"
            options={cityOptions}
            value={formik.values.city}
            onChange={handleCityChange}
            placeholder={citiesLoading ? t('loadingCities') : (t('addressCityPlaceholder') ?? t('addressCity'))}
            error={Boolean(formik.touched.city && formik.errors.city)}
            disabled={!formik.values.country || citiesLoading}
          />
        </Field>

        <Field id="county" label={t('addressCounty')} error={formik.errors.county} touched={formik.touched.county}>
          <input id="county" name="county" type="text" autoComplete="address-level1"
            placeholder={t('addressCounty')} value={formik.values.county}
            onChange={formik.handleChange} onBlur={formik.handleBlur}
            className={inputClass(false)} />
        </Field>

        <Field id="postcode" label={t('addressPostcode')} error={formik.errors.postcode} touched={formik.touched.postcode} required>
          <input id="postcode" name="postcode" type="text" autoComplete="postal-code"
            placeholder="SW1A 1AA" value={formik.values.postcode}
            onChange={formik.handleChange} onBlur={formik.handleBlur}
            className={inputClass(Boolean(formik.touched.postcode && formik.errors.postcode))} />
        </Field>
      </div>

      {/* Deliverability indicator — shows after city is selected */}
      {formik.values.city && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2.5">
          {checkLoading ? (
            <>
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t('deliveryChecking')}</span>
            </>
          ) : deliverable === true ? (
            <>
              <CheckCircle2 className="size-4 text-green-600 dark:text-green-400 shrink-0" />
              <span className="text-sm text-foreground">
                {t('deliveryAvailable', { zone: zone ?? '', days: estimatedDays ?? '' })}
              </span>
            </>
          ) : deliverable === false ? (
            <>
              <XCircle className="size-4 text-destructive shrink-0" />
              <span className="text-sm text-destructive">{t('deliveryNotAvailable')}</span>
            </>
          ) : null}
        </div>
      )}

      {isAuthenticated && (
        <label className="flex cursor-pointer items-center gap-3 text-sm text-foreground">
          <input id="isDefault" name="isDefault" type="checkbox"
            checked={formik.values.isDefault} onChange={formik.handleChange}
            className="size-4 rounded border-input accent-primary" />
          {t('addressDefault')}
        </label>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={isPending}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {tCommon('cancel')}
          </button>
        )}
        <button type="submit" disabled={isPending}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {isPending ? t('addressSaving') : (submitLabel ?? t('addressSave'))}
        </button>
      </div>
    </form>
  );
}

export default AddressForm;
