'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiErrorResponse } from '@/types';
import { Form, Formik } from 'formik';
import { FlaskConical, Lock, ShieldCheck, Timer } from 'lucide-react';
import toast from 'react-hot-toast';
import * as Yup from 'yup';
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';
import { handleApiError } from '@/lib/toast-error';
import {
  resolvePostLoginPath,
  storeRoleAndPermissions,
  storeUser,
} from '@/lib/user';
import { usePostSendLoginOtp, usePostVerifyLoginOtp } from '@/hooks/api/auth';
import { useQueryParams } from '@/hooks/use-query-params';
import { AppButton } from '@/components/shared/AppButton';
import { AppOtpInput } from '@/components/shared/form/AppOtpInput';
import { ResendOtp } from '@/components/shared/ResendOtp';

const ValidationSchema = Yup.object({
  otp: Yup.string()
    .matches(/^\d{6}$/, 'Enter the 6-digit code')
    .required('OTP is required'),
});

const initialValues = {
  otp: '',
};

// ─── Feature highlights for the left panel ────────────────────────────────────

const features = [
  { icon: ShieldCheck, text: 'Two-factor authentication for extra security' },
  { icon: Timer, text: 'Code expires in 10 minutes' },
  { icon: Lock, text: 'Never share your code with anyone' },
];

// ─── Content ──────────────────────────────────────────────────────────────────

function VerifyLoginOtpContent() {
  const router = useRouter();
  const { getParam } = useQueryParams();
  const userId = getParam('userId');
  const email = getParam('email');

  const verifyOtpMutation = usePostVerifyLoginOtp();
  const sendLoginOtpMutation = usePostSendLoginOtp();
  const setAuth = useAdminAuthStore((state) => state.setAuth);
  const fetchPermissions = useAdminAuthStore((state) => state.fetchPermissions);

  const handleSubmit = async (
    values: typeof initialValues,
    { setSubmitting }: { setSubmitting: (s: boolean) => void },
  ) => {
    if (!userId) {
      toast.error('User not found. Please go back and try again.');
      setSubmitting(false);
      return;
    }

    verifyOtpMutation.mutate(
      { userId, sentOtp: values.otp },
      {
        onSuccess: async (data) => {
          toast.success('Login successful!');
          storeUser({
            ...data.user,
            token: data.accessToken,
          });
          if (data.user.role) {
            storeRoleAndPermissions(data.user.role);
          }
          setAuth(
            {
              _id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              role: (data.user.role?.name as 'admin' | 'staff') || 'admin',
              isEmailVerified: data.user.email_is_verified ?? true,
              isActive: data.user.active_status ?? true,
            },
            data.accessToken,
          );
          await fetchPermissions();
          router.push(resolvePostLoginPath());
        },
        onError: (error: ApiErrorResponse) => {
          handleApiError(error);
        },
        onSettled: () => {
          setSubmitting(false);
        },
      },
    );
  };

  const handleResendOtp = (): Promise<void> => {
    if (!email) {
      toast.error('Email not found. Please go back and try again.');
      return Promise.reject(new Error('Email not found'));
    }

    return new Promise<void>((resolve, reject) => {
      sendLoginOtpMutation.mutate(
        { email, otp_type: 'sms' },
        {
          onSuccess: (data) => {
            toast.success(data.message);
            resolve();
          },
          onError: (error: ApiErrorResponse) => {
            handleApiError(error);
            reject(error);
          },
        },
      );
    });
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
                Almost there
              </h2>
              <p className="mt-3 text-primary-foreground/70 text-base leading-relaxed">
                We&apos;ve sent a verification code to confirm your identity.
                This extra step keeps your account safe and secure.
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

      {/* ── Right panel — OTP form ───────────────────────────────────────── */}
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
              Enter verification code
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              We&apos;ve sent a 6-digit code to{' '}
              <span className="font-medium text-foreground">
                {email || 'your email'}
              </span>
            </p>
          </div>

          {/* OTP Form */}
          <Formik
            initialValues={initialValues}
            validationSchema={ValidationSchema}
            onSubmit={handleSubmit}
          >
            {() => (
              <Form className="space-y-5" noValidate>
                <AppOtpInput name="otp" maxLength={6} requiredAsterisk />

                <AppButton
                  type="submit"
                  isLoading={verifyOtpMutation.isPending}
                  disabled={verifyOtpMutation.isPending}
                  className="w-full h-11 rounded-lg"
                >
                  Verify OTP
                </AppButton>
              </Form>
            )}
          </Formik>

          <ResendOtp onResend={handleResendOtp} />

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

export default function VerifyLoginOtpPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
      <VerifyLoginOtpContent />
    </React.Suspense>
  );
}
