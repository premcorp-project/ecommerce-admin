'use client';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Form, Formik, FormikHelpers } from 'formik';
import { Check, ChevronRight, ImagePlus, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import * as Yup from 'yup';
import adminApi from '@/lib/api/admin-api';
import { useAdminMutation } from '@/lib/api/admin-hooks';
import { adminQueryKeys } from '@/lib/api/admin-query-keys';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  validateImageFile,
} from '@/lib/utils/file-validation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AppAlertDialog } from '@/components/shared/AppAlertDialog';
import { AppButton } from '@/components/shared/AppButton';

// --- Types ---

interface Banner {
  _id: string;
  title: string;
  subtitle?: string;
  image?: { url: string; publicId: string } | string;
  mobileImage?: { url: string; publicId: string } | string;
  link?: string;
  ctaText?: string;
  placement?: 'hero' | 'promo' | 'category' | 'popup';
  categorySlug?: string;
  popupDelay?: number;
  popupFrequency?: 'once' | 'session' | 'always';
  isActive: boolean;
  position: number;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
}

interface BannerFormProps {
  item: Banner | null;
  onSuccess: () => void;
}

interface BannerFormValues {
  title: string;
  subtitle: string;
  link: string;
  ctaText: string;
  placement: 'hero' | 'promo' | 'category' | 'popup';
  isActive: boolean;
  position: number;
  startDate: string;
  endDate: string;
  categorySlug?: string;
  popupDelay?: number;
  popupFrequency?: 'once' | 'session' | 'always';
}

interface BannerMutationResponse {
  success: boolean;
  data: Banner;
}

// --- Validation Schema ---

const bannerValidationSchema = Yup.object().shape({
  title: Yup.string().required('Title is required').trim(),
  link: Yup.string().url('Must be a valid URL').optional(),
  isActive: Yup.boolean().required(),
  position: Yup.number()
    .required('Position is required')
    .min(0, 'Position must be 0 or greater')
    .integer('Position must be a whole number'),
});

// --- Stepper Indicator ---

