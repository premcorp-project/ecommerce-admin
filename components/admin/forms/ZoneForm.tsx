'use client';

import { KeyboardEvent, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Form, Formik, FormikHelpers } from 'formik';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import * as Yup from 'yup';
import { DeliveryZone } from '@/types/delivery-zones';
import { useAdminMutation } from '@/lib/api/admin-hooks';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AppButton } from '@/components/shared/AppButton';
import { WeightRangesEditor } from './WeightRangesEditor';

// --- Types ---

interface ZoneFormProps {
  item: DeliveryZone | null;
  onSuccess: () => void;
}

interface WeightRangeFormRow {
  minWeight: string;
  maxWeight: string;
  price: string;
}

interface ZoneFormValues {
  name: string;
  country: string;
  cities: string[];
  weightRanges: WeightRangeFormRow[];
  estimatedDays: number | '';
  isActive: boolean;
  isDefault: boolean;
  priority: number;
}

// --- Validation Schema ---

const zoneValidationSchema = Yup.object().shape({
  name: Yup.string().trim().required('Zone name is required'),
  country: Yup.string().trim().required('Country is required'),
  cities: Yup.array().of(Yup.string()),
  estimatedDays: Yup.number()
    .nullable()
    .positive('Must be a positive number')
    .integer('Must be a whole number'),
  isActive: Yup.boolean(),
  isDefault: Yup.boolean(),
  priority: Yup.number().min(0).integer(),
  weightRanges: Yup.array().min(1, 'At least one weight range is required'),
});

// --- Component ---

