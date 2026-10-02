'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    resolveFormikError,
    type ErrorStrategy,
} from '@/lib/resolveFormikError';
import { cn } from '@/lib/utils';
import {
    FormikContext,
    getIn,
    type FormikContextType,
    type FormikValues,
} from 'formik';
import { Maximize2, UploadCloud, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'react-hot-toast';

type AppFileInputProps = {
  name: string;
  label?: string;
  helperText?: string;
  className?: string;
  labelClassName?: string;
  dropAreaClassName?: string;
  previewClassName?: string;

  /** MB */
  maxSizeMB?: number;
  /** MIME types */
  acceptTypes?: string[];

  /** Show required asterisk in UI only */
  requiredAsterisk?: boolean;

  showErrorStrategy?: ErrorStrategy;
  disabled?: boolean;

  /** callback if you want to react to file selection */
  onFileSelected?: (file: File | null) => void;

  /* control preview height (px) for layout stability */
  previewHeight?: number; // default 128

  /** Show the clear/remove button on the preview (default: true) */
  showClearButton?: boolean;

  /** External preview URL (for existing images from API) */
  previewUrl?: string;
};

const DEFAULT_ACCEPT = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

const IMAGE_ACCEPT_PREFIXES = ['image/'];

export const AppFileInput: React.FC<AppFileInputProps> = ({
  name,
  label,
  helperText,
  className,
  labelClassName,
  dropAreaClassName,
  previewClassName,
  maxSizeMB = 30,
  acceptTypes = DEFAULT_ACCEPT,
  requiredAsterisk,
  showErrorStrategy = 'touchedOrSubmit',
  disabled,
  onFileSelected,
  previewHeight = 128,
  showClearButton = true,
  previewUrl,
}) => {
  const formik = React.useContext(
    FormikContext as unknown as React.Context<
      FormikContextType<FormikValues> | undefined
    >,
  );

  if (!formik) {
    throw new Error('AppFileInput must be used inside a Formik form');
  }

  const t = useTranslations('appFileInput');
  const inputId = React.useId();
  const [isDragging, setIsDragging] = React.useState(false);
  const [previewSrc, setPreviewSrc] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<number>(0);
  const [isReading, setIsReading] = React.useState(false);

  const [open, setOpen] = React.useState(false);

  const error = resolveFormikError(formik, name, showErrorStrategy);
  const currentValue = getIn(formik.values, name) as
    | File
    | string
    | null
    | undefined;

  // Store the original string URL (if any) so we can restore it after clearing
  const originalUrl = React.useRef<string | null>(null);

  React.useEffect(() => {
    // On mount or when initial value changes, store the original URL
    if (
      typeof currentValue === 'string' &&
      currentValue.trim() &&
      !originalUrl.current
    ) {
      originalUrl.current = currentValue;
    }
  }, [currentValue]);

  React.useEffect(() => {
    const val = currentValue;
    if (val instanceof File) {
      const url = URL.createObjectURL(val);
      setPreviewSrc(url);
      setIsReading(false);
      setProgress(100);

      return () => {
        URL.revokeObjectURL(url);
      };
    }

    // Handle string URL from API
    if (typeof val === 'string' && val.trim()) {
      setPreviewSrc(val);
      setIsReading(false);
      setProgress(100);
      return;
    }

    // Use external previewUrl if no value is set
    if (!val && previewUrl) {
      setPreviewSrc(previewUrl);
      setIsReading(false);
      setProgress(100);
      return;
    }

    if (!val) {
      setPreviewSrc(null);
      setProgress(0);
      setIsReading(false);
    }
  }, [currentValue, formik, name, previewUrl]);

  const acceptAttr = acceptTypes.join(',');
  const currentFileName =
    currentValue instanceof File
      ? currentValue.name
      : typeof currentValue === 'string' && currentValue.trim()
        ? currentValue.split('/').pop() || 'Uploaded file'
        : previewUrl?.split('/').pop() || 'Uploaded file';
  const isImagePreview =
    (currentValue instanceof File &&
      IMAGE_ACCEPT_PREFIXES.some((prefix) =>
        currentValue.type.startsWith(prefix),
      )) ||
    (typeof currentValue === 'string' &&
      !currentValue.toLowerCase().endsWith('.pdf')) ||
    (!!previewUrl && !previewUrl.toLowerCase().endsWith('.pdf'));

  const validateFile = (file: File): boolean => {
    if (!acceptTypes.includes(file.type)) {
      toast.error(t('onlyImageFilesAllowed'));
      return false;
    }
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(t('fileTooLarge', { maxSize: maxSizeMB }));
      return false;
    }
    return true;
  };

  const readForPreview = (file: File) => {
    setIsReading(true);
    setProgress(0);
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setProgress(pct);
      }
    };
    reader.onload = () => {
      setPreviewSrc(reader.result as string);
      setIsReading(false);
      setProgress(100);
    };
    reader.onerror = () => {
      setIsReading(false);
      setProgress(0);
      toast.error(t('failedToLoadPreview'));
    };
    reader.readAsDataURL(file);
  };

  const handleFile = (file: File | null) => {
    if (!file) {
      formik.setFieldValue(name, null);
      onFileSelected?.(null);
      return;
    }
    if (!validateFile(file)) return;

    formik.setFieldValue(name, file);
    readForPreview(file);
    onFileSelected?.(file);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    handleFile(file);
  };

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    handleFile(file);
  };

  const onDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const clearFile = () => {
    formik.setFieldValue(name, null);
    setPreviewSrc(null);
    setProgress(0);
    setIsReading(false);
    setOpen(false);
    onFileSelected?.(null);
  };

  const helperId = error || helperText ? `${inputId}-helper` : undefined;

  // Show label with "Current Image" indicator if it's a string URL
  const isExistingImage =
    typeof currentValue === 'string' && currentValue.trim();

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <label
          className={cn('text-[15px] font-medium', labelClassName)}
          htmlFor={inputId}
        >
          {label}
          {requiredAsterisk && <span className="text-destructive ml-1">*</span>}
          {isExistingImage && !disabled && (
            <span className="text-xs text-muted-foreground ml-2">
              (Current Image)
            </span>
          )}
        </label>
      )}

      <input
        id={inputId}
        type="file"
        accept={acceptAttr}
        className="hidden"
        disabled={disabled}
        onChange={onInputChange}
        onBlur={() => formik.setFieldTouched(name, true, true)}
      />

      <label
        htmlFor={inputId}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        aria-describedby={helperId}
        className={cn(
          'flex w-full cursor-pointer flex-col items-center justify-center rounded-[12px] border border-dashed p-5 transition',
          'text-sm',
          disabled && 'opacity-60 cursor-not-allowed',
          error
            ? 'border-destructive'
            : isDragging
              ? 'border-primary bg-primary/5'
              : 'border-stroke hover:border-primary',
          dropAreaClassName,
        )}
      >
        <UploadCloud className="mb-2 h-6 w-6" />
        <span className="font-medium">
          {t('dragAndDrop')} <span className="underline">{t('browse')}</span>
        </span>
        <span className="mt-1 text-xs text-muted-foreground">
          {t('allowed')}:{' '}
          {acceptTypes
            .map((type) => type.split('/')[1].toUpperCase())
            .join(', ')}{' '}
          •{t('max')} {maxSizeMB}MB
        </span>

        {/* Thumbnail Preview (stable height) */}
        {previewSrc && (
          <div
            className={cn(
              'mt-4 relative w-full max-w-sm overflow-hidden rounded-lg border bg-card',
              previewClassName,
            )}
            style={{ height: previewHeight }} // ⬅️ stable height
          >
            {isImagePreview ? (
              <button
                type="button"
                aria-label={t('openFullSizePreview')}
                className="group absolute inset-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setOpen(true);
                  }
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewSrc}
                  alt={t('preview')}
                  className="h-full w-full object-cover"
                />

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                  <span className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 rounded-md bg-card/90 px-2 py-1 text-xs font-medium shadow text-foreground">
                    <Maximize2 className="h-3.5 w-3.5" />
                    {t('view')}
                  </span>
                </div>
              </button>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  Document
                </div>
                <p className="line-clamp-2 text-sm font-medium text-foreground">
                  {currentFileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Uploaded file ready for submission
                </p>
              </div>
            )}

            {/* Clear button */}
            {showClearButton && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  clearFile();
                }}
                className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-card/90 shadow hover:bg-card"
                aria-label={t('removeFile')}
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Progress bar while reading */}
            {isReading && (
              <div className="absolute bottom-0 left-0 h-1 w-full bg-black/10">
                <div
                  className="h-1 bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        )}
      </label>

      {(error || helperText) && (
        <p
          id={helperId}
          className={cn(
            'text-sm',
            error ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {error ?? helperText}
        </p>
      )}

      {/* Full-screen dialog preview */}
      <Dialog open={open && isImagePreview} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] z-[1000]">
          <DialogHeader>
            <DialogTitle>{t('preview')}</DialogTitle>
            <DialogDescription className="sr-only">
              {t('fullPreview')}
            </DialogDescription>
          </DialogHeader>

          {previewSrc ? (
            <div className="relative w-full">
              {/* Use object-contain to fit within dialog without overflow */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewSrc}
                alt={t('fullPreview')}
                className="max-h-[80vh] w-full object-contain"
              />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {t('noPreviewAvailable')}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
