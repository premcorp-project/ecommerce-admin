'use client';

/**
 * PasswordForm — allows an authenticated customer to change their password.
 *
 * - Formik + Yup validation
 * - Fields: currentPassword, newPassword, confirmPassword
 * - Calls PUT /users/change-password
 * - Maps 422 field-level errors to Formik via setFieldError
 * - Shows success toast on completion and resets the form
 * - All strings via t('public.account.*')
 * - Semantic tokens only — no hardcoded colours
 *
 * Requirements: 9.4
 */

import { AppButton } from '@/components/shared/AppButton';
import { usePublicMutation } from '@/lib/api/public-hooks';
import { cn } from '@/lib/utils';
import { Form, Formik, FormikHelpers } from 'formik';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import toast from 'react-hot-toast';
import * as Yup from 'yup';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

// ─── Validation Schema ────────────────────────────────────────────────────────

function usePasswordSchema() {
  const t = useTranslations('public.account.validation');

  return Yup.object<PasswordFormValues>().shape({
    currentPassword: Yup.string().required(t('currentPasswordRequired')),
    newPassword: Yup.string()
      .required(t('newPasswordRequired'))
      .min(8, t('newPasswordMin'))
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])/,
        t('newPasswordComplex'),
      ),
    confirmPassword: Yup.string()
      .required(t('confirmPasswordRequired'))
      .oneOf([Yup.ref('newPassword')], t('passwordsMustMatch')),
  });
}

// ─── Password Field ───────────────────────────────────────────────────────────

interface PasswordFieldProps {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  touched?: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onBlur: React.FocusEventHandler<HTMLInputElement>;
}

function PasswordField({
  id,
  name,
  label,
  placeholder,
  value,
  error,
  touched,
  onChange,
  onBlur,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const hasError = !!(error && touched);

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-foreground"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
          className={cn(
            'w-full rounded-lg border bg-background px-3 py-2.5 pr-10',
            'text-sm text-foreground placeholder:text-muted-foreground',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            hasError
              ? 'border-destructive focus:ring-destructive/30'
              : 'border-border',
          )}
        />

        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className={cn(
            'absolute inset-y-0 right-0 flex items-center px-3',
            'text-muted-foreground hover:text-foreground transition-colors',
            // Minimum touch target
            'min-w-[44px]',
          )}
          tabIndex={-1}
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {hasError && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const INITIAL_VALUES: PasswordFormValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export function PasswordForm() {
  const t = useTranslations('public.account');
  const schema = usePasswordSchema();

  const { mutateAsync: changePassword, isPending } = usePublicMutation<
    unknown,
    ChangePasswordPayload
  >('put', '/users/password');

  const handleSubmit = async (
    values: PasswordFormValues,
    { setFieldError, resetForm }: FormikHelpers<PasswordFormValues>,
  ) => {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      toast.success(t('passwordSaved'));
      resetForm();
    } catch (error: unknown) {
      const err = error as {
        response?: {
          status?: number;
          data?: {
            errors?: Record<string, string>;
            message?: string;
          };
        };
      };

      if (err?.response?.status === 422 && err.response.data?.errors) {
        // Map each field-level error from the API to the corresponding Formik field
        Object.entries(err.response.data.errors).forEach(([field, message]) => {
          setFieldError(field, message);
        });
      } else {
        toast.error(err?.response?.data?.message ?? t('passwordError'));
      }
    }
  };

  return (
    <section
      aria-labelledby="password-form-heading"
      className="rounded-xl border border-border bg-card p-6"
    >
      {/* ── Heading ─────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
          <Lock className="size-4 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h2
            id="password-form-heading"
            className="text-base font-semibold text-foreground"
          >
            {t('passwordTitle')}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t('passwordSave')}
          </p>
        </div>
      </div>

      {/* ── Form ────────────────────────────────────────────────────────── */}
      <Formik
        initialValues={INITIAL_VALUES}
        validationSchema={schema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, handleChange, handleBlur }) => (
          <Form noValidate className="space-y-5">
            {/* Current Password */}
            <PasswordField
              id="currentPassword"
              name="currentPassword"
              label={t('passwordCurrent')}
              placeholder={t('passwordCurrentPlaceholder')}
              value={values.currentPassword}
              error={errors.currentPassword}
              touched={touched.currentPassword}
              onChange={handleChange}
              onBlur={handleBlur}
            />

            {/* Divider */}
            <hr className="border-border" />

            {/* New Password */}
            <PasswordField
              id="newPassword"
              name="newPassword"
              label={t('passwordNew')}
              placeholder={t('passwordNewPlaceholder')}
              value={values.newPassword}
              error={errors.newPassword}
              touched={touched.newPassword}
              onChange={handleChange}
              onBlur={handleBlur}
            />

            {/* Confirm Password */}
            <PasswordField
              id="confirmPassword"
              name="confirmPassword"
              label={t('passwordConfirm')}
              placeholder={t('passwordConfirmPlaceholder')}
              value={values.confirmPassword}
              error={errors.confirmPassword}
              touched={touched.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
            />

            {/* Submit */}
            <div className="pt-1">
              <AppButton
                type="submit"
                isLoading={isPending}
                className="w-full sm:w-auto"
              >
                {isPending ? t('passwordSaving') : t('passwordSave')}
              </AppButton>
            </div>
          </Form>
        )}
      </Formik>
    </section>
  );
}

export default PasswordForm;
