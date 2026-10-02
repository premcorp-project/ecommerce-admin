'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Form, Formik, FormikHelpers } from 'formik';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import * as Yup from 'yup';

import { AppButton } from '@/components/shared/AppButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAdminMutation } from '@/lib/api/admin-hooks';
import { AdminPermissions } from '@/lib/stores/admin-auth-store';

// --- Types ---

interface CreateStaffSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface CreateStaffFormValues {
  name: string;
  email: string;
  password: string;
}

interface CreateStaffPayload {
  name: string;
  email: string;
  password: string;
  permissions: AdminPermissions;
}

// --- Component ---

export default function CreateStaffSheet({
  open,
  onOpenChange,
  onSuccess,
}: CreateStaffSheetProps) {
  const t = useTranslations('admin.staff');
  const queryClient = useQueryClient();

  // Validation schema
  const validationSchema = Yup.object().shape({
    name: Yup.string()
      .required(t('validation.nameRequired'))
      .max(100, t('validation.nameMax')),
    email: Yup.string()
      .required(t('validation.emailRequired'))
      .email(t('validation.emailInvalid'))
      .max(255, t('validation.emailMax')),
    password: Yup.string()
      .required(t('validation.passwordRequired'))
      .min(8, t('validation.passwordMin'))
      .max(128, t('validation.passwordMax')),
  });

  // Default permissions for new staff (all read-only)
  const defaultPermissions: AdminPermissions = {
    catalog: { read: true, write: false },
    orders: { read: true, write: false },
    users: { read: false, write: false },
    support: { read: true, write: false },
    notifications: { read: true, write: false },
    config: { read: false, write: false },
  };

  // Mutation
  const { mutateAsync: createStaff, isPending } = useAdminMutation<
    { success: boolean; data: { user: Record<string, unknown> } },
    CreateStaffPayload
  >('post', '/users/staff');

  // Initial values
  const initialValues: CreateStaffFormValues = {
    name: '',
    email: '',
    password: '',
  };

  // Submit handler
  const handleSubmit = async (
    values: CreateStaffFormValues,
    { setFieldError, resetForm }: FormikHelpers<CreateStaffFormValues>,
  ) => {
    try {
      await createStaff({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        permissions: defaultPermissions,
      });

      toast.success(t('toast.createSuccess'));
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
      resetForm();
      onSuccess();
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

      if (err?.response?.status === 409) {
        setFieldError('email', t('validation.emailExists'));
      } else if (err?.response?.status === 400 && err.response.data?.errors) {
        const fieldErrors = err.response.data.errors;
        Object.entries(fieldErrors).forEach(([field, message]) => {
          setFieldError(field, message);
        });
      } else {
        const message =
          err?.response?.data?.message || t('toast.createFailed');
        toast.error(message);
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md flex flex-col" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>{t('form.addTitle')}</SheetTitle>
        </SheetHeader>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
            <Form className="flex flex-col gap-4 p-4 overflow-y-auto flex-1">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name">{t('form.name')}</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder={t('form.namePlaceholder')}
                  value={values.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-invalid={!!(touched.name && errors.name)}
                />
                {touched.name && errors.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">{t('form.email')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t('form.emailPlaceholder')}
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-invalid={!!(touched.email && errors.email)}
                />
                {touched.email && errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">{t('form.password')}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder={t('form.passwordPlaceholder')}
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-invalid={!!(touched.password && errors.password)}
                />
                {touched.password && errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="mt-4">
                <AppButton
                  type="submit"
                  isLoading={isSubmitting || isPending}
                  disabled={isSubmitting || isPending}
                  className="w-full"
                >
                  {t('buttons.addStaff')}
                </AppButton>
              </div>
            </Form>
          )}
        </Formik>
      </SheetContent>
    </Sheet>
  );
}
