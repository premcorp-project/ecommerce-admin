'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Form, Formik, FormikHelpers } from 'formik';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import * as Yup from 'yup';

import { useAdminMutation, useAdminQuery } from '@/lib/api/admin-hooks';
import { adminQueryKeys } from '@/lib/api/admin-query-keys';

import { AppButton } from '@/components/shared/AppButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

// --- Types ---

interface PlatformConfig {
  taxRate: number;
  currency: string;
  isEmailEnabled: boolean;
  isSmsEnabled: boolean;
  isRefundsEnabled: boolean;
  isPickupEnabled: boolean;
  pickupAddress: string;
  pickupInstructions: string;
}

interface ConfigResponse {
  success: boolean;
  config: PlatformConfig;
}

interface ConfigFormValues {
  taxRate: number | '';
  currency: string;
  isEmailEnabled: boolean;
  isSmsEnabled: boolean;
  isRefundsEnabled: boolean;
  isPickupEnabled: boolean;
  pickupAddress: string;
  pickupInstructions: string;
}

interface PlatformConfigFormProps {
  canWrite: boolean;
}

// --- Validation Schema ---

const configValidationSchema = Yup.object().shape({
  taxRate: Yup.number()
    .required('Tax rate is required')
    .min(0, 'Tax rate must be 0 or greater')
    .max(100, 'Tax rate cannot exceed 100'),
  currency: Yup.string()
    .required('Currency is required')
    .min(2, 'Currency must be at least 2 characters')
    .max(5, 'Currency must be at most 5 characters'),
  isEmailEnabled: Yup.boolean(),
  isSmsEnabled: Yup.boolean(),
  isRefundsEnabled: Yup.boolean(),
  isPickupEnabled: Yup.boolean(),
  pickupAddress: Yup.string().when('isPickupEnabled', {
    is: true,
    then: (schema) => schema.required('Pickup address is required when pickup is enabled'),
    otherwise: (schema) => schema.notRequired(),
  }),
  pickupInstructions: Yup.string(),
});

// --- Component ---

