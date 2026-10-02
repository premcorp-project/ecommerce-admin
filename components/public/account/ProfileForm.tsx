'use client';

/**
 * ProfileForm — fetches GET /users/profile and allows the customer to update
 * their name and phone via PUT /users/profile.
 *
 * - Formik + Yup for form state and validation
 * - usePublicQuery to fetch current profile data
 * - usePublicMutation for the PUT request
 * - Maps 422 field errors to Formik via setFieldError
 * - Shows success toast on save; error toast on failure
 * - Skeleton loader while profile is loading
 * - Semantic tokens only; fully responsive
 *
 * Requirements: 9.3
 */

import { usePublicMutation, usePublicQuery } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import { ApiErrorResponse } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import * as Yup from 'yup';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileResponse {
  data: { user: any };
}

interface UpdateProfilePayload {
  name: string;
  phone: string;
}

interface UpdateProfileResponse {
  data: { user: any };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ProfileFormSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading profile">
      {/* Title skeleton */}
      <div className="h-6 w-48 rounded-md bg-muted" />

      {/* Name field skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-10 w-full rounded-lg bg-muted" />
      </div>

      {/* Phone field skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-28 rounded bg-muted" />
        <div className="h-10 w-full rounded-lg bg-muted" />
      </div>

      {/* Email field skeleton (read-only) */}
      <div className="space-y-2">
        <div className="h-4 w-28 rounded bg-muted" />
        <div className="h-10 w-full rounded-lg bg-muted" />
      </div>

      {/* Button skeleton */}
      <div className="h-10 w-32 rounded-lg bg-muted" />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProfileForm() {
  const t = useTranslations('public.account');
  const queryClient = useQueryClient();

  // ── Fetch profile ──────────────────────────────────────────────────────────
  const { data: profileData, isLoading } = usePublicQuery<ProfileResponse>(
    publicQueryKeys.profile,
    '/users/profile',
  );

  const profile = (profileData as any)?.data?.user ?? profileData?.data ?? null;

  // ── Validation schema ──────────────────────────────────────────────────────
  const validationSchema = Yup.object({
    name: Yup.string().trim().required(t('validation.nameRequired')),
    phone: Yup.string()
      .trim()
      .matches(/^\+?[0-9\s\-()]{7,20}$/, t('validation.phoneInvalid')),
  });

  // ── Mutation ───────────────────────────────────────────────────────────────
  const updateMutation = usePublicMutation<UpdateProfileResponse, UpdateProfilePayload>(
    'put',
    '/users/profile',
  );

  // ── Formik ─────────────────────────────────────────────────────────────────
  const formik = useFormik<UpdateProfilePayload>({
    enableReinitialize: true,
    initialValues: {
      name: profile?.name ?? '',
      phone: profile?.phone ?? '',
    },
    validationSchema,
    onSubmit: async (values, { setFieldError }) => {
      try {
        await updateMutation.mutateAsync(values);
        // Invalidate profile cache so other components see the updated name
        await queryClient.invalidateQueries({ queryKey: publicQueryKeys.profile });
        toast.success(t('profileSaved'));
      } catch (err) {
        const apiError = err as ApiErrorResponse;
        // Map 422 field-level errors to Formik
        if (apiError?.response?.status === 422 && Array.isArray(apiError?.response?.data?.errors)) {
          const fieldErrors = apiError.response.data.errors as { field: string; message: string }[];
          fieldErrors.forEach(({ field, message }) => {
            setFieldError(field, message);
          });
        } else {
          toast.error(t('profileError'));
        }
      }
    },
  });

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return <ProfileFormSkeleton />;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <section aria-labelledby="profile-form-heading">
      <h2
        id="profile-form-heading"
        className="mb-6 text-lg font-semibold text-foreground"
      >
        {t('profileTitle')}
      </h2>

      <form
        onSubmit={formik.handleSubmit}
        noValidate
        className="space-y-5"
      >
        {/* ── Full Name ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="profile-name"
            className="text-sm font-medium text-foreground"
          >
            {t('profileName')}
          </label>
          <input
            id="profile-name"
            type="text"
            autoComplete="name"
            placeholder={t('profileNamePlaceholder')}
            {...formik.getFieldProps('name')}
            aria-invalid={!!(formik.touched.name && formik.errors.name)}
            aria-describedby={
              formik.touched.name && formik.errors.name
                ? 'profile-name-error'
                : undefined
            }
            className={[
              'w-full rounded-lg border px-3 py-2.5 text-sm',
              'bg-background text-foreground placeholder:text-muted-foreground',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
              formik.touched.name && formik.errors.name
                ? 'border-destructive focus:ring-destructive'
                : 'border-border',
            ].join(' ')}
          />
          {formik.touched.name && formik.errors.name && (
            <p id="profile-name-error" className="text-xs text-destructive" role="alert">
              {formik.errors.name}
            </p>
          )}
        </div>

        {/* ── Phone Number ───────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="profile-phone"
            className="text-sm font-medium text-foreground"
          >
            {t('profilePhone')}
          </label>
          <input
            id="profile-phone"
            type="tel"
            autoComplete="tel"
            placeholder="+44 7700 900000"
            {...formik.getFieldProps('phone')}
            aria-invalid={!!(formik.touched.phone && formik.errors.phone)}
            aria-describedby={
              formik.touched.phone && formik.errors.phone
                ? 'profile-phone-error'
                : undefined
            }
            className={[
              'w-full rounded-lg border px-3 py-2.5 text-sm',
              'bg-background text-foreground placeholder:text-muted-foreground',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
              formik.touched.phone && formik.errors.phone
                ? 'border-destructive focus:ring-destructive'
                : 'border-border',
            ].join(' ')}
          />
          {formik.touched.phone && formik.errors.phone && (
            <p id="profile-phone-error" className="text-xs text-destructive" role="alert">
              {formik.errors.phone}
            </p>
          )}
        </div>

        {/* ── Email (read-only) ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="profile-email"
            className="text-sm font-medium text-foreground"
          >
            {t('profileEmail')}
          </label>
          <input
            id="profile-email"
            type="email"
            value={profile?.email ?? ''}
            readOnly
            disabled
            aria-readonly="true"
            className={[
              'w-full rounded-lg border border-border px-3 py-2.5 text-sm',
              'bg-muted text-muted-foreground',
              'cursor-not-allowed',
            ].join(' ')}
          />
          <p className="text-xs text-muted-foreground">
            {t('profileEmailReadOnly')}
          </p>
        </div>

        {/* ── Submit ─────────────────────────────────────────────────────── */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={formik.isSubmitting || !formik.dirty}
            aria-busy={formik.isSubmitting}
            className={[
              'inline-flex items-center justify-center gap-2',
              'rounded-lg px-5 py-2.5 text-sm font-semibold',
              'bg-primary text-primary-foreground',
              'transition-colors hover:bg-primary/90',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'min-h-[44px] min-w-[120px]',
            ].join(' ')}
          >
            {formik.isSubmitting ? t('profileSaving') : t('profileSave')}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ProfileForm;
