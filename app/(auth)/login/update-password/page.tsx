'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { resetPasswordSchema } from '@/schemas/auth/reset-password.schema';
import { ApiErrorResponse } from '@/types';
import { Form, Formik } from 'formik';
import { FlaskConical, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';
import { handleApiError } from '@/lib/toast-error';
import { getUser, resolvePostLoginPath, storeUser } from '@/lib/user';
import { useUpdatePasswordRequired } from '@/hooks/api/auth';
import { AppButton } from '@/components/shared/AppButton';
import { AppPasswordField } from '@/components/shared/form/AppPasswordField';

const initialValues = {
  previousPassword: '',
  password: '',
  confirmPassword: '',
};

// ─── Feature highlights for the left panel ────────────────────────────────────

const features = [
  { icon: KeyRound, text: 'Use a strong, unique password' },
  { icon: ShieldCheck, text: 'Mix letters, numbers, and symbols' },
  { icon: Lock, text: 'Never reuse passwords across sites' },
];

// ─── Content ──────────────────────────────────────────────────────────────────

function UpdatePasswordContent() {
  const router = useRouter();
  const updatePasswordMutation = useUpdatePasswordRequired();
  const fetchPermissions = useAdminAuthStore((state) => state.fetchPermissions);

  const handleSubmit = async (
    values: typeof initialValues,
    { setSubmitting }: { setSubmitting: (s: boolean) => void },
  ) => {
    try {
      const currentUser = getUser();
      if (!currentUser || !currentUser.id) {
        toast.error('User not found. Please log in again.');
        router.push('/login');
        return;
      }

      await updatePasswordMutation.mutateAsync({
        userId: currentUser.id,
        previous_password: values.previousPassword,
        new_password: values.password,
      });

      // Update user in local storage
      const updatedUser = { ...currentUser, must_change_pass: false };
      storeUser(updatedUser);

      toast.success('Password successfully updated.');
      await fetchPermissions();
      router.push(resolvePostLoginPath());
    } catch (error) {
      handleApiError(error as ApiErrorResponse);
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
                Secure your account
              </h2>
              <p className="mt-3 text-primary-foreground/70 text-base leading-relaxed">
                A password update is required to keep your account safe. Choose
                a strong password that you haven&apos;t used before.
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

      {/* ── Right panel — password form ──────────────────────────────────── */}
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
              Password update required
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Please update your password to activate your account and keep it
              safe.
            </p>
          </div>

          {/* Form */}
          <Formik
            initialValues={initialValues}
            validationSchema={resetPasswordSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-4" noValidate>
                <AppPasswordField
                  label="Previous Password"
                  name="previousPassword"
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  requiredAsterisk
                />

                <AppPasswordField
                  label="New Password"
                  name="password"
                  placeholder="••••••••••"
                  autoComplete="new-password"
                  requiredAsterisk
                />

                <AppPasswordField
                  label="Confirm New Password"
                  name="confirmPassword"
                  placeholder="••••••••••"
                  autoComplete="new-password"
                  requiredAsterisk
                />

                <AppButton
                  type="submit"
                  isLoading={isSubmitting || updatePasswordMutation.isPending}
                  disabled={isSubmitting || updatePasswordMutation.isPending}
                  className="w-full h-11 rounded-lg mt-2"
                >
                  Update Password
                </AppButton>
              </Form>
            )}
          </Formik>

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

export default function UpdatePasswordPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
      <UpdatePasswordContent />
    </React.Suspense>
  );
}