function StepperIndicator({
  currentStep,
  isEditMode,
  onStepClick,
}: {
  currentStep: number;
  isEditMode: boolean;
  onStepClick: (step: number) => void;
}) {
  const t = useTranslations('admin.banners');
  const steps = [t('form.steps.details'), t('form.steps.image')] as const;

  return (
    <nav
      aria-label="Form steps"
      className="flex items-center justify-center gap-0 px-4 py-3"
    >
      {steps.map((label, index) => {
        const stepNum = index + 1;
        const isActive = currentStep === stepNum;
        const isCompleted = currentStep > stepNum;
        const isClickable = isEditMode;

        return (
          <div key={label} className="flex items-center">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick(stepNum)}
              aria-current={isActive ? 'step' : undefined}
              aria-label={`Step ${stepNum}: ${label}${isCompleted ? ' (completed)' : ''}`}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : isCompleted
                    ? 'bg-primary/10 text-primary cursor-pointer'
                    : 'bg-muted text-muted-foreground'
              } ${isClickable ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  isActive
                    ? 'bg-primary-foreground text-primary'
                    : isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted-foreground/20 text-muted-foreground'
                }`}
              >
                {isCompleted ? <Check size={10} /> : stepNum}
              </span>
              <span>{label}</span>
            </button>
            {index < steps.length - 1 && (
              <ChevronRight
                size={14}
                className="mx-1 text-muted-foreground"
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

// --- Component ---

export default function BannerForm({ item, onSuccess }: BannerFormProps) {
  const queryClient = useQueryClient();
  const t = useTranslations('admin.banners');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditMode = !!item;

  const [currentStep, setCurrentStep] = useState(1);
  const [bannerId, setBannerId] = useState<string>(item?._id ?? '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingImageType, setDeletingImageType] = useState<
    'desktop' | 'mobile' | null
  >(null);
  const [currentImage, setCurrentImage] = useState<string | null>(
    item?.image
      ? typeof item.image === 'string'
        ? item.image
        : item.image.url
      : null,
  );
  const [currentMobileImage, setCurrentMobileImage] = useState<string | null>(
    item?.mobileImage
      ? typeof item.mobileImage === 'string'
        ? item.mobileImage
        : item.mobileImage.url
      : null,
  );

  // Initial form values
  const initialValues: BannerFormValues = {
    title: item?.title ?? '',
    subtitle: (item as any)?.subtitle ?? '',
    link: item?.link ?? '',
    ctaText: (item as any)?.ctaText ?? '',
    placement: (item as any)?.placement ?? 'hero',
    isActive: item?.isActive ?? true,
    position: item?.position ?? 0,
    startDate: item?.startDate ? item.startDate.split('T')[0] : '',
    endDate: item?.endDate ? item.endDate.split('T')[0] : '',
    categorySlug: (item as any)?.categorySlug ?? '',
    popupDelay: (item as any)?.popupDelay ?? 5,
    popupFrequency: (item as any)?.popupFrequency ?? 'once',
  };

  // Create mutation
  const { mutateAsync: createBanner, isPending: isCreating } = useAdminMutation<
    BannerMutationResponse,
    BannerFormValues
  >('post', '/banners');

  // Update mutation
  const { mutateAsync: updateBanner, isPending: isUpdating } = useAdminMutation<
    BannerMutationResponse,
    BannerFormValues
  >('put', `/banners/${item?._id}`);

  const isSaving = isCreating || isUpdating;

  // --- Step 1: Form Submit ---

  const handleSubmit = async (
    values: BannerFormValues,
    { setFieldError }: FormikHelpers<BannerFormValues>,
  ) => {
    try {
      let response: BannerMutationResponse;

      // Clean payload — omit empty optional fields, convert dates to full ISO
      const payload: Record<string, unknown> = {
        title: values.title,
        placement: values.placement,
        isActive: values.isActive,
        position: values.position,
      };
      if (values.subtitle) payload.subtitle = values.subtitle;
      if (values.link) payload.link = values.link;
      if (values.ctaText) payload.ctaText = values.ctaText;
      if (values.startDate)
        payload.startDate = new Date(values.startDate).toISOString();
      if (values.endDate)
        payload.endDate = new Date(values.endDate).toISOString();
      if (values.placement === 'category' && values.categorySlug)
        payload.categorySlug = values.categorySlug;
      if (values.placement === 'popup') {
        payload.popupDelay = values.popupDelay;
        payload.popupFrequency = values.popupFrequency;
      }

      if (isEditMode) {
        response = await updateBanner(payload as unknown as BannerFormValues);
      } else {
        response = await createBanner(payload as unknown as BannerFormValues);
      }

      // Unwrap the banner from the response envelope.
      // Backend may return: { data: { _id } } or { data: { banner: { _id } } }
      const bannerObj =
        (response as any)?.data?.banner ??
        (response as any)?.data ??
        (response as any)?.banner ??
        response;
      const id: string = bannerObj?._id ?? '';
      setBannerId(id);

      queryClient.invalidateQueries({ queryKey: adminQueryKeys.banners() });
      toast.success(
        isEditMode
          ? t('form.toast.updateSuccess')
          : t('form.toast.createSuccess'),
      );
      setCurrentStep(2);
    } catch (error: unknown) {
      const err = error as {
        response?: {
          status?: number;
          data?: { errors?: Record<string, string>; message?: string };
        };
      };

      if (err?.response?.status === 422 && err.response.data?.errors) {
        Object.entries(err.response.data.errors).forEach(([field, message]) => {
          setFieldError(field, message);
        });
      } else {
        toast.error(err?.response?.data?.message || t('form.toast.saveFailed'));
      }
    }
  };

  // --- Step 2: Image Upload ---

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadBannerImage(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBannerDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await uploadBannerImage(file);
  };

  const uploadBannerImage = async (file: File) => {
    if (!bannerId) {
      setUploadError(
        'Banner ID is missing — please save the banner details first.',
      );
      return;
    }

    const validation = validateImageFile(file.size, file.type);
    if (!validation.valid) {
      setUploadError(validation.error ?? 'Invalid file');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      await adminApi.post(`/banners/${bannerId}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setCurrentImage(URL.createObjectURL(file));
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.banners() });
      toast.success(t('form.image.uploadSuccess'));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error?.response?.data?.message;
      toast.error(msg || t('form.image.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleStepClick = (step: number) => {
    if (isEditMode) setCurrentStep(step);
  };

  // --- Render ---

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Stepper */}
      <StepperIndicator
        currentStep={currentStep}
        isEditMode={isEditMode}
        onStepClick={handleStepClick}
      />
      <div className="border-t" />

      {/* Step 1: Details */}
      {currentStep === 1 && (
        <Formik
          initialValues={initialValues}
          validationSchema={bannerValidationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({
            errors,
            touched,
            values,
            setFieldValue,
            handleChange,
            handleBlur,
          }) => (
            <Form className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <Label htmlFor="banner-title">{`${t('form.title')} *`}</Label>
                  <Input
                    id="banner-title"
                    name="title"
                    placeholder={t('form.titlePlaceholder')}
                    value={values.title}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={!!(errors.title && touched.title)}
                  />
                  {errors.title && touched.title && (
                    <p className="text-xs text-destructive">{errors.title}</p>
                  )}
                </div>

                {/* Subtitle */}
                <div className="space-y-1.5">
                  <Label htmlFor="banner-subtitle">{t('form.subtitle')}</Label>
                  <Input
                    id="banner-subtitle"
                    name="subtitle"
                    placeholder={t('form.subtitlePlaceholder')}
                    value={values.subtitle}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </div>

                {/* Link */}
                <div className="space-y-1.5">
                  <Label htmlFor="banner-link">{t('form.link')}</Label>
                  <Input
                    id="banner-link"
                    name="link"
                    placeholder={t('form.linkPlaceholder')}
                    value={values.link}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={!!(errors.link && touched.link)}
                  />
                  {errors.link && touched.link && (
                    <p className="text-xs text-destructive">{errors.link}</p>
                  )}
                </div>

                {/* CTA Text */}
                <div className="space-y-1.5">
                  <Label htmlFor="banner-ctaText">{t('form.ctaText')}</Label>
                  <Input
                    id="banner-ctaText"
                    name="ctaText"
                    placeholder={t('form.ctaTextPlaceholder')}
                    value={values.ctaText}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </div>

                {/* Placement */}
                <div className="space-y-1.5">
                  <Label htmlFor="banner-placement">
                    {t('form.placement')}
                  </Label>
                  <select
                    id="banner-placement"
                    name="placement"
                    value={values.placement}
                    onChange={handleChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="hero">{t('form.placementHero')}</option>
                    <option value="promo">{t('form.placementPromo')}</option>
                    <option value="category">
                      {t('form.placementCategory')}
                    </option>
                    <option value="popup">{t('form.placementPopup')}</option>
                  </select>
                </div>

                {/* Category Slug — only for category placement */}
                {values.placement === 'category' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="banner-categorySlug">
                      {t('form.categorySlug')}
                    </Label>
                    <Input
                      id="banner-categorySlug"
                      name="categorySlug"
                      placeholder={t('form.categorySlugPlaceholder')}
                      value={(values as any).categorySlug ?? ''}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('form.categorySlugHint')}
                    </p>
                  </div>
                )}

                {/* Popup settings — only for popup placement */}
                {values.placement === 'popup' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="banner-popupDelay">
                        {t('form.popupDelay')}
                      </Label>
                      <Input
                        id="banner-popupDelay"
                        name="popupDelay"
                        type="number"
                        min={0}
                        value={(values as any).popupDelay ?? 5}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="banner-popupFrequency">
                        {t('form.popupFrequency')}
                      </Label>
                      <select
                        id="banner-popupFrequency"
                        name="popupFrequency"
                        value={(values as any).popupFrequency ?? 'once'}
                        onChange={handleChange}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="once">{t('form.frequencyOnce')}</option>
                        <option value="session">
                          {t('form.frequencySession')}
                        </option>
                        <option value="always">
                          {t('form.frequencyAlways')}
                        </option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Scheduling — Start/End Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="banner-startDate">
                      {t('form.startDate')}
                    </Label>
                    <Input
                      id="banner-startDate"
                      name="startDate"
                      type="date"
                      value={values.startDate}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('form.startDateHint')}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="banner-endDate">{t('form.endDate')}</Label>
                    <Input
                      id="banner-endDate"
                      name="endDate"
                      type="date"
                      value={values.endDate}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('form.endDateHint')}
                    </p>
                  </div>
                </div>

                {/* Position */}
                <div className="space-y-1.5">
                  <Label htmlFor="banner-position">{`${t('form.position')} *`}</Label>
                  <Input
                    id="banner-position"
                    name="position"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={values.position}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={!!(errors.position && touched.position)}
                  />
                  {errors.position && touched.position && (
                    <p className="text-xs text-destructive">
                      {errors.position}
                    </p>
                  )}
                </div>

                {/* Is Active Toggle */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="banner-isActive">{t('form.active')}</Label>
                  <Switch
                    id="banner-isActive"
                    checked={values.isActive}
                    onCheckedChange={(checked) =>
                      setFieldValue('isActive', checked)
                    }
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="border-t p-4">
                <AppButton
                  type="submit"
                  isLoading={isSaving}
                  className="w-full"
                >
                  {isEditMode
                    ? t('form.saveAndContinue')
                    : t('form.createAndContinue')}
                </AppButton>
              </div>
            </Form>
          )}
        </Formik>
      )}

      {/* Step 2: Image Upload */}
      {currentStep === 2 && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium">{t('form.image.title')}</h3>
              <p className="text-xs text-muted-foreground">
                {t('form.image.description')}
              </p>
            </div>

            {/* Dimension & format guidance */}
            <div className="rounded-md border border-border bg-muted/50 p-3 space-y-1.5">
              <p className="text-xs font-medium text-foreground">
                {t('form.image.guideTitle')}
              </p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                <li>{t('form.image.guideDimensions')}</li>
                <li>{t('form.image.guideRatio')}</li>
                <li>{t('form.image.guideFormats')}</li>
                <li>{t('form.image.guideSize')}</li>
                <li>{t('form.image.guideTip')}</li>
              </ul>
            </div>

            {/* Desktop image preview */}
            {currentImage && (
              <div className="relative rounded-md border overflow-hidden group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentImage}
                  alt="Desktop Banner"
                  className="w-full max-h-44 object-contain bg-muted"
                />
                <button
                  type="button"
                  onClick={() => setDeletingImageType('desktop')}
                  className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                  aria-label={t('form.image.deleteImage')}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Upload area — supports drag & drop */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={handleBannerDrop}
              className={`rounded-md border-2 border-dashed p-6 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <ImagePlus
                className={`mx-auto mb-2 h-8 w-8 transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`}
                aria-hidden="true"
              />
              <p className="text-sm font-medium">
                {isDragging
                  ? 'Drop image here'
                  : currentImage
                    ? t('form.image.replace')
                    : t('form.image.upload')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Drag & drop or click — {t('form.image.fileTypes')}
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_IMAGE_MIME_TYPES.join(',')}
                onChange={handleFileSelect}
                className="hidden"
                id="banner-image-upload"
                aria-label="Select banner image"
              />

              <AppButton
                type="button"
                variant="secondary"
                className="mt-4"
                isLoading={isUploading}
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<Upload size={16} />}
              >
                {t('form.image.chooseFile')}
              </AppButton>
            </div>

            {uploadError && (
              <p className="text-xs text-destructive" role="alert">
                {uploadError}
              </p>
            )}

            {/* Mobile Image Section */}
            <div className="border-t border-border pt-4 mt-2 space-y-3">
              <div className="space-y-1">
                <h3 className="text-sm font-medium">
                  {t('form.mobileImage.title')}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t('form.mobileImage.description')}
                </p>
              </div>

              {/* Mobile dimensions guide */}
              <div className="rounded-md border border-border bg-muted/50 p-3 space-y-1.5">
                <p className="text-xs font-medium text-foreground">
                  {t('form.mobileImage.guideTitle')}
                </p>
                <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                  <li>{t('form.mobileImage.guideDimensions')}</li>
                  <li>{t('form.mobileImage.guideSafeZone')}</li>
                  <li>{t('form.mobileImage.guideFormats')}</li>
                  <li>{t('form.mobileImage.guideSize')}</li>
                </ul>
              </div>

              {/* Detailed safe zone guide (collapsible) */}
              <details className="rounded-md border border-border bg-muted/30">
                <summary className="px-3 py-2 text-xs font-medium text-foreground cursor-pointer select-none hover:bg-muted/50 transition-colors">
                  {t('form.image.mobileGuideTitle')}
                </summary>
                <div className="px-3 pb-3 pt-1 text-xs text-muted-foreground space-y-1.5 border-t border-border">
                  <p>{t('form.image.mobileGuideCanvas')}</p>
                  <p>{t('form.image.mobileGuideSafeZone')}</p>
                  <p>{t('form.image.mobileGuideRule')}</p>
                </div>
              </details>

              {/* Mobile image preview */}
              {currentMobileImage && (
                <div className="relative rounded-md border overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentMobileImage}
                    alt="Mobile Banner"
                    className="w-full max-h-40 object-contain bg-muted"
                  />
                  <button
                    type="button"
                    onClick={() => setDeletingImageType('mobile')}
                    className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                    aria-label={t('form.mobileImage.delete')}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Mobile upload drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (!file || !bannerId) return;
                  setIsUploading(true);
                  try {
                    const formData = new FormData();
                    formData.append('image', file);
                    await adminApi.post(
                      `/banners/${bannerId}/mobile-image`,
                      formData,
                      {
                        headers: { 'Content-Type': 'multipart/form-data' },
                      },
                    );
                    setCurrentMobileImage(URL.createObjectURL(file));
                    queryClient.invalidateQueries({
                      queryKey: adminQueryKeys.banners(),
                    });
                    toast.success(t('form.mobileImage.uploadSuccess'));
                  } catch {
                    toast.error(t('form.mobileImage.uploadFailed'));
                  } finally {
                    setIsUploading(false);
                  }
                }}
                className={`rounded-md border-2 border-dashed p-4 text-center transition-colors ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <ImagePlus
                  className={`mx-auto mb-1.5 h-6 w-6 transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`}
                  aria-hidden="true"
                />
                <p className="text-xs font-medium">
                  {currentMobileImage
                    ? t('form.mobileImage.replace')
                    : t('form.mobileImage.upload')}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {t('form.mobileImage.dropHint')}
                </p>

                <AppButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  isLoading={isUploading}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = async (ev) => {
                      const file = (ev.target as HTMLInputElement).files?.[0];
                      if (!file || !bannerId) return;
                      setIsUploading(true);
                      try {
                        const formData = new FormData();
                        formData.append('image', file);
                        await adminApi.post(
                          `/banners/${bannerId}/mobile-image`,
                          formData,
                          {
                            headers: { 'Content-Type': 'multipart/form-data' },
                          },
                        );
                        setCurrentMobileImage(URL.createObjectURL(file));
                        queryClient.invalidateQueries({
                          queryKey: adminQueryKeys.banners(),
                        });
                        toast.success(t('form.mobileImage.uploadSuccess'));
                      } catch {
                        toast.error(t('form.mobileImage.uploadFailed'));
                      } finally {
                        setIsUploading(false);
                      }
                    };
                    input.click();
                  }}
                  leftIcon={<Upload size={14} />}
                >
                  {t('form.image.chooseFile')}
                </AppButton>
              </div>
            </div>
          </div>

          {/* Delete image confirmation dialog */}
          {deletingImageType && (
            <AppAlertDialog
              open={!!deletingImageType}
              onOpenChange={(open) => !open && setDeletingImageType(null)}
              title={
                deletingImageType === 'desktop'
                  ? t('form.image.deleteImage')
                  : t('form.mobileImage.delete')
              }
              subTitle={t('form.image.deleteConfirm')}
              variant="delete"
              confirmLabel={t('form.image.deleteImage')}
              onConfirm={async () => {
                if (!bannerId) return;
                const endpoint =
                  deletingImageType === 'desktop' ? 'image' : 'mobile-image';
                try {
                  await adminApi.delete(`/banners/${bannerId}/${endpoint}`);
                  if (deletingImageType === 'desktop') setCurrentImage(null);
                  else setCurrentMobileImage(null);
                  await queryClient.invalidateQueries({
                    queryKey: adminQueryKeys.banners(),
                  });
                  toast.success(
                    deletingImageType === 'desktop'
                      ? t('form.image.deleteSuccess')
                      : t('form.mobileImage.deleteSuccess'),
                  );
                } catch {
                  toast.error(
                    deletingImageType === 'desktop'
                      ? t('form.image.deleteFailed')
                      : t('form.mobileImage.deleteFailed'),
                  );
                } finally {
                  setDeletingImageType(null);
                }
              }}
            />
          )}

          {/* Footer */}
          <div className="border-t p-4 flex gap-2">
            <AppButton
              type="button"
              variant="mute"
              className="flex-1"
              onClick={() => setCurrentStep(1)}
            >
              {t('form.image.back')}
            </AppButton>
            <AppButton type="button" className="flex-1" onClick={onSuccess}>
              {t('form.image.done')}
            </AppButton>
          </div>
        </div>
      )}
    </div>
  );
}
