'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Form, Formik, FormikHelpers } from 'formik';
import { Check, ChevronRight, ImagePlus, Trash2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import * as Yup from 'yup';

import adminApi from '@/lib/api/admin-api';
import { useAdminMutation, useAdminQuery } from '@/lib/api/admin-hooks';
import { adminQueryKeys } from '@/lib/api/admin-query-keys';
import { ALLOWED_IMAGE_MIME_TYPES, validateImageFile } from '@/lib/utils/file-validation';
import { ApiErrorResponse } from '@/types';

import { AppAlertDialog } from '@/components/shared/AppAlertDialog';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

// --- Types ---

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: { url: string; publicId: string } | null;
  parent: string | null;
  children?: Category[];
  isActive: boolean;
  createdAt: string;
}

interface CategoriesResponse {
  success: boolean;
  categories: Category[];
  data?: { categories: Category[] };
}

export interface CategoryFormProps {
  open: boolean;
  item: Category | null;
  onSuccess: () => void;
  onClose: () => void;
}

interface CategoryFormValues {
  name: string;
  slug: string;
  description: string;
  parent: string;
  isActive: boolean;
}

// --- Helpers ---

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function flattenForSelect(categories: Category[], excludeId?: string): Category[] {
  const result: Category[] = [];
  for (const cat of categories) {
    if (cat._id === excludeId) continue;
    result.push(cat);
  }
  return result;
}

// --- Validation Schema ---

const categoryValidationSchema = Yup.object().shape({
  name: Yup.string().required('Name is required').max(100, 'Name must be at most 100 characters'),
  slug: Yup.string().required('Slug is required').max(120, 'Slug must be at most 120 characters'),
  description: Yup.string().max(2000, 'Description must be at most 2000 characters'),
  parent: Yup.string(),
  isActive: Yup.boolean(),
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
  const t = useTranslations('admin.categories');
  const steps = [t('form.steps.details'), t('form.steps.image')] as const;

  return (
    <nav aria-label="Form steps" className="flex items-center justify-center gap-0 px-4 py-3">
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
              <ChevronRight size={14} className="mx-1 text-muted-foreground" aria-hidden="true" />
            )}
          </div>
        );
      })}
    </nav>
  );
}

// --- Step 1: Details ---

interface StepDetailsProps {
  item: Category | null;
  parentOptions: Category[];
  isEditMode: boolean;
  onSubmitSuccess: (id: string) => void;
}