export default function PlatformConfigForm({ canWrite }: PlatformConfigFormProps) {
  const t = useTranslations('admin.settings');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();

  // Fetch platform config
  const {
    data: configData,
    isLoading: isConfigLoading,
    isError: isConfigError,
    refetch: refetchConfig,
  } = useAdminQuery<ConfigResponse>(adminQueryKeys.settings(), '/config');

  // Update config mutation
  const { mutateAsync: updateConfig, isPending: isUpdatingConfig } =
    useAdminMutation<{ success: boolean }, Record<string, unknown>>(
      'put',
      '/config',
    );

  // --- Handlers ---

  const handleConfigSubmit = async (
    values: ConfigFormValues,
    { setFieldError }: FormikHelpers<ConfigFormValues>,
  ) => {
    const payload: Record<string, unknown> = {
      taxRate: Number(values.taxRate),
      currency: values.currency.trim(),
      isEmailEnabled: values.isEmailEnabled,
      isSmsEnabled: values.isSmsEnabled,
      isRefundsEnabled: values.isRefundsEnabled,
      isPickupEnabled: values.isPickupEnabled,
      ...(values.isPickupEnabled && {
        pickupAddress: values.pickupAddress.trim(),
        pickupInstructions: values.pickupInstructions.trim(),
      }),
    };

    try {
      await updateConfig(payload);
      toast.success(t('toast.configUpdated'));
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
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
        const fieldErrors = err.response.data.errors;
        Object.entries(fieldErrors).forEach(([field, message]) => {
          setFieldError(field, message);
        });
      } else {
        const message =
          err?.response?.data?.message || t('toast.configUpdateFailed');
        toast.error(message);
      }
    }
  };

  // --- Initial form values ---

  const cfg = (configData as any)?.data?.config ?? configData?.config;
  const configInitialValues: ConfigFormValues = {
    taxRate: cfg?.taxRate ?? '',
    currency: cfg?.currency ?? '',
    isEmailEnabled: cfg?.isEmailEnabled ?? false,
    isSmsEnabled: cfg?.isSmsEnabled ?? false,
    isRefundsEnabled: cfg?.isRefundsEnabled ?? false,
    isPickupEnabled: cfg?.isPickupEnabled ?? false,
    pickupAddress: cfg?.pickupAddress ?? '',
    pickupInstructions: cfg?.pickupInstructions ?? '',
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium">{t('platformConfig')}</h2>

      {isConfigLoading ? (
        <div className="rounded-md border p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-1/4 rounded bg-muted" />
            <div className="h-10 w-full rounded bg-muted" />
            <div className="h-4 w-1/4 rounded bg-muted" />
            <div className="h-10 w-full rounded bg-muted" />
            <div className="h-4 w-1/4 rounded bg-muted" />
            <div className="h-6 w-12 rounded bg-muted" />
          </div>
        </div>
      ) : isConfigError ? (
        <div className="rounded-md border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {t('failedToLoadConfig')}
          </p>
          <button
            onClick={() => refetchConfig()}
            className="mt-2 text-sm text-primary underline"
          >
            {tCommon('retry')}
          </button>
        </div>
      ) : (
        <Formik
          initialValues={configInitialValues}
          validationSchema={configValidationSchema}
          onSubmit={handleConfigSubmit}
          enableReinitialize
        >
          {({
            values,
            errors,
            touched,
            setFieldValue,
            handleChange,
            handleBlur,
          }) => (
            <Form className="rounded-md border p-6 space-y-4">
              {/* Tax Rate */}
              <div className="space-y-1.5">
                <Label htmlFor="taxRate">{t('form.taxRate')}</Label>
                <Input
                  id="taxRate"
                  name="taxRate"
                  type="number"
                  placeholder={t('form.taxRatePlaceholder')}
                  value={values.taxRate}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  min={0}
                  max={100}
                  step={0.01}
                  disabled={!canWrite}
                  aria-invalid={!!(touched.taxRate && errors.taxRate)}
                />
                {touched.taxRate && errors.taxRate && (
                  <p className="text-xs text-destructive">{errors.taxRate}</p>
                )}
              </div>

              {/* Currency */}
              <div className="space-y-1.5">
                <Label htmlFor="currency">{t('form.currency')}</Label>
                <Input
                  id="currency"
                  name="currency"
                  placeholder={t('form.currencyPlaceholder')}
                  value={values.currency}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={!canWrite}
                  aria-invalid={!!(touched.currency && errors.currency)}
                />
                {touched.currency && errors.currency && (
                  <p className="text-xs text-destructive">
                    {errors.currency}
                  </p>
                )}
              </div>

              {/* Email Enabled */}
              <div className="flex items-center justify-between">
                <Label htmlFor="isEmailEnabled">{t('form.emailEnabled')}</Label>
                <Switch
                  id="isEmailEnabled"
                  checked={values.isEmailEnabled}
                  onCheckedChange={(checked) =>
                    setFieldValue('isEmailEnabled', checked)
                  }
                  disabled={!canWrite}
                />
              </div>

              {/* SMS Enabled */}
              <div className="flex items-center justify-between">
                <Label htmlFor="isSmsEnabled">{t('form.smsEnabled')}</Label>
                <Switch
                  id="isSmsEnabled"
                  checked={values.isSmsEnabled}
                  onCheckedChange={(checked) =>
                    setFieldValue('isSmsEnabled', checked)
                  }
                  disabled={!canWrite}
                />
              </div>

              {/* Refunds Enabled */}
              <div className="flex items-center justify-between">
                <Label htmlFor="isRefundsEnabled">{t('form.refundsEnabled')}</Label>
                <Switch
                  id="isRefundsEnabled"
                  checked={values.isRefundsEnabled}
                  onCheckedChange={(checked) =>
                    setFieldValue('isRefundsEnabled', checked)
                  }
                  disabled={!canWrite}
                />
              </div>

              {/* Pickup Enabled */}
              <div className="flex items-center justify-between">
                <Label htmlFor="isPickupEnabled">{t('form.pickupEnabled')}</Label>
                <Switch
                  id="isPickupEnabled"
                  checked={values.isPickupEnabled}
                  onCheckedChange={(checked) =>
                    setFieldValue('isPickupEnabled', checked)
                  }
                  disabled={!canWrite}
                />
              </div>

              {/* Pickup Address — only when enabled */}
              {values.isPickupEnabled && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="pickupAddress">{t('form.pickupAddress')}</Label>
                    <Input
                      id="pickupAddress"
                      name="pickupAddress"
                      placeholder={t('form.pickupAddressPlaceholder')}
                      value={values.pickupAddress}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={!canWrite}
                      aria-invalid={!!(touched.pickupAddress && errors.pickupAddress)}
                    />
                    {touched.pickupAddress && errors.pickupAddress && (
                      <p className="text-xs text-destructive">{errors.pickupAddress}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pickupInstructions">{t('form.pickupInstructions')}</Label>
                    <textarea
                      id="pickupInstructions"
                      name="pickupInstructions"
                      placeholder={t('form.pickupInstructionsPlaceholder')}
                      value={values.pickupInstructions}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={!canWrite}
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </>
              )}

              {/* Submit */}
              {canWrite && (
                <div className="pt-2">
                  <AppButton
                    type="submit"
                    isLoading={isUpdatingConfig}
                  >
                    {t('form.saveSettings')}
                  </AppButton>
                </div>
              )}
            </Form>
          )}
        </Formik>
      )}
    </section>
  );
}
