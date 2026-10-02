'use client';

import { AppButton } from '@/components/shared/AppButton';
import { AppInputField } from '@/components/shared/form/AppInput';
import { AppPasswordField } from '@/components/shared/form/AppPasswordField';
import { usePostLogin } from '@/hooks/api/auth';
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';
import { handleApiError } from '@/lib/toast-error';
import { storeUser } from '@/lib/user';
import { loginSchema } from '@/schemas/auth/login.schema';
import { ApiErrorResponse } from '@/types';
import { Form, Formik } from 'formik';
import { FlaskConical, Shield, Truck, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import toast from 'react-hot-toast';

const initialValues = { email: '', password: '' };

// ─── Feature highlights for the left panel ────────────────────────────────────

const features = [
  { icon: FlaskConical, text: 'Professional-grade chemical products' },
  { icon: Truck, text: 'Fast delivery across the UK' },
  { icon: Users, text: 'Bulk buyer discounts available' },
  { icon: Shield, text: 'Secure checkout & data protection' },
];

// ─── Login Content ────────────────────────────────────────────────────────────

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginMutation = usePostLogin();
  const setAdminAuth = useAdminAuthStore((state) => state.setAuth);
  const setAdminPermissions = useAdminAuthStore(
    (state) => state.setPermissions,
  );
  const adminRole = useAdminAuthStore((state) => state.role);
  const adminToken = useAdminAuthStore((state) => state.token);

  const sessionExpired = searchParams.get('session') === 'expired';

  // Already authorized as admin/staff → go straight to the admin area.
  React.useEffect(() => {
    if (adminToken && (adminRole === 'admin' || adminRole === 'staff')) {
      router.replace(
        adminRole === 'admin' ? '/admin/dashboard' : '/admin/orders',
      );
    }
  }, [adminToken, adminRole, router]);

  const handleSubmit = async (
    values: typeof initialValues,
    { setSubmitting }: { setSubmitting: (s: boolean) => void },
  ) => {
    setSubmitting(true);
    try {
      const res = await loginMutation.mutateAsync({
        email: values.email,
        password: values.password,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = res as any;
      const user = response.user || response.data?.user;
      const token =
        response.token ||
        response.accessToken ||
        response.data?.token ||
        response.data?.accessToken;
      const message = response.message;

      if (!token && response.userId) {
        toast.success(message);
        router.push(
          `/login/verify-otp?userId=${response.userId}&email=${values.email}`,
        );
        return;
      }

      if (token && user) {
        const roleStr =
          typeof user.role === 'string' ? user.role : user.role?.name || '';
        const isAdminOrStaff = roleStr === 'admin' || roleStr === 'staff';

        if (isAdminOrStaff) {
          toast.success(message || 'Login successful!');
          storeUser({ ...user, token });
          setAdminAuth(
            {
              _id: user._id || user.id,
              email: user.email,
              name: user.name,
              role: roleStr as 'admin' | 'staff',
              isEmailVerified:
                user.isEmailVerified ?? user.email_is_verified ?? true,
              isActive: user.isActive ?? user.active_status ?? true,
            },
            token,
          );
          if (user.permissions) {
            setAdminPermissions(user.permissions);
          } else {
            setAdminPermissions(null);
          }
          router.push(
            roleStr === 'admin' ? '/admin/dashboard' : '/admin/orders',
          );
        } else {
          // Customers cannot sign in to the admin app — direct them to the app.
          toast.error('Please use the app to log in.');
        }
      }
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
                Your trusted partner for industrial chemical products
              </h2>
              <p className="mt-3 text-primary-foreground/70 text-base leading-relaxed">
                Access thousands of professional-grade products with competitive
                bulk pricing and fast UK delivery.
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

      {/* ── Right panel — login form ─────────────────────────────────────── */}
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
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </div>

          {/* Session expired banner */}
          {sessionExpired && (
            <div
              role="alert"
              className="mb-6 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-400"
            >
              Your session has expired. Please log in again.
            </div>
          )}

          {/* Form */}
          <Formik
            initialValues={initialValues}
            validationSchema={loginSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-4" noValidate>
                <AppInputField
                  label="Email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  requiredAsterisk
                />
                <div className="space-y-1.5">
                  <AppPasswordField
                    label="Password"
                    name="password"
                    placeholder="••••••••••"
                    autoComplete="current-password"
                    requiredAsterisk
                  />
                  <div className="flex justify-end">
                    <Link
                      href="/forgot-password"
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>
                <AppButton
                  type="submit"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-lg mt-2"
                >
                  {isSubmitting ? 'Signing in…' : 'Sign in'}
                </AppButton>
              </Form>
            )}
          </Formik>

          {/* Register link */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Export wrapper with Suspense (useSearchParams requires it) ───────────────

export default function LoginContentWithSuspense() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginContent />
    </React.Suspense>
  );
}
