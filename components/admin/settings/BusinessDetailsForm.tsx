'use client';

/**
 * BusinessDetailsForm — business info, address, hours, and social links.
 *
 * Fetches from GET /config and saves via PUT /config.
 * Separate from PlatformConfigForm to keep files under 200 lines.
 */
import { useQueryClient } from '@tanstack/react-query';
import { Form, Formik, FormikHelpers } from 'formik';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import * as Yup from 'yup';
import { useAdminMutation, useAdminQuery } from '@/lib/api/admin-hooks';
import { adminQueryKeys } from '@/lib/api/admin-query-keys';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppButton } from '@/components/shared/AppButton';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BusinessFormValues {
  businessName: string;
  businessDescription: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  businessCity: string;
  businessPostcode: string;
  businessCountry: string;
  businessHours: string;
  businessLatitude: string;
  businessLongitude: string;
  socialFacebook: string;
  socialInstagram: string;
  socialTwitter: string;
  socialLinkedin: string;
  socialYoutube: string;
  socialTiktok: string;
}

interface BusinessDetailsFormProps {
  canWrite: boolean;
}

// ─── Validation ───────────────────────────────────────────────────────────────

const schema = Yup.object().shape({
  businessName: Yup.string(),
  businessDescription: Yup.string(),
  businessPhone: Yup.string(),
  businessEmail: Yup.string().email('Must be a valid email'),
  businessAddress: Yup.string(),
  businessCity: Yup.string(),
  businessPostcode: Yup.string(),
  businessCountry: Yup.string(),
  businessHours: Yup.string(),
  businessLatitude: Yup.number().min(-90).max(90).nullable(),
  businessLongitude: Yup.number().min(-180).max(180).nullable(),
  socialFacebook: Yup.string().url('Must be a valid URL').nullable(),
  socialInstagram: Yup.string().url('Must be a valid URL').nullable(),
  socialTwitter: Yup.string().url('Must be a valid URL').nullable(),
  socialLinkedin: Yup.string().url('Must be a valid URL').nullable(),
  socialYoutube: Yup.string().url('Must be a valid URL').nullable(),
  socialTiktok: Yup.string().url('Must be a valid URL').nullable(),
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function BusinessDetailsForm({
  canWrite,
}: BusinessDetailsFormProps) {
  const t = useTranslations('admin.settings');
  const queryClient = useQueryClient();

  const { data: configData, isLoading } = useAdminQuery<any>(
    adminQueryKeys.settings(),
    '/config',
  );

  const { mutateAsync: updateConfig, isPending } = useAdminMutation<
    { success: boolean },
    Record<string, unknown>
  >('put', '/config');

  const cfg = (configData as any)?.data?.config ?? configData?.config;

  const initialValues: BusinessFormValues = {
    businessName: cfg?.businessName ?? '',
    businessDescription: cfg?.businessDescription ?? '',
    businessPhone: cfg?.businessPhone ?? '',
    businessEmail: cfg?.businessEmail ?? '',
    businessAddress: cfg?.businessAddress ?? '',
    businessCity: cfg?.businessCity ?? '',
    businessPostcode: cfg?.businessPostcode ?? '',
    businessCountry: cfg?.businessCountry ?? '',
    businessHours: cfg?.businessHours ?? '',
    businessLatitude:
      cfg?.businessLatitude != null ? String(cfg.businessLatitude) : '',
    businessLongitude:
      cfg?.businessLongitude != null ? String(cfg.businessLongitude) : '',
    socialFacebook: cfg?.socialLinks?.facebook ?? '',
    socialInstagram: cfg?.socialLinks?.instagram ?? '',
    socialTwitter: cfg?.socialLinks?.twitter ?? '',
    socialLinkedin: cfg?.socialLinks?.linkedin ?? '',
    socialYoutube: cfg?.socialLinks?.youtube ?? '',
    socialTiktok: cfg?.socialLinks?.tiktok ?? '',
  };

  const handleSubmit = async (
    values: BusinessFormValues,
    { setFieldError }: FormikHelpers<BusinessFormValues>,
  ) => {
    const payload: Record<string, unknown> = {
      ...(values.businessName.trim() && {
        businessName: values.businessName.trim(),
      }),
      ...(values.businessDescription.trim() && {
        businessDescription: values.businessDescription.trim(),
      }),
      ...(values.businessPhone.trim() && {
        businessPhone: values.businessPhone.trim(),
      }),
      ...(values.businessEmail.trim() && {
        businessEmail: values.businessEmail.trim(),
      }),
      ...(values.businessAddress.trim() && {
        businessAddress: values.businessAddress.trim(),
      }),
      ...(values.businessCity.trim() && {
        businessCity: values.businessCity.trim(),
      }),
      ...(values.businessPostcode.trim() && {
        businessPostcode: values.businessPostcode.trim(),
      }),
      ...(values.businessCountry.trim() && {
        businessCountry: values.businessCountry.trim(),
      }),
      ...(values.businessHours.trim() && {
        businessHours: values.businessHours.trim(),
      }),
      businessLatitude:
        values.businessLatitude !== '' ? Number(values.businessLatitude) : null,
      businessLongitude:
        values.businessLongitude !== ''
          ? Number(values.businessLongitude)
          : null,
      socialLinks: {
        facebook: values.socialFacebook.trim() || undefined,
        instagram: values.socialInstagram.trim() || undefined,
        twitter: values.socialTwitter.trim() || undefined,
        linkedin: values.socialLinkedin.trim() || undefined,
        youtube: values.socialYoutube.trim() || undefined,
        tiktok: values.socialTiktok.trim() || undefined,
      },
    };

    try {
      await updateConfig(payload);
      toast.success(t('toast.configUpdated'));
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
    } catch (error: unknown) {
      const err = error as {
        response?: {
          status?: number;
          data?: { errors?: Record<string, string>; message?: string };
        };
      };
      if (err?.response?.status === 422 && err.response.data?.errors) {
        Object.entries(err.response.data.errors).forEach(([field, msg]) =>
          setFieldError(field, msg),
        );
      } else {
        toast.error(
          err?.response?.data?.message || t('toast.configUpdateFailed'),
        );
      }
    }
  };

  if (isLoading) {
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-medium">{t('businessDetails')}</h2>
        <div className="rounded-md border p-6 animate-pulse space-y-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-10 rounded bg-muted" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium">{t('businessDetails')}</h2>
      <Formik
        initialValues={initialValues}
        validationSchema={schema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, errors, touched, handleChange, handleBlur }) => (
          <Form className="rounded-md border p-6 space-y-6">
            {/* Business Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="businessName">{t('form.businessName')}</Label>
                <Input
                  id="businessName"
                  name="businessName"
                  value={values.businessName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={!canWrite}
                  placeholder="OttimoDirect Ltd"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="businessEmail">{t('form.businessEmail')}</Label>
                <Input
                  id="businessEmail"
                  name="businessEmail"
                  type="email"
                  value={values.businessEmail}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={!canWrite}
                  placeholder="hello@chemibuild.com"
                />
                {touched.businessEmail && errors.businessEmail && (
                  <p className="text-xs text-destructive">
                    {errors.businessEmail}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="businessPhone">{t('form.businessPhone')}</Label>
                <Input
                  id="businessPhone"
                  name="businessPhone"
                  value={values.businessPhone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={!canWrite}
                  placeholder="+44 1234 567890"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="businessDescription">
                  {t('form.businessDescription')}
                </Label>
                <textarea
                  id="businessDescription"
                  name="businessDescription"
                  value={values.businessDescription}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={!canWrite}
                  rows={2}
                  placeholder="Professional chemical and cleaning products supplier"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <p className="text-sm font-medium text-foreground mb-3">
                {t('form.businessAddressSection')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="businessAddress">
                    {t('form.businessAddress')}
                  </Label>
                  <Input
                    id="businessAddress"
                    name="businessAddress"
                    value={values.businessAddress}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={!canWrite}
                    placeholder="12 Industrial Park"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="businessCity">{t('form.city')}</Label>
                  <Input
                    id="businessCity"
                    name="businessCity"
                    value={values.businessCity}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={!canWrite}
                    placeholder="Birmingham"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="businessPostcode">{t('form.postcode')}</Label>
                  <Input
                    id="businessPostcode"
                    name="businessPostcode"
                    value={values.businessPostcode}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={!canWrite}
                    placeholder="B1 1AA"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="businessCountry">{t('form.country')}</Label>
                  <Input
                    id="businessCountry"
                    name="businessCountry"
                    value={values.businessCountry}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={!canWrite}
                    placeholder="United Kingdom"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="businessLatitude">{t('form.latitude')}</Label>
                  <Input
                    id="businessLatitude"
                    name="businessLatitude"
                    type="number"
                    step="any"
                    value={values.businessLatitude}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={!canWrite}
                    placeholder="53.7938"
                  />
                  {touched.businessLatitude && errors.businessLatitude && (
                    <p className="text-xs text-destructive">
                      {errors.businessLatitude}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="businessLongitude">
                    {t('form.longitude')}
                  </Label>
                  <Input
                    id="businessLongitude"
                    name="businessLongitude"
                    type="number"
                    step="any"
                    value={values.businessLongitude}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={!canWrite}
                    placeholder="-1.7564"
                  />
                  {touched.businessLongitude && errors.businessLongitude && (
                    <p className="text-xs text-destructive">
                      {errors.businessLongitude}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Hours */}
            <div className="space-y-1.5">
              <Label htmlFor="businessHours">{t('form.businessHours')}</Label>
              <textarea
                id="businessHours"
                name="businessHours"
                value={values.businessHours}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={!canWrite}
                rows={2}
                placeholder="Mon-Fri 9am-5pm, Sat 10am-2pm"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Social Links */}
            <div>
              <p className="text-sm font-medium text-foreground mb-3">
                {t('form.socialLinks')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="socialFacebook">Facebook</Label>
                  <Input
                    id="socialFacebook"
                    name="socialFacebook"
                    value={values.socialFacebook}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={!canWrite}
                    placeholder="https://facebook.com/..."
                  />
                  {touched.socialFacebook && errors.socialFacebook && (
                    <p className="text-xs text-destructive">
                      {errors.socialFacebook}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="socialInstagram">Instagram</Label>
                  <Input
                    id="socialInstagram"
                    name="socialInstagram"
                    value={values.socialInstagram}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={!canWrite}
                    placeholder="https://instagram.com/..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="socialTwitter">Twitter / X</Label>
                  <Input
                    id="socialTwitter"
                    name="socialTwitter"
                    value={values.socialTwitter}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={!canWrite}
                    placeholder="https://x.com/..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="socialLinkedin">LinkedIn</Label>
                  <Input
                    id="socialLinkedin"
                    name="socialLinkedin"
                    value={values.socialLinkedin}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={!canWrite}
                    placeholder="https://linkedin.com/..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="socialYoutube">YouTube</Label>
                  <Input
                    id="socialYoutube"
                    name="socialYoutube"
                    value={values.socialYoutube}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={!canWrite}
                    placeholder="https://youtube.com/..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="socialTiktok">TikTok</Label>
                  <Input
                    id="socialTiktok"
                    name="socialTiktok"
                    value={values.socialTiktok}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={!canWrite}
                    placeholder="https://tiktok.com/..."
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            {canWrite && (
              <div className="pt-2">
                <AppButton type="submit" isLoading={isPending}>
                  {t('form.saveSettings')}
                </AppButton>
              </div>
            )}
          </Form>
        )}
      </Formik>
    </section>
  );
}
