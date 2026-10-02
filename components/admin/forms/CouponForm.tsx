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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAdminMutation } from '@/lib/api/admin-hooks';

// --- Types ---

interface Coupon {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrderAmount?: number;
  expiryDate: string;
  usageLimit?: number;
  usageCount: number;
  perUserLimit: number | null;
  isActive: boolean;
  createdAt?: string;
}

interface CouponFormProps {
  item: Coupon | null;
  onSuccess: () => void;
}

interface CouponFormValues {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number | '';
  minimumOrderAmount: number | '';
  usageLimit: number | '';
  expiryDate: string;
  isActive: boolean;
  /** 'unlimited' sentinel maps to null on submit */
  perUserLimit: number | 'unlimited';
}

// --- Validation Schema ---

const couponValidationSchema = Yup.object().shape({
  code: Yup.string()
    .required('Coupon code is required'),
  discountType: Yup.string()
    .required('Discount type is required')
    .oneOf(['percentage', 'fixed'], 'Must be percentage or fixed'),
  discountValue: Yup.number()
    .required('Discount value is required')
    .positive('Must be a positive number')
    .when('discountType', {
      is: 'percentage',
      then: (schema) => schema.max(100, 'Percentage cannot exceed 100'),
    }),
  minimumOrderAmount: Yup.number()
    .nullable()
    .transform((value, original) => (original === '' ? null : value))
    .positive('Must be a positive number'),
  usageLimit: Yup.number()
    .required('Usage limit is required')
    .positive('Must be a positive number')
    .integer('Must be a whole number'),
  expiryDate: Yup.string().required('Expiry date is required'),
  isActive: Yup.boolean(),
  perUserLimit: Yup.mixed().required(),
});

// --- Helpers ---

function formatDateForInput(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
}

// --- Component ---

