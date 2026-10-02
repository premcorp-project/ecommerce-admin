'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Form, Formik, FormikHelpers } from 'formik';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { useAdminMutation } from '@/lib/api/admin-hooks';
import { ApiErrorResponse } from '@/types';

import { AppButton } from '@/components/shared/AppButton';
import AppRichEditor from '@/components/shared/text-editor/AppRichEditor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

import { CascadingCategorySelect } from './CascadingCategorySelect';
import { TagPicker } from './TagPicker';
import { productValidationSchema, slugify } from './schema';
import { Category, Product, ProductFormValues, ProductMutationPayload } from './types';

interface StepBasicInfoProps {
  item: Product | null;
  categories: Category[];
  isEditMode: boolean;
  onSubmitSuccess: (productId: string, product?: Product) => void;
}

export function StepBasicInfo({ item, categories, isEditMode, onSubmitSuccess }: StepBasicInfoProps) {
  const queryClient = useQueryClient();
  const t = useTranslations('admin.products');

  const [selectedTags, setSelectedTags] = useState<string[]>(
    (item as any)?.tags?.map((t: any) => (typeof t === 'string' ? t : t._id)) ?? [],
  );

  const initialValues: ProductFormValues = {
    name: item?.name ?? '',
    slug: item?.slug ?? '',
    description: item?.description ?? '',
    category: item?.category?._id ?? '',
    isFeatured: item?.isFeatured ?? false,
    status: item?.status ?? 'draft',
  };

  const { mutateAsync: createProduct, isPending: isCreating } = useAdminMutation<
    { success: boolean; product: Product },
    ProductMutationPayload
  >('post', '/catalog/products');

  const { mutateAsync: updateProduct, isPending: isUpdating } = useAdminMutation<
    { success: boolean; product: Product },
    ProductMutationPayload & { _id: string }
  >('put', (variables) => `/catalog/products/${variables._id}`);

  const isSaving = isCreating || isUpdating;

  const handleSubmit = async (
    values: ProductFormValues,
    { setFieldError }: FormikHelpers<ProductFormValues>,
  ) => {
    const payload: ProductMutationPayload = {
      name: values.name.trim(),
      slug: values.slug.trim(),
      description: values.description,
      category: values.category,
      isFeatured: values.isFeatured,
      tags: selectedTags,
      ...(isEditMode && { status: values.status }),
    };

    try {
      let productId: string;
      let savedProduct: Product | undefined;

      if (isEditMode && item) {
        const result = await updateProduct({ ...payload, _id: item._id });
        toast.success(t('form.toast.updateSuccess'));
        productId = item._id;
        savedProduct = (result as any)?.product ?? (result as any)?.data?.product;
      } else {
        const result = await createProduct(payload);
        toast.success(t('form.toast.createSuccess'));
        savedProduct = (result as any)?.product ?? (result as any)?.data?.product;
        productId = savedProduct?._id ?? (result as any)?.data?._id ?? '';
      }

      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      if (productId) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'product-detail', productId] });
      }

      onSubmitSuccess(productId, savedProduct);
    } catch (err) {
      const error = err as ApiErrorResponse & {
        response?: {
          status?: number;
          data?: { errors?: Record<string, string>; message?: string | string[] };
        };
      };
      const status = error?.response?.status;

      if (status === 422) {
        const errors = error?.response?.data?.errors;
        if (errors) {
          Object.entries(errors).forEach(([field, message]) => {
            setFieldError(field, message);
          });
        } else {
          const message = error?.response?.data?.message;
          const msg = Array.isArray(message) ? message[0] : message;
          if (msg) toast.error(msg);
        }
      } else {
        const message = (error as any)?.response?.data?.message;
        const errorMsg = Array.isArray(message) ? message[0] : message || t('form.toast.saveFailed');
        toast.error(errorMsg);
      }
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={productValidationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({ values, errors, touched, handleChange, handleBlur, setFieldValue, isValid }) => (
        <Form className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="product-name">{`${t('form.name')} *`}</Label>
              <Input
                id="product-name"
                name="name"
                placeholder={t('form.namePlaceholder')}
                value={values.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  handleChange(e);
                  if (!isEditMode || values.slug === slugify(values.name)) {
                    setFieldValue('slug', slugify(e.target.value));
                  }
                }}
                onBlur={handleBlur}
                aria-invalid={touched.name && !!errors.name}
                aria-describedby={touched.name && errors.name ? 'name-error' : undefined}
              />
              {touched.name && errors.name && (
                <p id="name-error" className="text-xs text-destructive" role="alert">{errors.name}</p>
              )}
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <Label htmlFor="product-slug">{`${t('form.slug')} *`}</Label>
              <Input
                id="product-slug"
                name="slug"
                placeholder={t('form.slugPlaceholder')}
                value={values.slug}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={touched.slug && !!errors.slug}
                aria-describedby={touched.slug && errors.slug ? 'slug-error' : undefined}
              />
              {touched.slug && errors.slug && (
                <p id="slug-error" className="text-xs text-destructive" role="alert">{errors.slug}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>{t('form.description')}</Label>
              <AppRichEditor
                value={values.description}
                onChange={(html) => setFieldValue('description', html)}
                placeholder={t('form.descriptionPlaceholder')}
              />
              {touched.description && errors.description && (
                <p id="description-error" className="text-xs text-destructive" role="alert">{errors.description}</p>
              )}
            </div>

            {/* Category */}
            <CascadingCategorySelect
              value={values.category}
              categories={categories}
              onChange={(value: string) => setFieldValue('category', value)}
              error={touched.category ? errors.category : undefined}
              label={`${t('form.category')} *`}
              placeholder={t('form.categoryPlaceholder')}
              subcategoryPlaceholder={t('form.subcategoryPlaceholder')}
            />

            {/* Featured */}
            <div className="flex items-center justify-between">
              <Label htmlFor="product-isFeatured">{t('form.featured')}</Label>
              <Switch
                id="product-isFeatured"
                checked={values.isFeatured}
                onCheckedChange={(checked: boolean) => setFieldValue('isFeatured', checked)}
                aria-label="Toggle featured product"
              />
            </div>

            {/* Tags */}
            <TagPicker value={selectedTags} onChange={setSelectedTags} />

            {/* Status (edit mode only) */}
            {isEditMode && (
              <div className="space-y-1.5">
                <Label htmlFor="product-status">{t('form.status')}</Label>
                <Select value={values.status} onValueChange={(val) => setFieldValue('status', val)}>
                  <SelectTrigger id="product-status" className="w-full" aria-label={t('form.statusPlaceholder')}>
                    <SelectValue placeholder={t('form.statusPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t('statuses.draft')}</SelectItem>
                    <SelectItem value="active">{t('statuses.active')}</SelectItem>
                    <SelectItem value="sold">{t('statuses.sold')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Pricing hint */}
            <div className="rounded-md border border-dashed border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                💡 {t('form.pricingHint')}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t p-4">
            <AppButton
              type="submit"
              isLoading={isSaving}
              disabled={!isValid || isSaving}
              className="w-full"
            >
              {isEditMode ? t('form.saveAndContinue') : t('form.createAndContinue')}
            </AppButton>
          </div>
        </Form>
      )}
    </Formik>
  );
}