function StepDetails({ item, parentOptions, isEditMode, onSubmitSuccess }: StepDetailsProps) {
  const queryClient = useQueryClient();
  const t = useTranslations('admin.categories');

  const { mutateAsync: createCategory, isPending: isCreating } =
    useAdminMutation<{ success: boolean; data?: { category: Category }; category?: Category }, CategoryFormValues>(
      'post',
      '/catalog/categories',
    );

  const { mutateAsync: updateCategory, isPending: isUpdating } =
    useAdminMutation<{ success: boolean; data?: { category: Category }; category?: Category }, CategoryFormValues & { _id: string }>(
      'put',
      (variables) => `/catalog/categories/${variables._id}`,
    );

  const isSubmitting = isCreating || isUpdating;

  const initialValues: CategoryFormValues = {
    name: item?.name ?? '',
    slug: item?.slug ?? '',
    description: item?.description ?? '',
    parent: item?.parent ?? '',
    isActive: item?.isActive ?? true,
  };

  const handleSubmit = async (
    values: CategoryFormValues,
    { setFieldError }: FormikHelpers<CategoryFormValues>,
  ) => {
    try {
      const payload = { ...values, parent: values.parent || null };
      let savedId: string;

      if (isEditMode && item) {
        const res = await updateCategory({ ...payload, _id: item._id } as any);
        savedId = item._id;
        const updated = (res as any)?.data?.category ?? (res as any)?.category;
        if (updated) {
          queryClient.setQueryData(['admin', 'category-detail', item._id], res);
        }
        toast.success(t('form.toast.updateSuccess'));
      } else {
        const res = await createCategory(payload as any);
        const created = (res as any)?.data?.category ?? (res as any)?.category;
        savedId = created?._id ?? '';
        toast.success(t('form.toast.createSuccess'));
      }

      queryClient.invalidateQueries({ queryKey: adminQueryKeys.categories() });
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories', 'tree'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories', 'tree', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      onSubmitSuccess(savedId);
    } catch (err) {
      const error = err as ApiErrorResponse & {
        response?: { status?: number; data?: { errors?: Record<string, string>; message?: string | string[] } };
      };
      const status = error?.response?.status;

      if (status === 422) {
        const errors = error?.response?.data?.errors;
        if (errors) {
          Object.entries(errors).forEach(([field, message]) => setFieldError(field, message));
        } else {
          const message = error?.response?.data?.message;
          const msg = Array.isArray(message) ? message[0] : message;
          if (msg) toast.error(msg);
        }
      } else {
        const message = error?.response?.data?.message;
        const errorMsg = Array.isArray(message) ? message[0] : message || t('form.toast.saveFailed');
        toast.error(errorMsg);
      }
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={categoryValidationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({ values, errors, touched, handleChange, handleBlur, setFieldValue }) => (
        <Form className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">{`${t('form.name')} *`}</Label>
              <Input
                id="cat-name"
                name="name"
                placeholder={t('form.namePlaceholder')}
                value={values.name}
                onChange={(e) => {
                  handleChange(e);
                  if (!item || values.slug === slugify(values.name)) {
                    setFieldValue('slug', slugify(e.target.value));
                  }
                }}
                onBlur={handleBlur}
                aria-invalid={touched.name && !!errors.name}
              />
              {touched.name && errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <Label htmlFor="cat-slug">{`${t('form.slug')} *`}</Label>
              <Input
                id="cat-slug"
                name="slug"
                placeholder={t('form.slugPlaceholder')}
                value={values.slug}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={touched.slug && !!errors.slug}
              />
              {touched.slug && errors.slug && (
                <p className="text-xs text-destructive">{errors.slug}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="cat-description">{t('form.description')}</Label>
              <Textarea
                id="cat-description"
                name="description"
                placeholder={t('form.descriptionPlaceholder')}
                value={values.description}
                onChange={handleChange}
                onBlur={handleBlur}
                rows={3}
                aria-invalid={touched.description && !!errors.description}
              />
              {touched.description && errors.description && (
                <p className="text-xs text-destructive">{errors.description}</p>
              )}
            </div>

            {/* Parent Category */}
            <div className="space-y-1.5">
              <Label htmlFor="cat-parent">{t('form.parent')}</Label>
              <Select
                value={values.parent || 'none'}
                onValueChange={(value) => setFieldValue('parent', value === 'none' ? '' : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('form.parentNone')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('form.parentNone')}</SelectItem>
                  {parentOptions.map((cat) => (
                    <SelectItem key={cat._id} value={cat._id}>
                      <span className="flex items-center gap-2">
                        {cat.name}
                        {!cat.isActive && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            {t('form.inactive')}
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Is Active Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="cat-isActive">{t('form.active')}</Label>
              <Switch
                id="cat-isActive"
                checked={values.isActive}
                onCheckedChange={(checked) => setFieldValue('isActive', checked)}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="border-t p-4">
            <AppButton type="submit" isLoading={isSubmitting} className="w-full">
              {isEditMode ? t('form.saveAndContinue') : t('form.createAndContinue')}
            </AppButton>
          </div>
        </Form>
      )}
    </Formik>
  );
}

// --- Step 2: Image Upload ---

interface StepImageProps {
  categoryId: string;
  existingImage: { url: string; publicId: string } | null | undefined;
  onBack: () => void;
  onDone: () => void;
}

function StepImage({ categoryId, existingImage, onBack, onDone }: StepImageProps) {
  const queryClient = useQueryClient();
  const t = useTranslations('admin.categories');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentImage, setCurrentImage] = useState<string | null>(existingImage?.url ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.categories() });
    queryClient.invalidateQueries({ queryKey: ['admin', 'categories', 'tree'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'categories', 'tree', 'all'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'category-detail', categoryId] });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadCategoryImage(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCategoryDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await uploadCategoryImage(file);
  };

  const uploadCategoryImage = async (file: File) => {
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

      await adminApi.post(`/catalog/categories/${categoryId}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setCurrentImage(URL.createObjectURL(file));
      invalidate();
      toast.success(t('form.image.uploadSuccess'));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error?.response?.data?.message || t('form.image.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    setIsDeleting(true);
    try {
      await adminApi.delete(`/catalog/categories/${categoryId}/image`);
      setCurrentImage(null);
      invalidate();
      toast.success(t('form.image.deleteSuccess'));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error?.response?.data?.message || t('form.image.deleteFailed'));
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">{t('form.image.title')}</h3>
          <p className="text-xs text-muted-foreground">{t('form.image.description')}</p>
        </div>

        {/* Current image preview */}
        {currentImage && (
          <div className="relative rounded-md border overflow-hidden group">
            <img
              src={currentImage}
              alt="Category"
              className="w-full h-40 object-cover"
            />
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setShowDeleteConfirm(true)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
              aria-label={t('form.image.deleteImage')}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}

        {/* Upload area — supports drag & drop */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={handleCategoryDrop}
          className={`rounded-md border-2 border-dashed p-6 text-center transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
        >
          <ImagePlus className={`mx-auto mb-2 h-8 w-8 transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />
          <p className="text-sm font-medium">
            {isDragging ? 'Drop image here' : currentImage ? t('form.image.replace') : t('form.image.upload')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Drag & drop or click — {t('form.image.fileTypes')}</p>

          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_IMAGE_MIME_TYPES.join(',')}
            onChange={handleFileSelect}
            className="hidden"
            id="category-image-upload"
            aria-label="Select category image"
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
          <p className="text-xs text-destructive" role="alert">{uploadError}</p>
        )}
      </div>

      {/* Footer */}
      <div className="border-t p-4 flex gap-2">
        <AppButton type="button" variant="mute" className="flex-1" onClick={onBack}>
          {t('form.image.back')}
        </AppButton>
        <AppButton type="button" className="flex-1" onClick={onDone}>
          {t('form.image.done')}
        </AppButton>
      </div>

      {/* Delete image confirmation */}
      <AppAlertDialog
        title={t('form.image.deleteImageTitle')}
        subTitle={t('form.image.deleteImageConfirm')}
        description={t('form.image.deleteImageDescription')}
        open={showDeleteConfirm}
        onOpenChange={(open: boolean) => { if (!open) setShowDeleteConfirm(false); }}
        variant="delete"
        confirmLabel={t('form.image.deleteImageBtn')}
        loading={isDeleting}
        onConfirm={handleDeleteImage}
      />
    </div>
  );
}

// --- Orchestrator ---

export default function CategoryForm({ open, item, onSuccess, onClose }: CategoryFormProps) {
  const t = useTranslations('admin.categories');
  const isEditMode = !!item;

  const [currentStep, setCurrentStep] = useState(1);
  const [categoryId, setCategoryId] = useState<string>(item?._id ?? '');
  const [savedImage, setSavedImage] = useState<{ url: string; publicId: string } | null | undefined>(
    item?.image ?? null,
  );

  // Fetch parent options
  const { data: categoriesData } = useAdminQuery<CategoriesResponse>(
    ['admin', 'categories', 'tree', 'all'],
    '/catalog/categories/tree',
    undefined,
    { params: { includeInactive: true } },
  );

  const parentOptions = useMemo(() => {
    const categories =
      (categoriesData as any)?.data?.categories ?? categoriesData?.categories ?? [];
    return flattenForSelect(categories, item?._id);
  }, [categoriesData, item]);

  // Sync state when item changes (opening a different category)
  if (open && item && categoryId !== item._id) {
    setCategoryId(item._id);
    setSavedImage(item.image ?? null);
    setCurrentStep(1);
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setCurrentStep(1);
      setCategoryId(item?._id ?? '');
      setSavedImage(item?.image ?? null);
      onClose();
    }
  };

  const handleStep1Success = (id: string) => {
    setCategoryId(id);
    setCurrentStep(2);
  };

  const handleDone = () => {
    setCurrentStep(1);
    setCategoryId(item?._id ?? '');
    setSavedImage(item?.image ?? null);
    onSuccess();
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-md flex flex-col p-0" aria-describedby={undefined}>
        <SheetHeader className="px-4 pt-4 pb-0">
          <SheetTitle>
            {isEditMode ? t('editCategory') : t('addCategory')}
          </SheetTitle>
        </SheetHeader>

        <StepperIndicator
          currentStep={currentStep}
          isEditMode={isEditMode}
          onStepClick={(step) => isEditMode && setCurrentStep(step)}
        />

        <div className="border-t" />

        <div className="flex-1 flex flex-col min-h-0">
          {currentStep === 1 && (
            <StepDetails
              item={item}
              parentOptions={parentOptions}
              isEditMode={isEditMode}
              onSubmitSuccess={handleStep1Success}
            />
          )}

          {currentStep === 2 && categoryId && (
            <StepImage
              categoryId={categoryId}
              existingImage={savedImage}
              onBack={() => setCurrentStep(1)}
              onDone={handleDone}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