export default function CouponForm({ item, onSuccess }: CouponFormProps) {
  const queryClient = useQueryClient();
  const t = useTranslations('admin.coupons');
  const isEditMode = !!item;

  // Create mutation
  const { mutateAsync: createCoupon, isPending: isCreating } = useAdminMutation<
    { success: boolean; data: Coupon },
    Record<string, unknown>
  >('post', '/catalog/coupons');

  // Update mutation
  const { mutateAsync: updateCoupon, isPending: isUpdating } = useAdminMutation<
    { success: boolean; data: Coupon },
    Record<string, unknown>
  >('put', `/catalog/coupons/${item?._id}`);

  const isSubmitting = isCreating || isUpdating;

  const initialValues: CouponFormValues = {
    code: item?.code ?? '',
    discountType: item?.discountType ?? 'percentage',
    discountValue: item?.discountValue ?? '',
    minimumOrderAmount: item?.minimumOrderAmount ?? '',
    usageLimit: item?.usageLimit ?? '',
    expiryDate: formatDateForInput(item?.expiryDate) || '',
    isActive: item?.isActive ?? true,
    perUserLimit: item?.perUserLimit ?? 'unlimited',
  };

  const handleSubmit = async (
    values: CouponFormValues,
    { setFieldError }: FormikHelpers<CouponFormValues>,
  ) => {
    const payload: Record<string, unknown> = {
      code: values.code.toUpperCase(),
      discountType: values.discountType,
      discountValue: Number(values.discountValue),
      expiryDate: new Date(values.expiryDate + 'T23:59:59Z').toISOString(),
      isActive: values.isActive,
    };

    if (values.minimumOrderAmount !== '') {
      payload.minimumOrderAmount = Number(values.minimumOrderAmount);
    }
    payload.usageLimit = Number(values.usageLimit);
    payload.perUserLimit = values.perUserLimit === 'unlimited' ? null : Number(values.perUserLimit);

    try {
      if (isEditMode) {
        await updateCoupon(payload);
        toast.success(t('form.toast.updateSuccess'));
      } else {
        await createCoupon(payload);
        toast.success(t('form.toast.createSuccess'));
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
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
          err?.response?.data?.message || t('form.toast.saveFailed');
        toast.error(message);
      }
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={couponValidationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({ values, errors, touched, setFieldValue, handleChange, handleBlur }) => (
        <Form className="flex flex-col gap-4 p-4 overflow-y-auto flex-1">
          {/* Code */}
          <div className="space-y-1.5">
            <Label htmlFor="code">{t('form.code')}</Label>
            <Input
              id="code"
              name="code"
              placeholder={t('form.codePlaceholder')}
              value={values.code}
              onChange={handleChange}
              onBlur={handleBlur}
              className="uppercase"
              aria-invalid={!!(touched.code && errors.code)}
            />
            {touched.code && errors.code && (
              <p className="text-xs text-destructive">{errors.code}</p>
            )}
          </div>

          {/* Discount Type */}
          <div className="space-y-1.5">
            <Label htmlFor="discountType">{t('form.discountType')}</Label>
            <Select
              value={values.discountType}
              onValueChange={(val) => setFieldValue('discountType', val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('form.discountTypePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">{t('form.percentage')}</SelectItem>
                <SelectItem value="fixed">{t('form.fixed')}</SelectItem>
              </SelectContent>
            </Select>
            {touched.discountType && errors.discountType && (
              <p className="text-xs text-destructive">{errors.discountType}</p>
            )}
          </div>

          {/* Discount Value */}
          <div className="space-y-1.5">
            <Label htmlFor="discountValue">
              {values.discountType === 'percentage' ? t('form.discountValuePercent') : t('form.discountValueFixed')}
            </Label>
            <Input
              id="discountValue"
              name="discountValue"
              type="number"
              placeholder={values.discountType === 'percentage' ? '0-100' : '0.00'}
              value={values.discountValue}
              onChange={handleChange}
              onBlur={handleBlur}
              min={0}
              max={values.discountType === 'percentage' ? 100 : undefined}
              step={values.discountType === 'percentage' ? 1 : 0.01}
              aria-invalid={!!(touched.discountValue && errors.discountValue)}
            />
            {touched.discountValue && errors.discountValue && (
              <p className="text-xs text-destructive">{errors.discountValue}</p>
            )}
          </div>

          {/* Minimum Order Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="minimumOrderAmount">{t('form.minimumOrderAmount')}</Label>
            <Input
              id="minimumOrderAmount"
              name="minimumOrderAmount"
              type="number"
              placeholder={t('form.minimumOrderPlaceholder')}
              value={values.minimumOrderAmount}
              onChange={handleChange}
              onBlur={handleBlur}
              min={0}
              step={0.01}
              aria-invalid={!!(touched.minimumOrderAmount && errors.minimumOrderAmount)}
            />
            {touched.minimumOrderAmount && errors.minimumOrderAmount && (
              <p className="text-xs text-destructive">{errors.minimumOrderAmount}</p>
            )}
          </div>

          {/* Usage Limit */}
          <div className="space-y-1.5">
            <Label htmlFor="usageLimit">{t('form.usageLimit')}</Label>
            <Input
              id="usageLimit"
              name="usageLimit"
              type="number"
              placeholder={t('form.usageLimitPlaceholder')}
              value={values.usageLimit}
              onChange={handleChange}
              onBlur={handleBlur}
              min={0}
              step={1}
              aria-invalid={!!(touched.usageLimit && errors.usageLimit)}
            />
            {touched.usageLimit && errors.usageLimit && (
              <p className="text-xs text-destructive">{errors.usageLimit}</p>
            )}
          </div>

          {/* Per Customer Limit */}
          <div className="space-y-1.5">
            <Label htmlFor="perUserLimit">{t('form.perUserLimit')}</Label>
            <p className="text-xs text-muted-foreground">{t('form.perUserLimitDescription')}</p>
            <Select
              value={String(values.perUserLimit)}
              onValueChange={(val) =>
                setFieldValue('perUserLimit', val === 'unlimited' ? 'unlimited' : Number(val))
              }
            >
              <SelectTrigger id="perUserLimit" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unlimited">{t('form.perUserLimitOptions.unlimited')}</SelectItem>
                <SelectItem value="1">{t('form.perUserLimitOptions.oneTime')}</SelectItem>
                <SelectItem value="2">{t('form.perUserLimitOptions.nTimes', { n: 2 })}</SelectItem>
                <SelectItem value="3">{t('form.perUserLimitOptions.nTimes', { n: 3 })}</SelectItem>
                <SelectItem value="5">{t('form.perUserLimitOptions.nTimes', { n: 5 })}</SelectItem>
                <SelectItem value="10">{t('form.perUserLimitOptions.nTimes', { n: 10 })}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Expiry Date */}
          <div className="space-y-1.5">
            <Label htmlFor="expiryDate">{t('form.expiryDate')}</Label>
            <Input
              id="expiryDate"
              name="expiryDate"
              type="date"
              value={values.expiryDate}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={!!(touched.expiryDate && errors.expiryDate)}
            />
            {touched.expiryDate && errors.expiryDate && (
              <p className="text-xs text-destructive">{errors.expiryDate}</p>
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

          {/* Submit Button */}
          <div className="mt-4">
            <AppButton
              type="submit"
              isLoading={isSubmitting}
              className="w-full"
            >
              {isEditMode ? t('form.updateCoupon') : t('form.createCoupon')}
            </AppButton>
          </div>
        </Form>
      )}
    </Formik>
  );
}
