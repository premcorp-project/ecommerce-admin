'use client';

import Link from 'next/link';
import { ApiErrorResponse } from '@/types';
import { Form, Formik } from 'formik';
import {
  CheckCircle,
  FlaskConical,
  KeyRound,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import * as Yup from 'yup';
import { usePublicMutation } from '@/lib/api/public-hooks';
import { AppButton } from '@/components/shared/AppButton';
import { AppInputField } from '@/components/shared/form/AppInput';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ForgotPasswordValues {
  email: string;
}

// ─── Validation Schema ────────────────────────────────────────────────────────

const validationSchema = Yup.object({
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
});

const initialValues: ForgotPasswordValues = { email: '' };

// ─── Feature highlights for the left panel ────────────────────────────────────

const features = [
  { icon: Mail, text: 'Reset link sent to your email instantly' },
  { icon: KeyRound, text: 'Create a new secure password' },
  { icon: ShieldCheck, text: 'Your account stays protected' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ForgotPasswordPage() {
  const forgotPasswordMutation = usePublicMutation<unknown, { email: string }>(
    'post',
    '/auth/forgot-password',
  );

  const handleSubmit = async (
    values: ForgotPasswordValues,
    {
      setSubmitting,
      setFieldError,
      setStatus,
    }: {
      setSubmitting: (s: boolean) => void;
      setFieldError: (field: string, message: string) => void;
      setStatus: (status: unknown) => void;
    },
  ) => {
    try {
      await forgotPasswordMutation.mutateAsync({ email: values.email });
      setStatus('sent');
    } catch (error) {
      const apiError = error as ApiErrorResponse;
      const status = apiError?.response?.status;

      if (status === 422) {
        const errors = apiError?.response?.data?.errors;
        if (Array.isArray(errors)) {
          errors.forEach((err: { field: string; message: string }) => {
            setFieldError(err.field, err.message);
          });
        } else if (errors && typeof errors === 'object') {
          Object.entries(errors).forEach(([field, message]) => {
            setFieldError(field, message as string);
          });
        }
      }
      // Backend always returns 200 to prevent email enumeration —
      // non-422 errors are silently swallowed to avoid leaking info.
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
                ChemTech
              </span>
            </Link>
          </div>

          {/* Main message */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-primary-foreground leading-tight">
                Don&apos;t worry, it happens
              </h2>
              <p className="mt-3 text-primary-foreground/70 text-base leading-relaxed">
                We&apos;ll help you get back into your account in no time. Just
                enter your email and follow the instructions.
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
            © {new Date().getFullYear()} ChemTech. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Right panel — form ───────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <FlaskConical className="size-6 text-primary" />
              <span className="text-xl font-bold text-primary">ChemTech</span>
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Forgot your password?
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          {/* Form / Confirmation */}
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, status }) =>
              status === 'sent' ? (
                <ConfirmationMessage />
              ) : (
                <Form className="space-y-5" noValidate>
                  <AppInputField
                    label="Email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    requiredAsterisk
                  />

                  <AppButton
                    type="submit"
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                    className="w-full h-11 rounded-lg"
                  >
                    {isSubmitting ? 'Sending…' : 'Send reset link'}
                  </AppButton>

                  <p className="text-center text-sm text-muted-foreground">
                    Remember your password?{' '}
                    <Link
                      href="/login"
                      className="font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Back to login
                    </Link>
                  </p>
                </Form>
              )
            }
          </Formik>
        </div>
      </div>
    </div>
  );
}

// ─── Confirmation sub-component ───────────────────────────────────────────────

function ConfirmationMessage() {
  return (
    <div className="text-center space-y-4">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <CheckCircle
          className="h-7 w-7 text-green-600 dark:text-green-400"
          aria-hidden="true"
        />
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-foreground">Check your inbox</p>
        <p className="text-sm text-muted-foreground">
          If an account exists for that email, we&apos;ve sent a password reset
          link.
        </p>
      </div>
      <Link
        href="/login"
        className="inline-block text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        Back to login
      </Link>
    </div>
  );
}
