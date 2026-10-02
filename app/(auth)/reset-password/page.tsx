'use client';

/**
 * Reset Password Page — app/(auth)/reset-password/page.tsx
 *
 * Reads `token` from URL query params (sent via email link).
 * User enters new password → POST /auth/reset-password { token, newPassword }
 * On success → redirect to /login with success toast.
 */
import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Form, Formik } from 'formik';
import { FlaskConical, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import * as Yup from 'yup';
import publicApi from '@/lib/api/public-api';
import { AppButton } from '@/components/shared/AppButton';
import { AppPasswordField } from '@/components/shared/form/AppPasswordField';

// ─── Validation ───────────────────────────────────────────────────────────────

const resetSchema = Yup.object({
  newPassword: Yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters'),
  confirmPassword: Yup.string()
    .required('Please confirm your password')
    .oneOf([Yup.ref('newPassword')], 'Passwords must match'),
});

// ─── Feature highlights for the left panel ────────────────────────────────────

const features = [
  { icon: KeyRound, text: 'Use at least 8 characters' },
  { icon: ShieldCheck, text: 'Mix letters, numbers, and symbols' },
  { icon: Lock, text: 'Avoid reusing old passwords' },
];

// ─── Form Content ─────────────────────────────────────────────────────────────

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const handleSubmit = async (
    values: { newPassword: string; confirmPassword: string },
    { setSubmitting }: { setSubmitting: (s: boolean) => void },
  ) => {
    if (!token) {
      toast.error(
        'Invalid or missing reset token. Please request a new reset link.',
      );
      setSubmitting(false);
      return;
    }

    try {
      const res = await publicApi.post('/auth/reset-password', {
        token,
        newPassword: values.newPassword,
      });
      const message =
        res.data?.data?.message ??
        res.data?.message ??
        'Password reset successfully.';
      toast.success(message);
      router.push('/login');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg =
        error?.response?.data?.message ??
        'Failed to reset password. The link may have expired.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* ── Left panel — branding (hidden on mobile) ─────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary-foreground/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary-foreground/5 rounded-full translate-x-1/3 translate-y-1/3" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-primary-foreground/3 rounded-full -translate-x-1/2 -translate-y-1/2" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2">
              <FlaskConical className="size-8 text-primary-foreground" />
              <span className="text-2xl font-bold text-primary-foreground">
                OttimoDirect
              </span>
            </Link>
          </div>

          {/* Main message */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-primary-foreground leading-tight">
                Create a new password
              </h2>
              <p className="mt-3 text-primary-foreground/70 text-base leading-relaxed">
                Choose a strong, unique password to keep your account secure. A
                good password is your first line of defence.
              </p>
            </div>

            {/* Feature list */}
            <div className="space-y-4">
              {features.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary-foreground/10">
                    <Icon className="size-4.5 text-primary-foreground" />
                  </div>
                  <span className="text-sm text-primary-foreground/80">
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-primary-foreground/50">
            © {new Date().getFullYear()} OttimoDirect. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Right panel — reset form ─────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <FlaskConical className="size-6 text-primary" />
              <span className="text-xl font-bold text-primary">
                OttimoDirect
              </span>
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Set your new password
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Choose a strong password you haven&apos;t used before.
            </p>
          </div>

          {/* Invalid token state */}
          {!token ? (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 text-sm text-destructive">
              Invalid or expired reset link. Please request a new one from the{' '}
              <Link href="/forgot-password" className="underline font-medium">
                forgot password
              </Link>{' '}
              page.
            </div>
          ) : (
            <Formik
              initialValues={{ newPassword: '', confirmPassword: '' }}
              validationSchema={resetSchema}
              onSubmit={handleSubmit}
            >
              {({ isSubmitting }) => (
                <Form className="space-y-4" noValidate>
                  <AppPasswordField
                    label="New Password"
                    name="newPassword"
                    placeholder="••••••••••"
                    autoComplete="new-password"
                    requiredAsterisk
                  />
                  <AppPasswordField
                    label="Confirm Password"
                    name="confirmPassword"
                    placeholder="••••••••••"
                    autoComplete="new-password"
                    requiredAsterisk
                  />
                  <AppButton
                    type="submit"
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                    className="w-full h-11 rounded-lg mt-2"
                  >
                    Update Password
                  </AppButton>
                </Form>
              )}
            </Formik>
          )}

          {/* Back to login */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
