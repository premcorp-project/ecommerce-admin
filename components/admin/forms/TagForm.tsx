'use client';

import { AppAlertDialog } from '@/components/shared/AppAlertDialog';
import { AppButton } from '@/components/shared/AppButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import adminApi from '@/lib/api/admin-api';
import { useAdminMutation } from '@/lib/api/admin-hooks';
import { ALLOWED_IMAGE_MIME_TYPES, validateImageFile } from '@/lib/utils/file-validation';
import { useQueryClient } from '@tanstack/react-query';
import { Form, Formik, FormikHelpers } from 'formik';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import * as Yup from 'yup';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tag {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    image?: { url: string; publicId: string } | null;
    isActive: boolean;
}

interface TagFormProps {
    open: boolean;
    item: Tag | null;
    onSuccess: () => void;
    onClose: () => void;
}

interface TagFormValues {
    name: string;
    slug: string;
    description: string;
    isActive: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const schema = Yup.object({
    name: Yup.string().required('Name is required').max(50),
    slug: Yup.string().required('Slug is required'),
    description: Yup.string(),
    isActive: Yup.boolean(),
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function TagForm({ open, item, onSuccess, onClose }: TagFormProps) {
    const t = useTranslations('admin.tags');
    const queryClient = useQueryClient();
    const isEditMode = !!item;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [currentStep, setCurrentStep] = useState(1);
    const [tagId, setTagId] = useState<string>(item?._id ?? '');
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [currentImage, setCurrentImage] = useState<string | null>(item?.image?.url ?? null);
    const [showDeleteImageConfirm, setShowDeleteImageConfirm] = useState(false);
    const [isDeletingImage, setIsDeletingImage] = useState(false);

    // Reset state when sheet opens/closes
    useEffect(() => {
        if (open) {
            setCurrentStep(1);
            setTagId(item?._id ?? '');
            setCurrentImage(item?.image?.url ?? null);
        }
    }, [open, item]);

    const { mutateAsync: createTag } = useAdminMutation<any, TagFormValues>('post', '/catalog/tags');
    const { mutateAsync: updateTag } = useAdminMutation<any, TagFormValues & { id?: string }>(
        'put', (v) => `/catalog/tags/${v.id}`,
    );

    const initialValues: TagFormValues = {
        name: item?.name ?? '',
        slug: item?.slug ?? '',
        description: item?.description ?? '',
        isActive: item?.isActive ?? true,
    };

    const handleStep1Submit = async (values: TagFormValues, { setSubmitting, setFieldError }: FormikHelpers<TagFormValues>) => {
        try {
            if (isEditMode) {
                await updateTag({ ...values, id: item._id });
                toast.success(t('toast.updateSuccess'));
                setTagId(item._id);
            } else {
                const res = await createTag(values) as any;
                const newTag = res?.data?.tag ?? res?.tag ?? res?.data;
                const newId = newTag?._id ?? newTag?.id;
                if (newId) setTagId(newId);
                toast.success(t('toast.createSuccess'));
            }
            queryClient.invalidateQueries({ queryKey: ['admin', 'tags'] });
            setCurrentStep(2);
        } catch (err: any) {
            const msg = err?.response?.data?.message;
            if (err?.response?.status === 422) {
                const errors = err?.response?.data?.errors;
                if (errors) Object.entries(errors).forEach(([k, v]) => setFieldError(k, v as string));
            } else {
                toast.error(msg || 'Something went wrong');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleImageUpload = async (file: File) => {
        if (!tagId) return;
        const validation = validateImageFile(file.size, file.type);
        if (!validation.valid) { toast.error(validation.error ?? 'Invalid file'); return; }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
            await adminApi.post(`/catalog/tags/${tagId}/image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setCurrentImage(URL.createObjectURL(file));
            toast.success('Image uploaded');
            queryClient.invalidateQueries({ queryKey: ['admin', 'tags'] });
        } catch { toast.error('Failed to upload image'); }
        finally { setIsUploading(false); }
    };

    const handleDone = () => {
        onSuccess();
    };

    const handleDeleteImage = async () => {
        if (!tagId) return;
        setIsDeletingImage(true);
        try {
            await adminApi.delete(`/catalog/tags/${tagId}/image`);
            setCurrentImage(null);
            toast.success('Image removed');
            queryClient.invalidateQueries({ queryKey: ['admin', 'tags'] });
        } catch {
            toast.error('Failed to remove image');
        } finally {
            setIsDeletingImage(false);
            setShowDeleteImageConfirm(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>{isEditMode ? t('editTag') : t('addTag')}</SheetTitle>
                    <SheetDescription>{isEditMode ? 'Update tag details.' : 'Create a new product tag.'}</SheetDescription>
                </SheetHeader>

                {/* Step indicator */}
                <div className="flex items-center justify-center gap-0 px-4 py-3 border-b">
                    <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    >
                        <span className="size-4 flex items-center justify-center rounded-full bg-primary-foreground/20 text-[10px]">1</span>
                        Details
                    </button>
                    <div className="w-6 h-px bg-border mx-1" />
                    <button
                        type="button"
                        onClick={() => { if (isEditMode || tagId) setCurrentStep(2); }}
                        disabled={!isEditMode && !tagId}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    >
                        <span className="size-4 flex items-center justify-center rounded-full bg-primary-foreground/20 text-[10px]">2</span>
                        Image
                    </button>
                </div>

                {/* Step 1: Details */}
                {currentStep === 1 && (
                    <Formik initialValues={initialValues} validationSchema={schema} onSubmit={handleStep1Submit} enableReinitialize>
                        {({ values, errors, touched, handleChange, handleBlur, setFieldValue, isSubmitting }) => (
                            <Form className="flex flex-col flex-1 min-h-0">
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="tag-name">{t('form.name')}</Label>
                                        <Input
                                            id="tag-name" name="name" value={values.name}
                                            onChange={(e) => { handleChange(e); if (!isEditMode) setFieldValue('slug', generateSlug(e.target.value)); }}
                                            onBlur={handleBlur} placeholder={t('form.namePlaceholder')}
                                        />
                                        {touched.name && errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="tag-slug">{t('form.slug')}</Label>
                                        <Input id="tag-slug" name="slug" value={values.slug} onChange={handleChange} onBlur={handleBlur} placeholder={t('form.slugPlaceholder')} />
                                        {touched.slug && errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="tag-desc">{t('form.description')}</Label>
                                        <textarea id="tag-desc" name="description" value={values.description} onChange={handleChange} onBlur={handleBlur} rows={3} placeholder={t('form.descriptionPlaceholder')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <Label>{t('form.active')}</Label>
                                        <Switch checked={values.isActive} onCheckedChange={(v) => setFieldValue('isActive', v)} />
                                    </div>
                                </div>

                                <div className="border-t p-4">
                                    <AppButton type="submit" isLoading={isSubmitting} className="w-full">
                                        {isEditMode ? 'Save & Continue' : 'Create & Continue'}
                                    </AppButton>
                                </div>
                            </Form>
                        )}
                    </Formik>
                )}

                {/* Step 2: Image (optional) */}
                {currentStep === 2 && (
                    <div className="flex flex-col flex-1 min-h-0">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <div className="space-y-1">
                                <h3 className="text-sm font-medium">{t('form.image.title')}</h3>
                                <p className="text-xs text-muted-foreground">{t('form.image.description')}</p>
                            </div>

                            {/* Current image preview */}
                            {currentImage && (
                                <div className="relative rounded-md border overflow-hidden group">
                                    <img src={currentImage} alt="Tag" className="w-full max-h-32 object-contain bg-muted p-2" />
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteImageConfirm(true)}
                                        className="absolute top-2 right-2 p-1.5 rounded-md bg-destructive/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="Remove image"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Upload area with drag & drop */}
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                                onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleImageUpload(f); }}
                                className={`rounded-md border-2 border-dashed p-6 text-center transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                            >
                                <ImagePlus className={`mx-auto mb-2 size-8 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                                <p className="text-sm font-medium">
                                    {isDragging ? 'Drop image here' : currentImage ? 'Replace image' : 'Upload tag image'}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">Drag & drop or click — JPEG, PNG, WebP</p>
                                <input ref={fileInputRef} type="file" accept={ALLOWED_IMAGE_MIME_TYPES.join(',')} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} className="hidden" />
                                <AppButton type="button" variant="secondary" className="mt-3" size="sm" isLoading={isUploading} onClick={() => fileInputRef.current?.click()} leftIcon={<Upload size={14} />}>
                                    Choose File
                                </AppButton>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t p-4 flex gap-2">
                            <AppButton type="button" variant="mute" className="flex-1" onClick={() => setCurrentStep(1)}>
                                Back
                            </AppButton>
                            <AppButton type="button" className="flex-1" onClick={handleDone}>
                                {currentImage ? 'Done' : 'Skip'}
                            </AppButton>
                        </div>
                    </div>
                )}
            </SheetContent>

            {/* Delete image confirmation */}
            <AppAlertDialog
                title="Delete Image"
                subTitle="Are you sure you want to remove this tag image?"
                description="This action cannot be undone."
                open={showDeleteImageConfirm}
                onOpenChange={(open: boolean) => { if (!open) setShowDeleteImageConfirm(false); }}
                variant="delete"
                confirmLabel="Delete"
                loading={isDeletingImage}
                onConfirm={handleDeleteImage}
            />
        </Sheet>
    );
}