export default function ZoneForm({ item, onSuccess }: ZoneFormProps) {
  const t = useTranslations('admin.settings');
  const queryClient = useQueryClient();
  const isEditMode = !!(item && item._id);

  const [cityInput, setCityInput] = useState('');

  const { mutateAsync: createZone, isPending: isCreating } = useAdminMutation<
    { success: boolean },
    Record<string, unknown>
  >('post', '/delivery/zones');

  const { mutateAsync: updateZone, isPending: isUpdating } = useAdminMutation<
    { success: boolean },
    Record<string, unknown>
  >('put', `/delivery/zones/${item?._id}`);

  const isSubmitting = isCreating || isUpdating;

  const initialValues: ZoneFormValues = {
    name: item?.name ?? '',
    country: item?.country ?? 'GB',
    cities: item?.cities?.map((c) => c.name) ?? [],
    weightRanges: (item?.weightRanges ?? []).map((wr) => ({
      minWeight: String(wr.minWeight),
      maxWeight: String(wr.maxWeight),
      price: String(wr.price),
    })),
    estimatedDays: item?.estimatedDays ?? '',
    isActive: item?.isActive ?? true,
    isDefault: item?.isDefault ?? false,
    priority: item?.priority ?? 0,
  };

  const handleSubmit = async (
    values: ZoneFormValues,
    { setFieldError }: FormikHelpers<ZoneFormValues>,
  ) => {
    const weightRanges = values.weightRanges
      .filter((wr) => wr.minWeight && wr.maxWeight && wr.price)
      .map((wr) => ({
        minWeight: Number(wr.minWeight),
        maxWeight: Number(wr.maxWeight),
        price: Number(wr.price),
      }));

    const payload: Record<string, unknown> = {
      name: values.name.trim(),
      country: values.country.trim(),
      cities: values.cities,
      weightRanges,
      estimatedDays: values.estimatedDays || null,
      isActive: values.isActive,
      isDefault: values.isDefault,
      priority: values.priority,
    };

    try {
      if (isEditMode) {
        await updateZone(payload);
        toast.success(t('zoneToast.updated'));
      } else {
        await createZone(payload);
        toast.success(t('zoneToast.created'));
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'delivery-zones'] });
      onSuccess();
    } catch (error: unknown) {
      const err = error as {
        response?: {
          status?: number;
          data?: { errors?: Record<string, string>; message?: string };
        };
      };

      if (err?.response?.status === 422 && err.response.data?.errors) {
        const fieldErrors = err.response.data.errors;
        Object.entries(fieldErrors).forEach(([field, message]) => {
          setFieldError(field, message);
        });
      } else {
        const message =
          err?.response?.data?.message || t('zoneToast.saveFailed');
        toast.error(message);
      }
    }
  };

  const handleCityKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    cities: string[],
    setFieldValue: (field: string, value: unknown) => void,
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = cityInput.trim();
      if (value && !cities.includes(value)) {
        setFieldValue('cities', [...cities, value]);
      }
      setCityInput('');
    }
  };

  const removeCity = (
    index: number,
    cities: string[],
    setFieldValue: (field: string, value: unknown) => void,
  ) => {
    setFieldValue(
      'cities',
      cities.filter((_, i) => i !== index),
    );
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={zoneValidationSchema}
      onSubmit={handleSubmit}
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
        <Form className="flex flex-col gap-4 p-4 overflow-y-auto flex-1">
          {/* Zone Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">{t('zoneForm.name')}</Label>
            <Input
              id="name"
              name="name"
              placeholder={t('zoneForm.namePlaceholder')}
              value={values.name}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={!!(touched.name && errors.name)}
            />
            {touched.name && errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Country */}
          <div className="space-y-1.5">
            <Label htmlFor="country">{t('zoneForm.country')}</Label>
            <Input
              id="country"
              name="country"
              placeholder={t('zoneForm.countryPlaceholder')}
              value={values.country}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={!!(touched.country && errors.country)}
            />
            {touched.country && errors.country && (
              <p className="text-xs text-destructive">{errors.country}</p>
            )}
          </div>

          {/* Cities */}
          <div className="space-y-1.5">
            <Label>{t('zoneForm.cities')}</Label>
            <Input
              placeholder={t('zoneForm.citiesPlaceholder')}
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onKeyDown={(e) =>
                handleCityKeyDown(e, values.cities, setFieldValue)
              }
            />
            <p className="text-xs text-muted-foreground">
              {t('zoneForm.citiesHint')}
            </p>
            {values.cities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {values.cities.map((city, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
                  >
                    {city}
                    <button
                      type="button"
                      onClick={() =>
                        removeCity(index, values.cities, setFieldValue)
                      }
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${city}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Weight Ranges */}
          <WeightRangesEditor
            weightRanges={values.weightRanges}
            onChange={(ranges) => setFieldValue('weightRanges', ranges)}
          />
          {typeof errors.weightRanges === 'string' && (
            <p className="text-xs text-destructive">{errors.weightRanges}</p>
          )}

          {/* Estimated Days */}
          <div className="space-y-1.5">
            <Label htmlFor="estimatedDays">{t('zoneForm.estimatedDays')}</Label>
            <Input
              id="estimatedDays"
              name="estimatedDays"
              type="number"
              placeholder={t('zoneForm.estimatedDaysPlaceholder')}
              value={values.estimatedDays}
              onChange={handleChange}
              onBlur={handleBlur}
              min={1}
              step={1}
            />
          </div>

          {/* Is Active */}
          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">{t('zoneForm.active')}</Label>
            <Switch
              id="isActive"
              checked={values.isActive}
              onCheckedChange={(checked) => setFieldValue('isActive', checked)}
            />
          </div>

          {/* Is Default */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="isDefault">{t('zoneForm.default')}</Label>
              <Switch
                id="isDefault"
                checked={values.isDefault}
                onCheckedChange={(checked) =>
                  setFieldValue('isDefault', checked)
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('zoneForm.defaultHint')}
            </p>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <Label htmlFor="priority">{t('zoneForm.priority')}</Label>
            <Input
              id="priority"
              name="priority"
              type="number"
              placeholder="0"
              value={values.priority}
              onChange={handleChange}
              onBlur={handleBlur}
              min={0}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              {t('zoneForm.priorityHint')}
            </p>
          </div>

          {/* Submit */}
          <div className="mt-4">
            <AppButton
              type="submit"
              isLoading={isSubmitting}
              className="w-full"
            >
              {isEditMode ? t('zoneForm.updateZone') : t('zoneForm.createZone')}
            </AppButton>
          </div>
        </Form>
      )}
    </Formik>
  );
}
