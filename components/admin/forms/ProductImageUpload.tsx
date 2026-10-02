'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';

import adminApi from '@/lib/api/admin-api';
import {
    ALLOWED_IMAGE_MIME_TYPES,
    validateImageFile,
} from '@/lib/utils/file-validation';

import { AppButton } from '@/components/shared/AppButton';

// --- Types ---

interface ProductImageUploadProps {
  productId: string;
  existingImages?: string[];
  onDone: () => void;
  onBack?: () => void;
}

interface SelectedFile {
  file: File;
  preview: string;
}

// --- Constants ---

const MAX_PRODUCT_IMAGES = 15;

// --- Component ---

export default function ProductImageUpload({
  productId,
  existingImages = [],
  onDone,
  onBack,
}: ProductImageUploadProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const remainingSlots = MAX_PRODUCT_IMAGES - existingImages.length - selectedFiles.length;

  // --- File Selection ---

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);

    const newFiles: SelectedFile[] = [];
    const maxToAdd = Math.min(files.length, remainingSlots);

    if (files.length > remainingSlots) {
      setUploadError(
        `You can only upload ${remainingSlots} more image${remainingSlots !== 1 ? 's' : ''}. Max ${MAX_PRODUCT_IMAGES} total.`,
      );
    }

    for (let i = 0; i < maxToAdd; i++) {
      const file = files[i];
      const validation = validateImageFile(file.size, file.type);

      if (!validation.valid) {
        setUploadError(validation.error ?? 'Invalid file');
        continue;
      }

      newFiles.push({
        file,
        preview: URL.createObjectURL(file),
      });
    }

    if (newFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // --- Remove Selected File ---

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => {
      const updated = [...prev];
      // Revoke the object URL to free memory
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
    setUploadError(null);
  };

  // --- Upload ---

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((sf) => {
        formData.append('images', sf.file);
      });

      await adminApi.post(`/catalog/products/${productId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Cleanup previews
      selectedFiles.forEach((sf) => URL.revokeObjectURL(sf.preview));
      setSelectedFiles([]);

      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      toast.success(
        selectedFiles.length === 1
          ? 'Image uploaded successfully'
          : `${selectedFiles.length} images uploaded successfully`,
      );
      onDone();
    } catch {
      toast.error('Failed to upload images');
    } finally {
      setIsUploading(false);
    }
  };

  // --- Render ---

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">Product Images</h3>
        <p className="text-xs text-muted-foreground">
          Upload up to {MAX_PRODUCT_IMAGES} images. JPEG, PNG, or WebP — max 10 MB each.
        </p>
      </div>

      {/* Existing images indicator */}
      {existingImages.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {existingImages.length} image{existingImages.length !== 1 ? 's' : ''} already uploaded.
        </p>
      )}

      {/* Selected files preview */}
      {selectedFiles.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {selectedFiles.map((sf, index) => (
            <div
              key={index}
              className="relative group rounded-md border overflow-hidden aspect-square"
            >
              <img
                src={sf.preview}
                alt={`Selected ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemoveFile(index)}
                className="absolute top-1 right-1 p-1 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Remove image ${index + 1}`}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {remainingSlots > 0 && (
        <div className="rounded-md border border-dashed p-6 text-center">
          <ImagePlus className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            {selectedFiles.length === 0
              ? 'Select images to upload'
              : `Add more images (${remainingSlots} remaining)`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            JPEG, PNG, or WebP — max 10 MB each
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_IMAGE_MIME_TYPES.join(',')}
            onChange={handleFileSelect}
            className="hidden"
            id="product-image-upload"
            multiple
          />

          <AppButton
            type="button"
            variant="secondary"
            className="mt-4"
            onClick={() => fileInputRef.current?.click()}
            leftIcon={<Upload size={16} />}
          >
            Choose Files
          </AppButton>
        </div>
      )}

      {/* Error message */}
      {uploadError && (
        <p className="text-xs text-red-500">{uploadError}</p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-2">
        {onBack && (
          <AppButton
            type="button"
            variant="mute"
            className="flex-1"
            onClick={onBack}
          >
            Back to Form
          </AppButton>
        )}
        {selectedFiles.length > 0 ? (
          <AppButton
            type="button"
            className="flex-1"
            isLoading={isUploading}
            onClick={handleUpload}
          >
            Upload {selectedFiles.length} Image{selectedFiles.length !== 1 ? 's' : ''}
          </AppButton>
        ) : (
          <AppButton
            type="button"
            variant="mute"
            className="flex-1"
            onClick={onDone}
          >
            Skip & Close
          </AppButton>
        )}
      </div>
    </div>
  );
}
