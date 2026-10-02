'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Trash2, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';

import adminApi from '@/lib/api/admin-api';
import { ALLOWED_IMAGE_MIME_TYPES, validateImageFile } from '@/lib/utils/file-validation';

import { AppAlertDialog } from '@/components/shared/AppAlertDialog';
import { AppButton } from '@/components/shared/AppButton';

import { MAX_PRODUCT_IMAGES, SelectedFile } from './types';

interface StepImageUploadProps {
  productId: string;
  existingImages: { url: string; publicId: string }[];
  onNext: () => void;
  onBack: () => void;
}

export function StepImageUpload({ productId, existingImages, onNext, onBack }: StepImageUploadProps) {
  const queryClient = useQueryClient();
  const t = useTranslations('admin.products');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentImages, setCurrentImages] = useState(existingImages);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState<string | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const remainingSlots = MAX_PRODUCT_IMAGES - currentImages.length - selectedFiles.length;

  const processFiles = (files: FileList | File[]) => {
    setUploadError(null);
    const fileArray = Array.from(files);
    const newFiles: SelectedFile[] = [];
    const maxToAdd = Math.min(fileArray.length, remainingSlots);

    if (fileArray.length > remainingSlots) {
      setUploadError(
        `You can only upload ${remainingSlots} more image${remainingSlots !== 1 ? 's' : ''}. Max ${MAX_PRODUCT_IMAGES} total.`,
      );
    }

    for (let i = 0; i < maxToAdd; i++) {
      const file = fileArray[i];
      const validation = validateImageFile(file.size, file.type);
      if (!validation.valid) {
        setUploadError(validation.error ?? 'Invalid file');
        continue;
      }
      newFiles.push({ file, preview: URL.createObjectURL(file) });
    }

    if (newFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
    setUploadError(null);
  };

  const handleDeleteExistingImage = async (publicId: string) => {
    setIsDeletingImage(publicId);
    try {
      await adminApi.delete(
        `/catalog/products/${productId}/images/${encodeURIComponent(publicId)}`,
      );
      setCurrentImages((prev) => prev.filter((img) => img.publicId !== publicId));
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'product-detail', productId] });
      toast.success(t('form.images.imageDeleted'));
    } catch {
      toast.error(t('form.images.deleteFailed'));
    } finally {
      setIsDeletingImage(null);
      setDeletingImageId(null);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((sf) => formData.append('images', sf.file));

      await adminApi.post(`/catalog/products/${productId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      selectedFiles.forEach((sf) => URL.revokeObjectURL(sf.preview));
      setSelectedFiles([]);

      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'product-detail', productId] });
      toast.success(
        selectedFiles.length === 1
          ? t('form.images.uploadSuccess')
          : t('form.images.uploadSuccessMultiple', { count: selectedFiles.length }),
      );
      onNext();
    } catch {
      toast.error(t('form.images.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">{t('form.images.title')}</h3>
          <p className="text-xs text-muted-foreground">
            {t('form.images.description', { max: MAX_PRODUCT_IMAGES })}
          </p>
        </div>

        {/* Existing images */}
        {currentImages.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t('form.images.currentImages')}</p>
            <div className="grid grid-cols-3 gap-2">
              {currentImages.map((img) => (
                <div
                  key={img.publicId}
                  className="relative group rounded-md border overflow-hidden aspect-square"
                >
                  <img src={img.url} alt="Product" className="h-full w-full object-contain bg-muted p-1" />
                  <button
                    type="button"
                    disabled={isDeletingImage === img.publicId}
                    onClick={() => setDeletingImageId(img.publicId)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    aria-label={t('form.images.deleteImage')}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected files preview */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t('form.images.readyToUpload')}</p>
            <div className="grid grid-cols-3 gap-2">
              {selectedFiles.map((sf, index) => (
                <div
                  key={index}
                  className="relative group rounded-md border overflow-hidden aspect-square"
                >
                  <img src={sf.preview} alt={`Selected ${index + 1}`} className="h-full w-full object-contain bg-muted p-1" />
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={t('form.images.removeImage')}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload area — supports drag & drop */}
        {remainingSlots > 0 && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`rounded-md border-2 border-dashed p-6 text-center transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <ImagePlus className={`mx-auto mb-2 h-8 w-8 transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />
            <p className="text-sm font-medium">
              {isDragging
                ? 'Drop images here'
                : selectedFiles.length === 0
                  ? t('form.images.selectImages')
                  : `Add more (${remainingSlots} slot${remainingSlots !== 1 ? 's' : ''} remaining)`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Drag & drop or click to browse — JPEG, PNG, WebP — max 30 MB each</p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_IMAGE_MIME_TYPES.join(',')}
              onChange={handleFileSelect}
              className="hidden"
              id="product-image-upload"
              multiple
              aria-label="Select product images"
            />
            <AppButton
              type="button"
              variant="secondary"
              className="mt-4"
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<Upload size={16} />}
            >
              {t('form.images.chooseFiles')}
            </AppButton>
          </div>
        )}

        {uploadError && (
          <p className="text-xs text-red-500" role="alert">{uploadError}</p>
        )}
      </div>

      {/* Footer */}
      <div className="border-t p-4 flex gap-2">
        <AppButton type="button" variant="mute" className="flex-1" onClick={onBack}>
          {t('form.images.back')}
        </AppButton>
        {selectedFiles.length > 0 ? (
          <AppButton type="button" className="flex-1" isLoading={isUploading} onClick={handleUpload}>
            {t('form.images.uploadAndContinue')}
          </AppButton>
        ) : (
          <AppButton type="button" variant="secondary" className="flex-1" onClick={onNext}>
            {t('form.images.skip')}
          </AppButton>
        )}
      </div>

      {/* Delete image confirmation */}
      <AppAlertDialog
        title={t('form.images.deleteImageTitle')}
        subTitle={t('form.images.deleteImageConfirm')}
        description={t('form.images.deleteImageDescription')}
        open={!!deletingImageId}
        onOpenChange={(open: boolean) => { if (!open) setDeletingImageId(null); }}
        variant="delete"
        confirmLabel={t('form.images.deleteImageBtn')}
        loading={!!isDeletingImage}
        onConfirm={() => { if (deletingImageId) handleDeleteExistingImage(deletingImageId); }}
      />
    </div>
  );
}
