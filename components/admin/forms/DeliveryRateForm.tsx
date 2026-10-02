'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Form, Formik, FormikHelpers } from 'formik';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import * as Yup from 'yup';

import { AppButton } from '@/components/shared/AppButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAdminMutation } from '@/lib/api/admin-hooks';

import { WeightRangesEditor } from './WeightRangesEditor';

// --- Types ---

interface WeightRange {
  minWeight: number;
  maxWeight: number;
  price: number;
}

interface DeliveryRate {
  _id: string;
  city: string | null;
  estimatedDays: number;
  isActive: boolean;
  weightRanges?: WeightRange[];
}

interface DeliveryRateFormProps {
  item: DeliveryRate | null;
  onSuccess: () => void;
}

interface WeightRangeFormRow {
  minWeight: string;
  maxWeight: string;
  price: string;
}

interface DeliveryRateFormValues {
  city: string;
  estimatedDays: number | '';
  isActive: boolean;
  weightRanges: WeightRangeFormRow[];
}

// --- Validation Schema ---

const deliveryRateValidationSchema = Yup.object().shape({
  city: Yup.string().trim().required('City is required'),
  estimatedDays: Yup.number()
    .required('Estimated days is required')
    .positive('Must be a positive number')
    .integer('Must be a whole number'),
  isActive: Yup.boolean(),
  weightRanges: Yup.array().min(1, 'At least one weight range is required'),
});

// --- Component ---

export default function DeliveryRateForm({ item, onSuccess }: DeliveryRateFormProps) {
  const t = useTranslations('admin.settings');
  const queryClient = useQueryClient();
  const isEditMode = !!(item && item._id);

  // Create mutation
  const { mutateAsync: createRate, isPending: isCreating } = useAdminMutation<
    { success: boolean },
    Record<string, unknown>
  >('post', '/config/delivery-rates');

  // Update mutation
  const { mutateAsync: updateRate, isPending: isUpdating } = useAdminMutation<
    { success: boolean },
    Record<string, unknown>
  >('put', `/config/delivery-rates/${item?._id}`);

  const isSubmitting = isCreating || isUpdating;

  const initialValues: DeliveryRateFormValues = {
    city: item?.city ?? '',
    estimatedDays: item?.estimatedDays ?? '',
    isActive: item?.isActive ?? true,
    weightRanges: (item?.weightRanges ?? []).map((wr) => ({
      minWeight: String(wr.minWeight),
      maxWeight: String(wr.maxWeight),
      price: String(wr.price),
    })),
  };

  const handleSubmit = async (
    values: DeliveryRateFormValues,
    { setFieldError }: FormikHelpers<DeliveryRateFormValues>,
  ) => {
    // Build weight ranges payload
    const weightRanges = values.weightRanges
      .filter((wr) => wr.minWeight && wr.maxWeight && wr.price)
      .map((wr) => ({
        minWeight: Number(wr.minWeight),
        maxWeight: Number(wr.maxWeight),
        price: Number(wr.price),
      }));

    const payload: Record<string, unknown> = {
      city: values.city.trim(),
      estimatedDays: Number(values.estimatedDays),
      isActive: values.isActive,
      weightRanges,
    };

    try {
      if (isEditMode) {
        await updateRate(payload);
        toast.success(t('toast.rateUpdated'));
      } else {
        await createRate(payload);
        toast.success(t('toast.rateCreated'));
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'delivery-rates'] });
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

      if (err?.response?.status === 422 && err.response.data?.errors) {
        const fieldErrors = err.response.data.errors;
        Object.entries(fieldErrors).forEach(([field, message]) => {
          setFieldError(field, message);
        });
      } else {
        const message =
          err?.response?.data?.message || t('toast.rateSaveFailed');
        toast.error(message);
      }
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={deliveryRateValidationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({ values, errors, touched, setFieldValue, handleChange, handleBlur }) => (
        <Form className="flex flex-col gap-4 p-4 overflow-y-auto flex-1">
          {/* City */}
          <div className="space-y-1.5">
            <Label htmlFor="city">{t('form.city')}</Label>
            <Input
              id="city"
              name="city"
              placeholder={t('form.cityPlaceholder')}
              value={values.city}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={!!(touched.city && errors.city)}
            />
            {touched.city && errors.city && (
              <p className="text-xs text-destructive">{errors.city}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {t('form.cityHint')}
            </p>
          </div>

          {/* Estimated Days */}
          <div className="space-y-1.5">
            <Label htmlFor="estimatedDays">{t('form.estimatedDays')}</Label>
            <Input
              id="estimatedDays"
              name="estimatedDays"
              type="number"
              placeholder={t('form.estimatedDaysPlaceholder')}
              value={values.estimatedDays}
              onChange={handleChange}
              onBlur={handleBlur}
              min={1}
              step={1}
              aria-invalid={!!(touched.estimatedDays && errors.estimatedDays)}
            />
            {touched.estimatedDays && errors.estimatedDays && (
              <p className="text-xs text-destructive">{errors.estimatedDays}</p>
            )}
          </div>

          {/* Is Active */}
          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">{t('form.active')}</Label>
            <Switch
              id="isActive"
              checked={values.isActive}
              onCheckedChange={(checked) => setFieldValue('isActive', checked)}
            />
          </div>

          {/* Weight Ranges */}
          <WeightRangesEditor
            weightRanges={values.weightRanges}
            onChange={(ranges) => setFieldValue('weightRanges', ranges)}
          />
          {typeof errors.weightRanges === 'string' && (
            <p className="text-xs text-destructive">{errors.weightRanges}</p>
          )}

          {/* Submit Button */}
          <div className="mt-4">
            <AppButton
              type="submit"
              isLoading={isSubmitting}
              className="w-full"
            >
              {isEditMode ? t('form.updateRate') : t('form.createRate')}
            </AppButton>
          </div>
        </Form>
      )}
    </Formik>
  );
}
