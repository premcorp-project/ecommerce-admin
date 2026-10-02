'use client';

/**
 * Customer Register Page — app/(auth)/register/page.tsx
 *
 * Client-side only. Uses Formik + Yup for form state and validation.
 * Calls POST /auth/register, stores auth in CustomerAuthStore.
 * Redirects to /account on success.
 * Maps 422 field-level errors to Formik via setFieldError.
 *
 * Requirements: 10.3, 10.6, 10.8
 */
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Form, Formik, FormikHelpers } from 'formik';
import { FlaskConical, ShieldCheck, Truck, Users, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import * as Yup from 'yup';
import publicApi from '@/lib/api/public-api';
import {
  CustomerUser,
  useCustomerAuthStore,
} from '@/lib/stores/customer-auth-store';
import { AppButton } from '@/components/shared/AppButton';
import { AppInputField } from '@/components/shared/form/AppInput';
import { AppPasswordField } from '@/components/shared/form/AppPasswordField';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface RegisterApiResponse {
  success: boolean;
  message?: string;
  accessToken?: string;
  token?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user?: any;
  data?: {
    accessToken?: string;
    token?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user?: any;
  };
}

// ─── Validation Schema ────────────────────────────────────────────────────────

function useRegisterSchema() {
  const t = useTranslations('public.auth.validation');
  return Yup.object({
    name: Yup.string().min(2, t('nameRequired')).required(t('nameRequired')),
    email: Yup.string().email(t('emailInvalid')).required(t('emailRequired')),
    password: Yup.string()
      .min(8, t('passwordMin'))
      .required(t('passwordRequired')),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], t('passwordsMustMatch'))
      .required(t('confirmPasswordRequired')),
  });
}

// ─── Initial Values ───────────────────────────────────────────────────────────

const initialValues: RegisterFormValues = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

// ─── Feature highlights for the left panel ────────────────────────────────────

const features = [
  { icon: Users, text: 'Join thousands of industry professionals' },
  { icon: Zap, text: 'Exclusive bulk pricing & discounts' },
  { icon: Truck, text: 'Priority delivery on all orders' },
  { icon: ShieldCheck, text: 'Secure account with order tracking' },
];

// ─── Page Component ───────────────────────────────────────────────────────────

export default function RegisterPage() {
  const t = useTranslations('public.auth');
  const router = useRouter();
  const { token, setAuth } = useCustomerAuthStore();
  const registerSchema = useRegisterSchema();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (token) {
      router.replace('/account');
    }
  }, [token, router]);

  if (token) {
    return null;
  }

  const handleSubmit = async (
    values: RegisterFormValues,
    { setSubmitting, setFieldError }: FormikHelpers<RegisterFormValues>,
  ) => {
    try {
      const res = await publicApi.post<RegisterApiResponse>('/auth/register', {
        name: values.name,
        email: values.email,
        password: values.password,
      });

      const response = res.data as RegisterApiResponse;

      const user = response.user ?? response.data?.user;
      const accessToken =
        response.accessToken ??
        response.token ??
        response.data?.accessToken ??
        response.data?.token;

      if (accessToken && user) {
        const customerUser: CustomerUser = {
          _id: user._id || user.id,
          name: user.name,
          email: user.email,
          role: user.role || 'customer',
          hasBulkAccess: user.hasBulkAccess ?? user.isBulkBuyer ?? false,
          hasCODAccess: user.hasCODAccess ?? user.isCodEnabled ?? false,
        };
        setAuth(customerUser, accessToken);
        toast.success(response.message ?? t('registerSuccess'));
        router.push('/account');
      }
    } catch (error) {
      const apiError = error as {
        response?: {
          status?: number;
          data?: {
            message?: string;
            errors?: { field: string; message: string }[];
          };
        };
      };
      const status = apiError?.response?.status;
      const data = apiError?.response?.data;

      if (status === 422 && Array.isArray(data?.errors)) {
        data.errors.forEach(({ field, message }) => {
          setFieldError(field, message);
        });
      } else {
        toast.error(data?.message ?? t('registerError'));
      }
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
                Join thousands of professionals
              </h2>
              <p className="mt-3 text-primary-foreground/70 text-base leading-relaxed">
                Create your account to access competitive pricing, bulk
                discounts, and fast delivery on industrial chemical products.
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

      {/* ── Right panel — register form ──────────────────────────────────── */}
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
              {t('registerTitle')}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t('registerSubtitle')}
            </p>
          </div>

          {/* Register Form */}
          <Formik
            initialValues={initialValues}
            validationSchema={registerSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-4" noValidate>
                <AppInputField
                  label={t('name')}
                  name="name"
                  type="text"
                  placeholder={t('namePlaceholder')}
                  autoComplete="name"
                  requiredAsterisk
                />

                <AppInputField
                  label={t('email')}
                  name="email"
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  autoComplete="email"
                  requiredAsterisk
                />

                <AppPasswordField
                  label={t('password')}
                  name="password"
                  placeholder={t('passwordPlaceholder')}
                  autoComplete="new-password"
                  requiredAsterisk
                />

                <AppPasswordField
                  label={t('confirmPassword')}
                  name="confirmPassword"
                  placeholder={t('confirmPasswordPlaceholder')}
                  autoComplete="new-password"
                  requiredAsterisk
                />

                <AppButton
                  type="submit"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-lg mt-2"
                >
                  {isSubmitting ? t('registering') : t('registerButton')}
                </AppButton>
              </Form>
            )}
          </Formik>

          {/* Login link */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            {t('alreadyHaveAccount')}{' '}
            <Link
              href="/login"
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {t('signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
